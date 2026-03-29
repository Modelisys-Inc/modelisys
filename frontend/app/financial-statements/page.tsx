"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, BarChart3, Edit2, Trash2, X, Check, Filter, Loader2 } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import React from "react"
import {
  listCompanies,
  getStatementStructure,
  upsertStatementStructure,
  type StatementType,
} from "@/lib/api"

interface Poste {
  id: string
  name: string
  linkCode: string
  fdRhc?: boolean // Fonds de roulement hors caisse (uniquement pour Bilan)
  cv?: boolean // Coût variable (uniquement pour Résultats)
}

interface Category {
  id: string
  name: string
  postes: Poste[]
}

interface Mapping {
  id: string
  name: string
  categories: Category[]
  postes?: Poste[] // Pour Capitaux propres qui n'a pas de catégories
}

type MappingType = "bilan" | "resultats" | "capex" | "baiia"

const MAPPING_TYPE_TO_STATEMENT_TYPE: Record<MappingType, StatementType> = {
  bilan: "balance-sheet",
  resultats: "income-statement",
  capex: "capex",
  baiia: "baiia",
}

const getDefaultMappingsBilan = (): Mapping[] => [
  {
    id: "1",
    name: "Actif",
    categories: [
      { id: "cat-1", name: "Court terme", postes: [] },
      { id: "cat-2", name: "Long terme", postes: [] },
    ],
  },
  {
    id: "2",
    name: "Passif",
    categories: [
      { id: "cat-3", name: "Court terme", postes: [] },
      { id: "cat-4", name: "Long terme", postes: [] },
    ],
  },
  { id: "3", name: "Capitaux propres", categories: [], postes: [] },
]

const getDefaultMappingsResultats = (): Mapping[] => [
  {
    id: "1",
    name: "Revenus",
    categories: [],
    postes: [],
  },
  {
    id: "2",
    name: "Coûts des produits vendus",
    categories: [],
    postes: undefined,
  },
  {
    id: "3",
    name: "Charges",
    categories: [],
  },
]

const getDefaultMappingsCapex = (): Mapping[] => [
  {
    id: "1",
    name: "Capex",
    categories: [],
    postes: undefined,
  },
]

const getDefaultMappingsBaiia = (): Mapping[] => [
  {
    id: "1",
    name: "Amortissement",
    categories: [],
    postes: [],
  },
  {
    id: "2",
    name: "Intérêts",
    categories: [],
    postes: [],
  },
  {
    id: "3",
    name: "Impôts",
    categories: [],
    postes: [],
  },
]

const getDefaultMappings = (type: MappingType): Mapping[] => {
  if (type === "bilan") return getDefaultMappingsBilan()
  if (type === "resultats") return getDefaultMappingsResultats()
  if (type === "capex") return getDefaultMappingsCapex()
  if (type === "baiia") return getDefaultMappingsBaiia()
  return []
}

/** Normalize raw API data into properly-typed Mapping[], merging with defaults. */
function normalizeMappings(parsed: Mapping[], type: MappingType): Mapping[] {
  const defaultMappings = getDefaultMappings(type)
  const requiredNames = type === "bilan"
    ? ["Actif", "Passif", "Capitaux propres"]
    : type === "resultats"
    ? ["Revenus", "Coûts des produits vendus", "Charges"]
    : type === "capex"
    ? ["Capex"]
    : ["Amortissement", "Intérêts", "Impôts"]

  const existingNames = parsed.map((m: Mapping) => m.name)
  const missingMappings = defaultMappings.filter(m => !existingNames.includes(m.name))
  const merged = [...parsed, ...missingMappings]
  const filteredMerged = merged.filter((m: Mapping) => requiredNames.includes(m.name))

  return filteredMerged.map((m: Mapping) => {
    if (type === "bilan" && m.name === "Capitaux propres") {
      return { ...m, categories: [], postes: m.postes || [] }
    }
    if (type === "resultats" && m.name === "Revenus") {
      return { ...m, categories: [], postes: m.postes || [] }
    }
    if (type === "baiia" && (m.name === "Amortissement" || m.name === "Intérêts" || m.name === "Impôts")) {
      return { ...m, categories: [], postes: m.postes || [] }
    }
    if (type === "resultats" && m.name === "Coûts des produits vendus") {
      return {
        ...m,
        categories: (m.categories || []).map(cat => ({ ...cat, postes: cat.postes || [] })),
        postes: undefined,
      }
    }
    if (type === "capex" && m.name === "Capex") {
      return {
        ...m,
        categories: (m.categories || []).map(cat => ({ ...cat, postes: cat.postes || [] })),
        postes: undefined,
      }
    }
    if (type === "bilan" && (m.name === "Actif" || m.name === "Passif")) {
      const defaultMapping = defaultMappings.find(dm => dm.name === m.name)
      if (defaultMapping) {
        const existingCategories = m.categories || []
        const requiredCategoryNames = ["Court terme", "Long terme"]
        const existingCategoryNames = existingCategories.map(c => c.name)
        const missingCategoryNames = requiredCategoryNames.filter(name => !existingCategoryNames.includes(name))
        const missingCategories = defaultMapping.categories
          .filter(c => missingCategoryNames.includes(c.name))
          .map(c => ({
            ...c,
            postes: existingCategories.find(ec => ec.name === c.name)?.postes || c.postes || []
          }))
        const mergedCategories = [...existingCategories]
        missingCategories.forEach(missingCat => {
          if (!mergedCategories.find(ec => ec.name === missingCat.name)) {
            mergedCategories.push(missingCat)
          }
        })
        return { ...m, categories: mergedCategories, postes: undefined }
      }
    }
    return {
      ...m,
      categories: (m.categories || []).map(cat => ({ ...cat, postes: cat.postes || [] })),
      postes: m.postes || undefined,
    }
  })
}

export default function FinancialStatementsPage() {
  const [mappingType, setMappingType] = useState<MappingType>("bilan")
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [addingCategoryTo, setAddingCategoryTo] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [addingPosteTo, setAddingPosteTo] = useState<{ mappingId: string; categoryId: string | null } | null>(null)
  const [newPosteName, setNewPosteName] = useState("")
  const [newPosteLinkCode, setNewPosteLinkCode] = useState("")
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null)
  const [editingPosteName, setEditingPosteName] = useState("")
  const [editingPosteLinkCode, setEditingPosteLinkCode] = useState("")
  const [selectedResultatsPoste, setSelectedResultatsPoste] = useState<string>("")

  // Cache for resultats mappings (used by BAIIA poste picker)
  const [resultatsMappingsCache, setResultatsMappingsCache] = useState<Mapping[]>([])

  // Load first company to use as context
  useEffect(() => {
    listCompanies()
      .then((companies) => {
        if (companies.length > 0) {
          setCompanyId(companies[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  // Load mappings from API when type or company changes
  const loadMappingsFromApi = useCallback(async (type: MappingType) => {
    if (!companyId) return

    setLoading(true)
    try {
      const statementType = MAPPING_TYPE_TO_STATEMENT_TYPE[type]
      const data = await getStatementStructure(companyId, statementType)
      const normalized = normalizeMappings(data.structure as unknown as Mapping[], type)
      setMappings(normalized)
    } catch {
      // 404 means no structure saved yet - use defaults
      setMappings(getDefaultMappings(type))
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (companyId) {
      loadMappingsFromApi(mappingType)
    }
  }, [companyId, mappingType, loadMappingsFromApi])

  // Load resultats mappings cache for BAIIA poste picker
  useEffect(() => {
    if (!companyId) return
    const statementType = MAPPING_TYPE_TO_STATEMENT_TYPE["resultats"]
    getStatementStructure(companyId, statementType)
      .then((data) => {
        setResultatsMappingsCache(normalizeMappings(data.structure as unknown as Mapping[], "resultats"))
      })
      .catch(() => {
        setResultatsMappingsCache(getDefaultMappings("resultats"))
      })
  }, [companyId])

  // Save mappings to API
  const saveMappingsToApi = useCallback(async (mappingsToSave: Mapping[], type: MappingType) => {
    if (!companyId) return
    try {
      const statementType = MAPPING_TYPE_TO_STATEMENT_TYPE[type]
      await upsertStatementStructure(
        companyId,
        statementType,
        mappingsToSave as unknown as Record<string, unknown>[]
      )
    } catch (e) {
      console.error("Error saving mappings:", e)
    }
  }, [companyId])

  // Fonction pour récupérer tous les postes du type Résultats (from cache)
  const getAllResultatsPostes = (): Poste[] => {
    const allPostes: Poste[] = []
    resultatsMappingsCache.forEach((mapping) => {
      if (mapping.postes) {
        allPostes.push(...mapping.postes)
      }
      mapping.categories.forEach((category) => {
        allPostes.push(...category.postes)
      })
    })
    return allPostes
  }



  const handleAddCategory = (mappingId: string) => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: newCategoryName.trim(),
        postes: [],
      }
      const updatedMappings = mappings.map((m) =>
        m.id === mappingId ? { ...m, categories: [...m.categories, newCategory] } : m
      )
      setMappings(updatedMappings)
      setNewCategoryName("")
      setAddingCategoryTo(null)
      
      // Sauvegarder immédiatement de manière synchrone
      saveMappingsToApi(updatedMappings, mappingType)
    }
  }

  const handleStartEditCategory = (mappingId: string, category: Category) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const handleSaveEditCategory = (mappingId: string, categoryId: string) => {
    if (editingCategoryName.trim()) {
      const updatedMappings = mappings.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              categories: m.categories.map((c) =>
                c.id === categoryId ? { ...c, name: editingCategoryName.trim() } : c
              ),
            }
          : m
      )
      setMappings(updatedMappings)
      setEditingCategoryId(null)
      setEditingCategoryName("")
      
      // Sauvegarder immédiatement de manière synchrone
      saveMappingsToApi(updatedMappings, mappingType)
    }
  }

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName("")
  }

  const handleDeleteCategory = (mappingId: string, categoryId: string) => {
    const updatedMappings = mappings.map((m) =>
      m.id === mappingId ? { ...m, categories: m.categories.filter((c) => c.id !== categoryId) } : m
    )
    setMappings(updatedMappings)
    
    // Sauvegarder immédiatement
    saveMappingsToApi(updatedMappings, mappingType)
  }

  const handleAddPoste = (mappingId: string, categoryId: string | null) => {
    // Pour BAIIA, utiliser le poste sélectionné depuis Résultats
    if (mappingType === "baiia" && selectedResultatsPoste) {
      const resultatsPostes = getAllResultatsPostes()
      const selectedPoste = resultatsPostes.find(p => p.id === selectedResultatsPoste)
      
      if (selectedPoste) {
        const newPoste: Poste = {
          id: `poste-${Date.now()}`,
          name: selectedPoste.name,
          linkCode: selectedPoste.linkCode,
        }
        const updatedMappings = mappings.map((m) => {
          if (m.id !== mappingId) return m
          return {
            ...m,
            postes: [...(m.postes || []), newPoste],
          }
        })
        setMappings(updatedMappings)
        setSelectedResultatsPoste("")
        setAddingPosteTo(null)
        saveMappingsToApi(updatedMappings, mappingType)
        return
      }
    }
    
    // Pour les autres types, utiliser les champs texte
    if (newPosteName.trim() && newPosteLinkCode.trim()) {
      const newPoste: Poste = {
        id: `poste-${Date.now()}`,
        name: newPosteName.trim(),
        linkCode: newPosteLinkCode.trim(),
      }
      const updatedMappings = mappings.map((m) => {
        if (m.id !== mappingId) return m
        
        // Si categoryId est null, c'est pour Capitaux propres ou Revenus (postes directs)
        if (categoryId === null) {
          return {
            ...m,
            postes: [...(m.postes || []), newPoste],
          }
        }
        
        // Sinon, ajouter à la catégorie
        return {
          ...m,
          categories: m.categories.map((c) =>
            c.id === categoryId ? { ...c, postes: [...c.postes, newPoste] } : c
          ),
        }
      })
      setMappings(updatedMappings)
      setNewPosteName("")
      setNewPosteLinkCode("")
      setAddingPosteTo(null)
      
      // Sauvegarder immédiatement de manière synchrone
      saveMappingsToApi(updatedMappings, mappingType)
    }
  }

  const handleStartEditPoste = (mappingId: string, categoryId: string | null, poste: Poste) => {
    setEditingPosteId(poste.id)
    setEditingPosteName(poste.name)
    setEditingPosteLinkCode(poste.linkCode)
  }

  const handleSaveEditPoste = (mappingId: string, categoryId: string | null, posteId: string) => {
    if (editingPosteName.trim() && editingPosteLinkCode.trim()) {
      const updatedMappings = mappings.map((m) => {
        if (m.id !== mappingId) return m
        
        // Si categoryId est null, c'est pour Capitaux propres ou Revenus (postes directs)
        if (categoryId === null) {
          return {
            ...m,
            postes: (m.postes || []).map((p) =>
              p.id === posteId
                ? { ...p, name: editingPosteName.trim(), linkCode: editingPosteLinkCode.trim() }
                : p
            ),
          }
        }
        
        // Sinon, modifier dans la catégorie
        return {
          ...m,
          categories: m.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  postes: c.postes.map((p) =>
                    p.id === posteId
                      ? { ...p, name: editingPosteName.trim(), linkCode: editingPosteLinkCode.trim() }
                      : p
                  ),
                }
              : c
          ),
        }
      })
      setMappings(updatedMappings)
      setEditingPosteId(null)
      setEditingPosteName("")
      setEditingPosteLinkCode("")
      
      // Sauvegarder immédiatement de manière synchrone
      saveMappingsToApi(updatedMappings, mappingType)
    }
  }

  const handleCancelEditPoste = () => {
    setEditingPosteId(null)
    setEditingPosteName("")
    setEditingPosteLinkCode("")
  }

  const handleToggleCv = (mappingId: string, categoryId: string | null, posteId: string) => {
    const updatedMappings = mappings.map((m) => {
      if (m.id !== mappingId) return m
      
      // Si categoryId est null, c'est pour Revenus, Coûts des produits vendus (postes directs)
      if (categoryId === null) {
        return {
          ...m,
          postes: (m.postes || []).map((p) =>
            p.id === posteId
              ? { ...p, cv: !p.cv }
              : p
          ),
        }
      }
      
      // Sinon, modifier dans la catégorie
      return {
        ...m,
        categories: m.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                postes: c.postes.map((p) =>
                  p.id === posteId
                    ? { ...p, cv: !p.cv }
                    : p
                ),
              }
            : c
        ),
      }
    })
    setMappings(updatedMappings)
    
    // Sauvegarder immédiatement
    saveMappingsToApi(updatedMappings, mappingType)
  }

  const handleToggleFdRhc = (mappingId: string, categoryId: string | null, posteId: string) => {
    const updatedMappings = mappings.map((m) => {
      if (m.id !== mappingId) return m
      
      // Si categoryId est null, c'est pour Capitaux propres (postes directs)
      if (categoryId === null) {
        return {
          ...m,
          postes: (m.postes || []).map((p) =>
            p.id === posteId
              ? { ...p, fdRhc: !p.fdRhc }
              : p
          ),
        }
      }
      
      // Sinon, modifier dans la catégorie
      return {
        ...m,
        categories: m.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                postes: c.postes.map((p) =>
                  p.id === posteId
                    ? { ...p, fdRhc: !p.fdRhc }
                    : p
                ),
              }
            : c
        ),
      }
    })
    setMappings(updatedMappings)
    
    // Sauvegarder immédiatement
    saveMappingsToApi(updatedMappings, mappingType)
  }

  const handleDeletePoste = (mappingId: string, categoryId: string | null, posteId: string) => {
    const updatedMappings = mappings.map((m) => {
      if (m.id !== mappingId) return m
      
      // Si categoryId est null, c'est pour Capitaux propres, Revenus ou Coûts des produits vendus (postes directs)
      if (categoryId === null) {
        return {
          ...m,
          postes: (m.postes || []).filter((p) => p.id !== posteId),
        }
      }
      
      // Sinon, supprimer de la catégorie
      return {
        ...m,
        categories: m.categories.map((c) =>
          c.id === categoryId ? { ...c, postes: c.postes.filter((p) => p.id !== posteId) } : c
        ),
      }
    })
    setMappings(updatedMappings)
    
    // Sauvegarder immédiatement
    saveMappingsToApi(updatedMappings, mappingType)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Mapping de l'états financiers" description="Définissez les mappings pour vos états financiers et rapports" />
      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        {/* Controls Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Icon */}
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-4 h-4" />
            </div>

            {/* Mapping Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Type:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <Button
                  variant="ghost"
                  onClick={() => setMappingType("bilan")}
                  className={`h-8 text-xs px-3 transition-all ${
                    mappingType === "bilan"
                      ? "bg-slate-900 text-white font-medium shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bilan
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMappingType("resultats")}
                  className={`h-8 text-xs px-3 transition-all ${
                    mappingType === "resultats"
                      ? "bg-slate-900 text-white font-medium shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Résultats
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMappingType("capex")}
                  className={`h-8 text-xs px-3 transition-all ${
                    mappingType === "capex"
                      ? "bg-slate-900 text-white font-medium shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Capex
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMappingType("baiia")}
                  className={`h-8 text-xs px-3 transition-all ${
                    mappingType === "baiia"
                      ? "bg-slate-900 text-white font-medium shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  BAIIA
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-1 h-12 bg-slate-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                    {mappingType === "bilan" && "Mappings - Bilan"}
                    {mappingType === "resultats" && "Mappings - Résultats"}
                    {mappingType === "capex" && "Mappings - Capex"}
                    {mappingType === "baiia" && "Mappings - BAIIA"}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {mappingType === "bilan" && "Définissez les correspondances entre vos comptes et votre bilan"}
                    {mappingType === "resultats" && "Définissez les correspondances entre vos comptes et votre état des résultats"}
                    {mappingType === "capex" && "Définissez les correspondances entre vos comptes et vos dépenses en capital"}
                    {mappingType === "baiia" && "Définissez les correspondances entre vos comptes et votre BAIIA"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Mappings Table */}
            <div className="overflow-x-auto bg-white">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-500">Chargement...</span>
                </div>
              ) : mappings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-sm">Aucun mapping configuré</p>
                  <p className="text-xs mt-1">Cliquez sur "Ajouter un mapping" pour commencer</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-white border-b border-slate-200">
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Poste</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Code de liaison</th>
                      {mappingType === "bilan" && (
                        <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">FdRHC</th>
                      )}
                      {mappingType === "resultats" && (
                        <th className="px-6 py-4 text-center font-semibold text-slate-900 text-sm">CV</th>
                      )}
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((mapping) => {
                  const isExpanded = true // Toujours visible
                  const isAddingCategory = addingCategoryTo === mapping.id

                      return (
                        <React.Fragment key={mapping.id}>
                          {/* Mapping Row */}
                          <tr className="border-b-2 border-slate-300">
                            <td colSpan={mappingType === "bilan" || mappingType === "resultats" ? 4 : 3} className="px-6 py-3 bg-slate-900 h-14">
                              <div className="flex items-center gap-3 h-full">
                        <span className="flex-1 text-white font-bold text-sm uppercase tracking-wide">{mapping.name}</span>
                        {(mapping.name === "Capitaux propres" || (mappingType === "resultats" && mapping.name === "Revenus") || (mappingType === "baiia" && (mapping.name === "Amortissement" || mapping.name === "Intérêts" || mapping.name === "Impôts"))) && (
                          <Button
                            onClick={() => {
                              setAddingPosteTo({ mappingId: mapping.id, categoryId: null })
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-slate-200"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Poste
                          </Button>
                        )}
                        {((mappingType === "resultats" && (mapping.name === "Charges" || mapping.name === "Coûts des produits vendus")) || (mappingType === "capex" && mapping.name === "Capex")) && (
                          <Button
                            onClick={() => {
                              setAddingCategoryTo(mapping.id)
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-slate-200"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Catégorie
                          </Button>
                        )}
                              </div>
                            </td>
                          </tr>


                          {/* Postes directs pour Capitaux propres, Revenus, Amortissement, Intérêts et Impôts */}
                          {isExpanded && (mapping.name === "Capitaux propres" || (mappingType === "resultats" && mapping.name === "Revenus") || (mappingType === "baiia" && (mapping.name === "Amortissement" || mapping.name === "Intérêts" || mapping.name === "Impôts"))) && (
                            <>
                              {/* Add Poste Form for Capitaux propres, Revenus, et BAIIA */}
                              {addingPosteTo?.mappingId === mapping.id && addingPosteTo?.categoryId === null && (
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <td colSpan={mappingType === "bilan" || mappingType === "resultats" ? 4 : 3} className="px-6 py-3">
                                    <div className="space-y-2 pl-12">
                                      {mappingType === "baiia" ? (
                                        // Formulaire avec liste déroulante pour BAIIA
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-700 mb-1 block">Sélectionner un poste du type Résultats</label>
                                            <Select
                                              value={selectedResultatsPoste}
                                              onValueChange={setSelectedResultatsPoste}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Sélectionner un poste..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {getAllResultatsPostes().map((poste) => (
                                                  <SelectItem key={poste.id} value={poste.id}>
                                                    {poste.name} ({poste.linkCode})
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="flex items-end gap-2 pt-5">
                                            <Button
                                              onClick={() => handleAddPoste(mapping.id, null)}
                                              disabled={!selectedResultatsPoste}
                                              size="sm"
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                              <Check className="w-3.5 h-3.5 mr-1" />
                                              Ajouter
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                setAddingPosteTo(null)
                                                setSelectedResultatsPoste("")
                                              }}
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        // Formulaire avec inputs texte pour les autres types
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1">
                                            <div>
                                              <label className="text-xs font-medium text-slate-700 mb-1 block">Nom du poste</label>
                                              <Input
                                                placeholder="Ex: Capital social"
                                                value={newPosteName}
                                                onChange={(e) => setNewPosteName(e.target.value)}
                                                className="w-full"
                                                autoFocus
                                              />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-slate-700 mb-1 block">Code de liaison</label>
                                              <Input
                                                placeholder="Ex: CP-001"
                                                value={newPosteLinkCode}
                                                onChange={(e) => setNewPosteLinkCode(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    handleAddPoste(mapping.id, null)
                                                  } else if (e.key === "Escape") {
                                                    setAddingPosteTo(null)
                                                    setNewPosteName("")
                                                    setNewPosteLinkCode("")
                                                  }
                                                }}
                                                className="w-full"
                                              />
                                            </div>
                                          </div>
                                          <div className="flex items-end gap-2 pt-5">
                                            <Button
                                              onClick={() => handleAddPoste(mapping.id, null)}
                                              disabled={!newPosteName.trim() || !newPosteLinkCode.trim()}
                                              size="sm"
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                              <Check className="w-3.5 h-3.5 mr-1" />
                                              Ajouter
                                            </Button>
                                            <Button
                                              onClick={() => {
                                                setAddingPosteTo(null)
                                                setNewPosteName("")
                                                setNewPosteLinkCode("")
                                              }}
                                              size="sm"
                                              variant="ghost"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* Postes Rows for Capitaux propres */}
                              {(mapping.postes || []).map((poste) => (
                                <tr
                                  key={poste.id}
                                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                  <td className="px-6 py-3">
                                    <div className="pl-12 text-slate-700 text-sm">{poste.name}</div>
                                  </td>
                                  <td className="px-6 py-3">
                                    <div className="text-slate-600 text-sm">{poste.linkCode}</div>
                                  </td>
                                  {mappingType === "bilan" && (
                                    <td className="px-6 py-3"></td>
                                  )}
                                  {mappingType === "resultats" && mapping.name !== "Revenus" && (
                                    <td className="px-6 py-3">
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={poste.cv || false}
                                          onChange={() => handleToggleCv(mapping.id, null, poste.id)}
                                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                        />
                                      </div>
                                    </td>
                                  )}
                                  {mappingType === "resultats" && mapping.name === "Revenus" && (
                                    <td className="px-6 py-3"></td>
                                  )}
                                  <td className="px-6 py-3">
                                    {editingPosteId === poste.id ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="flex items-center gap-2">
                                          <Input
                                            value={editingPosteName}
                                            onChange={(e) => setEditingPosteName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleSaveEditPoste(mapping.id, null, poste.id)
                                              } else if (e.key === "Escape") {
                                                handleCancelEditPoste()
                                              }
                                            }}
                                            className="w-48"
                                            autoFocus
                                          />
                                          <Input
                                            value={editingPosteLinkCode}
                                            onChange={(e) => setEditingPosteLinkCode(e.target.value)}
                                            className="w-32"
                                          />
                                        </div>
                                        <Button
                                          onClick={() => handleSaveEditPoste(mapping.id, null, poste.id)}
                                          disabled={!editingPosteName.trim() || !editingPosteLinkCode.trim()}
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          onClick={handleCancelEditPoste}
                                          size="sm"
                                          variant="ghost"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          onClick={() => handleStartEditPoste(mapping.id, null, poste)}
                                          size="sm"
                                          variant="ghost"
                                          className="text-slate-600 hover:text-slate-900 h-7 w-7 p-0"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeletePoste(mapping.id, null, poste.id)}
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {/* Empty State for Capitaux propres */}
                              {(mapping.postes || []).length === 0 && addingPosteTo?.mappingId !== mapping.id && (
                                <tr className="border-b border-slate-200">
                                  <td colSpan={mappingType === "bilan" || mappingType === "resultats" ? 4 : 3} className="px-6 py-4">
                                    <div className="text-center text-slate-400 pl-12">
                                      <p className="text-xs">Aucun poste</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )}

                          {/* Add Category Form for Charges, Coûts des produits vendus, and Capex */}
                          {isExpanded && ((mappingType === "resultats" && (mapping.name === "Charges" || mapping.name === "Coûts des produits vendus")) || (mappingType === "capex" && mapping.name === "Capex")) && isAddingCategory && (
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan={3} className="px-6 py-3">
                                <div className="flex items-center gap-3 pl-12">
                                  <Input
                                    placeholder="Nom de la catégorie"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleAddCategory(mapping.id)
                                      } else if (e.key === "Escape") {
                                        setAddingCategoryTo(null)
                                        setNewCategoryName("")
                                      }
                                    }}
                                    className="flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    onClick={() => handleAddCategory(mapping.id)}
                                    disabled={!newCategoryName.trim()}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setAddingCategoryTo(null)
                                      setNewCategoryName("")
                                    }}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Categories and Postes */}
                          {isExpanded && mapping.name !== "Capitaux propres" && !(mappingType === "resultats" && mapping.name === "Revenus") && !(mappingType === "baiia" && (mapping.name === "Amortissement" || mapping.name === "Intérêts" || mapping.name === "Impôts")) &&
                            mapping.categories.map((category) => {
                                const isCategoryExpanded = true // Toujours visible
                                const isAddingPoste =
                                  addingPosteTo?.mappingId === mapping.id &&
                                  addingPosteTo?.categoryId === category.id

                                return (
                                  <React.Fragment key={category.id}>
                                    {/* Category Row */}
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                      <td className="px-6 py-3">
                                        <div className="flex items-center gap-3 pl-12">
                                      {editingCategoryId === category.id ? (
                                        <>
                                          <Input
                                            value={editingCategoryName}
                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleSaveEditCategory(mapping.id, category.id)
                                              } else if (e.key === "Escape") {
                                                handleCancelEditCategory()
                                              }
                                            }}
                                            className="flex-1"
                                            autoFocus
                                          />
                                          <Button
                                            onClick={() => handleSaveEditCategory(mapping.id, category.id)}
                                            disabled={!editingCategoryName.trim()}
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            onClick={handleCancelEditCategory}
                                            size="sm"
                                            variant="ghost"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <span className="font-semibold text-sm text-slate-700">{category.name}</span>
                                      )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3"></td>
                                      {mappingType === "bilan" && <td className="px-6 py-3"></td>}
                                      {mappingType === "resultats" && <td className="px-6 py-3"></td>}
                                      <td className="px-6 py-3 text-right">
                                        {editingCategoryId !== category.id && (
                                          <div className="flex items-center justify-end gap-2">
                                          <Button
                                            onClick={() => {
                                              setAddingPosteTo({ mappingId: mapping.id, categoryId: category.id })
                                            }}
                                            size="sm"
                                            variant="ghost"
                                            className="text-slate-600 hover:text-slate-900 h-7 px-2"
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Poste
                                          </Button>
                                          <Button
                                            onClick={() => handleStartEditCategory(mapping.id, category)}
                                            size="sm"
                                            variant="ghost"
                                            className="text-slate-600 hover:text-slate-900 h-7 w-7 p-0"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </Button>
                                          {(mappingType !== "bilan") && (
                                            <Button
                                              onClick={() => handleDeleteCategory(mapping.id, category.id)}
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                      </td>
                                    </tr>

                                    {/* Add Poste Form */}
                                    {isCategoryExpanded && isAddingPoste && (
                                      <tr className="bg-slate-50 border-b border-slate-200">
                                        <td colSpan={mappingType === "bilan" || mappingType === "resultats" ? 4 : 3} className="px-6 py-3">
                                          <div className="space-y-2 pl-20">
                                            <div className="flex items-center gap-3">
                                              <div className="flex-1">
                                                  <div>
                                                    <label className="text-xs font-medium text-slate-700 mb-1 block">Nom du poste</label>
                                                    <Input
                                                      placeholder="Ex: Encaisse"
                                                      value={newPosteName}
                                                      onChange={(e) => setNewPosteName(e.target.value)}
                                                      className="w-full"
                                                      autoFocus
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="text-xs font-medium text-slate-700 mb-1 block">Code de liaison</label>
                                                    <Input
                                                      placeholder="Ex: ACT-001"
                                                      value={newPosteLinkCode}
                                                      onChange={(e) => setNewPosteLinkCode(e.target.value)}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          handleAddPoste(mapping.id, category.id)
                                                        } else if (e.key === "Escape") {
                                                          setAddingPosteTo(null)
                                                          setNewPosteName("")
                                                          setNewPosteLinkCode("")
                                                        }
                                                      }}
                                                      className="w-full"
                                                    />
                                                </div>
                                              </div>
                                              <div className="flex items-end gap-2 pt-5">
                                                <Button
                                                  onClick={() => handleAddPoste(mapping.id, category.id)}
                                                  disabled={!newPosteName.trim() || !newPosteLinkCode.trim()}
                                                  size="sm"
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                  <Check className="w-3.5 h-3.5 mr-1" />
                                                  Ajouter
                                                </Button>
                                                <Button
                                                  onClick={() => {
                                                    setAddingPosteTo(null)
                                                    setNewPosteName("")
                                                    setNewPosteLinkCode("")
                                                  }}
                                                  size="sm"
                                                  variant="ghost"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {/* Postes Rows */}
                                    {isCategoryExpanded &&
                                      category.postes.map((poste) => (
                                        <tr
                                          key={poste.id}
                                          className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                                        >
                                          <td className="px-6 py-3">
                                            <div className="pl-20 text-slate-700 text-sm">{poste.name}</div>
                                          </td>
                                          <td className="px-6 py-3">
                                            <div className="text-slate-600 text-sm">{poste.linkCode}</div>
                                          </td>
                                          {mappingType === "bilan" && (mapping.name === "Actif" || mapping.name === "Passif") && category.name === "Court terme" && (
                                            <td className="px-6 py-3">
                                              <div className="flex items-center justify-center">
                                                <input
                                                  type="checkbox"
                                                  checked={poste.fdRhc || false}
                                                  onChange={() => handleToggleFdRhc(mapping.id, category.id, poste.id)}
                                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                                />
                                              </div>
                                            </td>
                                          )}
                                          {mappingType === "bilan" && !((mapping.name === "Actif" || mapping.name === "Passif") && category.name === "Court terme") && (
                                            <td className="px-6 py-3"></td>
                                          )}
                                          {mappingType === "resultats" && (
                                            <td className="px-6 py-3">
                                              <div className="flex items-center justify-center">
                                                <input
                                                  type="checkbox"
                                                  checked={poste.cv || false}
                                                  onChange={() => handleToggleCv(mapping.id, category.id, poste.id)}
                                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                                />
                                              </div>
                                            </td>
                                          )}
                                          <td className="px-6 py-3">
                                            {editingPosteId === poste.id ? (
                                              <div className="flex items-center justify-end gap-2">
                                                <div className="flex items-center gap-2">
                                                  <Input
                                                    value={editingPosteName}
                                                    onChange={(e) => setEditingPosteName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        handleSaveEditPoste(mapping.id, category.id, poste.id)
                                                      } else if (e.key === "Escape") {
                                                        handleCancelEditPoste()
                                                      }
                                                    }}
                                                    className="w-48"
                                                    autoFocus
                                                  />
                                                  <Input
                                                    value={editingPosteLinkCode}
                                                    onChange={(e) => setEditingPosteLinkCode(e.target.value)}
                                                    className="w-32"
                                                  />
                                                </div>
                                                <Button
                                                  onClick={() => handleSaveEditPoste(mapping.id, category.id, poste.id)}
                                                  disabled={!editingPosteName.trim() || !editingPosteLinkCode.trim()}
                                                  size="sm"
                                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                  onClick={handleCancelEditPoste}
                                                  size="sm"
                                                  variant="ghost"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-end gap-2">
                                                <Button
                                                  onClick={() => handleStartEditPoste(mapping.id, category.id, poste)}
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-slate-600 hover:text-slate-900 h-7 w-7 p-0"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                  onClick={() => handleDeletePoste(mapping.id, category.id, poste.id)}
                                                  size="sm"
                                                  variant="ghost"
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      ))}

                                    {/* Empty State for Postes */}
                                    {isCategoryExpanded && category.postes.length === 0 && !isAddingPoste && (
                                      <tr className="border-b border-slate-200">
                                        <td colSpan={mappingType === "bilan" || mappingType === "resultats" ? 4 : 3} className="px-6 py-4">
                                          <div className="text-center text-slate-400 pl-20">
                                            <p className="text-xs">Aucun poste</p>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                )
                              })}

                          {/* Empty State for Categories */}
                          {isExpanded && mapping.name !== "Capitaux propres" && !(mappingType === "resultats" && mapping.name === "Revenus") && !(mappingType === "baiia" && (mapping.name === "Amortissement" || mapping.name === "Intérêts" || mapping.name === "Impôts")) && mapping.categories.length === 0 && !isAddingCategory && (
                            <tr className="border-b border-slate-200">
                              <td colSpan={mappingType === "bilan" ? 4 : 3} className="px-6 py-4">
                                <div className="text-center text-slate-400 pl-12">
                                  <p className="text-xs">Aucune catégorie</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
