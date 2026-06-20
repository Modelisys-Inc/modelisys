"""Seed standard_link_codes from data/MO.xlsx.

Idempotent: upserts by code value. Run from the backend/ directory:
    python -m app.scripts.seed_standard_link_codes
"""

import os
import sys
import uuid
from pathlib import Path

def _find_excel() -> Path:
    """Locate MO.xlsx by trying candidate paths (local dev and Docker)."""
    if env := os.environ.get("EXCEL_PATH"):
        return Path(env)
    script = Path(__file__).resolve()
    candidates = [
        # Docker: ./data mounted at /app/data (./backend:/app, ./data:/app/data)
        script.parents[2] / "data" / "MO.xlsx",
        # Local dev: script in backend/app/scripts, project root 3 levels up
        script.parents[3] / "data" / "MO.xlsx",
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"MO.xlsx not found. Tried: {[str(p) for p in candidates]}"
    )


def _derive_family(code: str) -> str:
    """Extract the family prefix from a code (e.g. 'ACT-B.1' → 'ACT')."""
    return code.split("-")[0].split(".")[0]


def _derive_parent(code: str) -> str | None:
    """Return the parent code, or None if this is already a top-level code.

    ACT-B.1 → ACT-B   (sub-code)
    ACT-B   → None    (top-level within family)
    ACT     → None    (family root, not a real code)
    """
    if "." in code:
        return code.rsplit(".", 1)[0]
    return None


def _bump_duplicate_codes(records: list[dict]) -> list[dict]:
    """Rename duplicate codes by bumping their letter to the next free one.

    When PLT-B appears twice, the second occurrence becomes PLT-G (first letter
    not already used anywhere in the file). Leaf codes whose parent was bumped
    follow automatically: PLT-B.1 → PLT-G.1, PLT-B.2 → PLT-G.2, etc.
    """
    import string
    from collections import Counter

    all_codes_in_file: set[str] = {r["code"] for r in records}

    def _next_free(code: str, taken: set[str]) -> str:
        dash = code.rfind("-")
        if dash == -1:
            raise ValueError(f"Cannot bump code without dash: {code!r}")
        prefix = code[: dash + 1]    # "PLT-"
        rest = code[dash + 1:]        # "B" or "B.1"
        dot = rest.find(".")
        letter, suffix = (rest[:dot], rest[dot:]) if dot != -1 else (rest, "")
        for c in string.ascii_uppercase:
            if c <= letter:
                continue
            candidate = f"{prefix}{c}{suffix}"
            if candidate not in taken:
                return candidate
        raise ValueError(f"No available letter to bump {code!r}")

    seen: set[str] = set()
    code_remap: dict[str, str] = {}
    assigned: set[str] = set()
    result: list[dict] = []

    for rec in records:
        code = rec["code"]
        parent = rec.get("parent_code")

        if code not in seen:
            seen.add(code)
            result.append(rec)
            continue

        if parent and parent in code_remap:
            new_parent = code_remap[parent]
            new_code = new_parent + code[len(parent):]   # e.g. "PLT-G" + ".1"
        else:
            new_code = _next_free(code, all_codes_in_file | assigned)

        code_remap[code] = new_code
        assigned.add(new_code)
        result.append({**rec, "code": new_code, "parent_code": _derive_parent(new_code)})

    return result


def parse_excel(path: Path) -> list[dict]:
    """Parse MO.xlsx Charte sheet into a list of row dicts."""
    try:
        import openpyxl
    except ImportError:
        print("ERROR: openpyxl not installed. Run: pip install openpyxl")
        sys.exit(1)

    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    # Sheet name has a trailing space
    sheet_name = next((s for s in wb.sheetnames if s.strip() == "Charte"), None)
    if not sheet_name:
        raise ValueError(f"Sheet 'Charte' not found in {path}. Available: {wb.sheetnames}")

    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))

    records = []
    for sort_order, row in enumerate(rows[1:], start=1):  # skip header
        compte, sous_compte, type_, sub_type, code, var_fix, ft_cat, ft_line, proj = row

        if not code or str(code).strip() == "":
            continue

        code = str(code).strip()
        label_account = str(compte).strip() if compte else None
        label_sub_account = str(sous_compte).strip() if sous_compte else None
        account_type = str(type_).strip() if type_ else None
        account_sub_type = str(sub_type).strip() if sub_type else None
        variable_or_fixed = str(var_fix).strip() if var_fix else None
        ft_category = str(ft_cat).strip() if ft_cat else None
        ft_line_item = str(ft_line).strip() if ft_line else None
        projections = str(proj).strip() if proj else None

        records.append(
            {
                "code": code,
                "parent_code": _derive_parent(code),
                "family": _derive_family(code),
                "label_account": label_account,
                "label_sub_account": label_sub_account,
                "account_type": account_type,
                "account_sub_type": account_sub_type,
                "variable_or_fixed": variable_or_fixed,
                "ft_category": ft_category,
                "ft_line_item": ft_line_item,
                "projections": projections,
                "sort_order": sort_order,
                # is_leaf determined after all rows parsed
            }
        )

    records = _bump_duplicate_codes(records)

    # Determine is_leaf: a code is a leaf if no other code has it as parent_code
    parent_codes = {r["parent_code"] for r in records if r["parent_code"]}
    for r in records:
        r["is_leaf"] = r["code"] not in parent_codes

    return records


# Fields copied from a parsed record onto a StandardLinkCode row.
_RECORD_FIELDS = (
    "parent_code",
    "family",
    "label_account",
    "label_sub_account",
    "account_type",
    "account_sub_type",
    "variable_or_fixed",
    "ft_category",
    "ft_line_item",
    "projections",
    "is_leaf",
    "sort_order",
)


def next_coa_version(session) -> int:
    """Return the next version number (max existing + 1, or 1)."""
    from sqlalchemy import func as sa_func
    from app.models.coa_version import CoaVersion

    current = session.query(sa_func.max(CoaVersion.version)).scalar()
    return (current or 0) + 1


def apply_records(session, records: list[dict], source: str = "MO.xlsx") -> dict:
    """Publish a new chart version into the DB (dialect-agnostic, ORM-based).

    - Records a new ``coa_versions`` row (version = max + 1).
    - Upserts each parsed code by ``code`` (reactivating any previously tombstoned
      code that reappears), stamping it with the new version.
    - Tombstones codes present in the DB but absent from this file
      (``is_active=False`` + ``deprecated_at``) — never hard-deletes, so
      historical references stay resolvable.

    Returns a summary dict. Caller commits.
    """
    from datetime import datetime, timezone

    from app.models.coa_version import CoaVersion
    from app.models.standard_link_code import StandardLinkCode

    version = next_coa_version(session)
    file_codes = {r["code"] for r in records}
    existing = {c.code: c for c in session.query(StandardLinkCode).all()}

    upserted = 0
    for rec in records:
        obj = existing.get(rec["code"])
        if obj is None:
            obj = StandardLinkCode(id=uuid.uuid4(), code=rec["code"])
            session.add(obj)
        for field in _RECORD_FIELDS:
            setattr(obj, field, rec.get(field))
        obj.is_active = True
        obj.deprecated_at = None
        obj.coa_version = version
        upserted += 1

    tombstoned = 0
    now = datetime.now(timezone.utc)
    for code, obj in existing.items():
        if code not in file_codes and obj.is_active:
            obj.is_active = False
            obj.deprecated_at = now
            tombstoned += 1

    session.add(
        CoaVersion(
            version=version,
            source=source,
            code_count=len(records),
            tombstoned_count=tombstoned,
        )
    )

    return {"version": version, "upserted": upserted, "tombstoned": tombstoned}


def seed(db_url: str | None = None) -> None:
    """Run the seed against the configured database."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    if db_url is None:
        # Load from .env or environment
        try:
            from app.config import settings
            db_url = settings.database_url
        except Exception:
            db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            print("ERROR: DATABASE_URL not set")
            sys.exit(1)

    # openpyxl-safe: convert async URL to sync for this script
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("+asyncpg", "")

    engine = create_engine(sync_url)

    excel_path = _find_excel()
    records = parse_excel(excel_path)
    print(f"Parsed {len(records)} codes from {excel_path.name}")

    with Session(engine) as session:
        summary = apply_records(session, records, source=excel_path.name)
        session.commit()

    print(
        f"Done: published COA version {summary['version']} — "
        f"{summary['upserted']} codes upserted, {summary['tombstoned']} tombstoned"
    )
    leaf_count = sum(1 for r in records if r["is_leaf"])
    print(f"Leaf codes (assignable): {leaf_count} / {len(records)}")


if __name__ == "__main__":
    seed()
