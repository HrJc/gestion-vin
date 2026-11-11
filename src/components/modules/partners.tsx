"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Users, Loader2, Phone, MapPin, Tag, History } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatDate, partnerTypeLabel } from "@/lib/format"

interface PartnerPrice { id: string; productId: string; unitPrice: number; discountPct: number; validFrom: string; validTo: string | null; product: { id: string; code: string; name: string; unit: string } }
interface Partner {
  id: string; code: string; name: string; type: string; phone: string | null; address: string | null; zone: string | null
  startDate: string | null; paymentTermsDays: number; discountPct: number; active: boolean
  prices: PartnerPrice[]; _count?: { sales: number }
}
interface Product { id: string; code: string; name: string; unit: string }

async function fetchPartners(): Promise<Partner[]> {
  const r = await fetch("/api/partners", { cache: "no-store" })
  return r.json()
}
async function fetchProducts(): Promise<Product[]> {
  const r = await fetch("/api/products", { cache: "no-store" })
  return r.json()
}

export function PartnersModule() {
  const qc = useQueryClient()
  const { data: partners, isLoading } = useQuery({ queryKey: ["partners"], queryFn: fetchPartners })
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts })
  const [selected, setSelected] = useState<Partner | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Partenaire créé"); setCreateOpen(false); qc.invalidateQueries({ queryKey: ["partners"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  if (selected) {
    return <PartnerDetail partner={selected} products={products ?? []} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{partners?.length ?? 0} partenaire(s)</p>
        <CreatePartnerDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (partners?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun partenaire. Ajoutez-en un pour commencer.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners?.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(p)}>
              <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{p.code}</span>
                          <Badge variant="outline" className="text-[10px]">{partnerTypeLabel(p.type)}</Badge>
                        </div>
                        <p className="font-semibold text-sm mt-1">{p.name}</p>
                      </div>
                      {!p.active && <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                    {p.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{p.phone}</div>}
                    {p.zone && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{p.zone}</div>}
                    <div className="flex items-center gap-1.5"><Tag className="w-3 h-3" />{p.prices.length} prix · {p._count?.sales ?? 0} vente(s)</div>
                    <div className="flex items-center gap-1.5"><History className="w-3 h-3" />Délai paiement : {p.paymentTermsDays} j</div>
                  </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Détail partenaire + grille de prix ----------

function PartnerDetail({ partner, products, onBack }: { partner: Partner; products: Product[]; onBack: () => void }) {
  const qc = useQueryClient()
  const [priceOpen, setPriceOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const pricesCurrent = partner.prices.filter((p) => !p.validTo)
  const pricesHistory = partner.prices.filter((p) => p.validTo)

  const addPriceMutation = useMutation({
    mutationFn: async (payload: { productId: string; unitPrice: number }) => {
      const r = await fetch(`/api/partners/${partner.id}/prices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Prix ajouté"); setPriceOpen(false); qc.invalidateQueries({ queryKey: ["partners"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Partenaire modifié"); setEditOpen(false); qc.invalidateQueries({ queryKey: ["partners"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Retour</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Modifier</Button>
          <Button size="sm" onClick={() => setPriceOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter un prix</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{partner.code}</span>
                <Badge variant="outline">{partnerTypeLabel(partner.type)}</Badge>
                {!partner.active && <Badge variant="secondary">Inactif</Badge>}
              </div>
              <CardTitle className="text-lg mt-1">{partner.name}</CardTitle>
              <CardDescription>{partner.zone ?? "Sans zone"} · {partner.phone ?? "Pas de téléphone"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Délai de paiement</p><p className="font-semibold">{partner.paymentTermsDays} jours</p></div>
          <div><p className="text-xs text-muted-foreground">Remise globale</p><p className="font-semibold">{partner.discountPct} %</p></div>
          <div><p className="text-xs text-muted-foreground">Début collaboration</p><p className="font-semibold">{formatDate(partner.startDate)}</p></div>
          <div><p className="text-xs text-muted-foreground">Adresse</p><p className="font-semibold text-xs">{partner.address ?? "—"}</p></div>
        </CardContent>
      </Card>

      {/* Grille de prix en cours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grille de prix en cours</CardTitle>
          <CardDescription>Les ventes passées ne sont pas affectées par un changement de prix.</CardDescription>
        </CardHeader>
        <CardContent>
          {pricesCurrent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun prix défini. Ajoutez-en un.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Prix unitaire</TableHead><TableHead className="text-right">Remise</TableHead><TableHead>Depuis</TableHead></TableRow></TableHeader>
              <TableBody>
                {pricesCurrent.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><span className="font-mono font-medium">{p.product.code}</span> <span className="text-muted-foreground text-xs ml-2">{p.product.name}</span></TableCell>
                    <TableCell className="text-right font-semibold">{formatMGA(p.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm">{p.discountPct > 0 ? `${p.discountPct} %` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.validFrom)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historique des prix */}
      {pricesHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des prix</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <Table>
                <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Prix</TableHead><TableHead> Du</TableHead><TableHead>Au</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pricesHistory.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.product.code}</TableCell>
                      <TableCell className="text-right">{formatMGA(p.unitPrice)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.validFrom)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.validTo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Dialog ajout prix */}
      <AddPriceDialog open={priceOpen} onOpenChange={setPriceOpen} products={products} existing={pricesCurrent} onSubmit={(p) => addPriceMutation.mutate(p)} loading={addPriceMutation.isPending} />

      {/* Dialog édition */}
      <EditPartnerDialog open={editOpen} onOpenChange={setEditOpen} partner={partner} onSubmit={(p) => updateMutation.mutate(p)} loading={updateMutation.isPending} />
    </div>
  )
}

// ---------- Dialogs ----------

function CreatePartnerDialog({ open, onOpenChange, onSubmit, loading }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (p: Record<string, unknown>) => void; loading: boolean }) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<"RESELLER" | "VENDOR">("RESELLER")
  const [phone, setPhone] = useState("")
  const [zone, setZone] = useState("")
  const [paymentTermsDays, setPaymentTermsDays] = useState("0")
  const [discountPct, setDiscountPct] = useState("0")

  function submit() {
    if (!code || !name) { toast.error("Code et nom obligatoires"); return }
    onSubmit({ code: code.toUpperCase(), name, type, phone: phone || null, zone: zone || null, paymentTermsDays: Number(paymentTermsDays), discountPct: Number(discountPct) })
    setCode(""); setName(""); setPhone(""); setZone(""); setPaymentTermsDays("0"); setDiscountPct("0")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nouveau partenaire</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Nouveau partenaire</DialogTitle><DialogDescription>Fiche partenaire + conditions</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="NLS" className="h-9 uppercase" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={type} onValueChange={(v) => setType(v as "RESELLER" | "VENDOR")}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RESELLER">Revendeur</SelectItem><SelectItem value="VENDOR">Vendeur</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NLS Distribution" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Zone</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Antananarivo" className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Délai paiement (j)</Label><Input type="number" min="0" value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remise (%)</Label><Input type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-9" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddPriceDialog({ open, onOpenChange, products, existing, onSubmit, loading }: { open: boolean; onOpenChange: (v: boolean) => void; products: Product[]; existing: PartnerPrice[]; onSubmit: (p: { productId: string; unitPrice: number }) => void; loading: boolean }) {
  const [productId, setProductId] = useState("")
  const [unitPrice, setUnitPrice] = useState("")

  const available = products.filter((p) => !existing.some((e) => e.productId === p.id))

  function submit() {
    const price = Number(unitPrice)
    if (!productId || price <= 0) { toast.error("Produit et prix obligatoires"); return }
    onSubmit({ productId, unitPrice: price })
    setProductId(""); setUnitPrice("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Ajouter un prix</DialogTitle><DialogDescription>Le prix précédent sera clôturé automatiquement.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Produit</Label>
            <Select value={productId} onValueChange={setProductId}><SelectTrigger className="h-9"><SelectValue placeholder="Choisir…" /></SelectTrigger><SelectContent>
              {available.length === 0 ? <SelectItem value="" disabled>Tous les produits ont un prix</SelectItem> : available.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
            </SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Prix unitaire (Ar)</Label><Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="28000" className="h-9" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading || available.length === 0}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Ajouter</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditPartnerDialog({ open, onOpenChange, partner, onSubmit, loading }: { open: boolean; onOpenChange: (v: boolean) => void; partner: Partner; onSubmit: (p: Record<string, unknown>) => void; loading: boolean }) {
  const [name, setName] = useState(partner.name)
  const [phone, setPhone] = useState(partner.phone ?? "")
  const [zone, setZone] = useState(partner.zone ?? "")
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(partner.paymentTermsDays))
  const [discountPct, setDiscountPct] = useState(String(partner.discountPct))

  function submit() {
    onSubmit({ name, phone: phone || null, zone: zone || null, paymentTermsDays: Number(paymentTermsDays), discountPct: Number(discountPct) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Modifier le partenaire</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Zone</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Délai paiement (j)</Label><Input type="number" min="0" value={paymentTermsDays} onChange={(e) => setPaymentTermsDays(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remise (%)</Label><Input type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-9" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
