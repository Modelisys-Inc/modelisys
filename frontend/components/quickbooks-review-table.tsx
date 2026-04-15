"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ApiError,
  commitQboTrialBalance,
  listQboLinkCodes,
  type QboCommitRow,
  type QboLinkCode,
  type QboTrialBalancePreview,
} from "@/lib/api"

type Filter = "all" | "high" | "review" | "mapped"

type RowState = {
  account_number: string
  account_name: string
  debit: number
  credit: number
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
  confidence: "high" | "medium" | "low"
  existing_link_code: string | null
  skip: boolean
}

interface ReviewTableProps {
  companyId: string
  preview: QboTrialBalancePreview
  onCancel: () => void
  onCommitted: (counts: { accounts_imported: number; mappings_created: number; mappings_updated: number }) => void
}

export function QuickBooksReviewTable({
  companyId,
  preview,
  onCancel,
  onCommitted,
}: ReviewTableProps) {
  const [linkCodes, setLinkCodes] = useState<QboLinkCode[]>([])
  const [rows, setRows] = useState<RowState[]>(() =>
    preview.rows.map((r) => ({
      account_number: r.account_number,
      account_name: r.account_name,
      debit: r.debit,
      credit: r.credit,
      qbo_type: r.qbo_account_type,
      qbo_subtype: r.qbo_account_sub_type,
      link_code: r.proposed_link_code,
      confidence: r.confidence,
      existing_link_code: r.existing_link_code,
      skip: false,
    })),
  )
  const [filter, setFilter] = useState<Filter>("all")
  const [committing, setCommitting] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    listQboLinkCodes(companyId)
      .then(setLinkCodes)
      .catch(() => setLinkCodes([]))
  }, [companyId])

  const counts = useMemo(
    () => ({
      high: rows.filter((r) => r.confidence === "high").length,
      review: rows.filter(
        (r) => r.confidence !== "high" && !r.existing_link_code,
      ).length,
      mapped: rows.filter((r) => r.existing_link_code !== null).length,
    }),
    [rows],
  )

  const totals = useMemo(() => {
    const debit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.debit, 0)
    const credit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.credit, 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
  }, [rows])

  const visibleRows = useMemo(() => {
    if (filter === "high") return rows.filter((r) => r.confidence === "high")
    if (filter === "review")
      return rows.filter(
        (r) => r.confidence !== "high" && !r.existing_link_code,
      )
    if (filter === "mapped")
      return rows.filter((r) => r.existing_link_code !== null)
    return rows
  }, [rows, filter])

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const canCommit = rows.every(
    (r) => r.skip || (r.link_code && r.link_code.length > 0),
  )

  const doCommit = async (overwrite: boolean) => {
    setCommitting(true)
    setErrorMsg(null)
    try {
      const payload: QboCommitRow[] = rows.map((r) => ({
        account_number: r.account_number,
        account_name: r.account_name,
        debit: r.debit,
        credit: r.credit,
        link_code: r.link_code,
        skip: r.skip,
      }))
      const result = await commitQboTrialBalance(
        companyId,
        preview.fiscal_year,
        preview.month,
        payload,
        overwrite,
      )
      onCommitted(result)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflictOpen(true)
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        setErrorMsg(msg)
      }
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Review trial balance — {preview.fiscal_year}-
          {String(preview.month).padStart(2, "0")} ({preview.currency})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className={filter === "all" ? "font-semibold underline" : ""}
            onClick={() => setFilter("all")}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            className={filter === "high" ? "font-semibold underline" : ""}
            onClick={() => setFilter("high")}
          >
            High confidence ({counts.high})
          </button>
          <button
            type="button"
            className={filter === "review" ? "font-semibold underline" : ""}
            onClick={() => setFilter("review")}
          >
            Needs review ({counts.review})
          </button>
          <button
            type="button"
            className={filter === "mapped" ? "font-semibold underline" : ""}
            onClick={() => setFilter("mapped")}
          >
            Already mapped ({counts.mapped})
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>QBO type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Link code</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Skip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const idx = rows.indexOf(r)
                return (
                  <TableRow key={r.account_number}>
                    <TableCell className="font-mono text-xs">
                      {r.account_number}
                    </TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.qbo_type ?? "—"}
                      {r.qbo_subtype ? `/${r.qbo_subtype}` : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.debit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.credit.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        list="qbo-link-codes"
                        value={r.link_code ?? ""}
                        onChange={(e) =>
                          updateRow(idx, {
                            link_code: e.target.value || null,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            r.confidence === "high"
                              ? "default"
                              : r.confidence === "medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {r.confidence}
                        </Badge>
                        {r.existing_link_code &&
                          r.existing_link_code !== r.link_code && (
                            <Badge variant="outline" className="text-xs">
                              Already mapped
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={r.skip}
                        onCheckedChange={(v) => updateRow(idx, { skip: !!v })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <datalist id="qbo-link-codes">
            {linkCodes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </datalist>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div
            className={
              "text-sm " +
              (totals.balanced ? "text-muted-foreground" : "text-red-600 font-semibold")
            }
          >
            Debit total: {totals.debit.toFixed(2)} · Credit total:{" "}
            {totals.credit.toFixed(2)}
            {!totals.balanced && " — does not balance!"}
          </div>
          {errorMsg && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={committing}>
              Cancel
            </Button>
            <Button
              onClick={() => doCommit(false)}
              disabled={!canCommit || committing}
            >
              {committing ? "Importing…" : "Import trial balance"}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              A trial balance for {preview.fiscal_year}-
              {String(preview.month).padStart(2, "0")} already exists.
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Overwrite the existing entries? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setConflictOpen(false)
                await doCommit(true)
              }}
            >
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
