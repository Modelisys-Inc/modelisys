import type React from "react"

/** Évite qu’un cache intermédiaire serve une vieille version de la page contact. */
export const dynamic = "force-dynamic"
export const revalidate = 0

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
