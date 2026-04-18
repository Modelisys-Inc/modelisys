"""End-to-end router tests for QBO endpoints. Auth is bypassed via the
`auth_client` fixture in conftest.py."""
import json
import pathlib
import uuid

import pytest
import respx
from httpx import Response

from app.dependencies import get_current_user
from app.integrations.quickbooks import oauth, service
from app.main import app
from app.models.account_mapping import AccountMapping
from app.models.financial_statement_mapping import FinancialStatementMapping
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry

FIXTURE = (
    pathlib.Path(__file__).parent / "fixtures" / "trial_balance_sample.json"
)


def _tokens():
    return oauth.TokenResponse(
        access_token="AT", refresh_token="RT",
        expires_in=3600, x_refresh_token_expires_in=8640000,
    )


# ============= /authorize =============

def test_authorize_returns_intuit_url(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.get(f"/api/quickbooks/authorize?company_id={company.id}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "appcenter.intuit.com/connect/oauth2" in body["authorize_url"]
    assert "client_id=test-client" in body["authorize_url"]


def test_authorize_company_not_found(auth_client):
    r = auth_client.get(f"/api/quickbooks/authorize?company_id={uuid.uuid4()}")
    assert r.status_code == 404


def test_authorize_cross_org_returns_403(client, db, org_user_company, other_org_user):
    _, _, company = org_user_company

    def _override():
        return other_org_user

    app.dependency_overrides[get_current_user] = _override
    try:
        r = client.get(f"/api/quickbooks/authorize?company_id={company.id}")
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


# ============= /callback =============

@respx.mock
def test_callback_creates_connection(client, db, org_user_company):
    _, user, company = org_user_company
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(200, json={
            "access_token": "AT", "refresh_token": "RT",
            "expires_in": 3600, "x_refresh_token_expires_in": 8640000,
            "token_type": "bearer",
        })
    )
    state = oauth.create_state(company.id, user.id)
    r = client.get(
        f"/api/quickbooks/callback?state={state}&code=AUTH_CODE&realmId=12345",
        follow_redirects=False,
    )
    assert r.status_code == 307
    assert "qbo=connected" in r.headers["location"]
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company.id)
        .first()
    )
    assert conn is not None
    assert conn.realm_id == "12345"


def test_callback_denied_redirects(client, org_user_company):
    _, user, company = org_user_company
    state = oauth.create_state(company.id, user.id)
    r = client.get(
        f"/api/quickbooks/callback?state={state}&error=access_denied",
        follow_redirects=False,
    )
    assert r.status_code == 307
    assert "qbo=denied" in r.headers["location"]


def test_callback_invalid_state(client):
    r = client.get("/api/quickbooks/callback?state=garbage&code=x&realmId=1")
    assert r.status_code == 400


def test_callback_missing_code(client, org_user_company):
    _, user, company = org_user_company
    state = oauth.create_state(company.id, user.id)
    r = client.get(f"/api/quickbooks/callback?state={state}")
    assert r.status_code == 400


@respx.mock
def test_callback_token_exchange_502(client, org_user_company):
    _, user, company = org_user_company
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer").mock(
        return_value=Response(400, json={"error": "invalid_grant"})
    )
    state = oauth.create_state(company.id, user.id)
    r = client.get(f"/api/quickbooks/callback?state={state}&code=BAD&realmId=12345")
    assert r.status_code == 502


# ============= /connection (status + delete) =============

def test_status_not_connected(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/connection")
    assert r.status_code == 200
    assert r.json()["status"] == "not_connected"


def test_status_connected(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/connection")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "connected"
    assert body["realm_id"] == "realm-1"


def test_status_revoked(auth_client, db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    conn.status = "revoked"
    db.commit()
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/connection")
    assert r.status_code == 200
    assert r.json()["status"] == "revoked"


@respx.mock
def test_disconnect_deletes_connection(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    respx.post("https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke").mock(
        return_value=Response(200)
    )
    r = auth_client.delete(f"/api/quickbooks/companies/{company.id}/connection")
    assert r.status_code == 204
    assert db.query(QuickBooksConnection).count() == 0


def test_disconnect_no_connection_404(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.delete(f"/api/quickbooks/companies/{company.id}/connection")
    assert r.status_code == 404


# ============= /trial-balance/preview =============

def _mock_preview_endpoints():
    fixture = json.loads(FIXTURE.read_text())
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance"
    ).mock(return_value=Response(200, json=fixture))
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query"
    ).mock(return_value=Response(200, json={"QueryResponse": {"Account": [
        {"Id": "1", "AcctNum": "1000", "AccountType": "Bank", "AccountSubType": "Checking"},
        {"Id": "42", "AcctNum": "4000", "AccountType": "Income",
         "AccountSubType": "SalesOfProductIncome"},
        {"Id": "60", "AcctNum": "6010", "AccountType": "Expense",
         "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
    ]}}))


@respx.mock
def test_preview_happy_path(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["currency"] == "CAD"
    assert len(body["rows"]) == 3
    cash = next(r for r in body["rows"] if r["account_number"] == "1000")
    assert cash["proposed_link_code"] == "actif.encaisse"
    assert cash["confidence"] == "high"


@respx.mock
def test_preview_includes_existing_link_code(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    db.add(AccountMapping(
        company_id=company.id, account_number="1000",
        description="Cash", link_code="actif.special",
    ))
    db.commit()
    _mock_preview_endpoints()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
    )
    cash = next(r for r in r.json()["rows"] if r["account_number"] == "1000")
    assert cash["existing_link_code"] == "actif.special"


def test_preview_no_connection_404(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
    )
    assert r.status_code == 404


def test_preview_revoked_424(auth_client, db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    conn.status = "revoked"
    db.commit()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
    )
    assert r.status_code == 424


def test_preview_invalid_month(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 13},
    )
    assert r.status_code == 422


@respx.mock
def test_preview_qbo_429_maps_to_503(auth_client, db, org_user_company, monkeypatch):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)

    from app.integrations.quickbooks import client as qbo_client
    monkeypatch.setattr(qbo_client.time, "sleep", lambda _: None)
    route = respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance"
    )
    route.side_effect = [Response(429, headers={"Retry-After": "0"}), Response(429)]
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "month": 3},
    )
    assert r.status_code == 503


# ============= /trial-balance/commit =============

def test_commit_creates_tb_chart_and_mappings(auth_client, db, org_user_company):
    _, _, company = org_user_company
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [
            {"account_number": "1000", "account_name": "Cash", "debit": 5000,
             "credit": 0, "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales", "debit": 0,
             "credit": 12500, "link_code": "revenus.ventes"},
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.status_code == 201, r.text
    assert r.json() == {
        "accounts_imported": 2, "mappings_created": 2, "mappings_updated": 0,
    }
    assert db.query(ChartOfAccount).filter_by(company_id=company.id).count() == 2
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 2


def test_commit_skips_rows(auth_client, db, org_user_company):
    _, _, company = org_user_company
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [
            {"account_number": "1000", "account_name": "Cash", "debit": 5000,
             "credit": 0, "link_code": "actif.encaisse"},
            {"account_number": "9999", "account_name": "Skip", "debit": 0,
             "credit": 0, "link_code": None, "skip": True},
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.json()["accounts_imported"] == 1


def test_commit_conflict_without_overwrite(auth_client, db, org_user_company):
    _, _, company = org_user_company
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [{"account_number": "1000", "account_name": "Cash", "debit": 5000,
                  "credit": 0, "link_code": "actif.encaisse"}],
        "overwrite_existing_tb": False,
    }
    auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    r2 = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r2.status_code == 409


def test_commit_overwrite_replaces_entries(auth_client, db, org_user_company):
    _, _, company = org_user_company
    first = {
        "fiscal_year": 2026, "month": 3,
        "rows": [{"account_number": "1000", "account_name": "Cash", "debit": 5000,
                  "credit": 0, "link_code": "actif.encaisse"}],
        "overwrite_existing_tb": False,
    }
    auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=first,
    )
    second = {
        "fiscal_year": 2026, "month": 3,
        "rows": [{"account_number": "1000", "account_name": "Cash", "debit": 7500,
                  "credit": 0, "link_code": "actif.encaisse"}],
        "overwrite_existing_tb": True,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=second,
    )
    assert r.status_code == 201
    entries = db.query(TrialBalanceEntry).filter_by(company_id=company.id).all()
    assert len(entries) == 1
    assert float(entries[0].amount) == 7500.0


def test_commit_updates_existing_mapping(auth_client, db, org_user_company):
    _, _, company = org_user_company
    db.add(AccountMapping(
        company_id=company.id, account_number="1000",
        description="Cash", link_code="actif.old",
    ))
    db.commit()
    body = {
        "fiscal_year": 2026, "month": 3,
        "rows": [{"account_number": "1000", "account_name": "Cash", "debit": 5000,
                  "credit": 0, "link_code": "actif.encaisse"}],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.json()["mappings_updated"] == 1
    m = db.query(AccountMapping).filter_by(company_id=company.id).one()
    assert m.link_code == "actif.encaisse"


def test_commit_invalid_month(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={"fiscal_year": 2026, "month": 0, "rows": [], "overwrite_existing_tb": False},
    )
    assert r.status_code == 422


# ============= /link-codes =============

def test_link_codes_extracts_from_structure(auth_client, db, org_user_company):
    org, _, company = org_user_company
    db.add(FinancialStatementMapping(
        organization_id=org.id, mapping_type="bilan",
        structure=[
            {"link_code": "actif.encaisse", "label": "Encaisse"},
            {"link_code": "passif.dette", "label": "Dette"},
        ],
    ))
    db.commit()
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert r.status_code == 200
    codes = {o["code"] for o in r.json()}
    assert codes == {"actif.encaisse", "passif.dette"}


def test_link_codes_walks_nested_dict(auth_client, db, org_user_company):
    org, _, company = org_user_company
    db.add(FinancialStatementMapping(
        organization_id=org.id, mapping_type="resultats",
        structure={"sections": [
            {"name": "Revenus", "rows": [{"link_code": "revenus.ventes", "label": "Ventes"}]},
        ]},
    ))
    db.commit()
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert r.status_code == 200
    assert any(o["code"] == "revenus.ventes" for o in r.json())


def test_link_codes_dedupes(auth_client, db, org_user_company):
    org, _, company = org_user_company
    db.add(FinancialStatementMapping(
        organization_id=org.id, mapping_type="bilan",
        structure=[
            {"link_code": "x", "label": "X"}, {"link_code": "x", "label": "X dup"},
        ],
    ))
    db.commit()
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert len(r.json()) == 1
