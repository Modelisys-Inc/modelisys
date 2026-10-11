// Marketing site: pages opt into static where useful; public layout indexes itself.
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
  title: "Modelisys — Gestion et Création de valeur pour les PME",
  description:
    "Modelisys accompagne les PME à comprendre leur performance financière, anticiper leur trésorerie, mesurer leurs décisions et augmenter la valeur de leur entreprise.",
  applicationName: "Modelisys",
  authors: [{ name: "Modelisys" }],
  creator: "Modelisys",
  publisher: "Modelisys",
  keywords: [
    "accompagnement financier",
    "création de valeur",
    "PME",
    "valorisation",
    "projections financières",
    "cabinet de consultation",
    "gestion financière",
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
    title: "Modelisys — Gestion et Création de valeur pour les PME",
    description:
      "Modelisys accompagne les PME à comprendre leur performance financière, anticiper leur trésorerie, mesurer leurs décisions et augmenter la valeur de leur entreprise.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modelisys — Gestion et Création de valeur pour les PME",
    description:
      "Modelisys accompagne les PME à comprendre leur performance financière, anticiper leur trésorerie, mesurer leurs décisions et augmenter la valeur de leur entreprise.",
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
    "Modelisys accompagne les PME à comprendre leur performance financière, anticiper leur trésorerie, mesurer leurs décisions et augmenter la valeur de leur entreprise.",
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
