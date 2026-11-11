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
import { CreateDialog, apiFetch } from "@/components/create-dialog"

export function ProductsModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => apiFetch("/api/products") })
  const [open, setOpen] = useState(false)

  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Produit créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} produit(s) — matières premières et produits finis</p>
        <CreateDialog open={open} onOpenChange={setOpen} title="Nouveau produit" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
          { name: "code", label: "Code *", placeholder: "D", upper: true },
          { name: "name", label: "Nom *", placeholder: "Vin rouge D — vrac" },
          { name: "unit", label: "Unité", placeholder: "liter" },
          { name: "minThreshold", label: "Seuil minimum", type: "number", default: "0" },
          { name: "defaultPurchasePrice", label: "Prix d'achat par défaut", type: "number", default: "0" },
          { name: "category", label: "Catégorie", select: [{ value: "FINISHED", label: "Produit fini" }, { value: "RAW_MATERIAL", label: "Matière première" }] },
        ]} />
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
