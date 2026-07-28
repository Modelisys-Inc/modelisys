# Comptabilité de démonstration — Groupe Industriel Laurentien inc.

Jeu de données fictif mais comptablement cohérent pour tester Modelisys de bout
en bout (états financiers, analyses, page Diagnostic) :

- **5 exercices** (2021–2025), 60 mois de balance de vérification **cumulative**
  (YTD, comme un export QuickBooks), équilibrée à 0,00 $ chaque mois.
- **Profil** : croissance ~10,5 %/an (12,4 M$ → 18,5 M$), marge EBITDA en
  progression (10,8 % → 15,9 %), saisonnalité estivale (pointe en juillet,
  creux en décembre).
- **3 divisions** : Fabrication, Distribution, et Services techniques
  (**déficitaire**, pour tester les signaux d'alerte).
- **4 produits/services** avec marges distinctes (42 % / 38 % / 34 % / 30 %).
- **Bilan complet** : encaisse, clients (~45 j), stocks, immobilisations avec
  capex annuel croissant et amortissement, dette LT qui s'amortit, BNR
  cohérents avec les bénéfices accumulés.
- 48 comptes GL mappés sur le plan standard (REV/CMV/EXP/ADM/VNT/FIN/IMP +
  bilan), avec divisions, produits, drapeaux amortissement/intérêts.

## Option A — Seed automatique (recommandé)

Docker démarré (`docker-compose up`), puis :

```bash
python data/demo/generate_demo_company.py seed
```

Crée la société « Groupe Industriel Laurentien inc. (démo) » (divisions,
produits, mappings, import des 60 mois) via l'API locale avec le compte
`test@test.com` / `password` (surcharger via `MODELISYS_API`,
`MODELISYS_EMAIL`, `MODELISYS_PASSWORD`). Refuse de re-seeder si la société
existe déjà — la supprimer d'abord dans Configuration → Entreprises.

## Option B — Import manuel par l'interface

1. `python data/demo/generate_demo_company.py generate` (produit les fichiers).
2. Créer une société (fin d'exercice 31-12, CAD, **BV cumulative activée**)
   avec les divisions Fabrication / Distribution / Services techniques.
3. Saisir les mappings selon `mappings-groupe-laurentien.csv`
   (page « Code de liaison » : compte, code, division, produit, drapeaux).
4. Balance de vérification → import multi-mois :
   `bv-groupe-laurentien-2021-2025.xlsx`, début **Janvier 2021**, **60 mois**.

## Fichiers

| Fichier | Rôle |
|---|---|
| `generate_demo_company.py` | Générateur (déterministe) + seeder API |
| `bv-groupe-laurentien-2021-2025.xlsx` | BV 60 mois, format d'import multi-mois |
| `mappings-groupe-laurentien.csv` | Référence des mappings (48 comptes) |

## Ce que tu devrais voir (page Diagnostic)

Badge **Croissance** (TCAC 10,5 %) ; CA 2025 : 18 500 000 $ ; EBITDA
2 948 250 $ (15,9 %) ; BN 1 388 845 $ ; Services techniques signalée
**déficitaire** ; pointe de saisonnalité en **juillet** (~11 % du CA annuel) ;
capex 940 000 $ en 2025 (5,1 % du CA) ; VE indicative ~7,9–13,1 M$ (multiples
par défaut 3–5×).

Note : au niveau des divisions, EBITDA = bénéfice net car les frais
d'administration, de vente, financiers et l'amortissement ne sont pas rattachés
à une division (coûts partagés) — comportement voulu.
