import { DashboardHeader } from "@/components/dashboard-header"

export default function TableauDeBordPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-32">
        <div className="absolute inset-0 bg-[#2A2F3A]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <h1 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Tableau de bord</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#C9B8A5]/90">
            Vue d&apos;ensemble de votre trajectoire de valeur — situation, progression et prochaines étapes pour la
            société sélectionnée.
          </p>
        </div>
      </div>

      <main className="relative -mt-16 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm leading-relaxed text-slate-600">
              Ce tableau de bord sera bientôt enrichi avec vos indicateurs clés, l&apos;avancement par phase et les
              alertes de pilotage.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
