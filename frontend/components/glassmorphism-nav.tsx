"use client"

import { useState, useEffect, useRef } from "react"
import { Menu, X, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const navigation = [
  { name: "Pour qui ?", href: "#problem-solution" },
  { name: "Fonctionnalités", href: "#features" },
  { name: "Clés en main", href: "#ai-team" },
  { name: "Tarification", href: "#pricing-process" },
  { name: "Contact", href: "/contact" },
]

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

  const scrollToSection = (href: string) => {
    if (href.startsWith("/")) {
      return
    }

    const element = document.querySelector(href)
    if (element) {
      const rect = element.getBoundingClientRect()
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop
      const elementAbsoluteTop = rect.top + currentScrollY
      const navbarHeight = 100
      const targetPosition = Math.max(0, elementAbsoluteTop - navbarHeight)

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      })
    }
    setIsOpen(false)
  }

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
        {/* Main Navigation */}
        <div className="w-full">
            <div
            className={`backdrop-blur-md border-b border-slate-700/50 px-8 sm:px-12 lg:px-16 xl:px-20 py-3 md:py-4 transition-all duration-300 ${
              scrolled
                ? "bg-slate-800/95 shadow-lg"
                : "bg-slate-800/80 shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Logo and Navigation Group */}
              <div className="flex items-center gap-6 md:gap-8">
                {/* Logo */}
                <Link
                  href="/"
                  className="flex items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
                    <Image
                      src="/images/modelisys-icon-white.svg"
                      alt="Modelisys"
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                  {navigation.map((item) =>
                    item.href.startsWith("/") ? (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer ${
                          scrolled
                            ? "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <button
                        key={item.name}
                        onClick={() => scrollToSection(item.href)}
                        className={`px-3 py-2 rounded-md transition-colors duration-200 font-medium cursor-pointer ${
                          scrolled
                            ? "text-slate-300 hover:text-white hover:bg-slate-700/50"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        {item.name}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Desktop CTA Buttons */}
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/login"
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-200 border ${
                    scrolled
                      ? "bg-slate-700/50 text-white border-slate-600/50 hover:bg-slate-700"
                      : "bg-slate-700/50 text-white border-slate-600/50 hover:bg-slate-700"
                  }`}
                >
                  Portail client
                </Link>

                <button
                  className={`px-6 py-2.5 rounded-md font-semibold transition-colors duration-200 group flex items-center gap-2 ${
                    scrolled
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-500"
                      : "bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-500"
                  }`}
                  onClick={() => scrollToSection("#demo")}
                >
                  <span>Accéder en priorité au lancement</span>
                  <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </button>
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

        <div className="md:hidden relative">
          {/* Backdrop overlay */}
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsOpen(false)}
            style={{ top: "0", left: "0", right: "0", bottom: "0", zIndex: -1 }}
          />

          {/* Menu container */}
          <div
            className={`mt-0 w-full px-8 sm:px-12 lg:px-16 xl:px-20 transition-all duration-500 ease-out transform-gpu ${
              isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-8 scale-95 pointer-events-none"
            }`}
          >
            <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-lg p-4 shadow-xl">
              <div className="flex flex-col space-y-1">
                {navigation.map((item, index) =>
                  item.href.startsWith("/") ? (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md px-3 py-3 text-left transition-colors duration-200 font-medium cursor-pointer ${
                        isOpen ? "animate-mobile-menu-item" : ""
                      }`}
                      style={{
                        animationDelay: isOpen ? `${index * 80 + 100}ms` : "0ms",
                      }}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <button
                      key={item.name}
                      onClick={() => scrollToSection(item.href)}
                      className={`text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md px-3 py-3 text-left transition-colors duration-200 font-medium cursor-pointer ${
                        isOpen ? "animate-mobile-menu-item" : ""
                      }`}
                      style={{
                        animationDelay: isOpen ? `${index * 80 + 100}ms` : "0ms",
                      }}
                    >
                      {item.name}
                    </button>
                  ),
                )}
                <div className="h-px bg-slate-700/50 my-2" />
                <Link
                  href="/login"
                  className={`relative bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-md flex items-center transition-colors duration-200 border border-slate-600/50 cursor-pointer ${
                    isOpen ? "animate-mobile-menu-item" : ""
                  }`}
                  style={{
                    animationDelay: isOpen ? `${navigation.length * 80 + 100}ms` : "0ms",
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  <span>Portail client</span>
                </Link>
                <button
                  className={`relative bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-md flex items-center transition-colors duration-200 cursor-pointer group border border-emerald-500 ${
                    isOpen ? "animate-mobile-menu-item" : ""
                  }`}
                  style={{
                    animationDelay: isOpen ? `${navigation.length * 80 + 150}ms` : "0ms",
                  }}
                  onClick={() => {
                    scrollToSection("#demo")
                    setIsOpen(false)
                  }}
                >
                  <span className="mr-2">Accéder en priorité au lancement</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
