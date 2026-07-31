"use client"

import { Fragment, Suspense } from "react"
import { Book, Settings, LogOut, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useCompanies } from "@/hooks/use-companies"
import { logout } from "@/lib/api"
import { isFinancialStatementPath } from "@/hooks/use-financial-statement-reference-date"
import { FinancialStatementReferenceControls } from "@/components/financial-statement-reference-controls"
import { companyDashboardNavItem, companyModuleNavItems } from "@/lib/company-module-navigation"

interface DashboardHeaderProps {
  title?: string
  description?: string
}

const defaultNavigationItems = [
  { label: "Outils financiers", href: "/dashboard" },
  { label: "Reporting financier", href: "/financial-statements/income-statement" },
  { label: "Analyse", href: "/analysis/working-capital" },
  { label: "Projections", href: "/projections" },
  { label: "Valorisation", href: "/evaluation/business-model" },
  { label: "Documentation", href: "/year-end-cpa" },
  { label: "Configuration", href: "/settings/companies" },
]

/** Menu affiché lorsqu'une société est sélectionnée (pages outils masquées du menu principal). */
const companyNavigationItems = [
  companyDashboardNavItem,
  ...companyModuleNavItems,
  { label: "Outils financiers", href: "/dashboard" },
  { label: "Configuration", href: "/settings/companies" },
]

const portalNavigationItems = [
  { label: "Mon portail", href: "/mon-portail" },
  { label: "Formation", href: "/formation" },
  { label: "Ressources", href: "/resources" },
  { label: "Paramètres", href: "/settings" },
  { label: "Support", href: "/contact" },
]

type NavItem = { label: string; href: string }

function NavVerticalSeparator() {
  return <div className="mx-2 h-6 w-px shrink-0 bg-white/10" aria-hidden />
}

function PhaseJourneyArrow() {
  return <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-[#E0742D]/75" strokeWidth={2.25} aria-hidden />
}

function getNavItemActive(pathname: string | null, item: NavItem): boolean {
  const itemPath = item.href.split("?")[0]
  if (item.label === "Mon portail") return pathname?.startsWith("/mon-portail") || false
  if (item.label === "Formation") return pathname?.startsWith("/formation") || false
  if (item.label === "Ressources") return pathname?.startsWith("/resources") || false
  if (item.label === "Paramètres") return pathname?.startsWith("/settings") || false
  if (item.label === "Support") return pathname?.startsWith("/contact") || false
  if (item.label === "Tableau de bord") return pathname?.startsWith("/tableau-de-bord") || false
  if (item.label === "Diagnostic") return pathname?.startsWith("/modules/diagnostic") || false
  if (item.label === "Outils financiers") return pathname === "/dashboard"
  if (item.label === "Configuration") return pathname?.startsWith("/settings/companies") || false
  if (item.label === "Reporting financier") return pathname?.startsWith("/financial-statements") || false
  if (item.label === "Analyse") return pathname?.startsWith("/analysis") || false
  if (item.label === "Projections") return pathname?.startsWith("/projections") || false
  if (item.label === "Valorisation") return pathname?.startsWith("/evaluation") || false
  return pathname?.startsWith(itemPath) || false
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const isActive = getNavItemActive(pathname, item)
  return (
    <Link
      href={item.href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? "text-slate-200" : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
      }`}
    >
      {item.label}
    </Link>
  )
}

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
      ? [{ label: "Mon portail", href: "/mon-portail" }, ...companyNavigationItems]
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
  const showCompanyTrajectoryNav = Boolean(selectedCompanyId && !isPortalHeader)
  const companyNavItems = showCompanyTrajectoryNav
    ? navigationItems.filter((item) => item.label !== "Mon portail")
    : []
  const monPortailItem = showCompanyTrajectoryNav
    ? navigationItems.find((item) => item.label === "Mon portail")
    : null
  const companyDashboardItem = companyNavItems.find((item) => item.label === "Tableau de bord")
  const companyPhaseItems = companyNavItems.filter((item) =>
    companyModuleNavItems.some((module) => module.label === item.label),
  )
  const companyToolsItem = companyNavItems.find((item) => item.label === "Outils financiers")
  const companyConfigItem = companyNavItems.find((item) => item.label === "Configuration")

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
            {showCompanyTrajectoryNav && monPortailItem && companyDashboardItem && companyToolsItem && companyConfigItem ? (
              <>
                <NavLink item={monPortailItem} pathname={pathname} />
                <NavVerticalSeparator />
                <NavLink item={companyDashboardItem} pathname={pathname} />
                {companyPhaseItems.map((item, index) => (
                  <Fragment key={`${item.label}-${item.href}`}>
                    {index > 0 ? <PhaseJourneyArrow /> : null}
                    <NavLink item={item} pathname={pathname} />
                  </Fragment>
                ))}
                <NavVerticalSeparator />
                <NavLink item={companyToolsItem} pathname={pathname} />
                <NavLink item={companyConfigItem} pathname={pathname} />
              </>
            ) : (
              navigationItems.map((item) => {
                const isActive = getNavItemActive(pathname, item)
                const isLastBeforeConfig = isPortalHeader
                  ? item.label === "Ressources"
                  : item.label === "Documentation"
                return (
                  <Fragment key={`${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-slate-200"
                          : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {isLastBeforeConfig ? <NavVerticalSeparator /> : null}
                  </Fragment>
                )
              })
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
