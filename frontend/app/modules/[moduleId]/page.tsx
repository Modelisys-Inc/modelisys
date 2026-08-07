import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { COMPANY_MODULES, isCompanyModuleId } from "@/lib/company-module-navigation"

type PageProps = {
  params: Promise<{ moduleId: string }>
}

/** Modules disposant d'une vraie page statique (app/modules/{id}/page.tsx) — exclus du placeholder. */
const MODULES_WITH_DEDICATED_PAGE = new Set<string>(["diagnostic", "pilotage"])

export function generateStaticParams() {
  return COMPANY_MODULES.filter((module) => !MODULES_WITH_DEDICATED_PAGE.has(module.id)).map(
    (module) => ({ moduleId: module.id }),
  )
}

export default async function CompanyModulePage({ params }: PageProps) {
  const { moduleId } = await params
  if (!isCompanyModuleId(moduleId)) notFound()

  const module = COMPANY_MODULES.find((item) => item.id === moduleId)
  if (!module) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-32">
        <div className="absolute inset-0 bg-[#2A2F3A]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9B8A5]/80">
            {module.phaseLabel}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#E6D6C3]">{module.label}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#C9B8A5]/90">{module.description}</p>
        </div>
      </div>

      <main className="relative -mt-16 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm leading-relaxed text-slate-600">
              Ce module sera bientôt enrichi avec les outils et vues dédiés à l&apos;étape{" "}
              <span className="font-medium text-slate-900">{module.label}</span> de votre trajectoire de valeur.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
