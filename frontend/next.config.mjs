import path from "node:path"
import { fileURLToPath } from "node:url"

/** Répertoire du package frontend (évite qu’un lockfile parent fasse inférer une mauvaise racine → routes 404). */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Racine explicite pour éviter que Next infère un mauvais workspace (routes /settings/... en 404 en dev Docker).
  outputFileTracingRoot: __dirname,
  // 37 type errors remain after the @types/react@19 bump (real bugs in
  // app pages — string literals outside ColumnMode union, missing JSX
  // namespace). Keep the safety net until those are fixed.
  typescript: {
    ignoreBuildErrors: true,
  },
  // 4 images total in /public (3 SVG + 1 JPG); standalone build on Alpine
  // would need sharp wired into the runner stage to make this worthwhile.
  // Revisit when there are real raster assets.
  images: {
    unoptimized: true,
  },
  // Proxy API requests to the backend — avoids CORS issues (Firefox, etc.)
  // INTERNAL_API_URL is for server-side (container-to-container via Docker network).
  async redirects() {
    return [
      {
        source: "/etudes-de-cas",
        destination: "/services",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ]
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ]
  },
  // Empêche Next d’utiliser un dossier parent (autre lockfile) comme racine workspace — sinon /settings/companies/... peut 404.
  turbopack: {
    root: __dirname,
  },
  // Docker + volume monté (Windows) : le file watcher natif échoue souvent ; le polling fiabilise le hot reload.
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      // Docker + volume Windows : la compilation des grosses routes (ex. pro-forma) peut
      // dépasser le délai par défaut du chargeur de chunks → ChunkLoadError (timeout).
      if (!isServer && config.output) {
        config.output.chunkLoadTimeout = 300_000
      }
    }
    return config
  },
}

export default nextConfig
