"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ApiError,
  createLinkCode,
  getCompanyStatementStructure,
  type QboLinkCode,
  type StatementStructureNode,
} from "@/lib/api"

const STATEMENT_TYPES: { value: string; label: string }[] = [
  { value: "income-statement", label: "Income statement" },
  { value: "balance-sheet", label: "Balance sheet" },
  { value: "cash-flow", label: "Cash flow" },
  { value: "capex", label: "Capex" },
  { value: "baiia", label: "BAIIA" },
]

type ParentOption = { id: string; label: string }

function collectParents(nodes: StatementStructureNode[]): ParentOption[] {
  const out: ParentOption[] = []
  const seen = new Set<string>()
  const walk = (list: StatementStructureNode[] | undefined) => {
    if (!Array.isArray(list)) return
    for (const n of list) {
      const identifier = n.id ?? n.label
      const isPlausibleParent =
        Boolean(identifier) &&
        (n.isSection === true ||
          (Array.isArray(n.children) && n.children.length > 0) ||
          (Array.isArray(n.detailRows) && n.detailRows.length >= 0))
      if (isPlausibleParent && !seen.has(String(identifier))) {
        seen.add(String(identifier))
        out.push({
          id: String(identifier),
          label: String(n.label ?? identifier),
        })
      }
      walk(n.children)
      walk(n.detailRows)
    }
  }
  walk(nodes)
  return out
}

interface Props {
  companyId: string
  open: boolean
  defaultLabel?: string
  existingCodes: Set<string>
  onClose: () => void
  onCreated: (created: QboLinkCode) => void
}

export function CreateLinkCodeDialog({
  companyId,
  open,
  defaultLabel = "",
  existingCodes,
  onClose,
  onCreated,
}: Props) {
  const [statementType, setStatementType] = useState("income-statement")
  const [parents, setParents] = useState<ParentOption[]>([])
  const [parentId, setParentId] = useState<string>("")
  const [linkCode, setLinkCode] = useState("")
  const [label, setLabel] = useState(defaultLabel)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(defaultLabel)
    setLinkCode("")
    setError(null)
  }, [open, defaultLabel])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getCompanyStatementStructure(companyId, statementType)
      .then((res) => {
        if (cancelled) return
        const opts = collectParents(res.structure || [])
        setParents(opts)
        setParentId(opts[0]?.id ?? "")
      })
      .catch(() => {
        if (cancelled) return
        setParents([])
        setParentId("")
      })
    return () => {
      cancelled = true
    }
  }, [open, companyId, statementType])

  const codeConflict = useMemo(
    () => linkCode.trim().length > 0 && existingCodes.has(linkCode.trim()),
    [linkCode, existingCodes],
  )

  const canSubmit =
    !!parentId && linkCode.trim().length > 0 && label.trim().length > 0 && !codeConflict && !submitting

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await createLinkCode(companyId, {
        statement_type: statementType,
        parent_id: parentId,
        link_code: linkCode.trim(),
        label: label.trim(),
      })
      onCreated(created)
      onClose()
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : String(e)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create link code</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cl-statement">Statement</Label>
            <Select value={statementType} onValueChange={setStatementType}>
              <SelectTrigger id="cl-statement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-parent">Parent section</Label>
            <Select value={parentId} onValueChange={setParentId} disabled={!parents.length}>
              <SelectTrigger id="cl-parent">
                <SelectValue placeholder={parents.length ? "Select…" : "No sections found"} />
              </SelectTrigger>
              <SelectContent>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-code">Link code</Label>
            <Input
              id="cl-code"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              placeholder="e.g. 44-999"
            />
            {codeConflict && (
              <p className="text-xs text-red-600">
                This code already exists for this company.
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-label">Label</Label>
            <Input
              id="cl-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
