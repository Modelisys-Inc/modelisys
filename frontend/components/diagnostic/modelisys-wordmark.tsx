import Image from "next/image"
import { cn } from "@/lib/utils"

interface ModelisysWordmarkProps {
  /** `light` pour fonds sombres (landing), `dark` pour fonds clairs. */
  variant?: "light" | "dark"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  /** Affiche le logo SVG si disponible, avec repli sur le mot-symbole texte. */
  showLogoImage?: boolean
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-xl md:text-2xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl",
} as const

/** Mot-symbole Modelisys — même traitement typographique que la page d'atterrissage. */
export function ModelisysWordmark({
  variant = "light",
  size = "md",
  className,
  showLogoImage = false,
}: ModelisysWordmarkProps) {
  const textColor = variant === "light" ? "text-[#E6D6C3]" : "text-[#2A2F3A]"
  const accentColor = "text-[#E0742D]"

  if (showLogoImage) {
    return (
      <div className={cn("relative flex items-center", className)}>
        <Image
          src="/images/modelisys-logo-noir.svg"
          alt="Modelisys"
          width={180}
          height={40}
          className={cn(
            "h-8 w-auto object-contain sm:h-10",
            variant === "light" && "brightness-0 invert",
          )}
          priority
        />
      </div>
    )
  }

  return (
    <span
      className={cn(
        "font-semibold tracking-tight",
        sizeClasses[size],
        textColor,
        className,
      )}
    >
      modelisys<span className={accentColor}>.</span>
    </span>
  )
}
