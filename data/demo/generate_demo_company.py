"""Génère une comptabilité fictive complète (2021–2025) pour tester Modelisys.

Société : « Groupe Industriel Laurentien inc. (démo) »
- 3 divisions : Fabrication, Distribution, Services techniques (déficitaire)
- 4 produits/services, saisonnalité estivale, croissance ~11 %/an
- 60 mois de balance de vérification CUMULATIVE (YTD), équilibrée au cent près

Usage (depuis la racine du repo) :
    python data/demo/generate_demo_company.py generate   # écrit le .xlsx + mappings CSV
    python data/demo/generate_demo_company.py seed       # crée la société via l'API locale
                                                         # (compagnie + divisions + produits
                                                         #  + mappings + import TB 60 mois)

Le seed utilise l'API locale (http://localhost:8000) avec le compte test
(test@test.com / password). Variables d'env pour surcharger :
MODELISYS_API, MODELISYS_EMAIL, MODELISYS_PASSWORD.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):  # console Windows cp1252
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from openpyxl import Workbook

HERE = Path(__file__).resolve().parent
XLSX_PATH = HERE / "bv-groupe-laurentien-2021-2025.xlsx"
CSV_PATH = HERE / "mappings-groupe-laurentien.csv"

COMPANY_NAME = "Groupe Industriel Laurentien inc. (démo)"
YEARS = [2021, 2022, 2023, 2024, 2025]
MONTH_LABELS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

DIV_FAB = "Fabrication"
DIV_DIST = "Distribution"
DIV_ST = "Services techniques"
DIVISIONS = [DIV_FAB, DIV_DIST, DIV_ST]

P_CHARP = "Charpentes métalliques"
P_COMP = "Composants usinés"
P_PIECES = "Distribution de pièces"
P_ENTR = "Entretien et réparation"
PRODUCTS = [P_CHARP, P_COMP, P_PIECES, P_ENTR]

# Saisonnalité (poids par mois calendrier, normalisés pour sommer à 12) :
# pointe en juin–juillet, creux décembre–février.
_RAW_SEASON = [0.80, 0.82, 0.96, 1.06, 1.16, 1.28, 1.32, 1.14, 1.02, 0.94, 0.80, 0.70]
SEASON = [w * 12.0 / sum(_RAW_SEASON) for w in _RAW_SEASON]

# Revenus annuels 2025 par produit et croissance annuelle par produit.
REV_2025 = {P_CHARP: 8_000_000, P_COMP: 4_000_000, P_PIECES: 4_500_000, P_ENTR: 2_000_000}
GROWTH = {P_CHARP: 1.14, P_COMP: 1.12, P_PIECES: 1.09, P_ENTR: 1.01}

# Taux de CMV 2025 par produit (léger gain d'efficacité vs 2021 : +1,5 pt en 2021).
COGS_2025 = {P_CHARP: 0.58, P_COMP: 0.62, P_PIECES: 0.66, P_ENTR: 0.70}
COGS_DRIFT = 0.015 / 4  # points de taux en moins par année écoulée

PRODUCT_DIV = {P_CHARP: DIV_FAB, P_COMP: DIV_FAB, P_PIECES: DIV_DIST, P_ENTR: DIV_ST}

# Charges d'exploitation 2025 (annuelles) ; croissance 7 %/an (plus lente que le CA).
OPEX_GROWTH = 1.07
OPEX_2025 = {
    # (compte, description, link_code, division, saisonnier?)
    "6010": ("Salaires indirects - usine", "EXP.1", DIV_FAB, 1_020_000, False),
    "6020": ("Énergie - usine", "EXP.7", DIV_FAB, 260_000, True),   # hiver = plus cher
    "6030": ("Entretien des équipements", "EXP.3", DIV_FAB, 170_000, False),
    "6110": ("Salaires - entrepôt", "EXP.1", DIV_DIST, 380_000, False),
    "6120": ("Loyer - entrepôt", "EXP.2", DIV_DIST, 220_000, False),
    "6210": ("Salaires - techniciens", "EXP.1", DIV_ST, 640_000, False),
    "6220": ("Véhicules de service", "EXP.16", DIV_ST, 110_000, False),
    "7010": ("Salaires - administration", "ADM.1", None, 550_000, False),
    "7020": ("Loyer - bureau", "ADM.2", None, 120_000, False),
    "7030": ("Assurances", "ADM.5", None, 50_000, False),
    "7040": ("Honoraires professionnels", "ADM.12", None, 60_000, False),
    "7050": ("Charges informatiques", "ADM.13", None, 50_000, False),
    "7060": ("Télécommunications", "ADM.9", None, 20_000, False),
    "7510": ("Salaires - ventes", "VNT.1", None, 200_000, False),
    "7520": ("Publicité et promotion", "VNT.14", None, 80_000, False),
    "7540": ("Déplacements - ventes", "VNT.10", None, 30_000, False),
}
COMMISSION_RATE = 0.0055  # 7530 Commissions : % des ventes du mois

TAX_RATE = 0.26

# Immobilisations : soldes bruts au 1er janvier 2021 et capex annuel.
IMMO_START = {"1500": 3_800_000, "1510": 900_000, "1520": 500_000}
ACC_AMORT_START = -2_100_000
CAPEX_BY_YEAR = {2021: 450_000, 2022: 550_000, 2023: 700_000, 2024: 850_000, 2025: 940_000}
CAPEX_MONTH_SPLIT = {3: 0.40, 6: 0.35, 10: 0.25}  # mars / juin / octobre
CAPEX_ACCOUNT_SPLIT = {"1500": 0.70, "1510": 0.20, "1520": 0.10}
AMORT_RATE_ANNUAL = 0.115  # amortissement ≈ 11,5 % du brut (linéaire, calculé sur le brut courant)

# Dette long terme : solde initial, nouvel emprunt (avec le capex 2023), versement mensuel.
DEBT_START = 2_400_000
DEBT_NEW = {2023: 300_000}  # encaissé en juin 2023
DEBT_MONTHLY_PRINCIPAL = 25_000
DEBT_ANNUAL_RATE = 0.065
CURRENT_PORTION = DEBT_MONTHLY_PRINCIPAL * 12

CAPITAL_STOCK = 500_000
CASH_TARGET_START = 1_200_000  # encaisse visée au 31 janvier 2021 (fixe les BNR d'ouverture)


def r2(x: float) -> float:
    return round(x + 0.0, 2)


def rev_product_year(product: str, year: int) -> float:
    return REV_2025[product] / (GROWTH[product] ** (2025 - year))


def cogs_rate(product: str, year: int) -> float:
    return COGS_2025[product] + COGS_DRIFT * (2025 - year)


# ---------------------------------------------------------------------------
# Plan comptable + mappings
# ---------------------------------------------------------------------------

def build_accounts() -> list[dict]:
    """Chaque compte : mapping (link_code, division, produit, flags)."""
    acc: list[dict] = []

    def add(num, desc, code, div=None, prod=None, **flags):
        acc.append({
            "account_number": num, "description": desc, "link_code": code,
            "divisions": div, "product": prod, **flags,
        })

    # Revenus (crédits)
    add("4010", "Ventes - Charpentes métalliques", "REV.1", DIV_FAB, P_CHARP)
    add("4020", "Ventes - Composants usinés", "REV.1", DIV_FAB, P_COMP)
    add("4110", "Ventes - Distribution de pièces", "REV.1", DIV_DIST, P_PIECES)
    add("4210", "Ventes - Entretien et réparation", "REV.1", DIV_ST, P_ENTR)

    # CMV
    add("5010", "Matières premières - Charpentes", "CMV.3", DIV_FAB, P_CHARP)
    add("5015", "Main-d'œuvre directe - Charpentes", "CMV.4", DIV_FAB, P_CHARP)
    add("5020", "Matières premières - Composants", "CMV.3", DIV_FAB, P_COMP)
    add("5025", "Main-d'œuvre directe - Composants", "CMV.4", DIV_FAB, P_COMP)
    add("5110", "Achats - Distribution de pièces", "CMV.3", DIV_DIST, P_PIECES)
    add("5115", "Transport sur achats", "CMV.6", DIV_DIST, P_PIECES)
    add("5210", "Main-d'œuvre - Entretien", "CMV.4", DIV_ST, P_ENTR)
    add("5215", "Pièces et fournitures - Entretien", "CMV.3", DIV_ST, P_ENTR)

    # Charges d'exploitation / admin / ventes
    for num, (desc, code, div, _amt, _season) in OPEX_2025.items():
        add(num, desc, code, div)
    add("7070", "Amortissement - Immobilisations corporelles", "ADM.20", None, amortization=True)
    add("7530", "Commissions sur ventes", "VNT.3", None)

    # Frais financiers + impôts
    add("7710", "Intérêts sur la dette à long terme", "FIN.3", None, interests=True)
    add("7720", "Intérêts et frais bancaires", "FIN.1", None, interests=True)
    add("7910", "Impôts exigibles", "IMP.1", None)

    # Bilan — actif
    add("1010", "Encaisse", "ACT-A")
    add("1100", "Comptes clients", "ACT-C.1")
    add("1200", "Stocks", "ACT-D")
    add("1300", "Frais payés d'avance", "ACT-E")
    add("1500", "Équipement de production", "ALT-B.5")
    add("1510", "Matériel roulant", "ALT-B.8")
    add("1520", "Matériel informatique", "ALT-B.7")
    add("1590", "Amortissement cumulé - Immobilisations", "ALT-B.11")

    # Bilan — passif + capitaux propres
    add("2010", "Comptes fournisseurs", "PCT-C.1")
    add("2020", "Salaires et vacances à payer", "PCT-C.3")
    add("2030", "Taxes à la consommation à remettre", "PCT-C.6")
    add("2100", "Portion courante de la dette à long terme", "PCT-G")
    add("2500", "Dette à long terme", "PLT-C.1",
        liability_remaining_years=8.0, liability_interest_rate=DEBT_ANNUAL_RATE)
    add("3010", "Capital-actions", "CAP-A")
    add("3020", "Bénéfices non répartis", "CAP-B")
    return acc


# ---------------------------------------------------------------------------
# Moteur de génération : activité mensuelle -> BV cumulative (YTD)
# ---------------------------------------------------------------------------

def generate_books() -> tuple[list[dict], dict[str, list[float]], list[str]]:
    """Retourne (accounts, {compte: [60 soldes YTD signés]}, libellés de colonnes)."""
    accounts = build_accounts()
    nums = [a["account_number"] for a in accounts]
    n = len(YEARS) * 12
    activity: dict[str, list[float]] = {k: [0.0] * n for k in nums}

    # --- État des résultats : activité mensuelle (débits +, crédits −) ---
    for yi, year in enumerate(YEARS):
        for m in range(12):
            idx = yi * 12 + m
            w = SEASON[m] / 12.0
            month_sales = 0.0
            for prod, accno in ((P_CHARP, "4010"), (P_COMP, "4020"),
                                (P_PIECES, "4110"), (P_ENTR, "4210")):
                sales = rev_product_year(prod, year) * w
                month_sales += sales
                activity[accno][idx] = -sales  # crédit
                rate = cogs_rate(prod, year)
                if prod == P_CHARP:
                    activity["5010"][idx] = sales * rate * 0.62
                    activity["5015"][idx] = sales * rate * 0.38
                elif prod == P_COMP:
                    activity["5020"][idx] = sales * rate * 0.60
                    activity["5025"][idx] = sales * rate * 0.40
                elif prod == P_PIECES:
                    activity["5110"][idx] = sales * rate * 0.88
                    activity["5115"][idx] = sales * rate * 0.12
                else:
                    activity["5210"][idx] = sales * rate * 0.72
                    activity["5215"][idx] = sales * rate * 0.28

            growth_back = OPEX_GROWTH ** (2025 - year)
            for num, (_d, _c, _div, amt2025, seasonal) in OPEX_2025.items():
                annual = amt2025 / growth_back
                if seasonal:  # énergie : plus cher l'hiver (poids inverse de la saisonnalité)
                    inv = [2.0 - s for s in SEASON]
                    activity[num][idx] = annual * (inv[m] / sum(inv))
                else:
                    activity[num][idx] = annual / 12.0
            activity["7530"][idx] = month_sales * COMMISSION_RATE

    # --- Immobilisations, amortissement, dette (soldes as-of) ---
    gross = dict(IMMO_START)
    acc_amort = ACC_AMORT_START
    debt = DEBT_START
    gross_bal = {k: [0.0] * n for k in IMMO_START}
    amort_bal = [0.0] * n
    debt_bal = [0.0] * n
    for yi, year in enumerate(YEARS):
        for m in range(12):
            idx = yi * 12 + m
            share = CAPEX_MONTH_SPLIT.get(m + 1, 0.0)
            if share:
                for accno, part in CAPEX_ACCOUNT_SPLIT.items():
                    gross[accno] += CAPEX_BY_YEAR[year] * share * part
            monthly_amort = sum(gross.values()) * AMORT_RATE_ANNUAL / 12.0
            acc_amort -= monthly_amort
            activity["7070"][idx] = monthly_amort  # dotation (débit)
            if year in DEBT_NEW and m + 1 == 6:
                debt += DEBT_NEW[year]
            interest = debt * DEBT_ANNUAL_RATE / 12.0
            activity["7710"][idx] = interest
            activity["7720"][idx] = 1_500.0
            debt = max(debt - DEBT_MONTHLY_PRINCIPAL, 0.0)
            for k in gross:
                gross_bal[k][idx] = gross[k]
            amort_bal[idx] = acc_amort
            debt_bal[idx] = debt

    # --- Impôts : 26 % du bénéfice avant impôts du mois (jamais négatif en YTD) ---
    pl_before_tax = [
        a for a in accounts
        if a["account_number"].startswith(("4", "5", "6", "7")) and a["account_number"] != "7910"
    ]
    for idx in range(n):
        ebt = -sum(activity[a["account_number"]][idx] for a in pl_before_tax)
        activity["7910"][idx] = max(ebt, 0.0) * TAX_RATE

    # --- Balances YTD (résultats) et soldes as-of (bilan) ---
    ytd: dict[str, list[float]] = {k: [0.0] * n for k in nums}
    pl_accounts = [k for k in nums if k.startswith(("4", "5", "6", "7"))]
    for k in pl_accounts:
        for yi in range(len(YEARS)):
            run = 0.0
            for m in range(12):
                idx = yi * 12 + m
                run += activity[k][idx]
                ytd[k][idx] = r2(run)

    # BNR d'ouverture : fixés pour viser l'encaisse cible au 31 janvier 2021.
    retained = None
    net_income_by_year: list[float] = []
    for yi, year in enumerate(YEARS):
        ni = -sum(activity[k][yi * 12 + m] for k in pl_accounts for m in range(12))
        net_income_by_year.append(ni)

    for yi, year in enumerate(YEARS):
        for m in range(12):
            idx = yi * 12 + m
            month_sales = -sum(ytd[k][idx] - (ytd[k][idx - 1] if m else 0.0)
                               for k in ("4010", "4020", "4110", "4210"))
            month_cogs = sum(ytd[k][idx] - (ytd[k][idx - 1] if m else 0.0)
                             for k in ("5010", "5015", "5020", "5025", "5110", "5115", "5210", "5215"))
            payroll_m = sum(
                ytd[k][idx] - (ytd[k][idx - 1] if m else 0.0)
                for k in ("6010", "6110", "6210", "7010", "7510", "5015", "5025", "5210")
            )
            ytd["1100"][idx] = r2(month_sales * 1.50)             # ~45 jours de ventes
            ytd["1200"][idx] = r2(max(month_cogs, 1.0) * 1.40)    # ~6 semaines de CMV
            ytd["1300"][idx] = r2(60_000 + 4_000 * ((m + 6) % 12))
            for k in IMMO_START:
                ytd[k][idx] = r2(gross_bal[k][idx])
            ytd["1590"][idx] = r2(amort_bal[idx])
            ytd["2010"][idx] = r2(-max(month_cogs, 1.0) * 1.15)   # ~35 jours d'achats
            ytd["2020"][idx] = r2(-payroll_m * 0.50)
            ytd["2030"][idx] = r2(-month_sales * 0.02)
            ytd["2100"][idx] = r2(-CURRENT_PORTION)
            ytd["2500"][idx] = r2(-(debt_bal[idx] - CURRENT_PORTION))
            ytd["3010"][idx] = r2(-CAPITAL_STOCK)

            if retained is None:  # premier mois : caler les BNR (signés, crédit < 0)
                other = sum(ytd[k][idx] for k in nums if k not in ("1010", "3020"))
                retained = -(other + CASH_TARGET_START)
            # BNR d'ouverture de l'exercice = BNR initiaux − bénéfices accumulés des
            # exercices précédents (un profit augmente le crédit, donc plus négatif).
            ytd["3020"][idx] = r2(retained - sum(net_income_by_year[:yi]))
            # Encaisse = contrepartie exacte -> chaque colonne somme à 0,00 $.
            ytd["1010"][idx] = r2(-sum(ytd[k][idx] for k in nums if k != "1010"))

    # --- Invariants ---
    labels = [f"{MONTH_LABELS[m]} {y}" for y in YEARS for m in range(12)]
    for idx in range(n):
        col = sum(ytd[k][idx] for k in nums)
        assert abs(col) < 0.005, f"colonne non équilibrée {labels[idx]} : {col:.2f}"
        assert ytd["1010"][idx] > 50_000, f"encaisse trop basse en {labels[idx]} : {ytd['1010'][idx]:,.0f}"

    print("Bénéfice net par exercice :")
    for year, ni in zip(YEARS, net_income_by_year):
        rev = sum(rev_product_year(p, year) for p in PRODUCTS)
        print(f"  {year} : CA {rev:12,.0f} $   BN {ni:10,.0f} $   marge {ni / rev * 100:5.1f} %")
    st_rev = rev_product_year(P_ENTR, 2025)
    st_cogs = st_rev * cogs_rate(P_ENTR, 2025)
    st_opex = OPEX_2025["6210"][3] + OPEX_2025["6220"][3]
    print(f"  Services techniques 2025 : EBITDA {st_rev - st_cogs - st_opex:,.0f} $ (déficitaire attendu)")
    return accounts, ytd, labels


# ---------------------------------------------------------------------------
# Sorties : xlsx (import multi-mois) + csv (référence mappings)
# ---------------------------------------------------------------------------

def write_outputs(accounts: list[dict], ytd: dict[str, list[float]], labels: list[str]) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "BV 2021-2025"
    ws.append(["# de compte", "Description", *labels])
    for a in accounts:
        num = a["account_number"]
        ws.append([num, a["description"], *ytd[num]])
    wb.save(XLSX_PATH)

    import csv as _csv
    with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
        w = _csv.writer(f, delimiter=";")
        w.writerow(["# de compte", "Description", "Code de liaison", "Division", "Produit/Service",
                    "Amortissement", "Intérêts"])
        for a in accounts:
            w.writerow([
                a["account_number"], a["description"], a["link_code"],
                a.get("divisions") or "", a.get("product") or "",
                "oui" if a.get("amortization") else "", "oui" if a.get("interests") else "",
            ])
    print(f"Écrit : {XLSX_PATH.name} ({len(accounts)} comptes × {len(labels)} mois)")
    print(f"Écrit : {CSV_PATH.name}")


# ---------------------------------------------------------------------------
# Seed via l'API locale
# ---------------------------------------------------------------------------

def seed(accounts: list[dict]) -> None:
    import httpx

    api = os.environ.get("MODELISYS_API", "http://localhost:8000")
    email = os.environ.get("MODELISYS_EMAIL", "test@test.com")
    password = os.environ.get("MODELISYS_PASSWORD", "password")

    client = httpx.Client(base_url=api, timeout=180.0)
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    existing = client.get("/api/companies").json()
    for c in existing if isinstance(existing, list) else existing.get("companies", []):
        if c["name"] == COMPANY_NAME:
            print(f"La société « {COMPANY_NAME} » existe déjà (id={c['id']}) — abandon.")
            print("Supprime-la dans Configuration > Entreprises pour re-seeder.")
            sys.exit(1)

    r = client.post("/api/companies", json={
        "name": COMPANY_NAME,
        "fiscal_year_end": "12-31",
        "currency": "CAD",
        "is_cumulative_tb": True,
        "divisions": [{"name": d} for d in DIVISIONS],
    })
    r.raise_for_status()
    company_id = r.json()["id"]
    print(f"Société créée : {company_id}")

    r = client.put(f"/api/companies/{company_id}/products", json=PRODUCTS)
    r.raise_for_status()
    print(f"Produits : {len(PRODUCTS)}")

    entries = []
    for a in accounts:
        e = {k: v for k, v in a.items() if v is not None}
        entries.append(e)
    r = client.put(f"/api/companies/{company_id}/account-mappings", json=entries)
    if r.status_code >= 400:
        print("Erreur mappings :", r.status_code, r.text[:2000])
        sys.exit(1)
    print(f"Mappings : {len(entries)} comptes")

    with open(XLSX_PATH, "rb") as f:
        r = client.post(
            f"/api/companies/{company_id}/trial-balance/upload",
            params={"import_mode": "multi", "start_year": YEARS[0],
                    "start_month": 1, "month_count": len(YEARS) * 12},
            files={"file": (XLSX_PATH.name, f,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
    if r.status_code >= 400:
        print("Erreur import BV :", r.status_code, r.text[:2000])
        sys.exit(1)
    print("Import BV :", r.json().get("message", "OK"))

    r = client.get(f"/api/companies/{company_id}/diagnostic")
    if r.status_code == 200:
        d = r.json()
        s = d["summary"]
        print("\nDiagnostic :")
        print(f"  Stade : {s['lifecycle_stage']}   TCAC 5 ans : {s['revenue_cagr_5y']} %")
        print(f"  CA {s['latest_revenue']:,.0f} $  EBITDA {s['latest_ebitda']:,.0f} $  "
              f"BN {s['latest_net_income']:,.0f} $")
        print(f"  Divisions : {[(x['division_name'], x['profitable']) for x in d['divisions']]}")
        print(f"  VE indicative (méd.) : {s['indicative_enterprise_value_mid']:,.0f} $")
    else:
        print("Diagnostic non disponible :", r.status_code, r.text[:500])
    print(f"\nOuvre http://localhost:3000/modules/diagnostic et choisis « {COMPANY_NAME} ».")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "generate"
    accounts, ytd, labels = generate_books()
    if mode == "generate":
        write_outputs(accounts, ytd, labels)
    elif mode == "seed":
        if not XLSX_PATH.exists():
            write_outputs(accounts, ytd, labels)
        seed(accounts)
    else:
        print(__doc__)
        sys.exit(1)
