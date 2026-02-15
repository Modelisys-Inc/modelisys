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
