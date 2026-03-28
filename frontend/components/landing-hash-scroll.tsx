"use client"

import { useEffect } from "react"

function scrollToHash() {
  if (typeof window === "undefined") return
  const { hash } = window.location
  if (!hash || hash === "#") return
  const id = decodeURIComponent(hash.slice(1))
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
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
