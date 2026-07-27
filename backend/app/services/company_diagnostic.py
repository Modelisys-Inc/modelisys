"""Diagnostic d'entreprise (style VC) — service d'agrégation.

Calcule, pour une entreprise, un diagnostic complet à partir des mêmes
primitives que le moteur d'états financiers (`financial_statements`) :

- Tendances 5 ans (revenus, marges, BAIIA, bénéfice net, bilan, ratios)
- Saisonnalité (moyenne mensuelle des revenus / BAIIA)
- Rentabilité par division et par produit-service (via `_product_filter_ctx`)
- Investissements (capex) et amortissement
- Évaluation indicative par multiple de BAIIA

Identification des métriques par FAMILLE de codes de liaison (préfixe du code,
ex. REV-A.1 → REV), jamais par libellé de ligne d'état financier :

- revenus            = famille REV (comptes CT → ×−1, donc positifs)
- bénéfice brut      = REV − CMV
- bénéfice net       = REV − (CMV + EXP + ADM + VNT + FIN + AUT + IMP)
- BAIIA              = bénéfice net + FIN + IMP + amortissement
- intérêts           = famille FIN
- amortissement      = comptes dont le mapping a `amortization=True` OU dont le
                       libellé du code de liaison contient « amortissement » /
                       « dépréciation » (mêmes jetons que la page Capex)
- stocks             = comptes ACT dont le libellé du code contient
                       « stocks » / « inventaire »
- actif/passif       = familles ACT, ALT, PCT, PLT ; capitaux propres = actif − passif
- capex              = Δ(ALT fin d'exercice) + amortissement de l'exercice
                       (roll-forward des immobilisations nettes ; 0 pour le
                       premier exercice disponible)
"""

from __future__ import annotations

import re
from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterator

from sqlalchemy.orm import Session

from app.models.account_mapping import AccountMapping, Product
from app.models.company import Company, Division
from app.models.company_link_code import CompanyLinkCode
from app.models.forecast_config import ForecastConfig
from app.models.standard_link_code import StandardLinkCode
from app.models.trial_balance import TrialBalanceEntry
from app.schemas.company_diagnostic import (
    CompanyDiagnosticResponse,
    DiagnosticDivisionPerformance,
    DiagnosticDivisionProductPerformance,
    DiagnosticProductPerformance,
    DiagnosticSeasonalityMonth,
    DiagnosticSummary,
    DiagnosticTrendYear,
    DiagnosticValuation,
)
from app.services.financial_statements import (
    FRENCH_MONTH_ABBREVS,
    _build_fiscal_year_data_multi,
    _build_mapping_index,
    _fiscal_month_to_calendar,
    _gl_account_sum_months_balance_sheet,
    _gl_account_sum_months_income_statement,
    _parse_fiscal_year_end,
    _product_filter_ctx,
    _sum_for_link_codes_aggregate,
)
from app.services.standard_link_code_utils import derive_link_code_family

# ─── constantes ───────────────────────────────────────────────────────────────

_IS_FAMILIES: tuple[str, ...] = ("REV", "CMV", "EXP", "ADM", "VNT", "FIN", "AUT", "IMP")
_BS_FAMILIES: tuple[str, ...] = ("ACT", "ALT", "PCT", "PLT")

_MAX_TREND_YEARS = 5
_MAX_VALUATION_YEARS = 3
_VALUATION_WEIGHTS: tuple[float, ...] = (3.0, 2.0, 1.0)  # plus récent en premier

_DEFAULT_MULTIPLE_LOW = 3.0
_DEFAULT_MULTIPLE_HIGH = 5.0
_EBITDA_MULTIPLE_CONFIG_TYPE = "ebitda_multiple"

_DEP_LABEL_RE = re.compile(r"amortis|d[ée]pr[ée]ciation|depreciation", re.IGNORECASE)
_INV_LABEL_RE = re.compile(r"stock|inventaire|inventory", re.IGNORECASE)

_LIFECYCLE_GROWTH_THRESHOLD_PCT = 5.0

_INDICATIVE_NOTE = (
    "Évaluation par multiple de BAIIA fournie à titre indicatif seulement ; "
    "elle ne constitue pas une évaluation formelle."
)
_NO_DATA_NOTE = (
    "Aucune donnée de balance de vérification disponible : le diagnostic est vide."
)


# ─── helpers numériques ───────────────────────────────────────────────────────

def _r2(value: float) -> float:
    return round(float(value), 2)


def _pct(numerator: float, denominator: float) -> float | None:
    """numerator / denominator × 100, arrondi à 2 décimales ; None si dénominateur nul."""
    if denominator == 0:
        return None
    return _r2(numerator / denominator * 100.0)


def _ratio(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    return _r2(numerator / denominator)


def _cagr_pct(first_value: float, last_value: float, years_span: int) -> float | None:
    """CAGR en % entre deux valeurs strictement positives ; None sinon."""
    if years_span <= 0 or first_value <= 0 or last_value <= 0:
        return None
    return _r2(((last_value / first_value) ** (1.0 / years_span) - 1.0) * 100.0)


@contextmanager
def _product_scope(token: str) -> Iterator[None]:
    """Scope toute somme d'états financiers aux mappings dont `product` contient le jeton."""
    ctx_token = _product_filter_ctx.set(token)
    try:
        yield
    finally:
        _product_filter_ctx.reset(ctx_token)


# ─── contexte de calcul ───────────────────────────────────────────────────────

class _DiagnosticContext:
    """Données partagées entre tous les calculs du diagnostic (une seule lecture TB)."""

    def __init__(self, db: Session, company: Company) -> None:
        self.db = db
        self.company = company
        self.fy_end_month, _ = _parse_fiscal_year_end(company.fiscal_year_end)

        # Exercices disponibles (au plus 5, croissants). La colonne
        # TrialBalanceEntry.fiscal_year stocke l'année CIVILE ; pour une fin
        # d'exercice ≠ décembre, l'exercice fiscal se déduit du mois.
        pairs = (
            db.query(TrialBalanceEntry.fiscal_year, TrialBalanceEntry.month)
            .filter(TrialBalanceEntry.company_id == company.id)
            .distinct()
            .all()
        )
        fiscal_years: set[int] = set()
        for cal_year, month in pairs:
            if self.fy_end_month != 12 and int(month) > self.fy_end_month:
                fiscal_years.add(int(cal_year) + 1)
            else:
                fiscal_years.add(int(cal_year))
        self.years: list[int] = sorted(fiscal_years)[-_MAX_TREND_YEARS:]

        # Mappings + index code de liaison → comptes
        self.mappings: list[AccountMapping] = (
            db.query(AccountMapping)
            .filter(AccountMapping.company_id == company.id)
            .all()
        )
        self.mapping_index: dict[str, list[str]] = _build_mapping_index(self.mappings)
        self.mappings_by_account: dict[str, AccountMapping] = {
            m.account_number: m for m in self.mappings
        }

        # Codes regroupés par famille (préfixe du code : REV-A.1 → REV)
        self.family_codes: dict[str, list[str]] = {}
        for link_code in self.mapping_index:
            family = derive_link_code_family(link_code)
            self.family_codes.setdefault(family, []).append(link_code)

        # Libellés des codes (chart global ∪ overlay local) pour détecter
        # amortissement et stocks.
        code_labels: dict[str, str] = {}
        for row in db.query(StandardLinkCode).all():
            code_labels[row.code] = (row.label_sub_account or row.label_account or "")
        for row in (
            db.query(CompanyLinkCode)
            .filter(CompanyLinkCode.company_id == company.id)
            .all()
        ):
            code_labels[row.code] = (row.label_sub_account or row.label_account or "")

        self.dep_accounts: list[str] = []
        self.inv_accounts: list[str] = []
        for m in self.mappings:
            link_code = str(m.link_code or "").strip()
            if not link_code:
                continue
            family = derive_link_code_family(link_code)
            label = code_labels.get(link_code, "") or (m.description or "")
            if family in _IS_FAMILIES:
                if bool(m.amortization) or _DEP_LABEL_RE.search(label):
                    self.dep_accounts.append(m.account_number)
            elif family == "ACT" and _INV_LABEL_RE.search(label):
                self.inv_accounts.append(m.account_number)

        # Index de montants par exercice (une seule requête TB batched)
        self.amount_indices: dict[int, dict[str, dict[int, Decimal]]] = (
            _build_fiscal_year_data_multi(
                db, company.id, self.years, self.fy_end_month, company.is_cumulative_tb,
            )
            if self.years
            else {}
        )

    # -- sommes de base ------------------------------------------------------

    def _sum_family(
        self,
        family: str,
        fiscal_year: int,
        months: list[int],
        statement_type: str,
        division: Division | None = None,
    ) -> float:
        codes = self.family_codes.get(family) or []
        if not codes or not months:
            return 0.0
        return _sum_for_link_codes_aggregate(
            codes,
            self.mapping_index,
            self.amount_indices.get(fiscal_year) or {},
            months,
            division_filter=division.name if division else None,
            division_uuid=division.id if division else None,
            mappings_by_account=self.mappings_by_account,
            statement_type=statement_type,
        )

    def _sum_accounts(
        self,
        accounts: list[str],
        fiscal_year: int,
        months: list[int],
        statement_type: str,
        division: Division | None = None,
    ) -> float:
        if not accounts or not months:
            return 0.0
        amount_index = self.amount_indices.get(fiscal_year) or {}
        div_name = division.name if division else None
        div_id = division.id if division else None
        fn = (
            _gl_account_sum_months_income_statement
            if statement_type == "income-statement"
            else _gl_account_sum_months_balance_sheet
        )
        return sum(
            fn(
                acct, amount_index, months,
                div_name, None, div_id, None,
                self.mappings_by_account, None, None, None,
            )
            for acct in accounts
        )

    # -- métriques par exercice ----------------------------------------------

    def bs_months(self, fiscal_year: int) -> list[int]:
        """Mois fiscaux à agréger pour le bilan de fin d'exercice.

        Non cumulatif : dernier mois disponible (solde de clôture) ; cumulatif :
        1..dernier mois (les montants dé-cumulés se recomposent en solde).
        """
        index = self.amount_indices.get(fiscal_year) or {}
        available = {m for monthly in index.values() for m in monthly}
        if not available:
            return []
        last = max(available)
        return list(range(1, last + 1)) if self.company.is_cumulative_tb else [last]

    def income_metrics(
        self,
        fiscal_year: int,
        months: list[int],
        division: Division | None = None,
    ) -> dict[str, float]:
        fam = {
            f: self._sum_family(f, fiscal_year, months, "income-statement", division)
            for f in _IS_FAMILIES
        }
        depreciation = self._sum_accounts(
            self.dep_accounts, fiscal_year, months, "income-statement", division,
        )
        revenue = fam["REV"]
        gross_profit = revenue - fam["CMV"]
        expenses = (
            fam["CMV"] + fam["EXP"] + fam["ADM"] + fam["VNT"]
            + fam["FIN"] + fam["AUT"] + fam["IMP"]
        )
        net_income = revenue - expenses
        ebit = net_income + fam["FIN"] + fam["IMP"]
        ebitda = ebit + depreciation
        return {
            "revenue": revenue,
            "gross_profit": gross_profit,
            "net_income": net_income,
            "ebit": ebit,
            "ebitda": ebitda,
            "interest": fam["FIN"],
            "taxes": fam["IMP"],
            "depreciation": depreciation,
        }

    def balance_metrics(self, fiscal_year: int) -> dict[str, float]:
        months = self.bs_months(fiscal_year)
        current_assets = self._sum_family("ACT", fiscal_year, months, "balance-sheet")
        long_term_assets = self._sum_family("ALT", fiscal_year, months, "balance-sheet")
        current_liabilities = self._sum_family("PCT", fiscal_year, months, "balance-sheet")
        long_term_liabilities = self._sum_family("PLT", fiscal_year, months, "balance-sheet")
        inventory = self._sum_accounts(
            self.inv_accounts, fiscal_year, months, "balance-sheet",
        )
        total_assets = current_assets + long_term_assets
        total_liabilities = current_liabilities + long_term_liabilities
        return {
            "current_assets": current_assets,
            "long_term_assets": long_term_assets,
            "current_liabilities": current_liabilities,
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "equity": total_assets - total_liabilities,
            "inventory": inventory,
        }


# ─── sections du diagnostic ───────────────────────────────────────────────────

_ANNUAL_MONTHS = list(range(1, 13))


def _build_trends(ctx: _DiagnosticContext) -> list[DiagnosticTrendYear]:
    trends: list[DiagnosticTrendYear] = []
    previous_alt: float | None = None
    for fiscal_year in ctx.years:
        inc = ctx.income_metrics(fiscal_year, _ANNUAL_MONTHS)
        bal = ctx.balance_metrics(fiscal_year)

        # Capex ≈ Δ immobilisations nettes (ALT) + amortissement de l'exercice.
        if previous_alt is None:
            capex = 0.0
        else:
            capex = (bal["long_term_assets"] - previous_alt) + inc["depreciation"]
        previous_alt = bal["long_term_assets"]

        trends.append(
            DiagnosticTrendYear(
                fiscal_year=fiscal_year,
                revenue=_r2(inc["revenue"]),
                gross_profit=_r2(inc["gross_profit"]),
                gross_margin_pct=_pct(inc["gross_profit"], inc["revenue"]),
                ebitda=_r2(inc["ebitda"]),
                ebitda_margin_pct=_pct(inc["ebitda"], inc["revenue"]),
                net_income=_r2(inc["net_income"]),
                net_margin_pct=_pct(inc["net_income"], inc["revenue"]),
                current_assets=_r2(bal["current_assets"]),
                current_liabilities=_r2(bal["current_liabilities"]),
                inventory=_r2(bal["inventory"]),
                total_assets=_r2(bal["total_assets"]),
                total_liabilities=_r2(bal["total_liabilities"]),
                equity=_r2(bal["equity"]),
                depreciation=_r2(inc["depreciation"]),
                capex=_r2(capex),
                current_ratio=_ratio(bal["current_assets"], bal["current_liabilities"]),
                quick_ratio=_ratio(
                    bal["current_assets"] - bal["inventory"], bal["current_liabilities"],
                ),
                debt_to_equity=_ratio(bal["total_liabilities"], bal["equity"]),
                asset_turnover=_ratio(inc["revenue"], bal["total_assets"]),
                interest_coverage=_ratio(inc["ebit"], inc["interest"]),
            )
        )
    return trends


def _revenue_cagr(trends: list[DiagnosticTrendYear]) -> float | None:
    with_revenue = [t for t in trends if t.revenue > 0]
    if len(with_revenue) < 2:
        return None
    first, last = with_revenue[0], with_revenue[-1]
    return _cagr_pct(first.revenue, last.revenue, last.fiscal_year - first.fiscal_year)


def _lifecycle_stage(cagr_pct: float | None) -> str:
    if cagr_pct is None:
        return "indéterminé"
    if cagr_pct > _LIFECYCLE_GROWTH_THRESHOLD_PCT:
        return "croissance"
    if cagr_pct < -_LIFECYCLE_GROWTH_THRESHOLD_PCT:
        return "décroissance"
    return "maturité"


def _build_seasonality(ctx: _DiagnosticContext) -> list[DiagnosticSeasonalityMonth]:
    if not ctx.years:
        return []
    year_count = len(ctx.years)
    avg_revenue: list[float] = []
    avg_ebitda: list[float] = []
    for month in range(1, 13):
        rev_total = 0.0
        ebitda_total = 0.0
        for fiscal_year in ctx.years:
            inc = ctx.income_metrics(fiscal_year, [month])
            rev_total += inc["revenue"]
            ebitda_total += inc["ebitda"]
        avg_revenue.append(rev_total / year_count)
        avg_ebitda.append(ebitda_total / year_count)

    total_avg_revenue = sum(avg_revenue)
    months: list[DiagnosticSeasonalityMonth] = []
    for month in range(1, 13):
        cal_month, _ = _fiscal_month_to_calendar(month, ctx.fy_end_month)
        months.append(
            DiagnosticSeasonalityMonth(
                month_number=month,
                month_label=FRENCH_MONTH_ABBREVS[cal_month - 1],
                average_revenue=_r2(avg_revenue[month - 1]),
                average_ebitda=_r2(avg_ebitda[month - 1]),
                revenue_share_pct=_pct(avg_revenue[month - 1], total_avg_revenue),
                ebitda_margin_pct=_pct(avg_ebitda[month - 1], avg_revenue[month - 1]),
            )
        )
    return months


def _build_divisions(
    ctx: _DiagnosticContext, latest_year: int, total_revenue: float,
) -> list[DiagnosticDivisionPerformance]:
    divisions = (
        ctx.db.query(Division)
        .filter(Division.company_id == ctx.company.id)
        .order_by(Division.name)
        .all()
    )
    results: list[DiagnosticDivisionPerformance] = []
    for division in divisions:
        inc = ctx.income_metrics(latest_year, _ANNUAL_MONTHS, division)

        yearly_revenue = [
            (fy, ctx.income_metrics(fy, _ANNUAL_MONTHS, division)["revenue"])
            for fy in ctx.years
        ]
        positive = [(fy, rev) for fy, rev in yearly_revenue if rev > 0]
        cagr = (
            _cagr_pct(positive[0][1], positive[-1][1], positive[-1][0] - positive[0][0])
            if len(positive) >= 2
            else None
        )

        results.append(
            DiagnosticDivisionPerformance(
                division_id=str(division.id),
                division_name=division.name,
                revenue=_r2(inc["revenue"]),
                gross_profit=_r2(inc["gross_profit"]),
                gross_margin_pct=_pct(inc["gross_profit"], inc["revenue"]),
                ebitda=_r2(inc["ebitda"]),
                ebitda_margin_pct=_pct(inc["ebitda"], inc["revenue"]),
                net_income=_r2(inc["net_income"]),
                revenue_share_pct=_pct(inc["revenue"], total_revenue),
                revenue_cagr_5y=cagr,
                profitable=inc["net_income"] > 0,
            )
        )
    return results


def _product_tokens(ctx: _DiagnosticContext) -> list[str]:
    tokens: set[str] = set()
    for m in ctx.mappings:
        for raw in str(m.product or "").split(","):
            token = raw.strip()
            if token:
                tokens.add(token)
    if not tokens:
        return []

    ordered: list[str] = []
    products = (
        ctx.db.query(Product)
        .filter(Product.company_id == ctx.company.id)
        .order_by(Product.sort_order, Product.name)
        .all()
    )
    for product in products:
        name = product.name.strip()
        if name in tokens and name not in ordered:
            ordered.append(name)
    for token in sorted(tokens):
        if token not in ordered:
            ordered.append(token)
    return ordered


def _build_products(
    ctx: _DiagnosticContext, latest_year: int, total_revenue: float,
) -> tuple[list[DiagnosticProductPerformance], list[DiagnosticDivisionProductPerformance]]:
    tokens = _product_tokens(ctx)
    if not tokens:
        return [], []

    products: list[DiagnosticProductPerformance] = []
    for token in tokens:
        with _product_scope(token):
            inc = ctx.income_metrics(latest_year, _ANNUAL_MONTHS)
        products.append(
            DiagnosticProductPerformance(
                product_name=token,
                revenue=_r2(inc["revenue"]),
                gross_profit=_r2(inc["gross_profit"]),
                gross_margin_pct=_pct(inc["gross_profit"], inc["revenue"]),
                ebitda=_r2(inc["ebitda"]),
                ebitda_margin_pct=_pct(inc["ebitda"], inc["revenue"]),
                revenue_share_pct=_pct(inc["revenue"], total_revenue),
            )
        )

    division_products: list[DiagnosticDivisionProductPerformance] = []
    divisions = (
        ctx.db.query(Division)
        .filter(Division.company_id == ctx.company.id)
        .order_by(Division.name)
        .all()
    )
    for division in divisions:
        for token in tokens:
            with _product_scope(token):
                inc = ctx.income_metrics(latest_year, _ANNUAL_MONTHS, division)
            if abs(inc["revenue"]) < 0.005:
                continue
            division_products.append(
                DiagnosticDivisionProductPerformance(
                    division_id=str(division.id),
                    division_name=division.name,
                    product_name=token,
                    revenue=_r2(inc["revenue"]),
                    gross_profit=_r2(inc["gross_profit"]),
                    gross_margin_pct=_pct(inc["gross_profit"], inc["revenue"]),
                    ebitda=_r2(inc["ebitda"]),
                    ebitda_margin_pct=_pct(inc["ebitda"], inc["revenue"]),
                )
            )
    return products, division_products


# ─── évaluation indicative ────────────────────────────────────────────────────

_MULTIPLE_KEY_PAIRS: tuple[tuple[str, str], ...] = (
    ("low", "high"),
    ("multiple_low", "multiple_high"),
    ("multipleLow", "multipleHigh"),
    ("min", "max"),
    ("rangeLow", "rangeHigh"),
)


def _extract_multiple_range(data: object) -> tuple[float, float] | None:
    if not isinstance(data, dict):
        return None
    for low_key, high_key in _MULTIPLE_KEY_PAIRS:
        try:
            low = float(data.get(low_key))  # type: ignore[arg-type]
            high = float(data.get(high_key))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        if low > 0 and high >= low:
            return low, high
    return None


def _resolve_multiples(db: Session, company: Company) -> tuple[float, float, bool]:
    """(multiple_low, multiple_high, provient_d_une_config)."""
    configs = (
        db.query(ForecastConfig)
        .filter(
            ForecastConfig.organization_id == company.organization_id,
            ForecastConfig.company_id == company.id,
            ForecastConfig.config_type == _EBITDA_MULTIPLE_CONFIG_TYPE,
        )
        .all()
    )
    # Priorité à la configuration au niveau entreprise (sans division/projection).
    configs.sort(
        key=lambda c: (
            c.division_id is not None,
            c.sub_division_id is not None,
            c.projection_id is not None,
        )
    )
    for config in configs:
        rng = _extract_multiple_range(config.data)
        if rng:
            return rng[0], rng[1], True
    return _DEFAULT_MULTIPLE_LOW, _DEFAULT_MULTIPLE_HIGH, False


def _build_valuation(
    db: Session, company: Company, trends: list[DiagnosticTrendYear],
) -> DiagnosticValuation:
    recent = trends[-_MAX_VALUATION_YEARS:]
    if recent:
        # `recent` est croissant ; les poids s'appliquent du plus récent au plus ancien.
        weighted_pairs = list(zip(_VALUATION_WEIGHTS, reversed([t.ebitda for t in recent])))
        weight_total = sum(w for w, _ in weighted_pairs)
        normalized_ebitda = sum(w * e for w, e in weighted_pairs) / weight_total
        years_used = ", ".join(str(t.fiscal_year) for t in recent)
    else:
        normalized_ebitda = 0.0
        years_used = ""

    multiple_low, multiple_high, from_config = _resolve_multiples(db, company)
    ev_low = normalized_ebitda * multiple_low
    ev_high = normalized_ebitda * multiple_high
    ev_mid = normalized_ebitda * (multiple_low + multiple_high) / 2.0
    book_equity = trends[-1].equity if trends else 0.0

    rationale: list[str] = []
    if recent:
        rationale.append(
            f"BAIIA normalisé : moyenne pondérée (3/2/1, plus récent en premier) "
            f"des exercices {years_used}."
        )
    else:
        rationale.append(
            "Aucun exercice disponible : BAIIA normalisé nul."
        )
    if from_config:
        rationale.append(
            "Multiples issus de la configuration « ebitda_multiple » de l'entreprise."
        )
    else:
        rationale.append(
            f"Multiples par défaut ({_DEFAULT_MULTIPLE_LOW:.1f}x – "
            f"{_DEFAULT_MULTIPLE_HIGH:.1f}x) utilisés en l'absence de configuration."
        )
    rationale.append(
        "Valeur d'entreprise = BAIIA normalisé × multiple ; à titre indicatif, "
        "ne constitue pas une évaluation formelle."
    )

    return DiagnosticValuation(
        normalized_ebitda=_r2(normalized_ebitda),
        multiple_low=_r2(multiple_low),
        multiple_high=_r2(multiple_high),
        enterprise_value_low=_r2(ev_low),
        enterprise_value_high=_r2(ev_high),
        enterprise_value_mid=_r2(ev_mid),
        book_equity=_r2(book_equity),
        rationale=rationale,
    )


# ─── point d'entrée ───────────────────────────────────────────────────────────

def compute_company_diagnostic(db: Session, company: Company) -> CompanyDiagnosticResponse:
    """Calcule le diagnostic complet d'une entreprise.

    Comportement sans données TB : réponse 200 schéma-valide avec tendances,
    saisonnalité, divisions et produits vides ; `latest_fiscal_year` = année
    civile courante ; sommaire à zéro ; évaluation avec multiples par défaut.
    """
    ctx = _DiagnosticContext(db, company)

    trends = _build_trends(ctx)
    seasonality = _build_seasonality(ctx)

    notes: list[str] = [_INDICATIVE_NOTE]
    if not trends:
        notes.append(_NO_DATA_NOTE)

    if trends:
        latest = trends[-1]
        latest_year = latest.fiscal_year
        divisions = _build_divisions(ctx, latest_year, latest.revenue)
        products, division_products = _build_products(ctx, latest_year, latest.revenue)
    else:
        latest = None
        latest_year = datetime.now(timezone.utc).year
        divisions = []
        products = []
        division_products = []

    valuation = _build_valuation(db, company, trends)
    cagr = _revenue_cagr(trends)

    if latest is not None:
        summary = DiagnosticSummary(
            latest_fiscal_year=latest_year,
            lifecycle_stage=_lifecycle_stage(cagr),
            revenue_cagr_5y=cagr,
            latest_revenue=latest.revenue,
            latest_ebitda=latest.ebitda,
            latest_net_income=latest.net_income,
            latest_gross_margin_pct=latest.gross_margin_pct,
            latest_ebitda_margin_pct=latest.ebitda_margin_pct,
            latest_net_margin_pct=latest.net_margin_pct,
            current_ratio=latest.current_ratio,
            quick_ratio=latest.quick_ratio,
            debt_to_equity=latest.debt_to_equity,
            capex_latest=latest.capex,
            capex_revenue_pct=_pct(latest.capex, latest.revenue),
            indicative_enterprise_value_mid=valuation.enterprise_value_mid,
        )
    else:
        summary = DiagnosticSummary(
            latest_fiscal_year=latest_year,
            lifecycle_stage=_lifecycle_stage(None),
            revenue_cagr_5y=None,
            indicative_enterprise_value_mid=valuation.enterprise_value_mid,
        )

    return CompanyDiagnosticResponse(
        company_id=str(company.id),
        company_name=company.name,
        currency=company.currency,
        fiscal_year_end=company.fiscal_year_end,
        latest_fiscal_year=latest_year,
        summary=summary,
        trends=trends,
        seasonality=seasonality,
        divisions=divisions,
        products=products,
        division_products=division_products,
        valuation=valuation,
        notes=notes,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
