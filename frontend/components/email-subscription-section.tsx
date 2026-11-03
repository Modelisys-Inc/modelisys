"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const FORMSPREE_URL = "https://formspree.io/f/xzdapzyv"

export function EmailSubscriptionSection() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          _subject: "Inscription infolettre — Modelisys",
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setEmail("")

        setTimeout(() => {
          setIsSubmitted(false)
        }, 4000)
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative z-10 bg-[#F8FAFC] py-20 sm:py-28">
      <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Infolettre</p>
        <h2 className="mt-5 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12]">
          Inscrivez votre courriel pour rester informé
        </h2>
        <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
          Soyez parmi les premiers informés des nouveautés, des opportunités et des développements de Modelisys.
        </p>

        <div className="mt-10 max-w-xl border-t border-[#2A2F3A]/15 pt-8">
          {isSubmitted ? (
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E0742D]" />
              <div>
                <p className="font-medium text-[#2A2F3A]">Merci pour votre inscription</p>
                <p className="mt-1 text-sm leading-relaxed text-[#5C5F66]">
                  Vous recevrez nos prochaines actualités à cette adresse.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newsletter-email" className="text-[#2A2F3A]">
                  Courriel <span className="text-[#E0742D]">*</span>
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    required
                    autoComplete="email"
                    className="h-12 border-[#2A2F3A]/15 bg-white shadow-none focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "group h-auto shrink-0 rounded-full bg-[#222732] px-5 py-2.5 text-sm font-normal text-[#E6D6C3] shadow-none transition-colors duration-200 hover:bg-[#E6D6C3] hover:text-[#222732]",
                      isSubmitting && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <ArrowRight className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    {isSubmitting ? "Inscription..." : "S’inscrire"}
                  </Button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#5C5F66]">
                Une seule adresse, pas de spam : vous pourrez vous désinscrire à tout moment.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
