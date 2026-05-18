import pytest

from app.services.statement_chart_defaults import seed_default_chart_config


def test_income_statement_default_has_three_series():
    cfg = seed_default_chart_config("income-statement")
    assert cfg["version"] == 2
    assert cfg["chartTitle"] == "Performance financière"
    assert len(cfg["series"]) == 3
    labels = [s["label"] for s in cfg["series"]]
    assert labels == ["Revenus", "BAIIA", "Marge brute (%)"]


def test_income_statement_default_margin_references_revenue_series():
    cfg = seed_default_chart_config("income-statement")
    rev_id = cfg["series"][0]["id"]
    margin_spec = cfg["series"][2]["spec"]
    assert margin_spec["type"] == "derivedMargin"
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


def test_empty_link_codes_for_all_defaults():
    """Defaults pre-build series shape but leave link codes blank — the user picks them."""
    for stype in ("income-statement", "balance-sheet", "cash-flow"):
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
