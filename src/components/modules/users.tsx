"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { CreateDialog, EditDialog, EditButton, ArchiveButton, apiFetch, patchRecord, deleteRecord } from "@/components/create-dialog"

const FIELDS = [
  { name: "name", label: "Nom *", placeholder: "Hery" },
  { name: "email", label: "Email *", placeholder: "hery@domaine.mg" },
  { name: "password", label: "Mot de passe (laisser vide pour ne pas changer)", placeholder: "••••••" },
  { name: "role", label: "Rôle", select: [{ value: "ADMIN", label: "Administrateur" }, { value: "EMPLOYEE", label: "Employé" }, { value: "PARTNER", label: "Partenaire" }] },
  { name: "active", label: "Compte actif", type: "text", default: "true", select: [{ value: "true", label: "Oui" }, { value: "false", label: "Non" }] },
]

export function UsersModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => apiFetch("/api/users") })
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null)

  const createMut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Utilisateur créé"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      // Ne pas envoyer le mot de passe vide
      if (!payload.password) delete payload.password
      if (payload.active !== undefined) payload.active = payload.active === "true"
      return patchRecord(`/api/users/${id}`, payload)
    },
    onSuccess: () => { toast.success("Utilisateur modifié"); setEditOpen(false); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteRecord(`/api/users/${id}`),
    onSuccess: () => { toast.success("Utilisateur désactivé"); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} utilisateur(s) — un compte par personne</p>
        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} title="Nouvel utilisateur" onSubmit={(p) => createMut.mutate(p)} loading={createMut.isPending} fields={FIELDS} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead>Créé le</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((u: Record<string, unknown>) => (
                  <TableRow key={u.id as string}>
                    <TableCell className="font-medium">{u.name as string}</TableCell>
                    <TableCell className="text-sm">{u.email as string}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{u.role === "ADMIN" ? "Administrateur" : u.role === "PARTNER" ? "Partenaire" : "Employé"}</Badge></TableCell>
                    <TableCell>{u.active ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Actif</Badge> : <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt as string)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <EditButton onClick={() => { setEditRecord({ ...u, active: String(u.active) }); setEditOpen(true) }} />
                        <ArchiveButton onConfirm={() => deleteMut.mutate(u.id as string)} loading={deleteMut.isPending} label="Désactiver" description="L'utilisateur sera désactivé et ne pourra plus se connecter. Son historique est conservé." />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
      <EditDialog key={editRecord?.id ?? "none"} open={editOpen} onOpenChange={setEditOpen} title="Modifier l'utilisateur" onSubmit={(payload) => editRecord && editMut.mutate({ id: editRecord.id as string, payload })} loading={editMut.isPending} fields={FIELDS} record={editRecord} />
    </div>
  )
}
