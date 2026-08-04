import type { ReactNode, CSSProperties } from "react"
import { REPORT_CSS_VARS } from "@/lib/report-theme"

/** Évite les coupures de page à l'intérieur d'un bloc (hero + graphique + tableau). */
export function PageBreakAvoid({
  children,
  className = "",
  minHeight,
}: {
  children: ReactNode
  className?: string
  /** Hauteur min avant de permettre un saut (évite pages quasi vides). */
  minHeight?: string
}) {
  return (
    <div
      className={`report-page-break-avoid ${className}`.trim()}
      style={minHeight ? ({ minHeight } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

/** Conteneur de page de contenu avec padding et tokens typographiques. */
export function ReportLayout({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`report-layout ${className}`.trim()}
      style={REPORT_CSS_VARS as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  )
}
