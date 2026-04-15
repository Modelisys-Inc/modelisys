"""QBO AccountType / AccountSubType -> Modelisys link_code proposals.

These are GENERIC defaults. Each Modelisys org's FinancialStatementMapping uses
custom link_codes; users override per-row in the review screen on first import.
Customize this dict to match your org's real link codes for accurate proposals.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class Proposal:
    link_code: str | None
    confidence: Literal["high", "medium", "low"]
    reason: str


_HIGH_CONFIDENCE: dict[tuple[str, str], str] = {
    # Income
    ("Income", "SalesOfProductIncome"): "revenus.ventes_produits",
    ("Income", "ServiceFeeIncome"): "revenus.ventes_services",
    ("Income", "DiscountsRefundsGiven"): "revenus.escomptes",
    ("Income", "OtherPrimaryIncome"): "revenus.autres",
    ("Other Income", "OtherMiscellaneousIncome"): "revenus.autres_revenus",
    ("Other Income", "InterestEarned"): "revenus.interets",

    # COGS
    ("Cost of Goods Sold", "SuppliesMaterialsCogs"): "couts.matieres",
    ("Cost of Goods Sold", "EquipmentRentalCogs"): "couts.location_equipement",
    ("Cost of Goods Sold", "ShippingFreightDeliveryCos"): "couts.transport",
    ("Cost of Goods Sold", "OtherCostsOfServiceCos"): "couts.autres",

    # Expense
    ("Expense", "PayrollExpenses"): "charges.salaires",
    ("Expense", "OfficeGeneralAdministrativeExpenses"): "charges.administration",
    ("Expense", "RentOrLeaseOfBuildings"): "charges.loyer",
    ("Expense", "Insurance"): "charges.assurances",
    ("Expense", "Utilities"): "charges.services_publics",
    ("Expense", "TravelMeals"): "charges.deplacements",
    ("Expense", "Advertising"): "charges.publicite",
    ("Expense", "BankCharges"): "charges.frais_bancaires",
    ("Expense", "Depreciation"): "charges.amortissement",

    # Bank / Cash
    ("Bank", "CashOnHand"): "actif.encaisse",
    ("Bank", "Checking"): "actif.encaisse",
    ("Bank", "Savings"): "actif.encaisse",
    ("Bank", "MoneyMarket"): "actif.placements",

    # AR / AP / CC
    ("Accounts Receivable", "AccountsReceivable"): "actif.comptes_a_recevoir",
    ("Accounts Payable", "AccountsPayable"): "passif.comptes_a_payer",
    ("Credit Card", "CreditCard"): "passif.cartes_credit",

    # Other current
    ("Other Current Asset", "Inventory"): "actif.stocks",
    ("Other Current Asset", "PrepaidExpenses"): "actif.frais_payes_avance",
    ("Other Current Liability", "FederalIncomeTaxPayable"): "passif.impots_a_payer",
    ("Other Current Liability", "PayrollTaxPayable"): "passif.charges_sociales",
    ("Other Current Liability", "SalesTaxPayable"): "passif.taxes_a_payer",

    # Fixed assets
    ("Fixed Asset", "MachineryAndEquipment"): "actif.equipement",
    ("Fixed Asset", "Buildings"): "actif.batiments",
    ("Fixed Asset", "Vehicles"): "actif.vehicules",
    ("Fixed Asset", "FurnitureAndFixtures"): "actif.mobilier",
    ("Fixed Asset", "Land"): "actif.terrain",
    ("Fixed Asset", "AccumulatedDepreciation"): "actif.amortissement_cumule",

    # Long-term
    ("Long Term Liability", "LongTermDebt"): "passif.dette_long_terme",
    ("Long Term Liability", "ShareholderNotesPayable"): "passif.avances_actionnaires",

    # Equity
    ("Equity", "OwnersEquity"): "capitaux.capital_actions",
    ("Equity", "RetainedEarnings"): "capitaux.benefices_non_repartis",
    ("Equity", "AccumulatedAdjustment"): "capitaux.ajustements",
}

_MEDIUM_CONFIDENCE: dict[str, str] = {
    "Income": "revenus.autres",
    "Other Income": "revenus.autres_revenus",
    "Cost of Goods Sold": "couts.autres",
    "Expense": "charges.administration",
    "Other Expense": "charges.autres",
    "Bank": "actif.encaisse",
    "Accounts Receivable": "actif.comptes_a_recevoir",
    "Accounts Payable": "passif.comptes_a_payer",
    "Credit Card": "passif.cartes_credit",
    "Other Current Asset": "actif.autres_actifs_court_terme",
    "Other Current Liability": "passif.autres_passifs_court_terme",
    "Fixed Asset": "actif.immobilisations",
    "Other Asset": "actif.autres",
    "Long Term Liability": "passif.dette_long_terme",
    "Equity": "capitaux.autres",
}


def propose(
    account_type: str | None,
    account_sub_type: str | None,
    account_name: str | None = None,
) -> Proposal:
    if account_type and account_sub_type:
        link = _HIGH_CONFIDENCE.get((account_type, account_sub_type))
        if link:
            return Proposal(
                link_code=link,
                confidence="high",
                reason=f"{account_type}/{account_sub_type} exact match",
            )
    if account_type:
        link = _MEDIUM_CONFIDENCE.get(account_type)
        if link:
            return Proposal(
                link_code=link,
                confidence="medium",
                reason=f"{account_type} type fallback",
            )
    return Proposal(
        link_code=None,
        confidence="low",
        reason="no rule matched — manual mapping required",
    )
