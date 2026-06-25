"""Range-partition trial_balance_entries by fiscal_year (PostgreSQL)

Revision ID: 015
Revises: 014

No data migration: the table is recreated. Safe because there are no inbound
foreign keys to trial_balance_entries and (per project state) no production data.
On PostgreSQL the table becomes RANGE-partitioned by fiscal_year with a DEFAULT
partition (so inserts for any year never fail) plus explicit yearly partitions.
On other dialects (e.g. SQLite for tests) it is recreated as a plain table with
the new composite primary key.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None

_YEAR_START = 2015
_YEAR_END = 2035  # inclusive; partitions created for [start, end]


def _create_plain_table() -> None:
    op.create_table(
        "trial_balance_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["chart_of_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", "fiscal_year"),
        sa.UniqueConstraint(
            "company_id", "account_id", "fiscal_year", "month",
            name="uq_trial_balance_entries_company_account_year_month",
        ),
    )
    op.create_index("ix_trial_balance_entries_company_id", "trial_balance_entries", ["company_id"])
    op.create_index("ix_trial_balance_entries_account_id", "trial_balance_entries", ["account_id"])
    op.create_index(
        "ix_trial_balance_entries_company_fiscal_year",
        "trial_balance_entries", ["company_id", "fiscal_year"],
    )
    op.create_index(
        "ix_trial_balance_entries_company_fiscal_year_month",
        "trial_balance_entries", ["company_id", "fiscal_year", "month"],
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        # SQLite / others: plain composite-PK table.
        op.drop_table("trial_balance_entries")
        _create_plain_table()
        return

    op.execute("DROP TABLE IF EXISTS trial_balance_entries CASCADE")
    op.execute(
        """
        CREATE TABLE trial_balance_entries (
            id UUID NOT NULL,
            fiscal_year INTEGER NOT NULL,
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
            month INTEGER NOT NULL,
            amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
            PRIMARY KEY (id, fiscal_year),
            CONSTRAINT uq_trial_balance_entries_company_account_year_month
                UNIQUE (company_id, account_id, fiscal_year, month)
        ) PARTITION BY RANGE (fiscal_year)
        """
    )
    # DEFAULT partition: any fiscal_year outside the explicit ranges lands here,
    # so inserts never fail; rows can later be split into a dedicated partition.
    op.execute(
        "CREATE TABLE trial_balance_entries_default "
        "PARTITION OF trial_balance_entries DEFAULT"
    )
    for year in range(_YEAR_START, _YEAR_END + 1):
        op.execute(
            f"CREATE TABLE trial_balance_entries_y{year} "
            f"PARTITION OF trial_balance_entries "
            f"FOR VALUES FROM ({year}) TO ({year + 1})"
        )

    op.execute("CREATE INDEX ix_trial_balance_entries_company_id ON trial_balance_entries (company_id)")
    op.execute("CREATE INDEX ix_trial_balance_entries_account_id ON trial_balance_entries (account_id)")
    op.execute(
        "CREATE INDEX ix_trial_balance_entries_company_fiscal_year "
        "ON trial_balance_entries (company_id, fiscal_year)"
    )
    op.execute(
        "CREATE INDEX ix_trial_balance_entries_company_fiscal_year_month "
        "ON trial_balance_entries (company_id, fiscal_year, month)"
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TABLE IF EXISTS trial_balance_entries CASCADE")
    else:
        op.drop_table("trial_balance_entries")

    # Recreate the pre-partition shape (single-column PK on id).
    op.create_table(
        "trial_balance_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["chart_of_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id", "account_id", "fiscal_year", "month",
            name="uq_trial_balance_entries_company_account_year_month",
        ),
    )
    op.create_index("ix_trial_balance_entries_company_fiscal_year", "trial_balance_entries", ["company_id", "fiscal_year"])
    op.create_index("ix_trial_balance_entries_company_fiscal_year_month", "trial_balance_entries", ["company_id", "fiscal_year", "month"])
