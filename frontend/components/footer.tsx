"use client"

import type { ComponentProps, ReactNode } from "react"
import type React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, FacebookIcon, InstagramIcon, LinkedinIcon } from "lucide-react"
import Link from "next/link"

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
    label: "Parcours",
    links: [
      { title: "Pourquoi Modelisys", href: "/landing#problem-solution" },
      { title: "Mise en place", href: "/landing#platform-setup" },
      { title: "Tarification", href: "/landing#pricing-process" },
      { title: "Démonstration", href: "/landing#demo" },
    ],
  },
  {
    label: "Utilisateurs",
    links: [
      { title: "PME", href: "/landing#problem-solution" },
      { title: "Partenaires comptables", href: "/landing/cabinets-comptables" },
      { title: "Partenaires institutionnels", href: "/landing/partenaires-institutionnels" },
    ],
  },
  {
    label: "Entreprise",
    links: [
      { title: "Contact", href: "/contact" },
      { title: "Politique de confidentialité", href: "/privacy" },
    ],
  },
  {
    label: "Ressources",
    links: [
      { title: "Blog", href: "/blog" },
      { title: "Études de cas", href: "/case-studies" },
      { title: "Documentation", href: "/docs" },
      { title: "Support", href: "/support" },
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
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })
  }

  const linkClass =
    "group inline-flex items-center gap-2 text-sm text-[#C9B8A5]/85 transition-colors hover:text-[#E6D6C3]"

  return (
    <footer className="relative isolate w-full overflow-hidden">
      {/* Fond — même split que le hero */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 -top-24 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[560px] w-[560px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      {/* Bande de défilement — haut du footer */}
      <div className="relative z-20 w-full overflow-hidden border-b border-white/10">
        <div className="footer-marquee-mask">
          <div
            className="footer-marquee-track"
            aria-label="Messages Modelisys"
            role="region"
          >
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
          className="pointer-events-none absolute inset-y-0 left-1/2 right-0 z-[1] hidden overflow-x-hidden overflow-y-visible lg:block"
          aria-hidden
        >
          <span className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(16rem,min(52vw,68vh),48rem)] font-semibold leading-none tracking-tight text-white/[0.055] xl:text-[clamp(18rem,min(48vw,72vh),56rem)]">
            m<span className="text-[#E0742D]/35">.</span>
          </span>
        </div>

        <div className="relative z-10">
        {/* Actions rapides — même ton que les CTA du hero */}
        <AnimatedContainer className="mb-8 flex flex-wrap items-center gap-4 border-b border-white/10 pb-5 sm:mb-10 sm:gap-5 sm:pb-6">
          <button
            type="button"
            onClick={scrollToDemo}
            className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
          >
            RÉSERVER UNE DÉMO
            <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="hidden h-px w-12 bg-white/10 sm:block" />
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
          >
            CONTACT
            <span className="inline-block h-px w-10 bg-[#E0742D]" />
          </Link>
        </AnimatedContainer>

        <div className="relative grid gap-14 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Colonne marque — alignée sur le panneau gauche du hero */}
          <AnimatedContainer className="space-y-8">
            <p className="text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl">
              modelisys<span className="text-[#E0742D]">.</span>
            </p>

            <div className="max-w-md space-y-5">
              <p className="border-l-2 border-l-[#E0742D]/45 pl-4 text-sm italic leading-relaxed text-[#C9B8A5]/80">
                « Modelisys transforme l&apos;analyse financière en un véritable levier d&apos;efficacité, en mettant en
                lumière les dynamiques qui façonnent la valeur d&apos;une entreprise. »
              </p>
              <div>
                <p className="text-sm font-semibold text-[#E6D6C3]">Tristan Bellerose, CPA, CBV</p>
                <p className="mt-1 text-xs text-[#C9B8A5]/65">Président et fondateur</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-200">Réseaux sociaux</p>
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
          </AnimatedContainer>

          {/* Liens — colonnes sur fond droit du split */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:pt-2">
            {footerLinks.map((section, index) => (
              <AnimatedContainer key={section.label} delay={0.08 + index * 0.06}>
                <div>
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                    {section.label}
                  </h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        {link.href.startsWith("/") ? (
                          <Link href={link.href} className={linkClass}>
                            {link.title}
                          </Link>
                        ) : (
                          <button type="button" onClick={() => scrollToSection(link.href)} className={`${linkClass} text-left`}>
                            {link.title}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
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

      <style jsx>{`
        .footer-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }

        .footer-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: footerMarqueeLeft 32s linear infinite;
        }

        .footer-marquee-row {
          display: flex;
          align-items: center;
          gap: 28px;
          padding: 14px 28px;
        }

        .footer-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
        }

        .footer-marquee-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgb(224 116 45 / 0.95);
          box-shadow: 0 0 0 3px rgb(224 116 45 / 0.15);
        }

        .footer-marquee-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: rgb(230 214 195 / 0.88);
        }

        @media (min-width: 640px) {
          .footer-marquee-text {
            font-size: 13px;
          }
          .footer-marquee-row {
            gap: 36px;
            padding: 16px 36px;
          }
        }

        @keyframes footerMarqueeLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </footer>
  )
}

type ViewAnimationProps = {
  delay?: number
  className?: ComponentProps<typeof motion.div>["className"]
  children: ReactNode
}

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
