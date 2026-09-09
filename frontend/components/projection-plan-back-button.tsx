"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { projectionPlanBackHref } from "@/lib/projection-plan-registry"

type ProjectionPlanBackButtonProps = {
  className?: string
  label?: string
  testId?: string
}

export function ProjectionPlanBackButton({
  className,
  label = "Retour aux étapes",
  testId = "projection-plan-back-button",
}: ProjectionPlanBackButtonProps) {
  const searchParams = useSearchParams()
  const href = projectionPlanBackHref(searchParams)

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
