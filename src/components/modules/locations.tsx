"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { CreateDialog, apiFetch } from "@/components/create-dialog"

export function LocationsModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch("/api/locations") })
  const [open, setOpen] = useState(false)

  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const r = await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Emplacement créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["locations"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} emplacement(s) — dépôts, caves, magasins</p>
        <CreateDialog open={open} onOpenChange={setOpen} title="Nouvel emplacement" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
          { name: "name", label: "Nom *", placeholder: "Dépôt principal Antsirabe" },
          { name: "address", label: "Adresse", placeholder: "Antsirabe" },
        ]} />
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Adresse</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.map((l: Record<string, unknown>) => (
                  <TableRow key={l.id as string}>
                    <TableCell className="font-medium">{l.name as string}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(l.address as string) ?? "—"}</TableCell>
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
