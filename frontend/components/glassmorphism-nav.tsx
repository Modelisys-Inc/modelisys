"use client"

import { useState, useEffect, useRef, type MouseEvent } from "react"
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react"
import Link from "next/link"

const POUR_QUI_SECTION = "/#pour-qui"

const pourQuiSubLinks = [
  { name: "Entreprises", href: "/#problem-solution" },
  { name: "Partenaires conseils", href: "/cabinets-comptables" },
  { name: "Partenaires financiers", href: "/partenaires-financiers" },
] as const

const mainNavLinks = [
  { name: "Pourquoi", href: "/#problem-solution" },
  { name: "Mise en place", href: "/#platform-setup" },
  { name: "Tarification", href: "/#pricing-process" },
] as const

/** Ordre du menu mobile (indent = sous-entrées de « Pour qui »). */
const mobileNavItems = [
  { name: "Pour qui", href: POUR_QUI_SECTION, indent: false },
  ...pourQuiSubLinks.map((l) => ({ name: l.name, href: l.href, indent: true as const })),
  ...mainNavLinks.map((l) => ({ name: l.name, href: l.href, indent: false as const })),
]

/** Sur /, évite une navigation Next inutile et assure le scroll vers l’ancre. */
function goToLandingSection(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (typeof window === "undefined") return
  if (!href.startsWith("/#")) return
  if (window.location.pathname !== "/") return
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
        {/* Barre logo + actions — au-dessus du backdrop menu (sinon le fixed inset-0 recouvre tout le nav) */}
        <div className="relative z-[60] w-full">
            <div
            className={`backdrop-blur-md border-b border-white/10 px-8 sm:px-12 lg:px-16 xl:px-20 py-3 md:py-4 transition-all duration-300 ${
              scrolled
                ? "bg-[#2A2F3A]/92 shadow-lg"
                : "bg-[#2A2F3A]/78 shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Logo and Navigation Group */}
              <div className="flex items-center gap-6 md:gap-8">
                {/* Logo */}
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

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                  <div className="relative group">
                    <Link
                      href={POUR_QUI_SECTION}
                      onClick={(e) => goToLandingSection(e, POUR_QUI_SECTION)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5"
                    >
                      Pour qui
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    </Link>
                    <div className="absolute left-0 top-full z-50 pt-2 opacity-0 invisible transition-all duration-150 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
                      <div className="rounded-lg border border-white/10 bg-[#2A2F3A]/98 py-1.5 shadow-xl backdrop-blur-md min-w-[15rem]">
                        {pourQuiSubLinks.map((sub) => (
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
                  {mainNavLinks.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => goToLandingSection(e, item.href)}
                      className="px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer text-[#C9B8A5]/90 hover:text-[#E6D6C3] hover:bg-white/5"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Desktop CTA Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-md font-medium transition-colors duration-200 border border-white/10 bg-white/[0.04] text-[#E6D6C3] hover:bg-white/[0.07]"
                >
                  Mon Portail
                </Link>

                <Link
                  href="/#demo"
                  onClick={(e) => goToLandingSection(e, "/#demo")}
                  className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  <span>RÉSERVER UNE DÉMO</span>
                  <ArrowRight className="w-4 h-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`md:hidden hover:scale-110 transition-transform duration-200 cursor-pointer ${
                  scrolled ? "text-white" : "text-white"
                }`}
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
          {/* Backdrop sous la barre (z-40 &lt; barre z-60) */}
          {isOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setIsOpen(false)}
              aria-hidden
            />
          )}

          {/* Panneau liens : au-dessus du backdrop, sous la barre */}
          <div
            className={`relative z-50 mt-0 w-full px-8 sm:px-12 lg:px-16 xl:px-20 transition-all duration-500 ease-out transform-gpu ${
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
                  <span className="mr-2 text-xs font-semibold tracking-wide">RÉSERVER UNE DÉMO</span>
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
