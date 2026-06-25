"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import Link from "next/link"
import { Building2, Users, FileSpreadsheet, BookMarked, GitMerge, ChevronRight, ShieldCheck, Briefcase } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

type SettingsCard = {
  title: string
  description: string
  href: string
  icon: typeof Building2
  color: string
}

const SETTINGS_CARDS: SettingsCard[] = [
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

// Visible only to platform superadmins.
const SUPERADMIN_CARDS: SettingsCard[] = [
  {
    title: "Gestion des clients",
    description: "Creez des clients (organisations) et activez/desactivez leurs fonctionnalites",
    href: "/settings/clients",
    icon: Briefcase,
    color: "bg-cyan-100 text-cyan-600",
  },
  {
    title: "Charte de comptes globale",
    description: "Ajoutez, modifiez et depreciez les codes de liaison partages par toutes les societes",
    href: "/settings/standard-codes",
    icon: BookMarked,
    color: "bg-violet-100 text-violet-600",
  },
  {
    title: "Promotion des codes",
    description: "Revisez et promouvez les codes personnalises des societes vers la charte globale",
    href: "/settings/coa-promotion",
    icon: GitMerge,
    color: "bg-rose-100 text-rose-600",
  },
]

function Cards({ cards }: { cards: SettingsCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
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
  )
}

export default function SettingsPage() {
  const { isSuperadmin } = usePermissions()

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

        <Cards cards={SETTINGS_CARDS} />

        {isSuperadmin && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-slate-900">Super-administration</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                Plateforme
              </span>
            </div>
            <Cards cards={SUPERADMIN_CARDS} />
          </div>
        )}
      </main>
    </div>
  )
}
