"use client"

import { useState } from "react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SUBJECT_OPTIONS = [
  "Accompagnement financier fractionnaire",
  "Prendre rendez-vous",
  "Demande de partenariat",
  "Autre",
] as const

const fieldClass =
  "h-12 border-[#2A2F3A]/15 bg-white shadow-none focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

const subjectSelectClassName =
  "flex h-12 w-full cursor-pointer appearance-none rounded-md border border-[#2A2F3A]/15 bg-white px-3 py-2 pr-10 text-sm text-[#2A2F3A] shadow-none outline-none transition-[color,box-shadow] focus-visible:border-[#E0742D]/80 focus-visible:ring-[3px] focus-visible:ring-[#E0742D]/25 disabled:cursor-not-allowed disabled:opacity-50"

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#222732]">
      <GlassmorphismNav />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[#222732]">
            <div
              className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
              aria-hidden
              style={{
                background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
                filter: "blur(36px)",
              }}
            />
            <div
              className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
                filter: "blur(22px)",
              }}
            />
            <div
              className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
              aria-hidden
              style={{
                background:
                  "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
                filter: "blur(18px)",
              }}
            />
          </div>
          <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28 xl:px-16 2xl:px-20">
            <p className="text-sm text-[#C9B8A5]/75">Contact</p>
            <h1 className="mt-6 max-w-3xl text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:text-[2.15rem] lg:text-[2.35rem] xl:text-[2.5rem]">
              Parlons de votre projet
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
              Notre équipe est prête à vous accompagner dans la transformation de votre analyse financière.
              Discutons de vos besoins et voyons comment Modelisys peut répondre à vos enjeux.
            </p>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24 xl:px-16 2xl:px-20">
          <div className="mx-auto grid max-w-[1920px] gap-16 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                Informations de contact
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-[1.75] text-[#5C5F66]">
                N&apos;hésitez pas à nous écrire pour toute question ou demande d&apos;information. Nous vous
                répondrons dans les plus brefs délais.
              </p>

              <dl className="mt-10 border-t border-[#2A2F3A]/15">
                <div className="border-b border-[#2A2F3A]/15 py-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Email</dt>
                  <dd className="mt-2">
                    <a href="mailto:contact@modelisys.com" className="text-[#2A2F3A] transition hover:text-[#E0742D]">
                      contact@modelisys.com
                    </a>
                  </dd>
                </div>
                <div className="border-b border-[#2A2F3A]/15 py-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Téléphone</dt>
                  <dd className="mt-2">
                    <a href="tel:+14508222436" className="text-[#2A2F3A] transition hover:text-[#E0742D]">
                      +1 (450) 822-2436
                    </a>
                  </dd>
                </div>
                <div className="border-b border-[#2A2F3A]/15 py-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Localisation</dt>
                  <dd className="mt-2 text-[#2A2F3A]">Québec</dd>
                </div>
                <div className="border-b border-[#2A2F3A]/15 py-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Heures d&apos;ouverture
                  </dt>
                  <dd className="mt-3 space-y-2 text-sm text-[#5C5F66]">
                    <div className="flex justify-between gap-4">
                      <span>Lundi - Vendredi</span>
                      <span className="font-medium text-[#2A2F3A]">9h00 - 17h00</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Samedi - Dimanche</span>
                      <span className="font-medium text-[#2A2F3A]">Fermé</span>
                    </div>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-[#2A2F3A]/15 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                Envoyez-nous un message
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">
                Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
              </p>

              {isSubmitted ? (
                <div className="mt-10 flex items-start gap-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#E0742D]" />
                  <div>
                    <p className="font-medium text-[#2A2F3A]">Message envoyé</p>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-[#5C5F66]">
                      Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#2A2F3A]">
                        Nom complet <span className="text-[#E0742D]">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className={fieldClass}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#2A2F3A]">
                        Courriel <span className="text-[#E0742D]">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={fieldClass}
                        placeholder="jean.dupont@entreprise.com"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-[#2A2F3A]">
                        Entreprise
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleChange}
                        className={fieldClass}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[#2A2F3A]">
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className={fieldClass}
                        placeholder="+1 (450) 822-2436"
                      />
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
                      className={cn("resize-none", fieldClass)}
                      placeholder="Décrivez votre projet ou vos questions..."
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
                    {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                  </Button>

                  <p className="max-w-xl text-xs leading-relaxed text-[#5C5F66]">
                    En soumettant ce formulaire, vous acceptez que nous traitions vos données personnelles
                    conformément à notre{" "}
                    <a href="/privacy" className="text-[#2A2F3A] underline decoration-[#E0742D]/80 underline-offset-4">
                      politique de confidentialité
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
