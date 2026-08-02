"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import {
  FINANCIAL_TOOLS_NAV_ITEMS,
  FINANCIAL_TOOLS_OVERVIEW_HREF,
  appendFinancialToolHref,
  isFinancialToolLinkActive,
  isFinancialToolsPath,
} from "@/lib/financial-tools-navigation"
import { cn } from "@/lib/utils"

interface FinancialToolsNavDropdownProps {
  pathname: string | null
  companyId?: string | null
  className?: string
}

export function FinancialToolsNavDropdown({
  pathname,
  companyId,
  className,
}: FinancialToolsNavDropdownProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()
  const refMonth = searchParams.get("refMonth")
  const refYear = searchParams.get("refYear")
  const isActive = isFinancialToolsPath(pathname)

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const openMenu = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }, [clearCloseTimer])

  const overviewHref = appendFinancialToolHref(FINANCIAL_TOOLS_OVERVIEW_HREF, {
    companyId,
    refMonth,
    refYear,
  })

  return (
    <div
      className={cn("relative", open && "z-[100]", className)}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={scheduleClose}
    >
      <Link
        href={overviewHref}
        data-testid="financial-tools-nav-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-200" : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
        )}
      >
        Outils financiers
        <ChevronDown
          className={cn("h-3.5 w-3.5 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </Link>

      {open ? (
        <div
          role="menu"
          data-testid="financial-tools-nav-menu"
          className="absolute left-0 top-full z-[100] pt-2"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="min-w-[220px] rounded-xl border border-white/10 bg-[#2A2F3A] p-2 shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <ul className="space-y-0.5">
              {FINANCIAL_TOOLS_NAV_ITEMS.map((item) => {
                const href = appendFinancialToolHref(item.href, { companyId, refMonth, refYear })
                const itemActive = isFinancialToolLinkActive(pathname, item)
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
      ) : null}
    </div>
  )
}
