"""Default V2 chart configs per statement type.

Returned as dicts (not Pydantic models) — they're persisted in JSONB.
Every series uses an empty `link_code` (`""`); the user fills these in
via the settings dialog. We pre-build the *shape* (kind, axis, format,
color, label, stackGroup) but not the wiring, because link codes vary
by company.
"""

from typing import Literal


StatementType = Literal[
    "income-statement",
    "balance-sheet",
    "cash-flow",
    "diagnostic-revenue",
    "diagnostic-margin-by-revenue",
    "diagnostic-expenses",
    "diagnostic-expenses-by-division",
]

_DEFAULT_COLORS = [
    "#3b82f6",  # 0
    "#10b981",  # 1
    "#f59e0b",  # 2
    "#8b5cf6",  # 3
    "#ec4899",  # 4
    "#06b6d4",  # 5
    "#84cc16",  # 6
]


def _income_statement_default() -> dict:
    rev_id = "perf-default-revenue"
    ebita_id = "perf-default-ebita"
    margin_id = "perf-default-margin"
    return {
        "version": 2,
        "chartTitle": "Performance financière",
        "series": [
            {
                "id": rev_id,
                "kind": "bar",
                "label": "Revenus",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
            {
                "id": ebita_id,
                "kind": "bar",
                "label": "BAIIA",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
            {
                "id": margin_id,
                "kind": "line",
                "label": "Marge brute (%)",
                "spec": {
                    "type": "derivedMargin",
                    "revenueSeriesId": rev_id,
                    "grossProfitFromSpec": {"type": "single", "code": ""},
                },
                "yAxis": "right",
                "valueFormat": "ratio",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[2],
            },
        ],
    }


def _balance_sheet_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Bilan",
        "series": [
            {
                "id": "bs-default-assets",
                "kind": "bar",
                "label": "Actifs",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
            {
                "id": "bs-default-liabilities",
                "kind": "bar",
                "label": "Passifs",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
            {
                "id": "bs-default-equity",
                "kind": "bar",
                "label": "Capitaux propres",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[2],
            },
        ],
    }


def _cash_flow_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Flux de trésorerie",
        "series": [
            {
                "id": "cf-default-operating",
                "kind": "bar",
                "label": "Exploitation",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-investing",
                "kind": "bar",
                "label": "Investissement",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[3],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-financing",
                "kind": "bar",
                "label": "Financement",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[4],
                "stackGroup": "cf",
            },
            {
                "id": "cf-default-net",
                "kind": "line",
                "label": "Flux net",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[1],
            },
        ],
    }


def _diagnostic_revenue_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Revenus",
        "series": [
            {
                "id": "diag-revenue-primary",
                "kind": "bar",
                "label": "Revenus",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
        ],
    }


def _diagnostic_margin_by_revenue_default() -> dict:
    rev_id = "diag-margin-rev-primary"
    return {
        "version": 2,
        "chartTitle": "Marge par Revenus",
        "series": [
            {
                "id": rev_id,
                "kind": "bar",
                "label": "Revenus",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[0],
            },
            {
                "id": "diag-margin-primary",
                "kind": "line",
                "label": "Marge brute (%)",
                "spec": {
                    "type": "derivedMargin",
                    "revenueSeriesId": rev_id,
                    "grossProfitFromSpec": {"type": "single", "code": ""},
                },
                "yAxis": "right",
                "valueFormat": "ratio",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[2],
            },
        ],
    }


def _diagnostic_expenses_default() -> dict:
    return {
        "version": 2,
        "chartTitle": "Dépenses",
        "series": [
            {
                "id": "diag-expense-primary",
                "kind": "bar",
                "label": "Dépenses",
                "spec": {"type": "single", "code": ""},
                "yAxis": "left",
                "valueFormat": "currency",
                "showOnChart": True,
                "showInSidePanel": True,
                "color": _DEFAULT_COLORS[3],
            },
        ],
    }


_FACTORIES = {
    "income-statement": _income_statement_default,
    "balance-sheet": _balance_sheet_default,
    "cash-flow": _cash_flow_default,
    "diagnostic-revenue": _diagnostic_revenue_default,
    "diagnostic-margin-by-revenue": _diagnostic_margin_by_revenue_default,
    "diagnostic-expenses": _diagnostic_expenses_default,
    "diagnostic-expenses-by-division": _diagnostic_expenses_default,
}


def seed_default_chart_config(statement_type: StatementType) -> dict:
    factory = _FACTORIES.get(statement_type)
    if factory is None:
        raise ValueError(f"Unknown statement_type: {statement_type!r}")
    return factory()
