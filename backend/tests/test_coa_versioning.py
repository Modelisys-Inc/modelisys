"""Tests for COA versioning (Phase 3, lightweight): version bump on each publish,
additive upsert + tombstone of removed codes, code reactivation, and company
cohort-stamping at creation.
"""
import uuid

from app.models.coa_version import CoaVersion
from app.models.company import Company
from app.models.standard_link_code import StandardLinkCode
from app.scripts.seed_standard_link_codes import apply_records, next_coa_version


def _rec(code: str, family: str = "EXP", is_leaf: bool = True, **over) -> dict:
    base = {
        "code": code,
        "parent_code": None,
        "family": family,
        "label_account": f"Label {code}",
        "label_sub_account": None,
        "account_type": None,
        "account_sub_type": None,
        "variable_or_fixed": None,
        "ft_category": None,
        "ft_line_item": None,
        "projections": None,
        "is_leaf": is_leaf,
        "sort_order": 0,
    }
    base.update(over)
    return base


def _clear_codes(db):
    """Remove the autouse-seeded TST codes so apply_records starts clean."""
    db.query(StandardLinkCode).delete()
    db.commit()


def test_next_version_starts_at_one(db):
    _clear_codes(db)
    assert next_coa_version(db) == 1


def test_apply_records_creates_codes_and_version(db):
    _clear_codes(db)
    summary = apply_records(db, [_rec("EXP-1"), _rec("EXP-2")], source="MO.xlsx")
    db.commit()

    assert summary == {"version": 1, "upserted": 2, "tombstoned": 0}
    codes = {c.code: c for c in db.query(StandardLinkCode).all()}
    assert set(codes) == {"EXP-1", "EXP-2"}
    assert all(c.is_active and c.coa_version == 1 for c in codes.values())

    version_row = db.query(CoaVersion).filter(CoaVersion.version == 1).one()
    assert version_row.code_count == 2
    assert version_row.tombstoned_count == 0


def test_second_publish_bumps_version_and_tombstones_removed(db):
    _clear_codes(db)
    apply_records(db, [_rec("EXP-1"), _rec("EXP-2")])
    db.commit()

    # EXP-2 disappears, EXP-3 appears.
    summary = apply_records(db, [_rec("EXP-1"), _rec("EXP-3")])
    db.commit()

    assert summary["version"] == 2
    assert summary["tombstoned"] == 1

    codes = {c.code: c for c in db.query(StandardLinkCode).all()}
    # Nothing is hard-deleted.
    assert set(codes) == {"EXP-1", "EXP-2", "EXP-3"}
    assert codes["EXP-2"].is_active is False
    assert codes["EXP-2"].deprecated_at is not None
    assert codes["EXP-1"].is_active is True
    assert codes["EXP-1"].coa_version == 2
    assert codes["EXP-3"].coa_version == 2


def test_tombstoned_code_reactivates_when_it_returns(db):
    _clear_codes(db)
    apply_records(db, [_rec("EXP-1")])
    db.commit()
    apply_records(db, [])  # EXP-1 tombstoned at version 2
    db.commit()
    assert db.query(StandardLinkCode).filter_by(code="EXP-1").one().is_active is False

    apply_records(db, [_rec("EXP-1")])  # returns at version 3
    db.commit()
    row = db.query(StandardLinkCode).filter_by(code="EXP-1").one()
    assert row.is_active is True
    assert row.deprecated_at is None
    assert row.coa_version == 3


def test_company_stamped_with_current_coa_version(client, auth_headers, db):
    # Publish a version so there is a "current" to stamp.
    db.add(CoaVersion(id=uuid.uuid4(), version=7, source="MO.xlsx", code_count=1))
    db.commit()

    resp = client.post("/api/companies", json={"name": "Stamped Co"}, headers=auth_headers)
    assert resp.status_code == 201
    company_id = resp.json()["id"]

    company = db.query(Company).filter(Company.id == uuid.UUID(company_id)).one()
    assert company.coa_version == 7


def test_company_coa_version_null_when_no_version_published(client, auth_headers, db):
    resp = client.post("/api/companies", json={"name": "Early Co"}, headers=auth_headers)
    assert resp.status_code == 201
    company = db.query(Company).filter(Company.id == uuid.UUID(resp.json()["id"])).one()
    assert company.coa_version is None
