import { DashboardHeader } from "@/components/dashboard-header"
import Link from "next/link"
import { Building2, Users, FileSpreadsheet, ChevronRight } from "lucide-react"

const SETTINGS_CARDS = [
  {
    title: "Gestion des societes",
    description: "Ajoutez, modifiez et gerez vos societes, divisions et sous-divisions",
    href: "/settings/companies",
    icon: Building2,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Gestion des utilisateurs",
    description: "Invitez des membres, gerez les roles et les acces a votre organisation",
    href: "/settings/users",
    icon: Users,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Plan comptable",
    description: "Configurez les correspondances entre vos comptes et les etats financiers",
    href: "/settings/accounting-mapping",
    icon: FileSpreadsheet,
    color: "bg-amber-100 text-amber-600",
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      <main className="max-w-5xl mx-auto py-12 px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Parametres</h1>
          <p className="text-slate-500">
            Gerez les parametres de votre compte et configurez vos preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SETTINGS_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-6 flex flex-col"
            >
              <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h2>
              <p className="text-sm text-slate-500 flex-1 mb-4">{card.description}</p>
              <div className="flex items-center text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
                <span>Configurer</span>
                <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
