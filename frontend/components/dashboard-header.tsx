"use client"

import { Fragment } from "react"
import { User, Book, Settings, LogOut, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { logout } from "@/lib/api"

interface DashboardHeaderProps {
  title?: string
  description?: string
}

  const navigationItems = [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "États financiers", href: "/financial-statements/income-statement" },
    { label: "Analyse", href: "/analysis/working-capital" },
    { label: "Projections", href: "/projections/pro-forma" },
    { label: "Évaluation", href: "/evaluation/business-model" },
    { label: "Fin d'année CPA", href: "/year-end-cpa" },
    { label: "Configuration", href: "/settings/companies" },
  ]

export function DashboardHeader({ title = "Gestion Comptable", description }: DashboardHeaderProps) {
  const { user } = useUser()
  const userName = user?.user.full_name ?? ""
  const pathname = usePathname()
  const router = useRouter()

  return (
    <header className="border-b border-slate-700 bg-slate-900 w-full shadow-sm">
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-3">
              {title === "Modelisys" && (
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/30">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                {description && <p className="text-sm text-slate-300">{description}</p>}
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navigationItems.map((item, index) => {
                // Pour la page d'accueil, on vérifie l'égalité exacte
                // Pour "États financiers", on vérifie si le pathname commence par /financial-statements
                // Pour "Projections", on vérifie si le pathname commence par /projections
                // Pour les autres, on vérifie si le pathname commence par le href
                let isActive
                if (item.label === "Configuration") {
                  isActive = pathname?.startsWith("/settings/companies") || false
                } else if (item.label === "États financiers") {
                  isActive = pathname?.startsWith("/financial-statements") || false
                } else if (item.label === "Analyse") {
                  isActive = pathname?.startsWith("/analysis") || false
                } else if (item.label === "Projections") {
                  isActive = pathname?.startsWith("/projections") || false
                } else if (item.label === "Évaluation") {
                  isActive = pathname?.startsWith("/evaluation") || false
                } else {
                  isActive = pathname?.startsWith(item.href) || false
                }
                const isLastBeforeConfig = item.label === "Fin d'année CPA"
                return (
                  <Fragment key={item.href}>
                    <Link
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {isLastBeforeConfig && (
                      <div className="h-6 w-px bg-slate-700 mx-2"></div>
                    )}
                  </Fragment>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/resources"
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Ressources"
            >
              <Book className="w-5 h-5 text-slate-300 hover:text-white" />
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Paramètres"
            >
              <Settings className="w-5 h-5 text-slate-300 hover:text-white" />
            </Link>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <User className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium text-slate-200">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg hover:bg-slate-800 text-slate-300 group"
              onClick={() => {
                logout()
                router.push("/login")
              }}
              aria-label="Déconnexion"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
