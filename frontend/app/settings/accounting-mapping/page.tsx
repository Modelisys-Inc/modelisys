"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileSpreadsheet, Edit2, Trash2, X, Check, Upload, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { listAccountMappings, upsertAccountMappings, deleteAccountMapping, type AccountMappingData } from "@/lib/api"
import * as XLSX from "xlsx"

interface AccountMapping {
  id: string
  accountNumber: string
  accountName: string
  linkCodes: string
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
}

function apiToLocal(m: AccountMappingData, companyId: string): AccountMapping {
  return {
    id: m.id,
    accountNumber: m.account_number,
    accountName: m.description,
    linkCodes: m.link_code || "",
    companyId,
    divisionId: m.divisions || null,
    subDivisionId: m.sub_divisions || null,
  }
}

export default function AccountingMappingPage() {
  const { companies: companiesData } = useCompanies()
  const [mappings, setMappings] = useState<AccountMapping[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newAccountNumber, setNewAccountNumber] = useState("")
  const [newAccountName, setNewAccountName] = useState("")
  const [newLinkCodes, setNewLinkCodes] = useState("")
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)
  const [newDivisionId, setNewDivisionId] = useState<string | null>(null)
  const [newSubDivisionId, setNewSubDivisionId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAccountNumber, setEditingAccountNumber] = useState("")
  const [editingAccountName, setEditingAccountName] = useState("")
  const [editingLinkCodes, setEditingLinkCodes] = useState("")
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editingDivisionId, setEditingDivisionId] = useState<string | null>(null)
  const [editingSubDivisionId, setEditingSubDivisionId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // État pour la barre de contrôle d'importation (uniquement l'entité)
  const [importCompanyId, setImportCompanyId] = useState<string | null>(null)
  const [showImportSection, setShowImportSection] = useState(false)

  // Auto-select first company
  useEffect(() => {
    if (!importCompanyId && companiesData.length > 0) {
      setImportCompanyId(companiesData[0].id)
    }
  }, [companiesData, importCompanyId])

  // Fetch real mappings when company changes
  useEffect(() => {
    if (!importCompanyId) {
      setMappings([])
      return
    }
    let cancelled = false
    setApiLoading(true)
    listAccountMappings(importCompanyId)
      .then((data) => {
        if (!cancelled) {
          setMappings(data.map((m) => apiToLocal(m, importCompanyId)))
        }
      })
      .catch(() => {
        if (!cancelled) setMappings([])
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false)
      })
    return () => { cancelled = true }
  }, [importCompanyId])

  const handleAddMapping = async () => {
    if (!newAccountNumber.trim() || !newAccountName.trim() || !newLinkCodes.trim() || !importCompanyId) return
    setApiLoading(true)
    try {
      const saved = await upsertAccountMappings(importCompanyId, [{
        account_number: newAccountNumber.trim(),
        description: newAccountName.trim(),
        link_code: newLinkCodes.trim(),
        divisions: newDivisionId,
        sub_divisions: newSubDivisionId,
      }])
      setMappings(saved.map((m) => apiToLocal(m, importCompanyId)))
      setNewAccountNumber("")
      setNewAccountName("")
      setNewLinkCodes("")
      setNewCompanyId(null)
      setNewDivisionId(null)
      setNewSubDivisionId(null)
      setIsAdding(false)
    } catch {
      // keep form open on error
    } finally {
      setApiLoading(false)
    }
  }

  const handleStartEdit = (mapping: AccountMapping) => {
    setEditingId(mapping.id)
    setEditingAccountNumber(mapping.accountNumber)
    setEditingAccountName(mapping.accountName)
    setEditingLinkCodes(mapping.linkCodes)
    setEditingCompanyId(mapping.companyId || null)
    setEditingDivisionId(mapping.divisionId || null)
    setEditingSubDivisionId(mapping.subDivisionId || null)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editingAccountNumber.trim() || !editingAccountName.trim() || !editingLinkCodes.trim() || !importCompanyId) return
    setApiLoading(true)
    try {
      const saved = await upsertAccountMappings(importCompanyId, [{
        account_number: editingAccountNumber.trim(),
        description: editingAccountName.trim(),
        link_code: editingLinkCodes.trim(),
        divisions: editingDivisionId,
        sub_divisions: editingSubDivisionId,
      }])
      setMappings(saved.map((m) => apiToLocal(m, importCompanyId)))
      setEditingId(null)
      setEditingAccountNumber("")
      setEditingAccountName("")
      setEditingLinkCodes("")
      setEditingCompanyId(null)
      setEditingDivisionId(null)
      setEditingSubDivisionId(null)
    } catch {
      // keep edit form open on error
    } finally {
      setApiLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingAccountNumber("")
    setEditingAccountName("")
    setEditingLinkCodes("")
    setEditingCompanyId(null)
    setEditingDivisionId(null)
    setEditingSubDivisionId(null)
  }

  const handleDeleteMapping = async (id: string) => {
    if (!importCompanyId) return
    setApiLoading(true)
    try {
      await deleteAccountMapping(importCompanyId, id)
      setMappings(mappings.filter((m) => m.id !== id))
    } catch {
      // no-op
    } finally {
      setApiLoading(false)
    }
  }

  const getCompanyName = (companyId: string | null | undefined): string => {
    if (!companyId) return "-"
    const company = companiesData.find(c => c.id === companyId)
    return company?.name || "-"
  }

  const getDivisionName = (companyId: string | null | undefined, divisionId: string | null | undefined): string => {
    if (!divisionId || !companyId) return "-"
    const company = companiesData.find(c => c.id === companyId)
    const division = company?.divisions.find(d => d.id === divisionId)
    return division?.name || "-"
  }

  const getSubDivisionName = (companyId: string | null | undefined, divisionId: string | null | undefined, subDivisionId: string | null | undefined): string => {
    if (!subDivisionId || !divisionId || !companyId) return "-"
    const company = companiesData.find(c => c.id === companyId)
    const division = company?.divisions.find(d => d.id === divisionId)
    const subDivision = division?.subDivisions.find(sd => sd.id === subDivisionId)
    return subDivision?.name || "-"
  }

  const parseExcelFile = useCallback((file: File, companyId: string) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][]

        // Ignorer la première ligne (en-têtes)
        const rows = jsonData.slice(1).filter((row) => row[0] || row[1] || row[2])

        const importedMappings: AccountMapping[] = rows.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          accountNumber: String(row[0] || "").trim(),
          accountName: String(row[1] || "").trim(),
          linkCodes: String(row[2] || "").trim(),
          companyId,
          divisionId: null,
          subDivisionId: null,
        })).filter((m) => m.accountNumber && m.accountName)

        if (importedMappings.length === 0) {
          setImportMessage({ type: "error", text: "Aucun compte trouvé. Vérifiez que le fichier contient les colonnes A=Numéro, B=Description, C=Code de liaison." })
          setImportLoading(false)
          return
        }

        // Persist imported mappings to API
        const entries = importedMappings.map((m) => ({
          account_number: m.accountNumber,
          description: m.accountName,
          link_code: m.linkCodes || null,
        }))
        upsertAccountMappings(companyId, entries)
          .then((saved) => {
            setMappings((prev) => {
              const savedIds = new Set(saved.map((s) => s.id))
              const existing = prev.filter((m) => !savedIds.has(m.id))
              return [...existing, ...saved.map((s) => apiToLocal(s, companyId))]
            })
            setImportMessage({ type: "success", text: `${saved.length} comptes importés avec succès.` })
            setImportLoading(false)
          })
          .catch(() => {
            setImportMessage({ type: "error", text: "Erreur lors de la sauvegarde. Veuillez réessayer." })
            setImportLoading(false)
          })
      } catch (error) {
        console.error("Erreur lors de l'importation du fichier Excel:", error)
        setImportMessage({ type: "error", text: "Erreur lors de la lecture du fichier Excel. Vérifiez le format." })
        setImportLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleFileSelect = useCallback((file: File, companyId: string | null) => {
    if (!companyId) {
      setImportMessage({ type: "error", text: "Veuillez sélectionner une entité avant d'importer." })
      return
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setImportMessage({ type: "error", text: "Veuillez sélectionner un fichier Excel (.xlsx ou .xls)" })
      return
    }
    setImportMessage(null)
    setImportLoading(true)
    parseExcelFile(file, companyId)
  }, [parseExcelFile])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, companyId: string | null) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0], companyId)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, companyId: string | null) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0], companyId)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [handleFileSelect])


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <DashboardHeader title="Mapping de la comptabilité" description="Configurez et gérez les correspondances entre vos comptes comptables" />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Controls Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-4 h-4" />
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Entité à importer:</span>
              <Select onValueChange={(value) => setImportCompanyId(value === "all" ? null : value)} value={importCompanyId || "all"}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Sélectionner une entité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sociétés</SelectItem>
                  {companiesData.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-1 h-12 bg-blue-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">Balance de vérification</h2>
                    {importCompanyId && (
                      <span className="text-sm text-blue-400 font-normal">
                        ({getCompanyName(importCompanyId)})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">Gérez les correspondances entre vos comptes comptables et leurs catégories</p>
                </div>
              </div>
              {!isAdding && (
                <Button
                  onClick={() => setIsAdding(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un compte
                </Button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* File Upload Zone - Collapsible */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <Button
                  onClick={() => setShowImportSection(!showImportSection)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                >
                  {showImportSection ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Masquer l'importation
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Afficher l'importation
                    </>
                  )}
                </Button>
                </div>
              
              {showImportSection && (
                <div className="space-y-3">
                  {importMessage && (
                    <div className={`px-4 py-3 rounded-lg text-sm ${
                      importMessage.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}>
                      {importMessage.text}
                    </div>
                  )}
                  <div
                    onDrop={(e) => handleDrop(e, importCompanyId)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 hover:border-slate-400 bg-slate-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileInputChange(e, importCompanyId)}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      {importLoading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
                      ) : (
                        <Upload className={`w-8 h-8 mb-3 ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
                      )}
                      <p className="text-sm font-medium text-slate-900 mb-1">
                        {importLoading ? "Importation en cours..." : "Glissez-déposez un fichier Excel ici ou cliquez pour sélectionner"}
                      </p>
                      {!importLoading && (
                        <p className="text-xs text-slate-500">
                          Format attendu : Colonne A = Numéro de compte, Colonne B = Description, Colonne C = Codes de liaison
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add New Mapping Form */}
            {isAdding && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                    <Input
                      placeholder="Numéro de compte"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Input
                      placeholder="Nom du compte"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Codes de liaison"
                      value={newLinkCodes}
                      onChange={(e) => setNewLinkCodes(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3 ml-8">
                    <EntitySelector
                      companies={companiesData}
                      selectedCompanyId={newCompanyId}
                      selectedDivisionId={newDivisionId}
                      selectedSubDivisionId={newSubDivisionId}
                      onCompanyChange={setNewCompanyId}
                      onDivisionChange={setNewDivisionId}
                      onSubDivisionChange={setNewSubDivisionId}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 ml-8">
                    <Button
                      onClick={handleAddMapping}
                      disabled={!newAccountNumber.trim() || !newAccountName.trim() || !newLinkCodes.trim()}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAdding(false)
                        setNewAccountNumber("")
                        setNewAccountName("")
                        setNewLinkCodes("")
                        setNewCompanyId(null)
                        setNewDivisionId(null)
                        setNewSubDivisionId(null)
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Mappings List */}
            <div className="space-y-3">
              {apiLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : mappings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-sm">Aucun compte configuré</p>
                  <p className="text-xs mt-1">Cliquez sur "Ajouter un compte" pour commencer</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Numéro de compte</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Description de compte</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Codes de liaison</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Entités</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Divisions</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Sous-division</th>
                        <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((mapping) => (
                        <tr
                          key={mapping.id}
                          className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          {editingId === mapping.id ? (
                            <>
                              <td className="px-6 py-4">
                                <Input
                                  value={editingAccountNumber}
                                  onChange={(e) => setEditingAccountNumber(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(mapping.id)
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit()
                                    }
                                  }}
                                  className="w-full"
                                  autoFocus
                                />
                              </td>
                              <td className="px-6 py-4">
                                <Input
                                  value={editingAccountName}
                                  onChange={(e) => setEditingAccountName(e.target.value)}
                                  className="w-full"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <Input
                                  value={editingLinkCodes}
                                  onChange={(e) => setEditingLinkCodes(e.target.value)}
                                  className="w-full"
                                />
                              </td>
                              <td className="px-6 py-4" colSpan={3}>
                                <EntitySelector
                                  companies={companiesData}
                                  selectedCompanyId={editingCompanyId}
                                  selectedDivisionId={editingDivisionId}
                                  selectedSubDivisionId={editingSubDivisionId}
                                  onCompanyChange={setEditingCompanyId}
                                  onDivisionChange={setEditingDivisionId}
                                  onSubDivisionChange={setEditingSubDivisionId}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    onClick={() => handleSaveEdit(mapping.id)}
                                    disabled={
                                      !editingAccountNumber.trim() ||
                                      !editingAccountName.trim() ||
                                      !editingLinkCodes.trim()
                                    }
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={handleCancelEdit}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-slate-900 font-medium">{mapping.accountNumber}</td>
                              <td className="px-6 py-4 text-slate-700">{mapping.accountName}</td>
                              <td className="px-6 py-4 text-slate-700">{mapping.linkCodes}</td>
                              <td className="px-6 py-4 text-slate-700">
                                {getCompanyName(mapping.companyId)}
                              </td>
                              <td className="px-6 py-4 text-slate-700">
                                {getDivisionName(mapping.companyId, mapping.divisionId)}
                              </td>
                              <td className="px-6 py-4 text-slate-700">
                                {getSubDivisionName(mapping.companyId, mapping.divisionId, mapping.subDivisionId)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    onClick={() => handleStartEdit(mapping)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-slate-600 hover:text-slate-900"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteMapping(mapping.id)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

