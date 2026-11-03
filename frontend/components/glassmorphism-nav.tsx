"use client"

import { useState, useEffect, useRef, type MouseEvent } from "react"
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import { handleApprocheLandingLink } from "@/lib/approche-navigation"

type NavChild = { name: string; href: string; note: string }

type NavPanel = { text: string; cta: string; href: string }

type NavItem =
  | { name: string; href: string }
  | { name: string; href?: string; children: NavChild[]; panel: NavPanel }

const desktopNavItems: readonly NavItem[] = [
  { name: "Notre objectif", href: "/#notre-objectif" },
  {
    name: "Nos services",
    children: [
      {
        name: "Accompagnement financier fractionnaire",
        href: "/accompagnement-financier",
        note: "Expertise financière auprès de la direction, sans directeur financier à temps plein.",
      },
      {
        name: "Solutions Excel",
        href: "/solutions-excel",
        note: "Des outils de gestion conçus selon vos processus, vos données et les besoins de votre entreprise.",
      },
    ],
    panel: {
      text: "Un accompagnement financier et des solutions de gestion, pour relier vos données à des décisions concrètes.",
      cta: "Prendre rendez-vous",
      href: "/#demo",
    },
  },
  { name: "Notre approche", href: "/#approche-modelisys" },
  {
    name: "Ressources",
    href: "/ressources",
    children: [
      {
        name: "Blog",
        href: "/blog",
        note: "Articles pour approfondir la valorisation, le reporting et les projections.",
      },
      {
        name: "Quiz",
        href: "/ressources",
        note: "De courts quiz pour situer votre lecture.",
      },
    ],
    panel: {
      text: "Des articles pour structurer vos analyses, et de courts quiz pour situer votre lecture.",
      cta: "Commencer un quiz",
      href: "/ressources",
    },
  },
  { name: "À propos", href: "/a-propos" },
  { name: "Tarification", href: "/tarification" },
]

const mobileNavItems = desktopNavItems.flatMap((item) =>
  "children" in item
    ? [
        { name: item.name, href: item.href, indent: false },
        ...item.children.map((child) => ({ name: child.name, href: child.href, indent: true })),
      ]
    : [{ name: item.name, href: item.href, indent: false }],
)

/** Sur /, évite une navigation Next inutile et assure le scroll vers l’ancre. */
function goToLandingSection(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (typeof window === "undefined") return
  if (!href.startsWith("/#")) return
  if (window.location.pathname !== "/") return
  if (handleApprocheLandingLink(e, href)) return
  e.preventDefault()
  const hash = href.slice(1)
  const id = decodeURIComponent(hash.slice(1))
  const el = document.getElementById(id)
  if (window.location.hash === hash && el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    return
  }
  window.location.hash = hash
}

function DesktopMenuPanel({
  item,
  onNavigate,
}: {
  item: Extract<NavItem, { children: NavChild[] }>
  onNavigate: () => void
}) {
  return (
    <div className="relative overflow-hidden border-b border-[#E6D6C3]/15 bg-[#161A22]">
      <div className="relative z-10 mx-auto grid w-full max-w-[1920px] md:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
        <div className="flex flex-col justify-center px-5 py-7 sm:px-10 lg:px-16 lg:py-9 xl:px-20">
          {item.children.map((sub, index) => (
            <Link
              key={sub.name}
              href={sub.href}
              onClick={(e) => {
                goToLandingSection(e, sub.href)
                onNavigate()
              }}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#E6D6C3]/12 py-5 first:pt-1 last:border-b-0 last:pb-1"
            >
              <span aria-hidden className="text-[11px] font-medium tabular-nums tracking-[0.18em] text-[#E0742D]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-medium leading-snug tracking-[-0.02em] text-[#E6D6C3] transition-colors duration-200 group-hover:text-white">
                  {sub.name}
                </span>
                <span aria-hidden className="mt-1 block max-w-xl text-sm leading-relaxed text-[#C9B8A5]/72">
                  {sub.note}
                </span>
              </span>
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6D6C3]/40 text-[#E6D6C3] transition duration-200 group-hover:border-[#E0742D] group-hover:bg-[#E0742D] group-hover:text-[#161A22]"
              >
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden border-t border-[#E6D6C3]/12 px-5 py-7 sm:px-10 md:border-t-0 md:border-l md:px-12 md:py-9 lg:px-14 xl:pr-20">
          <div
            className="pointer-events-none absolute -right-[20%] -top-[30%] h-[160%] w-[80%] rounded-full"
            aria-hidden
            style={{
              background: "radial-gradient(circle, rgba(230,214,195,0.14) 0%, rgba(230,214,195,0) 68%)",
              filter: "blur(28px)",
            }}
          />
          <div className="relative">
            <span className="block h-px w-10 bg-[#E0742D]" aria-hidden />
            <p className="mt-5 text-[1.65rem] font-medium leading-[1.28] tracking-[-0.02em] text-balance text-[#E6D6C3]">
              {item.panel.text}
            </p>
          </div>
          <Link
            href={item.panel.href}
            onClick={(e) => {
              goToLandingSection(e, item.panel.href)
              onNavigate()
            }}
            className="relative mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-4 py-2 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
            {item.panel.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}

export function GlassmorphismNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasLoaded(true)
    }, 100)

    const controlNavbar = () => {
      if (typeof window !== "undefined") {
        const currentScrollY = window.scrollY
        setScrolled(currentScrollY > 20)

        if (currentScrollY > 50) {
          if (currentScrollY > lastScrollY.current && currentScrollY - lastScrollY.current > 5) {
            setIsVisible(false)
          } else if (lastScrollY.current - currentScrollY > 5) {
            setIsVisible(true)
          }
        } else {
          setIsVisible(true)
        }

        lastScrollY.current = currentScrollY
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", controlNavbar, { passive: true })

      return () => {
        window.removeEventListener("scroll", controlNavbar)
        clearTimeout(timer)
      }
    }

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-20 md:-translate-y-24 opacity-0"
        } ${hasLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        style={{
          transition: hasLoaded ? "all 0.5s ease-out" : "opacity 0.8s ease-out, transform 0.8s ease-out",
        }}
      >
        <div
          className="relative z-[60] w-full"
          onMouseLeave={() => setOpenMenu(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null)
          }}
        >
          <div
            className={`border-b px-5 sm:px-10 lg:px-16 xl:px-20 py-3 md:py-3.5 transition-colors duration-300 ${
              openMenu
                ? "border-transparent bg-[#222732]"
                : "border-white/10 bg-[#222732]/95 backdrop-blur-md"
            } ${scrolled && !openMenu ? "shadow-lg" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 md:gap-8">
                <Link
                  href="/"
                  className="flex items-center cursor-pointer"
                  onClick={(e) => {
                    if (typeof window === "undefined") return
                    if (window.location.pathname !== "/") return
                    e.preventDefault()
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                >
                  <span className="text-lg md:text-xl font-semibold tracking-tight text-[#E6D6C3]">
                    modelisys<span className="text-[#E0742D]">.</span>
                  </span>
                </Link>

                <span
                  className="hidden md:block h-5 w-px shrink-0 bg-[#E6D6C3]/25"
                  aria-hidden
                />

                <div className="hidden md:flex items-center space-x-1">
                  {desktopNavItems.map((item) => {
                    const itemClass =
                      "px-2.5 py-2 text-[15px] text-[#C9B8A5]/90 transition-colors duration-200 hover:text-[#E6D6C3] xl:px-3"
                    const triggerClass = `inline-flex items-center gap-1.5 ${itemClass} ${
                      openMenu === item.name ? "text-[#E6D6C3] underline decoration-[#E6D6C3] underline-offset-8" : ""
                    }`
                    if ("children" in item) {
                      return item.href ? (
                        <Link
                          key={item.name}
                          href={item.href}
                          aria-expanded={openMenu === item.name}
                          aria-haspopup="true"
                          onMouseEnter={() => setOpenMenu(item.name)}
                          onFocus={() => setOpenMenu(item.name)}
                          onClick={(e) => goToLandingSection(e, item.href!)}
                          className={triggerClass}
                        >
                          {item.name}
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${openMenu === item.name ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </Link>
                      ) : (
                        <button
                          key={item.name}
                          type="button"
                          aria-expanded={openMenu === item.name}
                          aria-haspopup="true"
                          onMouseEnter={() => setOpenMenu(item.name)}
                          onFocus={() => setOpenMenu(item.name)}
                          className={triggerClass}
                        >
                          {item.name}
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${openMenu === item.name ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </button>
                      )
                    }
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onMouseEnter={() => setOpenMenu(null)}
                        onClick={(e) => goToLandingSection(e, item.href)}
                        className={itemClass}
                      >
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/#demo"
                  onMouseEnter={() => setOpenMenu(null)}
                  onClick={(e) => goToLandingSection(e, "/#demo")}
                  className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                >
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  Prendre rendez-vous
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
                className="md:hidden flex h-11 w-11 items-center justify-center text-white"
              >
                <div className="relative w-6 h-6">
                  <Menu
                    size={24}
                    className={`absolute inset-0 transition-all duration-300 ${
                      isOpen ? "opacity-0 rotate-180 scale-75" : "opacity-100 rotate-0 scale-100"
                    }`}
                  />
                  <X
                    size={24}
                    className={`absolute inset-0 transition-all duration-300 ${
                      isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-180 scale-75"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
          {desktopNavItems.map((item) =>
            "children" in item && openMenu === item.name ? (
              <div
                key={item.name}
                className="absolute inset-x-0 top-full z-50 hidden animate-in fade-in-0 slide-in-from-top-1 shadow-[0_28px_48px_-24px_rgba(0,0,0,0.55)] duration-200 md:block"
              >
                <DesktopMenuPanel item={item} onNavigate={() => setOpenMenu(null)} />
              </div>
            ) : null,
          )}
        </div>

        <div className="relative z-40 md:hidden">
          {isOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsOpen(false)}
              aria-hidden
            />
          )}

          <div
            className={`relative z-50 mt-0 w-full px-5 sm:px-10 lg:px-16 xl:px-20 transition-all duration-500 ease-out transform-gpu ${
              isOpen ? "translate-y-0 scale-100 opacity-100" : "hidden"
            }`}
            aria-hidden={!isOpen}
          >
            <div className="bg-[#2A2F3A]/92 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl">
              <div className="flex flex-col space-y-1">
                {mobileNavItems.map((item, index) =>
                  item.href ? (
                    <Link
                      key={`${item.href}-${item.name}`}
                      href={item.href}
                      className={`text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5 rounded-md py-3 text-left transition-colors duration-200 font-medium cursor-pointer ${
                        item.indent ? "pl-8 text-sm text-[#C9B8A5]/80" : "px-3"
                      } ${isOpen ? "animate-mobile-menu-item" : ""}`}
                      style={{
                        animationDelay: isOpen ? `${index * 80 + 100}ms` : "0ms",
                      }}
                      onClick={(e) => {
                        goToLandingSection(e, item.href!)
                        setIsOpen(false)
                      }}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <p
                      key={item.name}
                      className={`px-3 py-3 text-left font-medium text-[#E6D6C3] ${
                        isOpen ? "animate-mobile-menu-item" : ""
                      }`}
                      style={{
                        animationDelay: isOpen ? `${index * 80 + 100}ms` : "0ms",
                      }}
                    >
                      {item.name}
                    </p>
                  ),
                )}
                <div className="h-px bg-white/10 my-2" />
                <Link
                  href="/#demo"
                  className={`group relative flex cursor-pointer items-center rounded-md border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-slate-200 transition-colors duration-200 hover:bg-white/[0.07] hover:text-slate-100 ${
                    isOpen ? "animate-mobile-menu-item" : ""
                  }`}
                  style={{
                    animationDelay: isOpen ? `${mobileNavItems.length * 80 + 100}ms` : "0ms",
                  }}
                  onClick={(e) => {
                    goToLandingSection(e, "/#demo")
                    setIsOpen(false)
                  }}
                >
                  <span className="mr-2 text-xs font-semibold tracking-wide">PRENDRE RENDEZ-VOUS</span>
                  <ArrowRight className="w-4 h-4 text-[#E0742D] transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
