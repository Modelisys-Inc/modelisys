"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { id: "notre-objectif", label: "Objectif" },
  { id: "ce-que-nous-faisons", label: "Services" },
  { id: "approche-modelisys", label: "Approche" },
  { id: "expertise", label: "Expertise" },
  { id: "blog-vedette", label: "Blog" },
  { id: "features", label: "Valeur" },
] as const

function SectionLinks({
  active,
  onSelect,
  className,
  linkClassName,
}: {
  active: string
  onSelect: (id: string) => void
  className?: string
  linkClassName?: string
}) {
  return (
    <ul className={className}>
      {SECTIONS.map((item) => {
        const isActive = item.id === active
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={() => onSelect(item.id)}
              className={cn(
                "block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                isActive
                  ? "border-[#E0742D] font-semibold text-[#2A2F3A]"
                  : "border-transparent text-[#5C5F66] hover:text-[#2A2F3A]",
                linkClassName,
              )}
              aria-current={isActive ? "location" : undefined}
            >
              {item.label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export function LandingHomeRail({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    const nodes = SECTIONS.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => node !== null,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActive(visible.target.id)
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <nav
        aria-label="Sections de la page"
        className="sticky top-16 z-30 border-b border-[#2A2F3A]/10 bg-[#F0F4F8]/95 backdrop-blur lg:hidden"
      >
        <SectionLinks
          active={active}
          onSelect={setActive}
          className="flex gap-1 overflow-x-auto px-3 py-2"
          linkClassName="whitespace-nowrap border-l-0 border-b-2 px-3 py-2"
        />
      </nav>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="hidden bg-[#F0F4F8] lg:block">
          <nav aria-label="Sections de la page" className="sticky top-28 h-fit px-6 py-16 xl:px-8">
            <SectionLinks active={active} onSelect={setActive} className="space-y-0.5" />
          </nav>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  )
}
