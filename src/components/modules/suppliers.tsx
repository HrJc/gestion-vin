"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { CreateDialog, apiFetch } from "@/components/create-dialog"

export function SuppliersModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch("/api/suppliers") })
  const [open, setOpen] = useState(false)

  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Fournisseur créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["suppliers"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} fournisseur(s)</p>
        <CreateDialog open={open} onOpenChange={setOpen} title="Nouveau fournisseur" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
          { name: "name", label: "Nom *", placeholder: "Domaine Antsirabe" },
          { name: "contact", label: "Contact", placeholder: "Mamy" },
          { name: "phone", label: "Téléphone", placeholder: "0341…" },
        ]} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Contact</TableHead><TableHead>Téléphone</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((s: Record<string, unknown>) => (
                  <TableRow key={s.id as string}>
                    <TableCell className="font-medium">{s.name as string}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(s.contact as string) ?? "—"}</TableCell>
                    <TableCell className="text-sm">{(s.phone as string) ?? "—"}</TableCell>
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
