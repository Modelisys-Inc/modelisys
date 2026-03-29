import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { BookOpen, Calculator, FileText, HelpCircle, CheckCircle2, ArrowRight, Download } from "lucide-react"
import Link from "next/link"

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Ressources"
        description="Documentation, guides et ressources pour utiliser la plateforme"
      />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Guide de démarrage */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Guide de démarrage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Suivez ces étapes pour configurer votre environnement et commencer votre analyse financière.
              </p>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <Link
                      href="/settings"
                      className="font-medium text-foreground hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5"
                    >
                      Créer une entreprise
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Configurez votre première entreprise avec ses informations de base.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Importer la balance de vérification</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Importez vos données comptables depuis un fichier CSV ou Excel.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Configurer les correspondances de comptes</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Associez vos comptes de la balance de vérification aux catégories financières.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Définir les structures des états financiers</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Personnalisez la structure de vos états financiers selon vos besoins.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground">Consulter les états financiers</p>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Visualisez et analysez vos états financiers générés automatiquement.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Méthodologies d'évaluation */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Méthodologies d&apos;évaluation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Aperçu des méthodes d&apos;évaluation disponibles dans la plateforme.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Multiple du BAIIA</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Évaluation basée sur un multiple appliqué au bénéfice avant intérêts, impôts et amortissements.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    Valeur = BAIIA &times; Multiple
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Actif Corporel Net</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Évaluation basée sur la valeur comptable des actifs nets tangibles.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    Valeur = Actifs - Passifs (valeur comptable)
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">DCF (Flux de trésorerie actualisés)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Actualisation des flux de trésorerie futurs à un taux de rendement requis.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    {"Valeur = \u03A3 FCF/(1+r)^t"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">CCF (Capitalisation des flux)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Capitalisation d&apos;un flux de trésorerie normalisé à un taux de capitalisation.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    Valeur = Flux normalisé / Taux de capitalisation
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
                  <h4 className="font-semibold text-foreground mb-1">VCA (Valeur Comptable Ajustée)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ajustement de la valeur comptable des actifs et passifs à leur juste valeur marchande.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    Valeur comptable ajustée à la JVM
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formats d'importation */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-600" />
                </div>
                <CardTitle className="text-xl">Formats d&apos;importation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Formats acceptés pour l&apos;importation de vos données dans la plateforme.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Balance de vérification</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Fichier Excel (.xlsx) avec les colonnes : numéro de compte, description et montants mensuels.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    .xlsx | Paramètres &gt; Entreprise &gt; Balance
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Structures des états financiers</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Fichier CSV avec les colonnes : Nom de compte, Catégorie, Type, Classement, LinkCode.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    .csv | États financiers &gt; Importer CSV
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Codes de liaison</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Fichier Excel (.xlsx) avec les correspondances entre comptes GL et codes de liaison.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    .xlsx | Paramètres &gt; Mapping ÉF
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-foreground mb-1">Taux de change</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Saisie manuelle des taux mensuels par devise dans la section Taux de change.
                  </p>
                  <p className="text-xs font-mono bg-slate-50 rounded px-2 py-1 text-slate-600 inline-block">
                    Saisie manuelle | Taux de change
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-xl">FAQ</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Réponses aux questions les plus fréquemment posées.
              </p>
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <h4 className="font-semibold text-foreground mb-2">
                    Comment importer ma balance de vérification?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Allez dans Paramètres &gt; Entreprise &gt; Balance de vérification et utilisez le bouton d&apos;import.
                  </p>
                </div>
                <div className="border-b border-slate-100 pb-5">
                  <h4 className="font-semibold text-foreground mb-2">
                    Comment configurer les structures des états financiers?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Dans Paramètres &gt; Entreprise &gt; États financiers, définissez la structure pour chaque type d&apos;état.
                  </p>
                </div>
                <div className="border-b border-slate-100 pb-5">
                  <h4 className="font-semibold text-foreground mb-2">
                    Comment ajouter des divisions?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Dans Paramètres &gt; Entreprise, ajoutez des divisions et sous-divisions pour segmenter votre analyse.
                  </p>
                </div>
                <div className="pb-1">
                  <h4 className="font-semibold text-foreground mb-2">
                    Que sont les codes de liaison?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Les codes de liaison relient les comptes de la balance de vérification aux lignes des états financiers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
