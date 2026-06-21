"""Regression test: every company-scoped *write* route carries the central
write guard (enforce_company_write), except the few that enforce access another
way. Catches a future router added without the guard (a viewer-write hole).
"""
from app.dependencies import enforce_company_write
from app.main import app

_SAFE = {"GET", "HEAD", "OPTIONS"}

# Routes that legitimately do NOT use enforce_company_write:
# - companies-router admin ops gate with require_org_admin in-handler;
# - QBO gates writes explicitly (its OAuth callback is unauthenticated).
_EXEMPT_PATHS = {
    "/api/companies/{company_id}",            # PATCH/DELETE company (admin)
    "/api/companies/{company_id}/divisions",  # create division (admin)
}
_EXEMPT_PREFIXES = ("/api/quickbooks/",)


def _has_guard(route) -> bool:
    dependant = getattr(route, "dependant", None)
    if dependant is None:
        return False
    return any(getattr(d, "call", None) is enforce_company_write for d in dependant.dependencies)


def test_all_company_write_routes_are_guarded():
    offenders = []
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", None) or set()
        if "{company_id}" not in path:
            continue
        write_methods = methods - _SAFE
        if not write_methods:
            continue
        if path in _EXEMPT_PATHS:
            continue
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            continue
        if not _has_guard(route):
            offenders.append((sorted(write_methods), path))

    assert offenders == [], f"Company-write routes missing enforce_company_write: {offenders}"


def test_guard_is_actually_used_somewhere():
    # Sanity: the guard is wired to at least the core data routers.
    guarded = [
        getattr(r, "path", "")
        for r in app.routes
        if "{company_id}" in getattr(r, "path", "") and _has_guard(r)
    ]
    assert any("/trial-balance" in p for p in guarded)
    assert any("/account-mappings" in p for p in guarded)
