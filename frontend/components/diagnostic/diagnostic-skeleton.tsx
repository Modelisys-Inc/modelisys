"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { CARD_CLASS } from "@/lib/diagnostic-theme"

/** Squelette de chargement du rapport Diagnostic (thème clair). */
export function DiagnosticSkeleton() {
  return (
    <div data-testid="diagnostic-skeleton" className="space-y-6">
      <div className={`${CARD_CLASS} px-6 py-5`}>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${CARD_CLASS} px-6 py-5`}>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      ))}
    </div>
  )
}
