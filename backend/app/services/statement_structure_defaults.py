"""Single source of truth for default financial-statement structures.

Used to seed new companies (routers/companies.py) and as the runtime fallback
when a company has no saved structure (routers/statement_structures.py GET,
services/financial_statements.py compute).

These canonical templates are intentionally independent of the global standard
link-code chart. Use sync_standard_codes_to_companies to push chart-derived
structures onto existing companies when needed.
"""

DEFAULT_BALANCE_SHEET = [
    {"label": "actifs", "isBold": True, "isSection": True},
    {"label": "actifs courants", "isSection": True, "indent": True},
    {"label": "actifs non courants", "isSection": True, "indent": True},
    {"label": "total des actifs", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "passifs", "isBold": True, "isSection": True},
    {"label": "passifs courants", "indent": True},
    {"label": "passifs non courants", "indent": True},
    {"label": "total des passifs", "isBold": True},
    {"label": ""},
    {"label": "capitaux propres", "isBold": True, "isResult": True},
    {"label": "total passifs et capitaux propres", "isBold": True, "isResult": True},
]

DEFAULT_INCOME_STATEMENT = [
    {"label": "revenus", "isBold": True, "isSection": True},
    {"label": "coût des produits vendus", "isSection": True, "indent": True},
    {"label": "bénéfice brut", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "charges d'exploitation", "isBold": True, "isSection": True},
    {"label": "frais d'administration", "indent": True},
    {"label": "frais de vente", "indent": True},
    {"label": "frais financiers", "indent": True},
    {"label": "autres dépenses (revenus)", "indent": True},
    {"label": "total des charges", "isBold": True},
    {"label": ""},
    {"label": "bénéfice avant impôts", "isBold": True, "isResult": True},
    {"label": "impôts (26%)", "indent": True},
    {"label": "bénéfice net", "isBold": True, "isNetIncome": True},
    {"label": ""},
    {"label": "BAIIA", "isBold": True, "isEBITA": True},
]

DEFAULT_CASH_FLOW = [
    {"label": "flux de trésorerie liés à l'exploitation", "isBold": True, "isSection": True},
    {"label": "flux de trésorerie liés aux activités d'investissement", "isBold": True, "isSection": True},
    {"label": "flux de trésorerie liés aux activités de financement", "isBold": True, "isSection": True},
    {"label": "variation nette de la trésorerie", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "trésorerie au début de l'exercice"},
    {"label": "trésorerie à la fin de l'exercice", "isBold": True, "isResult": True},
]

DEFAULT_CASH_FLOW_DETAIL = [
    {"label": "Trésorerie - Exploitation", "isBold": True, "isSection": True},
    {"label": "Trésorerie - Investissement", "isBold": True, "isSection": True},
    {"label": "Trésorerie - Financement", "isBold": True, "isSection": True},
    {"label": "Variation nette de la trésorerie", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "Trésorerie au début de l'exercice"},
    {"label": "Trésorerie à la fin de l'exercice", "isBold": True, "isResult": True},
]

# Analyse fonds de roulement — lignes configurables (code / formule via Paramètres).
DEFAULT_WORKING_CAPITAL = [
    {"label": "FDR", "defineMapping": True, "liaisonMode": "na", "displayFormat": "currency"},
    {"label": "FdRHC", "defineMapping": True, "liaisonMode": "na", "displayFormat": "currency"},
    {"label": "FDR / Revenus", "defineMapping": True, "liaisonMode": "na", "displayFormat": "percent"},
    {"label": "FdRHC / Revenus", "defineMapping": True, "liaisonMode": "na", "displayFormat": "percent"},
    {"label": "Ratio de FDR", "defineMapping": True, "liaisonMode": "na", "displayFormat": "number"},
    {"label": "Ratio de FdRHC", "defineMapping": True, "liaisonMode": "na", "displayFormat": "number"},
    {"label": "", "separatorAbove": True},
    {
        "label": "Comptes clients en % des revenus",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Stocks en % des revenus",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Créditeurs en % des revenus",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Créditeurs en % des dépenses",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {"label": "", "separatorAbove": True},
    {"label": "DSO", "defineMapping": True, "liaisonMode": "na", "displayFormat": "days"},
    {"label": "Rotation des stocks", "defineMapping": True, "liaisonMode": "na", "displayFormat": "days"},
    {"label": "DPO", "defineMapping": True, "liaisonMode": "na", "displayFormat": "days"},
    {"label": "CCC", "defineMapping": True, "liaisonMode": "na", "displayFormat": "days"},
]

# Analyse ratios — lignes configurables (code / formule via Paramètres).
DEFAULT_RATIOS = [
    {"label": "Liquidité", "isBold": True, "defineMapping": False},
    {
        "label": "Ratio de liquidité générale",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "number",
    },
    {
        "label": "Ratio de liquidité immédiate",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "number",
    },
    {"label": "", "separatorAbove": True},
    {"label": "Rentabilité", "isBold": True, "defineMapping": False},
    {
        "label": "Marge brute",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Marge nette",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Marge BAIIA",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {"label": "", "separatorAbove": True},
    {"label": "Levier financier", "isBold": True, "defineMapping": False},
    {
        "label": "Dette / Capitaux propres",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "number",
    },
    {
        "label": "Couverture des intérêts",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "number",
    },
]

# Analyse Capex — lignes configurables (code / formule via Paramètres).
DEFAULT_CAPEX = [
    {"label": "Capex", "defineMapping": True, "liaisonMode": "na", "displayFormat": "currency"},
    {"label": "Amortissement", "defineMapping": True, "liaisonMode": "na", "displayFormat": "currency"},
    {"label": "Capex / Revenus", "defineMapping": True, "liaisonMode": "na", "displayFormat": "percent"},
    {"label": "Capex / BAIIA", "defineMapping": True, "liaisonMode": "na", "displayFormat": "percent"},
    {
        "label": "Capex / Flux de trésorerie liés aux opérations",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
]

# Valorisation Multiplicateur — postes configurables (formules + / − / × / ÷ via Paramètres).
DEFAULT_CAPITALISATION = [
    {"label": "Coût des capitaux propres", "isBold": True, "defineMapping": False},
    {
        "label": "Rendement sans risque",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Prime de risque sur les capitaux propres",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Prime de risque pour la taille",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Prime de risque spécifique à l'entreprise",
        "defineMapping": True,
        "liaisonMode": "na",
        "displayFormat": "percent",
    },
    {
        "label": "Coût des capitaux propres (total)",
        "isBold": True,
        "defineMapping": True,
        "liaisonMode": "sum",
        "liaisonSumCodes": [
            "Rendement sans risque",
            "Prime de risque sur les capitaux propres",
            "Prime de risque pour la taille",
            "Prime de risque spécifique à l'entreprise",
        ],
        "displayFormat": "percent",
    },
]

DEFAULT_STRUCTURES = {
    "income-statement": DEFAULT_INCOME_STATEMENT,
    "balance-sheet": DEFAULT_BALANCE_SHEET,
    "cash-flow": DEFAULT_CASH_FLOW,
    "cash-flow-detail": DEFAULT_CASH_FLOW_DETAIL,
    "working-capital": DEFAULT_WORKING_CAPITAL,
    "capex": DEFAULT_CAPEX,
    "ratios": DEFAULT_RATIOS,
    "capitalisation": DEFAULT_CAPITALISATION,
}
