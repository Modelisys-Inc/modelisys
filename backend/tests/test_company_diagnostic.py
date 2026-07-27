"""Tests de l'endpoint GET /api/companies/{id}/diagnostic.

Convention de signes des données seedées (voir FAMILY_DT_CT) : les comptes de
familles CT (REV, PCT, PLT, CAP) sont stockés en crédit (négatif) dans la
balance de vérification ; le moteur applique ×(−1), donc les revenus / passifs
ressortent positifs dans le diagnostic.

Comportement sans données TB (documenté) : 200 avec trends/seasonality vides,
sommaire à zéro, lifecycle « indéterminé », multiples par défaut 3x–5x et
latest_fiscal_year = année civile courante.
"""

import uuid
from datetime import datetime, timezone

import pytest

from app.models.company import Company, Division
from app.models.forecast_config import ForecastConfig
from app.models.standard_link_code import StandardLinkCode
from app.models.user import User, UserOrganization, UserRole
from app.utils.security import create_access_token


# ─── helpers ──────────────────────────────────────────────────────────────────


def _seed_diagnostic_link_codes(db):
    """Chart standard minimal avec de vraies familles (REV/CMV/…/ACT/ALT/…)."""
    codes = [
        ("REV-A.1", "REV", "Ventes produits"),
        ("REV-B.1", "REV", "Ventes services"),
        ("CMV-A.1", "CMV", "Coût des marchandises vendues"),
        ("EXP-A.1", "EXP", "Salaires"),
        ("EXP-A.2", "EXP", "Amortissement des immobilisations"),
        ("FIN-A.1", "FIN", "Intérêts sur la dette"),
        ("IMP-A.1", "IMP", "Impôts sur le revenu"),
        ("ACT-A.1", "ACT", "Encaisse"),
        ("ACT-B.1", "ACT", "Stocks"),
        ("ALT-A.1", "ALT", "Immobilisations corporelles"),
        ("PCT-A.1", "PCT", "Comptes fournisseurs"),
        ("PLT-A.1", "PLT", "Dette à long terme"),
        ("CAP-A.1", "CAP", "Capital-actions"),
    ]
    db.add_all([
        StandardLinkCode(
            code=code, family=family, is_leaf=True,
            label_account=label, sort_order=100 + i,
        )
        for i, (code, family, label) in enumerate(codes)
    ])
    db.commit()


def _create_company(client, auth_headers, name="Diag Co"):
    response = client.post(
        "/api/companies",
        json={"name": name, "fiscal_year_end": "12-31"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def _upsert_mappings(client, auth_headers, company_id):
    mappings = [
        {"account_number": "4000", "description": "Ventes produits", "link_code": "REV-A.1",
         "divisions": "Division Est", "product": "Produit A"},
        {"account_number": "4100", "description": "Ventes services", "link_code": "REV-B.1",
         "divisions": "Division Ouest", "product": "Service B"},
        {"account_number": "5000", "description": "CMV produits", "link_code": "CMV-A.1",
         "divisions": "Division Est", "product": "Produit A"},
        {"account_number": "5100", "description": "CMV services", "link_code": "CMV-A.1",
         "divisions": "Division Ouest", "product": "Service B"},
        {"account_number": "6000", "description": "Salaires", "link_code": "EXP-A.1"},
        {"account_number": "6100", "description": "Amortissement", "link_code": "EXP-A.2",
         "amortization": True},
        {"account_number": "7000", "description": "Intérêts", "link_code": "FIN-A.1",
         "interests": True},
        {"account_number": "8000", "description": "Impôts", "link_code": "IMP-A.1"},
        {"account_number": "1000", "description": "Encaisse", "link_code": "ACT-A.1"},
        {"account_number": "1200", "description": "Stocks", "link_code": "ACT-B.1"},
        {"account_number": "1500", "description": "Immobilisations", "link_code": "ALT-A.1"},
        {"account_number": "2000", "description": "Fournisseurs", "link_code": "PCT-A.1"},
        {"account_number": "2500", "description": "Dette long terme", "link_code": "PLT-A.1"},
        {"account_number": "3000", "description": "Capital-actions", "link_code": "CAP-A.1"},
    ]
    response = client.put(
        f"/api/companies/{company_id}/account-mappings",
        json=mappings,
        headers=auth_headers,
    )
    assert response.status_code == 200


def _seed_fiscal_year(client, auth_headers, company_id, fiscal_year, factor, balance):
    """IS en janvier (facteur de croissance), bilan de clôture en décembre."""
    entries = [
        {"account_number": "4000", "description": "Ventes produits",
         "monthly_amounts": {"Janvier": -60000.0 * factor}},
        {"account_number": "4100", "description": "Ventes services",
         "monthly_amounts": {"Janvier": -40000.0 * factor}},
        {"account_number": "5000", "description": "CMV produits",
         "monthly_amounts": {"Janvier": 30000.0 * factor}},
        {"account_number": "5100", "description": "CMV services",
         "monthly_amounts": {"Janvier": 10000.0 * factor}},
        {"account_number": "6000", "description": "Salaires",
         "monthly_amounts": {"Janvier": 20000.0 * factor}},
        {"account_number": "6100", "description": "Amortissement",
         "monthly_amounts": {"Janvier": 5000.0}},
        {"account_number": "7000", "description": "Intérêts",
         "monthly_amounts": {"Janvier": 2000.0}},
        {"account_number": "8000", "description": "Impôts",
         "monthly_amounts": {"Janvier": 3000.0}},
        {"account_number": "1000", "description": "Encaisse",
         "monthly_amounts": {"Décembre": balance["cash"]}},
        {"account_number": "1200", "description": "Stocks",
         "monthly_amounts": {"Décembre": balance["inventory"]}},
        {"account_number": "1500", "description": "Immobilisations",
         "monthly_amounts": {"Décembre": balance["fixed_assets"]}},
        {"account_number": "2000", "description": "Fournisseurs",
         "monthly_amounts": {"Décembre": -balance["payables"]}},
        {"account_number": "2500", "description": "Dette long terme",
         "monthly_amounts": {"Décembre": -balance["debt"]}},
    ]
    response = client.put(
        f"/api/companies/{company_id}/trial-balance?fiscal_year={fiscal_year}",
        json=entries,
        headers=auth_headers,
    )
    assert response.status_code == 200


def _setup_full_company(client, auth_headers, db):
    """3 exercices (2022-2024, croissance 10 %/an), 2 divisions, 2 produits."""
    _seed_diagnostic_link_codes(db)
    company_id = _create_company(client, auth_headers)
    _upsert_mappings(client, auth_headers, company_id)

    _seed_fiscal_year(client, auth_headers, company_id, 2022, 1.0, {
        "cash": 12000.0, "inventory": 6000.0, "fixed_assets": 40000.0,
        "payables": 10000.0, "debt": 30000.0,
    })
    _seed_fiscal_year(client, auth_headers, company_id, 2023, 1.1, {
        "cash": 15000.0, "inventory": 8000.0, "fixed_assets": 45000.0,
        "payables": 12000.0, "debt": 28000.0,
    })
    _seed_fiscal_year(client, auth_headers, company_id, 2024, 1.21, {
        "cash": 20000.0, "inventory": 10000.0, "fixed_assets": 50000.0,
        "payables": 15000.0, "debt": 25000.0,
    })

    cid = uuid.UUID(company_id)
    db.add_all([
        Division(company_id=cid, name="Division Est"),
        Division(company_id=cid, name="Division Ouest"),
    ])
    db.commit()
    return company_id


def _get_diagnostic(client, headers, company_id):
    return client.get(f"/api/companies/{company_id}/diagnostic", headers=headers)


# ─── (a) happy path ───────────────────────────────────────────────────────────


def test_diagnostic_happy_path_trends_and_summary(client, auth_headers, db):
    company_id = _setup_full_company(client, auth_headers, db)

    response = _get_diagnostic(client, auth_headers, company_id)
    assert response.status_code == 200
    data = response.json()

    assert data["company_id"] == company_id
    assert data["latest_fiscal_year"] == 2024
    assert data["currency"] == "CAD"
    assert data["generated_at"]

    # Tendances : 3 exercices, ordre croissant
    trends = data["trends"]
    assert [t["fiscal_year"] for t in trends] == [2022, 2023, 2024]
    assert trends[0]["revenue"] == pytest.approx(100000.0)
    assert trends[1]["revenue"] == pytest.approx(110000.0)

    latest = trends[2]
    assert latest["revenue"] == pytest.approx(121000.0)
    assert latest["gross_profit"] == pytest.approx(72600.0)
    assert latest["gross_margin_pct"] == pytest.approx(60.0)
    assert latest["ebitda"] == pytest.approx(48400.0)
    assert latest["ebitda_margin_pct"] == pytest.approx(40.0)
    assert latest["net_income"] == pytest.approx(38400.0)
    assert latest["net_margin_pct"] == pytest.approx(31.74)
    assert latest["depreciation"] == pytest.approx(5000.0)

    # Bilan 2024
    assert latest["current_assets"] == pytest.approx(30000.0)
    assert latest["inventory"] == pytest.approx(10000.0)
    assert latest["current_liabilities"] == pytest.approx(15000.0)
    assert latest["total_assets"] == pytest.approx(80000.0)
    assert latest["total_liabilities"] == pytest.approx(40000.0)
    assert latest["equity"] == pytest.approx(40000.0)

    # Ratios 2024
    assert latest["current_ratio"] == pytest.approx(2.0)
    assert latest["quick_ratio"] == pytest.approx(1.33)
    assert latest["debt_to_equity"] == pytest.approx(1.0)
    assert latest["asset_turnover"] == pytest.approx(1.51)
    # EBIT / intérêts = (38400 + 2000 + 3000) / 2000
    assert latest["interest_coverage"] == pytest.approx(21.7)

    # Capex = Δ immobilisations nettes + amortissement ; 0 pour le 1er exercice
    assert trends[0]["capex"] == pytest.approx(0.0)
    assert trends[1]["capex"] == pytest.approx(10000.0)
    assert trends[2]["capex"] == pytest.approx(10000.0)

    # Sommaire
    summary = data["summary"]
    assert summary["latest_fiscal_year"] == 2024
    assert summary["revenue_cagr_5y"] == pytest.approx(10.0)
    assert summary["lifecycle_stage"] == "croissance"
    assert summary["latest_revenue"] == pytest.approx(121000.0)
    assert summary["latest_ebitda"] == pytest.approx(48400.0)
    assert summary["latest_net_income"] == pytest.approx(38400.0)
    assert summary["capex_latest"] == pytest.approx(10000.0)
    assert summary["capex_revenue_pct"] == pytest.approx(8.26)


def test_diagnostic_seasonality(client, auth_headers, db):
    company_id = _setup_full_company(client, auth_headers, db)

    data = _get_diagnostic(client, auth_headers, company_id).json()
    seasonality = data["seasonality"]
    assert len(seasonality) == 12

    january = seasonality[0]
    assert january["month_number"] == 1
    assert january["month_label"] == "Jan"
    # Moyenne des revenus de janvier sur 3 ans : (100000 + 110000 + 121000) / 3
    assert january["average_revenue"] == pytest.approx(110333.33)
    assert january["average_ebitda"] == pytest.approx(44133.33)
    assert january["revenue_share_pct"] == pytest.approx(100.0)
    assert january["ebitda_margin_pct"] == pytest.approx(40.0)

    # Aucune activité les autres mois
    for month in seasonality[1:]:
        assert month["average_revenue"] == pytest.approx(0.0)
        assert month["revenue_share_pct"] == pytest.approx(0.0)


def test_diagnostic_divisions_and_products(client, auth_headers, db):
    company_id = _setup_full_company(client, auth_headers, db)

    data = _get_diagnostic(client, auth_headers, company_id).json()

    # Divisions (ordre alphabétique)
    divisions = data["divisions"]
    assert [d["division_name"] for d in divisions] == ["Division Est", "Division Ouest"]
    est = divisions[0]
    assert est["revenue"] == pytest.approx(72600.0)
    assert est["gross_profit"] == pytest.approx(36300.0)
    assert est["net_income"] == pytest.approx(36300.0)
    assert est["revenue_share_pct"] == pytest.approx(60.0)
    assert est["revenue_cagr_5y"] == pytest.approx(10.0)
    assert est["profitable"] is True
    ouest = divisions[1]
    assert ouest["revenue"] == pytest.approx(48400.0)
    assert ouest["revenue_share_pct"] == pytest.approx(40.0)

    # Produits-services (jetons du champ AccountMapping.product)
    products = data["products"]
    assert [p["product_name"] for p in products] == ["Produit A", "Service B"]
    produit_a = products[0]
    assert produit_a["revenue"] == pytest.approx(72600.0)
    assert produit_a["gross_profit"] == pytest.approx(36300.0)
    assert produit_a["revenue_share_pct"] == pytest.approx(60.0)

    # Paires (division, produit) à revenu non nul uniquement
    pairs = {
        (dp["division_name"], dp["product_name"]): dp["revenue"]
        for dp in data["division_products"]
    }
    assert pairs == {
        ("Division Est", "Produit A"): pytest.approx(72600.0),
        ("Division Ouest", "Service B"): pytest.approx(48400.0),
    }


def test_diagnostic_valuation_defaults(client, auth_headers, db):
    company_id = _setup_full_company(client, auth_headers, db)

    data = _get_diagnostic(client, auth_headers, company_id).json()
    valuation = data["valuation"]

    # Moyenne pondérée 3/2/1 : (3×48400 + 2×44000 + 1×40000) / 6
    assert valuation["normalized_ebitda"] == pytest.approx(45533.33)
    assert valuation["multiple_low"] == pytest.approx(3.0)
    assert valuation["multiple_high"] == pytest.approx(5.0)
    assert valuation["enterprise_value_low"] == pytest.approx(136600.0)
    assert valuation["enterprise_value_high"] == pytest.approx(227666.67)
    assert valuation["enterprise_value_mid"] == pytest.approx(182133.33)
    assert valuation["book_equity"] == pytest.approx(40000.0)
    # Note « multiples par défaut » présente dans le rationale
    assert any("défaut" in r for r in valuation["rationale"])
    # Avertissement indicatif dans les notes
    assert any("indicatif" in n for n in data["notes"])
    assert data["summary"]["indicative_enterprise_value_mid"] == pytest.approx(182133.33)


def test_diagnostic_valuation_uses_ebitda_multiple_config(client, auth_headers, db):
    company_id = _setup_full_company(client, auth_headers, db)

    company = db.query(Company).filter(Company.id == uuid.UUID(company_id)).first()
    db.add(ForecastConfig(
        organization_id=company.organization_id,
        company_id=company.id,
        config_type="ebitda_multiple",
        data={"low": 4.0, "high": 6.0},
    ))
    db.commit()

    valuation = _get_diagnostic(client, auth_headers, company_id).json()["valuation"]
    assert valuation["multiple_low"] == pytest.approx(4.0)
    assert valuation["multiple_high"] == pytest.approx(6.0)
    assert valuation["enterprise_value_mid"] == pytest.approx(45533.33 * 5.0, rel=1e-4)
    assert any("configuration" in r for r in valuation["rationale"])


# ─── (b) entreprise sans données ─────────────────────────────────────────────


def test_diagnostic_company_without_data_returns_empty_schema_valid(client, auth_headers, db):
    _seed_diagnostic_link_codes(db)
    company_id = _create_company(client, auth_headers, name="Empty Co")

    response = _get_diagnostic(client, auth_headers, company_id)
    assert response.status_code == 200
    data = response.json()

    assert data["trends"] == []
    assert data["seasonality"] == []
    assert data["divisions"] == []
    assert data["products"] == []
    assert data["division_products"] == []
    assert data["latest_fiscal_year"] == datetime.now(timezone.utc).year

    summary = data["summary"]
    assert summary["latest_revenue"] == 0.0
    assert summary["latest_ebitda"] == 0.0
    assert summary["revenue_cagr_5y"] is None
    assert summary["lifecycle_stage"] == "indéterminé"

    valuation = data["valuation"]
    assert valuation["normalized_ebitda"] == 0.0
    assert valuation["multiple_low"] == pytest.approx(3.0)
    assert valuation["multiple_high"] == pytest.approx(5.0)
    assert valuation["enterprise_value_mid"] == 0.0

    assert any("Aucune donnée" in n for n in data["notes"])


# ─── (c) contrôle d'accès inter-organisations ────────────────────────────────


def test_diagnostic_other_org_user_gets_404(client, auth_headers, db):
    _seed_diagnostic_link_codes(db)
    company_id = _create_company(client, auth_headers)

    other = client.post(
        "/api/auth/register",
        json={
            "email": "intrus@example.com",
            "password": "TestPassword123",
            "full_name": "Autre Org",
            "organization_name": "Other Org",
        },
    ).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    response = _get_diagnostic(client, other_headers, company_id)
    assert response.status_code == 404


# ─── (d) le rôle viewer peut lire ────────────────────────────────────────────


def test_diagnostic_viewer_can_read(client, auth_headers, db):
    _seed_diagnostic_link_codes(db)
    company_id = _create_company(client, auth_headers)

    company = db.query(Company).filter(Company.id == uuid.UUID(company_id)).first()
    viewer = User(
        email="viewer@example.com",
        hashed_password="x",
        full_name="Viewer",
        is_active=True,
    )
    db.add(viewer)
    db.commit()
    db.add(UserOrganization(
        user_id=viewer.id,
        organization_id=company.organization_id,
        role=UserRole.VIEWER,
        all_companies=True,
    ))
    db.commit()
    viewer_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': str(viewer.id)})}"
    }

    response = _get_diagnostic(client, viewer_headers, company_id)
    assert response.status_code == 200
    assert response.json()["company_id"] == company_id
