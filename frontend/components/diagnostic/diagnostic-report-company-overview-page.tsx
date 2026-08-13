import type { ReactNode } from "react"
import type { DiagnosticCompanyOverview } from "@/lib/diagnostic-company-overview"
import {
  COMPANY_OVERVIEW_GENERAL_INFO_FIELDS,
  COMPANY_OVERVIEW_PRINT_INTRO,
  COMPANY_OVERVIEW_PRINT_INTRO_ID,
  type CompanyOverviewHistoryEntry,
} from "@/lib/diagnostic-company-overview"
import { DiagnosticReportSectionPage } from "@/components/diagnostic/diagnostic-report-section-page"
import { ReportChapterIntroPage } from "@/components/diagnostic/report/report-primitives"
import { formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
import type { CompanyDiagnostic } from "@/lib/api"

interface DiagnosticReportCompanyOverviewPageProps {
  diagnostic: CompanyDiagnostic
  overview: DiagnosticCompanyOverview
}

const SECTION_NUMBER = "01"
const SECTION_TITLE = COMPANY_OVERVIEW_PRINT_INTRO.title

function PrintTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  if (!rows.some((row) => row.some((cell) => cell.trim()))) return null
  return (
    <table className="report-overview-table w-full border-collapse">
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="border-b border-slate-300 px-2.5 py-2 text-left font-semibold uppercase tracking-[0.08em] text-slate-500"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-slate-100">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-2.5 py-2 align-top text-[#2A2F3A]">
                {cell || "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionBlock({
  title,
  children,
  variant,
}: {
  title: string
  children: ReactNode
  variant?: "history"
}) {
  return (
    <div
      className={`report-overview-section report-avoid-break${variant === "history" ? " report-overview-section--history" : ""}`}
    >
      <h3 className="report-overview-section-title">{title}</h3>
      <div className="report-overview-section-body">{children}</div>
    </div>
  )
}

function HistoryBlock({ entries }: { entries: CompanyOverviewHistoryEntry[] }) {
  if (!entries.length) return null
  return (
    <div className="report-overview-history">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="report-overview-history-row report-avoid-break grid grid-cols-[5.5rem_1fr] gap-3"
        >
          <p className="font-semibold text-[#E0742D]">{entry.year || "—"}</p>
          <p className="leading-relaxed text-[#2A2F3A]">{entry.description || "—"}</p>
        </div>
      ))}
    </div>
  )
}

export function DiagnosticReportCompanyOverviewPage({
  diagnostic,
  overview,
}: DiagnosticReportCompanyOverviewPageProps) {
  const sectionMeta = formatReportSectionMeta(
    diagnostic.company_name,
    diagnostic.reference_period.calendar_year,
    diagnostic.reference_period.calendar_month,
    diagnostic.currency,
  )

  const generalRows = COMPANY_OVERVIEW_GENERAL_INFO_FIELDS.map(({ key, label }) => [
    label,
    overview.generalInfo[key],
  ])

  const historyEntries = overview.history.filter(
    (entry) => entry.year.trim() || entry.description.trim(),
  )

  const contentPages: {
    id: string
    content: ReactNode
    isFirst: boolean
  }[] = [
    {
      id: "report-company-overview-general",
      isFirst: true,
      content: (
        <div className="report-overview-page-sections">
          <SectionBlock title="Informations générales">
            <PrintTable headers={["Élément", "Information"]} rows={generalRows} />
          </SectionBlock>
          {overview.mainActivities.trim() ? (
            <SectionBlock title="Principales activités">
              <p className="report-overview-prose">{overview.mainActivities}</p>
            </SectionBlock>
          ) : null}
        </div>
      ),
    },
    {
      id: "report-company-overview-history",
      isFirst: false,
      content: (
        <SectionBlock title="Historique de l'entreprise" variant="history">
          {historyEntries.length > 0 ? (
            <HistoryBlock entries={historyEntries} />
          ) : (
            <p className="report-overview-prose text-slate-500">Aucun historique documenté.</p>
          )}
        </SectionBlock>
      ),
    },
    {
      id: "report-company-overview-shareholding",
      isFirst: false,
      content: (
        <div className="report-overview-page-sections">
          <SectionBlock title="Actionnariat — Actions participantes">
            <PrintTable
              headers={["Actionnaire", "Pourcentage"]}
              rows={overview.participatingShareholders.map((row) => [row.name, row.percentage])}
            />
          </SectionBlock>
          <SectionBlock title="Actionnariat — Actions votantes">
            <PrintTable
              headers={["Actionnaire", "Pourcentage"]}
              rows={overview.votingShareholders.map((row) => [row.name, row.percentage])}
            />
          </SectionBlock>
        </div>
      ),
    },
    {
      id: "report-company-overview-management",
      isFirst: false,
      content: (
        <SectionBlock title="Direction">
          <PrintTable
            headers={["Poste", "Responsable"]}
            rows={overview.management.map((row) => [row.role, row.name])}
          />
        </SectionBlock>
      ),
    },
  ]

  return (
    <div className="report-company-overview-group" data-testid="diagnostic-report-company-overview">
      <ReportChapterIntroPage
        id={COMPANY_OVERVIEW_PRINT_INTRO_ID}
        analysisNumber={1}
        title={COMPANY_OVERVIEW_PRINT_INTRO.title}
        subtitle={COMPANY_OVERVIEW_PRINT_INTRO.subtitle}
        description={COMPANY_OVERVIEW_PRINT_INTRO.description}
        companyName={diagnostic.company_name}
        testId="report-analysis-intro-company-overview"
      />

      {contentPages.map((page) => (
        <DiagnosticReportSectionPage
          key={page.id}
          id={page.id}
          sectionNumber={SECTION_NUMBER}
          sectionTitle={SECTION_TITLE}
          companyName={diagnostic.company_name}
          sectionMeta={sectionMeta}
          isFirstContentSection={page.isFirst}
          className="print-company-overview-content"
        >
          {page.content}
        </DiagnosticReportSectionPage>
      ))}
    </div>
  )
}
