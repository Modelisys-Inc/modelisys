"""Thin httpx wrapper for QuickBooks Online accounting API."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.quickbooks import service
from app.models.quickbooks_connection import QuickBooksConnection

logger = logging.getLogger(__name__)


class QBOClientError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        intuit_tid: str | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.intuit_tid = intuit_tid


def _api_url(realm_id: str, path: str) -> str:
    return f"{settings.intuit_api_base}/v3/company/{realm_id}{path}"


def _request(
    db: Session,
    conn: QuickBooksConnection,
    method: str,
    path: str,
    params: dict | None = None,
    *,
    _retried_401: bool = False,
) -> dict[str, Any]:
    access_token = service.get_valid_access_token(db, conn)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    url = _api_url(conn.realm_id, path)
    try:
        response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
    except httpx.TimeoutException as e:
        raise QBOClientError(f"QBO request timed out: {e}", status_code=504) from e

    intuit_tid = response.headers.get("intuit_tid")

    if response.status_code == 401 and not _retried_401:
        # Force-refresh by clearing the expiry, then retry once.
        conn.access_token_expires_at = datetime.now(timezone.utc)
        db.commit()
        return _request(db, conn, method, path, params, _retried_401=True)

    if response.status_code == 429:
        retry_after = float(response.headers.get("Retry-After", "1"))
        time.sleep(min(retry_after, 5.0))
        try:
            response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
        except httpx.TimeoutException as e:
            raise QBOClientError("QBO retry after 429 timed out", status_code=504) from e

    if response.status_code >= 500:
        time.sleep(1.0)
        try:
            response = httpx.request(method, url, params=params, headers=headers, timeout=15.0)
        except httpx.TimeoutException as e:
            raise QBOClientError("QBO retry after 5xx timed out", status_code=504) from e

    if response.status_code >= 400:
        logger.warning(
            "QBO error realm=%s path=%s status=%s intuit_tid=%s body=%s",
            conn.realm_id, path, response.status_code, intuit_tid, response.text[:500],
        )
        raise QBOClientError(
            f"QBO API error: {response.status_code}",
            status_code=response.status_code,
            intuit_tid=intuit_tid,
        )

    return response.json()


def get_trial_balance_report(
    db: Session, conn: QuickBooksConnection, start_date: str, end_date: str
) -> dict[str, Any]:
    return _request(
        db, conn, "GET", "/reports/TrialBalance",
        params={
            "start_date": start_date,
            "end_date": end_date,
            "accounting_method": "Accrual",
        },
    )


def list_accounts(db: Session, conn: QuickBooksConnection) -> list[dict[str, Any]]:
    body = _request(
        db, conn, "GET", "/query",
        params={
            "query": "SELECT * FROM Account MAXRESULTS 1000",
            "minorversion": "65",
        },
    )
    return body.get("QueryResponse", {}).get("Account", [])


# Columns we request from the GL report. klass_name / dept_name are only
# populated when the company has class / location tracking enabled.
_GL_COLUMNS = "tx_date,account_name,klass_name,dept_name,subt_nat_amount"


def get_general_ledger_report(
    db: Session, conn: QuickBooksConnection, start_date: str, end_date: str
) -> dict[str, Any]:
    # QBO Reports API returns the full report in one response (no STARTPOSITION
    # pagination like the query endpoint) — a single request is sufficient.
    return _request(
        db, conn, "GET", "/reports/GeneralLedger",
        params={
            "start_date": start_date,
            "end_date": end_date,
            "accounting_method": "Accrual",
            "columns": _GL_COLUMNS,
        },
    )


def get_preferences(db: Session, conn: QuickBooksConnection) -> dict[str, Any]:
    return _request(db, conn, "GET", "/preferences")
