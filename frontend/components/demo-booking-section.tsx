"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, User, Mail, Phone, Building2, CheckCircle2, ArrowRight, Layers, Target, Sparkles } from "lucide-react"

export function DemoBookingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    numberOfCompanies: "",
    numberOfDivisions: "",
    financialTopics: [] as string[],
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simuler l'envoi du formulaire
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    setFormData({ name: "", email: "", phone: "", company: "", numberOfCompanies: "", numberOfDivisions: "", financialTopics: [], message: "" })
    
    // Réinitialiser après 5 secondes
    setTimeout(() => {
      setIsSubmitted(false)
    }, 5000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleTopicToggle = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      financialTopics: prev.financialTopics.includes(topicId)
        ? prev.financialTopics.filter(id => id !== topicId)
        : [...prev.financialTopics, topicId]
    }))
  }

  return (
    <section ref={sectionRef} id="demo" className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-start justify-between gap-8 mb-6">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
                Réservez une{" "}
                <span className="text-slate-600">démonstration</span>
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                Découvrez comment Modelisys peut transformer la gestion financière de votre entreprise lors d'une démonstration personnalisée.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Process Steps */}
          <div className="lg:col-span-1">
            <div
              className={`transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
            >
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all duration-300 h-full">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Comment ça fonctionne</span>
                </div>
                
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Réservez votre démo
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Remplissez le formulaire pour planifier une rencontre avec l'un de nos experts.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Rencontre et démonstration
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Découvrez la plateforme en action lors d'une démonstration personnalisée et d'une analyse de vos besoins.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Structure de tarification
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Découvrez notre approche de tarification en 2 volets adaptée à vos besoins.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Implantation
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Configuration, migration des données et formation de votre équipe.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">Démo personnalisée</h5>
                      <p className="text-xs text-slate-600">Adaptée à vos besoins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">Expert dédié</h5>
                      <p className="text-xs text-slate-600">Accompagnement spécialisé</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">Sans engagement</h5>
                      <p className="text-xs text-slate-600">Découvrez sans pression</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-2">
            <div
              className={`transition-all duration-1000 delay-400 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl p-8 sm:p-10">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Demande envoyée avec succès!</h3>
                    <p className="text-slate-600">
                      Nous vous contacterons sous peu pour planifier votre démonstration.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Colonne de gauche */}
                      <div className="space-y-6">
                        {/* Nom */}
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nom complet
                          </label>
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Votre nom"
                            className="w-full"
                          />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Courriel
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="votre@courriel.com"
                            className="w-full"
                          />
                        </div>

                        {/* Téléphone */}
                        <div className="space-y-2">
                          <label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Téléphone
                          </label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="(555) 123-4567"
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Colonne de droite */}
                      <div className="space-y-6">
                        {/* Entreprise */}
                        <div className="space-y-2">
                          <label htmlFor="company" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Entreprise
                          </label>
                          <Input
                            id="company"
                            name="company"
                            type="text"
                            required
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Nom de votre entreprise"
                            className="w-full"
                          />
                        </div>

                        {/* Nombre de sociétés */}
                        <div className="space-y-2">
                          <label htmlFor="numberOfCompanies" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Nombre de sociétés
                          </label>
                          <Input
                            id="numberOfCompanies"
                            name="numberOfCompanies"
                            type="text"
                            value={formData.numberOfCompanies}
                            onChange={handleChange}
                            placeholder="Ex: 2"
                            className="w-full"
                          />
                        </div>

                        {/* Nombre de divisions */}
                        <div className="space-y-2">
                          <label htmlFor="numberOfDivisions" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Nombre de divisions
                          </label>
                          <Input
                            id="numberOfDivisions"
                            name="numberOfDivisions"
                            type="text"
                            value={formData.numberOfDivisions}
                            onChange={handleChange}
                            placeholder="Ex: 3"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sujets financiers à améliorer */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Quels sont vos défis financiers?
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        {[
                          { id: "informations-tardives", label: "Informations financières trop tardives" },
                          { id: "vision-consolidee", label: "Manque de vision consolidée" },
                          { id: "dependance-excel", label: "Dépendance aux fichiers Excel instables" },
                          { id: "mesurer-rentabilite", label: "Incapacité à mesurer la rentabilité" },
                          { id: "budgets-previsions", label: "Budgets et prévisions rudimentaires" },
                          { id: "suivi-valeur", label: "Manque de suivi de la valeur d'entreprise" },
                          { id: "indicateurs-cles", label: "Indicateurs clés absents ou peu fiables" },
                          { id: "dependance-consultants", label: "Dépendance excessive aux consultants" },
                          { id: "perte-temps-rapports", label: "Perte de temps à produire des rapports" },
                          { id: "detection-anomalies", label: "Détection tardive des anomalies" },
                          { id: "communication-cabinet", label: "Communication difficile avec le cabinet comptable" },
                          { id: "ressources-cfo", label: "Manque de ressources pour un CFO analytique" },
                          { id: "historique-inexploitable", label: "Historique financier inexploitable" },
                          { id: "analyses-avancees", label: "Absence d'analyses financières avancées" },
                          { id: "risque-employes-cles", label: "Risque lié aux employés clés" },
                        ].map((topic) => (
                          <label
                            key={topic.id}
                            className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.financialTopics.includes(topic.id)}
                              onChange={() => handleTopicToggle(topic.id)}
                              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500"
                            />
                            <span className="text-sm text-slate-700">{topic.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Message (optionnel)
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Indiquez vos besoins spécifiques ou préférences pour la démonstration..."
                        rows={4}
                        className="w-full resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-base font-semibold"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Envoi en cours...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Réserver ma démonstration
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
