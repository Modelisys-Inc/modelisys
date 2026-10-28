import type { ReactNode } from "react"

export type ChartSeries = {
  name: string
  color: string
  values: number[]
}

type ChartProps = {
  labels: string[]
  bars?: ChartSeries[]
  lines?: ChartSeries[]
  stacked?: boolean
  projectedFrom?: number
  linesOn?: "left" | "right"
  fitLeft?: boolean
  fitRight?: boolean
  formatLeft?: (value: number) => string
  formatRight?: (value: number) => string
}

const W = 720
const H = 268
const PAD_L = 48
const PAD_R = 44
const PAD_T = 16
const PAD_B = 32

function niceCeil(value: number) {
  if (value <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  const step =
    n <= 1 ? 1 : n <= 1.2 ? 1.2 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 3 ? 3 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 6 ? 6 : n <= 8 ? 8 : 10
  return step * pow
}

function bounds(values: number[]) {
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 0)
  const bound = niceCeil(Math.max(Math.abs(minV), maxV, 1))
  return { min: minV < 0 ? -bound : 0, max: bound }
}

function axisText(value: number) {
  const abs = Math.abs(Math.round(value)).toLocaleString("fr-CA")
  return value < 0 ? `−${abs}` : abs
}

function fittedDomain(values: number[]) {
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 0)
  const span = Math.max(maxV - minV, 1)
  const step = niceCeil(span / 4)
  const start = Math.floor(minV / step) * step
  let end = Math.ceil(maxV / step) * step
  if (end === start) end = start + step
  if (maxV > end - step * 0.08) end += step
  const count = Math.round((end - start) / step)
  const ticks = Array.from({ length: count + 1 }, (_, index) => {
    const value = start + step * index
    return Math.round(value * 1000) / 1000
  })
  return { min: start, max: end, ticks }
}

export function ReportChart({
  labels,
  bars = [],
  lines = [],
  stacked = false,
  projectedFrom,
  linesOn,
  fitLeft = false,
  fitRight = false,
  formatLeft = axisText,
  formatRight = (value) => `${axisText(value)} %`,
}: ChartProps) {
  const lineValues = lines.flatMap((series) => series.values)
  const linesShareLeft = linesOn ? linesOn === "left" : bars.length === 0
  const barValues = stacked
    ? labels.map((_, index) => bars.reduce((sum, series) => sum + series.values[index], 0))
    : bars.flatMap((series) => series.values)
  const leftSource = linesShareLeft ? [...barValues, ...lineValues] : barValues
  const leftFit = fitLeft ? fittedDomain(leftSource.length ? leftSource : [0, 1]) : null
  const rightFit = fitRight ? fittedDomain(lineValues.length ? lineValues : [0, 1]) : null
  const left = leftFit ?? bounds(leftSource.length ? leftSource : [0, 1])
  const right = rightFit ?? bounds(lineValues.length ? lineValues : [0, 1])
  const padR = !linesShareLeft && right.max >= 100 ? 58 : PAD_R
  const plotW = W - PAD_L - padR
  const plotH = H - PAD_T - PAD_B
  const groupW = plotW / labels.length

  const yLeft = (value: number) => PAD_T + ((left.max - value) / (left.max - left.min)) * plotH
  const yRight = (value: number) => PAD_T + ((right.max - value) / (right.max - right.min)) * plotH
  const yLine = linesShareLeft ? yLeft : yRight
  const zeroY = yLeft(0)

  const leftTicks = leftFit?.ticks ?? Array.from({ length: 5 }, (_, index) => left.min + ((left.max - left.min) * index) / 4)
  const rightTicks = rightFit?.ticks ?? Array.from({ length: 5 }, (_, index) => right.min + ((right.max - right.min) * index) / 4)

  const barCount = Math.max(bars.length, 1)
  const barW = Math.min(18, (groupW * 0.72) / barCount)

  return (
    <figure className="w-full min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-hidden style={{ fontFamily: "inherit" }}>
        {leftTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_L}
              x2={W - padR}
              y1={yLeft(tick)}
              y2={yLeft(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={PAD_L - 8} y={yLeft(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {formatLeft(tick)}
            </text>
          </g>
        ))}
        {!linesShareLeft &&
          rightTicks.map((tick) => (
            <text
              key={tick}
              x={W - padR + 8}
              y={yRight(tick) + 4}
              fontSize="11"
              fill={fitRight && lines[0] ? lines[0].color : "#94a3b8"}
            >
              {formatRight(tick)}
            </text>
          ))}
        {projectedFrom != null && projectedFrom < labels.length && (
          <rect
            x={PAD_L + groupW * projectedFrom}
            y={PAD_T}
            width={plotW - groupW * projectedFrom}
            height={plotH}
            fill="#E0742D"
            opacity="0.08"
          />
        )}
        {left.min < 0 && (
          <line x1={PAD_L} x2={W - padR} y1={zeroY} y2={zeroY} stroke="#94a3b8" strokeWidth="1" />
        )}
        {labels.map((label, index) => {
          const x0 = PAD_L + groupW * index
          const center = x0 + groupW / 2
          return (
            <g key={label}>
              {stacked
                ? bars.reduce<{ top: number; nodes: ReactNode[] }>(
                    (acc, series) => {
                      const value = series.values[index]
                      const y = yLeft(acc.top + value)
                      const height = Math.abs(yLeft(acc.top) - y)
                      const width = Math.min(32, groupW * 0.42)
                      acc.nodes.push(
                        <rect
                          key={series.name}
                          x={center - width / 2}
                          y={Math.min(y, yLeft(acc.top))}
                          width={width}
                          height={Math.max(height, 0)}
                          fill={series.color}
                        />,
                      )
                      acc.top += value
                      return acc
                    },
                    { top: 0, nodes: [] },
                  ).nodes
                : bars.map((series, seriesIndex) => {
                    const value = series.values[index]
                    const y = yLeft(value)
                    const x = center - (barCount * barW) / 2 + seriesIndex * barW
                    const top = Math.min(y, zeroY)
                    return (
                      <rect
                        key={series.name}
                        x={x}
                        y={top}
                        width={Math.max(barW - 2, 2)}
                        height={Math.max(Math.abs(zeroY - y), 0)}
                        fill={series.color}
                      />
                    )
                  })}
              <text x={center} y={H - 10} textAnchor="middle" fontSize="12" fill="#334155">
                {label}
              </text>
            </g>
          )
        })}
        {lines.map((series) => {
          const points = series.values
            .map((value, index) => {
              const x = PAD_L + groupW * index + groupW / 2
              return `${x},${yLine(value)}`
            })
            .join(" ")
          return (
            <g key={series.name}>
              <polyline points={points} fill="none" stroke={series.color} strokeWidth="2.5" />
              {series.values.map((value, index) => (
                <circle
                  key={`${series.name}-${labels[index]}`}
                  cx={PAD_L + groupW * index + groupW / 2}
                  cy={yLine(value)}
                  r="3.5"
                  fill={series.color}
                />
              ))}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600">
        {[...bars, ...lines].map((series, index) => (
          <span key={`${series.name}-${index}`} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2" style={{ backgroundColor: series.color }} aria-hidden />
            {series.name}
          </span>
        ))}
        {projectedFrom != null && <span className="text-[#9A3412]">Bande orangée : projeté</span>}
      </figcaption>
    </figure>
  )
}
