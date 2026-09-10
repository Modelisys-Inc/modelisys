"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  COMPANY_REPORT_NAV_ITEMS,
  COMPANY_REPORT_OVERVIEW_HREF,
  appendReportNavHref,
  isReportNavLinkActive,
  isReportNavPath,
} from "@/lib/company-module-navigation"
import { cn } from "@/lib/utils"

interface ReportNavDropdownProps {
  pathname: string | null
  companyId?: string | null
  className?: string
}

export function ReportNavDropdown({ pathname, companyId, className }: ReportNavDropdownProps) {
  const isActive = isReportNavPath(pathname)
  const overviewHref = appendReportNavHref(COMPANY_REPORT_OVERVIEW_HREF, { companyId })

  return (
    <div
      className={cn("group relative", className)}
      data-testid="report-nav"
    >
      <Link
        href={overviewHref}
        data-testid="report-nav-trigger"
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-200" : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
        )}
      >
        Rapport
        <ChevronDown
          className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:rotate-180"
          aria-hidden
        />
      </Link>

      <div
        role="menu"
        data-testid="report-nav-menu"
        className="pointer-events-none absolute left-0 top-full z-[100] hidden pt-2 group-hover:pointer-events-auto group-hover:block"
      >
        <div className="min-w-[12rem] rounded-xl border border-white/10 bg-[#2A2F3A] p-2 shadow-2xl shadow-black/40 ring-1 ring-white/10">
          <ul className="space-y-0.5">
            {COMPANY_REPORT_NAV_ITEMS.map((item) => {
              const href = appendReportNavHref(item.href, { companyId })
              const itemActive = isReportNavLinkActive(pathname, item)
              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    role="menuitem"
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      itemActive
                        ? "bg-white/10 text-[#E6D6C3]"
                        : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
