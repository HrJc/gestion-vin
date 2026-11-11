"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileDown, Loader2, FileBarChart, TrendingUp, Package, Truck, Coins } from "lucide-react"
import { toast } from "sonner"
import { formatMGA, formatQty, formatDate, moisLabel } from "@/lib/format"

interface Report {
  periode: { year: number; month: number; label: string }
  ventes: {
    caTotal: number; paidTotal: number; count: number
    parPartenaire: { name: string; code: string; type: string; ca: number; qty: number }[]
    parProduit: { name: string; code: string; ca: number; qty: number }[]
    parType: { RESELLER: number; VENDOR: number }
    ventesDetails: { date: string; partenaire: string; produit: string; quantite: number; prixUnitaire: number; fraisLivraison: number; total: number; statut: string }[]
  }
  achats: { coutTotal: number; parFournisseur: { name: string; total: number }[] }
  margeBrute: number
  stockFin: { valeurTotale: number; details: { code: string; name: string; unit: string; category: string; quantity: number; valeur: number }[] }
  trading: { resultat: number; operations: number }
}

async function fetchReport(year: number, month: number): Promise<Report> {
  const r = await fetch(`/api/reports/monthly?year=${year}&month=${month}`, { cache: "no-store" })
  if (!r.ok) throw new Error("Erreur")
  return r.json()
}

const MOIS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: moisLabel(i) }))

export function ReportsModule() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const { data, isLoading } = useQuery({ queryKey: ["report", year, month], queryFn: () => fetchReport(Number(year), Number(month)) })

  function exportCSV() {
    if (!data) return
    const lignes: string[] = []
    lignes.push(`Bilan mensuel — ${moisLabel(Number(month) - 1)} ${year}`)
    lignes.push("")
    lignes.push("VENTES")
    lignes.push(`CA total,${data.ventes.caTotal}`)
    lignes.push(`Encaissé,${data.ventes.paidTotal}`)
    lignes.push(`Nombre de ventes,${data.ventes.count}`)
    lignes.push("")
    lignes.push("Par partenaire")
    lignes.push("Partenaire,Type,Quantité,CA")
    data.ventes.parPartenaire.forEach((p) => lignes.push(`${p.name},${p.type === "RESELLER" ? "Revendeur" : "Vendeur"},${p.qty},${p.ca}`))
    lignes.push("")
    lignes.push("Par produit")
    lignes.push("Produit,Quantité,CA")
    data.ventes.parProduit.forEach((p) => lignes.push(`${p.name},${p.qty},${p.ca}`))
    lignes.push("")
    lignes.push("ACHATS")
    lignes.push(`Coût total,${data.achats.coutTotal}`)
    data.achats.parFournisseur.forEach((f) => lignes.push(`${f.name},${f.total}`))
    lignes.push("")
    lignes.push(`Marge brute,${data.margeBrute}`)
    lignes.push(`Résultat trading,${data.trading.resultat}`)
    lignes.push(`Valeur stock fin de mois,${data.stockFin.valeurTotale}`)

    const blob = new Blob(["\ufeff" + lignes.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bilan_${year}_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV téléchargé")
  }

  function exportJSON() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bilan_${year}_${month}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Export JSON téléchargé (transmis au comptable)")
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de période + exports */}
      <Card>
        <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            <span className="font-semibold">Bilan mensuel</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MOIS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}><FileDown className="w-4 h-4 mr-1" /> Excel (CSV)</Button>
            <Button variant="outline" size="sm" onClick={exportJSON} disabled={!data}><FileDown className="w-4 h-4 mr-1" /> PDF/JSON</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !data ? null : (
        <>
          {/* Synthèse */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={Coins} label="CA du mois" value={formatMGA(data.ventes.caTotal)} sub={`${data.ventes.count} ventes`} />
            <SummaryCard icon={Truck} label="Achats matières" value={formatMGA(data.achats.coutTotal)} sub={`${data.achats.parFournisseur.length} fournisseur(s)`} />
            <SummaryCard icon={TrendingUp} label="Marge brute" value={formatMGA(data.margeBrute)} sub={`${data.ventes.caTotal > 0 ? ((data.margeBrute / data.ventes.caTotal) * 100).toFixed(0) : 0} %`} positive={data.margeBrute >= 0} />
            <SummaryCard icon={Package} label="Valeur stock fin" value={formatMGA(data.stockFin.valeurTotale)} sub={`${data.stockFin.details.length} produits`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Ventes par partenaire */}
            <Card className="overflow-hidden">
              <CardHeader><CardTitle className="text-base">Ventes par partenaire</CardTitle><CardDescription>{data.ventes.parPartenaire.length} partenaire(s) actif(s)</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Partenaire</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">CA</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(data.ventes.parPartenaire ?? []).map((p) => (
                      <TableRow key={p.code}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.type === "RESELLER" ? "Revendeur" : "Vendeur"}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{formatQty(p.qty)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMGA(p.ca)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Ventes par produit */}
            <Card className="overflow-hidden">
              <CardHeader><CardTitle className="text-base">Ventes par produit</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">CA</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(data.ventes.parProduit ?? []).map((p) => (
                      <TableRow key={p.code}>
                        <TableCell><span className="font-mono font-medium">{p.code}</span> <span className="text-xs text-muted-foreground ml-2">{p.name}</span></TableCell>
                        <TableCell className="text-right text-sm">{formatQty(p.qty)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMGA(p.ca)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Achats par fournisseur */}
            <Card className="overflow-hidden">
              <CardHeader><CardTitle className="text-base">Achats par fournisseur</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Fournisseur</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(data.achats.parFournisseur ?? []).map((f) => (
                      <TableRow key={f.name}><TableCell className="font-medium">{f.name}</TableCell><TableCell className="text-right font-semibold">{formatMGA(f.total)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Stock fin de mois */}
            <Card className="overflow-hidden">
              <CardHeader><CardTitle className="text-base">Stock en fin de mois</CardTitle><CardDescription>Valeur : {formatMGA(data.stockFin.valeurTotale)}</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">Valeur</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data.stockFin.details ?? []).map((d) => (
                        <TableRow key={d.code}><TableCell className="font-mono text-sm">{d.code}</TableCell><TableCell className="text-right text-sm">{formatQty(d.quantity, d.unit)}</TableCell><TableCell className="text-right text-sm">{formatMGA(d.valeur)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Détail des ventes */}
          <Card className="overflow-hidden">
            <CardHeader><CardTitle className="text-base">Détail des ventes du mois</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[80px]">Date</TableHead><TableHead>Partenaire</TableHead><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">P.U.</TableHead><TableHead className="text-right">FL</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(data.ventes.ventesDetails ?? []).map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(v.date)}</TableCell>
                        <TableCell className="text-sm">{v.partenaire}</TableCell>
                        <TableCell className="text-sm">{v.produit}</TableCell>
                        <TableCell className="text-right text-sm">{v.quantite}</TableCell>
                        <TableCell className="text-right text-sm">{formatMGA(v.prixUnitaire)}</TableCell>
                        <TableCell className="text-right text-sm">{formatMGA(v.fraisLivraison)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMGA(v.total)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{v.statut === "PAID" ? "Payé" : v.statut === "PARTIAL" ? "Partiel" : "À payer"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub, positive }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; positive?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${positive === false ? "text-rose-600" : positive === true ? "text-emerald-600" : ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}
