"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Boxes, Loader2, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, FlaskConical, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatQty, formatDate } from "@/lib/format"

interface StockItem { id: string; code: string; name: string; category: string; unit: string; minThreshold: number; quantity: number; prixUnitaire: number; valeur: number; lowStock: boolean }
interface Movement { id: string; type: string; quantity: number; unitPrice: number | null; motif: string | null; note: string | null; date: string; product: { code: string; name: string; unit: string }; supplier: { name: string } | null; locationFrom: { name: string } | null; locationTo: { name: string } | null; user: { name: string } | null }
interface Product { id: string; code: string; name: string; unit: string }
interface Supplier { id: string; name: string }
interface Location { id: string; name: string }

async function fetchStock() { const r = await fetch("/api/stock", { cache: "no-store" }); return r.json() as Promise<{ items: StockItem[]; valeurTotale: number }> }
async function fetchMovements(f: string) { const r = await fetch(`/api/stock/movements?${f}`, { cache: "no-store" }); return r.json() as Promise<Movement[]> }
async function fetchProducts() { const r = await fetch("/api/products", { cache: "no-store" }); return r.json() as Promise<Product[]> }
async function fetchSuppliers() { const r = await fetch("/api/suppliers", { cache: "no-store" }); return r.json() as Promise<Supplier[]> }
async function fetchLocations() { const r = await fetch("/api/locations", { cache: "no-store" }); return r.json() as Promise<Location[]> }

const TYPE_LABEL: Record<string, string> = { IN: "Entrée", OUT: "Sortie", TRANSFER: "Transfert", PRODUCTION: "Production", ADJUST: "Ajustement" }
const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = { IN: ArrowDownCircle, OUT: ArrowUpCircle, TRANSFER: ArrowLeftRight, PRODUCTION: FlaskConical, ADJUST: AlertTriangle }
const TYPE_COLOR: Record<string, string> = { IN: "text-emerald-600", OUT: "text-rose-600", TRANSFER: "text-amber-600", PRODUCTION: "text-primary", ADJUST: "text-purple-600" }

export function StockModule() {
  const qc = useQueryClient()
  const [tab, setTab] = useState("current")
  const [typeFilter, setTypeFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [moveOpen, setMoveOpen] = useState(false)

  const { data: stock } = useQuery({ queryKey: ["stock"], queryFn: fetchStock })
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts })
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers })
  const { data: locations } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations })

  const moveFilter = useMemo(() => {
    const p = new URLSearchParams()
    if (typeFilter !== "all") p.set("type", typeFilter)
    if (productFilter !== "all") p.set("productId", productFilter)
    return p.toString()
  }, [typeFilter, productFilter])

  const { data: movements, isLoading: mvLoading } = useQuery({ queryKey: ["movements", moveFilter], queryFn: () => fetchMovements(moveFilter) })

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/stock/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Mouvement enregistré"); setMoveOpen(false); qc.invalidateQueries({ queryKey: ["movements"] }); qc.invalidateQueries({ queryKey: ["stock"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="current">Stock courant</TabsTrigger>
            <TabsTrigger value="movements">Mouvements</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => setMoveOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nouveau mouvement</Button>
        </div>

        {/* Stock courant */}
        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-muted-foreground">Valeur totale du stock</p><p className="text-lg font-bold mt-0.5">{formatMGA(stock?.valeurTotale ?? 0)}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Produits suivis</p><p className="text-lg font-bold mt-0.5">{stock?.items.length ?? 0}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Stocks bas</p><p className="text-lg font-bold mt-0.5 text-rose-600">{stock?.items.filter((i) => i.lowStock).length ?? 0}</p></Card>
            <Card className="p-3"><p className="text-xs text-muted-foreground">Matières premières</p><p className="text-lg font-bold mt-0.5">{stock?.items.filter((i) => i.category === "RAW_MATERIAL").length ?? 0}</p></Card>
          </div>

          <Card className="overflow-hidden">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Produit</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantité</TableHead><TableHead className="text-right">Prix unitaire</TableHead><TableHead className="text-right">Valeur</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stock?.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono font-medium">{i.code}</TableCell>
                      <TableCell className="text-sm">{i.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{i.category === "RAW_MATERIAL" ? "Matière" : "Fini"}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${i.lowStock ? "text-rose-600" : ""}`}>{formatQty(i.quantity, i.unit)}</TableCell>
                      <TableCell className="text-right text-sm">{formatMGA(i.prixUnitaire)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatMGA(i.valeur)}</TableCell>
                      <TableCell>{i.lowStock ? <Badge variant="destructive" className="text-[10px]">Bas</Badge> : <Badge variant="secondary" className="text-[10px]">OK</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Mouvements */}
        <TabsContent value="movements" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="IN">Entrées</SelectItem>
                <SelectItem value="OUT">Sorties</SelectItem>
                <SelectItem value="TRANSFER">Transferts</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="ADJUST">Ajustements</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Produit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous produits</SelectItem>
                {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            {mvLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (movements?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center py-16 text-center"><Boxes className="w-10 h-10 text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun mouvement</p></div>
            ) : (
              <ScrollArea className="h-[calc(100vh-22rem)]">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[90px]">Date</TableHead><TableHead>Type</TableHead><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead>Fournisseur</TableHead><TableHead>De → Vers</TableHead><TableHead>Note</TableHead><TableHead>Auteur</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {movements?.map((m) => {
                      const Icon = TYPE_ICON[m.type] ?? Boxes
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(m.date)}</TableCell>
                          <TableCell><span className={`flex items-center gap-1.5 text-xs font-medium ${TYPE_COLOR[m.type]}`}><Icon className="w-4 h-4" />{TYPE_LABEL[m.type]}</span></TableCell>
                          <TableCell className="font-mono text-sm">{m.product.code}</TableCell>
                          <TableCell className={`text-right font-semibold ${m.quantity < 0 ? "text-rose-600" : "text-emerald-600"}`}>{m.quantity > 0 ? "+" : ""}{formatQty(m.quantity, m.product.unit)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.supplier?.name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.locationFrom?.name ?? "—"} → {m.locationTo?.name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.note ?? m.motif ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.user?.name ?? "—"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <MovementDialog open={moveOpen} onOpenChange={setMoveOpen} products={products ?? []} suppliers={suppliers ?? []} locations={locations ?? []} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />
    </div>
  )
}

function MovementDialog({ open, onOpenChange, products, suppliers, locations, onSubmit, loading }: {
  open: boolean; onOpenChange: (v: boolean) => void; products: Product[]; suppliers: Supplier[]; locations: Location[]
  onSubmit: (p: Record<string, unknown>) => void; loading: boolean
}) {
  const [type, setType] = useState<"IN" | "OUT" | "TRANSFER" | "PRODUCTION">("IN")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [locationFromId, setLocationFromId] = useState("")
  const [locationToId, setLocationToId] = useState("")
  const [note, setNote] = useState("")

  function submit() {
    const qty = Number(quantity)
    if (!productId || !quantity) { toast.error("Produit et quantité obligatoires"); return }
    // Signe : entrées positives, sorties négatives
    const signed = (type === "OUT") ? -Math.abs(qty) : Math.abs(qty)
    onSubmit({
      productId, type, quantity: signed,
      unitPrice: unitPrice ? Number(unitPrice) : null,
      supplierId: supplierId || null,
      locationFromId: locationFromId || null,
      locationToId: locationToId || null,
      note: note || null,
      date: new Date().toISOString(),
    })
    setProductId(""); setQuantity(""); setUnitPrice(""); setSupplierId(""); setLocationFromId(""); setLocationToId(""); setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Nouveau mouvement de stock</DialogTitle><DialogDescription>Aucun mouvement n&apos;est supprimé : une erreur se corrige par un mouvement inverse.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT" | "TRANSFER" | "PRODUCTION")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IN">Entrée (achat)</SelectItem><SelectItem value="OUT">Sortie (vente/perte)</SelectItem><SelectItem value="TRANSFER">Transfert</SelectItem><SelectItem value="PRODUCTION">Production</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Produit</Label>
              <Select value={productId} onValueChange={setProductId}><SelectTrigger className="h-9"><SelectValue placeholder="Choisir…" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Quantité {type === "OUT" ? "(positive)" : ""}</Label><Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" /></div>
            {(type === "IN" || type === "PRODUCTION") && <div className="space-y-1.5"><Label className="text-xs">Prix unitaire (Ar)</Label><Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-9" /></div>}
          </div>
          {type === "IN" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Fournisseur</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Vers emplacement</Label><Select value={locationToId} onValueChange={setLocationToId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          )}
          {type === "TRANSFER" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">De</Label><Select value={locationFromId} onValueChange={setLocationFromId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Vers</Label><Select value={locationToId} onValueChange={setLocationToId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          )}
          <div className="space-y-1.5"><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif du mouvement…" className="h-9" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
