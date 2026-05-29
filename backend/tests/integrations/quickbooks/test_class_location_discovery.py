from datetime import datetime, timedelta, timezone

import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import client as qbo_client
from app.integrations.quickbooks import oauth, service
from app.integrations.quickbooks.service import _parse_general_ledger
from app.models.quickbooks_connection import QuickBooksConnection


def _make_conn(db, company, user):
    tokens = oauth.TokenResponse(
        access_token="AT", refresh_token="RT",
        expires_in=3600, x_refresh_token_expires_in=8640000,
    )
    return service.upsert_connection(db, company.id, "realm-1", tokens, user.id)


@respx.mock
def test_get_general_ledger_report_requests_columns(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    route = respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(200, json={"Rows": {"Row": []}})
    )
    result = qbo_client.get_general_ledger_report(db, conn, "2024-01-01", "2024-03-31")
    assert result == {"Rows": {"Row": []}}
    assert route.called
    sent = route.calls.last.request
    assert b"klass_name" in sent.url.query
    assert b"dept_name" in sent.url.query
    assert b"GeneralLedger" in sent.url.path.encode()


@respx.mock
def test_get_preferences_returns_json(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={
            "Preferences": {"AccountingInfoPrefs": {"ClassTrackingPerTxn": True}}
        })
    )
    body = qbo_client.get_preferences(db, conn)
    assert body["Preferences"]["AccountingInfoPrefs"]["ClassTrackingPerTxn"] is True


_GL_REPORT = {
    "Columns": {"Column": [
        {"ColType": "tx_date", "MetaData": [{"Name": "ColKey", "Value": "tx_date"}]},
        {"ColType": "account_name", "MetaData": [{"Name": "ColKey", "Value": "account_name"}]},
        {"ColType": "string", "MetaData": [{"Name": "ColKey", "Value": "klass_name"}]},
        {"ColType": "string", "MetaData": [{"Name": "ColKey", "Value": "dept_name"}]},
        {"ColType": "money", "MetaData": [{"Name": "ColKey", "Value": "subt_nat_amount"}]},
    ]},
    "Rows": {"Row": [
        {
            "type": "Section",
            "Header": {"ColData": [{"value": "Sales (4000)", "id": "33"}]},
            "Rows": {"Row": [
                {"ColData": [
                    {"value": "2024-01-05"}, {"value": ""},
                    {"value": "East"}, {"value": "Montreal"}, {"value": "100.00"},
                ]},
                {"ColData": [
                    {"value": "2024-02-05"}, {"value": ""},
                    {"value": "West"}, {"value": ""}, {"value": "50.00"},
                ]},
            ]},
        },
        {
            "type": "Section",
            "Header": {"ColData": [{"value": "Rent (6000)", "id": "44"}]},
            "Rows": {"Row": [
                {"ColData": [
                    {"value": "2024-01-31"}, {"value": ""},
                    {"value": ""}, {"value": "Quebec"}, {"value": "900.00"},
                ]},
            ]},
        },
    ]},
}


def test_parse_general_ledger_flattens_account_class_location():
    rows = _parse_general_ledger(_GL_REPORT)
    assert {
        "account_id": "33", "account_name": "Sales (4000)",
        "class_name": "East", "location_name": "Montreal",
    } in rows
    # class-only line keeps location empty
    assert any(
        r["account_id"] == "33" and r["class_name"] == "West"
        and r["location_name"] == "" for r in rows
    )
    # location-only line keeps class empty, account from its own section header
    assert any(
        r["account_id"] == "44" and r["class_name"] == ""
        and r["location_name"] == "Quebec" for r in rows
    )
    assert len(rows) == 3


def test_parse_general_ledger_recurses_headerless_section():
    report = {
        "Columns": {"Column": [
            {"MetaData": [{"Name": "ColKey", "Value": "klass_name"}]},
            {"MetaData": [{"Name": "ColKey", "Value": "dept_name"}]},
        ]},
        "Rows": {"Row": [
            {
                "type": "Section",
                "Header": {"ColData": [{"value": "Sales (4000)", "id": "33"}]},
                "Rows": {"Row": [
                    {
                        "type": "Section",  # nested header-less subtotal section
                        "Rows": {"Row": [
                            {"ColData": [{"value": "East"}, {"value": "Montreal"}]},
                        ]},
                    },
                ]},
            },
        ]},
    }
    rows = _parse_general_ledger(report)
    assert rows == [{
        "account_id": "33", "account_name": "Sales (4000)",
        "class_name": "East", "location_name": "Montreal",
    }]
