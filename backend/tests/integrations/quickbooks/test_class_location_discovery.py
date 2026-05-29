from datetime import datetime, timedelta, timezone

import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import client as qbo_client
from app.integrations.quickbooks import oauth, service
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
    qbo_client.get_general_ledger_report(db, conn, "2024-01-01", "2024-03-31")
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
