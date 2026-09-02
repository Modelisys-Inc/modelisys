"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  COMPANY_CONFIGURATION_LIST_HREF,
  COMPANY_CONFIGURATION_NAV_ITEMS,
  companyConfigurationHref,
  isCompanyConfigurationLinkActive,
  isCompanyConfigurationPath,
} from "@/lib/company-configuration-navigation"
import { cn } from "@/lib/utils"

interface ConfigurationNavDropdownProps {
  pathname: string | null
  companyId?: string | null
  className?: string
}

export function ConfigurationNavDropdown({
  pathname,
  companyId,
  className,
}: ConfigurationNavDropdownProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isActive = isCompanyConfigurationPath(pathname)

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

  if (!companyId) {
    return (
      <Link
        href={COMPANY_CONFIGURATION_LIST_HREF}
        data-testid="configuration-nav-trigger"
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-200" : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
          className,
        )}
      >
        Configuration
      </Link>
    )
  }

  const overviewHref = companyConfigurationHref(companyId, "")

  return (
    <div
      className={cn("relative", open && "z-[100]", className)}
      data-testid="configuration-nav"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={scheduleClose}
    >
      <Link
        href={overviewHref}
        data-testid="configuration-nav-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseEnter={openMenu}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "text-slate-200" : "text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
        )}
      >
        Configuration
        <ChevronDown
          className={cn("h-3.5 w-3.5 opacity-70 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </Link>

      {open ? (
        <div
          role="menu"
          data-testid="configuration-nav-menu"
          className="absolute left-0 top-full z-[100] pt-2"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="min-w-[240px] rounded-xl border border-white/10 bg-[#2A2F3A] p-2 shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <ul className="space-y-0.5">
              {COMPANY_CONFIGURATION_NAV_ITEMS.map((item) => {
                const href = companyConfigurationHref(companyId, item.pathSuffix)
                const itemActive = isCompanyConfigurationLinkActive(
                  pathname,
                  companyId,
                  item.pathSuffix,
                )
                return (
                  <li key={item.pathSuffix || "base"}>
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
