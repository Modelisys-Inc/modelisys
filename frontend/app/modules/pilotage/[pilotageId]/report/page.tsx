import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ pilotageId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Redirige l’ancienne URL imbriquée vers la route stable /modules/pilotage/report */
export default async function PilotageNestedReportRedirectPage({ params, searchParams }: PageProps) {
  const { pilotageId } = await params
  const query = await searchParams
  const qs = new URLSearchParams()
  qs.set("pilotageId", pilotageId)
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v))
    else qs.set(key, value)
  }
  redirect(`/modules/pilotage/report?${qs.toString()}`)
}
