"use client"

import { useEffect } from "react"
import {
  APPROCHE_SECTION_ID,
  dispatchApprochePhaseNavigate,
  parseApprochePhaseFromHash,
  scrollToApprocheSection,
} from "@/lib/approche-navigation"
import {
  FEATURE_SECTION_ID,
  dispatchFeatureCategoryNavigate,
  parseFeatureCategoryFromHash,
  scrollToFeatureSection,
} from "@/lib/feature-category-navigation"

function scrollToHash() {
  if (typeof window === "undefined") return
  const { hash } = window.location
  if (!hash || hash === "#") return

  const phaseId = parseApprochePhaseFromHash(hash)
  if (phaseId) {
    dispatchApprochePhaseNavigate(phaseId)
    scrollToApprocheSection({ behavior: "smooth" })
    return
  }

  const categoryId = parseFeatureCategoryFromHash(hash)
  if (categoryId) {
    dispatchFeatureCategoryNavigate(categoryId)
    scrollToFeatureSection({ behavior: "smooth" })
    return
  }

  const id = decodeURIComponent(hash.slice(1))
  if (id === APPROCHE_SECTION_ID) {
    scrollToApprocheSection({ behavior: "smooth" })
    return
  }

  if (id === FEATURE_SECTION_ID) {
    scrollToFeatureSection({ behavior: "smooth" })
    return
  }

  const el = document.getElementById(id)
  if (!el) return

  const nav = document.querySelector("nav")
  const offset = nav ? Math.ceil(nav.getBoundingClientRect().height) + 16 : 96
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}

/** Scrolls to #anchor on load and on hash changes (e.g. nav from another page). */
export function LandingHashScroll() {
  useEffect(() => {
    const run = () => requestAnimationFrame(() => requestAnimationFrame(scrollToHash))
    const id = window.setTimeout(run, 0)
    window.addEventListener("hashchange", scrollToHash)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("hashchange", scrollToHash)
    }
  }, [])
  return null
}
