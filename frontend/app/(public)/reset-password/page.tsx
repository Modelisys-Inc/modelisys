"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Lien de réinitialisation invalide ou expiré.")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }

    setIsLoading(true)

    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      setIsSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-8 lg:p-10">
      {isSuccess ? (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Mot de passe réinitialisé</h2>
            <p className="text-slate-600 mt-2">
              Votre mot de passe a été mis à jour. Redirection vers la page de connexion...
            </p>
          </div>
        </div>
      ) : !token ? (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Lien invalide</h2>
            <p className="text-slate-600 mt-2">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"
          >
            Demander un nouveau lien
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <Lock className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Nouveau mot de passe
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Choisissez un nouveau mot de passe sécurisé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-900 font-medium">
                Nouveau mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-12 border-2 border-slate-200 focus:border-slate-800"
              />
              <p className="text-xs text-slate-500">
                Minimum 8 caractères, avec majuscule, minuscule et chiffre
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-900 font-medium">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full h-12 border-2 border-slate-200 focus:border-slate-800"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-slate-800 text-white hover:bg-slate-700 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-2xl p-8 lg:p-10">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Suspense fallback={<LoadingFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
