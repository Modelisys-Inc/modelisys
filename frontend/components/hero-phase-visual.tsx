import type { HeroPerformancePhase } from "@/lib/hero-performance-phases"
import { HERO_PERFORMANCE_PHASE_CONTENT } from "@/lib/hero-performance-phases"
import { HERO_PHASE_INSIGHTS } from "@/lib/hero-narrative-metrics"

type Props = { phase: HeroPerformancePhase }

function PhaseStepsVisual({ phase }: Props) {
  const { listLabel, items } = HERO_PERFORMANCE_PHASE_CONTENT[phase]

  return (
    <div role="img" aria-label={`${listLabel} — ${items.join(", ")}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/65">{listLabel}</p>
      <ul className="mt-3 space-y-2.5 sm:space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 sm:gap-3">
            <span className="mt-[0.6rem] h-px w-2.5 shrink-0 bg-[#E0742D]/55 sm:w-3" aria-hidden />
            <span className="text-[11px] leading-snug text-[#E6D6C3]/88 sm:text-xs">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function varianceToneClass(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-[#E6B08C]/90"
  if (tone === "negative") return "text-[#E0742D]/90"
  return "text-[#C9B8A5]/75"
}

export function HeroPerformanceMetrics({ phase }: Props) {
  const insights = HERO_PHASE_INSIGHTS[phase]

  return (
    <div key={phase} className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
      {insights.map((insight, index) => (
        <div key={`${phase}-${insight.label}`} className="flex items-center gap-3">
          {index > 0 ? <span className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden /> : null}
          <p className="text-[10px] leading-none text-[#C9B8A5]/65">
            <span className="text-[#C9B8A5]/50">{insight.label}</span>{" "}
            {insight.kind === "snapshot" ? (
              <span className="font-mono tabular-nums text-[#E6D6C3]/85">{insight.value}</span>
            ) : null}
            {insight.kind === "comparison" ? (
              <>
                <span className="font-mono tabular-nums text-[#E6D6C3]/85">{insight.today}</span>
                <span className="mx-1 text-[#E0742D]/55">→</span>
                <span className="font-mono tabular-nums text-[#E6B08C]/85">{insight.target}</span>
              </>
            ) : null}
            {insight.kind === "variance" ? (
              <>
                <span className="text-[#C9B8A5]/45">vs prévu </span>
                <span className={`font-mono tabular-nums ${varianceToneClass(insight.tone)}`}>
                  {insight.value}
                </span>
              </>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  )
}

export function HeroPhaseVisual({ phase }: Props) {
  return (
    <div key={phase} className="animate-in fade-in-0 w-full min-w-0 duration-300">
      <PhaseStepsVisual phase={phase} />
    </div>
  )
}
