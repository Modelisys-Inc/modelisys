"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const FORMSPREE_DEMO = "https://formspree.io/f/xzdapzyv"

const STEPS = [
  {
    n: "01",
    title: "Envoyez votre demande",
    body: "Indiquez vos coordonnées et, si vous le souhaitez, un court message dans le formulaire.",
  },
  {
    n: "02",
    title: "Réponse rapide",
    body: "Notre équipe vous recontacte dans les plus brefs délais pour convenir d’un créneau.",
  },
  {
    n: "03",
    title: "Rendez-vous sur mesure",
    body: "Échangez avec notre équipe lors d’une session adaptée à votre contexte.",
  },
] as const

const NOTES = [
  { title: "30 minutes", sub: "Échange personnalisé" },
  { title: "Expert dédié", sub: "Accompagnement personnalisé" },
  { title: "Sans engagement", sub: "Découvrez sans pression" },
] as const

const fieldClass =
  "h-12 border-[#2A2F3A]/15 bg-white shadow-none focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

export function DemoBookingSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(FORMSPREE_DEMO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          _subject: "Demande de rendez-vous — Modelisys",
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          setIsSubmitted(false)
          setFormData({
            name: "",
            email: "",
            company: "",
            phone: "",
            message: "",
          })
        }, 4000)
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <section id="demo" className="relative z-10 scroll-mt-24 bg-[#F0F4F8] py-20 sm:py-28">
      <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Prendre rendez-vous
        </p>
        <h2 className="mt-5 max-w-4xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12]">
          Planifiez un échange avec notre équipe
        </h2>
        <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
          Discutons de vos enjeux et découvrons ensemble comment Modelisys peut vous aider à piloter votre
          performance financière et augmenter la valeur de votre entreprise.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-14 lg:mt-16 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <ol className="border-t border-[#2A2F3A]/15">
              {STEPS.map((step) => (
                <li key={step.n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-b border-[#2A2F3A]/15 py-5">
                  <span className="pt-1 text-[11px] font-medium tracking-[0.18em] text-[#E0742D]">{step.n}</span>
                  <div>
                    <h3 className="text-base font-semibold text-[#2A2F3A]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5C5F66]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-8 space-y-3">
              {NOTES.map((note) => (
                <li key={note.title} className="text-sm text-[#5C5F66]">
                  <span className="font-medium text-[#2A2F3A]">{note.title}</span>
                  <span className="mx-2 text-[#E0742D]">·</span>
                  {note.sub}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#2A2F3A]/15 pt-8">
            <h3 className="text-xl font-semibold tracking-tight text-[#2A2F3A]">Demande de rendez-vous</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">
              Laissez-nous vos informations : notre équipe vous contactera dans les plus brefs délais pour
              planifier votre rendez-vous.
            </p>

            {isSubmitted ? (
              <div className="mt-10 flex items-start gap-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E0742D]" />
                <div>
                  <p className="font-medium text-[#2A2F3A]">Demande bien reçue</p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-[#5C5F66]">
                    Merci ! Nous vous recontactons très bientôt pour convenir d’un créneau qui vous convient.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="demo-name" className="text-[#2A2F3A]">
                      Nom complet <span className="text-[#E0742D]">*</span>
                    </Label>
                    <Input
                      id="demo-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-email" className="text-[#2A2F3A]">
                      Courriel <span className="text-[#E0742D]">*</span>
                    </Label>
                    <Input
                      id="demo-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="vous@entreprise.com"
                    />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="demo-company" className="text-[#2A2F3A]">
                      Entreprise
                    </Label>
                    <Input
                      id="demo-company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      value={formData.company}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Nom de l’organisation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-phone" className="text-[#2A2F3A]">
                      Téléphone
                    </Label>
                    <Input
                      id="demo-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="+1 (450) 822-2436"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-message" className="text-[#2A2F3A]">
                    Message <span className="text-slate-400">(facultatif)</span>
                  </Label>
                  <Textarea
                    id="demo-message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className={cn("resize-none", fieldClass)}
                    placeholder="Contexte, besoins ou disponibilités…"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "group h-auto w-fit rounded-full bg-[#222732] px-5 py-2.5 text-sm font-normal text-[#E6D6C3] shadow-none transition-colors duration-200 hover:bg-[#E6D6C3] hover:text-[#222732]",
                    isSubmitting && "cursor-not-allowed opacity-50",
                  )}
                >
                  <ArrowRight className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
                </Button>

                <p className="max-w-xl text-xs leading-relaxed text-[#5C5F66]">
                  En envoyant ce formulaire, vous acceptez que nous utilisions ces informations pour vous
                  recontacter au sujet d’un rendez-vous.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
