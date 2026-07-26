"""Tests for multi-month trial balance import."""

from io import BytesIO

from app.services.trial_balance_import import (
    calendar_months_from_start,
    parse_multi_month_file,
    parse_single_month_file,
    period_label,
)


def test_calendar_months_from_start_spans_years():
    periods = calendar_months_from_start(2024, 11, 4)
    assert [(p.year, p.month) for p in periods] == [(2024, 11), (2024, 12), (2025, 1), (2025, 2)]


def test_parse_multi_month_csv_three_months():
    csv_content = (
        "#,Description,Jan 2024,Feb 2024,Mar 2024\n"
        "1000,Cash,100,-50,-50\n"
        "2000,Payable,-100,50,50\n"
    ).encode("utf-8-sig")
    parsed = parse_multi_month_file(csv_content, "tb.csv", 2024, 1, 3)
    assert len(parsed.rows) == 2
    assert parsed.month_sums == [0.0, 0.0, 0.0]
    assert period_label(parsed.periods[0]) == "Janvier 2024"
    assert period_label(parsed.periods[2]) == "Mars 2024"
    assert parsed.rows[0].amounts == [100.0, -50.0, -50.0]


def test_parse_single_month_still_works():
    csv_content = "#,Description,Montant\n1000,Cash,10\n2000,X,-10\n".encode("utf-8-sig")
    rows, total = parse_single_month_file(csv_content, "tb.csv")
    assert len(rows) == 2
    assert total == 0.0
