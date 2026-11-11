"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Loader2, Search, ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatDate, paymentStatusLabel, paymentStatusColor, formatQty } from "@/lib/format"

interface Partner {
  id: string
  code: string
  name: string
  type: string
  prices: { productId: string; unitPrice: number; product: { id: string; code: string; name: string; unit: string } }[]
}
interface Product { id: string; code: string; name: string; unit: string }
interface Sale {
  id: string
  date: string
  deliveredClient: string | null
  quantity: number
  unitPriceSnapshot: number
  deliveryFee: number
  paymentStatus: string
  paymentMethod: string | null
  note: string | null
  total: number
  paid: number
  due: number
  partner: { id: string; code: string; name: string }
  product: { id: string; code: string; name: string; unit: string }
  payments: { id: string; amount: number; date: string; method: string }[]
}

async function fetchPartners(): Promise<Partner[]> {
  const r = await fetch("/api/partners", { cache: "no-store" })
  return r.json()
}
async function fetchProducts(): Promise<Product[]> {
  const r = await fetch("/api/products", { cache: "no-store" })
  return r.json()
}
async function fetchSales(filters: string): Promise<Sale[]> {
  const r = await fetch(`/api/sales?${filters}`, { cache: "no-store" })
  return r.json()
}

export function SalesModule() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [partnerFilter, setPartnerFilter] = useState<string>("all")

  const { data: partners } = useQuery({ queryKey: ["partners"], queryFn: fetchPartners })
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts })

  const filterStr = useMemo(() => {
    const p = new URLSearchParams()
    if (statusFilter !== "all") p.set("status", statusFilter)
    if (partnerFilter !== "all") p.set("partnerId", partnerFilter)
    return p.toString()
  }, [statusFilter, partnerFilter])

  const { data: sales, isLoading } = useQuery({ queryKey: ["sales", filterStr], queryFn: () => fetchSales(filterStr) })

  const filtered = useMemo(() => {
    if (!sales) return []
    const q = search.toLowerCase().trim()
    if (!q) return sales
    return sales.filter((s) =>
      s.partner.code.toLowerCase().includes(q) ||
      s.partner.name.toLowerCase().includes(q) ||
      (s.deliveredClient ?? "").toLowerCase().includes(q) ||
      s.product.code.toLowerCase().includes(q) ||
      s.product.name.toLowerCase().includes(q),
    )
  }, [sales, search])

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error ?? "Erreur")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Vente enregistrée — stock mis à jour")
      setOpen(false)
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      qc.invalidateQueries({ queryKey: ["stock"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const payMutation = useMutation({
    mutationFn: async ({ saleId, amount, method }: { saleId: string; amount: number; method: string }) => {
      const r = await fetch(`/api/sales/${saleId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error(e.error ?? "Erreur")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Paiement enregistré")
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Partenaire" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les partenaires</SelectItem>
              {partners?.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="PAID">Payé</SelectItem>
              <SelectItem value="PARTIAL">Partiel</SelectItem>
              <SelectItem value="UNPAID">À payer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NewSaleDialog
          open={open}
          onOpenChange={setOpen}
          partners={partners ?? []}
          products={products ?? []}
          onSubmit={(p) => createMutation.mutate(p)}
          loading={createMutation.isPending}
        />
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ventes affichées", value: String(filtered.length) },
          { label: "CA total", value: formatMGA(filtered.reduce((s, v) => s + v.total, 0)) },
          { label: "Encaissé", value: formatMGA(filtered.reduce((s, v) => s + v.paid, 0)) },
          { label: "Reste dû", value: formatMGA(filtered.reduce((s, v) => s + v.due, 0)) },
        ].map((k) => (
          <Card key={k.label} className="p-3">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-base font-bold mt-0.5">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Tableau des ventes */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune vente. Cliquez sur « Nouvelle vente » pour commencer.</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Date</TableHead>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Client livré</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">P.U.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{s.partner.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.deliveredClient ?? "—"}</TableCell>
                    <TableCell><span className="font-mono text-sm">{s.product.code}</span></TableCell>
                    <TableCell className="text-right text-sm">{formatQty(s.quantity, s.product.unit)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMGA(s.unitPriceSnapshot)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMGA(s.total)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMGA(s.paid)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${paymentStatusColor(s.paymentStatus)}`}>{paymentStatusLabel(s.paymentStatus)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.due > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={payMutation.isPending}
                          onClick={() => payMutation.mutate({ saleId: s.id, amount: s.due, method: s.paymentMethod ?? "MOBILE_MONEY" })}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Encaisser
                        </Button>
                      )}
                    </TableCell>
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

// ---------- Dialog Nouvelle vente (format WhatsApp) ----------

function NewSaleDialog({
  open,
  onOpenChange,
  partners,
  products,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  partners: Partner[]
  products: Product[]
  onSubmit: (payload: Record<string, unknown>) => void
  loading: boolean
}) {
  const [partnerId, setPartnerId] = useState("")
  const [deliveredClient, setDeliveredClient] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [deliveryFee, setDeliveryFee] = useState("0")
  const [status, setStatus] = useState<"PAID" | "UNPAID">("PAID")
  const [method, setMethod] = useState<"CASH" | "MOBILE_MONEY">("MOBILE_MONEY")
  const [note, setNote] = useState("")

  const selectedPartner = partners.find((p) => p.id === partnerId)
  const priceEntry = selectedPartner?.prices.find((pr) => pr.productId === productId)
  const unitPrice = priceEntry?.unitPrice ?? 0
  const qty = Number(quantity) || 0
  const fl = Number(deliveryFee) || 0
  const total = qty * unitPrice + fl

  function reset() {
    setPartnerId(""); setDeliveredClient(""); setProductId(""); setQuantity("1")
    setDeliveryFee("0"); setStatus("PAID"); setMethod("MOBILE_MONEY"); setNote("")
  }

  function submit() {
    if (!partnerId || !productId || qty <= 0) {
      toast.error("Partenaire, produit et quantité sont obligatoires")
      return
    }
    if (!priceEntry) {
      toast.error("Aucun prix défini pour ce produit chez ce partenaire")
      return
    }
    onSubmit({
      partnerId,
      deliveredClient: deliveredClient || null,
      productId,
      quantity: qty,
      deliveryFee: fl,
      paymentStatus: status,
      paymentMethod: method,
      note: note || null,
      date: new Date().toISOString(),
    })
    reset()
  }

  const whatsappPreview = [
    selectedPartner?.code ?? "—",
    deliveredClient || "—",
    products.find((p) => p.id === productId)?.code ?? "—",
    String(qty),
    formatMGA(total),
    deliveryFee && Number(deliveryFee) > 0 ? `FL ${deliveryFee}` : "",
    status === "PAID" ? "OK" : "NP",
  ].filter(Boolean).join(" / ")

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button className="h-9"><Plus className="w-4 h-4 mr-1" /> Nouvelle vente</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nouvelle vente</DialogTitle>
          <DialogDescription>Saisie rapide — moins de 30 secondes. Format WhatsApp.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Partenaire + Client livré */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Partenaire *</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Client livré</Label>
              <Input value={deliveredClient} onChange={(e) => setDeliveredClient(e.target.value)} placeholder="DON BOSCO…" className="h-9" />
            </div>
          </div>

          {/* Produit + Quantité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Produit *</Label>
              <Select value={productId} onValueChange={setProductId} disabled={!partnerId}>
                <SelectTrigger className="h-9"><SelectValue placeholder={partnerId ? "Choisir…" : "D'abord un partenaire"} /></SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.code === "D" || p.code === "L" || p.code === "SV" || selectedPartner?.prices.some((pr) => pr.productId === p.id))
                    .map((p) => {
                      const pr = selectedPartner?.prices.find((x) => x.productId === p.id)
                      return <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}{pr ? ` (${formatMGA(pr.unitPrice)})` : ""}</SelectItem>
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quantité *</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" />
            </div>
          </div>

          {/* Prix auto + Frais */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prix unitaire</Label>
              <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-sm font-medium">
                {unitPrice ? formatMGA(unitPrice) : "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frais livraison (FL)</Label>
              <Input type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total calculé</Label>
              <div className="h-9 rounded-md border bg-primary/5 px-3 flex items-center text-sm font-bold text-primary">{formatMGA(total)}</div>
            </div>
          </div>

          {/* Statut + Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Statut paiement</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "PAID" | "UNPAID")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">OK — Payé</SelectItem>
                  <SelectItem value="UNPAID">NP — À payer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode de paiement</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "CASH" | "MOBILE_MONEY")} disabled={status === "UNPAID"}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Espèces</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aperçu WhatsApp */}
          <div className="rounded-lg bg-muted/50 border border-dashed p-3">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Aperçu (format WhatsApp)</p>
            <p className="font-mono text-xs">{whatsappPreview}</p>
          </div>

          {!priceEntry && partnerId && productId && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded-md">
              <AlertCircle className="w-4 h-4" />
              Aucun prix dans la grille pour ce produit. Ajoutez-le dans la fiche partenaire.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={loading || !priceEntry}>
            {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
