// This app is fully client-side (auth-gated SPA); disable static prerendering globally.
export const dynamic = "force-dynamic"

import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"
import { Providers } from "./providers"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://modelisys.com"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // No template: existing pages already include "| Modelisys" /
  // "| Blog Modelisys" in their title. Adding a template would double up.
  title: "Modelisys — Pilotage financier pour PME et cabinets comptables",
  description:
    "Modelisys structure la modélisation financière des PME : balance de vérification, états financiers, projections, valorisation et reporting consolidé pour cabinets comptables et partenaires financiers.",
  applicationName: "Modelisys",
  authors: [{ name: "Modelisys" }],
  creator: "Modelisys",
  publisher: "Modelisys",
  keywords: [
    "modélisation financière",
    "états financiers",
    "reporting financier",
    "cabinet comptable",
    "PME",
    "valorisation",
    "projections financières",
    "budget",
    "tableau de bord financier",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/images/modelisys-icon-white.svg",
  },
  openGraph: {
    type: "website",
    locale: "fr_CA",
    url: "/",
    siteName: "Modelisys",
    title: "Modelisys — Pilotage financier pour PME et cabinets comptables",
    description:
      "Plateforme de modélisation financière : balance, états financiers, projections, valorisation et reporting consolidé.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modelisys — Pilotage financier pour PME et cabinets comptables",
    description:
      "Modélisation financière, états financiers, projections et valorisation pour PME et cabinets comptables.",
  },
  // Default: noindex everything. The (public) layout and the landing page
  // override to allow indexing on marketing/legal pages.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Modelisys",
  url: SITE_URL,
  logo: `${SITE_URL}/images/modelisys-logo-noir.svg`,
  description:
    "Modelisys est une plateforme de modélisation financière pour PME et cabinets comptables : états financiers, projections, valorisation et reporting consolidé.",
  areaServed: "CA",
  knowsLanguage: ["fr-CA", "en-CA"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          <main className="min-h-screen bg-background">{children}</main>
        </Providers>
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Analytics />
      </body>
    </html>
  )
}
