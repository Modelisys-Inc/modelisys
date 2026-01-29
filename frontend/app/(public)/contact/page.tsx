"use client"

import { useState } from "react"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Send, CheckCircle2, Building2, User, MessageSquare } from "lucide-react"
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
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    setIsSubmitted(true)
    setIsSubmitting(false)
    
    // Reset form after 3 seconds
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <GlassmorphismNav />
      
      <main className="relative pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white text-sm font-medium mb-6">
                <MessageSquare className="w-4 h-4" />
                <span>Contactez-nous</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6">
                Parlons de votre projet
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Notre équipe est prête à vous accompagner dans la transformation de votre analyse financière. 
                Discutons de vos besoins et découvrons comment Modelisys peut répondre à vos défis.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-8 lg:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Contact Information */}
              <div className="lg:col-span-1 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Informations de contact</h2>
                  <p className="text-slate-600 mb-8">
                    N'hésitez pas à nous contacter pour toute question ou demande d'information. 
                    Nous vous répondrons dans les plus brefs délais.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                      <a 
                        href="mailto:contact@modelisys.com" 
                        className="text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        contact@modelisys.com
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Téléphone</h3>
                      <a 
                        href="tel:+14508222436" 
                        className="text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        +1 (450) 822-2436
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Localisation</h3>
                      <p className="text-slate-600">
                        Québec
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="p-6 bg-slate-100 rounded-xl border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4">Heures d'ouverture</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Lundi - Vendredi</span>
                      <span className="font-medium">9h00 - 17h00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Samedi - Dimanche</span>
                      <span className="font-medium">Fermé</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8 lg:p-10">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Envoyez-nous un message</h2>
                  <p className="text-slate-600 mb-8">
                    Remplissez le formulaire ci-dessous et nous vous répondrons dans les 24 heures.
                  </p>

                  {isSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Message envoyé !</h3>
                      <p className="text-slate-600">
                        Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-slate-700">
                            Nom complet <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              required
                              value={formData.name}
                              onChange={handleChange}
                              className="pl-10 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                              placeholder="Jean Dupont"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-slate-700">
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required
                              value={formData.email}
                              onChange={handleChange}
                              className="pl-10 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                              placeholder="jean.dupont@entreprise.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        {/* Company */}
                        <div className="space-y-2">
                          <Label htmlFor="company" className="text-slate-700">
                            Entreprise
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="company"
                              name="company"
                              type="text"
                              value={formData.company}
                              onChange={handleChange}
                              className="pl-10 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                              placeholder="Nom de votre entreprise"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-slate-700">
                            Téléphone
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              className="pl-10 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                              placeholder="+1 (450) 822-2436"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-slate-700">
                          Sujet <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          type="text"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          className="h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                          placeholder="Demande d'information sur vos services"
                        />
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-slate-700">
                          Message <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={6}
                          className="border-slate-300 focus:border-slate-500 focus:ring-slate-500 resize-none"
                          placeholder="Décrivez votre projet ou vos questions..."
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-all duration-200",
                          isSubmitting && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Envoyer le message
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-slate-500 text-center">
                        En soumettant ce formulaire, vous acceptez que nous traitions vos données personnelles 
                        conformément à notre politique de confidentialité.
                      </p>
                    </form>
                  )}
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

