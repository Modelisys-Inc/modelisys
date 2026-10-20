import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function ServicesOtherServicesSection() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#2A2F3A]/10 pt-8">
      <Link
        href="/#demo"
        className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
      >
        PRENDRE RENDEZ-VOUS
        <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
