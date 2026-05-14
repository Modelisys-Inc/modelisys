"""Calcul de l’étiquette d’exercice financier à partir du mois/année de référence et de la fin d’exercice (MM-JJ)."""

from __future__ import annotations

import calendar
from datetime import date, timedelta


def _safe_fy_end_date(year: int, end_month: int, end_day: int) -> date:
    last = calendar.monthrange(year, end_month)[1]
    d = min(end_day, last)
    return date(year, end_month, d)


def fiscal_year_label(
    reference_month: int,
    reference_year: int,
    fiscal_year_end_mm_dd: str,
) -> int:
    """
    Retourne l’année de clôture de l’exercice (ex. fin 31-12-2025 → 2025).
    La date de référence est le 1er jour du mois d’analyse.
    """
    parts = fiscal_year_end_mm_dd.strip().split("-")
    if len(parts) != 2:
        return reference_year
    end_month, end_day = int(parts[0]), int(parts[1])
    if not (1 <= end_month <= 12 and 1 <= end_day <= 31):
        return reference_year

    ref = date(reference_year, reference_month, 1)

    for fy_end_year in range(reference_year - 1, reference_year + 3):
        fy_end = _safe_fy_end_date(fy_end_year, end_month, end_day)
        prev_end = _safe_fy_end_date(fy_end_year - 1, end_month, end_day)
        fy_start = prev_end + timedelta(days=1)
        if fy_start <= ref <= fy_end:
            return fy_end_year

    return reference_year
