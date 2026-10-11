"use client"

import { useState, useEffect, useRef, type MouseEvent } from "react"
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react"
import Link from "next/link"
import { handleApprocheLandingLink } from "@/lib/approche-navigation"
import { heroFeatureFooterLinks } from "@/lib/hero-features"
import { SERVICES_PAGE_PILLARS, getServicePagePath } from "@/lib/services-page-content"

const NOTRE_APPROCHE_SECTION = "/#approche-modelisys"

const approcheSubLinks = heroFeatureFooterLinks.map((link) => ({
  name: link.title,
  href: link.href,
}))

const serviceSubLinks = SERVICES_PAGE_PILLARS.map((pillar) => ({
  name: pillar.label,
  href: getServicePagePath(pillar.id),
}))

type NavItem =
  | { name: string; href: string }
  | { name: string; href: string; children: { name: string; href: string }[] }

const desktopNavItems: readonly NavItem[] = [
  { name: "Notre objectif", href: "/#notre-objectif" },
  { name: "Nos services", href: "/services", children: serviceSubLinks },
  { name: "Notre approche", href: NOTRE_APPROCHE_SECTION, children: approcheSubLinks },
  { name: "À propos", href: "/a-propos" },
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

function DesktopFlyout({
  name,
  href,
  items,
}: {
  name: string
  href: string
  items: { name: string; href: string }[]
}) {
  return (
    <div className="relative group">
      <Link
        href={href}
        onClick={(e) => goToLandingSection(e, href)}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5"
      >
        {name}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </Link>
      <div className="absolute left-0 top-full z-50 pt-2 opacity-0 invisible transition-all duration-150 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
        <div className="min-w-[14rem] rounded-lg border border-white/10 bg-[#2A2F3A]/98 py-1.5 shadow-xl backdrop-blur-md">
          {items.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              onClick={(e) => goToLandingSection(e, sub.href)}
              className="block px-3 py-2.5 text-sm font-medium text-[#C9B8A5]/90 transition-colors hover:bg-white/5 hover:text-[#E6D6C3]"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GlassmorphismNav() {
  const [isOpen, setIsOpen] = useState(false)
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
        <div className="relative z-[60] w-full">
          <div
            className={`backdrop-blur-md border-b border-white/10 px-5 sm:px-10 lg:px-16 xl:px-20 py-2.5 md:py-4 transition-all duration-300 ${
              scrolled ? "bg-[#2A2F3A]/92 shadow-lg" : "bg-[#2A2F3A]/78 shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 md:gap-8">
                <Link
                  href="/"
                  className="flex items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
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
                  className="hidden md:block h-7 w-px shrink-0 bg-gradient-to-b from-[#E0742D]/80 via-white/15 to-transparent"
                  aria-hidden
                />

                <div className="hidden md:flex items-center space-x-1">
                  {desktopNavItems.map((item) =>
                    "children" in item ? (
                      <DesktopFlyout key={item.name} name={item.name} href={item.href} items={item.children} />
                    ) : (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={(e) => goToLandingSection(e, item.href)}
                        className="px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5"
                      >
                        {item.name}
                      </Link>
                    ),
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/#demo"
                  onClick={(e) => goToLandingSection(e, "/#demo")}
                  className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  <span>PRENDRE RENDEZ-VOUS</span>
                  <ArrowRight className="w-4 h-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
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
                {mobileNavItems.map((item, index) => (
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
                      goToLandingSection(e, item.href)
                      setIsOpen(false)
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
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
