"use client"

import { useState } from "react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Send, CheckCircle2, Building2, User } from "lucide-react"
import { cn } from "@/lib/utils"

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

    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitted(true)
    setIsSubmitting(false)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const inputClass =
    "h-12 border-slate-200/90 bg-white shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-[#E0742D]/25"

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">
      <GlassmorphismNav />

      <main className="relative z-10">
        {/* Hero : fond jusqu’au menu (pas d’espace slate) ; pt = hauteur approx. du nav fixe */}
        <section className="relative overflow-hidden pt-20 sm:pt-24">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-[1920px] px-8 pb-16 pt-6 sm:px-12 sm:pb-20 sm:pt-8 lg:px-16 lg:pb-24 lg:pt-10 xl:px-20">
            <p className="text-sm font-semibold tracking-wide text-slate-200">Contact</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[0.95] tracking-tight text-[#E6D6C3] sm:text-5xl md:text-6xl">
              Parlons de
              <br />
              <span className="text-[#C9B8A5]/90">votre projet</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              Notre équipe est prête à vous accompagner dans la transformation de votre analyse financière. Discutons de
              vos besoins et découvrons comment Modelisys peut répondre à vos défis.
            </p>
            <div className="mt-10 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
          </div>
        </section>

        {/* Transition courbe — même path que sous le hero-marquee (landing) ; enchaîne vers la section claire */}
        <section aria-hidden className="relative h-20 overflow-hidden sm:h-24">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-full w-full"
          >
            <path
              d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
              fill="#f2f6fa"
            />
          </svg>
        </section>

        {/* Contenu — fond type « Mise en place » */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-100/80 via-slate-50/95 to-white py-16 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: `radial-gradient(circle at 85% 15%, rgb(224 116 45 / 0.06) 0%, transparent 45%),
                  radial-gradient(circle at 15% 85%, rgb(148 163 184 / 0.12) 0%, transparent 48%)`,
              }}
            />
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
          </div>

          <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
            <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Colonne infos — cadrillage léger (même esprit que la grille de la section) */}
              <div className="relative lg:col-span-4">
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] opacity-[0.55]"
                  aria-hidden
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgb(148 163 184 / 0.09) 1px, transparent 1px),
                      linear-gradient(to bottom, rgb(148 163 184 / 0.09) 1px, transparent 1px)
                    `,
                    backgroundSize: "44px 44px",
                    maskImage:
                      "radial-gradient(ellipse 95% 85% at 15% 25%, black 18%, transparent 68%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse 95% 85% at 15% 25%, black 18%, transparent 68%)",
                  }}
                />
                <div className="relative z-10 space-y-10">
                <div>
                  <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Coordonnées</p>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
                    Informations de <span className="text-[#5C5F66]">contact</span>
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#5C5F66] sm:text-lg">
                    N&apos;hésitez pas à nous écrire ou à nous appeler. Nous vous répondrons dans les plus brefs délais.
                  </p>
                  <div className="mt-6 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: Mail,
                      title: "Courriel",
                      content: (
                        <a href="mailto:contact@modelisys.com" className="text-[#5C5F66] transition hover:text-[#E0742D]">
                          contact@modelisys.com
                        </a>
                      ),
                    },
                    {
                      icon: Phone,
                      title: "Téléphone",
                      content: (
                        <a href="tel:+14508222436" className="text-[#5C5F66] transition hover:text-[#E0742D]">
                          +1 (450) 822-2436
                        </a>
                      ),
                    },
                    {
                      icon: MapPin,
                      title: "Localisation",
                      content: <p className="text-[#5C5F66]">Québec</p>,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 transition hover:shadow-md"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
                      <div className="relative flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-[#E0742D] shadow-sm">
                          <item.icon className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold tracking-tight text-[#2A2F3A]">{item.title}</h3>
                          <div className="mt-1 text-sm sm:text-base">{item.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/95 p-5 sm:p-6">
                  <h3 className="font-semibold tracking-tight text-[#2A2F3A]">Heures d&apos;ouverture</h3>
                  <div className="mt-4 space-y-2 text-sm text-[#5C5F66]">
                    <div className="flex justify-between gap-4 border-b border-slate-200/80 pb-2">
                      <span>Lundi - Vendredi</span>
                      <span className="font-medium text-[#2A2F3A]">9h00 - 17h00</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-1">
                      <span>Samedi - Dimanche</span>
                      <span className="font-medium text-[#2A2F3A]">Fermé</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Formulaire */}
              <div className="lg:col-span-8">
                <div className="relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 sm:p-10 lg:p-12">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
                  <div className="relative">
                    <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Message</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-3xl">
                      Envoyez-nous un <span className="text-[#5C5F66]">message</span>
                    </h2>
                    <p className="mt-4 text-[#5C5F66]">
                      Remplissez le formulaire ci-dessous et nous vous répondrons dans les 24 heures.
                    </p>
                    <div className="mt-6 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />

                    {isSubmitted ? (
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E0742D]/12">
                          <CheckCircle2 className="h-8 w-8 text-[#E0742D]" />
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight text-[#2A2F3A]">Message envoyé !</h3>
                        <p className="mt-2 max-w-md text-[#5C5F66]">
                          Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-[#2A2F3A]">
                              Nom complet <span className="text-red-500">*</span>
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
                                className={cn("pl-10", inputClass)}
                                placeholder="Jean Dupont"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#2A2F3A]">
                              Courriel <span className="text-red-500">*</span>
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
                                className={cn("pl-10", inputClass)}
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
                                className={cn("pl-10", inputClass)}
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
                                className={cn("pl-10", inputClass)}
                                placeholder="+1 (450) 822-2436"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-[#2A2F3A]">
                            Sujet <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="subject"
                            name="subject"
                            type="text"
                            required
                            value={formData.subject}
                            onChange={handleChange}
                            className={inputClass}
                            placeholder="Demande d'information sur vos services"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-[#2A2F3A]">
                            Message <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            required
                            value={formData.message}
                            onChange={handleChange}
                            rows={6}
                            className="resize-none border-slate-200/90 bg-white shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-[#E0742D]/25"
                            placeholder="Décrivez votre projet ou vos questions..."
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className={cn(
                            "h-12 w-full bg-[#E0742D] font-semibold text-white hover:bg-[#c75a26]",
                            isSubmitting && "cursor-not-allowed opacity-60",
                          )}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Envoi en cours...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Send className="h-5 w-5" />
                              Envoyer le message
                            </span>
                          )}
                        </Button>

                        <p className="text-center text-xs text-slate-500">
                          En soumettant ce formulaire, vous acceptez que nous traitions vos données personnelles
                          conformément à notre{" "}
                          <a href="/privacy" className="font-medium text-[#E0742D] underline-offset-2 hover:underline">
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
