"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, LogIn } from "lucide-react"
import { login } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password)
      router.push("/dashboard")
    } catch {
      setError("Email ou mot de passe incorrect")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Branding */}
          <div className="space-y-8">
            {/* Company Name */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
                Modelisys
              </h1>
              <p className="text-base sm:text-lg text-slate-400 font-medium">
                Plateforme d'Intelligence Financière
              </p>
            </div>

            {/* Portail Client Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 text-base font-medium">
              <LogIn className="w-5 h-5" />
              <span>Portail client</span>
            </div>

            {/* Description */}
            <div className="space-y-4 pt-4">
              <p className="text-lg text-slate-300 leading-relaxed">
                Accédez à votre espace professionnel pour gérer vos analyses financières, consulter vos tableaux de bord et suivre la performance de votre entreprise en temps réel.
              </p>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="w-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-8 lg:p-10">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Connexion</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Connectez-vous à votre compte
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-900 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 border-2 border-slate-200 focus:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-900 font-medium">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 border-2 border-slate-200 focus:border-slate-800"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-slate-300" />
                    <span className="text-slate-600">Se souvenir de moi</span>
                  </label>
                  <Link href="#" className="text-slate-600 hover:text-slate-900 font-medium">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-slate-800 text-white hover:bg-slate-700 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-600">
                Pas encore de compte ?{" "}
                <Link href="/landing" className="text-slate-900 font-semibold hover:underline">
                  Contactez-nous
                </Link>
              </div>
            </div>

            {/* Back to landing */}
            <div className="mt-8 text-center">
              <Link
                href="/landing"
                className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
