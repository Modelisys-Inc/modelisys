import type React from "react"
import type { Metadata } from "next"

/** Évite qu’un cache intermédiaire serve une vieille version de la page contact. */
export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Contact | Modelisys",
  description:
    "Écrivez à Modelisys pour démarrer un accompagnement financier fractionnaire ou prendre rendez-vous.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Modelisys",
    description:
      "Accompagnement, rendez-vous et questions : écrivez à l’équipe Modelisys.",
    url: "/contact",
  },
}

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
