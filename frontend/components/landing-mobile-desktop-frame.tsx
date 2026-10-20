"use client"

import { useEffect } from "react"

const EMBED_PATH = "/?embed=desktop"

export function LandingMobileDesktopFrame() {
  useEffect(() => {
    const iframe = document.getElementById("landing-desktop-frame") as HTMLIFrameElement | null
    if (!iframe) return
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => {
      if (!mq.matches) {
        if (iframe.getAttribute("src")) iframe.removeAttribute("src")
        return
      }
      const next = `${EMBED_PATH}${window.location.hash}`
      if (iframe.getAttribute("src") !== next) iframe.setAttribute("src", next)
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return null
}

/** Dans la vue réduite, les liens quittent le cadre pour ouvrir la page réelle. */
export function LandingEmbedBreakout() {
  useEffect(() => {
    if (window.parent === window) return

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin === window.location.origin && url.pathname === "/" && url.hash) return
      event.preventDefault()
      window.top?.location.assign(url.href)
    }

    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  return null
}
