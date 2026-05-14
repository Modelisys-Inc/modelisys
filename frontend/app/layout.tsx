// This app is fully client-side (auth-gated SPA); disable static prerendering globally.
export const dynamic = "force-dynamic"

import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Dashboard comptable",
  generator: "v0.app",
  icons: {
    icon: "/images/modelisys-icon-white.svg",
  },
  // Default: noindex everything. The (public) layout and the landing page
  // override to allow indexing on marketing/legal pages.
  robots: { index: false, follow: false },
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
        <Analytics />
      </body>
    </html>
  )
}
