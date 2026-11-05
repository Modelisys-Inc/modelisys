"use client"

import type React from "react"
import { ArrowRight, FacebookIcon, InstagramIcon, LinkedinIcon } from "lucide-react"
import Link from "next/link"
import { handleApprocheLandingLink } from "@/lib/approche-navigation"
import { heroFeatureFooterLinks } from "@/lib/hero-features"

interface FooterLink {
  title: string
  href: string
}

interface SocialLink {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface FooterSection {
  label: string
  links: FooterLink[]
}

const footerLinks: FooterSection[] = [
  {
    label: "L'approche Modelisys",
    links: [...heroFeatureFooterLinks],
  },
  {
    label: "Nos services",
    links: [
      { title: "Accompagnement financier fractionnaire", href: "/accompagnement-financier" },
      { title: "Solutions Excel", href: "/solutions-excel" },
      { title: "Tarification", href: "/tarification" },
    ],
  },
  {
    label: "Entreprise",
    links: [
      { title: "Notre objectif", href: "/#notre-objectif" },
      { title: "À propos", href: "/a-propos" },
      { title: "Contact", href: "/contact" },
      { title: "Politique de confidentialité", href: "/privacy" },
    ],
  },
  {
    label: "Ressources",
    links: [
      { title: "Blog", href: "/blog" },
      { title: "Quiz", href: "/ressources" },
    ],
  },
]

const socialLinks: SocialLink[] = [
  { title: "Facebook", href: "#", icon: FacebookIcon },
  { title: "Instagram", href: "#", icon: InstagramIcon },
  { title: "LinkedIn", href: "#", icon: LinkedinIcon },
]

const footerMarqueeItems = [
  "Une seule source de vérité pour vos données financières",
  "Transformez vos chiffres en décisions stratégiques",
  "Analyse, prévision et valorisation en un seul endroit",
  "Prenez de meilleures décisions financières, plus rapidement",
] as const

export function Footer() {
  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href)
      if (element) {
        const rect = element.getBoundingClientRect()
        const currentScrollY = window.pageYOffset || document.documentElement.scrollTop
        const navbarHeight = 100
        const targetPosition = Math.max(0, rect.top + currentScrollY - navbarHeight)

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    }
  }

  const scrollToDemo = () => {
    const demo = document.getElementById("demo")
    if (demo) {
      demo.scrollIntoView({ behavior: "smooth" })
      return
    }
    window.location.assign("/#demo")
  }

  const linkClass =
    "group inline-flex items-center gap-1.5 text-sm text-[#C9B8A5]/85 transition-colors hover:text-[#E6D6C3]"

  return (
    <footer className="relative isolate w-full overflow-hidden">
      {/* Fond — même scène que le hero d’accueil */}
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
          aria-hidden
          style={{
            background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
            filter: "blur(36px)",
          }}
        />
        <div
          className="absolute -left-[18%] top-[42%] h-[34%] w-[140%] -rotate-[14deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.14) 28%, rgba(224,116,45,0.28) 62%, transparent 88%)",
            filter: "blur(22px)",
          }}
        />
        <div
          className="absolute -left-[10%] bottom-[-8%] h-[18%] w-[120%] -rotate-[12deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.32) 46%, rgba(230,214,195,0.16) 68%, transparent 88%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <div className="relative z-20 w-full overflow-hidden border-b border-white/10">
        <div className="footer-marquee-mask">
          <div className="footer-marquee-track" aria-label="Messages Modelisys" role="region">
            <div className="footer-marquee-row">
              {footerMarqueeItems.map((text) => (
                <div key={text} className="footer-marquee-item">
                  <span className="footer-marquee-dot" aria-hidden />
                  <span className="footer-marquee-text">{text}</span>
                </div>
              ))}
            </div>
            <div className="footer-marquee-row" aria-hidden>
              {footerMarqueeItems.map((text) => (
                <div key={`dup-${text}`} className="footer-marquee-item">
                  <span className="footer-marquee-dot" aria-hidden />
                  <span className="footer-marquee-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 pt-10 pb-16 sm:px-12 sm:pt-12 sm:pb-20 lg:px-16 lg:pt-14 lg:pb-24 xl:px-20">
        {/* Filigrane m. — même principe que la section Valeur (post-features) */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 right-0 z-[1] hidden overflow-hidden lg:block"
          aria-hidden
        >
          <span className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(16rem,min(52vw,68vh),48rem)] font-semibold leading-none tracking-tight text-[#E6D6C3]/[0.08] xl:text-[clamp(18rem,min(48vw,72vh),56rem)]">
            m<span className="text-[#E0742D]/45">.</span>
          </span>
        </div>

        <div className="relative z-10">
        {/* Actions rapides — même ton que les CTA du hero */}
        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-white/10 pb-5 sm:mb-10 sm:gap-5 sm:pb-6">
          <button
            type="button"
            onClick={scrollToDemo}
            className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732]"
          >
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            Prendre rendez-vous
          </button>
          <Link
            href="/contact"
            className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3]"
          >
            Nous contacter
          </Link>
        </div>

        <div className="relative grid gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Colonne marque — alignée sur le panneau gauche du hero */}
          <div className="space-y-8">
            <p className="text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl">
              modelisys<span className="text-[#E0742D]">.</span>
            </p>

            <div className="max-w-md space-y-5">
              <p className="border-l-2 border-l-[#E0742D]/45 pl-4 text-sm italic leading-relaxed text-[#C9B8A5]/80">
                « Modelisys accompagne les propriétaires de PME dans l&apos;optimisation de leur performance, de
                leur rendement et de la valeur de leur entreprise grâce à une approche intégrée de gestion de la
                performance et de création de valeur. »
              </p>
              <div>
                <p className="text-sm font-semibold text-[#E6D6C3]">Tristan Bellerose, CPA, CBV</p>
                <p className="mt-1 text-xs text-[#C9B8A5]/65">Président et fondateur</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#C9B8A5]/80">Réseaux sociaux</p>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((s) => {
                  const Icon = s.icon
                  return (
                    <Link
                      key={s.title}
                      href={s.href}
                      aria-label={s.title}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#C9B8A5] transition hover:border-[#E0742D]/45 hover:bg-white/[0.08] hover:text-[#E0742D]"
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Liens — colonnes sur fond droit du split */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:pt-2">
            {footerLinks.map((section) => (
              <div key={section.label}>
                <div>
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#C9B8A5]/80">
                    {section.label}
                  </h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        {link.href.startsWith("/") ? (
                          <Link
                            href={link.href}
                            className={linkClass}
                            onClick={(e) => handleApprocheLandingLink(e, link.href)}
                          >
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#E0742D]" aria-hidden />
                            {link.title}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => scrollToSection(link.href)} className={`${linkClass} text-left`}>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#E0742D]" aria-hidden />
                            {link.title}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-14 border-t border-white/10 pt-8 sm:mt-16 sm:pt-10">
          <p className="text-center text-xs text-[#C9B8A5]/55 md:text-left">
            © {new Date().getFullYear()} Modelisys. Tous droits réservés.
          </p>
        </div>
        </div>
      </div>
    </footer>
  )
}
