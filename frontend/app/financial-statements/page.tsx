"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, BarChart3, Edit2, Trash2, X, Check, Folder, FolderTree, Filter } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import React from "react"
import { usePathname } from "next/navigation"

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

const STORAGE_KEY_PREFIX = "financial-statements-mappings"

const getDefaultMappingsBilan = (): Mapping[] => [
  {
    id: "1",
    name: "Actif",
    categories: [
      {
        id: "cat-1",
        name: "Court terme",
        postes: [
          { id: "poste-1", name: "Encaisse", linkCode: "ACT-001" },
          { id: "poste-2", name: "Débiteurs", linkCode: "ACT-002" },
          { id: "poste-3", name: "Frais payés d'avance", linkCode: "ACT-003" },
        ],
      },
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
    postes: [
      { id: "poste-1", name: "Ventes", linkCode: "REV-001" },
      { id: "poste-2", name: "Services", linkCode: "REV-002" },
    ],
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
    categories: [
      { id: "cat-1", name: "Charges d'exploitation", postes: [] },
      { id: "cat-2", name: "Charges financières", postes: [] },
    ],
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

const loadMappings = (type: MappingType): Mapping[] => {
  if (typeof window === "undefined") return getDefaultMappings(type)
  
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}-${type}`
    let stored = localStorage.getItem(storageKey)
    
    // Migration : Si on charge le bilan et qu'il n'y a pas de données, vérifier l'ancienne clé
    if (!stored && type === "bilan") {
      const oldKey = "financial-statements-mappings"
      const oldStored = localStorage.getItem(oldKey)
      if (oldStored) {
        // Migrer les anciennes données vers la nouvelle clé
        try {
          const oldParsed = JSON.parse(oldStored)
          localStorage.setItem(storageKey, JSON.stringify(oldParsed))
          stored = oldStored
        } catch (e) {
          console.error("Error migrating old mappings:", e)
        }
      }
    }
    
    if (stored) {
      const parsed = JSON.parse(stored)
      // S'assurer qu'on a toujours les mappings requis
      const defaultMappings = getDefaultMappings(type)
      const requiredNames = type === "bilan"
        ? ["Actif", "Passif", "Capitaux propres"]
        : type === "resultats"
        ? ["Revenus", "Coûts des produits vendus", "Charges"]
        : type === "capex"
        ? ["Capex"]
        : ["Amortissement", "Intérêts", "Impôts"]
      
      // Vérifier et ajouter les mappings manquants
      const existingNames = parsed.map((m: Mapping) => m.name)
      const missingMappings = defaultMappings.filter(m => !existingNames.includes(m.name))
      
      // Fusionner les mappings existants avec les manquants
      const merged = [...parsed]
      missingMappings.forEach(missing => {
        merged.push(missing)
      })
      
      // Filtrer pour ne garder que les mappings appropriés pour ce type
      const filteredMerged = merged.filter((m: Mapping) => requiredNames.includes(m.name))
      
      // S'assurer que chaque mapping a la bonne structure et préserver toutes les données existantes
      return filteredMerged.map((m: Mapping) => {
        if (type === "bilan" && m.name === "Capitaux propres") {
          return {
            ...m,
            categories: [],
            postes: m.postes || [],
          }
        }
        if (type === "resultats" && m.name === "Revenus") {
          return {
            ...m,
            categories: [],
            postes: m.postes || [],
          }
        }
        // BAIIA : Amortissement, Intérêts et Impôts fonctionnent comme Revenus - uniquement des postes directs
        if (type === "baiia" && (m.name === "Amortissement" || m.name === "Intérêts" || m.name === "Impôts")) {
          return {
            ...m,
            categories: [],
            postes: m.postes || [],
          }
        }
        // Coûts des produits vendus fonctionne exactement comme Charges : uniquement des catégories, pas de postes directs
        if (type === "resultats" && m.name === "Coûts des produits vendus") {
          return {
            ...m,
            categories: (m.categories || []).map(cat => ({
              ...cat,
              postes: cat.postes || []
            })),
            postes: undefined, // Pas de postes directs, uniquement dans les catégories
          }
        }
        // Capex fonctionne exactement comme Charges : uniquement des catégories, pas de postes directs
        if (type === "capex" && m.name === "Capex") {
          return {
            ...m,
            categories: (m.categories || []).map(cat => ({
              ...cat,
              postes: cat.postes || []
            })),
            postes: undefined, // Pas de postes directs, uniquement dans les catégories
          }
        }
        // Pour Actif et Passif dans le bilan, s'assurer qu'ils ont les catégories Court terme et Long terme
        // Mais préserver TOUTES les catégories et postes existants
        if (type === "bilan" && (m.name === "Actif" || m.name === "Passif")) {
          const defaultMapping = defaultMappings.find(dm => dm.name === m.name)
          if (defaultMapping) {
            const existingCategories = m.categories || []
            const requiredCategoryNames = ["Court terme", "Long terme"]
            const existingCategoryNames = existingCategories.map(c => c.name)
            const missingCategoryNames = requiredCategoryNames.filter(name => !existingCategoryNames.includes(name))
            
            // Ajouter les catégories manquantes depuis le défaut, mais préserver toutes les données existantes
            const missingCategories = defaultMapping.categories
              .filter(c => missingCategoryNames.includes(c.name))
              .map(c => ({
                ...c,
                // Si une catégorie avec le même nom existe déjà, préserver ses postes
                postes: existingCategories.find(ec => ec.name === c.name)?.postes || c.postes || []
              }))
            
            // Fusionner : garder toutes les catégories existantes (avec leurs postes) et ajouter les manquantes
            const mergedCategories = [...existingCategories]
            missingCategories.forEach(missingCat => {
              if (!mergedCategories.find(ec => ec.name === missingCat.name)) {
                mergedCategories.push(missingCat)
              }
            })
            
            return {
              ...m,
              categories: mergedCategories,
              postes: undefined, // Actif et Passif n'ont pas de postes directs
            }
          }
        }
        // Pour les autres mappings (comme "Charges" dans Résultats), préserver toutes les catégories et leurs postes
        return {
          ...m,
          categories: (m.categories || []).map(cat => ({
            ...cat,
            postes: cat.postes || [] // Préserver tous les postes existants
          })),
          postes: m.postes || undefined, // Préserver les postes directs si ils existent
        }
      })
    }
  } catch (error) {
    console.error("Error loading mappings from localStorage:", error)
  }
  return getDefaultMappings(type)
}

const saveMappings = (mappings: Mapping[], type: MappingType) => {
  if (typeof window === "undefined") return
  
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}-${type}`
    localStorage.setItem(storageKey, JSON.stringify(mappings))
  } catch (error) {
    console.error("Error saving mappings to localStorage:", error)
  }
}

export default function FinancialStatementsPage() {
  const pathname = usePathname()
  const [mappingType, setMappingType] = useState<MappingType>("bilan")
  const [mappings, setMappings] = useState<Mapping[]>(() => loadMappings("bilan"))
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

  // Utiliser une ref pour suivre le type précédent et éviter les sauvegardes lors du premier chargement
  const prevMappingTypeRef = React.useRef<MappingType | null>(null)
  const isInitialMount = React.useRef(true)
  const isChangingTypeRef = React.useRef(false)
  const prevPathnameRef = useRef<string | null>(null)
  
  // Fonction pour récupérer tous les postes du type Résultats
  const getAllResultatsPostes = (): Poste[] => {
    const resultatsMappings = loadMappings("resultats")
    const allPostes: Poste[] = []
    
    resultatsMappings.forEach((mapping) => {
      // Postes directs (Revenus, Coûts des produits vendus)
      if (mapping.postes) {
        allPostes.push(...mapping.postes)
      }
      
      // Postes dans les catégories (Charges, Coûts des produits vendus)
      mapping.categories.forEach((category) => {
        allPostes.push(...category.postes)
      })
    })
    
    return allPostes
  }

  // Fonction utilitaire pour sauvegarder de manière synchrone
  const saveMappingsSync = (mappingsToSave: Mapping[], type: MappingType) => {
    if (typeof window === "undefined" || mappingsToSave.length === 0) return
    
    const requiredNames = type === "bilan"
      ? ["Actif", "Passif", "Capitaux propres"]
      : type === "resultats"
      ? ["Revenus", "Coûts des produits vendus", "Charges"]
      : type === "capex"
      ? ["Capex"]
      : ["Amortissement", "Intérêts", "Impôts"]
    const filteredMappings = mappingsToSave.filter(m => requiredNames.includes(m.name))
    
    if (filteredMappings.length > 0) {
      const storageKey = `${STORAGE_KEY_PREFIX}-${type}`
      try {
        localStorage.setItem(storageKey, JSON.stringify(filteredMappings))
      } catch (error) {
        console.error("Error saving mappings:", error)
      }
    }
  }
  
  // Charger les mappings quand le type change
  useEffect(() => {
    // Sauvegarder d'abord les mappings de l'ancien type avant de charger le nouveau (sauf au premier chargement)
    if (!isInitialMount.current && mappings.length > 0 && prevMappingTypeRef.current !== null && prevMappingTypeRef.current !== mappingType) {
      isChangingTypeRef.current = true
      const previousType = prevMappingTypeRef.current
      // Sauvegarder de manière synchrone pour garantir la persistance
      saveMappingsSync(mappings, previousType)
    }
    
    // Marquer que ce n'est plus le premier chargement
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
    
    // Mettre à jour la ref avec le nouveau type
    prevMappingTypeRef.current = mappingType
    
    // Ensuite charger les mappings du nouveau type depuis localStorage
    // Cela préservera toutes les modifications précédentes
    const loadedMappings = loadMappings(mappingType)
    setMappings(loadedMappings)
    
    // Réinitialiser le flag après un court délai pour permettre au useEffect de sauvegarde de fonctionner
    setTimeout(() => {
      isChangingTypeRef.current = false
    }, 150)
  }, [mappingType])

  // S'assurer qu'on a toujours les mappings requis au chargement et que Actif/Passif ont les bonnes catégories
  // Ce useEffect ne s'exécute qu'une seule fois au chargement initial pour chaque type
  useEffect(() => {
    if (mappings.length === 0 || isChangingTypeRef.current) return
    
    const requiredNames = mappingType === "bilan"
      ? ["Actif", "Passif", "Capitaux propres"]
      : mappingType === "resultats"
      ? ["Revenus", "Coûts des produits vendus", "Charges"]
      : mappingType === "capex"
      ? ["Capex"]
      : ["Amortissement", "Intérêts"]
    
    // Filtrer d'abord pour ne garder que les mappings du bon type
    let updatedMappings = mappings.filter(m => requiredNames.includes(m.name))
    let hasChanges = false
    
    const existingNames = updatedMappings.map(m => m.name)
    const missingNames = requiredNames.filter(name => !existingNames.includes(name))
    
    // Ajouter les mappings manquants (seulement s'ils n'existent pas déjà)
    if (missingNames.length > 0) {
      const defaultMappings = getDefaultMappings(mappingType)
      const missingMappings = defaultMappings.filter(m => missingNames.includes(m.name))
      updatedMappings = [...updatedMappings, ...missingMappings]
      hasChanges = true
    }
    
    // Pour le bilan, s'assurer que Actif et Passif ont les catégories Court terme et Long terme
    // Mais préserver toutes les catégories et postes existants
    if (mappingType === "bilan") {
      const defaultMappings = getDefaultMappingsBilan()
      updatedMappings = updatedMappings.map(m => {
        if (m.name === "Actif" || m.name === "Passif") {
          const defaultMapping = defaultMappings.find(dm => dm.name === m.name)
          if (defaultMapping) {
            const existingCategories = m.categories || []
            const requiredCategoryNames = ["Court terme", "Long terme"]
            const existingCategoryNames = existingCategories.map(c => c.name)
            const missingCategoryNames = requiredCategoryNames.filter(name => !existingCategoryNames.includes(name))
            
            if (missingCategoryNames.length > 0) {
              // Ajouter les catégories manquantes depuis le défaut, mais préserver toutes les catégories existantes
              const missingCategories = defaultMapping.categories
                .filter(c => missingCategoryNames.includes(c.name))
                .map(c => ({
                  ...c,
                  // Préserver les postes existants si la catégorie existe déjà avec un nom différent
                  postes: existingCategories.find(ec => ec.name === c.name)?.postes || c.postes || []
                }))
              
              // Fusionner les catégories : garder les existantes et ajouter les manquantes
              const mergedCategories = [...existingCategories]
              missingCategories.forEach(missingCat => {
                if (!mergedCategories.find(ec => ec.name === missingCat.name)) {
                  mergedCategories.push(missingCat)
                }
              })
              
              hasChanges = true
              return {
                ...m,
                categories: mergedCategories,
              }
            }
          }
        }
        return m
      })
    }
    
    // Mettre à jour seulement si quelque chose a changé
    if (hasChanges) {
      setMappings(updatedMappings)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingType])

  // Sauvegarder les mappings dans localStorage à chaque modification
  useEffect(() => {
    // Ne pas sauvegarder lors du chargement initial ou lors d'un changement de type
    if (mappings.length === 0 || isChangingTypeRef.current || isInitialMount.current) return
    
    // Sauvegarder immédiatement de manière synchrone
    saveMappingsSync(mappings, mappingType)
  }, [mappings, mappingType])
  
  // Sauvegarder lors du changement de route (navigation interne)
  useEffect(() => {
    // Sauvegarder avant de quitter la page si on change de route
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname && mappings.length > 0) {
      saveMappingsSync(mappings, mappingType)
    }
    prevPathnameRef.current = pathname
  }, [pathname, mappings, mappingType])
  
  // Sauvegarder aussi avant de quitter la page (unload) et lors de la visibilité de la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mappings.length > 0) {
        saveMappingsSync(mappings, mappingType)
      }
    }
    
    const handleVisibilityChange = () => {
      // Sauvegarder quand la page devient cachée (changement d'onglet, minimisation, etc.)
      if (document.hidden && mappings.length > 0) {
        saveMappingsSync(mappings, mappingType)
      }
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [mappings, mappingType])



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
      saveMappingsSync(updatedMappings, mappingType)
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
      saveMappingsSync(updatedMappings, mappingType)
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
    saveMappingsSync(updatedMappings, mappingType)
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
        saveMappingsSync(updatedMappings, mappingType)
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
      saveMappingsSync(updatedMappings, mappingType)
    }
  }

  const handleStartEditPoste = (mappingId: string, categoryId: string, poste: Poste) => {
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
      saveMappingsSync(updatedMappings, mappingType)
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
    saveMappingsSync(updatedMappings, mappingType)
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
    saveMappingsSync(updatedMappings, mappingType)
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
    saveMappingsSync(updatedMappings, mappingType)
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
              {mappings.length === 0 ? (
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
                              <td colSpan={mappingType === "bilan" ? 4 : 3} className="px-6 py-3">
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
                                          {(mappingType !== "bilan" || (mappingType === "resultats" && mapping.name === "Coûts des produits vendus")) && (
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
