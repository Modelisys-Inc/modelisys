"use client"

import { useLayoutEffect } from "react"

type LandingViewportApi = {
  apply: () => void
  restore: () => void
}

function api(): LandingViewportApi | undefined {
  return (window as Window & { __modelisysLandingViewport?: LandingViewportApi }).__modelisysLandingViewport
}

export function LandingMobileDesktopViewport() {
  useLayoutEffect(() => {
    const paused = window as Window & { __modelisysLandingViewportPaused?: boolean }
    paused.__modelisysLandingViewportPaused = false
    api()?.apply()
    return () => {
      api()?.restore()
    }
  }, [])

  return null
}
