import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface StatementHeaderProps {
  title: string
  description: string
  backHref?: string
}

export function StatementHeader({ title, description, backHref }: StatementHeaderProps) {
  return (
    <div className="max-w-6xl mx-auto mb-12">
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </Link>
      )}
      <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4 text-balance">{title}</h1>
      <p className="text-lg text-muted-foreground max-w-2xl text-pretty">{description}</p>
    </div>
  )
}
