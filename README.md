# Modelisys

Site vitrine / landing page pour Modelisys — firme de création de valeur (accompagnement, licence, développement).

Pas de Portail client ni d’API backend dans ce dépôt : uniquement le site marketing Next.js.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4
- **Testing:** Playwright (e2e marketing)
- **Package Manager:** pnpm
- **Infra:** Docker Compose (frontend only) · Azure Container Apps (frontend)

## Structure

```
frontend/
  app/                 # Pages marketing (landing, services, blog, contact…)
  components/          # Sections vitrine + ui (shadcn)
  lib/                 # Contenu marketing (services, approche, blog…)
  e2e/                 # Playwright — navigation, SEO, services
  middleware.ts        # www → apex uniquement
```

## Lancer le site

```bash
# Docker
docker-compose up

# Ou localement
cd frontend
pnpm install
pnpm dev
```

Site : http://localhost:3000

## Tests

```bash
cd frontend
pnpm test:e2e
```

## Déploiement

GitHub Actions (`.github/workflows/deploy.yml`) : build frontend → push ACR → update `modelisys-frontend`.

Les anciennes URLs Portail (`/login`, `/mon-portail`, etc.) redirigent vers `/`.
