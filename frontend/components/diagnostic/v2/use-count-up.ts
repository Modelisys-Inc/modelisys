"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Progression 0 → 1 avec easing `easeOutCubic`, jouée une fois au montage.
 *
 * Sert aux compteurs animés (indice de santé, cartes KPI) et à la
 * croissance des barres/jauges. Respecte `prefers-reduced-motion`.
 */
export function useCountUp(durationMs = 900): number {
  const [t, setT] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setT(1)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      setT(1 - Math.pow(1 - p, 3))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [durationMs])

  return t
}

/**
 * Comme `useCountUp`, mais déclenché quand l'élément entre dans le viewport.
 * Utilisé pour les graphiques situés bas dans le rapport.
 */
export function useCountUpOnVisible<T extends HTMLElement>(durationMs = 900) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  const [t, setT] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      setT(1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, durationMs])

  return { ref, t }
}
