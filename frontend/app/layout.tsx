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
  title: "Modelisys — Accompagnement financier fractionnaire",
  description:
    "Accompagnement financier fractionnaire pour les propriétaires de PME. Modelisys aide à mieux lire la comptabilité, isoler les leviers de valeur et décider au rythme de l’entreprise.",
  applicationName: "Modelisys",
  authors: [{ name: "Modelisys" }],
  creator: "Modelisys",
  publisher: "Modelisys",
  keywords: [
    "accompagnement financier fractionnaire",
    "création de valeur",
    "valeur d'entreprise",
    "PME",
    "dirigeants",
    "valorisation",
    "lecture de la comptabilité",
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
    title: "Modelisys — Accompagnement financier fractionnaire",
    description:
      "Accompagnement financier fractionnaire pour les propriétaires de PME. Mieux lire la comptabilité, isoler les leviers de valeur et décider au rythme de l’entreprise.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modelisys — Accompagnement financier fractionnaire",
    description:
      "Accompagnement financier fractionnaire pour les propriétaires de PME. Mieux lire la comptabilité, isoler les leviers de valeur et décider au rythme de l’entreprise.",
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
    "Accompagnement financier fractionnaire pour les propriétaires de PME. Modelisys aide à mieux lire la comptabilité, isoler les leviers de valeur et décider au rythme de l’entreprise.",
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
