"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { useUser } from "@/hooks/use-user"
import { useOrgMembers } from "@/hooks/use-org-members"
import { listCompanies, type Company, type OrgMember } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Users, UserPlus, Shield, Eye, User, Trash2, SlidersHorizontal } from "lucide-react"

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Admin", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Shield },
  member: { label: "Membre", color: "bg-blue-100 text-blue-800 border-blue-200", icon: User },
  viewer: { label: "Lecteur", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Eye },
}

function MemberAccessDialog({
  member,
  companies,
  onSetAllCompanies,
  onSetCompanies,
}: {
  member: OrgMember
  companies: Company[]
  onSetAllCompanies: (userId: string, all: boolean) => Promise<unknown>
  onSetCompanies: (userId: string, companyIds: string[]) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(member.all_companies)
  const [selected, setSelected] = useState<string[]>(member.company_ids)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setAll(member.all_companies)
      setSelected(member.company_ids)
    }
  }, [open, member.all_companies, member.company_ids])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const save = async () => {
    setSaving(true)
    try {
      await onSetAllCompanies(member.id, all)
      if (!all) await onSetCompanies(member.id, selected)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-slate-500 hover:text-emerald-700"
          aria-label={`Gérer l'accès de ${member.full_name}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Accès
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accès aux sociétés</DialogTitle>
          <DialogDescription>
            {member.full_name} — {member.role === "viewer" ? "lecture seule" : "édition"} des
            sociétés sélectionnées.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
              aria-label="Toutes les sociétés"
            />
            Toutes les sociétés de l'organisation
          </label>
          {!all && (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3" data-testid="company-grant-list">
              {companies.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune société.</p>
              ) : (
                companies.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      aria-label={c.name}
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersSettingsPage() {
  const { user: userInfo, loading: userLoading } = useUser()
  const orgId = userInfo?.organizations?.[0]?.id || null
  const currentUserId = userInfo?.user?.id
  const currentUserRole = userInfo?.organizations?.[0]?.role
  const isAdmin = currentUserRole === "admin"

  const { members, loading, invite, changeRole, setAllCompanies, setCompanies, remove } =
    useOrgMembers(orgId)

  const [companies, setCompanies_] = useState<Company[]>([])
  useEffect(() => {
    if (isAdmin) listCompanies().then(setCompanies_).catch(() => setCompanies_([]))
  }, [isAdmin])

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteError(null)
    setInviteLoading(true)
    try {
      await invite(inviteEmail.trim(), inviteRole)
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("member")
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Erreur lors de l'invitation")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await changeRole(userId, newRole)
    } catch {
      // Role change failed silently - could add toast
    }
  }

  const handleRemove = async (userId: string) => {
    try {
      await remove(userId)
    } catch {
      // Remove failed silently - could add toast
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      <main className="max-w-4xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des utilisateurs</h1>
            <p className="text-slate-500">
              {userInfo?.organizations?.[0]?.name || "Organisation"} &mdash; {members.length} membre{members.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter un membre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inviter un membre</DialogTitle>
                  <DialogDescription>
                    Entrez l'adresse courriel de la personne que vous souhaitez inviter.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Courriel</label>
                    <Input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Role</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="viewer">Lecteur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-600">{inviteError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {inviteLoading ? "Envoi..." : "Inviter"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Membres de l'organisation</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member
              const isSelf = member.id === currentUserId
              return (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-slate-600">
                      {member.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>

                  {/* Name + Email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{member.full_name}</p>
                      {isSelf && (
                        <span className="text-xs text-slate-400">(vous)</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{member.email}</p>
                  </div>

                  {/* Role Badge / Selector */}
                  <div className="flex-shrink-0">
                    {isAdmin && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="viewer">Lecteur</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`${roleConfig.color} text-xs font-medium`}
                      >
                        {roleConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* Access management (member/viewer only) */}
                  <div className="flex-shrink-0">
                    {isAdmin && !isSelf && member.role !== "admin" && (
                      <MemberAccessDialog
                        member={member}
                        companies={companies}
                        onSetAllCompanies={setAllCompanies}
                        onSetCompanies={setCompanies}
                      />
                    )}
                  </div>

                  {/* Remove Button */}
                  <div className="flex-shrink-0 w-9">
                    {isAdmin && !isSelf && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.full_name} ({member.email}) sera retiré de l'organisation. Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Retirer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
