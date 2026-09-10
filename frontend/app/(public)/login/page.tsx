"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
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
      router.push("/mon-portail")
    } catch {
      setError("Email ou mot de passe incorrect")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden">
      {/* Même scène continue que le hero */}
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute inset-0 opacity-[0.4]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
          }}
        />
        <div className="absolute -top-32 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
        <div className="absolute top-1/3 right-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12 xl:gap-14">
          {/* Colonne marque — ton hero */}
          <div className="max-w-md">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
              Accès sécurisé
            </p>

            <div className="relative mt-7 sm:mt-8">
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 -left-2 select-none text-[clamp(6.5rem,28vw,12rem)] font-semibold leading-none tracking-tight text-white/[0.04] sm:-left-3"
              >
                m<span className="text-[#E0742D]/30">.</span>
              </div>
              <h1 className="relative z-10 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-[#E6D6C3] sm:text-[3rem] xl:text-[3.25rem]">
                modelisys<span className="text-[#E0742D]">.</span>
              </h1>
            </div>

            <p className="mt-4 text-sm font-medium tracking-wide text-[#C9B8A5]/85 sm:text-base">
              Mon Portail
            </p>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Un seul espace pour lire la valeur de votre entreprise — et les
              leviers qui la font monter.
            </p>

            <div className="mt-10 sm:mt-12">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                <ArrowRight className="h-4 w-4 rotate-180 shrink-0" />
                RETOUR À L&apos;ACCUEIL
                <span className="inline-block h-px w-8 bg-[#E0742D]/90" />
              </Link>
            </div>
          </div>

          {/* Formulaire — sobre, sans carte « wow » */}
          <div className="w-full max-w-md lg:max-w-none">
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-8 rounded-full bg-[#E6D6C3]/[0.04] blur-3xl"
                aria-hidden
              />

              <div className="relative border border-white/[0.08] bg-[#1a1f2a]/60 px-6 py-8 backdrop-blur-sm sm:px-8 sm:py-10">
                <div className="border-b border-white/[0.06] pb-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
                    Connexion
                  </p>
                  <p className="mt-3 text-xl font-semibold tracking-tight text-[#E6D6C3] sm:text-2xl">
                    Identifiants professionnels
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  {error && (
                    <div className="border border-red-400/25 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#C9B8A5]/80"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@entreprise.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-md border-white/10 bg-white/[0.04] text-[14px] text-[#E6D6C3] placeholder:text-[#C9B8A5]/40 focus-visible:border-[#E6D6C3]/40 focus-visible:ring-[#E6D6C3]/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#C9B8A5]/80"
                    >
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-md border-white/10 bg-white/[0.04] text-[14px] text-[#E6D6C3] placeholder:text-[#C9B8A5]/40 focus-visible:border-[#E6D6C3]/40 focus-visible:ring-[#E6D6C3]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-3 text-[12px] sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[#C9B8A5]/80">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] text-[#E0742D] focus:ring-[#E0742D]/40"
                      />
                      <span>Se souvenir de moi</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold tracking-[0.06em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3]"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "Connexion…" : "Se connecter"}
                    {!isLoading && (
                      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-[12px] text-[#C9B8A5]/70">
                  Pas encore de compte ?{" "}
                  <Link
                    href="/"
                    className="font-semibold tracking-wide text-[#E6D6C3] transition hover:text-[#f0e6d8]"
                  >
                    Contactez-nous
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
