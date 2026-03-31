import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, PlayCircle, GraduationCap } from "lucide-react"

export default function FormationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#1F2430]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
        </div>

        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Formation</h2>
          <p className="text-base text-[#C9B8A5]/90 max-w-3xl">
            Retrouvez vos contenus de formation pour bien utiliser Modelisys, étape par étape.
          </p>
        </div>
      </div>

      <main className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <GraduationCap className="w-5 h-5 text-[#E0742D]" />
                  Parcours de démarrage
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Une séquence guidée pour configurer votre environnement et démarrer rapidement.
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <PlayCircle className="w-5 h-5 text-[#E0742D]" />
                  Capsules vidéo
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Des tutoriels courts pour maîtriser les sections clés de la plateforme.
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <BookOpen className="w-5 h-5 text-[#E0742D]" />
                  Guides pratiques
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Des guides détaillés sur les bonnes pratiques d’analyse et de configuration.
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
