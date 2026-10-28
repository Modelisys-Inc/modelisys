"use client"

import { Children, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ReportChart } from "@/components/rapport-charts"
import {
  CLAY,
  EXECUTIVE_KPIS,
  INK,
  ORANGE,
  REPORT_YEARS,
  RISKS,
  SAGE,
  SAND,
  STEEL,
  TOC,
  TRAJECTORY_YEARS,
} from "@/lib/rapport-annuel-data"

function k(value: number) {
  const abs = Math.abs(Math.round(value)).toLocaleString("fr-CA")
  return value < 0 ? `(${abs})` : abs
}

function pct(value: number, digits = 1) {
  const abs = Math.abs(value).toLocaleString("fr-CA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return value < 0 ? `(${abs} %)` : `${abs} %`
}

function cell(value: number | string | null, kind: "k" | "pct" | "x" | "n" = "k") {
  if (value == null) return "—"
  if (typeof value === "string") return value
  if (kind === "pct") return pct(value)
  if (kind === "n" || kind === "x") {
    const abs = Math.abs(value).toLocaleString("fr-CA", {
      minimumFractionDigits: 1,
      maximumFractionDigits: kind === "x" ? 2 : 1,
    })
    const text = value < 0 ? `(${abs})` : abs
    return kind === "x" ? `${text}×` : text
  }
  return k(value)
}

function Table({
  years,
  rows,
  unit = "Milliers de dollars",
  shadeFrom,
}: {
  years: readonly string[]
  rows: { label: string; values: (number | string | null)[]; kind?: "k" | "pct" | "x" | "n"; strong?: boolean }[]
  unit?: string
  shadeFrom?: number
}) {
  const shaded = (index: number) => shadeFrom != null && index >= shadeFrom
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[#222732] text-[11px] tracking-wide text-white">
            <th className="py-2.5 pr-4 pl-3 font-medium">{unit}</th>
            {years.map((year) => (
              <th key={year} className="px-2 py-2.5 text-right font-medium last:pr-3">
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.label}-${rowIndex}`} className="border-b border-slate-100">
              <th
                className={`py-2 pr-4 font-medium ${row.strong ? "text-[#222732]" : "text-slate-600"}`}
              >
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={`${row.label}-${years[index]}`}
                  className={`px-2 py-2 text-right tabular-nums ${row.strong ? "font-semibold text-[#222732]" : "text-slate-700"}`}
                  style={shaded(index) ? { backgroundColor: "rgba(224, 116, 45, 0.08)" } : undefined}
                >
                  {cell(value, row.kind)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Notes({ tags, notes }: { tags?: string[]; notes: string[] }) {
  return (
    <aside>
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-[#222732]">Observations</p>
      {tags && tags.length > 0 && (
        <ul className="mt-4 space-y-1">
          {tags.map((tag) => (
            <li key={tag} className="text-[13px] font-medium text-[#E0742D]">
              {tag}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-4 space-y-4 border-l-2 border-[#E0742D] pl-4">
        {notes.map((note) => (
          <li key={note} className="text-sm leading-relaxed text-[#2A2F3A]">
            {note}
          </li>
        ))}
      </ul>
    </aside>
  )
}

function Analysis({
  id,
  eyebrow,
  title,
  chart,
  table,
  tags,
  notes,
}: {
  id?: string
  eyebrow: string
  title: string
  chart: ReactNode
  table: ReactNode
  tags?: string[]
  notes: string[]
}) {
  return (
    <section id={id} className="bg-white px-5 py-8 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.62fr)]">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#E0742D]">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#222732] sm:text-2xl">{title}</h3>
          <div className="mt-6">{chart}</div>
          <details className="mt-6 border-t border-slate-200 pt-3">
            <summary className="cursor-pointer text-sm font-medium text-[#222732]">
              Tableau chiffré
            </summary>
            <div className="mt-4">{table}</div>
          </details>
        </div>
        <Notes tags={tags} notes={notes} />
      </div>
    </section>
  )
}

function CoverBand({
  id,
  title,
  lede,
}: {
  id: string
  title: string
  lede: string
}) {
  const repeatsNav = TOC.some((item) => item.label === title)
  return (
    <header id={id} className="bg-white px-5 pt-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {!repeatsNav && (
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-[#222732] sm:text-3xl">{title}</h2>
        )}
        <p className={`max-w-2xl text-sm leading-relaxed text-slate-600 ${repeatsNav ? "" : "mt-2"}`}>{lede}</p>
      </div>
    </header>
  )
}

function Paged({ labels, children }: { labels: string[]; children: ReactNode }) {
  const items = Children.toArray(children).filter((child) => typeof child !== "string")
  const [index, setIndex] = useState(0)
  const safe = Math.min(index, Math.max(items.length - 1, 0))

  return (
    <div className="border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="mx-auto max-w-6xl py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {safe + 1} / {items.length}
          </p>
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              disabled={safe === 0}
              onClick={() => setIndex(safe - 1)}
              className="font-medium text-[#222732] disabled:opacity-30"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={safe >= items.length - 1}
              onClick={() => setIndex(safe + 1)}
              className="font-medium text-[#E0742D] disabled:opacity-30"
            >
              Suivant
            </button>
          </div>
        </div>
        <div role="tablist" aria-label="Analyses de la section" className="mt-3 flex gap-5 overflow-x-auto border-b border-slate-200">
          {labels.map((label, labelIndex) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={labelIndex === safe}
              onClick={() => setIndex(labelIndex)}
              className={`shrink-0 border-b-2 pb-2 text-sm ${
                labelIndex === safe
                  ? "border-[#E0742D] font-semibold text-[#222732]"
                  : "border-transparent text-slate-500 hover:text-[#222732]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">{items[safe]}</div>
    </div>
  )
}

export function RapportAnnuelView() {
  const chapters = TOC.map((item) => ({ id: item.href.slice(1), index: item.index, label: item.label }))
  const [chapter, setChapter] = useState(chapters[0].id)
  const chapterIndex = Math.max(0, chapters.findIndex((item) => item.id === chapter))
  const nextChapter = chapters[chapterIndex + 1]
  const chapterBarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const bar = chapterBarRef.current
    if (!bar) return
    let frame = 0
    let followUntil = 0
    const sync = () => {
      const site = document.querySelector("nav.fixed")
      const offset = Math.max(0, site ? site.getBoundingClientRect().bottom : 0)
      bar.style.top = `${offset}px`
      bar.style.scrollMarginTop = `${offset}px`
    }
    const track = (now: number) => {
      sync()
      frame = now < followUntil ? requestAnimationFrame(track) : 0
    }
    const onScroll = () => {
      followUntil = performance.now() + 650
      if (!frame) frame = requestAnimationFrame(track)
    }
    sync()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  function openChapter(id: string) {
    setChapter(id)
    requestAnimationFrame(() => {
      document.getElementById("rapport-chapitres")?.scrollIntoView({ block: "start" })
    })
  }

  return (
    <main className="bg-white pt-16 text-[#222732]">
      <header className="bg-white px-5 pt-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Diagnostic financier et planification
          </h1>
          <p className="text-xs leading-relaxed text-slate-500 sm:text-right">
            Privé et confidentiel
            <br />
            Période se terminant le 31 décembre 2025
            <br />
            Exemple illustratif
          </p>
        </div>
      </header>

      <nav
        ref={chapterBarRef}
        id="rapport-chapitres"
        aria-label="Sections du rapport"
        className="sticky top-0 z-40 border-b border-slate-200 bg-white px-5 sm:px-8"
      >
        <ul className="mx-auto flex max-w-6xl gap-4 overflow-x-auto py-2">
          {chapters.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === chapter ? "true" : undefined}
                onClick={() => openChapter(item.id)}
                className={`inline-flex items-baseline gap-2 whitespace-nowrap border-b-2 py-3 text-sm ${
                  item.id === chapter
                    ? "border-[#E0742D] font-semibold text-[#222732]"
                    : "border-transparent text-slate-500 hover:text-[#222732]"
                }`}
              >
                <span>{item.index}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="overflow-x-clip">
      {chapter === "sommaire" && (
      <>
      <CoverBand
        id="sommaire"
        title="Sommaire exécutif"
        lede="Les indicateurs qui ont bougé, et la lecture que la direction peut en faire sur cinq exercices."
      />

      <section className="border-b border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium text-[#E0742D]">Tableau de bord</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Exercice 2025</h3>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {EXECUTIVE_KPIS.map((kpi) => (
              <div key={kpi.label} className="border-t-2 border-[#222732] pt-3">
                <dd className="text-xl font-semibold tabular-nums tracking-tight text-[#222732]">{kpi.value}</dd>
                <dt className="mt-1 text-[12px] text-slate-500">{kpi.label}</dt>
                <dd className="mt-1 text-[12px] font-medium text-[#E0742D]">{kpi.delta}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.7fr)]">
            <Table
              years={REPORT_YEARS}
              rows={[
                { label: "Revenus", values: [1562, 1838, 2149, 2532, 2979], strong: true },
                { label: "Croissance", values: ["s/o", 17.6, 16.9, 17.8, 17.6], kind: "pct" },
                { label: "Contribution marginale", values: [656, 825, 1008, 1268, 1565], strong: true },
                { label: "Marge de contribution", values: [42, 44.9, 46.9, 50.1, 52.5], kind: "pct" },
                { label: "Bénéfice net", values: [-37, 66, 164, 322, 507], strong: true },
                { label: "Marge nette", values: [-2.4, 3.6, 7.6, 12.7, 17], kind: "pct" },
                { label: "BAIIA", values: [13, 127, 249, 442, 670], strong: true },
                { label: "Marge du BAIIA", values: [0.8, 6.9, 11.6, 17.5, 22.5], kind: "pct" },
              ]}
            />
            <Notes
              notes={[
                "Les revenus atteignent 2 979 k$ en 2025, en hausse de 17,6 %. Depuis 2021, ils passent de 1 562 k$ à 2 979 k$, avec une croissance annuelle comprise entre 16,9 % et 17,8 %.",
                "La marge de contribution gagne 2,5 points sur l’exercice, à 52,5 %. La contribution marginale s’établit à 1 565 k$.",
                "Le bénéfice net passe d’une perte de 37 k$ en 2021 à 507 k$. La marge nette atteint 17,0 %, en hausse de 4,3 points.",
                "Le BAIIA atteint 670 k$, soit 22,5 % des revenus, contre 0,8 % en 2021. La marge gagne 5,0 points en 2025.",
                "La Société n’a pas de dette portant intérêt. Le sommaire retient un flux de trésorerie disponible de 501 k$, un excédent de 1 197 k$ et une valeur illustrative des actions de 4,9 M$ à 5,4 M$.",
              ]}
            />
          </div>
        </div>
      </section>
      </>
      )}

      {chapter === "apercu" && (
      <>
      <CoverBand
        id="apercu"
        title="Aperçu de la Société"
        lede="Le cadre de l’entreprise, puis la cotation du modèle d’affaires."
      />

      <section className="border-b border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium text-[#E0742D]">Modèle d’affaires</p>
          <h3 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight sm:text-2xl">
            Risques opérationnels
          </h3>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700">
            La cotation dit ce qui rend les revenus prévisibles ou fragiles : la clientèle, la durée
            des contrats, les personnes qui portent l’activité. Trois risques sont élevés, trois sont
            modérés. Les autres restent faibles.
          </p>
          <div className="mt-10 space-y-10">
            {(
              [
                {
                  level: "élevé",
                  title: "Élevés",
                  note: "Ces trois risques pèsent sur la valeur. Une clientèle concentrée rend une part des revenus remplaçable : la perte d’un client important réduit le BAIIA, et le multiple qu’un repreneur accepte de payer. Des contrats courts limitent la visibilité et tirent ce multiple vers le bas. Des personnes-clés qui détiennent les relations et le savoir-faire rendent l’entreprise moins transférable : la valeur tient alors à leur maintien, pas seulement aux chiffres.",
                  card: "border-[#E0742D]/35 bg-[rgba(224,116,45,0.08)]",
                  badge: "bg-[#E0742D] text-white",
                },
                {
                  level: "modéré",
                  title: "Modérés",
                  note: "Ils n’empêchent pas l’activité, mais ils peuvent comprimer les marges ou ralentir la croissance si le contexte se durcit.",
                  card: "border-[#C4B5A4] bg-[#FBF7F2]",
                  badge: "bg-[#8C5A3C] text-white",
                },
                {
                  level: "faible",
                  title: "Faibles",
                  note: "Ils sont suivis, sans peser aujourd’hui sur la lecture de la valeur.",
                  card: "border-slate-200 bg-white",
                  badge: "bg-[#E7F0EB] text-[#3F6F5B]",
                },
              ] as const
            ).map((group) => (
              <div key={group.level}>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${group.badge}`}>
                    {group.title}
                  </span>
                  <span className="text-sm text-slate-500">
                    {RISKS.filter((risk) => risk.level === group.level).length}
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">{group.note}</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {RISKS.filter((risk) => risk.level === group.level).map((risk) => (
                    <li key={risk.title} className={`border px-4 py-4 ${group.card}`}>
                      <p className="text-sm font-semibold text-[#222732]">{risk.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{risk.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {chapter === "performance" && (
      <>
      <CoverBand
        id="performance"
        title="Performance financière"
        lede="Une analyse à la fois : la Société, puis Software, puis Conseil."
      />
      <Paged labels={["Tendance", "Divisions", "Structure", "Coûts variables", "Coûts fixes", "Seuil", "Rentabilité", "Software", "Conseil"]}>
      <Analysis
        eyebrow="Société"
        title="Tendance des résultats"
        tags={["Croissance soutenue", "Amélioration de la contribution", "Fort levier opérationnel"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Revenus", color: INK, values: [1562, 1838, 2149, 2532, 2979] },
              { name: "Contribution marginale", color: SAND, values: [656, 825, 1008, 1268, 1565] },
              { name: "BAIIA", color: ORANGE, values: [13, 127, 249, 442, 670] },
            ]}
            lines={[
              { name: "Marge de contribution", color: STEEL, values: [42, 44.9, 46.9, 50.1, 52.5] },
              { name: "Marge du BAIIA", color: CLAY, values: [0.8, 6.9, 11.6, 17.5, 22.5] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus", values: [1562, 1838, 2149, 2532, 2979], strong: true },
              { label: "Croissance des revenus", values: ["s/o", 276, 311, 383, 446] },
              { label: "Croissance", values: ["s/o", 17.6, 16.9, 17.8, 17.6], kind: "pct" },
              { label: "Contribution marginale", values: [656, 825, 1008, 1268, 1565], strong: true },
              { label: "Variation de la marge", values: ["s/o", 2.9, 2, 3.1, 2.5], kind: "pct" },
              { label: "BAIIA", values: [13, 127, 249, 442, 670], strong: true },
              { label: "Croissance du BAIIA", values: ["s/o", 114, 122, 193, 228] },
              { label: "Conversion incrémentale", values: ["s/o", 41.4, 39.2, 50.5, 51.1], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Les revenus passent de 1 562 k$ à 2 979 k$. En 2025, la croissance est de 17,6 %, soit 446 k$.",
          "La marge de contribution atteint 52,5 % en 2025, en hausse de 10,5 points depuis 2021. Le mouvement reflète une meilleure maîtrise des coûts variables et une évolution favorable du mix.",
          "La marge du BAIIA passe de 0,8 % à 22,5 %. La croissance des revenus s’est traduite par une progression importante de la rentabilité.",
          "En 2025, le BAIIA augmente de 228 k$ et la conversion incrémentale atteint 51,1 %. Le rythme de croissance du BAIIA, à 51,5 %, est plus bas qu’en 2024 (77,6 %).",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Revenus par division"
        tags={["Software, moteur principal", "Conseil gagne du terrain"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Revenus Software", color: INK, values: [1147, 1334, 1552, 1810, 2103] },
              { name: "Revenus Conseil", color: ORANGE, values: [415, 504, 598, 722, 875] },
            ]}
            lines={[
              { name: "Part Software", color: STEEL, values: [73, 73, 72, 71, 71] },
              { name: "Part Conseil", color: CLAY, values: [27, 27, 28, 29, 29] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus Software", values: [1147, 1334, 1552, 1810, 2103], strong: true },
              { label: "Croissance Software", values: ["s/o", 16, 16, 17, 16], kind: "pct" },
              { label: "Part Software", values: [73, 73, 72, 71, 71], kind: "pct" },
              { label: "Revenus Conseil", values: [415, 504, 598, 722, 875], strong: true },
              { label: "Croissance Conseil", values: ["s/o", 21, 19, 21, 21], kind: "pct" },
              { label: "Part Conseil", values: [27, 27, 28, 29, 29], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Les revenus de Software atteignent 2 103 k$ en 2025 et représentent 71 % du total. Ils ont presque doublé depuis 2021 et portent l’essentiel de la croissance.",
          "Les revenus de Conseil atteignent 875 k$, en hausse de 21 %. Leur poids passe de 27 % en 2021 à 29 % en 2025.",
          "Depuis 2021, Software a ajouté 956 k$ de revenus et Conseil 460 k$. Les deux lignes progressent. Software reste prépondérante.",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Structure de coûts"
        tags={["Coûts variables 47 %", "Coûts fixes 30 %"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            stacked
            bars={[
              { name: "Coûts variables", color: STEEL, values: [907, 1013, 1141, 1265, 1414] },
              { name: "Coûts fixes", color: SAND, values: [652, 710, 771, 838, 908] },
              { name: "Bénéfice opérationnel", color: ORANGE, values: [3, 115, 238, 430, 657] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus", values: [1562, 1838, 2149, 2532, 2979], strong: true },
              { label: "Coûts variables", values: [907, 1013, 1141, 1265, 1414] },
              { label: "Coûts variables / revenus", values: [58, 55, 53, 50, 47], kind: "pct" },
              { label: "Contribution marginale", values: [656, 825, 1008, 1268, 1565], strong: true },
              { label: "Coûts fixes", values: [652, 710, 771, 838, 908] },
              { label: "Coûts fixes / revenus", values: [42, 39, 36, 33, 30], kind: "pct" },
              { label: "Bénéfice opérationnel", values: [3, 115, 238, 430, 657], strong: true },
              { label: "BAIIA", values: [13, 127, 249, 442, 670], strong: true },
            ]}
          />
        }
        notes={[
          "Les coûts variables passent de 58 % à 47 % des revenus. Les coûts fixes passent de 42 % à 30 %.",
          "Le bénéfice opérationnel atteint 657 k$ en 2025, soit 22,1 % des revenus, contre 3 k$ et 0,2 % en 2021.",
          "Le BAIIA de 670 k$ comprend un produit net de 13 k$ au titre des autres éléments.",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Cinq principaux coûts variables"
        tags={["Main-d’œuvre directe", "Top 5 = 93 % des coûts variables"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Main-d’œuvre directe", color: INK, values: [32, 31, 29, 28, 26] },
              { name: "Charges informatiques", color: STEEL, values: [7, 7, 6, 6, 6] },
              { name: "Publicité", color: ORANGE, values: [6, 6, 5, 5, 5] },
              { name: "Sous-traitance", color: CLAY, values: [6, 6, 5, 5, 5] },
              { name: "Salaires", color: SAGE, values: [3, 3, 3, 2, 2] },
            ]}
            formatLeft={(value) => `${Math.round(value)} %`}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            unit="% des revenus"
            rows={[
              { label: "Main-d’œuvre directe", values: [32, 31, 29, 28, 26], strong: true, kind: "pct" },
              { label: "Charges informatiques", values: [7, 7, 6, 6, 6], kind: "pct" },
              { label: "Publicité et promotion", values: [6, 6, 5, 5, 5], kind: "pct" },
              { label: "Sous-traitance", values: [6, 6, 5, 5, 5], kind: "pct" },
              { label: "Salaires et charges sociales", values: [3, 3, 3, 2, 2], kind: "pct" },
              { label: "Total du top 5", values: [54, 51, 49, 46, 44], strong: true, kind: "pct" },
              { label: "Poids dans les coûts variables", values: [93, 93, 93, 93, 93], kind: "pct" },
            ]}
          />
        }
        notes={[
          "La main-d’œuvre directe demeure le premier poste, à 26 % des revenus en 2025, contre 32 % en 2021. Elle représente environ 56 % des coûts variables.",
          "Les cinq principaux postes pèsent 44 % des revenus et 93 % des coûts variables. La concentration aide le pilotage et rend le résultat sensible au coût de la main-d’œuvre.",
          "Informatique, publicité, sous-traitance et salaires reculent ensemble, de 22 % à 18 % des revenus.",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Cinq principaux coûts fixes"
        tags={["Salaires 22 % des revenus", "Écart de croissance d’environ 9 pts"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Salaires", color: INK, values: [29, 27, 26, 24, 22] },
              { name: "Loyer", color: STEEL, values: [4, 3, 3, 3, 2] },
              { name: "Honoraires", color: ORANGE, values: [3, 3, 3, 2, 2] },
              { name: "Formation", color: CLAY, values: [2, 2, 2, 2, 2] },
              { name: "Informatique", color: SAGE, values: [1, 1, 1, 1, 1] },
            ]}
            formatLeft={(value) => `${Math.round(value)} %`}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            unit="% des revenus"
            rows={[
              { label: "Salaires et charges sociales", values: [29, 27, 26, 24, 22], strong: true, kind: "pct" },
              { label: "Loyer", values: [4, 3, 3, 3, 2], kind: "pct" },
              { label: "Honoraires professionnels", values: [3, 3, 3, 2, 2], kind: "pct" },
              { label: "Formation", values: [2, 2, 2, 2, 2], kind: "pct" },
              { label: "Charges informatiques", values: [1, 1, 1, 1, 1], kind: "pct" },
              { label: "Total du top 5", values: [39, 37, 34, 31, 29], strong: true, kind: "pct" },
              { label: "Poids dans les coûts fixes", values: [95, 95, 95, 95, 95], kind: "pct" },
              { label: "Croissance des revenus", values: ["s/o", 18, 17, 18, 18], kind: "pct" },
              { label: "Croissance des coûts fixes", values: ["s/o", 9, 9, 9, 8], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Les salaires passent de 29 % à 22 % des revenus. Le top 5 représente 95 % des coûts fixes, et 72 % de ces coûts sont des salaires en 2025.",
          "Les revenus croissent d’environ 18 % par année, les coûts fixes de 8 % à 9 %. L’écart, proche de 9 points, mesure le levier d’exploitation.",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Seuil de rentabilité"
        tags={["Marge de sécurité 42 %", "Point mort à 58 % des revenus"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Seuil de rentabilité", color: INK, values: [1555, 1582, 1643, 1673, 1728] },
              { name: "Marge de sécurité", color: ORANGE, values: [8, 256, 506, 859, 1251] },
            ]}
            lines={[{ name: "Marge de sécurité (%)", color: STEEL, values: [0.5, 13.9, 23.6, 33.9, 42] }]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus", values: [1562, 1838, 2149, 2532, 2979], strong: true },
              { label: "Seuil de rentabilité", values: [1555, 1582, 1643, 1673, 1728], strong: true },
              { label: "Marge de sécurité", values: [8, 256, 506, 859, 1251] },
              { label: "Marge de sécurité (%)", values: [0.5, 13.9, 23.6, 33.9, 42], kind: "pct" },
              { label: "Seuil / revenus", values: [99.5, 86.1, 76.4, 66.1, 58], kind: "pct" },
              { label: "Taux de contribution", values: [42, 44.9, 46.9, 50.1, 52.5], kind: "pct" },
              { label: "Bénéfice opérationnel", values: [3, 115, 238, 430, 657], strong: true },
              { label: "Marge opérationnelle", values: [0.2, 6.2, 11.1, 17, 22.1], kind: "pct" },
            ]}
          />
        }
        notes={[
          "La marge de sécurité atteint 1 251 k$ en 2025, soit 42,0 % des revenus, contre 8 k$ et 0,5 % en 2021.",
          "Le seuil passe de 1 555 k$ à 1 728 k$, pendant que les revenus passent de 1 562 k$ à 2 979 k$. Le point mort recule de 99,5 % à 58,0 % des revenus.",
          "Le taux de contribution passe de 42,0 % à 52,5 %. Avec un bénéfice opérationnel de 657 k$, les revenus pourraient diminuer d’environ 42 % avant le point mort.",
        ]}
      />

      <Analysis
        eyebrow="Société"
        title="Rentabilité des divisions"
        tags={["Software ≈ 90 % du résultat", "Conseil franchit le seuil"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Bénéfice opérationnel Software", color: INK, values: [136, 214, 307, 439, 594] },
              { name: "Bénéfice opérationnel Conseil", color: ORANGE, values: [-133, -100, -69, -9, 63] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus Software", values: [1147, 1334, 1552, 1810, 2103] },
              { label: "Contribution Software", values: [500, 611, 737, 907, 1101] },
              { label: "Marge Software", values: [44, 46, 47, 50, 52], kind: "pct" },
              { label: "Bénéfice opérationnel Software", values: [136, 214, 307, 439, 594], strong: true },
              { label: "Marge opérationnelle Software", values: [12, 16, 20, 24, 28], kind: "pct" },
              { label: "Revenus Conseil", values: [415, 504, 598, 722, 875] },
              { label: "Contribution Conseil", values: [156, 215, 272, 361, 464] },
              { label: "Marge Conseil", values: [38, 43, 45, 50, 53], kind: "pct" },
              { label: "Bénéfice opérationnel Conseil", values: [-133, -100, -69, -9, 63], strong: true },
              { label: "Marge opérationnelle Conseil", values: [-32, -20, -12, -1, 7], kind: "pct" },
            ]}
          />
        }
        notes={[
          "En 2025, Software génère 1 101 k$ de contribution et 594 k$ de bénéfice opérationnel, soit environ 90 % du résultat opérationnel de la Société.",
          "La marge de contribution de Conseil atteint 53 % en 2025, contre 38 % en 2021. Le gain dépasse celui de Software, dont la marge passe de 44 % à 52 %.",
          "Le bénéfice opérationnel de Conseil devient positif à 63 k$, après une perte de 133 k$ en 2021. La marge opérationnelle reste de 7 %, contre 28 % pour Software.",
        ]}
      />

      <Analysis
        id="performance-software"
        eyebrow="Division Software"
        title="Tendance et lignes de revenus"
        tags={["Croissance ~16 %", "BAIIA 28,2 %", "SaaS à 50 %"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Abonnements SaaS", color: INK, values: [522, 625, 740, 871, 1048] },
              { name: "Développement sur mesure", color: STEEL, values: [264, 296, 342, 393, 444] },
              { name: "Implantation", color: SAND, values: [190, 216, 243, 284, 312] },
              { name: "Support technique", color: ORANGE, values: [171, 196, 227, 262, 299] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus", values: [1147, 1334, 1552, 1810, 2103], strong: true },
              { label: "Croissance", values: ["s/o", 16.3, 16.3, 16.6, 16.2], kind: "pct" },
              { label: "Marge de contribution", values: [43.5, 45.8, 47.5, 50.1, 52.3], kind: "pct" },
              { label: "BAIIA", values: [136, 214, 307, 439, 594], strong: true },
              { label: "Marge du BAIIA", values: [11.8, 16.1, 19.8, 24.3, 28.2], kind: "pct" },
              { label: "Conversion incrémentale", values: ["s/o", 42.1, 42.4, 51.2, 52.8], kind: "pct" },
              { label: "Abonnements SaaS", values: [522, 625, 740, 871, 1048] },
              { label: "Part SaaS", values: [46, 47, 48, 48, 50], kind: "pct" },
              { label: "Développement sur mesure", values: [264, 296, 342, 393, 444] },
              { label: "Implantation", values: [190, 216, 243, 284, 312] },
              { label: "Support technique", values: [171, 196, 227, 262, 299] },
            ]}
          />
        }
        notes={[
          "Les revenus passent de 1 147 k$ à 2 103 k$, soit une croissance d’environ 16,4 % par année. En 2025, la croissance est de 16,2 %.",
          "La marge de contribution atteint 52,3 %. La marge du BAIIA passe de 11,8 % à 28,2 %. Environ 52,8 % des revenus additionnels de 2025 ont été convertis en BAIIA.",
          "Les abonnements SaaS passent de 522 k$ à 1 048 k$ et représentent 50 % des revenus de la division, contre 46 % en 2021. Le développement sur mesure, l’implantation et le support pèsent 21 %, 15 % et 14 %.",
          "La marge de sécurité atteint 1 135 k$, soit 53,9 % des revenus, contre 27,2 % en 2021. Le seuil s’établit à 969 k$. Le point mort passe de 72,8 % à 46,1 % des revenus.",
        ]}
      />

      <Analysis
        id="performance-conseil"
        eyebrow="Division Conseil"
        title="Tendance, lignes de revenus et seuil"
        tags={["Croissance ~20 %", "BAIIA de −31,9 % à 7,2 %", "Seuil franchi en 2025"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Conseil stratégique", color: INK, values: [170, 207, 249, 300, 375] },
              { name: "Conseil opérationnel", color: STEEL, values: [111, 130, 159, 195, 235] },
              { name: "Accompagnement", color: SAND, values: [87, 104, 122, 145, 171] },
              { name: "Audit / diagnostic", color: ORANGE, values: [47, 63, 68, 83, 94] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Revenus", values: [415, 504, 598, 722, 875], strong: true },
              { label: "Croissance", values: ["s/o", 21.4, 18.5, 20.9, 21.1], kind: "pct" },
              { label: "Marge de contribution", values: [37.6, 42.6, 45.4, 50, 53], kind: "pct" },
              { label: "BAIIA", values: [-133, -100, -69, -9, 63], strong: true },
              { label: "Marge du BAIIA", values: [-31.9, -19.8, -11.6, -1.2, 7.2], kind: "pct" },
              { label: "Conversion incrémentale", values: ["s/o", 37, 32.5, 48.4, 47.1], kind: "pct" },
              { label: "Conseil stratégique", values: [170, 207, 249, 300, 375] },
              { label: "Conseil opérationnel", values: [111, 130, 159, 195, 235] },
              { label: "Audit / diagnostic", values: [47, 63, 68, 83, 94] },
              { label: "Accompagnement", values: [87, 104, 122, 145, 171] },
              { label: "Seuil de rentabilité", values: [768, 738, 750, 740, 756] },
              { label: "Marge de sécurité", values: [-353, -234, -152, -18, 119], strong: true },
              { label: "Marge de sécurité (%)", values: [-84.9, -46.4, -25.5, -2.5, 13.6], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Les revenus passent de 415 k$ à 875 k$, soit une croissance annualisée d’environ 20,5 %. En 2025, ils augmentent de 21,1 % et le BAIIA de 72 k$.",
          "La marge de contribution atteint 53,0 %, en hausse de 15,4 points depuis 2021. La marge du BAIIA passe de −31,9 % à 7,2 %. Environ 47,1 % des revenus additionnels de 2025 ont été convertis en BAIIA.",
          "Le conseil stratégique représente 43 % des revenus de la division. Le conseil opérationnel reste autour de 27 %, l’accompagnement à 20 % et l’audit à 11 %.",
          "La marge de sécurité devient positive en 2025, à 119 k$, soit 13,6 % des revenus. Elle était négative de 353 k$ en 2021. Le point mort passe de 184,9 % à 86,4 % des revenus : la division franchit son seuil, avec une marge de manœuvre encore mince.",
        ]}
      />
      </Paged>
      </>
      )}

      {chapter === "situation" && (
      <>
      <CoverBand
        id="situation"
        title="Situation financière"
        lede="Bilan, fonds de roulement, investissements, puis le pont de trésorerie."
      />
      <Paged labels={["Bilan", "Fonds de roulement", "Investissements", "Trésorerie"]}>
      <Analysis
        eyebrow="Bilan"
        title="Structure financière"
        tags={["Actif 1,6 M$", "Autonomie 79,8 %", "Trésorerie nette 2,1× le BAIIA"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Actif total", color: INK, values: [375, 466, 656, 1013, 1558] },
              { name: "Passif total", color: SAND, values: [191, 217, 243, 277, 315] },
              { name: "Capitaux propres", color: ORANGE, values: [183, 250, 414, 736, 1243] },
            ]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Actif à court terme", values: [281, 397, 627, 1014, 1610] },
              { label: "Actif à long terme", values: [94, 70, 29, -1, -52] },
              { label: "Total de l’actif", values: [375, 466, 656, 1013, 1558], strong: true },
              { label: "Passif à court terme", values: [152, 204, 240, 274, 312] },
              { label: "Passif total", values: [191, 217, 243, 277, 315] },
              { label: "Capitaux propres", values: [183, 250, 414, 736, 1243], strong: true },
              { label: "Dette portant intérêt", values: [37, 1, 1, 0, 0] },
              { label: "Trésorerie nette", values: [113, 238, 460, 818, 1391] },
              { label: "Passif / capitaux propres", values: [1.04, 0.87, 0.59, 0.38, 0.25], kind: "x" },
            ]}
          />
        }
        notes={[
          "L’actif total passe de 375 k$ en 2021 à 1 558 k$ en 2025. L’encaisse représente 89,3 % de l’actif en 2025.",
          "Les capitaux propres atteignent 1 243 k$, contre 183 k$ en 2021. L’autonomie financière passe de 49,0 % à 79,8 %.",
          "La dette portant intérêt passe de 37 k$ à près de zéro. La trésorerie nette est de 1,4 M$, soit environ 2,1 fois le BAIIA.",
          "Le passif à court terme représente 99 % du passif, surtout des produits reportés et des fournisseurs. Le ratio passif / capitaux propres recule de 1,04× à 0,25×.",
        ]}
      />

      <Analysis
        eyebrow="Liquidité"
        title="Fonds de roulement et cycle d’exploitation"
        tags={["Liquidité 5,16×", "FdRHC 4,2 % des revenus", "Cycle de 8,9 jours"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Actif à court terme", color: INK, values: [281, 397, 627, 1014, 1610] },
              { name: "Passif à court terme", color: SAND, values: [152, 204, 240, 274, 312] },
              { name: "Fonds de roulement", color: ORANGE, values: [129, 193, 387, 739, 1298] },
            ]}
            lines={[{ name: "FdR hors caisse", color: STEEL, values: [69, 81, 93, 110, 125] }]}
            linesOn="left"
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Fonds de roulement", values: [129, 193, 387, 739, 1298], strong: true },
              { label: "Liquidité générale", values: [1.85, 1.95, 2.61, 3.69, 5.16], kind: "x" },
              { label: "Fonds de roulement / revenus", values: [8.2, 10.5, 18, 29.2, 43.6], kind: "pct" },
              { label: "FdR hors caisse", values: [69, 81, 93, 110, 125], strong: true },
              { label: "FdRHC / revenus", values: [4.4, 4.4, 4.3, 4.4, 4.2], kind: "pct" },
              { label: "Délai clients (jours)", values: [24.7, 24.3, 24.2, 24.5, 23.6], kind: "n" },
              { label: "Délai fournisseurs (jours)", values: [14.3, 14.2, 14.2, 14.7, 14.7], kind: "n" },
              { label: "Cycle de conversion (jours)", values: [10.4, 10.1, 9.9, 9.7, 8.9], kind: "n" },
            ]}
          />
        }
        notes={[
          "Le fonds de roulement passe de 129 k$ à 1 298 k$. Le ratio de liquidité générale atteint 5,16×, contre 1,85× en 2021.",
          "Le fonds de roulement hors caisse s’établit à 125 k$, soit 4,2 % des revenus. La croissance mobilise donc peu de liquidités hors encaisse.",
          "Les clients paient en 23,6 jours et les fournisseurs sont réglés en 14,7 jours. Le cycle de conversion est de 8,9 jours, contre 10,4 jours en 2021. Il n’y a pas de stocks.",
          "Les comptes clients atteignent 193 k$ (6,5 % des revenus). Les fournisseurs et charges à payer totalisent 94 k$. Les produits reportés atteignent 209 k$, soit environ 26 jours de revenus : ces encaissements anticipés financent le cycle sans coût.",
        ]}
      />

      <Analysis
        eyebrow="Investissements"
        title="Capex, amortissement et vétusté"
        tags={["Capex 2025 : 11 k$", "Vétusté 125,5 %", "VCN −59 k$"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Capex", color: INK, values: [160, 21, 11, 27, 11] },
              { name: "Amortissement", color: ORANGE, values: [43, 46, 51, 57, 62] },
            ]}
            lines={[{ name: "Capex / revenus", color: STEEL, values: [10.3, 1.2, 0.5, 1.1, 0.4] }]}
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Capex", values: [160, 21, 11, 27, 11], strong: true },
              { label: "Capex / revenus", values: [10.3, 1.2, 0.5, 1.1, 0.4], kind: "pct" },
              { label: "Capex / amortissement", values: [3.73, 0.47, 0.21, 0.47, 0.17], kind: "x" },
              { label: "Coût brut", values: [160, 182, 192, 219, 230] },
              { label: "Amortissement cumulé", values: [-72, -118, -170, -226, -288] },
              { label: "Valeur comptable nette", values: [88, 63, 22, -7, -59], strong: true },
              { label: "Amortissement de l’exercice", values: [43, 46, 51, 57, 62] },
              { label: "Degré de vétusté", values: [45.3, 65.2, 88.3, 103.4, 125.5], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Le capex atteint 160 k$ en 2021, soit 10,3 % des revenus, puis environ 17 k$ par année de 2022 à 2025. En 2025, il représente 0,4 % des revenus et 0,17 fois l’amortissement.",
          "De 2022 à 2025, les investissements cumulés (70 k$) sont inférieurs à l’amortissement cumulé (216 k$). Le degré de vétusté passe de 45,3 % à 125,5 %. Le parc est largement amorti.",
          "La valeur comptable nette est négative en 2025 (−59 k$) : l’amortissement cumulé dépasse le coût brut. Le rapport recommande une revue du registre et un plan de renouvellement.",
          "Le matériel informatique est le premier poste, à 107 k$ sur la période, soit 46,6 % du capex cumulé de 230 k$. L’exercice 2021 concentre 69,7 % de ce cumul.",
        ]}
      />

      <Analysis
        eyebrow="Trésorerie"
        title="Encaisse et flux"
        tags={["Exploitation 584 k$", "FCF 573 k$", "Encaisse 1 391 k$"]}
        chart={
          <ReportChart
            labels={[...REPORT_YEARS]}
            bars={[
              { name: "Exploitation", color: INK, values: [27, 147, 232, 385, 584] },
              { name: "Investissement", color: STEEL, values: [-135, -21, -11, -27, -11] },
              { name: "Financement", color: SAND, values: [258, -27, -11, 0, 0] },
            ]}
            lines={[{ name: "Encaisse à la fin", color: ORANGE, values: [150, 248, 460, 818, 1391] }]}
            linesOn="left"
          />
        }
        table={
          <Table
            years={REPORT_YEARS}
            rows={[
              { label: "Encaisse au début", values: [0, 150, 248, 460, 818] },
              { label: "Bénéfice net", values: [-37, 66, 164, 322, 507] },
              { label: "Flux d’exploitation", values: [27, 147, 232, 385, 584], strong: true },
              { label: "Capex", values: [-131, -21, -11, -27, -11] },
              { label: "Flux de trésorerie disponible", values: [-108, 125, 222, 358, 573], strong: true },
              { label: "Flux de financement", values: [258, -27, -11, 0, 0] },
              { label: "Encaisse à la fin", values: [150, 248, 460, 818, 1391], strong: true },
              { label: "Conversion du BAIIA", values: [218, 115.7, 93.3, 87.1, 87.1], kind: "pct" },
              { label: "Autonomie (mois)", values: [1.2, 1.7, 2.9, 4.7, 7.2], kind: "n" },
            ]}
          />
        }
        notes={[
          "Les flux d’exploitation passent de 27 k$ en 2021 à 584 k$ en 2025. Ils représentent 87,1 % du BAIIA, une conversion élevée des résultats en liquidités.",
          "De 2022 à 2025, les investissements totalisent 70 k$, soit 5,2 % des flux d’exploitation. Le flux de trésorerie disponible atteint 573 k$ en 2025.",
          "Outre un apport en capital de 250 k$ en 2021, le financement net de 2022 à 2025 est de −37 k$. Aucun dividende significatif n’a été versé.",
          "L’encaisse atteint 1 391 k$, soit environ 7,2 mois de charges décaissées. Le rapport invite la direction à décider de l’allocation de cet excédent : réinvestissement, dividendes ou placements.",
        ]}
      />
      </Paged>
      </>
      )}

      {chapter === "trajectoire" && (
      <>
      <CoverBand
        id="trajectoire"
        title="Trajectoire"
        lede="Les deux derniers exercices réalisés, puis la projection 2026-2028."
      />
      <Paged labels={["Croissance", "Encaisse", "Sensibilité"]}>
      <Analysis
        eyebrow="Résultats"
        title="Croissance et rentabilité projetées"
        tags={["Croissance ramenée à 5 %", "BAIIA 840 k$ en 2028", "Marge de sécurité 45,7 %"]}
        chart={
          <ReportChart
            labels={[...TRAJECTORY_YEARS]}
            projectedFrom={2}
            bars={[
              { name: "Revenus", color: INK, values: [2532, 2979, 3128, 3284, 3448] },
              { name: "Contribution marginale", color: SAND, values: [1268, 1565, 1643, 1725, 1811] },
              { name: "BAIIA", color: ORANGE, values: [442, 670, 724, 780, 840] },
            ]}
            lines={[
              { name: "Marge de contribution", color: STEEL, values: [50.1, 52.5, 52.5, 52.5, 52.5] },
              { name: "Marge du BAIIA", color: CLAY, values: [17.5, 22.5, 23.1, 23.8, 24.4] },
            ]}
          />
        }
        table={
          <Table
            years={TRAJECTORY_YEARS}
            shadeFrom={2}
            rows={[
              { label: "Revenus", values: [2532, 2979, 3128, 3284, 3448], strong: true },
              { label: "Croissance", values: [17.8, 17.6, 5, 5, 5], kind: "pct" },
              { label: "BAIIA", values: [442, 670, 724, 780, 840], strong: true },
              { label: "Marge du BAIIA", values: [17.5, 22.5, 23.1, 23.8, 24.4], kind: "pct" },
              { label: "Bénéfice net", values: [322, 507, 608, 650, 694] },
              { label: "Marge nette", values: [12.7, 17, 19.5, 19.8, 20.1], kind: "pct" },
              { label: "Seuil de rentabilité", values: [1673, 1728, 1775, 1823, 1873] },
              { label: "Marge de sécurité", values: [33.9, 42, 43.3, 44.5, 45.7], kind: "pct" },
              { label: "Levier (CM / BO)", values: [2.95, 2.38, 2.31, 2.25, 2.19], kind: "x" },
            ]}
          />
        }
        notes={[
          "Les revenus passent de 3,0 M$ en 2025 à 3,4 M$ en 2028, soit 5,0 % par année, après 17,6 % en 2025. La direction anticipe une croissance plus modérée.",
          "La marge de BAIIA passe de 22,5 % à 24,4 % et la marge nette de 17,0 % à 20,1 %. Le BAIIA atteindrait 840 k$ en 2028.",
          "Le seuil s’établit à 1,9 M$ en 2028, pour une marge de sécurité de 45,7 %. Les coûts fixes progressent de 2,7 % par année, moins vite que les revenus.",
          "La marge opérationnelle de Software passerait de 28,2 % à 29,8 %, celle de Conseil de 7,2 % à 10,1 %.",
        ]}
      />

      <Analysis
        eyebrow="Trésorerie projetée"
        title="Flux, encaisse et solidité"
        tags={["FCF 700 k$ en 2028", "Encaisse 3,0 M$", "Financement −125 k$ / an"]}
        chart={
          <ReportChart
            labels={[...TRAJECTORY_YEARS]}
            projectedFrom={2}
            bars={[
              { name: "Flux d’exploitation", color: INK, values: [385, 584, 621, 655, 700] },
              { name: "Flux de trésorerie disponible", color: ORANGE, values: [358, 573, 621, 655, 700] },
            ]}
            lines={[{ name: "Encaisse à la fin", color: STEEL, values: [818, 1391, 1887, 2417, 2992] }]}
            fitRight
            formatRight={(value) => {
              const abs = Math.abs(Math.round(value)).toLocaleString("fr-CA")
              return value < 0 ? `−${abs}` : abs
            }}
          />
        }
        table={
          <Table
            years={TRAJECTORY_YEARS}
            shadeFrom={2}
            rows={[
              { label: "Flux d’exploitation", values: [385, 584, 621, 655, 700] },
              { label: "Flux de trésorerie disponible", values: [358, 573, 621, 655, 700], strong: true },
              { label: "Flux de financement", values: [0, 0, -125, -125, -125] },
              { label: "Encaisse à la fin", values: [818, 1391, 1887, 2417, 2992], strong: true },
              { label: "Liquidité générale", values: [3.69, 5.16, 6.47, 7.74, 9], kind: "x" },
              { label: "Passif / capitaux propres", values: [0.38, 0.25, 0.19, 0.15, 0.13], kind: "x" },
              { label: "Encaisse / actif", values: [80.8, 89.3, 91.8, 93.1, 94], kind: "pct" },
            ]}
          />
        }
        notes={[
          "Les flux d’exploitation projetés totalisent environ 2,0 M$ de 2026 à 2028. Le flux de trésorerie disponible atteindrait 700 k$ en 2028, contre 573 k$ en 2025.",
          "L’encaisse passerait de 1,4 M$ à 3,0 M$, soit 94 % de l’actif. Le ratio de liquidité générale atteindrait 9,00× et le ratio d’endettement 0,13×.",
          "La dette portant intérêt demeure négligeable. Les flux de financement projetés totalisent −375 k$ sur trois ans, soit 19 % du flux disponible cumulé. La capacité de distribution reste importante.",
        ]}
      />

      <Analysis
        eyebrow="Sensibilité"
        title="Divisions et baisse de revenus de 10 %"
        tags={["Conseil encore loin de Software", "BO 2026 après choc : 546 k$"]}
        chart={
          <ReportChart
            labels={[...TRAJECTORY_YEARS]}
            projectedFrom={2}
            bars={[
              { name: "Bénéfice opérationnel Software", color: INK, values: [439, 594, 635, 679, 725] },
              { name: "Bénéfice opérationnel Conseil", color: ORANGE, values: [-9, 63, 75, 88, 102] },
            ]}
            lines={[{ name: "Marge opérationnelle globale", color: STEEL, values: [17, 22.1, 22.7, 23.4, 24] }]}
            fitLeft
            fitRight
          />
        }
        table={
          <Table
            years={TRAJECTORY_YEARS}
            shadeFrom={2}
            rows={[
              { label: "Revenus Software", values: [1810, 2103, 2209, 2319, 2435] },
              { label: "Revenus Conseil", values: [722, 875, 919, 965, 1013] },
              { label: "BO Software", values: [439, 594, 635, 679, 725], strong: true },
              { label: "BO Conseil", values: [-9, 63, 75, 88, 102], strong: true },
              { label: "Marge Software", values: [24.3, 28.2, 28.8, 29.3, 29.8], kind: "pct" },
              { label: "Marge Conseil", values: [-1.2, 7.2, 8.2, 9.1, 10.1], kind: "pct" },
              { label: "Bénéfice opérationnel", values: [430, 657, 711, 767, 827], strong: true },
              { label: "Impact d’une baisse de 10 %", values: [-127, -156, -164, -172, -181] },
              { label: "BO après la baisse", values: [303, 501, 546, 595, 646] },
            ]}
          />
        }
        notes={[
          "Une baisse de 10 % des revenus réduirait le bénéfice opérationnel de 164 k$ en 2026. Il demeurerait à 546 k$.",
          "La marge de Conseil passerait de 7,2 % à 10,1 %, contre 29,8 % pour Software. L’écart reste le levier de gestion le plus visible.",
          "Aucun capex n’est prévu de 2026 à 2028, alors que les immobilisations sont déjà largement amorties.",
        ]}
      />
      </Paged>
      </>
      )}

      {chapter === "valorisation" && (
      <>
      <CoverBand
        id="valorisation"
        title="Analyse illustrative de prix"
        lede="Un repère pour situer l’entreprise. Pas une conclusion de valeur."
      />

      <section className="border-b border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="border-t border-slate-200 pt-6">
            <p className="text-sm font-semibold">Valeur des actions</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">4,9 M$ – 5,4 M$</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Fourchette retenue au sommaire exécutif de l’exemple, au 31 décembre 2025.
            </p>
          </div>
          <Notes
            notes={[
              "Le rapport peut inclure une analyse illustrative de prix. Elle fournit un point de repère. Elle ne doit pas être lue comme le prix d’une transaction.",
              "Ce n’est pas une opinion sur la juste valeur marchande des actions, ni un rapport d’évaluation au sens des normes de l’ICEEE. Une évaluation faite selon ces normes pourrait donner un résultat différent.",
              "Les pages d’hypothèses détaillées du modèle de prix — normalisation, multiple, taux, horizon — restent un cadre de travail. Dans cet exemple, le chiffre arrêté est la fourchette du sommaire.",
            ]}
          />
        </div>
      </section>
      </>
      )}

      {chapter === "plan" && (
      <>
      <CoverBand
        id="plan"
        title="Plan d’action"
        lede="Les décisions que la trajectoire met devant la direction."
      />

      <section className="border-b border-slate-200 bg-white px-5 py-10 sm:px-8">
        <ol className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
          {[
            {
              title: "Allouer l’encaisse excédentaire",
              text: "L’encaisse projetée atteint 1,9 M$ en 2026, 2,4 M$ en 2027 et 3,0 M$ en 2028, soit 94 % de l’actif. La direction a à choisir : dividendes, réinvestissement, acquisition ou placements.",
            },
            {
              title: "Planifier le renouvellement des actifs",
              text: "Aucun capex n’est prévu de 2026 à 2028. Le degré de vétusté est déjà de 125,5 % en 2025 et la valeur comptable nette est négative de 59 k$. Un plan de renouvellement reste à établir.",
            },
            {
              title: "Relever la rentabilité de Conseil",
              text: "La marge opérationnelle passerait de 7,2 % à 10,1 %, contre 29,8 % pour Software. Le redressement est amorcé — de −133 k$ en 2021 à 63 k$ en 2025 — et l’écart demeure un levier de prix et d’utilisation.",
            },
            {
              title: "Suivre le plan, choc compris",
              text: "La croissance projetée est de 5 % par année. Une baisse de 10 % des revenus en 2026 réduirait le bénéfice opérationnel de 164 k$, qui resterait à 546 k$. Le suivi consiste à voir si la trajectoire tient.",
            },
          ].map((item, index) => (
            <li key={item.title} className="border-t-2 border-[#222732] py-5">
              <p className="text-[12px] font-medium text-[#E0742D]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>
      </>
      )}

      {nextChapter && (
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
          <div className="mx-auto flex max-w-6xl justify-end">
            <button
              type="button"
              onClick={() => openChapter(nextChapter.id)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#222732]"
            >
              Section suivante · {nextChapter.label}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <section className="border-t border-slate-200/90 bg-white px-5 pt-12 pb-10 sm:px-8 sm:pt-14 sm:pb-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="min-w-0 max-w-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rendez-vous</p>
              <span
                className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                aria-hidden
              />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
              Prendre rendez-vous
            </h2>
            <p className="mt-3 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
              Un échange sur votre exercice, un accompagnement ou un mandat. Nous regardons votre situation avec vous.
            </p>
          </div>
          <Link
            href="/#demo"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#2A2F3A] bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-[#E6D6C3] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] transition hover:bg-[#353b48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50 lg:self-center"
          >
            Prendre rendez-vous
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
      </div>
    </main>
  )
}
