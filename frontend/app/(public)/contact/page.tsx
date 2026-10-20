"use client"

import { useState } from "react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Building2,
  User,
  MessageSquare,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SUBJECT_OPTIONS = [
  "Accompagnement financier fractionnaire",
  "Prendre rendez-vous",
  "Demande de partenariat",
  "Autre",
] as const

const subjectSelectClassName =
  "flex h-12 w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-white/80 px-3 py-2 pr-10 text-sm text-[#2A2F3A] shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-[#E0742D]/80 focus-visible:ring-[3px] focus-visible:ring-[#E0742D]/25 disabled:cursor-not-allowed disabled:opacity-50"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("https://formspree.io/f/xzdapzyv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
            subject: "",
            message: "",
          })
        }, 3000)
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Aligné sur les cartes « Comment ça fonctionne » / « Demande » (demo-booking-section).
  const cardShell = "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm"
  const cardAccent = "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#E0742D]/[0.10]"

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/50">
      {/* Fond aligné sur la section « Pourquoi » (problem-solution) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
        <div className="absolute left-1/2 top-1/3 h-[min(72vh,520px)] w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
      </div>

      <GlassmorphismNav />

      <main className="relative z-10 pt-24 pb-16 sm:pb-24">
        <div className="max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
          {/* En-tête — même hiérarchie que « Pourquoi » */}
          <section className="relative py-12 lg:py-16">
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Contact</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mb-4 max-w-4xl font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              Parlons de votre projet
            </h1>
            <p className="text-lg sm:text-xl text-[#5C5F66] max-w-3xl leading-relaxed">
              Notre équipe est prête à vous accompagner dans la transformation de votre analyse financière.
              Discutons de vos besoins et voyons comment Modelisys peut répondre à vos enjeux.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <section className="pb-4 lg:pb-8">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              <div className="lg:col-span-1 space-y-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-[#2A2F3A] mb-4 tracking-tight">
                    Informations de contact
                  </h2>
                  <p className="text-[#5C5F66] leading-relaxed">
                    N&apos;hésitez pas à nous écrire pour toute question ou demande d&apos;information. Nous vous
                    répondrons dans les plus brefs délais.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className={cn(cardShell, "p-6 transition-shadow duration-300 hover:shadow-md")}>
                    <div className={cardAccent} aria-hidden />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-[#2A2F3A]">
                        <Mail className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2A2F3A] mb-1">Email</h3>
                        <a
                          href="mailto:contact@modelisys.com"
                          className="text-[#5C5F66] transition-colors hover:text-[#E0742D]"
                        >
                          contact@modelisys.com
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className={cn(cardShell, "p-6 transition-shadow duration-300 hover:shadow-md")}>
                    <div className={cardAccent} aria-hidden />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-[#2A2F3A]">
                        <Phone className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2A2F3A] mb-1">Téléphone</h3>
                        <a
                          href="tel:+14508222436"
                          className="text-[#5C5F66] transition-colors hover:text-[#E0742D]"
                        >
                          +1 (450) 822-2436
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className={cn(cardShell, "p-6 transition-shadow duration-300 hover:shadow-md")}>
                    <div className={cardAccent} aria-hidden />
                    <div className="relative flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-[#2A2F3A]">
                        <MapPin className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#2A2F3A] mb-1">Localisation</h3>
                        <p className="text-[#5C5F66]">Québec</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cn(cardShell, "p-6")}>
                  <div className={cardAccent} aria-hidden />
                  <div className="relative">
                    <h3 className="font-semibold text-[#2A2F3A] mb-4">Heures d&apos;ouverture</h3>
                    <div className="space-y-2 text-sm text-[#5C5F66]">
                      <div className="flex justify-between gap-4">
                        <span>Lundi - Vendredi</span>
                        <span className="font-medium text-[#2A2F3A]">9h00 - 17h00</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Samedi - Dimanche</span>
                        <span className="font-medium text-[#2A2F3A]">Fermé</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className={cn(cardShell, "p-8 lg:p-10")}>
                  <div className={cardAccent} aria-hidden />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                        <MessageSquare className="h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                        Message
                      </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#2A2F3A] mb-2 tracking-tight">
                      Envoyez-nous un message
                    </h2>
                    <p className="text-[#5C5F66] mb-8 leading-relaxed">
                      Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
                    </p>

                    {isSubmitted ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E0742D]/25 bg-[#E0742D]/10">
                          <CheckCircle2 className="h-8 w-8 text-[#E0742D]" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold text-[#2A2F3A]">Message envoyé</h3>
                        <p className="max-w-md text-[#5C5F66]">
                          Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-[#2A2F3A]">
                              Nom complet <span className="text-[#E0742D]">*</span>
                            </Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="h-12 border-slate-200 bg-white/80 pl-10 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                                placeholder="Jean Dupont"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#2A2F3A]">
                              Courriel <span className="text-[#E0742D]">*</span>
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="h-12 border-slate-200 bg-white/80 pl-10 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                                placeholder="jean.dupont@entreprise.com"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="company" className="text-[#2A2F3A]">
                              Entreprise
                            </Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="company"
                                name="company"
                                type="text"
                                value={formData.company}
                                onChange={handleChange}
                                className="h-12 border-slate-200 bg-white/80 pl-10 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                                placeholder="Nom de votre entreprise"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-[#2A2F3A]">
                              Téléphone
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                className="h-12 border-slate-200 bg-white/80 pl-10 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                                placeholder="+1 (450) 822-2436"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-[#2A2F3A]">
                            Sujet <span className="text-[#E0742D]">*</span>
                          </Label>
                          <div className="relative">
                            <select
                              id="subject"
                              name="subject"
                              required
                              value={formData.subject}
                              onChange={handleChange}
                              className={cn(subjectSelectClassName, "[&>option]:bg-white")}
                              aria-label="Sujet du message"
                            >
                              <option value="" disabled>
                                Choisir un sujet
                              </option>
                              {SUBJECT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              aria-hidden
                              strokeWidth={2}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-[#2A2F3A]">
                            Message <span className="text-[#E0742D]">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            required
                            value={formData.message}
                            onChange={handleChange}
                            rows={6}
                            className="resize-none border-slate-200 bg-white/80 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                            placeholder="Décrivez votre projet ou vos questions..."
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 w-full bg-[#E0742D] text-base font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition-all duration-200 hover:bg-[#c96526]",
                            isSubmitting && "cursor-not-allowed opacity-50"
                          )}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="mr-2 animate-spin">⏳</span>
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-5 w-5" />
                              Envoyer le message
                            </>
                          )}
                        </Button>

                        <p className="text-center text-xs text-[#5C5F66]/90">
                          En soumettant ce formulaire, vous acceptez que nous traitions vos données personnelles
                          conformément à notre{" "}
                          <a href="/privacy" className="font-semibold text-[#E0742D] hover:underline">
                            politique de confidentialité
                          </a>
                          .
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
