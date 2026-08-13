/** Design tokens — rapport diagnostic (impression / Visualiser le Rapport). */

export const REPORT_THEME = {
  colors: {
    primary: "#E85D04",
    success: "#2D6A4F",
    warning: "#E9C46A",
    danger: "#E63946",
    muted: "#6B7280",
    ink: "#2A2F3A",
    backgroundCard: "#FFFFFF",
    border: "#E5E7EB",
    backgroundPage: "#F8FAFC",
  },
  typography: {
    h1: { fontSize: "28px", fontWeight: 700, lineHeight: 1.15 },
    h2: { fontSize: "22px", fontWeight: 600, lineHeight: 1.2 },
    h3: { fontSize: "16px", fontWeight: 600, lineHeight: 1.3 },
    body: { fontSize: "14px", fontWeight: 400, lineHeight: 1.55 },
    caption: { fontSize: "12px", fontWeight: 500, lineHeight: 1.4 },
    label: { fontSize: "10px", fontWeight: 600, lineHeight: 1.3, letterSpacing: "0.14em" },
  },
  spacing: {
    pagePaddingY: "24px",
    pagePaddingX: "14mm",
    sectionGap: "24px",
    blockGap: "16px",
  },
  layout: {
    /** Hauteur min utile avant saut de page (évite pages quasi vides). */
    minContentHeightBeforeBreak: "120mm",
    maxChartHeight: "280px",
  },
} as const

export const REPORT_CSS_VARS = {
  "--report-primary": REPORT_THEME.colors.primary,
  "--report-success": REPORT_THEME.colors.success,
  "--report-warning": REPORT_THEME.colors.warning,
  "--report-danger": REPORT_THEME.colors.danger,
  "--report-muted": REPORT_THEME.colors.muted,
  "--report-ink": REPORT_THEME.colors.ink,
  "--report-border": REPORT_THEME.colors.border,
  "--report-bg-card": REPORT_THEME.colors.backgroundCard,
  "--report-h1-size": REPORT_THEME.typography.h1.fontSize,
  "--report-h2-size": REPORT_THEME.typography.h2.fontSize,
  "--report-h3-size": REPORT_THEME.typography.h3.fontSize,
  "--report-body-size": REPORT_THEME.typography.body.fontSize,
  "--report-caption-size": REPORT_THEME.typography.caption.fontSize,
  "--report-page-py": REPORT_THEME.spacing.pagePaddingY,
  "--report-page-px": REPORT_THEME.spacing.pagePaddingX,
} as const
