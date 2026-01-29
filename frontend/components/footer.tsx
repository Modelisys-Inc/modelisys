"use client"
import type React from "react"
import type { ComponentProps, ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from "lucide-react"
import Image from "next/image"

interface FooterLink {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface FooterSection {
  label: string
  links: FooterLink[]
}

const footerLinks: FooterSection[] = [
  {
    label: "Produit",
    links: [
      { title: "Défis", href: "#problem-solution" },
      { title: "Fonctionnalités", href: "#features" },
      { title: "Clés en main", href: "#ai-team" },
      { title: "Notre mission", href: "#about" },
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
  {
    label: "Réseaux sociaux",
    links: [
      { title: "Facebook", href: "#", icon: FacebookIcon },
      { title: "Instagram", href: "#", icon: InstagramIcon },
      { title: "LinkedIn", href: "#", icon: LinkedinIcon },
    ],
  },
]

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

  return (
    <footer className="relative w-full bg-slate-900 overflow-hidden">
      {/* Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-slate-700/50"></div>

      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-800/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid w-full gap-12 xl:grid-cols-3 xl:gap-12">
          {/* Logo and Description */}
          <AnimatedContainer className="space-y-6">
            <div className="flex items-center gap-3">
              <Image 
                src="/images/cliste-logo.png" 
                alt="Financial Analytics Platform" 
                width={48} 
                height={48} 
                className="w-12 h-12 object-contain"
              />
              <div>
                <h3 className="text-xl font-bold text-white">Modelisys</h3>
                <p className="text-sm text-slate-400">Plateforme d'Intelligence Financière</p>
              </div>
            </div>
            <div className="text-slate-300 text-sm leading-relaxed max-w-sm space-y-4">
              <p className="italic text-slate-400">
                "Modelisys transforme l'analyse financière en un véritable levier d'efficacité, en mettant en lumière les dynamiques qui façonnent la valeur d'une entreprise."
              </p>
              <div className="pt-3 border-t border-slate-700/50">
                <p className="font-semibold text-white">Tristan Bellerose, CPA, CBV</p>
                <p className="text-slate-400 text-xs mt-1">Président et Fondateur</p>
              </div>
            </div>
          </AnimatedContainer>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:col-span-2 xl:grid-cols-4">
            {footerLinks.map((section, index) => (
              <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                <div>
                  <h3 className="text-sm font-bold text-white mb-5 uppercase tracking-wide">
                    {section.label}
                  </h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        {link.href.startsWith("#") ? (
                          <button
                            onClick={() => scrollToSection(link.href)}
                            className="group text-slate-400 hover:text-white inline-flex items-center gap-2 transition-all duration-200 text-sm"
                          >
                            {link.icon && (
                              <link.icon className="w-4 h-4 group-hover:text-slate-300 transition-colors" />
                            )}
                            <span className="group-hover:translate-x-1 transition-transform inline-block">{link.title}</span>
                          </button>
                        ) : (
                          <a
                            href={link.href}
                            className="group text-slate-400 hover:text-white inline-flex items-center gap-2 transition-all duration-200 text-sm"
                          >
                            {link.icon && (
                              <link.icon className="w-4 h-4 group-hover:text-slate-300 transition-colors" />
                            )}
                            <span className="group-hover:translate-x-1 transition-transform inline-block">{link.title}</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Modelisys. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </div>
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
    return children
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
