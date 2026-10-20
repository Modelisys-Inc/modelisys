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
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/etudes-de-cas",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/services/mandats-ponctuels",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/services/services-conseils",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/login",
        destination: "/",
        permanent: true,
      },
      {
        source: "/mon-portail",
        destination: "/",
        permanent: true,
      },
      {
        source: "/forgot-password",
        destination: "/",
        permanent: true,
      },
      {
        source: "/reset-password",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tarification",
        destination: "/",
        permanent: true,
      },
      {
        source: "/cabinets-comptables",
        destination: "/",
        permanent: true,
      },
      {
        source: "/partenaires-financiers",
        destination: "/",
        permanent: true,
      },
      {
        source: "/partenaires-institutionnels",
        destination: "/",
        permanent: true,
      },
      {
        source: "/partenaires-capital",
        destination: "/",
        permanent: true,
      },
      {
        source: "/clause-de-non-responsabilite",
        destination: "/",
        permanent: true,
      },
    ]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  turbopack: {
    root: __dirname,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

export default nextConfig
