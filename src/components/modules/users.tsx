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
import { CreateDialog, apiFetch } from "@/components/create-dialog"

export function UsersModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => apiFetch("/api/users") })
  const [open, setOpen] = useState(false)

  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Utilisateur créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} utilisateur(s) — un compte par personne</p>
        <CreateDialog open={open} onOpenChange={setOpen} title="Nouvel utilisateur" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
          { name: "name", label: "Nom *", placeholder: "Hery" },
          { name: "email", label: "Email *", placeholder: "hery@domaine.mg" },
          { name: "password", label: "Mot de passe (min 6)", placeholder: "••••••" },
          { name: "role", label: "Rôle", select: [{ value: "ADMIN", label: "Administrateur" }, { value: "EMPLOYEE", label: "Employé" }, { value: "PARTNER", label: "Partenaire" }] },
        ]} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead>Créé le</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((u: Record<string, unknown>) => (
                  <TableRow key={u.id as string}>
                    <TableCell className="font-medium">{u.name as string}</TableCell>
                    <TableCell className="text-sm">{u.email as string}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{u.role === "ADMIN" ? "Administrateur" : u.role === "PARTNER" ? "Partenaire" : "Employé"}</Badge></TableCell>
                    <TableCell>{u.active ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Actif</Badge> : <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt as string)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}
