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
import { Plus, TrendingUp, TrendingDown, Loader2, Wallet, ArrowUpCircle, ArrowDownCircle, Bell } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatPct, formatQty, formatDate } from "@/lib/format"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts"

interface MerchDetail {
  id: string; name: string; unit: string; stock: number; prixMoyen: number; dernierPrix: number; variationPct: number
  valeurMarche: number; gainLatent: number; gainRealise: number; alertHigh: number | null; alertLow: number | null; alerte: boolean
  historique: { date: string; price: number }[]
}
interface TradingData {
  valeurTotale: number; coutTotal: number; gainLatentTotal: number; gainRealiseTotal: number; marchandises: MerchDetail[]
}
interface Operation { id: string; type: string; quantity: number; unitPrice: number; fees: number; counterparty: string | null; paymentStatus: string; date: string; merchandise: { name: string; unit: string } }

async function fetchTrading(): Promise<TradingData> { const r = await fetch("/api/trading", { cache: "no-store" }); return r.json() }
async function fetchOps(): Promise<Operation[]> { const r = await fetch("/api/trading/operations", { cache: "no-store" }); return r.json() }

export function TradingModule() {
  const qc = useQueryClient()
  const [opOpen, setOpOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [chartMerch, setChartMerch] = useState<MerchDetail | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["trading"], queryFn: fetchTrading })
  const { data: ops } = useQuery({ queryKey: ["trading-ops"], queryFn: fetchOps })

  const opMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch("/api/trading/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Opération enregistrée"); setOpOpen(false); qc.invalidateQueries({ queryKey: ["trading"] }); qc.invalidateQueries({ queryKey: ["trading-ops"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const priceMutation = useMutation({
    mutationFn: async (payload: { merchandiseId: string; price: number }) => {
      const r = await fetch("/api/trading/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? "Erreur") }
      return r.json()
    },
    onSuccess: () => { toast.success("Prix du marché mis à jour"); setPriceOpen(false); qc.invalidateQueries({ queryKey: ["trading"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* En-tête : valeur totale + bouton */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/20 border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valeur totale du stock de marchandises</p>
              <p className="text-3xl font-bold tracking-tight">{formatMGA(data.valeurTotale)}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className={`flex items-center gap-1 ${data.gainLatentTotal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {data.gainLatentTotal >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  Gain latent : {formatMGA(data.gainLatentTotal)}
                </span>
                <span className="text-muted-foreground">| Réalisé : {formatMGA(data.gainRealiseTotal)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPriceOpen(true)}><Bell className="w-4 h-4 mr-1" /> Prix du marché</Button>
              <Button onClick={() => setOpOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nouvelle opération</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste marchandises avec variation couleur */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.marchandises.map((m) => {
          const up = m.variationPct >= 0
          return (
            <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartMerch(m)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{m.name}</CardTitle>
                    <CardDescription className="text-xs">Stock : {formatQty(m.stock, m.unit)}</CardDescription>
                  </div>
                  {m.alerte && <Badge variant="destructive" className="text-[10px] gap-1"><Bell className="w-3 h-3" /> Alerte</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Dernier prix</p>
                    <p className="text-lg font-bold">{formatMGA(m.dernierPrix)}</p>
                  </div>
                  <Badge className={`gap-1 ${up ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPct(m.variationPct)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div><span className="text-muted-foreground">Valeur marché</span><p className="font-semibold">{formatMGA(m.valeurMarche)}</p></div>
                  <div><span className="text-muted-foreground">Gain latent</span><p className={`font-semibold ${m.gainLatent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.gainLatent >= 0 ? "+" : "−"}{formatMGA(Math.abs(m.gainLatent))}</p></div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Opérations récentes */}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle className="text-base">Opérations récentes</CardTitle><CardDescription>Historique des achats et ventes</CardDescription></CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <Table>
              <TableHeader><TableRow><TableHead className="w-[80px]">Date</TableHead><TableHead>Type</TableHead><TableHead>Marchandise</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">P.U.</TableHead><TableHead className="text-right">Frais</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Contrepartie</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {ops?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(o.date)}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-xs font-medium ${o.type === "BUY" ? "text-amber-600" : "text-emerald-600"}`}>
                        {o.type === "BUY" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                        {o.type === "BUY" ? "Achat" : "Vente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{o.merchandise.name}</TableCell>
                    <TableCell className="text-right text-sm">{formatQty(o.quantity, o.merchandise.unit)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMGA(o.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMGA(o.fees)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMGA(o.quantity * o.unitPrice + o.fees)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.counterparty ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{o.paymentStatus === "PAID" ? "Payé" : o.paymentStatus === "PARTIAL" ? "Partiel" : "À payer"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OperationDialog open={opOpen} onOpenChange={setOpOpen} marchandises={data.marchandises} onSubmit={(p) => opMutation.mutate(p)} loading={opMutation.isPending} />
      <PriceDialog open={priceOpen} onOpenChange={setPriceOpen} marchandises={data.marchandises} onSubmit={(p) => priceMutation.mutate(p)} loading={priceMutation.isPending} />
      <ChartDialog merch={chartMerch} onClose={() => setChartMerch(null)} />
    </div>
  )
}

function OperationDialog({ open, onOpenChange, marchandises, onSubmit, loading }: { open: boolean; onOpenChange: (v: boolean) => void; marchandises: MerchDetail[]; onSubmit: (p: Record<string, unknown>) => void; loading: boolean }) {
  const [type, setType] = useState<"BUY" | "SELL">("BUY")
  const [merchandiseId, setMerchandiseId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [fees, setFees] = useState("0")
  const [counterparty, setCounterparty] = useState("")
  const [method, setMethod] = useState<"CASH" | "MOBILE_MONEY">("CASH")
  const [status, setStatus] = useState<"PAID" | "PARTIAL" | "UNPAID">("PAID")
  const [note, setNote] = useState("")

  function submit() {
    if (!merchandiseId || !quantity || !unitPrice) { toast.error("Marchandise, quantité et prix obligatoires"); return }
    onSubmit({ type, merchandiseId, quantity: Number(quantity), unitPrice: Number(unitPrice), fees: Number(fees) || 0, counterparty: counterparty || null, paymentMethod: method, paymentStatus: status, note: note || null, date: new Date().toISOString() })
    setMerchandiseId(""); setQuantity(""); setUnitPrice(""); setFees("0"); setCounterparty(""); setNote("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Nouvelle opération</DialogTitle><DialogDescription>Achat ou vente de marchandise — l&apos;application suit, n&apos;exécute pas.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={type} onValueChange={(v) => setType(v as "BUY" | "SELL")}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BUY">Achat</SelectItem><SelectItem value="SELL">Vente</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Marchandise</Label><Select value={merchandiseId} onValueChange={setMerchandiseId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{marchandises.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Quantité</Label><Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Prix unitaire</Label><Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Frais</Label><Input type="number" min="0" value={fees} onChange={(e) => setFees(e.target.value)} className="h-9" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Contrepartie (fournisseur/acheteur)</Label><Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Marché Anosy…" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Mode paiement</Label><Select value={method} onValueChange={(v) => setMethod(v as "CASH" | "MOBILE_MONEY")}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CASH">Espèces</SelectItem><SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Statut</Label><Select value={status} onValueChange={(v) => setStatus(v as "PAID" | "PARTIAL" | "UNPAID")}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAID">Payé</SelectItem><SelectItem value="PARTIAL">Partiel</SelectItem><SelectItem value="UNPAID">À payer</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PriceDialog({ open, onOpenChange, marchandises, onSubmit, loading }: { open: boolean; onOpenChange: (v: boolean) => void; marchandises: MerchDetail[]; onSubmit: (p: { merchandiseId: string; price: number }) => void; loading: boolean }) {
  const [merchandiseId, setMerchandiseId] = useState("")
  const [price, setPrice] = useState("")
  const selected = marchandises.find((m) => m.id === merchandiseId)

  function submit() {
    if (!merchandiseId || !price) { toast.error("Marchandise et prix obligatoires"); return }
    onSubmit({ merchandiseId, price: Number(price) })
    setMerchandiseId(""); setPrice("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Prix du marché</DialogTitle><DialogDescription>Saisie manuelle — suivi des fluctuations.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Marchandise</Label><Select value={merchandiseId} onValueChange={setMerchandiseId}><SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{marchandises.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
          {selected && <p className="text-xs text-muted-foreground">Dernier prix connu : {formatMGA(selected.dernierPrix)}</p>}
          <div className="space-y-1.5"><Label className="text-xs">Nouveau prix (Ar)</Label><Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChartDialog({ merch, onClose }: { merch: MerchDetail | null; onClose: () => void }) {
  if (!merch) return null
  const data = merch.historique.map((h) => ({ date: formatDate(h.date), price: h.price }))
  return (
    <Dialog open={!!merch} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader><DialogTitle>{merch.name} — évolution du prix</DialogTitle><DialogDescription>Stock actuel : {formatQty(merch.stock, merch.unit)} · Prix moyen : {formatMGA(merch.prixMoyen)}</DialogDescription></DialogHeader>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ left: -5, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px]" interval="preserveStartEnd" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} className="text-[10px]" />
            <Tooltip formatter={(v: number) => [formatMGA(v), "Prix"]} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
            {merch.alertHigh != null && <ReferenceLine y={merch.alertHigh} stroke="var(--chart-4)" strokeDasharray="4 4" label={{ value: "Haut", fontSize: 10 }} />}
            {merch.alertLow != null && <ReferenceLine y={merch.alertLow} stroke="var(--chart-3)" strokeDasharray="4 4" label={{ value: "Bas", fontSize: 10 }} />}
            <Line type="monotone" dataKey="price" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </DialogContent>
    </Dialog>
  )
}
