from uuid import UUID

from app.models.account_mapping import AccountMapping
from app.services.standard_link_code_utils import (
    build_parent_rollup_index,
    load_merged_link_code_chart,
    merge_parent_rollup_into_mapping_index,
)


def test_build_parent_rollup_index_family_and_ancestors(db):
    from app.models.standard_link_code import StandardLinkCode

    db.add_all([
        StandardLinkCode(code="REV-A", family="REV", is_leaf=False, parent_code=None, sort_order=1),
        StandardLinkCode(code="REV-A.1", family="REV", is_leaf=True, parent_code="REV-A", sort_order=2),
    ])
    db.commit()

    company_id = UUID("00000000-0000-0000-0000-000000000000")
    chart = load_merged_link_code_chart(db, company_id)
    mappings = [
        AccountMapping(
            account_number="4000",
            description="A",
            link_code="REV-A.1",
            company_id=company_id,
        ),
    ]
    rollup = build_parent_rollup_index(mappings, chart)
    assert rollup["REV-A.1"] == ["4000"]
    assert rollup["REV-A"] == ["4000"]
    assert rollup["REV"] == ["4000"]

    merged = merge_parent_rollup_into_mapping_index({"REV-A.1": ["4000"]}, rollup)
    assert merged["REV"] == ["4000"]
