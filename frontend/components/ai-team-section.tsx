"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, Zap } from "lucide-react"

// Each conversation now shows what users see when they access a specific module
const conversations = [
  {
    title: "Module d'Analyse des Revenus",
    messages: [
      { text: "J'ai besoin de comprendre pourquoi les revenus ont augmenté de 12% cette année", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : Analyse des revenus par ligne de produit, division et client",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Analyse en cours : Produit A +8%, Produit B +15%, Produit C +22%. La division C affiche la plus forte croissance. Concentration clients : Top 3 = 42%.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Il me faut environ 3-5 minutes pour digérer ces insights et tirer des conclusions.",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Analyse terminée : Vous comprenez maintenant les moteurs de revenus, la performance des produits et le mix clients pour des décisions stratégiques.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
  {
    title: "Module d'Analyse des Marges",
    messages: [
      { text: "Besoin d'analyser les marges par ligne de produit", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : Tableau de bord d'analyse des marges - Niveau produit, division et client",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Données affichées : Produit A marge de 28% (1,1M$), Produit B marge de 35% (680K$), Produit C marge de 48% (620K$). Tendance : Produit C croît le plus rapidement à 22% annuellement.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Examen des coûts et identification des opportunités d'optimisation...",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Recommandation visible : Produit C affiche la marge et croissance les plus élevées - opportunité d'expansion identifiée. 5 minutes d'analyse révèlent 200K$ de revenus potentiels.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
  {
    title: "Module de Trésorerie et Fonds de Roulement",
    messages: [
      { text: "Notre position de trésorerie est serrée. Besoin d'enquêter", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : Tableau de bord du fonds de roulement - Prévisions de trésorerie et métriques de jours",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Données visibles : DSO 42 jours (en hausse de 7 jours), DPO 45 jours, Cycle de trésorerie 67 jours. Rapports d'ancienneté montrent 185K$ de créances vieillies de 45+ jours. Comptes fournisseurs étendus.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Analyse des opportunités de recouvrement et optimisation des comptes fournisseurs...",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Clair : Recouvrer les créances vieillies libère 185K$. Étendre les comptes fournisseurs libère 120K$. Optimisation rapide totale : amélioration de trésorerie de 305K$ identifiée en quelques minutes.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
  {
    title: "Module de Consolidation Multi-Divisions",
    messages: [
      { text: "Besoin d'une vue consolidée de toutes les divisions pour la réunion du conseil", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : États financiers consolidés - Résultats, Bilan, Flux de trésorerie",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Données affichées : Division A 820K$ de trésorerie, Division B 685K$, Division C 595K$. Total consolidé : 2,1M$. Toutes les éliminations inter-sociétés réconciliées automatiquement.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Révision de la consolidation pour précision et collecte d'insights...",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Prêt pour le conseil : Bilan consolidé, résultats par division, éliminations documentées. Ce qui prenait 3 jours prend maintenant 15 minutes. Niveau de confiance : 100%.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
  {
    title: "Module de Concentration Clients et Fournisseurs",
    messages: [
      { text: "Besoin d'évaluer les risques de concentration de l'entreprise", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : Analyse clients et fournisseurs - Concentration, mix de revenus, évaluation des risques",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Données clients : Top 3 = 42% des revenus. Données fournisseurs : Top 5 = 68% des dépenses. Fournisseur 1 = risque de dépendance de 22% identifié. Graphiques de concentration visuels disponibles.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Analyse du profil de risque et implications stratégiques...",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Insights clairs : Concentration clients modérée (diversifier Top 3 de 42% à 35%). Risque fournisseur élevé (réduire Fournisseur 1 de 22% à 15%). Actionnable en 5 minutes d'analyse.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
  {
    title: "Module de Projection 5 Ans et Valorisation",
    messages: [
      { text: "Construction d'une prévision sur 5 ans pour évaluation M&A", sender: "customer", delay: 0 },
      {
        text: "✓ Module ouvert : Projections financières et valorisation d'entreprise - 3 scénarios, analyse de sensibilité",
        sender: "ai",
        delay: 1000,
      },
      {
        text: "Scénarios créés : Conservateur 6% de croissance, Base 10%, Optimiste 15%. Projections Capex : 50K$ A1 à 75K$ A5. TRI : 22%. Autofinancé sans financement externe.",
        sender: "ai",
        delay: 2500,
      },
      {
        text: "Ajustement des hypothèses et révision des multiples de valorisation...",
        sender: "customer",
        delay: 4000,
      },
      {
        text: "✓ Valorisation terminée : Fourchettes de valeur d'entreprise affichées. Plusieurs scénarios prêts. Ce qui prend typiquement 2 semaines est prêt en 30 minutes. Prêt pour M&A avec modèle financier complet.",
        sender: "ai",
        delay: 5500,
      },
    ],
  },
]

export function AITeamSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentConversation, setCurrentConversation] = useState(0)
  const [displayedMessages, setDisplayedMessages] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [displayedMessages, isTyping])

  useEffect(() => {
    const conversation = conversations[currentConversation]
    setDisplayedMessages([])
    setIsTyping(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    let messageIndex = 0

    const showNextMessage = () => {
      if (messageIndex >= conversation.messages.length) {
        timeoutRef.current = setTimeout(() => {
          setCurrentConversation((prev) => (prev + 1) % conversations.length)
        }, 3000)
        return
      }

      const message = conversation.messages[messageIndex]

      timeoutRef.current = setTimeout(() => {
        if (message.sender === "ai") {
          setIsTyping(true)
          timeoutRef.current = setTimeout(() => {
            setDisplayedMessages((prev) => [...prev, message])
            setIsTyping(false)
            messageIndex++
            showNextMessage()
          }, 800)
        } else {
          setDisplayedMessages((prev) => [...prev, message])
          messageIndex++
          showNextMessage()
        }
      }, message.delay)
    }

    showNextMessage()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentConversation])

  return (
    <section id="ai-team" ref={sectionRef} className="scroll-mt-24 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-32 lg:mb-40">
            <h2
              className={`text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Analyses financières{" "}
              <span className="text-slate-700">
                prêtes à l'emploi
              </span>
            </h2>

            <p
              className={`text-base sm:text-lg text-slate-600 max-w-4xl mx-auto mb-12 lg:mb-16 transition-all duration-1000 delay-400 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Des modules d'analyse financière pré-configurés et opérationnels dès la première utilisation. Accédez instantanément à des analyses professionnelles qui prenaient des jours à produire manuellement.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-28 mt-16 lg:mt-24">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center lg:h-[600px] space-y-6 lg:space-y-8 order-2 lg:order-1">
              <div
                className={`transition-all duration-1000 delay-600 ${
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                }`}
              >
                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
                  Efficacité opérationnelle{" "}
                  <span className="text-slate-700">
                    pour les professionnels
                  </span>
                </h3>

                <div className="space-y-5 lg:space-y-6 text-base lg:text-lg text-slate-700 leading-relaxed">
                  <p>
                    Chaque module est conçu pour répondre aux besoins spécifiques des PME. Les analyses sont pré-configurées selon les meilleures pratiques financières, éliminant le temps de configuration initiale.
                  </p>

                  <p>
                    Vos données comptables se synchronisent automatiquement. Les analyses se génèrent en temps réel, transformant des processus qui prenaient des jours en opérations de quelques minutes. Votre équipe se concentre sur l'interprétation et les décisions stratégiques.
                  </p>

                  {/* Separator line */}
                  <div className="h-px bg-slate-300 my-6"></div>
                  
                  {/* Phrase */}
                  <p className="text-xl lg:text-2xl font-bold text-slate-900 pt-4">
                    Des outils professionnels{" "}
                    <span className="text-slate-700">à votre portée</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Right side - Phone mockup */}
            <div className="w-full lg:w-1/2 flex justify-center order-1 lg:order-2">
              <div className="max-w-md w-full">
                <div
                  className={`relative transition-all duration-1000 delay-600 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                >
                  <div className="relative bg-slate-800 rounded-[2.5rem] p-2 shadow-xl border border-slate-700/50">
                    <div className="bg-black rounded-[2rem] p-1">
                      <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-xl">
                        {/* Status bar */}
                        <div className="bg-slate-50 px-6 py-3 flex justify-between items-center text-sm border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                            <span className="font-medium text-slate-800">Modules financiers</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-medium">En direct</span>
                          </div>
                        </div>

                        <div className="bg-slate-800 px-6 py-4 text-white">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src="/images/michael-ai-agent.jpg"
                                alt="Financial Platform"
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/50 flex-shrink-0"
                              />
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-500 rounded-full border border-white"></div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-sm">Plateforme d'Intelligence Financière</h3>
                              <p className="text-xs text-slate-300">Analyses pré-construites prêtes</p>
                            </div>
                            <div className="text-xs text-white bg-slate-700/50 px-2 py-1 rounded-md border border-slate-600/50 flex items-center gap-1">
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="font-medium">En direct</span>
                            </div>
                          </div>
                        </div>

                        {/* Chat messages */}
                        <div
                          ref={chatContainerRef}
                          className="h-96 overflow-y-scroll scrollbar-hide p-4 space-y-3 bg-white"
                          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                          {displayedMessages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}
                            >
                              {message.sender === "ai" && (
                                <div className="relative mr-2 mt-1 flex-shrink-0">
                                  <img
                                    src="/images/michael-ai-agent.jpg"
                                    alt="Platform"
                                    className="w-7 h-7 rounded-full object-cover border border-slate-300"
                                  />
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full border border-white"></div>
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] p-4 rounded-lg text-sm leading-relaxed ${
                                  message.sender === "customer"
                                    ? "bg-slate-800 text-white rounded-br-md shadow-md border border-slate-700/50"
                                    : "bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-md"
                                }`}
                              >
                                {message.text.split("\n").map((line: string, i: number) => (
                                  <div key={i} className={message.sender === "ai" && line.includes("✓") ? "text-slate-700 font-semibold" : ""}>{line}</div>
                                ))}
                              </div>
                              {message.sender === "customer" && (
                                <div className="w-7 h-7 rounded-full bg-slate-800 ml-2 mt-1 flex-shrink-0 flex items-center justify-center text-xs text-white font-semibold border border-slate-700 shadow-md">
                                  C
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Typing indicator */}
                          {isTyping && (
                            <div className="flex justify-start items-start">
                              <div className="relative mr-2 mt-1 flex-shrink-0">
                                <img
                                  src="/images/michael-ai-agent.jpg"
                                  alt="Platform"
                                  className="w-7 h-7 rounded-full object-cover border border-slate-300"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-500 rounded-full border border-white"></div>
                              </div>
                              <div className="bg-white p-4 rounded-lg rounded-bl-md shadow-sm border border-slate-200">
                                <div className="flex space-x-1.5">
                                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200">
                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-300 shadow-sm">
                            <span className="text-slate-700 text-sm lg:text-base flex-1 font-medium">
                              Cliquez sur un module pour analyser...
                            </span>
                            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shadow-md border border-slate-700">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
