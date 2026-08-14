import pytest

from app.services.statement_chart_defaults import seed_default_chart_config


def test_income_statement_default_has_three_series():
    cfg = seed_default_chart_config("income-statement")
    assert cfg["version"] == 2
    assert cfg["chartTitle"] == "Performance financière"
    assert len(cfg["series"]) == 3
    labels = [s["label"] for s in cfg["series"]]
    assert labels == ["Revenus", "Contribution marginale (%)", "BAIIA"]


def test_income_statement_default_margin_references_revenue_series():
    cfg = seed_default_chart_config("income-statement")
    rev_id = cfg["series"][0]["id"]
    # Series order is Revenus / Contribution marginale (%) / BAIIA — the margin
    # line is index 1 (index 2 is the BAIIA bar, spec type "single").
    margin_spec = cfg["series"][1]["spec"]
    assert margin_spec["type"] == "derivedContributiveMargin"
    assert margin_spec["revenueSeriesId"] == rev_id


def test_balance_sheet_default_has_three_bars():
    cfg = seed_default_chart_config("balance-sheet")
    assert cfg["chartTitle"] == "Bilan"
    assert len(cfg["series"]) == 3
    assert all(s["kind"] == "bar" for s in cfg["series"])
    labels = [s["label"] for s in cfg["series"]]
    assert labels == ["Actifs", "Passifs", "Capitaux propres"]


def test_cash_flow_default_has_stacked_bars_plus_net_line():
    cfg = seed_default_chart_config("cash-flow")
    assert cfg["chartTitle"] == "Flux de trésorerie"
    assert len(cfg["series"]) == 4
    kinds = [s["kind"] for s in cfg["series"]]
    assert kinds == ["bar", "bar", "bar", "line"]
    # First three bars are stacked together
    stack_groups = [cfg["series"][i].get("stackGroup") for i in range(3)]
    assert stack_groups == ["cf", "cf", "cf"]
    assert cfg["series"][3].get("stackGroup") is None


def test_diagnostic_revenue_default_is_revenue_only():
    cfg = seed_default_chart_config("diagnostic-revenue")
    assert cfg["chartTitle"] == "Revenus"
    assert len(cfg["series"]) == 1
    assert cfg["series"][0]["kind"] == "bar"
    assert cfg["series"][0]["label"] == "Revenus"


def test_diagnostic_margin_by_revenue_default_has_revenue_and_margin():
    cfg = seed_default_chart_config("diagnostic-margin-by-revenue")
    assert cfg["chartTitle"] == "Marge par Revenus"
    assert len(cfg["series"]) == 2
    assert cfg["series"][0]["kind"] == "bar"
    assert cfg["series"][1]["kind"] == "line"
    assert cfg["series"][1]["valueFormat"] == "ratio"


def test_diagnostic_expenses_default_is_expense_bar():
    cfg = seed_default_chart_config("diagnostic-expenses")
    assert cfg["chartTitle"] == "Dépenses"
    assert len(cfg["series"]) == 1
    assert cfg["series"][0]["kind"] == "bar"
    assert cfg["series"][0]["label"] == "Dépenses"


def test_diagnostic_expenses_by_division_default_matches_expenses():
    cfg = seed_default_chart_config("diagnostic-expenses-by-division")
    expenses = seed_default_chart_config("diagnostic-expenses")
    assert cfg == expenses


def test_diagnostic_financial_position_default_has_five_family_series():
    cfg = seed_default_chart_config("diagnostic-financial-position")
    assert cfg["chartTitle"] == "Situation financière"
    assert len(cfg["series"]) == 5
    ids = {s["id"] for s in cfg["series"]}
    assert ids == {"fp-act", "fp-alt", "fp-pct", "fp-plt", "fp-cap"}
    assets = [s for s in cfg["series"] if s.get("stackGroup") == "fp-assets"]
    liabilities = [s for s in cfg["series"] if s.get("stackGroup") == "fp-liabilities"]
    assert len(assets) == 2
    assert len(liabilities) == 3


def test_diagnostic_working_capital_default_has_six_series():
    cfg = seed_default_chart_config("diagnostic-working-capital")
    assert cfg["chartTitle"] == "Fonds de roulement"
    assert len(cfg["series"]) == 6
    ids = {s["id"] for s in cfg["series"]}
    assert ids == {"wc-fdr", "wc-fdrhc", "wc-dso", "wc-dio", "wc-dpo", "wc-ccc"}
    fdr = [s for s in cfg["series"] if s.get("stackGroup") == "wc-fdr"]
    cycle = [s for s in cfg["series"] if s.get("stackGroup") == "wc-cycle"]
    assert len(fdr) == 2
    assert len(cycle) == 4


def test_empty_link_codes_for_all_defaults():
    """Defaults pre-build series shape but leave link codes blank — the user picks them."""
    for stype in (
        "income-statement",
        "balance-sheet",
        "cash-flow",
        "diagnostic-revenue",
        "diagnostic-margin-by-revenue",
      "diagnostic-expenses",
      "diagnostic-expenses-by-division",
      "diagnostic-financial-position",
      "diagnostic-working-capital",
    ):
        cfg = seed_default_chart_config(stype)
        for s in cfg["series"]:
            spec = s["spec"]
            if spec["type"] == "single":
                assert spec["code"] == ""
            elif spec["type"] == "derivedMargin":
                gp = spec["grossProfitFromSpec"]
                assert gp["type"] == "single"
                assert gp["code"] == ""


def test_unknown_statement_type_raises():
    with pytest.raises(ValueError):
        seed_default_chart_config("unknown")
