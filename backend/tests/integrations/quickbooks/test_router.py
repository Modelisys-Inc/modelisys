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


def test_authorize_cross_org_returns_404(client, db, org_user_company, other_org_user):
    # Cross-org access now returns 404 (not 403) via the central RBAC gate, which
    # deliberately does not leak the existence of companies in other orgs.
    _, _, company = org_user_company

    def _override():
        return other_org_user

    app.dependency_overrides[get_current_user] = _override
    try:
        r = client.get(f"/api/quickbooks/authorize?company_id={company.id}")
        assert r.status_code == 404
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
        json={"fiscal_year": 2026, "months": [3]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["currency"] == "CAD"
    assert body["months"] == [3]
    assert len(body["rows"]) == 3
    cash = next(r for r in body["rows"] if r["account_number"] == "1000")
    assert "3" in cash["monthly_amounts"]


@respx.mock
def test_preview_multi_month_returns_union_with_sparse_amounts(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)

    fixture = json.loads(FIXTURE.read_text())
    # Same fixture for both calls — proves union dedupes rows.
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance"
    ).mock(return_value=Response(200, json=fixture))
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query"
    ).mock(return_value=Response(200, json={"QueryResponse": {"Account": [
        {"Id": "1", "AcctNum": "1000", "AccountType": "Bank",
         "AccountSubType": "Checking"},
        {"Id": "42", "AcctNum": "4000", "AccountType": "Income",
         "AccountSubType": "SalesOfProductIncome"},
        {"Id": "60", "AcctNum": "6010", "AccountType": "Expense",
         "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
    ]}}))

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [1, 2, 3]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["months"] == [1, 2, 3]
    assert body["existing_months"] == []
    assert len(body["rows"]) == 3  # union, deduped by account_number
    cash = next(r for r in body["rows"] if r["account_number"] == "1000")
    # All three months hit the same fixture, so all three appear.
    assert set(cash["monthly_amounts"].keys()) == {"1", "2", "3"}
    assert cash["monthly_amounts"]["1"]["debit"] > 0


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
        json={"fiscal_year": 2026, "months": [3]},
    )
    cash = next(r for r in r.json()["rows"] if r["account_number"] == "1000")
    assert cash["existing_link_code"] == "actif.special"


def test_preview_no_connection_404(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3]},
    )
    assert r.status_code == 404


def test_preview_revoked_424(auth_client, db, org_user_company):
    _, user, company = org_user_company
    conn = service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    conn.status = "revoked"
    db.commit()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3]},
    )
    assert r.status_code == 424


@respx.mock
def test_preview_qbo_429_maps_to_503(auth_client, db, org_user_company, monkeypatch):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)

    from app.integrations.quickbooks import client as qbo_client
    monkeypatch.setattr(qbo_client.time, "sleep", lambda _: None)
    # list_accounts (query) is called first; trigger 429 there so retry
    # exhaustion maps to 503.
    route = respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query"
    )
    route.side_effect = [Response(429, headers={"Retry-After": "0"}), Response(429)]
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3]},
    )
    assert r.status_code == 503


@respx.mock
def test_preview_reports_existing_months(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    # Seed a TB entry for month 2.
    chart = ChartOfAccount(
        company_id=company.id, account_number="1000", account_name="Cash",
    )
    db.add(chart)
    db.flush()
    db.add(TrialBalanceEntry(
        company_id=company.id, account_id=chart.id,
        fiscal_year=2026, month=2, amount=100,
    ))
    db.commit()

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [1, 2, 3]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["existing_months"] == [2]


def test_preview_empty_months_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": []},
    )
    assert r.status_code == 422


def test_preview_out_of_range_month_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3, 13]},
    )
    assert r.status_code == 422


@respx.mock
def test_preview_dedupes_and_sorts_months(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3, 1, 2, 2]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["months"] == [1, 2, 3]


# ============= /trial-balance/commit =============

@respx.mock
def test_commit_creates_tb_chart_and_mappings(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    body = {
        "fiscal_year": 2026, "months": [3],
        "rows": [
            {"account_number": "1000", "account_name": "Cash",
             "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales",
             "link_code": "revenus.ventes"},
            {"account_number": "6010", "account_name": "Office",
             "link_code": None, "skip": True},  # in fixture but skipped
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["months_imported"] == 1
    assert body["accounts_imported"] == 2
    assert body["mappings_created"] == 2
    assert body["mappings_updated"] == 0
    assert db.query(ChartOfAccount).filter_by(company_id=company.id).count() == 2
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 2


@respx.mock
def test_commit_skips_rows(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    body = {
        "fiscal_year": 2026, "months": [3],
        "rows": [
            {"account_number": "1000", "account_name": "Cash",
             "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales",
             "link_code": None, "skip": True},
            {"account_number": "6010", "account_name": "Office",
             "link_code": None, "skip": True},
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.json()["accounts_imported"] == 1


@respx.mock
def test_commit_updates_existing_mapping(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    db.add(AccountMapping(
        company_id=company.id, account_number="1000",
        description="Cash", link_code="actif.old",
    ))
    db.commit()
    body = {
        "fiscal_year": 2026, "months": [3],
        "rows": [
            {"account_number": "1000", "account_name": "Cash",
             "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales",
             "link_code": "revenus.ventes"},
            {"account_number": "6010", "account_name": "Office",
             "link_code": None, "skip": True},
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.json()["mappings_updated"] == 1
    m = db.query(AccountMapping).filter_by(
        company_id=company.id, account_number="1000",
    ).one()
    assert m.link_code == "actif.encaisse"


def test_commit_rejects_unknown_link_code(auth_client, db, org_user_company):
    # Link-code validation runs BEFORE the QBO re-pull, so no QBO mocking needed.
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "months": [3],
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "link_code": "does-not-exist",
                    "skip": False,
                },
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 422, r.text
    body = r.json()
    assert "1000" in body["detail"]
    assert "does-not-exist" in body["detail"]


@respx.mock
def test_commit_skipped_rows_exempt_from_validation(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "months": [3],
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "link_code": "does-not-exist",
                    "skip": True,
                },
                {
                    "account_number": "4000",
                    "account_name": "Sales",
                    "link_code": None,
                    "skip": True,
                },
                {
                    "account_number": "6010",
                    "account_name": "Office",
                    "link_code": None,
                    "skip": True,
                },
                {
                    "account_number": "2000",
                    "account_name": "Salaire",
                    "link_code": "44-330",
                    "skip": False,
                },
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 201, r.text


@respx.mock
def test_commit_multi_month_conflict_without_overwrite_writes_nothing(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()

    # First commit succeeds for months 1, 2.
    first = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert first.status_code == 201, first.text
    baseline = db.query(TrialBalanceEntry).filter_by(company_id=company.id).count()

    # Second commit overlaps months 1, 2 — must 409 and not change DB.
    second = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert second.status_code == 409
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == baseline


@respx.mock
def test_commit_overwrite_replaces_conflicting_months_only(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()

    auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": True,
        },
    )
    assert r.status_code == 201, r.text
    # 2 non-skipped accounts × 3 months = 6 entries (1 and 2 replaced; 3 new).
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 6


@respx.mock
def test_commit_data_drift_returns_409_and_writes_nothing(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()

    # User submits only 1 of the 3 accounts present in the QBO re-pull.
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 409
    assert "Data drift" in r.json()["detail"]
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 0


def test_commit_empty_months_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={"fiscal_year": 2026, "months": [], "rows": [],
              "overwrite_existing_tb": False},
    )
    assert r.status_code == 422


# ============= /link-codes =============

def test_list_link_codes_returns_global_standard_codes(auth_client, org_user_company):
    _, _, company = org_user_company
    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert len(body) > 0
    codes = {o["code"] for o in body}
    # Codes seeded in conftest.seed_standard_link_codes must be present
    assert "actif.encaisse" in codes
    assert "revenus.ventes" in codes
    # Each item has the required LinkCodeOption fields
    first = body[0]
    assert "code" in first
    assert "label" in first
    assert "statement_type" in first


@respx.mock
def test_commit_multi_month_writes_entry_per_month(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()  # same fixture across months

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["months_imported"] == 3
    assert body["accounts_imported"] == 2  # unique non-skipped accounts written

    # 2 non-skipped accounts × 3 months = 6 entries
    entries = db.query(TrialBalanceEntry).filter_by(company_id=company.id).all()
    assert len(entries) == 6
    months_written = {e.month for e in entries}
    assert months_written == {1, 2, 3}




def test_preview_response_includes_tracking_and_tags(auth_client, db, org_user_company, monkeypatch):
    from app.integrations.quickbooks import oauth
    from app.integrations.quickbooks import service as svc
    _, user, company = org_user_company
    svc.upsert_connection(
        db, company.id, "realm-1",
        oauth.TokenResponse(
            access_token="AT", refresh_token="RT",
            expires_in=3600, x_refresh_token_expires_in=8640000,
        ),
        user.id,
    )

    def fake_propose(db_, conn_, company_, fy, months):
        return {
            "currency": "CAD",
            "existing_months": [],
            "rows": [{
                "qbo_account_id": "33", "account_number": "4000", "account_name": "Sales",
                "qbo_account_type": "Income", "qbo_account_sub_type": None,
                "existing_link_code": None, "monthly_amounts": {},
                "discovered_divisions": ["East"], "discovered_sub_divisions": ["Montreal"],
                "divisions": ["East"], "sub_divisions": ["Montreal"],
            }],
            "observed_pairs": [{"division": "East", "sub_division": "Montreal"}],
            "class_location_tracking": {"classes": True, "locations": True},
        }
    monkeypatch.setattr(svc, "propose_trial_balance", fake_propose)

    resp = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2024, "months": [3]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["class_location_tracking"] == {"classes": True, "locations": True}
    assert body["rows"][0]["divisions"] == ["East"]
    assert body["observed_pairs"] == [{"division": "East", "sub_division": "Montreal"}]
