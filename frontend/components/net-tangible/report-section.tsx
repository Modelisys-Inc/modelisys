"use client"

import type { ReactNode } from "react"

type ReportSectionProps = {
  id?: string
  number: string
  title: string
  children: ReactNode
}

export function NetTangibleReportSection({ id, number, title, children }: ReportSectionProps) {
  return (
    <section id={id} className="mt-9 scroll-mt-24" data-break-avoid>
      <h2 className="flex items-baseline gap-2.5 border-b-2 border-[#2A2F3A] pb-2 text-base font-semibold text-[#2A2F3A]">
        <span className="font-mono text-sm text-[#E0742D]">{number}</span>
        <span className="text-pretty">{title}</span>
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
