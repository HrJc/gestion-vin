"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Package,
  Trophy,
  ArrowRight,
  Loader2,
  ShoppingCart,
} from "lucide-react"
import { formatMGA, formatPct, formatQty, formatDate } from "@/lib/format"
import { useAppStore } from "@/lib/store"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface DashboardData {
  ca: { thisMonth: number; prevMonth: number; variation: number }
  topPartners: { name: string; code: string; total: number }[]
  topProducts: { name: string; code: string; qty: number; total: number }[]
  impayes: { total: number; count: number; enRetard: number }
  stockBas: { id: string; code: string; name: string; unit: string; qty: number; minThreshold: number }[]
  marchandises: { valeurTotal: number; coutAchat: number; gainLatent: number; details: { name: string; stock: number; gainLatent: number }[] }
  evolutionCA: { month: string; total: number }[]
  ventesMois: number
  ventesMoisPrec: number
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard", { cache: "no-store" })
  if (!res.ok) throw new Error("Erreur chargement dashboard")
  return res.json()
}

const MOIS_COURT = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"]

export function DashboardModule() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard })
  const setModule = useAppStore((s) => s.setModule)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const caUp = data.ca.variation >= 0

  const kpis = [
    {
      label: "Chiffre d'affaires du mois",
      value: formatMGA(data.ca.thisMonth),
      sub: `Mois précédent : ${formatMGA(data.ca.prevMonth)}`,
      icon: Wallet,
      trend: data.ca.variation,
      trendUp: caUp,
    },
    {
      label: "Impayés en cours",
      value: formatMGA(data.impayes.total),
      sub: `${data.impayes.count} vente(s) — ${data.impayes.enRetard} en retard`,
      icon: AlertTriangle,
      alert: data.impayes.total > 0,
    },
    {
      label: "Valeur stock marchandises",
      value: formatMGA(data.marchandises.valeurTotal),
      sub: `Gain latent : ${data.marchandises.gainLatent >= 0 ? "+" : "−"}${formatMGA(Math.abs(data.marchandises.gainLatent))}`,
      icon: TrendingUp,
      trendUp: data.marchandises.gainLatent >= 0,
    },
    {
      label: "Stock bas",
      value: `${data.stockBas.length} produit(s)`,
      sub: data.stockBas.length ? "Sous le seuil minimum" : "Tous les stocks sont suffisants",
      icon: Package,
      alert: data.stockBas.length > 0,
    },
  ]

  const chartData = data.evolutionCA.map((d) => {
    const [y, m] = d.month.split("-")
    return { mois: MOIS_COURT[Number(m) - 1] ?? d.month, total: d.total }
  })

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-xs font-medium">{k.label}</CardDescription>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.alert ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-primary/10 text-primary"}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  {k.trend !== undefined && (
                    <Badge variant="secondary" className={`text-[11px] gap-1 ${k.trendUp ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                      {k.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(k.trend)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground truncate">{k.sub}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Graphique CA + Top partenaires */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution du chiffre d&apos;affaires</CardTitle>
            <CardDescription>6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 5 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip
                  formatter={(v: number) => [formatMGA(v), "CA"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} fill="url(#caGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Top partenaires</CardTitle>
              <CardDescription>Mois en cours</CardDescription>
            </div>
            <Trophy className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topPartners.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune vente ce mois</p>
            )}
            {data.topPartners.map((p, i) => {
              const max = data.topPartners[0]?.total ?? 1
              return (
                <div key={p.code} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted text-[10px] flex items-center justify-center font-semibold">{i + 1}</span>
                      <span className="font-medium">{p.code}</span>
                    </span>
                    <span className="font-semibold">{formatMGA(p.total)}</span>
                  </div>
                  <Progress value={(p.total / max) * 100} className="h-1.5" />
                </div>
              )
            })}
            {data.topPartners.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setModule("partners")}>
                Voir tous les partenaires <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top produits + Stock bas + Marchandises */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produits</CardTitle>
            <CardDescription>Mois en cours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune vente</p>
            )}
            {data.topProducts.map((p) => (
              <div key={p.code} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <span className="font-medium">{p.code}</span>
                  <span className="text-muted-foreground text-xs ml-2">{p.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatQty(p.qty)}</div>
                  <div className="text-xs text-muted-foreground">{formatMGA(p.total)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Stock bas</CardTitle>
              <CardDescription>Produits finis sous seuil</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setModule("stock")}>
              Stock <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.stockBas.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm text-muted-foreground">Tous les stocks sont suffisants</p>
              </div>
            )}
            {data.stockBas.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <span className="font-medium">{p.code}</span>
                  <span className="text-muted-foreground text-xs ml-2">{p.name}</span>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  {formatQty(p.qty, p.unit)} / {formatQty(p.minThreshold, p.unit)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marchandises (trading)</CardTitle>
            <CardDescription>Valeur au dernier prix du marché</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-muted-foreground">Valeur totale</span>
              <span className="text-lg font-bold">{formatMGA(data.marchandises.valeurTotal)}</span>
            </div>
            {data.marchandises.details.slice(0, 4).map((m) => (
              <div key={m.name} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="font-medium truncate">{m.name}</span>
                <span className={`font-semibold text-xs ${m.gainLatent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {m.gainLatent >= 0 ? "+" : "−"}{formatMGA(Math.abs(m.gainLatent))}
                </span>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setModule("trading")}>
              Module achat-vente <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ventes récentes (lien rapide) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Ventes du mois</CardTitle>
            <CardDescription>{data.ventesMois} vente(s) ce mois · {data.ventesMoisPrec} le mois dernier</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setModule("sales")}>
            <ShoppingCart className="w-4 h-4 mr-2" /> Saisir une vente
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}
