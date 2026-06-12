import type { ReactNode } from "react"
import type { HeroFeatureLabel } from "@/lib/hero-features"

type Props = { phase: HeroFeatureLabel }

const CREAM = "#E6D6C3"
const BEIGE = "#C9B8A5"
const ORANGE = "#E0742D"
const GOLD = "#E6B08C"
const TRACK = "rgba(255,255,255,0.12)"
const LABEL = "rgba(230,214,195,0.92)"
const MUTED = "rgba(201,184,165,0.78)"

const COL = {
  decision: 16,
  tres: 228,
  val: 318,
} as const

function ChartBlock({
  label,
  caption,
  children,
  tall = false,
}: {
  label: string
  caption: string
  children: ReactNode
  tall?: boolean
}) {
  return (
    <div className="w-full" role="img" aria-label={label}>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
        {caption}
      </p>
      <svg
        viewBox={tall ? "0 0 360 140" : "0 0 360 112"}
        className={`block w-full ${tall ? "h-36 sm:h-40" : "h-28 w-full sm:h-32"}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {children}
      </svg>
    </div>
  )
}

function DiagnosticChart() {
  const risks = [
    { title: "Concentration client", detail: "45 % des revenus · 3 clients" },
    { title: "BFR sous tension", detail: "Liquidité 1,1 · 68 jours" },
  ]
  const levers = [
    { title: "Diversification", detail: "Réduire la dépendance" },
    { title: "Marge opérationnelle", detail: "+2 pts visés" },
    { title: "Fonds de roulement", detail: "BFR −15 %" },
  ]

  return (
    <ChartBlock caption="Risques & leviers" label="Risques opérationnels et leviers de valeur identifiés">
      <text x="16" y="18" fill={MUTED} fontSize="9" fontWeight="600" letterSpacing="1.2">
        RISQUES
      </text>
      <text x="196" y="18" fill={MUTED} fontSize="9" fontWeight="600" letterSpacing="1.2">
        LEVIERS
      </text>
      <line x1="188" y1="10" x2="188" y2="108" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {risks.map((r, i) => {
        const y = 38 + i * 40
        return (
          <g key={r.title}>
            <circle cx="22" cy={y - 3} r="3" fill={ORANGE} />
            <text x="32" y={y} fill={LABEL} fontSize="10" fontWeight="600">
              {r.title}
            </text>
            <text x="32" y={y + 13} fill={MUTED} fontSize="9" fontWeight="500">
              {r.detail}
            </text>
          </g>
        )
      })}

      {levers.map((l, i) => {
        const y = 38 + i * 30
        return (
          <g key={l.title}>
            <rect x="198" y={y - 5} width="6" height="2" rx="1" fill={GOLD} />
            <text x="210" y={y} fill={LABEL} fontSize="10" fontWeight="600">
              {l.title}
            </text>
            <text x="210" y={y + 12} fill={MUTED} fontSize="9" fontWeight="500">
              {l.detail}
            </text>
          </g>
        )
      })}
    </ChartBlock>
  )
}

function VisionChart() {
  return (
    <ChartBlock
      caption="Vision chiffrée"
      label="Vision : acquisition dans 24 mois et fermeture d'une division vers 7 M dollars en 3 ans"
    >
      <line x1="48" y1="54" x2="312" y2="54" stroke={TRACK} strokeWidth="1.5" />

      <circle cx="52" cy="54" r="8" fill="rgba(224,116,45,0.18)" stroke={ORANGE} strokeWidth="2" />
      <text x="52" y="78" textAnchor="middle" fill={CREAM} fontSize="13" fontWeight="700" fontFamily="ui-monospace, monospace">
        4,2 M$
      </text>
      <text x="52" y="36" textAnchor="middle" fill={BEIGE} fontSize="9" fontWeight="600">
        {"Aujourd'hui"}
      </text>

      <rect x="128" y="34" width="104" height="40" rx="8" fill="rgba(224,116,45,0.1)" stroke={ORANGE} strokeWidth="1.5" />
      <text x="180" y="26" textAnchor="middle" fill={ORANGE} fontSize="9" fontWeight="700">
        Objectif : 3 ans
      </text>
      <text x="180" y="50" textAnchor="middle" fill={LABEL} fontSize="9" fontWeight="600">
        Acquisition
      </text>
      <text x="180" y="64" textAnchor="middle" fill={LABEL} fontSize="9" fontWeight="600">
        Fermeture division
      </text>

      <circle cx="308" cy="54" r="9" fill="rgba(230,176,140,0.15)" stroke={GOLD} strokeWidth="2" />
      <text x="308" y="78" textAnchor="middle" fill={CREAM} fontSize="14" fontWeight="700" fontFamily="ui-monospace, monospace">
        7 M$
      </text>
      <text x="308" y="36" textAnchor="middle" fill={BEIGE} fontSize="9" fontWeight="600">
        Objectif
      </text>

      <line x1="62" y1="54" x2="124" y2="54" stroke={ORANGE} strokeWidth="2" />
      <polygon points="122,54 118,51 118,57" fill={ORANGE} />
      <line x1="236" y1="54" x2="296" y2="54" stroke={GOLD} strokeWidth="2" />
      <polygon points="294,54 290,51 290,57" fill={GOLD} />
    </ChartBlock>
  )
}

function PlanificationChart() {
  const rows = [
    {
      action: "Fermeture division",
      tres: "+180 k$",
      tresColor: GOLD,
      val: "+0,6 M$",
    },
    {
      action: "Acquisition",
      tres: "−850 k$",
      tresColor: ORANGE,
      val: "+2,2 M$",
    },
  ]

  return (
    <ChartBlock
      caption="Projection du scénario"
      label="Modélisation de la vision : impact de la fermeture de division et de l'acquisition sur la trésorerie et la valeur"
    >
      <text x={COL.decision} y="22" fill={MUTED} fontSize="9" fontWeight="600" letterSpacing="1">
        DÉCISION
      </text>
      <text x={COL.tres} y="22" textAnchor="middle" fill={ORANGE} fontSize="9" fontWeight="600" letterSpacing="1">
        TRÉSORERIE
      </text>
      <text x={COL.val} y="22" textAnchor="middle" fill={GOLD} fontSize="9" fontWeight="600" letterSpacing="1">
        VALEUR
      </text>
      <line x1="12" y1="28" x2="348" y2="28" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <line x1="152" y1="28" x2="152" y2="96" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1="272" y1="28" x2="272" y2="96" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      {rows.map((row, i) => {
        const y = 52 + i * 28
        return (
          <g key={row.action}>
            <text x={COL.decision} y={y} fill={LABEL} fontSize="10" fontWeight="500">
              {row.action}
            </text>
            <text
              x={COL.tres}
              y={y}
              textAnchor="middle"
              fill={row.tresColor}
              fontSize="11"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
            >
              {row.tres}
            </text>
            <text
              x={COL.val}
              y={y}
              textAnchor="middle"
              fill={CREAM}
              fontSize="11"
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
            >
              {row.val}
            </text>
          </g>
        )
      })}

      <text x={COL.decision} y="104" fill={MUTED} fontSize="9" fontWeight="500">
        4,2 M$ → 7 M$ après consolidation
      </text>
    </ChartBlock>
  )
}

function ExecutionChart() {
  const scenario = "M 20 30 L 80 22 L 140 16 L 200 12 L 260 8 L 320 6"
  const real = "M 20 30 L 80 26 L 140 22 L 200 20 L 260 22 L 320 24"

  return (
    <ChartBlock tall caption="Réel vs scénario" label="Écart traduit en impact sur la valeur">
      <path d={`${real} L 320 58 L 20 58 Z`} fill={ORANGE} opacity="0.14" />
      <path
        d={scenario}
        fill="none"
        stroke={GOLD}
        strokeWidth="2.5"
        strokeDasharray="6 5"
        strokeLinecap="round"
      />
      <path d={real} fill="none" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />

      <line x1="16" y1="58" x2="324" y2="58" stroke={TRACK} strokeWidth="1" />

      <text x="20" y="82" fill={ORANGE} fontSize="16" fontWeight="700" fontFamily="ui-monospace, monospace">
        −80 k$
      </text>
      <text x="20" y="98" fill={MUTED} fontSize="10" fontWeight="500">
        impact valeur
      </text>

      <circle cx="148" cy="78" r="4" fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="2 2" />
      <text x="158" y="82" fill={LABEL} fontSize="10" fontWeight="600">
        Scénario
      </text>
      <circle cx="148" cy="94" r="4" fill={ORANGE} />
      <text x="158" y="98" fill={LABEL} fontSize="10" fontWeight="600">
        Réel
      </text>
    </ChartBlock>
  )
}

function AdjustmentChart() {
  const sansModelisys = "M 24 88 L 96 82 L 168 78 L 208 76 L 268 74 L 332 68"
  const avecModelisys = "M 24 88 L 96 82 L 168 78 L 208 76 L 268 48 L 332 32"

  return (
    <ChartBlock caption="Plan vivant" label="Scénario recalibré avec Modelisys">
      <line x1="16" y1="98" x2="344" y2="98" stroke={TRACK} strokeWidth="1" />

      <path d={avecModelisys} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <path
        d={sansModelisys}
        fill="none"
        stroke={BEIGE}
        strokeWidth="2.5"
        strokeDasharray="7 5"
        strokeLinecap="round"
        opacity="0.9"
      />

      <path d="M 208 76 L 268 48 L 268 98 L 208 98 Z" fill={ORANGE} opacity="0.1" />
      <line x1="208" y1="28" x2="208" y2="98" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.55" />

      <circle cx="208" cy="76" r="5" fill="rgba(224,116,45,0.2)" stroke={ORANGE} strokeWidth="2" />
      <text x="208" y="112" textAnchor="middle" fill={ORANGE} fontSize="9" fontWeight="700">
        Ajustement
      </text>

      <circle cx="332" cy="68" r="3.5" fill="none" stroke={BEIGE} strokeWidth="2" strokeDasharray="2 2" />
      <text x="332" y="84" textAnchor="end" fill={BEIGE} fontSize="10" fontWeight="600" fontFamily="ui-monospace, monospace">
        5,4 M$
      </text>

      <circle cx="332" cy="32" r="4" fill={GOLD} />
      <text x="332" y="24" textAnchor="end" fill={CREAM} fontSize="12" fontWeight="700" fontFamily="ui-monospace, monospace">
        7 M$
      </text>

      <line x1="16" y1="14" x2="40" y2="14" stroke={BEIGE} strokeWidth="2.5" strokeDasharray="5 4" opacity="0.9" />
      <text x="46" y="17" fill={BEIGE} fontSize="8.5" fontWeight="600">
        Sans Modelisys
      </text>
      <line x1="148" y1="14" x2="172" y2="14" stroke={GOLD} strokeWidth="2.5" />
      <text x="178" y="17" fill={GOLD} fontSize="8.5" fontWeight="600">
        Avec Modelisys
      </text>
    </ChartBlock>
  )
}

const charts: Record<HeroFeatureLabel, () => ReactNode> = {
  Diagnostic: DiagnosticChart,
  Vision: VisionChart,
  Planification: PlanificationChart,
  Exécution: ExecutionChart,
  Ajustement: AdjustmentChart,
}

export function HeroPhaseVisual({ phase }: Props) {
  const Chart = charts[phase]
  return (
    <div key={phase} className="animate-in fade-in-0 duration-300">
      <Chart />
    </div>
  )
}
