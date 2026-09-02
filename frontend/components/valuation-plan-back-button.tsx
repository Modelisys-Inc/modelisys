"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { valuationPlanBackHref } from "@/lib/valuation-registry"

type ValuationPlanBackButtonProps = {
  className?: string
  label?: string
  testId?: string
}

export function ValuationPlanBackButton({
  className,
  label = "Retour aux étapes",
  testId = "valuation-plan-back-button",
}: ValuationPlanBackButtonProps) {
  const searchParams = useSearchParams()
  const href = valuationPlanBackHref(searchParams)

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(
        "mb-4 -ml-1 h-9 px-3 text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]",
        className,
      )}
      data-testid={testId}
    >
      <Link href={href}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
        {label}
      </Link>
    </Button>
  )
}
