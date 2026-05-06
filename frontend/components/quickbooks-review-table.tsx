"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateLinkCodeDialog } from "@/components/quickbooks-create-link-code-dialog"
import {
  ApiError,
  commitQboTrialBalance,
  listQboLinkCodes,
  type QboCommitRow,
  type QboLinkCode,
  type QboTrialBalancePreview,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type Filter = "all" | "unmapped" | "mapped"

interface LinkCodePickerProps {
  row: RowState
  idx: number
  codeIndex: Map<string, QboLinkCode>
  codesByStatement: Map<string, QboLinkCode[]>
  onPick: (idx: number, code: string) => void
  onCreateRequest: (idx: number) => void
}

function LinkCodePicker({
  row,
  idx,
  codeIndex,
  codesByStatement,
  onPick,
  onCreateRequest,
}: LinkCodePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = row.link_code ? codeIndex.get(row.link_code) : null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-[260px] justify-between text-xs"
        >
          <span className="truncate">
            {selected
              ? `${selected.code} — ${selected.label}`
              : row.link_code
              ? `${row.link_code} (unknown)`
              : "Pick a link code"}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search link codes…" />
          <CommandList>
            <CommandEmpty>No codes found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onCreateRequest(idx)
                  setOpen(false)
                }}
                className="font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new link code…
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            {Array.from(codesByStatement.entries()).map(([stmt, list]) => (
              <CommandGroup key={stmt} heading={stmt}>
                {list.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.code} ${c.label}`}
                    onSelect={() => {
                      onPick(idx, c.code)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        row.link_code === c.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{c.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.label}
                        {c.parent_label ? ` · ${c.parent_label}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type RowState = {
  account_number: string
  account_name: string
  debit: number
  credit: number
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
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
      link_code: r.existing_link_code,
      existing_link_code: r.existing_link_code,
      skip: false,
    })),
  )
  const [filter, setFilter] = useState<Filter>("all")
  const [committing, setCommitting] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createOpenForRow, setCreateOpenForRow] = useState<number | null>(null)

  const refreshLinkCodes = () =>
    listQboLinkCodes(companyId).then(setLinkCodes).catch(() => setLinkCodes([]))

  useEffect(() => {
    refreshLinkCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const codeIndex = useMemo(() => {
    const m = new Map<string, QboLinkCode>()
    for (const c of linkCodes) m.set(c.code, c)
    return m
  }, [linkCodes])

  const codesByStatement = useMemo(() => {
    const groups = new Map<string, QboLinkCode[]>()
    for (const c of linkCodes) {
      const list = groups.get(c.statement_type) ?? []
      list.push(c)
      groups.set(c.statement_type, list)
    }
    return groups
  }, [linkCodes])

  const codeSet = useMemo(() => new Set(linkCodes.map((c) => c.code)), [linkCodes])

  const counts = useMemo(
    () => ({
      mapped: rows.filter((r) => !!r.link_code).length,
      unmapped: rows.filter((r) => !r.skip && !r.link_code).length,
    }),
    [rows],
  )

  const totals = useMemo(() => {
    const debit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.debit, 0)
    const credit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.credit, 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
  }, [rows])

  const visibleRows = useMemo(() => {
    if (filter === "mapped") return rows.filter((r) => !!r.link_code)
    if (filter === "unmapped")
      return rows.filter((r) => !r.skip && !r.link_code)
    return rows
  }, [rows, filter])

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const canCommit = rows.every((r) => r.skip || !!r.link_code)

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
            className={filter === "unmapped" ? "font-semibold underline" : ""}
            onClick={() => setFilter("unmapped")}
          >
            Unmapped ({counts.unmapped})
          </button>
          <button
            type="button"
            className={filter === "mapped" ? "font-semibold underline" : ""}
            onClick={() => setFilter("mapped")}
          >
            Mapped ({counts.mapped})
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
                      <LinkCodePicker
                        row={r}
                        idx={idx}
                        codeIndex={codeIndex}
                        codesByStatement={codesByStatement}
                        onPick={(i, code) => updateRow(i, { link_code: code })}
                        onCreateRequest={setCreateOpenForRow}
                      />
                      {r.existing_link_code &&
                        r.existing_link_code !== r.link_code && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Was: {r.existing_link_code}
                          </Badge>
                        )}
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

      <CreateLinkCodeDialog
        companyId={companyId}
        open={createOpenForRow !== null}
        defaultLabel={createOpenForRow !== null ? rows[createOpenForRow]?.account_name : ""}
        existingCodes={codeSet}
        onClose={() => setCreateOpenForRow(null)}
        onCreated={async (created) => {
          await refreshLinkCodes()
          if (createOpenForRow !== null) {
            updateRow(createOpenForRow, { link_code: created.code })
          }
        }}
      />
    </Card>
  )
}
