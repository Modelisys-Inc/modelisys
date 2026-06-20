"use client"

import { GitMerge } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CoaPromotionQueue } from "@/components/coa-promotion-queue"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameStaticClass,
  dashboardCardRingClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardTitleClass,
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"

export default function CoaPromotionPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-40">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <div className="mb-8 flex items-start gap-3">
            <div className="w-2" />
            <div className="flex-1">
              <h2 className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
                Promotion des codes
              </h2>
              <p className="mb-4 text-base text-[#C9B8A5]/90">
                Révision des codes de liaison personnalisés en attente
              </p>
              <p className="max-w-4xl text-base leading-relaxed text-[#C9B8A5]/90">
                Quand une société crée un code personnalisé pour une comptabilité complexe, il
                apparaît ici. Promouvez les codes réutilisables vers la charte standardisée
                partagée par toutes les sociétés, ou liez-les à un code existant équivalent.
                Les codes vraiment spécifiques peuvent être rejetés pour rester privés.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className={cn("w-full overflow-hidden", dashboardCardFrameStaticClass)}>
            <div className={dashboardCardRingClass} aria-hidden />
            <div className="relative w-full min-w-0">
              <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className={dashboardCardHeaderIconBoxClass}>
                    <GitMerge className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className={cn("text-xl leading-tight mb-1", dashboardCardTitleClass)}>
                      File de promotion
                    </h2>
                    <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                      Les suggestions (≈) signalent un code global équivalent par signature
                      (famille · flux de trésorerie · type) — liez plutôt que de dupliquer.
                    </p>
                  </div>
                </div>
              </div>

              <CoaPromotionQueue />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
