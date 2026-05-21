import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe | Modelisys",
  description: "Définissez un nouveau mot de passe pour votre compte Modelisys.",
  robots: { index: false, follow: false },
}

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
