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
  { name: "name", label: "Nom *", placeholder: "Dépôt principal Antsirabe" },
  { name: "address", label: "Adresse", placeholder: "Antsirabe" },
]

export function LocationsModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch("/api/locations") })
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null)

  const createMut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Emplacement créé"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["locations"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => patchRecord(`/api/locations/${id}`, payload),
    onSuccess: () => { toast.success("Emplacement modifié"); setEditOpen(false); qc.invalidateQueries({ queryKey: ["locations"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteRecord(`/api/locations/${id}`),
    onSuccess: () => { toast.success("Emplacement archivé"); qc.invalidateQueries({ queryKey: ["locations"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} emplacement(s) — dépôts, caves, magasins</p>
        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} title="Nouvel emplacement" onSubmit={(p) => createMut.mutate(p)} loading={createMut.isPending} fields={FIELDS} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Adresse</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((l: Record<string, unknown>) => (
                  <TableRow key={l.id as string}>
                    <TableCell className="font-medium">{l.name as string}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(l.address as string) ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <EditButton onClick={() => { setEditRecord(l); setEditOpen(true) }} />
                        <ArchiveButton onConfirm={() => deleteMut.mutate(l.id as string)} loading={deleteMut.isPending} description="L'emplacement sera archivé. L'historique des mouvements est conservé." />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
      <EditDialog key={editRecord?.id ?? "none"} open={editOpen} onOpenChange={setEditOpen} title="Modifier l'emplacement" onSubmit={(payload) => editRecord && editMut.mutate({ id: editRecord.id as string, payload })} loading={editMut.isPending} fields={FIELDS} record={editRecord} />
    </div>
  )
}
