"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, CheckCircle2, Sparkles } from "lucide-react"

export function EmailSubscriptionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState("")
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
    
    // Simuler l'envoi
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    setEmail("")
    
    // Réinitialiser après 3 secondes
    setTimeout(() => {
      setIsSubmitted(false)
    }, 3000)
  }

  return (
    <section ref={sectionRef} className="relative pt-8 pb-16 sm:pt-12 sm:pb-24 overflow-hidden">
      {/* Background with depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white"></div>
      
      {/* Decorative elements for depth */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs for depth */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main card with 3D effect */}
          <div className="relative">
            {/* Shadow layers for depth */}
            <div className="absolute inset-0 bg-slate-200/50 rounded-2xl blur-xl transform translate-y-4"></div>
            <div className="absolute inset-0 bg-slate-300/30 rounded-2xl blur-lg transform translate-y-2"></div>
            
            {/* Main card */}
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-2xl overflow-hidden">
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-white pointer-events-none"></div>
              
              {/* Content */}
              <div className="relative px-8 sm:px-12 lg:px-16 py-12 sm:py-16">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Restez à l'affût</span>
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                    Inscrivez votre courriel pour{" "}
                    <span className="text-slate-600">rester informé</span>
                  </h3>
                  
                  <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                    Soyez parmi les premiers informés des nouveautés, des opportunités et des développements de Modelisys.
                  </p>

                  {/* Email Form */}
                  {isSubmitted ? (
                    <div className="mt-6 py-4">
                      <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-base font-medium">Merci pour votre inscription!</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre@courriel.com"
                          required
                          className="pl-10 h-12 border-slate-300 focus:border-slate-500"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold whitespace-nowrap"
                      >
                        {isSubmitting ? "Inscription..." : "S'inscrire"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

