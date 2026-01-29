"use client"

import { useEffect, useRef, useState } from "react"
import { Quote, Star } from "lucide-react"

const testimonials = [
  {
    name: "Marc Dubois",
    role: "CPA, Partenaire",
    company: "Cabinet Dubois & Associés",
    content: "Cette plateforme a transformé notre façon de travailler avec nos clients. Les analyses consolidées en temps réel nous font gagner des dizaines d'heures par mois.",
    rating: 5,
  },
  {
    name: "Sophie Martin",
    role: "CFO",
    company: "TechVentures Inc.",
    content: "Enfin une solution qui répond aux besoins réels des professionnels de la finance. L'interface est intuitive et les analyses sont d'une précision remarquable.",
    rating: 5,
  },
  {
    name: "Jean-Pierre Lavoie",
    role: "Consultant, Analyste financier",
    company: "Lavoie Conseil",
    content: "Les modèles de valorisation intégrés sont exceptionnels. J'économise énormément de temps sur mes mandats de conseil en finance d'entreprise.",
    rating: 5,
  },
  {
    name: "Marie-Claire Tremblay",
    role: "Directrice financière",
    company: "Groupe Premier",
    content: "La consolidation multi-entités en temps réel est un game-changer. Nous avons une visibilité complète sur toute notre organisation instantanément.",
    rating: 5,
  },
  {
    name: "François Bouchard",
    role: "Fondateur & CEO",
    company: "InnovateCorp",
    content: "Les prévisions assistées par IA nous permettent de prendre des décisions stratégiques avec une confiance totale. Un outil indispensable.",
    rating: 5,
  },
  {
    name: "Isabelle Roy",
    role: "Partenaire",
    company: "Cabinet Comptable Roy & Fils",
    content: "Nos clients sont impressionnés par la qualité des analyses que nous pouvons maintenant leur fournir. C'est devenu un avantage concurrentiel majeur.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 relative z-10 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-sm font-medium mb-8">
            <Quote className="w-4 h-4" />
            <span>Élite professionnelle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Ce que disent les{" "}
            <span className="text-slate-700">
              professionnels
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto">
            Analystes financiers, CFO, CPA, partenaires de cabinets, fondateurs.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-white border border-slate-300 rounded-lg p-8 hover:border-slate-400 hover:shadow-lg transition-shadow duration-200"
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
              }}
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                <Quote className="w-5 h-5 text-slate-700" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-slate-700 text-lg leading-relaxed mb-6">{testimonial.content}</p>

              {/* Author */}
              <div className="border-t border-slate-200 pt-6">
                <div className="font-bold text-slate-900">{testimonial.name}</div>
                <div className="text-sm text-slate-600">{testimonial.role}</div>
                <div className="text-sm text-slate-500">{testimonial.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
