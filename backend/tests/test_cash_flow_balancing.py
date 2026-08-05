"""L'état des flux de trésorerie doit balancer.

Trésorerie au début + Variation nette = Trésorerie à la fin, et cette trésorerie
à la fin doit égaler celle lue au bilan. La ligne Validation matérialise l'écart :
elle vaut 0 $ quand chaque poste de bilan est rattaché à une section, et affiche
le trou dès qu'il en manque un.
"""

from tests.test_financial_statements import (
    MONTHS_FR,
    _create_company,
    _upsert_account_mappings,
    _upsert_structure,
    _upsert_trial_balance,
)

# Codes de la charte utilisés par le scénario. Les préfixes de famille sont réels :
# la nature DT/CT et le classement bilan / résultat en dépendent.
BALANCE_CODES = [
    ("ACT-A", "ACT", "Encaisse", "= lié à Encaisse de fin"),
    ("PCT-A", "PCT", "Découvert bancaire", "= lié à Encaisse de fin"),
    ("ACT-C", "ACT", "Comptes clients", None),
    ("ACT-J", "ACT", "Frais payés d'avance", None),
    ("ALT-B", "ALT", "Équipement — coût", None),
    ("ALT-BAC", "ALT", "Amortissement cumulé — équipement", None),
    ("PCT-C", "PCT", "Créditeurs", None),
    ("PLT-C", "PLT", "Dette à long terme", None),
    ("CAP-A", "CAP", "Capital-actions", None),
    ("CAP-R", "CAP", "Bénéfices non répartis — ouverture", None),
    ("CAP-D", "CAP", "Dividendes", None),
    ("REV-T", "REV", "Revenus", None),
    ("EXP-T", "EXP", "Charges", None),
]

# Code Trésorerie → (famille, libellé, codes bilan / résultat rattachés)
CASH_FLOW_CODES = [
    ("TEX-NI", "TEX", "Bénéfice net", ["REV-T", "EXP-T"]),
    ("TEX-AM", "TEX", "Amortissement", ["ALT-BAC"]),
    ("TEX-WC", "TEX", "Variation des éléments hors caisse", ["ACT-C", "PCT-C"]),
    ("TIN-EQ", "TIN", "Dispositions (Acquisitions) nettes — immobilisations", ["ALT-B"]),
    ("TFI-LT", "TFI", "Ajout (Remboursement) de la dette à long terme", ["PLT-C"]),
    ("TFI-CA", "TFI", "Émission (Rachat) d'actions", ["CAP-A"]),
    ("TFI-DI", "TFI", "Versement de dividendes", ["CAP-D"]),
]

FISCAL_YEARS = (2024, 2025, 2026)

# Comptes du grand livre : numéro → (code de liaison, soldes par exercice).
# Soldes bruts : actif au débit (positif), passif / capitaux propres au crédit
# (négatif). Chaque colonne somme à zéro — ce sont des livres complets.
#
# 2024 → 2025 : exercice tranquille, rien ne bouge. C'est ce qui rend la colonne
# comparative vérifiable, et elle exige l'exercice N−2 pour son solde d'ouverture.
# 2026 : bénéfice net 300 (produits 1 000, charges 700 dont 200 d'amortissement),
# achat d'équipement 400, clients +100, créditeurs +50, remboursement de dette 150,
# dividendes 100. L'encaisse passe donc de 1 000 à 800.
GL_ACCOUNTS = {
    "1000": ("ACT-A", {2024: 1000.0, 2025: 1000.0, 2026: 800.0}),
    "1200": ("ACT-C", {2024: 500.0, 2025: 500.0, 2026: 600.0}),
    "1500": ("ALT-B", {2024: 2000.0, 2025: 2000.0, 2026: 2400.0}),
    "1590": ("ALT-BAC", {2024: -800.0, 2025: -800.0, 2026: -1000.0}),
    "2000": ("PCT-C", {2024: -700.0, 2025: -700.0, 2026: -750.0}),
    "2500": ("PLT-C", {2024: -1000.0, 2025: -1000.0, 2026: -850.0}),
    "3000": ("CAP-A", {2024: -100.0, 2025: -100.0, 2026: -100.0}),
    "3500": ("CAP-R", {2024: -900.0, 2025: -900.0, 2026: -900.0}),
    "3600": ("CAP-D", {2024: 0.0, 2025: 0.0, 2026: 100.0}),
}

# Comptes de résultat : activité de l'exercice, pas un solde. Toute l'activité de
# 2026 est passée en décembre, ce qui aligne le mois de décembre sur l'exercice.
GL_INCOME_ACCOUNTS = {
    "4000": ("REV-T", {2024: 0.0, 2025: 0.0, 2026: -1000.0}),
    "5000": ("EXP-T", {2024: 0.0, 2025: 0.0, 2026: 700.0}),
}


def _balance_sheet_months(balances: dict[int, float], fiscal_year: int) -> dict[str, float]:
    """Balance non cumulative : chaque mois porte le solde de clôture de ce mois-là.

    Les mois 1 à 11 reportent la clôture de l'exercice précédent — toute l'activité
    de l'exercice est enregistrée en décembre.
    """
    opening = balances.get(fiscal_year - 1, balances[fiscal_year])
    months = {month: opening for month in MONTHS_FR[:11]}
    months[MONTHS_FR[11]] = balances[fiscal_year]
    return months


def _seed_chart(client, su_headers):
    for code, family, label, ft_line_item in BALANCE_CODES:
        payload = {
            "code": code,
            "family": family,
            "label_sub_account": label,
            "is_leaf": True,
        }
        if ft_line_item:
            payload["ft_line_item"] = ft_line_item
        response = client.post("/api/standard-link-codes", json=payload, headers=su_headers)
        assert response.status_code == 201, response.text

    for code, family, label, attached in CASH_FLOW_CODES:
        response = client.post(
            "/api/standard-link-codes",
            json={
                "code": code,
                "family": family,
                "label_sub_account": label,
                "attached_link_codes": attached,
            },
            headers=su_headers,
        )
        assert response.status_code == 201, response.text


def _seed_company(client, auth_headers, su_headers, extra_accounts=None):
    """Company with a full three-year trial balance and a cash-flow structure."""
    _seed_chart(client, su_headers)
    company_id = _create_company(client, auth_headers, name="Flux Co")

    accounts = dict(GL_ACCOUNTS)
    accounts.update(extra_accounts or {})

    _upsert_account_mappings(client, auth_headers, company_id, [
        {"account_number": number, "description": number, "link_code": link_code}
        for number, (link_code, _) in {**accounts, **GL_INCOME_ACCOUNTS}.items()
    ])
    for fiscal_year in FISCAL_YEARS:
        entries = [
            {
                "account_number": number,
                "description": number,
                "monthly_amounts": _balance_sheet_months(balances, fiscal_year),
            }
            for number, (_link_code, balances) in accounts.items()
        ]
        entries.extend(
            {
                "account_number": number,
                "description": number,
                "monthly_amounts": {MONTHS_FR[11]: activity[fiscal_year]},
            }
            for number, (_link_code, activity) in GL_INCOME_ACCOUNTS.items()
        )
        _upsert_trial_balance(client, auth_headers, company_id, entries, fiscal_year=fiscal_year)

    _upsert_structure(client, auth_headers, company_id, "cash-flow", [
        {"id": code, "label": label, "linkCode": code, "liaisonMode": "single"}
        for code, _family, label, _attached in CASH_FLOW_CODES
    ])
    return company_id


def _cash_flow_rows(client, auth_headers, company_id, fiscal_year=2026):
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": fiscal_year, "month": 12, "period": "annual"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    return {row["id"]: row for row in response.json()["rows"]}


def test_closing_structure_repair_is_idempotent_and_formulas_resolve():
    """La réparation tourne à chaque lecture : elle ne doit ni s'empiler ni casser les renvois.

    Chaque formule ne peut référencer qu'une ligne **antérieure** — le moteur résout
    les renvois au fil du parcours, donc un renvoi vers l'aval vaudrait zéro en silence.
    """
    from app.services.statement_template import ensure_cash_flow_closing_structure

    structure = [
        {"id": "sec", "label": "Activités d'exploitation", "isSection": True},
        {"id": "TEX-01", "label": "Bénéfice net", "linkCode": "TEX-01"},
        {"id": "TEX-02", "label": "Ajustements", "linkCode": "TEX-02"},
        {"label": ""},
    ]

    une = ensure_cash_flow_closing_structure(structure)
    deux = ensure_cash_flow_closing_structure(une)
    assert une == deux == ensure_cash_flow_closing_structure(deux)

    ids = [r["id"] for r in une if r.get("id")]
    assert len(ids) == len(set(ids)), f"identifiants dupliqués : {ids}"

    connus: set[str] = set()
    for row in une:
        for ref in row.get("formula") or []:
            assert ref[1:] in connus, f"{row.get('id')} renvoie vers l'aval : {ref}"
        if row.get("id"):
            connus.add(row["id"])

    assert [r["id"] for r in une if r.get("id")][-1] == "cf-validation"


def test_closing_structure_repair_leaves_a_chartless_structure_alone():
    """Sans code Trésorerie, il n'y a rien à totaliser : on ne fabrique pas un faux bas d'état."""
    from app.services.statement_template import ensure_cash_flow_closing_structure

    structure = [{"label": "flux de trésorerie liés à l'exploitation", "isSection": True}]
    assert ensure_cash_flow_closing_structure(structure) == structure


def test_cash_flow_balances_when_every_balance_sheet_account_is_attached(
    client, auth_headers, su_headers
):
    company_id = _seed_company(client, auth_headers, su_headers)
    rows = _cash_flow_rows(client, auth_headers, company_id)

    assert rows["cf-cash-opening"]["current"] == 1000.0
    assert rows["cf-net-change"]["current"] == -200.0
    assert rows["cf-cash-closing"]["current"] == 800.0
    assert rows["cf-validation"]["current"] == 0.0


def test_cash_flow_line_signs_follow_the_effect_on_cash(client, auth_headers, su_headers):
    company_id = _seed_company(client, auth_headers, su_headers)
    rows = _cash_flow_rows(client, auth_headers, company_id)

    # Bénéfice net : source de type flux (produits − charges), pas une variation.
    assert rows["TEX-NI"]["current"] == 300.0
    # Amortissement : la hausse du cumulé revient dans l'exploitation.
    assert rows["TEX-AM"]["current"] == 200.0
    # Fonds de roulement : clients +100 immobilise, créditeurs +50 libère.
    assert rows["TEX-WC"]["current"] == -50.0
    # Acquisition d'équipement de 400 : une sortie, donc négative.
    assert rows["TIN-EQ"]["current"] == -400.0
    # Remboursement de dette de 150 : une sortie.
    assert rows["TFI-LT"]["current"] == -150.0
    # Capital-actions inchangé.
    assert rows["TFI-CA"]["current"] == 0.0
    # Dividendes versés de 100 : une sortie.
    assert rows["TFI-DI"]["current"] == -100.0


def test_cash_flow_validation_exposes_an_unattached_balance_sheet_account(
    client, auth_headers, su_headers
):
    """Un poste de bilan rattaché à aucune section laisse un trou — la Validation le montre.

    Frais payés d'avance passe de 0 à 150 et l'encaisse tombe d'autant. Aucun code
    Trésorerie ne rattache ACT-J, donc la variation nette ignore ces 150 $.
    """
    company_id = _seed_company(client, auth_headers, su_headers, extra_accounts={
        "1000": ("ACT-A", {2024: 1000.0, 2025: 1000.0, 2026: 650.0}),
        "1300": ("ACT-J", {2024: 0.0, 2025: 0.0, 2026: 150.0}),
    })
    rows = _cash_flow_rows(client, auth_headers, company_id)

    assert rows["cf-net-change"]["current"] == -200.0
    assert rows["cf-cash-closing"]["current"] == 800.0
    # Le bilan dit 650 : l'écart de 150 est exactement le poste oublié.
    assert rows["cf-validation"]["current"] == 150.0


def test_cash_flow_monthly_horizon_opens_at_the_previous_month(client, auth_headers, su_headers):
    """En « mois courant », l'ouverture est la fin du mois précédent, pas celle de l'exercice.

    Toute l'activité de 2026 est passée en décembre, donc décembre seul reproduit
    l'exercice — et surtout, il balance sans emprunter l'ouverture de l'exercice.
    """
    company_id = _seed_company(client, auth_headers, su_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 12, "period": "monthly"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    rows = {row["id"]: row for row in response.json()["rows"]}

    assert rows["cf-cash-opening"]["current"] == 1000.0
    assert rows["cf-net-change"]["current"] == -200.0
    assert rows["cf-validation"]["current"] == 0.0


def test_cash_flow_series_measures_each_month_separately(client, auth_headers, su_headers):
    """Les vues de tendance mesurent le flux mois par mois, pas un solde cumulé.

    L'activité de 2026 est toute passée en décembre : ce mois-là porte la variation
    et balance, les mois calmes qui précèdent restent à zéro.
    """
    company_id = _seed_company(client, auth_headers, su_headers)
    response = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow/series",
        params={"fiscal_year": 2026, "month": 12, "months": 12},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    rows = {row["id"]: row for row in payload["rows"]}

    assert rows["cf-net-change"]["amounts"]["2026-12"] == -200.0
    assert rows["cf-net-change"]["amounts"]["2026-11"] == 0.0
    assert rows["cf-cash-opening"]["amounts"]["2026-12"] == 1000.0
    # Janvier s'ouvre à la clôture de 2025 : sans l'exercice N−1, il sauterait.
    assert rows["cf-validation"]["amounts"]["2026-1"] == 0.0
    assert all(
        ecart == 0.0 for ecart in rows["cf-validation"]["amounts"].values()
    ), rows["cf-validation"]["amounts"]


def test_cash_flow_prior_column_opens_at_the_year_before_last(client, auth_headers, su_headers):
    """La colonne comparative mesure 2025 — son ouverture vient de 2024, donc de N−2."""
    company_id = _seed_company(client, auth_headers, su_headers)
    rows = _cash_flow_rows(client, auth_headers, company_id)

    # 2025 est un exercice tranquille : rien ne bouge, mais l'ouverture doit être
    # allée chercher la clôture de 2024 — sinon elle vaudrait 0 et la validation sauterait.
    assert rows["cf-cash-opening"]["prior"] == 1000.0
    assert rows["cf-net-change"]["prior"] == 0.0
    assert rows["cf-validation"]["prior"] == 0.0
