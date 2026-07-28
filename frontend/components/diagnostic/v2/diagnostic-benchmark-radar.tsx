"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import { DEFAULT_BENCHMARK } from "@/lib/diagnostic-benchmarks"
import { computeHealthIndex } from "@/lib/diagnostic-derive"
import { useCountUpOnVisible } from "@/components/diagnostic/v2/use-count-up"

interface DiagnosticBenchmarkRadarProps {
  diagnostic: CompanyDiagnostic
  showBenchmark?: boolean
}

const CX = 200
const CY = 150
const R = 112

/**
 * Radar « profil vs secteur » : les cinq piliers de l'indice de santé
 * (échelle 0-100) superposés à la médiane sectorielle.
 *
 * Nouveau composant — il n'existe aucun équivalent aujourd'hui. C'est la
 * réponse visuelle la plus directe à « la société est-elle en bonne santé
 * comparée à ses pairs ».
 */
export function DiagnosticBenchmarkRadar({
  diagnostic,
  showBenchmark = true,
}: DiagnosticBenchmarkRadarProps) {
  const { ref, t } = useCountUpOnVisible<HTMLDivElement>(700)
  const { pillars } = computeHealthIndex(diagnostic, DEFAULT_BENCHMARK)

  if (pillars.length === 0) return null

  const angleOf = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / pillars.length
  const point = (i: number, value: number) => {
    const a = angleOf(i)
    return `${(CX + Math.cos(a) * R * (value / 100)).toFixed(1)},${(CY + Math.sin(a) * R * (value / 100)).toFixed(1)}`
  }

  const rings = [25, 50, 75, 100].map((r) => pillars.map((_, i) => point(i, r)).join(" "))
  const selfPolygon = pillars.map((p, i) => point(i, p.score * t)).join(" ")
  const benchPolygon = pillars.map((p, i) => point(i, p.benchmark)).join(" ")

  return (
    <div ref={ref} className="px-3 pb-1.5 pt-2.5">
      <svg viewBox="0 0 400 320" className="block h-auto w-full overflow-visible">
        {rings.map((points, i) => (
          <polygon key={i} points={points} fill="none" stroke="rgba(230,214,195,.08)" />
        ))}

        {pillars.map((p, i) => {
          const a = angleOf(i)
          const lx = CX + Math.cos(a) * (R + 26)
          const ly = CY + Math.sin(a) * (R + 26) + 4
          const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"
          return (
            <g key={p.key}>
              <line x1={CX} y1={CY} x2={CX + Math.cos(a) * R} y2={CY + Math.sin(a) * R} stroke="rgba(230,214,195,.07)" />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={10} fontWeight={500} fill="rgba(201,184,165,.62)">
                {p.label}
              </text>
            </g>
          )
        })}

        {showBenchmark && (
          <polygon
            points={benchPolygon}
            fill="rgba(224,116,45,.10)"
            stroke="#E0742D"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        <polygon points={selfPolygon} fill="rgba(52,211,153,.16)" stroke="#34D399" strokeWidth={2} />

        {pillars.map((p, i) => {
          const a = angleOf(i)
          return (
            <circle
              key={`dot-${p.key}`}
              cx={CX + Math.cos(a) * R * ((p.score * t) / 100)}
              cy={CY + Math.sin(a) * R * ((p.score * t) / 100)}
              r={3.4}
              fill="#34D399"
              stroke="#1A1E26"
              strokeWidth={1.5}
            />
          )
        })}

        <rect x={112} y={298} width={10} height={10} rx={2} fill="rgba(52,211,153,.5)" stroke="#34D399" />
        <text x={128} y={307} fontSize={10.5} fill="rgba(201,184,165,.7)">
          Société
        </text>
        {showBenchmark && (
          <>
            <rect x={186} y={298} width={10} height={10} rx={2} fill="rgba(224,116,45,.2)" stroke="#E0742D" />
            <text x={202} y={307} fontSize={10.5} fill="rgba(201,184,165,.7)">
              Médiane secteur
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
