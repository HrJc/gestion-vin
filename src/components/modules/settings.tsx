"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Loader2, Package, Truck, MapPin, UserCog } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatDate } from "@/lib/format"

// ---- Fetchers ----
const api = async (path: string) => { const r = await fetch(path, { cache: "no-store" }); return r.json() }

export function SettingsModule() {
  return (
    <Tabs defaultValue="products">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" /> Produits</TabsTrigger>
        <TabsTrigger value="suppliers"><Truck className="w-4 h-4 mr-1" /> Fournisseurs</TabsTrigger>
        <TabsTrigger value="locations"><MapPin className="w-4 h-4 mr-1" /> Emplacements</TabsTrigger>
        <TabsTrigger value="users"><UserCog className="w-4 h-4 mr-1" /> Utilisateurs</TabsTrigger>
      </TabsList>
      <TabsContent value="products"><ProductsTab /></TabsContent>
      <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
      <TabsContent value="locations"><LocationsTab /></TabsContent>
      <TabsContent value="users"><UsersTab /></TabsContent>
    </Tabs>
  )
}

// ---- Produits ----
function ProductsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["products"], queryFn: () => api("/api/products") })
  const [open, setOpen] = useState(false)
  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => { const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") } return r.json() },
    onSuccess: () => { toast.success("Produit créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["products"] }) }, onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><CreateDialog open={open} onOpenChange={setOpen} title="Nouveau produit" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
        { name: "code", label: "Code *", placeholder: "D", upper: true },
        { name: "name", label: "Nom *", placeholder: "Vin rouge D — vrac" },
        { name: "unit", label: "Unité", placeholder: "liter" },
        { name: "minThreshold", label: "Seuil minimum", type: "number", default: "0" },
        { name: "defaultPurchasePrice", label: "Prix d'achat par défaut", type: "number", default: "0" },
        { name: "category", label: "Catégorie", select: [{ value: "FINISHED", label: "Produit fini" }, { value: "RAW_MATERIAL", label: "Matière première" }] },
      ]} /></div>
      <Card className="overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <ScrollArea className="h-[calc(100vh-18rem)]"><Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Catégorie</TableHead><TableHead>Unité</TableHead><TableHead className="text-right">Seuil</TableHead><TableHead className="text-right">Prix achat</TableHead></TableRow></TableHeader>
            <TableBody>{data?.map((p: Record<string, unknown>) => (
              <TableRow key={p.id as string}>
                <TableCell className="font-mono font-medium">{p.code as string}</TableCell>
                <TableCell className="text-sm">{p.name as string}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{p.category === "FINISHED" ? "Fini" : "Matière"}</Badge></TableCell>
                <TableCell className="text-sm">{p.unit as string}</TableCell>
                <TableCell className="text-right text-sm">{String(p.minThreshold)}</TableCell>
                <TableCell className="text-right text-sm">{formatMGA(p.defaultPurchasePrice as number)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></ScrollArea>
        )}
      </Card>
    </div>
  )
}

// ---- Fournisseurs ----
function SuppliersTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => api("/api/suppliers") })
  const [open, setOpen] = useState(false)
  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => { const r = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") } return r.json() },
    onSuccess: () => { toast.success("Fournisseur créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["suppliers"] }) }, onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><CreateDialog open={open} onOpenChange={setOpen} title="Nouveau fournisseur" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
        { name: "name", label: "Nom *", placeholder: "Domaine Antsirabe" },
        { name: "contact", label: "Contact", placeholder: "Mamy" },
        { name: "phone", label: "Téléphone", placeholder: "0341…" },
      ]} /></div>
      <Card className="overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <ScrollArea className="h-[calc(100vh-18rem)]"><Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Contact</TableHead><TableHead>Téléphone</TableHead></TableRow></TableHeader>
            <TableBody>{data?.map((s: Record<string, unknown>) => (
              <TableRow key={s.id as string}><TableCell className="font-medium">{s.name as string}</TableCell><TableCell className="text-sm text-muted-foreground">{(s.contact as string) ?? "—"}</TableCell><TableCell className="text-sm">{(s.phone as string) ?? "—"}</TableCell></TableRow>
            ))}</TableBody>
          </Table></ScrollArea>
        )}
      </Card>
    </div>
  )
}

// ---- Emplacements ----
function LocationsTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => api("/api/locations") })
  const [open, setOpen] = useState(false)
  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => { const r = await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") } return r.json() },
    onSuccess: () => { toast.success("Emplacement créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["locations"] }) }, onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><CreateDialog open={open} onOpenChange={setOpen} title="Nouvel emplacement" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
        { name: "name", label: "Nom *", placeholder: "Dépôt principal Antsirabe" },
        { name: "address", label: "Adresse", placeholder: "Antsirabe" },
      ]} /></div>
      <Card className="overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <ScrollArea className="h-[calc(100vh-18rem)]"><Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Adresse</TableHead></TableRow></TableHeader>
            <TableBody>{data?.map((l: Record<string, unknown>) => (
              <TableRow key={l.id as string}><TableCell className="font-medium">{l.name as string}</TableCell><TableCell className="text-sm text-muted-foreground">{(l.address as string) ?? "—"}</TableCell></TableRow>
            ))}</TableBody>
          </Table></ScrollArea>
        )}
      </Card>
    </div>
  )
}

// ---- Utilisateurs ----
function UsersTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api("/api/users") })
  const [open, setOpen] = useState(false)
  const mut = useMutation({
    mutationFn: async (p: Record<string, unknown>) => { const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") } return r.json() },
    onSuccess: () => { toast.success("Utilisateur créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["users"] }) }, onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><CreateDialog open={open} onOpenChange={setOpen} title="Nouvel utilisateur" onSubmit={(p) => mut.mutate(p)} loading={mut.isPending} fields={[
        { name: "name", label: "Nom *", placeholder: "Hery" },
        { name: "email", label: "Email *", placeholder: "hery@domaine.mg" },
        { name: "password", label: "Mot de passe (min 6)", placeholder: "••••••" },
        { name: "role", label: "Rôle", select: [{ value: "ADMIN", label: "Administrateur" }, { value: "EMPLOYEE", label: "Employé" }, { value: "PARTNER", label: "Partenaire" }] },
      ]} /></div>
      <Card className="overflow-hidden">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
          <ScrollArea className="h-[calc(100vh-18rem)]"><Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead>Créé le</TableHead></TableRow></TableHeader>
            <TableBody>{data?.map((u: Record<string, unknown>) => (
              <TableRow key={u.id as string}>
                <TableCell className="font-medium">{u.name as string}</TableCell>
                <TableCell className="text-sm">{u.email as string}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{u.role === "ADMIN" ? "Administrateur" : u.role === "PARTNER" ? "Partenaire" : "Employé"}</Badge></TableCell>
                <TableCell>{u.active ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Actif</Badge> : <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt as string)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></ScrollArea>
        )}
      </Card>
    </div>
  )
}

// ---- Dialog générique ----
interface FieldDef {
  name: string; label: string; placeholder?: string; type?: string; default?: string; upper?: boolean
  select?: { value: string; label: string }[]
}
function CreateDialog({ open, onOpenChange, title, onSubmit, loading, fields }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (p: Record<string, unknown>) => void; loading: boolean; fields: FieldDef[]
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  function submit() {
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.name] ?? f.default ?? ""
      if (f.type === "number") payload[f.name] = Number(v) || 0
      else payload[f.name] = f.upper ? v.toUpperCase() : v || null
    }
    onSubmit(payload)
    setValues({})
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ajouter</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              {f.select ? (
                <Select value={values[f.name] ?? f.default ?? ""} onValueChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{f.select.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.type ?? "text"} value={values[f.name] ?? f.default ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.name]: f.upper ? e.target.value.toUpperCase() : e.target.value }))} placeholder={f.placeholder} className="h-9" />
              )}
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
