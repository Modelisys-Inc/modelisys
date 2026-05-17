import path from "node:path"
import { fileURLToPath } from "node:url"

/** Répertoire du package frontend (évite qu’un lockfile parent fasse inférer une mauvaise racine → routes 404). */
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy API requests to the backend — avoids CORS issues (Firefox, etc.)
  // INTERNAL_API_URL is for server-side (container-to-container via Docker network).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:8000"}/api/:path*`,
      },
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
