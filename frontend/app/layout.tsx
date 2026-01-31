import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Dashboard comptable",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <main className="min-h-screen bg-background">{children}</main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
