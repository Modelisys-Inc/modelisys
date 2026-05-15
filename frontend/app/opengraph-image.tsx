import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Modelisys — Pilotage financier pour PME et cabinets comptables"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0b0f17 0%, #111827 55%, #0f1f1a 100%)",
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              color: "white",
            }}
          >
            M
          </div>
          <div style={{ fontSize: "30px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Modelisys
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: "960px",
            }}
          >
            Pilotage financier pour PME et cabinets comptables
          </div>
          <div
            style={{
              fontSize: "26px",
              color: "#94a3b8",
              maxWidth: "880px",
              lineHeight: 1.35,
            }}
          >
            États financiers, projections, valorisation et reporting consolidé.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: "20px",
            color: "#64748b",
          }}
        >
          <div>modelisys.com</div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              fontSize: "18px",
            }}
          >
            Plateforme SaaS
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
