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
from app.models.financial_statement_mapping import CompanyStatementStructure
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

def test_commit_creates_tb_chart_and_mappings(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_legacy_codes_structure(db, company)
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
    _seed_legacy_codes_structure(db, company)
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
    _seed_legacy_codes_structure(db, company)
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
    _seed_legacy_codes_structure(db, company)
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
    _seed_legacy_codes_structure(db, company)
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


def test_commit_rejects_unknown_link_code(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "month": 3,
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "debit": 100,
                    "credit": 0,
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


def test_commit_skipped_rows_exempt_from_validation(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "month": 3,
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "debit": 0,
                    "credit": 0,
                    "link_code": "does-not-exist",
                    "skip": True,
                },
                {
                    "account_number": "2000",
                    "account_name": "Salaire",
                    "debit": 100,
                    "credit": 0,
                    "link_code": "44-330",
                    "skip": False,
                },
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 201, r.text


# ============= /link-codes =============

def test_list_link_codes_reads_from_company_statement_structure(auth_client, db, org_user_company):
    _, _, company = org_user_company
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "id": "revenue",
                "label": "Revenus",
                "isSection": True,
                "children": [
                    {"id": "20-101", "label": "Développement sur mesure", "linkCode": "20-101"},
                    {"id": "20-102", "label": "Ventes de logiciels", "linkCode": "20-102"},
                ],
            },
        ],
    ))
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="balance-sheet",
        structure=[
            {
                "id": "actifs-courants",
                "label": "Actifs courants",
                "isSection": True,
                "children": [
                    {"id": "10-100", "label": "Encaisse", "linkCode": "10-100"},
                ],
            },
        ],
    ))
    db.commit()

    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert r.status_code == 200, r.text
    body = r.json()
    codes = {o["code"]: o for o in body}
    assert set(codes) == {"20-101", "20-102", "10-100"}
    assert codes["20-101"]["statement_type"] == "income-statement"
    assert codes["20-101"]["parent_id"] == "revenue"
    assert codes["20-101"]["parent_label"] == "Revenus"
    assert codes["10-100"]["statement_type"] == "balance-sheet"
    assert codes["10-100"]["parent_id"] == "actifs-courants"


def _seed_legacy_codes_structure(db, company):
    """Seed a CompanyStatementStructure containing the legacy link codes used by
    the existing commit tests. Required so strict commit validation passes."""
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "id": "revenus", "label": "Revenus", "isSection": True,
                "children": [
                    {"id": "revenus.ventes", "label": "Ventes", "linkCode": "revenus.ventes"},
                ],
            },
        ],
    ))
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="balance-sheet",
        structure=[
            {
                "id": "actifs-courants", "label": "Actifs courants", "isSection": True,
                "children": [
                    {"id": "actif.encaisse", "label": "Encaisse", "linkCode": "actif.encaisse"},
                    {"id": "actif.old", "label": "Legacy", "linkCode": "actif.old"},
                ],
            },
        ],
    ))
    db.commit()


def _seed_income_structure(db, company):
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "id": "admin-expenses",
                "label": "Frais d'administration",
                "isSection": True,
                "children": [
                    {"id": "44-330", "label": "Salaires admin", "linkCode": "44-330"},
                ],
            },
        ],
    ))
    db.commit()


def test_create_link_code_appends_leaf_and_returns_option(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "admin-expenses",
            "link_code": "44-999",
            "label": "Nouveau poste",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body == {
        "code": "44-999",
        "label": "Nouveau poste",
        "statement_type": "income-statement",
        "parent_id": "admin-expenses",
        "parent_label": "Frais d'administration",
    }

    db.expire_all()
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company.id,
            CompanyStatementStructure.statement_type == "income-statement",
        )
        .first()
    )
    children = structure.structure[0]["children"]
    assert {"label": "Nouveau poste", "linkCode": "44-999", "indent": True} in children


def test_create_link_code_invalid_statement_type_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "not-a-real-type",
            "parent_id": "admin-expenses",
            "link_code": "44-999",
            "label": "X",
        },
    )
    assert r.status_code == 422


def test_create_link_code_missing_parent_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "does-not-exist",
            "link_code": "44-999",
            "label": "X",
        },
    )
    assert r.status_code == 422
    assert "parent" in r.json()["detail"].lower()


def test_create_link_code_duplicate_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "admin-expenses",
            "link_code": "44-330",
            "label": "Conflict",
        },
    )
    assert r.status_code == 422
    assert "already" in r.json()["detail"].lower()


def test_create_link_code_supports_detail_rows_schema(auth_client, db, org_user_company):
    """Production structures often use `detailRows` instead of `children` and
    rely on `label` as the parent identifier (no `id` field)."""
    _, _, company = org_user_company
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "label": "frais d'administration",
                "indent": True,
                "isSection": True,
                "detailRows": [
                    {"label": "Loyer", "indent": True, "linkCode": "44-540"},
                ],
            },
        ],
    ))
    db.commit()

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "frais d'administration",
            "link_code": "44-999",
            "label": "Nouveau poste",
        },
    )
    assert r.status_code == 201, r.text

    db.expire_all()
    structure = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .first()
    )
    detail_rows = structure.structure[0]["detailRows"]
    assert any(r.get("linkCode") == "44-999" for r in detail_rows)


@respx.mock
def test_commit_multi_month_writes_entry_per_month(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
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


def test_create_link_code_supports_flat_sibling_schema(auth_client, db, org_user_company):
    """Some production structures are flat: sections and leaves are siblings.
    A new leaf must be inserted after the chosen section, before the next
    section header."""
    _, _, company = org_user_company
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="balance-sheet",
        structure=[
            {"label": "actifs", "isBold": True, "isSection": True},
            {"label": "actifs courants", "indent": True, "isSection": True},
            {"label": "Encaisse", "indent": True, "linkCode": "A"},
            {"label": "actifs non courants", "indent": True, "isSection": True},
            {"label": "Immobilisations", "indent": True, "linkCode": "G"},
        ],
    ))
    db.commit()

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/link-codes",
        json={
            "statement_type": "balance-sheet",
            "parent_id": "actifs courants",
            "link_code": "B",
            "label": "Débiteurs",
        },
    )
    assert r.status_code == 201, r.text

    db.expire_all()
    structure = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .first()
    )
    labels = [n.get("label") for n in structure.structure]
    # The new leaf should land after "actifs courants" and "Encaisse",
    # but before "actifs non courants".
    assert labels.index("Débiteurs") > labels.index("actifs courants")
    assert labels.index("Débiteurs") < labels.index("actifs non courants")
