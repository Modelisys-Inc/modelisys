"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, Building2, CheckCircle2, ArrowRight, Layers, Target, Sparkles, CheckCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface DemoBookingSectionProps {
  description?: string
  showWaitlistProcess?: boolean
}

export function DemoBookingSection({ description, showWaitlistProcess = false }: DemoBookingSectionProps = {} as DemoBookingSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isHoveredWaitlistCard, setIsHoveredWaitlistCard] = useState(false)
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showPersonalInfo, setShowPersonalInfo] = useState(false)
  const [isChallengesModalOpen, setIsChallengesModalOpen] = useState(false)

  // Available time slots
  const availableTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ]

  // Disable past dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Financial challenges from "Pour qui ?" section
  const financialChallenges = [
    "Informations financières trop tardives",
    "Manque de vision consolidée",
    "Dépendance aux fichiers Excel instables",
    "Risque lié aux employés clés",
    "Incapacité à mesurer la rentabilité",
    "Indicateurs clés absents ou peu fiables",
    "Absence d'analyses financières avancées",
    "Budgets et prévisions rudimentaires",
    "Manque de suivi de la valeur d'entreprise",
    "Historique financier inexploitable",
    "Dépendance excessive aux consultants",
    "Perte de temps à produire des rapports",
    "Détection tardive des anomalies",
    "Communication difficile avec le cabinet comptable",
    "Manque de ressources pour un CFO analytique"
  ]

  const handleChallengeToggle = (challenge: string) => {
    setFormData(prev => ({
      ...prev,
      financialTopics: prev.financialTopics.includes(challenge)
        ? prev.financialTopics.filter(topic => topic !== challenge)
        : [...prev.financialTopics, challenge]
    }))
  }

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
    setFormData({ name: "", email: "", phone: "", company: "", numberOfCompanies: "", financialTopics: [], message: "" })
    
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
                Accéder en priorité au lancement
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                {description || "Découvrez comment Modelisys peut transformer la gestion financière de votre entreprise lors d'une démonstration personnalisée."}
              </p>
            </div>
          </div>
        </div>

        {/* Waitlist Process Section */}
        {showWaitlistProcess && (
          <div
            className={`mb-12 transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Waitlist Process */}
              <div
                onMouseEnter={() => setIsHoveredWaitlistCard(true)}
                onMouseLeave={() => setIsHoveredWaitlistCard(false)}
                className={`
                  relative h-full flex flex-col
                  bg-gradient-to-br from-white to-white
                  rounded-2xl border-2 border-slate-200
                  shadow-sm hover:shadow-xl
                  transition-all duration-500 ease-out
                  overflow-hidden
                  p-8
                  ${
                    isHoveredWaitlistCard
                      ? "scale-[1.015] border-slate-400 shadow-2xl"
                      : "hover:border-slate-300"
                  }
                `}
              >
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Notre processus de liste d'attente</h3>
                
                {/* Process Steps */}
                <div className="mb-8">
                  <div className="space-y-6">
                    {[
                      { step: 1, title: "Réservez un créneau horaire avec notre équipe", icon: CalendarIcon },
                      { step: 2, title: "Discussion et analyse de vos besoins lors d'une démonstration de la plateforme en direct", icon: Target },
                      { step: 3, title: "Structure de tarification personnalisée", icon: Building2 },
                      { step: 4, title: "Inscription sur la liste d'attente", icon: CheckCircle2 },
                    ].map((item, index) => {
                      const Icon = item.icon
                      return (
                        <div key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 pt-2">
                            <div className="flex flex-col gap-1 mb-1">
                              <span className="text-sm font-bold text-slate-900">Étape {item.step}</span>
                              <span className="text-base font-normal text-slate-900">{item.title}</span>
                            </div>
                            {index < 3 && (
                              <div className="flex items-center justify-center w-6 mt-2 mb-2">
                                <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Benefits */}
                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Avantages de l'inscription sur la liste d'attente</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 mb-1">Accès prioritaire pour l'implantation</div>
                        <p className="text-sm text-slate-600">Vous serez parmi les premiers à bénéficier de l'implantation de Modelisys.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 mb-1">Tarif préférentiel</div>
                        <p className="text-sm text-slate-600">Profitez d'un tarif avantageux réservé aux premiers inscrits.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div
                className={`transition-all duration-1000 delay-400 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl p-8 sm:p-10 h-full">
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
                  ) : !showPersonalInfo ? (
                    /* Calendar and Time Selection */
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Sélectionnez une date et une heure</h3>
                        <p className="text-sm text-slate-600">Choisissez un créneau disponible pour votre démonstration</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Date
                          </label>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < today}
                            className="rounded-md border border-slate-200"
                          />
                        </div>

                        {/* Time Slots */}
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Heure
                          </label>
                          {selectedDate ? (
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                              {availableTimeSlots.map((time) => (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => setSelectedTime(time)}
                                  className={`
                                    px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                    ${
                                      selectedTime === time
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }
                                  `}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-slate-200 rounded-lg">
                              <p className="text-sm text-slate-500">Sélectionnez d'abord une date</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedDate && selectedTime && (
                        <div className="pt-4 border-t border-slate-200">
                          <div className="bg-slate-50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-slate-600 mb-1">Créneau sélectionné :</p>
                            <p className="text-base font-semibold text-slate-900">
                              {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à {selectedTime}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => setShowPersonalInfo(true)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-base font-semibold"
                          >
                            Continuer avec mes informations
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Selected Date/Time Display */}
                      <div className="bg-slate-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-600 mb-1">Créneau sélectionné :</p>
                        <p className="text-base font-semibold text-slate-900">
                          {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à {selectedTime}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPersonalInfo(false)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                        >
                          Modifier la date/heure
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Colonne de gauche */}
                        <div className="space-y-6">
                          {/* Nom */}
                          <div className="space-y-2">
                            <label htmlFor="name-waitlist" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Nom complet
                            </label>
                            <Input
                              id="name-waitlist"
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
                            <label htmlFor="email-waitlist" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Email
                            </label>
                            <Input
                              id="email-waitlist"
                              name="email"
                              type="email"
                              required
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="votre@email.com"
                              className="w-full"
                            />
                          </div>

                          {/* Téléphone */}
                          <div className="space-y-2">
                            <label htmlFor="phone-waitlist" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Téléphone
                            </label>
                            <Input
                              id="phone-waitlist"
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
                            <label htmlFor="company-waitlist" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Entreprise
                            </label>
                            <Input
                              id="company-waitlist"
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
                            <label htmlFor="numberOfCompanies-waitlist" className="text-sm font-medium text-slate-700">
                              Nombre de sociétés
                            </label>
                            <Input
                              id="numberOfCompanies-waitlist"
                              name="numberOfCompanies"
                              type="number"
                              min="1"
                              value={formData.numberOfCompanies}
                              onChange={handleChange}
                              placeholder="1"
                              className="w-full"
                            />
                          </div>

                          {/* Défis financiers */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Défis financiers
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsChallengesModalOpen(true)}
                              className="w-full justify-start text-left font-normal"
                            >
                              {formData.financialTopics.length > 0 
                                ? `${formData.financialTopics.length} défi${formData.financialTopics.length > 1 ? 's' : ''} sélectionné${formData.financialTopics.length > 1 ? 's' : ''}`
                                : "Sélectionnez vos défis financiers"}
                              <ArrowRight className="ml-auto w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <label htmlFor="message-waitlist" className="text-sm font-medium text-slate-700">
                          Message (optionnel)
                        </label>
                        <Textarea
                          id="message-waitlist"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Dites-nous en plus sur vos besoins..."
                          className="min-h-[100px]"
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
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Process Steps */}
          {!showWaitlistProcess && (
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
          )}

          {/* Right Column - Form */}
          {!showWaitlistProcess && (
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
                ) : !showPersonalInfo ? (
                  /* Calendar and Time Selection */
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Sélectionnez une date et une heure</h3>
                      <p className="text-sm text-slate-600">Choisissez un créneau disponible pour votre démonstration</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Calendar */}
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          Date
                        </label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < today}
                          className="rounded-md border border-slate-200"
                        />
                      </div>

                      {/* Time Slots */}
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-3 block flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Heure
                        </label>
                        {selectedDate ? (
                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                            {availableTimeSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setSelectedTime(time)}
                                className={`
                                  px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                  ${
                                    selectedTime === time
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }
                                `}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-500">Sélectionnez d'abord une date</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedDate && selectedTime && (
                      <div className="pt-4 border-t border-slate-200">
                        <div className="bg-slate-50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-slate-600 mb-1">Créneau sélectionné :</p>
                          <p className="text-base font-semibold text-slate-900">
                            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à {selectedTime}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setShowPersonalInfo(true)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-base font-semibold"
                        >
                          Continuer avec mes informations
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selected Date/Time Display */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                      <p className="text-sm text-slate-600 mb-1">Créneau sélectionné :</p>
                      <p className="text-base font-semibold text-slate-900">
                        {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} à {selectedTime}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPersonalInfo(false)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                      >
                        Modifier la date/heure
                      </button>
                    </div>
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

                        {/* Défis financiers */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Défis financiers
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsChallengesModalOpen(true)}
                            className="w-full justify-start text-left font-normal"
                          >
                            {formData.financialTopics.length > 0 
                              ? `${formData.financialTopics.length} défi${formData.financialTopics.length > 1 ? 's' : ''} sélectionné${formData.financialTopics.length > 1 ? 's' : ''}`
                              : "Sélectionnez vos défis financiers"}
                            <ArrowRight className="ml-auto w-4 h-4" />
                          </Button>
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
          )}
        </div>
      </div>

      {/* Challenges Modal */}
      <Dialog open={isChallengesModalOpen} onOpenChange={setIsChallengesModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Défis financiers</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs défis financiers que vous rencontrez dans votre entreprise.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {financialChallenges.map((challenge) => (
              <label
                key={challenge}
                className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={formData.financialTopics.includes(challenge)}
                  onChange={() => handleChallengeToggle(challenge)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700 leading-relaxed flex-1">{challenge}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChallengesModalOpen(false)}
            >
              Fermer
            </Button>
            <Button
              onClick={() => setIsChallengesModalOpen(false)}
            >
              Valider ({formData.financialTopics.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
