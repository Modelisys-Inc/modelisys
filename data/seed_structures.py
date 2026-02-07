"""Seed statement structures for Test Company via the API."""
import json
import requests

BASE = "http://localhost:8001"
EMAIL = "playwright@modelisys.com"
PASSWORD = "PlaywrightTest123"
COMPANY_ID = "a17cc179-df90-4f56-a5f9-21ccd232f9f5"


def login():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


def put_structure(token, statement_type, structure):
    url = f"{BASE}/api/companies/{COMPANY_ID}/statement-structures/{statement_type}"
    r = requests.put(url, json={"structure": structure}, headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    print(f"  {statement_type}: OK (id={r.json()['id']})")
    return r.json()


# ── Income Statement Structure ──────────────────────────────────────────
# Revenue link codes: 20-101, 20-102, 20-103, 20-104
# COGS: 30-300, 30-330
# Admin expenses: 44-330..44-804 (16 codes)
# Financial: 48-460, 50-460, 50-461
# Taxes: 80-811

INCOME_STATEMENT = [
    {
        "id": "revenue",
        "label": "Revenus",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "20-101", "label": "Développement sur mesure", "linkCode": "20-101"},
            {"id": "20-102", "label": "Ventes de logiciels", "linkCode": "20-102"},
            {"id": "20-103", "label": "Formations", "linkCode": "20-103"},
            {"id": "20-104", "label": "Licences", "linkCode": "20-104"},
        ],
    },
    {
        "id": "cogs",
        "label": "Coût des ventes",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "30-300", "label": "Main-d'oeuvre directe et charges sociales", "linkCode": "30-300"},
            {"id": "30-330", "label": "Sous-traitance", "linkCode": "30-330"},
        ],
    },
    {
        "id": "gross-profit",
        "label": "Bénéfice brut",
        "isBold": True,
        "isResult": True,
        "formula": ["+revenue", "-cogs"],
    },
    {
        "id": "admin-expenses",
        "label": "Frais d'administration",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "44-330", "label": "Salaires administratifs - J.-P. Desormiers", "linkCode": "44-330"},
            {"id": "44-335", "label": "Salaires administratifs - P. Julien", "linkCode": "44-335"},
            {"id": "44-336", "label": "Salaires administratifs - Autres", "linkCode": "44-336"},
            {"id": "44-340", "label": "Assurances", "linkCode": "44-340"},
            {"id": "44-370", "label": "Mauvaises créances", "linkCode": "44-370"},
            {"id": "44-403", "label": "Entretien et réparations", "linkCode": "44-403"},
            {"id": "44-410", "label": "Fournitures de bureau", "linkCode": "44-410"},
            {"id": "44-420", "label": "Frais informatiques", "linkCode": "44-420"},
            {"id": "44-441", "label": "Frais de déplacements", "linkCode": "44-441"},
            {"id": "44-442", "label": "Frais de représentation", "linkCode": "44-442"},
            {"id": "44-540", "label": "Loyer", "linkCode": "44-540"},
            {"id": "44-590", "label": "Honoraires professionnels", "linkCode": "44-590"},
            {"id": "44-610", "label": "Télécommunications", "linkCode": "44-610"},
            {"id": "44-660", "label": "Amortissement", "linkCode": "44-660"},
            {"id": "44-803", "label": "Marketing", "linkCode": "44-803"},
            {"id": "44-804", "label": "Formation", "linkCode": "44-804"},
        ],
    },
    {
        "id": "ebitda",
        "label": "BAIIA (EBITDA)",
        "isBold": True,
        "isResult": True,
        "formula": ["+gross-profit", "-admin-expenses"],
    },
    {
        "id": "financial-charges",
        "label": "Frais financiers",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "48-460", "label": "Intérêts et frais bancaires", "linkCode": "48-460"},
            {"id": "50-460", "label": "Intérêts sur la dette à long terme", "linkCode": "50-460"},
            {"id": "50-461", "label": "Honoraires de garantie IQ", "linkCode": "50-461"},
        ],
    },
    {
        "id": "ebt",
        "label": "Bénéfice avant impôts",
        "isBold": True,
        "isResult": True,
        "formula": ["+ebitda", "-financial-charges"],
    },
    {
        "id": "income-tax",
        "label": "Impôts sur le revenu",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "80-811", "label": "Impôts sur le revenu", "linkCode": "80-811"},
        ],
    },
    {
        "id": "net-income",
        "label": "Résultat net",
        "isBold": True,
        "isResult": True,
        "formula": ["+ebt", "-income-tax"],
    },
]


# ── Balance Sheet Structure ─────────────────────────────────────────────
# Assets: A (cash), C (receivables), L (prepaid), AV (advances), EA (goodwill), G (fixed assets)
# Liabilities: AA (credit line), BB (payables), FF (taxes payable), PD (deferred revenue), KK (long-term debt)
# Equity: UU (capital stock), UV (retained earnings)

BALANCE_SHEET = [
    {
        "id": "current-assets",
        "label": "Actifs courants",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "A", "label": "Encaisse", "linkCode": "A"},
            {"id": "C", "label": "Comptes clients", "linkCode": "C"},
            {"id": "L", "label": "Frais payés d'avance", "linkCode": "L"},
            {"id": "AV", "label": "Avances", "linkCode": "AV"},
        ],
    },
    {
        "id": "non-current-assets",
        "label": "Actifs non courants",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "G", "label": "Immobilisations", "linkCode": "G"},
            {"id": "EA", "label": "Écart d'acquisition", "linkCode": "EA"},
        ],
    },
    {
        "id": "total-assets",
        "label": "Total des actifs",
        "isBold": True,
        "isResult": True,
        "formula": ["+current-assets", "+non-current-assets"],
    },
    {
        "id": "current-liabilities",
        "label": "Passifs courants",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "AA", "label": "Marge de crédit", "linkCode": "AA"},
            {"id": "BB", "label": "Comptes fournisseurs", "linkCode": "BB"},
            {"id": "FF", "label": "Impôts à payer", "linkCode": "FF"},
            {"id": "PD", "label": "Produits reportés", "linkCode": "PD"},
        ],
    },
    {
        "id": "non-current-liabilities",
        "label": "Passifs non courants",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "KK", "label": "Dette à long terme", "linkCode": "KK"},
        ],
    },
    {
        "id": "total-liabilities",
        "label": "Total des passifs",
        "isBold": True,
        "isResult": True,
        "formula": ["+current-liabilities", "+non-current-liabilities"],
    },
    {
        "id": "equity",
        "label": "Capitaux propres",
        "isBold": True,
        "isSection": True,
        "children": [
            {"id": "UU", "label": "Capital-actions", "linkCode": "UU"},
            {"id": "UV", "label": "Bénéfices non répartis", "linkCode": "UV"},
        ],
    },
    {
        "id": "total-liabilities-equity",
        "label": "Total passifs et capitaux propres",
        "isBold": True,
        "isResult": True,
        "formula": ["+total-liabilities", "+equity"],
    },
]


def main():
    print("Logging in...")
    token = login()
    print(f"  Token: {token[:20]}...")

    print("\nCreating statement structures...")
    put_structure(token, "income-statement", INCOME_STATEMENT)
    put_structure(token, "balance-sheet", BALANCE_SHEET)

    # Verify by fetching the income statement
    print("\nVerifying income statement (fiscal_year=2025, month=12, period=annual)...")
    url = f"{BASE}/api/companies/{COMPANY_ID}/financial-statements/income-statement"
    r = requests.get(
        url,
        params={"fiscal_year": 2025, "month": 12, "period": "annual"},
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    data = r.json()
    print(f"  Rows: {len(data['rows'])}")
    for row in data["rows"]:
        detail_count = len(row.get("detailRows", []))
        print(f"    {row['label']}: current={row['current']:,.2f}  prior={row['prior']:,.2f}  (details={detail_count})")

    # Verify balance sheet
    print("\nVerifying balance sheet (fiscal_year=2025, month=12, period=annual)...")
    url = f"{BASE}/api/companies/{COMPANY_ID}/financial-statements/balance-sheet"
    r = requests.get(
        url,
        params={"fiscal_year": 2025, "month": 12, "period": "annual"},
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    data = r.json()
    print(f"  Rows: {len(data['rows'])}")
    for row in data["rows"]:
        detail_count = len(row.get("detailRows", []))
        print(f"    {row['label']}: current={row['current']:,.2f}  prior={row['prior']:,.2f}  (details={detail_count})")


if __name__ == "__main__":
    main()
