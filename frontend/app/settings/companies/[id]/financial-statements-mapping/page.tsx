"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit2, X, Check, Plus, ChevronUp, ChevronDown, Trash2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  getCompany,
  getStatementStructure,
  upsertStatementStructure,
  type Company,
} from "@/lib/api"

interface FinancialStatementRow {
  label: string
  isBold?: boolean
  isSection?: boolean
  indent?: boolean
  isResult?: boolean
  isNetIncome?: boolean
  isEBITA?: boolean
  isHidden?: boolean
  detailRows?: FinancialStatementRow[] // Postes détaillés pour la vue Détail
  isExpanded?: boolean // Pour l'expansion/collapse des postes sommaires
}

interface BalanceSheetRow {
  label: string
  isBold?: boolean
  isSection?: boolean
  indent?: boolean
  doubleIndent?: boolean // For sub-items under actifs courants, etc.
  isResult?: boolean
  isHidden?: boolean
  linkCode?: string
}

export default function FinancialStatementsMappingPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const [company, setCompany] = useState<Company | null>(null)
  const [editingPostIndex, setEditingPostIndex] = useState<number | null>(null)
  const [editingPostName, setEditingPostName] = useState("")
  const [addingPostAfterIndex, setAddingPostAfterIndex] = useState<number | null>(null)
  const [newPostName, setNewPostName] = useState("")
  const [financialStatementRows, setFinancialStatementRows] = useState<FinancialStatementRow[]>([])
  const [balanceSheetRows, setBalanceSheetRows] = useState<BalanceSheetRow[]>([])
  const [view, setView] = useState<"summary" | "detail">("summary")
  const [balanceView, setBalanceView] = useState<"summary" | "capex">("summary")
  const [activeDocumentType, setActiveDocumentType] = useState<"income" | "balance">("income")
  const [addingDetailToIndex, setAddingDetailToIndex] = useState<number | null>(null)
  const [newDetailName, setNewDetailName] = useState("")
  const [editingDetailIndex, setEditingDetailIndex] = useState<{ parentIndex: number; detailIndex: number } | null>(null)
  const [editingDetailName, setEditingDetailName] = useState("")
  const [editingLinkCodeIndex, setEditingLinkCodeIndex] = useState<number | null>(null)
  const [editingLinkCode, setEditingLinkCode] = useState("")

  const [loading, setLoading] = useState(true)

  const defaultIncomeStatementRows: FinancialStatementRow[] = [
    { label: "revenus", isBold: true, isSection: true },
    { label: "coût des produits vendus", isSection: true, indent: true },
    { label: "bénéfice brut", isBold: true, isResult: true },
    { label: "" },
    { label: "charges d'exploitation", isBold: true, isSection: true },
    { label: "frais d'administration", indent: true },
    { label: "frais de vente", indent: true },
    { label: "autres dépenses (revenus)", indent: true },
    { label: "total des charges", isBold: true },
    { label: "" },
    { label: "bénéfice avant impôts", isBold: true, isResult: true },
    { label: "impôts (26%)", indent: true },
    { label: "bénéfice net", isBold: true, isNetIncome: true },
    { label: "" },
    { label: "BAIIA", isBold: true, isEBITA: true },
  ]

  const defaultBalanceSheetRows: BalanceSheetRow[] = [
    { label: "actifs", isBold: true, isSection: true },
    { label: "actifs courants", isSection: true, indent: true },
    { label: "actifs non courants", isSection: true, indent: true },
    { label: "total des actifs", isBold: true, isResult: true },
    { label: "" },
    { label: "passifs", isBold: true, isSection: true },
    { label: "passifs courants", indent: true },
    { label: "passifs non courants", indent: true },
    { label: "total des passifs", isBold: true },
    { label: "" },
    { label: "capitaux propres", isBold: true, isResult: true },
    { label: "total passifs et capitaux propres", isBold: true, isResult: true },
  ]

  const loadData = useCallback(async () => {
    try {
      const companyData = await getCompany(companyId)
      setCompany(companyData)

      // Load income statement structure
      try {
        const isData = await getStatementStructure(companyId, "income-statement")
        const rows = isData.structure as unknown as FinancialStatementRow[]
        // Auto-fix: ensure COGS is between Revenus and Bénéfice brut
        const revenusIndex = rows.findIndex(r => r.label?.toLowerCase() === "revenus")
        const cogsIndex = rows.findIndex(r => r.label?.toLowerCase() === "coût des produits vendus")
        const beneficeBrutIndex = rows.findIndex(r => r.label?.toLowerCase() === "bénéfice brut")
        if (revenusIndex !== -1 && cogsIndex !== -1 && beneficeBrutIndex !== -1 &&
            !(cogsIndex > revenusIndex && cogsIndex < beneficeBrutIndex)) {
          const cogsRow = rows[cogsIndex]
          const rowsWithoutCogs = rows.filter((_, i) => i !== cogsIndex)
          const newRevenusIndex = rowsWithoutCogs.findIndex(r => r.label?.toLowerCase() === "revenus")
          if (newRevenusIndex !== -1) {
            const reorderedRows = [
              ...rowsWithoutCogs.slice(0, newRevenusIndex + 1),
              cogsRow,
              ...rowsWithoutCogs.slice(newRevenusIndex + 1)
            ]
            setFinancialStatementRows(reorderedRows)
            await upsertStatementStructure(companyId, "income-statement", reorderedRows as unknown as Record<string, unknown>[])
          } else {
            setFinancialStatementRows(rows)
          }
        } else {
          setFinancialStatementRows(rows)
        }
      } catch {
        // No structure saved yet, use defaults and save them
        setFinancialStatementRows(defaultIncomeStatementRows)
        await upsertStatementStructure(companyId, "income-statement", defaultIncomeStatementRows as unknown as Record<string, unknown>[])
      }

      // Load balance sheet structure
      try {
        const bsData = await getStatementStructure(companyId, "balance-sheet")
        setBalanceSheetRows(bsData.structure as unknown as BalanceSheetRow[])
      } catch {
        // No structure saved yet, use defaults and save them
        setBalanceSheetRows(defaultBalanceSheetRows)
        await upsertStatementStructure(companyId, "balance-sheet", defaultBalanceSheetRows as unknown as Record<string, unknown>[])
      }
    } catch (e) {
      console.error("Error loading data:", e)
      router.push(`/settings/companies/${companyId}`)
    } finally {
      setLoading(false)
    }
  }, [companyId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  // Save financial statement rows to API
  const saveFinancialStatementRows = async (rows: FinancialStatementRow[]) => {
    try {
      await upsertStatementStructure(companyId, "income-statement", rows as unknown as Record<string, unknown>[])
    } catch (e) {
      console.error("Error saving financial statement rows:", e)
    }
  }

  // Helper function to capitalize first letter (same as in income-statement-summary)
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    // Special case: BAIIA should be all uppercase
    if (str.toLowerCase() === "baiia") return "BAIIA"
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Handle start editing a post
  const handleStartEditPost = (index: number) => {
    if (financialStatementRows[index].label === "") return // Don't edit spacers
    setEditingPostIndex(index)
    setEditingPostName(financialStatementRows[index].label)
  }

  // Handle save edited post
  const handleSaveEditPost = () => {
    if (editingPostIndex !== null && editingPostName.trim()) {
      const updatedRows = [...financialStatementRows]
      updatedRows[editingPostIndex] = {
        ...updatedRows[editingPostIndex],
        label: editingPostName.trim()
      }
      setFinancialStatementRows(updatedRows)
      saveFinancialStatementRows(updatedRows)
      setEditingPostIndex(null)
      setEditingPostName("")
    }
  }

  // Handle cancel editing
  const handleCancelEditPost = () => {
    setEditingPostIndex(null)
    setEditingPostName("")
  }

  // Handle start adding a post
  const handleStartAddPost = (afterIndex: number) => {
    setAddingPostAfterIndex(afterIndex)
    setNewPostName("")
  }

  // Handle save new post
  const handleSaveAddPost = () => {
    if (addingPostAfterIndex !== null && newPostName.trim()) {
      const updatedRows = [...financialStatementRows]
      const afterRow = updatedRows[addingPostAfterIndex]
      // Determine if the new post should be indented (if the row after which we're adding is indented or is "charges d'exploitation")
      const shouldIndent = afterRow.indent || afterRow.label.toLowerCase() === "charges d'exploitation"
      
      const newPost: FinancialStatementRow = {
        label: newPostName.trim(),
        indent: shouldIndent
      }
      
      updatedRows.splice(addingPostAfterIndex + 1, 0, newPost)
      setFinancialStatementRows(updatedRows)
      saveFinancialStatementRows(updatedRows)
      setAddingPostAfterIndex(null)
      setNewPostName("")
    }
  }

  // Handle cancel adding
  const handleCancelAddPost = () => {
    setAddingPostAfterIndex(null)
    setNewPostName("")
  }

  // Handle delete post
  const handleDeletePost = (index: number) => {
    const row = financialStatementRows[index]
    // Only allow deleting indented posts (posts under Charges d'exploitation)
    if (!row.indent) return
    
    // Don't allow deleting "Coûts des produits vendus" or "Impôts" in any view
    const labelLower = row.label.toLowerCase()
    if (labelLower === "coût des produits vendus" || 
        labelLower.includes("impôt")) {
      return
    }
    
    // In detail view, don't allow deleting "Frais d'administration", "Frais de vente" or "Autres dépenses (revenus)"
    // But allow deleting them in summary view
    if (view === "detail" && (
        labelLower === "frais d'administration" ||
        labelLower === "frais de vente" ||
        labelLower === "autres dépenses (revenus)")) {
      return
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${row.label}" ?`)) {
      const updatedRows = financialStatementRows.filter((_, i) => i !== index)
      setFinancialStatementRows(updatedRows)
      saveFinancialStatementRows(updatedRows)
    }
  }

  // Handle toggle hide/show for bold titles
  const handleToggleHide = (index: number) => {
    const updatedRows = [...financialStatementRows]
    updatedRows[index] = {
      ...updatedRows[index],
      isHidden: !updatedRows[index].isHidden
    }
    setFinancialStatementRows(updatedRows)
    saveFinancialStatementRows(updatedRows)
  }

  // Check if a row can have detail rows (main posts that can be expanded)
  const canHaveDetails = (row: FinancialStatementRow): boolean => {
    if (!row.label) return false
    const label = row.label.toLowerCase()
    return (
      label === "revenus" ||
      label === "coût des produits vendus" ||
      label === "frais d'administration" ||
      label === "frais de vente" ||
      label === "autres dépenses (revenus)" ||
      label.includes("impôt")
    )
  }

  // Toggle expansion of summary row for detail view
  const handleToggleExpand = (index: number) => {
    const updatedRows = [...financialStatementRows]
    updatedRows[index] = {
      ...updatedRows[index],
      isExpanded: !updatedRows[index].isExpanded,
      detailRows: updatedRows[index].detailRows || []
    }
    setFinancialStatementRows(updatedRows)
    saveFinancialStatementRows(updatedRows)
  }

  // Handle start adding detail row
  const handleStartAddDetail = (parentIndex: number) => {
    setAddingDetailToIndex(parentIndex)
    setNewDetailName("")
  }

  // Handle save new detail row
  const handleSaveAddDetail = () => {
    if (addingDetailToIndex !== null && newDetailName.trim()) {
      const updatedRows = [...financialStatementRows]
      const parentRow = updatedRows[addingDetailToIndex]
      const newDetailRow: FinancialStatementRow = {
        label: newDetailName.trim(),
        indent: true
      }
      
      if (!parentRow.detailRows) {
        parentRow.detailRows = []
      }
      parentRow.detailRows.push(newDetailRow)
      parentRow.isExpanded = true
      
      setFinancialStatementRows(updatedRows)
      saveFinancialStatementRows(updatedRows)
      setAddingDetailToIndex(null)
      setNewDetailName("")
    }
  }

  // Handle cancel adding detail
  const handleCancelAddDetail = () => {
    setAddingDetailToIndex(null)
    setNewDetailName("")
  }

  // Handle start editing detail row
  const handleStartEditDetail = (parentIndex: number, detailIndex: number) => {
    const parentRow = financialStatementRows[parentIndex]
    if (parentRow.detailRows && parentRow.detailRows[detailIndex]) {
      setEditingDetailIndex({ parentIndex, detailIndex })
      setEditingDetailName(parentRow.detailRows[detailIndex].label)
    }
  }

  // Handle save edited detail row
  const handleSaveEditDetail = () => {
    if (editingDetailIndex && editingDetailName.trim()) {
      const updatedRows = [...financialStatementRows]
      const parentRow = updatedRows[editingDetailIndex.parentIndex]
      if (parentRow.detailRows && parentRow.detailRows[editingDetailIndex.detailIndex]) {
        parentRow.detailRows[editingDetailIndex.detailIndex] = {
          ...parentRow.detailRows[editingDetailIndex.detailIndex],
          label: editingDetailName.trim()
        }
        setFinancialStatementRows(updatedRows)
        saveFinancialStatementRows(updatedRows)
        setEditingDetailIndex(null)
        setEditingDetailName("")
      }
    }
  }

  // Handle cancel editing detail
  const handleCancelEditDetail = () => {
    setEditingDetailIndex(null)
    setEditingDetailName("")
  }

  // Handle delete detail row
  const handleDeleteDetail = (parentIndex: number, detailIndex: number) => {
    const parentRow = financialStatementRows[parentIndex]
    if (parentRow.detailRows && parentRow.detailRows[detailIndex]) {
      const detailRow = parentRow.detailRows[detailIndex]
      if (confirm(`Êtes-vous sûr de vouloir supprimer "${detailRow.label}" ?`)) {
        const updatedRows = [...financialStatementRows]
        updatedRows[parentIndex].detailRows = updatedRows[parentIndex].detailRows?.filter((_, i) => i !== detailIndex) || []
        setFinancialStatementRows(updatedRows)
        saveFinancialStatementRows(updatedRows)
      }
    }
  }

  // Find the index of a fixed category or section boundary
  const findCategoryIndex = (categoryLabel: string): number => {
    return financialStatementRows.findIndex(
      row => row.label.toLowerCase() === categoryLabel.toLowerCase()
    )
  }

  // Handle move post up
  const handleMovePostUp = (index: number) => {
    if (index === 0) return // Can't move first row up
    const updatedRows = [...financialStatementRows]
    const currentRow = updatedRows[index]
    const previousRow = updatedRows[index - 1]
    
    // Don't move if previous row is a spacer
    if (previousRow.label === "") return
    
    // Fixed categories that cannot be moved past
    const fixedCategories = ["revenus", "charges d'exploitation", "bénéfice avant impôts"]
    
    // Don't allow moving "Coûts des produits vendus" or moving anything between Revenus and Bénéfice brut
    const cogsIndex = findCategoryIndex("coût des produits vendus")
    const revenusIndex = findCategoryIndex("revenus")
    const beneficeBrutIndex = findCategoryIndex("bénéfice brut")
    
    // Prevent moving "Coûts des produits vendus", "Impôts", "Frais d'administration", "Frais de vente" and "Autres dépenses (revenus)"
    const currentLabel = currentRow.label.toLowerCase()
    if (currentLabel === "coût des produits vendus" || 
        currentLabel.includes("impôt") ||
        currentLabel === "frais d'administration" ||
        currentLabel === "frais de vente" ||
        currentLabel === "autres dépenses (revenus)") {
      return
    }
    
    // Prevent moving anything above "Coûts des produits vendus" if it's between Revenus and Bénéfice brut
    if (cogsIndex !== -1 && revenusIndex !== -1 && beneficeBrutIndex !== -1) {
      if (cogsIndex > revenusIndex && cogsIndex < beneficeBrutIndex) {
        // Coûts des produits vendus is correctly positioned
        // Don't allow moving anything into the space between Revenus and Bénéfice brut
        if (index > revenusIndex && index < beneficeBrutIndex && index - 1 <= revenusIndex) {
          return // Can't move into the space between Revenus and Bénéfice brut
        }
        // Don't allow moving Coûts des produits vendus itself
        if (index === cogsIndex) {
          return
        }
      }
    }
    
    // If current row is indented (part of a section), find which section it belongs to
    if (currentRow.indent) {
      // Find the section header above this row
      for (let i = index - 1; i >= 0; i--) {
        const row = updatedRows[i]
        if (row.label === "") continue // Skip spacers
        if (fixedCategories.includes(row.label.toLowerCase())) {
          // Found a fixed category - don't allow moving above it
          if (i < index - 1) {
            // The previous row is not the fixed category, but we're in its section
            // Check if moving up would cross the fixed category boundary
            const chargesIndex = findCategoryIndex("charges d'exploitation")
            if (chargesIndex !== -1 && index > chargesIndex && index - 1 <= chargesIndex) {
              return // Can't move above charges d'exploitation
            }
            const revenusIdx = findCategoryIndex("revenus")
            if (revenusIdx !== -1 && index > revenusIdx && index - 1 <= revenusIdx) {
              return // Can't move above revenus
            }
            const beneficeIdx = findCategoryIndex("bénéfice avant impôts")
            if (beneficeIdx !== -1 && index > beneficeIdx && index - 1 <= beneficeIdx) {
              return // Can't move above bénéfice avant impôts
            }
          }
          break
        }
      }
    }
    
    // Don't allow moving a fixed category
    if (fixedCategories.includes(currentRow.label.toLowerCase()) || 
        fixedCategories.includes(previousRow.label.toLowerCase())) {
      return
    }
    
    // Swap rows
    updatedRows[index] = previousRow
    updatedRows[index - 1] = currentRow
    
    setFinancialStatementRows(updatedRows)
    saveFinancialStatementRows(updatedRows)
  }

  // Handle move post down
  const handleMovePostDown = (index: number) => {
    if (index === financialStatementRows.length - 1) return // Can't move last row down
    const updatedRows = [...financialStatementRows]
    const currentRow = updatedRows[index]
    const nextRow = updatedRows[index + 1]
    
    // Don't move if next row is a spacer
    if (nextRow.label === "") return
    
    // Fixed categories that cannot be moved past
    const fixedCategories = ["revenus", "charges d'exploitation", "bénéfice avant impôts"]
    
    // Don't allow moving "Coûts des produits vendus" or moving anything between Revenus and Bénéfice brut
    const cogsIndex = findCategoryIndex("coût des produits vendus")
    const revenusIndex = findCategoryIndex("revenus")
    const beneficeBrutIndex = findCategoryIndex("bénéfice brut")
    
    // Prevent moving "Coûts des produits vendus", "Impôts", "Frais d'administration", "Frais de vente" and "Autres dépenses (revenus)"
    const currentLabel = currentRow.label.toLowerCase()
    if (currentLabel === "coût des produits vendus" || 
        currentLabel.includes("impôt") ||
        currentLabel === "frais d'administration" ||
        currentLabel === "frais de vente" ||
        currentLabel === "autres dépenses (revenus)") {
      return
    }
    
    // Prevent moving anything that would disrupt the position of "Coûts des produits vendus" between Revenus and Bénéfice brut
    if (cogsIndex !== -1 && revenusIndex !== -1 && beneficeBrutIndex !== -1) {
      if (cogsIndex > revenusIndex && cogsIndex < beneficeBrutIndex) {
        // Coûts des produits vendus is correctly positioned between Revenus and Bénéfice brut
        // Don't allow moving anything into the space between Revenus and Bénéfice brut
        if (index < revenusIndex && index + 1 >= revenusIndex && index + 1 < beneficeBrutIndex) {
          return // Can't move into the space between Revenus and Bénéfice brut
        }
        // Don't allow moving anything from above Revenus to below Bénéfice brut if it would cross Coûts des produits vendus
        if (index < revenusIndex && index + 1 > beneficeBrutIndex) {
          return // Can't move past the Revenus -> Coûts -> Bénéfice brut section
        }
        // Don't allow moving Coûts des produits vendus itself
        if (index === cogsIndex) {
          return
        }
        // Don't allow moving anything from between Revenus and Bénéfice brut to outside this section
        if (index > revenusIndex && index < beneficeBrutIndex && index + 1 > beneficeBrutIndex) {
          return // Can't move out of the Revenus -> Coûts -> Bénéfice brut section
        }
      }
    }
    
    // Don't allow moving a fixed category
    if (fixedCategories.includes(currentRow.label.toLowerCase()) || 
        fixedCategories.includes(nextRow.label.toLowerCase())) {
      return
    }
    
    // If current row is indented, don't allow moving below section boundaries
    if (currentRow.indent) {
      const chargesIndex = findCategoryIndex("charges d'exploitation")
      const totalChargesIndex = findCategoryIndex("total des charges")
      const beneficeIndex = findCategoryIndex("bénéfice avant impôts")
      
      // If we're in charges d'exploitation section, don't move below total des charges
      if (chargesIndex !== -1 && index > chargesIndex) {
        if (totalChargesIndex !== -1 && index + 1 >= totalChargesIndex) {
          return // Can't move below total des charges
        }
        if (beneficeIndex !== -1 && index + 1 >= beneficeIndex) {
          return // Can't move below bénéfice avant impôts
        }
      }
    }
    
    // Swap rows
    updatedRows[index] = nextRow
    updatedRows[index + 1] = currentRow
    
    setFinancialStatementRows(updatedRows)
    saveFinancialStatementRows(updatedRows)
  }

  // Save balance sheet rows to API
  const saveBalanceSheetRows = async (rows: BalanceSheetRow[]) => {
    try {
      await upsertStatementStructure(companyId, "balance-sheet", rows as unknown as Record<string, unknown>[])
    } catch (e) {
      console.error("Error saving balance sheet rows:", e)
    }
  }

  // Handle start editing a balance sheet post
  const handleStartEditBalancePost = (index: number) => {
    if (balanceSheetRows[index].label === "") return // Don't edit spacers
    setEditingPostIndex(index)
    setEditingPostName(balanceSheetRows[index].label)
  }

  // Handle save edited balance sheet post
  const handleSaveEditBalancePost = () => {
    if (editingPostIndex !== null && editingPostName.trim()) {
      const updatedRows = [...balanceSheetRows]
      updatedRows[editingPostIndex] = {
        ...updatedRows[editingPostIndex],
        label: editingPostName.trim()
      }
      setBalanceSheetRows(updatedRows)
      saveBalanceSheetRows(updatedRows)
      setEditingPostIndex(null)
      setEditingPostName("")
    }
  }

  // Handle start adding a balance sheet post
  const handleStartAddBalancePost = (afterIndex: number) => {
    setAddingPostAfterIndex(afterIndex)
    setNewPostName("")
  }

  // Handle save new balance sheet post
  const handleSaveAddBalancePost = () => {
    if (addingPostAfterIndex !== null && newPostName.trim()) {
      const updatedRows = [...balanceSheetRows]
      const afterRow = updatedRows[addingPostAfterIndex]
      const labelLower = afterRow.label.toLowerCase()
      // New posts added after actifs courants, actifs non courants, passifs courants, passifs non courants, or capitaux propres should be double-indented
      const isSubItem = labelLower === "actifs courants" || 
                        labelLower === "actifs non courants" || 
                        labelLower === "passifs courants" || 
                        labelLower === "passifs non courants" ||
                        labelLower === "capitaux propres"
      
      const newPost: BalanceSheetRow = {
        label: newPostName.trim(),
        indent: true,
        doubleIndent: isSubItem // Extra indentation for sub-items
      }
      
      updatedRows.splice(addingPostAfterIndex + 1, 0, newPost)
      setBalanceSheetRows(updatedRows)
      saveBalanceSheetRows(updatedRows)
      setAddingPostAfterIndex(null)
      setNewPostName("")
    }
  }

  // Handle delete balance sheet post
  const handleDeleteBalancePost = (index: number) => {
    const row = balanceSheetRows[index]
    // Don't allow deleting section headers or totals
    if (row.isSection || row.isResult || row.label === "") return
    
    // Don't allow deleting "passifs courants", "passifs non courants" or "total des passifs"
    const labelLower = row.label.toLowerCase()
    if (labelLower === "passifs courants" || 
        labelLower === "passifs non courants" || 
        labelLower === "total des passifs") {
      return
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${row.label}" ?`)) {
      const updatedRows = balanceSheetRows.filter((_, i) => i !== index)
      setBalanceSheetRows(updatedRows)
      saveBalanceSheetRows(updatedRows)
    }
  }

  // Handle toggle hide/show for balance sheet
  const handleToggleHideBalance = (index: number) => {
    const updatedRows = [...balanceSheetRows]
    updatedRows[index] = {
      ...updatedRows[index],
      isHidden: !updatedRows[index].isHidden
    }
    setBalanceSheetRows(updatedRows)
    saveBalanceSheetRows(updatedRows)
  }

  // Handle start editing link code
  const handleStartEditLinkCode = (index: number) => {
    if (balanceSheetRows[index].label === "") return // Don't edit spacers
    setEditingLinkCodeIndex(index)
    setEditingLinkCode(balanceSheetRows[index].linkCode || "")
  }

  // Handle save edited link code
  const handleSaveEditLinkCode = () => {
    if (editingLinkCodeIndex !== null) {
      const updatedRows = [...balanceSheetRows]
      updatedRows[editingLinkCodeIndex] = {
        ...updatedRows[editingLinkCodeIndex],
        linkCode: editingLinkCode.trim() || undefined
      }
      setBalanceSheetRows(updatedRows)
      saveBalanceSheetRows(updatedRows)
      setEditingLinkCodeIndex(null)
      setEditingLinkCode("")
    }
  }

  // Handle cancel editing link code
  const handleCancelEditLinkCode = () => {
    setEditingLinkCodeIndex(null)
    setEditingLinkCode("")
  }

  // Handle move balance sheet post up
  const handleMoveBalancePostUp = (index: number) => {
    if (index === 0) return
    const updatedRows = [...balanceSheetRows]
    const currentRow = updatedRows[index]
    const previousRow = updatedRows[index - 1]
    
    // Don't move if previous row is a spacer or if current row is a section/result
    if (previousRow.label === "" || currentRow.isSection || currentRow.isResult) return
    
    // Don't move section headers or totals
    if (currentRow.isSection || currentRow.isResult) return
    
    // Don't allow moving "passifs courants", "passifs non courants" or "total des passifs"
    const labelLower = currentRow.label.toLowerCase()
    if (labelLower === "passifs courants" || 
        labelLower === "passifs non courants" || 
        labelLower === "total des passifs") {
      return
    }
    
    [updatedRows[index - 1], updatedRows[index]] = [updatedRows[index], updatedRows[index - 1]]
    setBalanceSheetRows(updatedRows)
    saveBalanceSheetRows(updatedRows)
  }

  // Handle move balance sheet post down
  const handleMoveBalancePostDown = (index: number) => {
    if (index === balanceSheetRows.length - 1) return
    const updatedRows = [...balanceSheetRows]
    const currentRow = updatedRows[index]
    const nextRow = updatedRows[index + 1]
    
    // Don't move if next row is a spacer or if current row is a section/result
    if (nextRow.label === "" || currentRow.isSection || currentRow.isResult) return
    
    // Don't move section headers or totals
    if (currentRow.isSection || currentRow.isResult) return
    
    // Don't allow moving "passifs courants", "passifs non courants" or "total des passifs"
    const labelLower = currentRow.label.toLowerCase()
    if (labelLower === "passifs courants" || 
        labelLower === "passifs non courants" || 
        labelLower === "total des passifs") {
      return
    }
    
    [updatedRows[index], updatedRows[index + 1]] = [updatedRows[index + 1], updatedRows[index]]
    setBalanceSheetRows(updatedRows)
    saveBalanceSheetRows(updatedRows)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">{company.name}</h2>
              </div>
              <p className="text-base text-slate-300 mb-6">
                Configuration et paramètres de la société
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Gérez les informations de votre société, ses divisions et sous-divisions. Configurez les paramètres 
                comptables et accédez aux différents modules de configuration pour cette entité.
              </p>
              {/* Navigation Menu */}
              <div className="flex items-end gap-8 mb-2">
                <Link
                  href={`/settings/companies/${companyId}`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Information de base
                  </span>
                </Link>
                <Link
                  href={`/settings/companies/${companyId}/mapping`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Mapping comptable
                  </span>
                </Link>
                <div className="relative pb-4 border-b border-slate-600/30">
                  <span className="text-sm font-normal transition-colors text-white">
                    Mapping états financiers
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                </div>
                <Link
                  href={`/settings/companies/${companyId}/trial-balance`}
                  className="relative pb-4 border-b border-slate-600/30"
                >
                  <span className="text-sm font-normal transition-colors text-slate-300 hover:text-white">
                    Balance de vérification
                  </span>
                </Link>
              </div>
              
              {/* Controls Section */}
              <div className="mb-6 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap">États des résultats:</span>
                    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setView("summary")
                          setActiveDocumentType("income")
                        }}
                        className={`h-8 text-xs px-3 transition-all ${
                          view === "summary" && activeDocumentType === "income"
                            ? "bg-emerald-500 text-white font-medium shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        Sommaire
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setView("detail")
                          setActiveDocumentType("income")
                        }}
                        className={`h-8 text-xs px-3 transition-all ${
                          view === "detail" && activeDocumentType === "income"
                            ? "bg-emerald-500 text-white font-medium shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        Détail
                      </Button>
                    </div>
                  </div>
                  
                  {/* Balance Sheet Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Bilan:</span>
                    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBalanceView("summary")
                          setActiveDocumentType("balance")
                        }}
                        className={`h-8 text-xs px-3 transition-all ${
                          balanceView === "summary" && activeDocumentType === "balance"
                            ? "bg-emerald-500 text-white font-medium shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        Sommaire
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setBalanceView("capex")
                          setActiveDocumentType("balance")
                        }}
                        className={`h-8 text-xs px-3 transition-all ${
                          balanceView === "capex" && activeDocumentType === "balance"
                            ? "bg-emerald-500 text-white font-medium shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        Capex
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          {/* Conditional rendering: Balance Sheet or Financial Statements */}
          {activeDocumentType === "balance" && balanceView === "summary" ? (
            /* Mapping Bilan Card */
            <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
              {/* Header */}
              <div className="bg-white px-8 py-5 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mapping Bilan</h2>
                      <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                        <span className="font-medium">{company.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Poste</th>
                      <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm w-24">Masquer</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Code de liaison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceSheetRows.map((row, index) => {
                      const isSpacer = row.label === ""
                      const displayLabel = row.label ? capitalizeFirst(row.label) : ""
                      const isEditing = editingPostIndex === index && balanceView === "summary"
                      const isAdding = addingPostAfterIndex === index && balanceView === "summary"
                      const nextRow = index < balanceSheetRows.length - 1 ? balanceSheetRows[index + 1] : null
                      const nextRowIsKeyResult = nextRow && (
                        (nextRow.isResult && nextRow.label?.toLowerCase() !== "bénéfice avant impôts") || 
                        nextRow.label?.toLowerCase() === "total des actifs" ||
                        nextRow.label?.toLowerCase() === "total des passifs" ||
                        nextRow.label?.toLowerCase() === "total passifs et capitaux propres"
                      )
                      const canAddAfter = !isSpacer && (
                        row.label.toLowerCase() === "actifs courants" || 
                        row.label.toLowerCase() === "actifs non courants" || 
                        row.label.toLowerCase() === "passifs courants" || 
                        row.label.toLowerCase() === "passifs non courants" ||
                        row.label.toLowerCase() === "capitaux propres"
                      )
                      const labelLower = row.label.toLowerCase()
                      const isProtectedRow = labelLower === "passifs courants" || 
                                             labelLower === "passifs non courants" || 
                                             labelLower === "total des passifs"
                      const canMoveRow = !isSpacer && !row.isSection && !row.isResult && 
                                        labelLower !== "passifs courants" && 
                                        labelLower !== "passifs non courants" &&
                                        labelLower !== "total des passifs"
                      const canDeleteRow = !isSpacer && !row.isSection && !row.isResult && !isProtectedRow
                      
                      return (
                        <tr
                          key={index}
                          className={`border-b ${
                            isSpacer 
                              ? "h-12 border-slate-200" 
                              : (nextRowIsKeyResult)
                                ? "border-slate-900 border-b-2" 
                                : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <td className={`px-6 py-3 text-sm ${isSpacer ? "h-12" : ""} ${row.isBold ? "font-bold text-slate-900" : row.doubleIndent ? "pl-20 text-slate-700" : row.indent ? "pl-12 text-slate-700" : "text-slate-700"}`}>
                            {isSpacer ? (
                              ""
                            ) : isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingPostName}
                                  onChange={(e) => setEditingPostName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEditBalancePost()
                                    } else if (e.key === "Escape") {
                                      handleCancelEditPost()
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveEditBalancePost}
                                  disabled={!editingPostName.trim()}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelEditPost}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="flex items-center gap-2 flex-1 cursor-pointer group"
                                  onClick={() => handleStartEditBalancePost(index)}
                                >
                                  <span>{displayLabel}</span>
                                  {!isSpacer && (
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {canAddAfter && !isEditing && (
                                    <Button
                                      onClick={() => handleStartAddBalancePost(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {canMoveRow && (
                                    <>
                                      <Button
                                        onClick={() => handleMoveBalancePostUp(index)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                        disabled={index === 0 || balanceSheetRows[index - 1].label === ""}
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        onClick={() => handleMoveBalancePostDown(index)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                        disabled={index === balanceSheetRows.length - 1 || balanceSheetRows[index + 1].label === ""}
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {canDeleteRow && (
                                    <Button
                                      onClick={() => handleDeleteBalancePost(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                                {isAdding && (
                                  <div className="flex items-center gap-2 ml-4">
                                    <Input
                                      value={newPostName}
                                      onChange={(e) => setNewPostName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveAddBalancePost()
                                        } else if (e.key === "Escape") {
                                          handleCancelAddPost()
                                        }
                                      }}
                                      placeholder="Nom du poste"
                                      className="flex-1 h-8"
                                      autoFocus
                                    />
                                    <Button
                                      onClick={handleSaveAddBalancePost}
                                      disabled={!newPostName.trim()}
                                      size="sm"
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={handleCancelAddPost}
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-3 text-sm ${isSpacer ? "h-12" : "text-slate-600"}`}>
                            {!isSpacer ? (
                              (() => {
                                const labelLower = row.label.toLowerCase()
                                const cannotHide = labelLower === "actifs" || 
                                                   labelLower === "passifs" || 
                                                   labelLower === "capitaux propres" || 
                                                   labelLower === "total passifs et capitaux propres" ||
                                                   labelLower === "total des actifs"
                                if (cannotHide) {
                                  return ""
                                }
                                // Show checkbox for sections, results, or passifs courants/non courants
                                const canShowCheckbox = (row.isSection || row.isResult) || 
                                                       labelLower === "passifs courants" || 
                                                       labelLower === "passifs non courants"
                                if (canShowCheckbox) {
                                  return (
                                    <div className="flex justify-center">
                                      <input
                                        type="checkbox"
                                        checked={row.isHidden || false}
                                        onChange={() => handleToggleHideBalance(index)}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                      />
                                    </div>
                                  )
                                }
                                return ""
                              })()
                            ) : (
                              ""
                            )}
                          </td>
                          <td className={`px-6 py-3 text-sm ${isSpacer ? "h-12" : "text-slate-600"}`}>
                            {isSpacer ? (
                              ""
                            ) : editingLinkCodeIndex === index ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingLinkCode}
                                  onChange={(e) => setEditingLinkCode(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEditLinkCode()
                                    } else if (e.key === "Escape") {
                                      handleCancelEditLinkCode()
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  placeholder="Code de liaison"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveEditLinkCode}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelEditLinkCode}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-2 cursor-pointer group"
                                onClick={() => handleStartEditLinkCode(index)}
                              >
                                <span>{row.linkCode || "-"}</span>
                                <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Mapping états financiers Card - Similar to Sommaire */
            <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Mapping états financiers</h2>
                    <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                      <span className="font-medium">{company.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Poste</th>
                    {view !== "detail" && (
                      <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm w-24">Masquer</th>
                    )}
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Code de liaison</th>
                  </tr>
                </thead>
                <tbody>
                  {financialStatementRows.map((row, index) => {
                    const isSpacer = row.label === ""
                    const displayLabel = row.label ? capitalizeFirst(row.label) : ""
                    
                    // Hide certain posts in detail view
                    if (view === "detail" && !isSpacer) {
                      const label = row.label.toLowerCase()
                      const shouldHide = 
                        label === "bénéfice brut" ||
                        label === "total des charges" ||
                        label === "charges d'exploitation" ||
                        label === "bénéfice avant impôts" ||
                        label === "bénéfice net" ||
                        label === "baiia"
                      if (shouldHide) {
                        return null
                      }
                    }
                    
                    // Add empty row before specific posts in detail view
                    // Only add if the last visible row before this one is not already a spacer
                    const labelLower = row.label.toLowerCase()
                    const isCogs = labelLower === "coût des produits vendus"
                    const isFraisAdmin = labelLower === "frais d'administration"
                    const isFraisDeVente = labelLower === "frais de vente"
                    const isAutresDepenses = labelLower === "autres dépenses (revenus)"
                    
                    // Find the last visible row before this one (considering hidden rows in detail view)
                    let lastVisibleRowIsSpacer = false
                    if (view === "detail" && index > 0) {
                      for (let i = index - 1; i >= 0; i--) {
                        const checkRow = financialStatementRows[i]
                        // Spacers are always visible
                        if (checkRow.label === "") {
                          lastVisibleRowIsSpacer = true
                          break
                        }
                        // Check if this row should be hidden in detail view
                        const checkLabel = checkRow.label.toLowerCase()
                        const shouldHide = 
                          checkLabel === "bénéfice brut" ||
                          checkLabel === "total des charges" ||
                          checkLabel === "charges d'exploitation" ||
                          checkLabel === "bénéfice avant impôts" ||
                          checkLabel === "bénéfice net" ||
                          checkLabel === "baiia"
                        
                        if (!shouldHide) {
                          // Found a visible non-spacer row
                          lastVisibleRowIsSpacer = false
                          break
                        }
                      }
                    } else {
                      // In summary view, just check immediate previous row
                      const previousRow = index > 0 ? financialStatementRows[index - 1] : null
                      lastVisibleRowIsSpacer = previousRow ? previousRow.label === "" : false
                    }
                    
                    const shouldAddSpacerBefore = view === "detail" && 
                                                 (isCogs || isFraisAdmin || isFraisDeVente || isAutresDepenses) && 
                                                 index > 0 && 
                                                 !lastVisibleRowIsSpacer
                    const nextRow = index < financialStatementRows.length - 1 ? financialStatementRows[index + 1] : null
                    const nextRowIsKeyResult = nextRow && (
                      (nextRow.isResult && nextRow.label?.toLowerCase() !== "bénéfice avant impôts") || 
                      nextRow.isNetIncome || 
                      nextRow.label?.toLowerCase() === "total des charges"
                    )
                    const isEditing = editingPostIndex === index
                    const isAddingAfter = addingPostAfterIndex === index
                    const canAddAfter = !isSpacer && row.label.toLowerCase() === "charges d'exploitation"
                    // Can move indented posts, but not "Coûts des produits vendus", "Impôts", "Frais d'administration", "Frais de vente" or "Autres dépenses (revenus)"
                    const labelLowerForMove = row.label.toLowerCase()
                    const cannotMove = labelLowerForMove === "coût des produits vendus" || 
                                      labelLowerForMove.includes("impôt") ||
                                      labelLowerForMove === "frais d'administration" ||
                                      labelLowerForMove === "frais de vente" ||
                                      labelLowerForMove === "autres dépenses (revenus)"
                    const canMove = !isSpacer && row.indent && !cannotMove
                    const canMoveUp = canMove && index > 0 && financialStatementRows[index - 1].label !== ""
                    const canMoveDown = canMove && index < financialStatementRows.length - 1 && financialStatementRows[index + 1].label !== ""
                    // Can delete indented posts, but not "Coûts des produits vendus" or "Impôts"
                    // In detail view, also cannot delete "Frais d'administration", "Frais de vente" or "Autres dépenses (revenus)"
                    const labelLowerForDelete = row.label.toLowerCase()
                    const isProtectedInDetail = view === "detail" && (
                      labelLowerForDelete === "frais d'administration" ||
                      labelLowerForDelete === "frais de vente" ||
                      labelLowerForDelete === "autres dépenses (revenus)"
                    )
                    const canDelete = !isSpacer && row.indent && 
                                     labelLowerForDelete !== "coût des produits vendus" && 
                                     !labelLowerForDelete.includes("impôt") &&
                                     !isProtectedInDetail

                    return (
                      <>
                        {shouldAddSpacerBefore && (
                          <tr key={`spacer-before-${index}`} className="h-12 border-b border-slate-200">
                            <td className="px-6 py-3 text-sm h-12"></td>
                            <td className="px-6 py-3 text-sm h-12"></td>
                            <td className="px-6 py-3 text-sm h-12"></td>
                          </tr>
                        )}
                        <tr 
                          key={index} 
                          className={`border-b ${
                            isSpacer 
                              ? "h-12 border-slate-200" 
                              : (nextRowIsKeyResult && view !== "detail")
                                ? "border-slate-900 border-b-2" 
                                : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <td 
                            className={`px-6 py-3 text-sm ${
                              view === "detail" ? "font-bold text-slate-900" : (row.isBold ? "font-bold text-slate-900" : "text-slate-700")
                            } ${view === "detail" ? "" : (row.indent ? "pl-12" : "")}`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingPostName}
                                  onChange={(e) => setEditingPostName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEditPost()
                                    } else if (e.key === "Escape") {
                                      handleCancelEditPost()
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveEditPost}
                                  disabled={!editingPostName.trim()}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelEditPost}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {view === "detail" && !isSpacer && canHaveDetails(row) && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleExpand(index)
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                  >
                                    {row.isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                )}
                                <div 
                                  className={`flex items-center gap-2 flex-1 ${
                                    view === "detail" && canHaveDetails(row) ? "" : "cursor-pointer group"
                                  }`}
                                  onClick={() => {
                                    if (view === "detail" && canHaveDetails(row)) {
                                      // Don't allow editing main posts in detail view
                                      return
                                    }
                                    handleStartEditPost(index)
                                  }}
                                >
                                  <span>{displayLabel}</span>
                                  {!isSpacer && !(view === "detail" && canHaveDetails(row)) && (
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {view === "detail" && !isSpacer && canHaveDetails(row) && !isEditing && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStartAddDetail(index)
                                      }}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {canAddAfter && !isEditing && view === "summary" && (
                                    <Button
                                      onClick={() => handleStartAddPost(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {canMoveUp && !isEditing && (
                                    <Button
                                      onClick={() => handleMovePostUp(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {canMoveDown && !isEditing && (
                                    <Button
                                      onClick={() => handleMovePostDown(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {canDelete && !isEditing && (
                                    <Button
                                      onClick={() => handleDeletePost(index)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          {view !== "detail" && (
                            <td 
                              className={`px-6 py-3 text-sm ${
                                isSpacer ? "h-12" : "text-slate-600"
                              }`}
                            >
                              {!isSpacer && (row.label.toLowerCase() === "coût des produits vendus" || 
                                            row.label.toLowerCase() === "bénéfice brut") ? (
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    checked={row.isHidden || false}
                                    onChange={() => handleToggleHide(index)}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                  />
                                </div>
                              ) : (
                                ""
                              )}
                            </td>
                          )}
                          <td 
                            className={`px-6 py-3 text-sm ${
                              isSpacer ? "h-12" : "text-slate-600"
                            }`}
                          >
                            {!isSpacer ? "-" : ""}
                          </td>
                        </tr>
                        {/* Detail rows in detail view */}
                        {view === "detail" && !isSpacer && canHaveDetails(row) && row.isExpanded && row.detailRows && row.detailRows.map((detailRow, detailIndex) => {
                          const isEditingDetail = editingDetailIndex?.parentIndex === index && editingDetailIndex?.detailIndex === detailIndex
                          return (
                            <tr key={`detail-${index}-${detailIndex}`} className="border-b border-slate-200 hover:bg-slate-50 bg-slate-50/50">
                              <td className="px-6 py-3 text-sm pl-16">
                                {isEditingDetail ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingDetailName}
                                      onChange={(e) => setEditingDetailName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveEditDetail()
                                        } else if (e.key === "Escape") {
                                          handleCancelEditDetail()
                                        }
                                      }}
                                      className="flex-1 h-8"
                                      autoFocus
                                    />
                                    <Button
                                      onClick={handleSaveEditDetail}
                                      disabled={!editingDetailName.trim()}
                                      size="sm"
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={handleCancelEditDetail}
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="flex items-center gap-2 cursor-pointer group flex-1"
                                      onClick={() => handleStartEditDetail(index, detailIndex)}
                                    >
                                      <span>{capitalizeFirst(detailRow.label)}</span>
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <Button
                                      onClick={() => handleDeleteDetail(index, detailIndex)}
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                              {view !== "detail" && (
                                <td className="px-6 py-3 text-sm text-slate-600"></td>
                              )}
                              <td className="px-6 py-3 text-sm text-slate-600">-</td>
                            </tr>
                          )
                        })}
                        {/* Add detail row form */}
                        {view === "detail" && !isSpacer && canHaveDetails(row) && addingDetailToIndex === index && (
                          <tr className="border-b border-slate-200 hover:bg-slate-50 bg-slate-50/50">
                            <td className="px-6 py-3 text-sm pl-16">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={newDetailName}
                                  onChange={(e) => setNewDetailName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveAddDetail()
                                    } else if (e.key === "Escape") {
                                      handleCancelAddDetail()
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  placeholder="Nouveau poste détaillé"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveAddDetail}
                                  disabled={!newDetailName.trim()}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelAddDetail}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                            {view !== "detail" && (
                              <td className="px-6 py-3 text-sm text-slate-600"></td>
                            )}
                            <td className="px-6 py-3 text-sm text-slate-600">-</td>
                          </tr>
                        )}
                        {isAddingAfter && view === "summary" && (
                          <tr className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-3 text-sm pl-12">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={newPostName}
                                  onChange={(e) => setNewPostName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveAddPost()
                                    } else if (e.key === "Escape") {
                                      handleCancelAddPost()
                                    }
                                  }}
                                  className="flex-1 h-8"
                                  placeholder="Nouveau poste"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleSaveAddPost}
                                  disabled={!newPostName.trim()}
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={handleCancelAddPost}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-600"></td>
                            <td className="px-6 py-3 text-sm text-slate-600">-</td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

