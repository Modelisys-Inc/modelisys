# Modelisys

Site vitrine / landing page (firme de création de valeur). Pas de Portail client, pas de backend hébergé dans ce dépôt.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4 / Radix UI (shadcn)
- **Testing:** Playwright (e2e marketing)
- **Package Manager:** pnpm
- **Infra:** Docker Compose (frontend) · Azure Container Apps (`modelisys-frontend`)

## Project Structure

```
frontend/
  app/                 # App Router — pages marketing sous (public)/ + /
  (public)/            # a-propos, services, tarification, blog, contact, partenaires…
  components/          # Sections landing + ui/
  lib/                 # Contenu marketing (services-*, approche-*, blog-posts, hero-*)
  e2e/                 # Playwright : navigation, landing-approche, services, seo
  middleware.ts        # www → apex (pas de gate auth)
```

## Running

```bash
docker-compose up
# ou
cd frontend && pnpm install && pnpm dev
```

Port 3000. Pas d’API.

## Tests

```bash
cd frontend
pnpm test:e2e
```

## Conventions

- Pages marketing en français ; contenu éditorial dans `lib/*-content.ts` / `lib/blog-posts.ts`
- Styling : Tailwind ; slate neutrals, emerald accents
- Nav / footer : pas de « Mon Portail » ; CTAs vers contact / services
- Redirects permanents dans `next.config.mjs` pour `/login`, `/mon-portail`, `/forgot-password`, `/reset-password` → `/`

## CI/CD

- Workflow : `.github/workflows/deploy.yml` — test build frontend → image Docker → ACR → Container App frontend
- Domaines : `modelisys.com` / `www.modelisys.com` (www 301 vers apex)

## Git

- Branch principale : `main`
- Branche vitrine lean : `Landing_Page`
