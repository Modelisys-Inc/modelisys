from app.integrations.quickbooks.mapping_rules import propose


def test_high_confidence_exact_match():
    p = propose("Income", "SalesOfProductIncome")
    assert p.confidence == "high"
    assert p.link_code == "revenus.ventes_produits"


def test_medium_confidence_type_only():
    p = propose("Expense", "UnknownSubType")
    assert p.confidence == "medium"
    assert p.link_code == "charges.administration"


def test_low_confidence_no_match():
    p = propose("MysteryType", "MysterySub")
    assert p.confidence == "low"
    assert p.link_code is None


def test_handles_none_inputs():
    p = propose(None, None)
    assert p.confidence == "low"
    assert p.link_code is None


def test_account_name_only_falls_through_to_low():
    p = propose(None, None, "Cash")
    assert p.confidence == "low"
