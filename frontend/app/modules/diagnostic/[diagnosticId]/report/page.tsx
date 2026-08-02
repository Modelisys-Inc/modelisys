import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ diagnosticId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Redirige l’ancienne URL imbriquée vers la route stable /modules/diagnostic/report */
export default async function LegacyDiagnosticReportRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { diagnosticId } = await params
  const query = await searchParams

  const qs = new URLSearchParams()
  qs.set("diagnosticId", diagnosticId)
  if (query.companyId) qs.set("companyId", String(query.companyId))
  if (query.refYear) qs.set("refYear", String(query.refYear))
  if (query.refMonth) qs.set("refMonth", String(query.refMonth))

  redirect(`/modules/diagnostic/report?${qs.toString()}`)
}
