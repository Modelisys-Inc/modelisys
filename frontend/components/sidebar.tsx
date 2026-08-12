"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, TrendingUp, BarChart3, Scale, Waves, ChevronDown, LineChart, DollarSign, Calendar, Calculator, FileText, Target, Building2, Home, Settings, BookOpen, LogOut, StickyNote, Users, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useSidebar } from "@/contexts/sidebar-context"

const setupMenuItems = [
  {
    label: "Configuration comptable",
    href: "/settings/companies",
    icon: LayoutDashboard,
  },
]

const menuItems = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Reporting financier",
    href: "#",
    icon: TrendingUp,
    submenu: [
      {
        label: "État des résultats",
        href: "/financial-statements/income-statement",
        icon: BarChart3,
      },
      {
        label: "Bilan",
        href: "/financial-statements/balance-sheet",
        icon: Scale,
      },
      {
        label: "Flux de trésorerie",
        href: "/financial-statements/cash-flow",
        icon: Waves,
      },
    ],
  },
  {
    label: "Analyse",
    href: "#",
    icon: LineChart,
    submenu: [
      {
        label: "Fonds de roulement",
        href: "/analysis/working-capital",
        icon: DollarSign,
      },
      {
        label: "Capex",
        href: "/analysis/capex",
        icon: Calculator,
      },
      {
        label: "Marge par produits",
        href: "/analysis/product-margin",
        icon: Calendar,
      },
      {
        label: "Revenus par clients",
        href: "/analysis/revenue-by-customer",
        icon: Users,
      },
      {
        label: "Achats par fournisseur",
        href: "/analysis/purchases-by-supplier",
        icon: Truck,
      },
      {
        label: "Ratios",
        href: "/analysis/ratios",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Projections",
    href: "#",
    icon: Target,
    submenu: [
      {
        label: "Pro Forma",
        href: "/projections",
        icon: FileText,
      },
      {
        label: "Revenus",
        href: "/projections/revenue",
        icon: TrendingUp,
      },
      {
        label: "Dépenses",
        href: "/projections/expenses",
        icon: DollarSign,
      },
      {
        label: "Capex",
        href: "/projections/capex",
        icon: Calculator,
      },
      {
        label: "Dettes",
        href: "/projections/debt",
        icon: Scale,
      },
      {
        label: "Hypothèses",
        href: "/projections/assumptions",
        icon: Settings,
      },
    ],
  },
  {
    label: "Valorisation",
    href: "#",
    icon: Building2,
    submenu: [
      {
        label: "Modèle d'affaires",
        href: "/evaluation/business-model",
        icon: BarChart3,
      },
      {
        label: "Multiple du BAIIA",
        href: "/evaluation/ebitda-multiple",
        icon: Calculator,
      },
      {
        label: "Actif Corporel Net",
        href: "/evaluation/net-tangible-assets",
        icon: Scale,
      },
      {
        label: "DCF",
        href: "/evaluation/dcf",
        icon: TrendingUp,
      },
      {
        label: "CCF",
        href: "/evaluation/ccf",
        icon: DollarSign,
      },
      {
        label: "VCA",
        href: "/evaluation/vca",
        icon: Building2,
      },
    ],
  },
]

const complementaryMenuItems = [
  {
    label: "Documentation",
    href: "/year-end-cpa",
    icon: FileText,
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Ressources",
    href: "/resources",
    icon: BookOpen,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen } = useSidebar()

  const handleLogout = () => {
    // Supprimer les données de session
    if (typeof window !== "undefined") {
      // Supprimer les tokens et données de session
      localStorage.removeItem("token")
      sessionStorage.clear()
      
      // Rediriger vers la landing page
      router.push("/")
    }
  }
  
  // Auto-expand submenu if active page is inside it
  const getInitialExpanded = () => {
    const expanded: string[] = []
    menuItems.forEach((item) => {
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some((subitem) => pathname === subitem.href)
        if (hasActiveSubmenu) {
          expanded.push(item.label)
        }
      }
    })
    return expanded
  }
  
  const [expandedItems, setExpandedItems] = useState<string[]>(() => getInitialExpanded())

  // Update expanded items when pathname changes
  useEffect(() => {
    const expanded: string[] = []
    menuItems.forEach((item) => {
      if (item.submenu) {
        const hasActiveSubmenu = item.submenu.some((subitem) => pathname === subitem.href)
        if (hasActiveSubmenu) {
          expanded.push(item.label)
        }
      }
    })
    setExpandedItems(expanded)
  }, [pathname])

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  if (!isOpen) {
    return null
  }

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex flex-col sticky top-0">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-800/50 rounded-md flex items-center justify-center border border-slate-700/50">
            <LayoutDashboard className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Modelisys</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* Setup menu items */}
        {setupMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-700 text-white border-l-4 border-slate-300 shadow-md font-semibold"
                  : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Separator after setup */}
        <div className="my-4 mx-3 border-t border-slate-700/50" />

        {/* Core menu items */}
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const hasSubmenu = !!item.submenu
          const isExpanded = expandedItems.includes(item.label)
          const hasActiveSubmenu = item.submenu?.some(
            (subitem) => pathname === subitem.href
          )

          return (
            <div key={item.label} className="space-y-1">
              {hasSubmenu ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 flex-shrink-0 text-slate-300" />
                    <span className="truncate text-sm font-medium text-slate-300">{item.label}</span>
                  </div>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className="p-1 rounded hover:bg-slate-800/30 transition-colors duration-150"
                    aria-label={isExpanded ? "Réduire" : "Développer"}
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200 text-slate-400",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-slate-700 text-white border-l-4 border-slate-300 shadow-md font-semibold"
                      : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )}

              {hasSubmenu && isExpanded && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-600/50 pl-4">
                  {item.submenu?.map((subitem) => {
                    const SubIcon = subitem.icon
                    const isSubActive = pathname === subitem.href

                    return (
                      <Link
                        key={subitem.label}
                        href={subitem.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                          isSubActive
                            ? "bg-slate-700 text-white font-semibold shadow-md"
                            : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                        )}
                      >
                        <SubIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{subitem.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Separator */}
        <div className="my-4 mx-3 border-t border-slate-700/50" />

        {/* Complementary menu items */}
        {complementaryMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-slate-700 text-white border-l-4 border-slate-300 shadow-md font-semibold"
                  : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150",
            "text-slate-300 hover:bg-slate-700/60 hover:text-white"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-400 text-center">© 2024 Modelisys</p>
      </div>
    </aside>
  )
}
