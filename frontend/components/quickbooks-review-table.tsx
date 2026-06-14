"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react"

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
import { QuickBooksTagCell } from "@/components/quickbooks-tag-cell"
import {
  ApiError,
  commitQboTrialBalance,
  listQboLinkCodes,
  type QboCommitRow,
  type QboLinkCode,
  type QboTrialBalancePreview,
} from "@/lib/api"
import { formatCompactAmount } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

type Filter = "all" | "unmapped" | "mapped" | "invalid"

interface BulkLinkCodePickerProps {
  codesByStatement: Map<string, QboLinkCode[]>
  onPick: (code: string) => void
  disabled?: boolean
}

function BulkLinkCodePicker({
  codesByStatement,
  onPick,
  disabled,
}: BulkLinkCodePickerProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          aria-expanded={open}
          disabled={disabled}
        >
          Apply link code…
          <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search link codes…" />
          <CommandList>
            <CommandEmpty>No codes found.</CommandEmpty>
            {Array.from(codesByStatement.entries()).map(([stmt, list]) => (
              <CommandGroup key={stmt} heading={stmt}>
                {list.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.code} ${c.label}`}
                    onSelect={() => {
                      onPick(c.code)
                      setOpen(false)
                    }}
                  >
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

interface LinkCodePickerProps {
  row: RowState
  idx: number
  codeIndex: Map<string, QboLinkCode>
  codesByStatement: Map<string, QboLinkCode[]>
  onPick: (idx: number, code: string) => void
}

function LinkCodePicker({
  row,
  idx,
  codeIndex,
  codesByStatement,
  onPick,
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
          className="h-8 w-full justify-between text-xs"
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
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
  existing_link_code: string | null
  skip: boolean
  monthly_amounts: Record<string, { debit: number; credit: number }>
  divisions: string[]
  sub_divisions: string[]
}

interface ReviewTableProps {
  companyId: string
  preview: QboTrialBalancePreview
  onCancel: () => void
  onCommitted: (counts: {
    months_imported: number
    accounts_imported: number
    mappings_created: number
    mappings_updated: number
  }) => void
}

export function QuickBooksReviewTable({
  companyId,
  preview,
  onCancel,
  onCommitted,
}: ReviewTableProps) {
  const [linkCodes, setLinkCodes] = useState<QboLinkCode[]>([])
  const [linkCodesLoaded, setLinkCodesLoaded] = useState(false)
  const [rows, setRows] = useState<RowState[]>(() =>
    preview.rows.map((r) => ({
      account_number: r.account_number,
      account_name: r.account_name,
      qbo_type: r.qbo_account_type,
      qbo_subtype: r.qbo_account_sub_type,
      link_code: r.existing_link_code,
      existing_link_code: r.existing_link_code,
      skip: false,
      monthly_amounts: r.monthly_amounts,
      divisions: r.divisions ?? [],
      sub_divisions: r.sub_divisions ?? [],
    })),
  )
  const showDivisions = preview.class_location_tracking?.classes ?? false
  const showSubDivisions = preview.class_location_tracking?.locations ?? false

  const divisionOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of preview.rows) for (const d of r.discovered_divisions ?? []) s.add(d)
    return Array.from(s).sort()
  }, [preview.rows])

  const subDivisionOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of preview.rows) for (const d of r.discovered_sub_divisions ?? []) s.add(d)
    return Array.from(s).sort()
  }, [preview.rows])

  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [committing, setCommitting] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const refreshLinkCodes = () =>
    listQboLinkCodes(companyId)
      .then((codes) => {
        setLinkCodes(codes)
        setLinkCodesLoaded(true)
      })
      .catch(() => {
        setLinkCodes([])
        setLinkCodesLoaded(true)
      })

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

  const isInvalidRow = (r: RowState) =>
    !r.skip && !!r.link_code && codeSet.size > 0 && !codeSet.has(r.link_code)

  const counts = useMemo(
    () => ({
      mapped: rows.filter((r) => !!r.link_code && codeSet.has(r.link_code))
        .length,
      unmapped: rows.filter((r) => !r.skip && !r.link_code).length,
      invalid: rows.filter(
        (r) =>
          !r.skip && !!r.link_code && codeSet.size > 0 && !codeSet.has(r.link_code),
      ).length,
    }),
    [rows, codeSet],
  )

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const r of rows) {
      if (r.skip) continue
      for (const m of Object.values(r.monthly_amounts)) {
        debit += m.debit
        credit += m.credit
      }
    }
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
  }, [rows])

  const isAllZero = (r: RowState) =>
    Object.values(r.monthly_amounts).every(
      (m) => m.debit === 0 && m.credit === 0,
    )

  const zeroAmountUnskipped = useMemo(
    () => rows.filter((r) => !r.skip && isAllZero(r)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  )

  const skipAllZeroAmount = () => {
    setRows((prev) =>
      prev.map((r) =>
        !r.skip && isAllZero(r) ? { ...r, skip: true } : r,
      ),
    )
  }

  const visibleRows = useMemo(() => {
    if (filter === "mapped")
      return rows.filter((r) => !!r.link_code && codeSet.has(r.link_code))
    if (filter === "unmapped")
      return rows.filter((r) => !r.skip && !r.link_code)
    if (filter === "invalid")
      return rows.filter(
        (r) =>
          !r.skip && !!r.link_code && codeSet.size > 0 && !codeSet.has(r.link_code),
      )
    return rows
  }, [rows, filter, codeSet])

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const toggleRowSelected = (accountNumber: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(accountNumber)) next.delete(accountNumber)
      else next.add(accountNumber)
      return next
    })
  }

  const visibleAccountNumbers = useMemo(
    () => visibleRows.map((r) => r.account_number),
    [visibleRows],
  )
  const visibleAllSelected =
    visibleAccountNumbers.length > 0 &&
    visibleAccountNumbers.every((n) => selected.has(n))
  const visibleSomeSelected = visibleAccountNumbers.some((n) =>
    selected.has(n),
  )

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (visibleAllSelected) {
        visibleAccountNumbers.forEach((n) => next.delete(n))
      } else {
        visibleAccountNumbers.forEach((n) => next.add(n))
      }
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const applyLinkCodeToSelected = (code: string) => {
    setRows((prev) =>
      prev.map((r) =>
        selected.has(r.account_number) ? { ...r, link_code: code } : r,
      ),
    )
    clearSelection()
  }

  const skipSelected = () => {
    setRows((prev) =>
      prev.map((r) =>
        selected.has(r.account_number) ? { ...r, skip: true } : r,
      ),
    )
    clearSelection()
  }

  const unskipSelected = () => {
    setRows((prev) =>
      prev.map((r) =>
        selected.has(r.account_number) ? { ...r, skip: false } : r,
      ),
    )
    clearSelection()
  }

  const canCommit = rows.every(
    (r) => r.skip || (!!r.link_code && codeSet.has(r.link_code))
  )

  const doCommit = async (overwrite: boolean) => {
    setCommitting(true)
    setErrorMsg(null)
    try {
      const payload: QboCommitRow[] = rows.map((r) => ({
        account_number: r.account_number,
        account_name: r.account_name,
        link_code: r.link_code,
        skip: r.skip,
        divisions: r.divisions,
        sub_divisions: r.sub_divisions,
      }))
      const result = await commitQboTrialBalance(
        companyId,
        preview.fiscal_year,
        preview.months,
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
          Review trial balance — {preview.fiscal_year}
          {preview.months.length === 1
            ? `-${String(preview.months[0]).padStart(2, "0")}`
            : ` (${MONTH_LABELS[preview.months[0] - 1]} – ${MONTH_LABELS[preview.months[preview.months.length - 1] - 1]})`}
          {" "}({preview.currency})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {preview.months.length} {preview.months.length === 1 ? "month" : "months"}.
          QBO imports are stored as year-to-date (cumulative); financial statements
          de-cumulate on read.
          {preview.existing_months.length > 0 && (
            <>
              {" "}
              <span className="text-amber-700 font-medium">
                {preview.existing_months.length} of these{" "}
                {preview.existing_months.length === 1 ? "month is" : "months are"}{" "}
                already imported — overwrite to replace{" "}
                {preview.existing_months.length === 1 ? "it" : "them"}.
              </span>
            </>
          )}
        </p>
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
          {counts.invalid > 0 && (
            <button
              type="button"
              className={cn(
                "text-amber-700",
                filter === "invalid" && "font-semibold underline",
              )}
              onClick={() => setFilter("invalid")}
            >
              Invalid ({counts.invalid})
            </button>
          )}
          {zeroAmountUnskipped > 0 && (
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={skipAllZeroAmount}
            >
              Skip {zeroAmountUnskipped} zero-amount{" "}
              {zeroAmountUnskipped === 1 ? "row" : "rows"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {linkCodesLoaded && linkCodes.length === 0 && (
          <div className="mb-3 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <p className="font-medium">
              Your statement structure has no link codes yet.
            </p>
            <p className="text-xs">
              Use the picker&apos;s <span className="font-medium">+ Create new link code…</span>{" "}
              action on each row, or set up your statement structure first.
            </p>
          </div>
        )}
        {counts.invalid > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {counts.invalid === 1
                  ? "1 row references a link code that no longer exists in your statement structure."
                  : `${counts.invalid} rows reference link codes that no longer exist in your statement structure.`}
              </p>
              <p className="text-xs">
                Pick a different code or skip those rows before importing.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
              onClick={() => setFilter("invalid")}
            >
              Show
            </Button>
          </div>
        )}
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="font-medium">
              {selected.size} selected
            </span>
            <button
              type="button"
              className="text-xs underline hover:no-underline"
              onClick={clearSelection}
            >
              Clear
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <BulkLinkCodePicker
                codesByStatement={codesByStatement}
                onPick={applyLinkCodeToSelected}
                disabled={linkCodes.length === 0}
              />
              <Button size="sm" variant="outline" onClick={skipSelected}>
                Skip
              </Button>
              <Button size="sm" variant="outline" onClick={unskipSelected}>
                Unskip
              </Button>
            </div>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Select all visible rows"
                    checked={
                      visibleAllSelected
                        ? true
                        : visibleSomeSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={toggleSelectAllVisible}
                  />
                </TableHead>
                <TableHead className="w-[90px]">Account #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">QBO type</TableHead>
                {preview.months.length <= 6 ? (
                  preview.months.map((m) => (
                    <TableHead key={m} className="w-[80px] text-right text-xs">
                      {MONTH_LABELS[m - 1]}
                    </TableHead>
                  ))
                ) : (
                  <TableHead className="w-[120px] text-right text-xs">
                    Activity ({MONTH_LABELS[preview.months[0] - 1]}–
                    {MONTH_LABELS[preview.months[preview.months.length - 1] - 1]})
                  </TableHead>
                )}
                {showDivisions && (
                  <TableHead className="w-[180px]">Division</TableHead>
                )}
                {showSubDivisions && (
                  <TableHead className="w-[180px]">Sous-division</TableHead>
                )}
                <TableHead className="w-[260px]">Link code</TableHead>
                <TableHead className="w-[60px]">Skip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const idx = rows.indexOf(r)
                const invalid = isInvalidRow(r)
                return (
                  <TableRow
                    key={r.account_number}
                    data-state={
                      selected.has(r.account_number) ? "selected" : undefined
                    }
                    className={cn(
                      invalid && "bg-red-50 hover:bg-red-100",
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={`Select row ${r.account_number}`}
                        checked={selected.has(r.account_number)}
                        onCheckedChange={() =>
                          toggleRowSelected(r.account_number)
                        }
                      />
                    </TableCell>
                    <TableCell className="truncate font-mono text-xs">
                      {r.account_number}
                    </TableCell>
                    <TableCell className="truncate" title={r.account_name}>
                      {r.account_name}
                    </TableCell>
                    <TableCell
                      className="truncate text-xs text-muted-foreground"
                      title={`${r.qbo_type ?? "—"}${r.qbo_subtype ? `/${r.qbo_subtype}` : ""}`}
                    >
                      {r.qbo_type ?? "—"}
                      {r.qbo_subtype ? `/${r.qbo_subtype}` : ""}
                    </TableCell>
                    {preview.months.length <= 6 ? (
                      preview.months.map((m) => {
                        const amt = r.monthly_amounts[String(m)]
                        const net = amt ? amt.debit - amt.credit : 0
                        return (
                          <TableCell key={m} className="text-right font-mono text-xs">
                            {amt ? formatCompactAmount(net) : "—"}
                          </TableCell>
                        )
                      })
                    ) : (
                      <TableCell className="text-right font-mono text-xs">
                        {(() => {
                          const net = Object.values(r.monthly_amounts).reduce(
                            (s, a) => s + (a.debit - a.credit),
                            0,
                          )
                          return formatCompactAmount(net)
                        })()}
                      </TableCell>
                    )}
                    {showDivisions && (
                      <TableCell>
                        <QuickBooksTagCell
                          values={r.divisions}
                          options={divisionOptions}
                          onChange={(next) => updateRow(idx, { divisions: next })}
                          placeholder="Division…"
                        />
                      </TableCell>
                    )}
                    {showSubDivisions && (
                      <TableCell>
                        <QuickBooksTagCell
                          values={r.sub_divisions}
                          options={subDivisionOptions}
                          onChange={(next) => updateRow(idx, { sub_divisions: next })}
                          placeholder="Sous-division…"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <LinkCodePicker
                        row={r}
                        idx={idx}
                        codeIndex={codeIndex}
                        codesByStatement={codesByStatement}
                        onPick={(i, code) => updateRow(i, { link_code: code })}
                      />
                      {r.existing_link_code &&
                        r.existing_link_code !== r.link_code && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Was: {r.existing_link_code}
                          </Badge>
                        )}
                      {invalid && (
                        <p className="mt-1 text-xs text-red-700">
                          Code not in structure
                        </p>
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
            Debit total (all months): {totals.debit.toFixed(2)} · Credit total:{" "}
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
              {committing
                ? "Importing…"
                : `Import ${preview.months.length} ${preview.months.length === 1 ? "month" : "months"}`}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {preview.existing_months.length === 1
                ? `Month ${preview.existing_months[0]} already has a trial balance.`
                : `${preview.existing_months.length} months already have trial balances: ${preview.existing_months.join(", ")}.`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Overwrite the existing {preview.existing_months.length === 1 ? "entries" : "entries for those months"}? Other months in the range are unaffected. This cannot be undone.
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
