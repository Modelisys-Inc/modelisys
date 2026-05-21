"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { QuickBooksReviewTable } from "@/components/quickbooks-review-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQuickBooksConnection } from "@/hooks/use-quickbooks-connection"
import {
  ApiError,
  previewQboTrialBalance,
  type QboTrialBalancePreview,
} from "@/lib/api"

type Banner = { variant: "info" | "success" | "error"; message: string } | null

export default function QuickBooksPage() {
  const params = useParams<{ id: string }>()
  const companyId = params.id
  const search = useSearchParams()
  const { status, loading, connect, disconnect, refresh } =
    useQuickBooksConnection(companyId)

  const now = new Date()
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const [fiscalYear, setFiscalYear] = useState<number>(defaultYear)
  const [startMonth, setStartMonth] = useState<number>(defaultMonth)
  const [endMonth, setEndMonth] = useState<number>(defaultMonth)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<QboTrialBalancePreview | null>(null)
  const [banner, setBanner] = useState<Banner>(null)

  const months = useMemo(() => {
    if (startMonth < 1 || endMonth > 12 || startMonth > endMonth) return []
    const out: number[] = []
    for (let m = startMonth; m <= endMonth; m++) out.push(m)
    return out
  }, [startMonth, endMonth])
  const rangeValid = months.length > 0

  useEffect(() => {
    const flag = search.get("qbo")
    if (flag === "connected") {
      setBanner({ variant: "success", message: "QuickBooks connected." })
    } else if (flag === "denied") {
      setBanner({
        variant: "info",
        message: "QuickBooks connection cancelled — no changes were made.",
      })
    }
  }, [search])

  if (loading) {
    return <div className="container mx-auto max-w-5xl py-8">Loading…</div>
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/settings/companies/${companyId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to company
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">QuickBooks Online</h1>

      {banner && (
        <div
          className={
            "rounded-md border px-4 py-3 text-sm " +
            (banner.variant === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : banner.variant === "error"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-slate-300 bg-slate-50 text-slate-900")
          }
        >
          {banner.message}
        </div>
      )}

      {status?.status === "not_connected" && (
        <Card>
          <CardHeader>
            <CardTitle>Connect QuickBooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect this company to QuickBooks Online to import trial balances
              and bootstrap account mappings automatically.
            </p>
            <Button onClick={connect}>Connect QuickBooks</Button>
          </CardContent>
        </Card>
      )}

      {status?.status === "revoked" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle>Reconnect required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              QuickBooks access expired or was revoked. Reconnect to continue
              importing data.
            </p>
            <Button onClick={connect}>Reconnect QuickBooks</Button>
          </CardContent>
        </Card>
      )}

      {status?.status === "connected" && !preview && (
        <Card>
          <CardHeader>
            <CardTitle>Connected</CardTitle>
            <p className="text-sm text-muted-foreground">
              Realm ID: {status.realm_id}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fy">Fiscal year</Label>
                <Input
                  id="fy"
                  type="number"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="start-mo">Start month (1-12)</Label>
                <Input
                  id="start-mo"
                  type="number"
                  min={1}
                  max={12}
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="end-mo">End month (1-12)</Label>
                <Input
                  id="end-mo"
                  type="number"
                  min={1}
                  max={12}
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                />
              </div>
            </div>
            {!rangeValid && (
              <p className="text-xs text-red-600">
                Start month must be ≤ end month and both must be in 1–12.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  setPreviewing(true)
                  setBanner(null)
                  try {
                    setPreview(
                      await previewQboTrialBalance(companyId, fiscalYear, months),
                    )
                  } catch (e) {
                    const msg =
                      e instanceof ApiError
                        ? `${e.detail} (status ${e.status})`
                        : e instanceof Error
                        ? e.message
                        : String(e)
                    setBanner({ variant: "error", message: `Preview failed: ${msg}` })
                  } finally {
                    setPreviewing(false)
                  }
                }}
                disabled={previewing || !rangeValid}
              >
                {previewing
                  ? `Pulling ${months.length} ${months.length === 1 ? "month" : "months"}…`
                  : `Preview ${months.length} ${months.length === 1 ? "month" : "months"}`}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await disconnect()
                  setBanner({ variant: "info", message: "Disconnected from QuickBooks." })
                }}
              >
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && (
        <QuickBooksReviewTable
          companyId={companyId}
          preview={preview}
          onCancel={() => setPreview(null)}
          onCommitted={async (counts) => {
            setPreview(null)
            setBanner({
              variant: "success",
              message: `Trial balance imported — ${counts.months_imported} ${
                counts.months_imported === 1 ? "month" : "months"
              }, ${counts.accounts_imported} accounts, ${counts.mappings_created} new mappings, ${counts.mappings_updated} updated.`,
            })
            await refresh()
          }}
        />
      )}
    </div>
  )
}
