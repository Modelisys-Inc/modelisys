"""Fixed registry of per-client (organization) feature flags.

A flag is enabled for an org if its `feature_flags` override says so, otherwise
the registry default applies. Superadmins toggle the overrides; the frontend
reads the *effective* flags (defaults merged with overrides) to show/hide
features. To add a feature toggle, add an entry here.
"""

# key, human label, default-enabled
FEATURE_FLAGS: list[dict] = [
    {"key": "quickbooks", "label": "Intégration QuickBooks", "default": True},
    {"key": "projections", "label": "Projections", "default": True},
    {"key": "evaluation", "label": "Évaluation d'entreprise", "default": True},
    {"key": "analysis", "label": "Analyse (Capex)", "default": True},
    {"key": "budgets", "label": "Budgets", "default": True},
]

KNOWN_KEYS: set[str] = {f["key"] for f in FEATURE_FLAGS}


def effective_flags(overrides: dict | None) -> dict[str, bool]:
    """Registry defaults merged with an org's overrides (only known keys)."""
    overrides = overrides or {}
    return {f["key"]: bool(overrides.get(f["key"], f["default"])) for f in FEATURE_FLAGS}


def sanitize_overrides(raw: dict | None) -> dict[str, bool]:
    """Keep only known flag keys, coerced to bool — ignores unknown/legacy keys."""
    raw = raw or {}
    return {k: bool(v) for k, v in raw.items() if k in KNOWN_KEYS}
