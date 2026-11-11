"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatMGA } from "@/lib/format"
import { CreateDialog, EditDialog, EditButton, ArchiveButton, apiFetch, patchRecord, deleteRecord } from "@/components/create-dialog"

const FIELDS = [
  { name: "code", label: "Code *", placeholder: "D", upper: true },
  { name: "name", label: "Nom *", placeholder: "Vin rouge D — vrac" },
  { name: "unit", label: "Unité", placeholder: "liter" },
  { name: "minThreshold", label: "Seuil minimum", type: "number", default: "0" },
  { name: "defaultPurchasePrice", label: "Prix d'achat par défaut", type: "number", default: "0" },
  { name: "category", label: "Catégorie", select: [{ value: "FINISHED", label: "Produit fini" }, { value: "RAW_MATERIAL", label: "Matière première" }] },
]

export function ProductsModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => apiFetch("/api/products") })
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null)

  const createMut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Produit créé"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => patchRecord(`/api/products/${id}`, payload),
    onSuccess: () => { toast.success("Produit modifié"); setEditOpen(false); qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteRecord(`/api/products/${id}`),
    onSuccess: () => { toast.success("Produit archivé"); qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} produit(s) — matières premières et produits finis</p>
        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} title="Nouveau produit" onSubmit={(p) => createMut.mutate(p)} loading={createMut.isPending} fields={FIELDS} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Catégorie</TableHead>
                  <TableHead>Unité</TableHead><TableHead className="text-right">Seuil min.</TableHead><TableHead className="text-right">Prix d'achat</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((p: Record<string, unknown>) => (
                  <TableRow key={p.id as string}>
                    <TableCell className="font-mono font-medium">{p.code as string}</TableCell>
                    <TableCell className="text-sm">{p.name as string}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{p.category === "FINISHED" ? "Fini" : "Matière"}</Badge></TableCell>
                    <TableCell className="text-sm">{p.unit as string}</TableCell>
                    <TableCell className="text-right text-sm">{String(p.minThreshold)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMGA(p.defaultPurchasePrice as number)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <EditButton onClick={() => { setEditRecord(p); setEditOpen(true) }} />
                        <ArchiveButton onConfirm={() => deleteMut.mutate(p.id as string)} loading={deleteMut.isPending} description="Le produit sera archivé. L'historique des ventes et mouvements est conservé." />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
      <EditDialog key={editRecord?.id ?? "none"} open={editOpen} onOpenChange={setEditOpen} title="Modifier le produit" onSubmit={(payload) => editRecord && editMut.mutate({ id: editRecord.id as string, payload })} loading={editMut.isPending} fields={FIELDS} record={editRecord} />
    </div>
  )
}
