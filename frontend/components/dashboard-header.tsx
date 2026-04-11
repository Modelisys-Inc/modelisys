"use client"

import { Fragment, Suspense } from "react"
import { Book, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useCompanies } from "@/hooks/use-companies"
import { logout } from "@/lib/api"
import { isFinancialStatementPath } from "@/hooks/use-financial-statement-reference-date"
import { FinancialStatementReferenceControls } from "@/components/financial-statement-reference-controls"

interface DashboardHeaderProps {
  title?: string
  description?: string
}

const defaultNavigationItems = [
  { label: "Tableau de bord", href: "/dashboard" },
  { label: "États financiers", href: "/financial-statements/income-statement" },
  { label: "Analyse", href: "/analysis/working-capital" },
  { label: "Projections", href: "/projections/pro-forma" },
  { label: "Évaluation", href: "/evaluation/business-model" },
  { label: "Fin d'année CPA", href: "/year-end-cpa" },
  { label: "Configuration", href: "/settings/companies" },
]

const portalNavigationItems = [
  { label: "Mon portail", href: "/mon-portail" },
  { label: "Formation", href: "/formation" },
  { label: "Ressources", href: "/resources" },
  { label: "Paramètres", href: "/settings" },
  { label: "Support", href: "/contact" },
]

export function DashboardHeader({ title = "Gestion Comptable", description }: DashboardHeaderProps) {
  return (
    <Suspense fallback={<DashboardHeaderSkeleton />}>
      <DashboardHeaderInner title={title} description={description} />
    </Suspense>
  )
}

function DashboardHeaderSkeleton() {
  return (
    <header className="w-full border-b border-white/10 bg-[#2A2F3A]/92 backdrop-blur-md shadow-md">
      <div className="w-full border-b border-white/10 px-6 py-0.5 h-9" />
      <div className="w-full px-6 py-2 md:py-2.5 h-12" />
    </header>
  )
}

function DashboardHeaderInner({ title = "Gestion Comptable", description }: DashboardHeaderProps) {
  const { user } = useUser()
  const { companies } = useCompanies()
  const userName = user?.user.full_name ?? ""
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isPortalHeader = pathname?.startsWith("/mon-portail") || pathname?.startsWith("/formation") || false
  const queryCompanyId = searchParams.get("companyId")
  const companyIdFromPathMatch = pathname?.match(/^\/settings\/companies\/([^/]+)/)
  const companyIdFromPath = companyIdFromPathMatch?.[1] ?? null
  const selectedCompanyId = queryCompanyId || companyIdFromPath
  const activeCompanyName = selectedCompanyId
    ? companies.find((company) => company.id === selectedCompanyId)?.name
    : null
  const baseNavigationItems = isPortalHeader
    ? portalNavigationItems
    : selectedCompanyId
      ? [{ label: "Mon portail", href: "/mon-portail" }, ...defaultNavigationItems]
      : defaultNavigationItems

  const navigationItems = baseNavigationItems.map((item) => {
    if (!selectedCompanyId || isPortalHeader) return item
    if (item.label === "Configuration") {
      return {
        ...item,
        href: `/settings/companies/${selectedCompanyId}`,
      }
    }
    return {
      ...item,
      href: item.href.includes("?") ? `${item.href}&companyId=${selectedCompanyId}` : `${item.href}?companyId=${selectedCompanyId}`,
    }
  })

  const showFsRefInHeader = !isPortalHeader && isFinancialStatementPath(pathname)
  const fsRefCompanyId = selectedCompanyId ?? companies[0]?.id ?? null

  return (
    <header className="w-full border-b border-white/10 bg-[#2A2F3A]/92 backdrop-blur-md shadow-md">
      <div className="w-full border-b border-white/10 px-6 py-0.5">
        <div
          className={`flex min-h-0 items-center gap-2 ${showFsRefInHeader ? "justify-between" : "justify-end"}`}
        >
          {showFsRefInHeader && (
            <FinancialStatementReferenceControls variant="header" companyId={fsRefCompanyId} />
          )}
          <div className="flex shrink-0 items-center justify-end gap-2">
            {!isPortalHeader && (
              <Link
                href={selectedCompanyId ? `/dashboard?companyId=${selectedCompanyId}` : "/dashboard"}
                className="text-sm font-semibold leading-none tracking-tight text-[#E6D6C3] transition-colors hover:text-white"
              >
                modelisys<span className="text-[#E0742D]">.</span>
              </Link>
            )}
            {!isPortalHeader && (
              <span
                className="h-5 w-px shrink-0 bg-gradient-to-b from-[#E0742D]/80 via-white/15 to-transparent"
                aria-hidden
              />
            )}
            {!isPortalHeader && !selectedCompanyId && (
              <>
                <Link
                  href="/resources"
                  className="rounded-md p-2 transition-colors hover:bg-white/5"
                  aria-label="Ressources"
                >
                  <Book className="h-5 w-5 text-[#C9B8A5]/90 hover:text-[#E6D6C3]" />
                </Link>
                <Link
                  href="/settings"
                  className="rounded-md p-2 transition-colors hover:bg-white/5"
                  aria-label="Paramètres"
                >
                  <Settings className="h-5 w-5 text-[#C9B8A5]/90 hover:text-[#E6D6C3]" />
                </Link>
              </>
            )}
            <span className="text-xs font-medium text-[#E6D6C3]/90">{userName}</span>
            <Button
              variant="ghost"
              size="icon"
              className="group h-7 w-7 rounded-md text-[#C9B8A5]/90 hover:bg-white/5"
              onClick={() => {
                logout()
                router.push("/login")
              }}
              aria-label="Déconnexion"
            >
              <LogOut className="h-5 w-5 group-hover:text-[#E0742D]" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-2 md:py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {title === "Modelisys" && (
              <>
                {!isPortalHeader && activeCompanyName ? (
                  <span className="text-base md:text-lg font-semibold tracking-tight text-[#E6D6C3]">
                    {activeCompanyName}
                  </span>
                ) : (
                  <Link
                    href={selectedCompanyId ? `/dashboard?companyId=${selectedCompanyId}` : "/dashboard"}
                    className="hover:scale-105 transition-transform duration-200 cursor-pointer"
                  >
                    <span className="text-lg md:text-xl font-semibold tracking-tight text-[#E6D6C3]">
                      modelisys<span className="text-[#E0742D]">.</span>
                    </span>
                  </Link>
                )}
              </>
            )}
            {title !== "Modelisys" && (
              <div>
                <h2 className="text-xl font-semibold text-[#E6D6C3]">{title}</h2>
                {description && <p className="text-sm text-[#C9B8A5]/85">{description}</p>}
              </div>
            )}
          </div>
          <span
            className="hidden md:block h-7 w-px shrink-0 bg-gradient-to-b from-[#E0742D]/80 via-white/15 to-transparent"
            aria-hidden
          />
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => {
              const itemPath = item.href.split("?")[0]
              let isActive
              if (item.label === "Mon portail") {
                isActive = pathname?.startsWith("/mon-portail") || false
              } else if (item.label === "Formation") {
                isActive = pathname?.startsWith("/formation") || false
              } else if (item.label === "Ressources") {
                isActive = pathname?.startsWith("/resources") || false
              } else if (item.label === "Paramètres") {
                isActive = pathname?.startsWith("/settings") || false
              } else if (item.label === "Support") {
                isActive = pathname?.startsWith("/contact") || false
              } else if (item.label === "Configuration") {
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
                isActive = pathname?.startsWith(itemPath) || false
              }
              const isLastBeforeConfig = isPortalHeader ? item.label === "Ressources" : item.label === "Fin d'année CPA"
              return (
                <Fragment key={item.href}>
                  <Link
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-slate-200"
                        : "text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                  {isLastBeforeConfig && (
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                  )}
                </Fragment>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
