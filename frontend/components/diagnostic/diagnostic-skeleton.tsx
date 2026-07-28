"use client"

import { Skeleton } from "@/components/ui/skeleton"

/** Squelette de chargement du rapport Diagnostic (thème sombre du rapport). */
export function DiagnosticSkeleton() {
  return (
    <div data-testid="diagnostic-skeleton" className="space-y-6">
      <div className="rounded-2xl bg-[#1A1E26] px-6 py-5 shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]">
        <Skeleton className="h-8 w-72 bg-[rgba(230,214,195,.08)]" />
        <Skeleton className="mt-3 h-4 w-96 bg-[rgba(230,214,195,.08)]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-[rgba(230,214,195,.08)]" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#1A1E26] px-6 py-5 shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]"
        >
          <Skeleton className="h-6 w-56 bg-[rgba(230,214,195,.08)]" />
          <Skeleton className="mt-4 h-64 w-full bg-[rgba(230,214,195,.08)]" />
        </div>
      ))}
    </div>
  )
}
