"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  balanceSheetStructureRowRefId,
  isBalanceSheetValidationStructureRow,
  parseValidationFormula,
  serializeValidationFormula,
  type ValidationFormulaTerm,
} from "@/lib/balance-sheet-validation"
import { isStructureRowEmptyLabel } from "@/lib/income-statement-structure-utils"
import { Trash2 } from "lucide-react"

type BalanceSheetValidationFormulaEditorProps = {
  structure: Record<string, unknown>[]
  validationIndex: number
  onChangeFormula: (formula: string[]) => void
}

export function BalanceSheetValidationFormulaEditor({
  structure,
  validationIndex,
  onChangeFormula,
}: BalanceSheetValidationFormulaEditorProps) {
  const validationRow = structure[validationIndex]
  const terms = parseValidationFormula(validationRow?.formula)

  const selectableRows = structure
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row, index }) =>
        index !== validationIndex &&
        !isBalanceSheetValidationStructureRow(row) &&
        !isStructureRowEmptyLabel(row),
    )
    .map(({ row, index }) => ({
      id: balanceSheetStructureRowRefId(row, index),
      label: String(row.label ?? "").trim() || balanceSheetStructureRowRefId(row, index),
    }))

  const commit = (next: ValidationFormulaTerm[]) => {
    onChangeFormula(serializeValidationFormula(next))
  }

  const updateTerm = (termIdx: number, patch: Partial<ValidationFormulaTerm>) => {
    const next = terms.map((t, i) => (i === termIdx ? { ...t, ...patch } : t))
    commit(next)
  }

  const removeTerm = (termIdx: number) => {
    commit(terms.filter((_, i) => i !== termIdx))
  }

  return (
    <div
      data-testid="balance-sheet-validation-formula-editor"
      className="border-b border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Validation — formule</h3>
        <p className="mt-1 text-xs text-slate-500">
          Écart affiché au sommaire (au-dessus d’Actifs). Par défaut : Total de l’actif − Total des
          passifs et des capitaux propres. Chaque terme additionne (+) ou soustrait (−) le montant
          d’un poste du sommaire.
        </p>
      </div>

      <div className="space-y-2">
        {terms.length === 0 ? (
          <p className="text-xs text-amber-700">
            Aucun terme dans la formule. Enregistrez pour rétablir la formule par défaut, ou
            rechargez les Paramètres.
          </p>
        ) : null}
        {terms.map((term, termIdx) => (
          <div key={`${term.refId}-${termIdx}`} className="flex flex-wrap items-center gap-2">
            <Select
              value={term.sign === -1 ? "-" : "+"}
              onValueChange={(v) => updateTerm(termIdx, { sign: v === "-" ? -1 : 1 })}
            >
              <SelectTrigger className="h-9 w-[4.5rem] bg-white" aria-label={`Signe du terme ${termIdx + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+">+</SelectItem>
                <SelectItem value="-">−</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={term.refId || undefined}
              onValueChange={(v) => updateTerm(termIdx, { refId: v })}
            >
              <SelectTrigger
                className="h-9 min-w-[16rem] flex-1 bg-white"
                aria-label={`Poste du terme ${termIdx + 1}`}
              >
                <SelectValue placeholder="Choisir un poste" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(24rem,70vh)]">
                {selectableRows.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-slate-400 hover:text-red-600"
              onClick={() => removeTerm(termIdx)}
              aria-label={`Supprimer le terme ${termIdx + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
