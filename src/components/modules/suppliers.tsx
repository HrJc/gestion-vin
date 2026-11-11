"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { CreateDialog, EditDialog, EditButton, ArchiveButton, apiFetch, patchRecord, deleteRecord } from "@/components/create-dialog"

const FIELDS = [
  { name: "name", label: "Nom *", placeholder: "Domaine Antsirabe" },
  { name: "contact", label: "Contact", placeholder: "Mamy" },
  { name: "phone", label: "Téléphone", placeholder: "0341…" },
]

export function SuppliersModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch("/api/suppliers") })
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null)

  const createMut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Fournisseur créé"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["suppliers"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => patchRecord(`/api/suppliers/${id}`, payload),
    onSuccess: () => { toast.success("Fournisseur modifié"); setEditOpen(false); qc.invalidateQueries({ queryKey: ["suppliers"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteRecord(`/api/suppliers/${id}`),
    onSuccess: () => { toast.success("Fournisseur archivé"); qc.invalidateQueries({ queryKey: ["suppliers"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} fournisseur(s)</p>
        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} title="Nouveau fournisseur" onSubmit={(p) => createMut.mutate(p)} loading={createMut.isPending} fields={FIELDS} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Contact</TableHead><TableHead>Téléphone</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((s: Record<string, unknown>) => (
                  <TableRow key={s.id as string}>
                    <TableCell className="font-medium">{s.name as string}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(s.contact as string) ?? "—"}</TableCell>
                    <TableCell className="text-sm">{(s.phone as string) ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <EditButton onClick={() => { setEditRecord(s); setEditOpen(true) }} />
                        <ArchiveButton onConfirm={() => deleteMut.mutate(s.id as string)} loading={deleteMut.isPending} description="Le fournisseur sera archivé. L'historique des achats est conservé." />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
      <EditDialog key={editRecord?.id ?? "none"} open={editOpen} onOpenChange={setEditOpen} title="Modifier le fournisseur" onSubmit={(payload) => editRecord && editMut.mutate({ id: editRecord.id as string, payload })} loading={editMut.isPending} fields={FIELDS} record={editRecord} />
    </div>
  )
}
