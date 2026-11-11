import { db } from "@/lib/db"
import { getCurrentUser, json, requireAuth, audit } from "@/lib/session"

/**
 * GET /api/dashboard
 * KPIs du tableau de bord (section 7.1 du CDC) :
 *  - CA mois courant vs précédent
 *  - Top partenaires et top produits du mois
 *  - Montant total des impayés
 *  - Produits en stock bas
 *  - Valeur du stock de marchandises (activité 2)
 */
export async function GET() {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const now = new Date()
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endPrevMonth = startThisMonth

  const ca = (s: { quantity: number; unitPriceSnapshot: number; deliveryFee: number }) =>
    s.quantity * s.unitPriceSnapshot + s.deliveryFee

  const salesThis = await db.sale.findMany({
    where: { date: { gte: startThisMonth } },
    include: { payments: true },
  })
  const salesPrev = await db.sale.findMany({
    where: { date: { gte: startPrevMonth, lt: endPrevMonth } },
    include: { payments: true },
  })

  const caThisMonth = salesThis.reduce((sum, s) => sum + ca(s), 0)
  const caPrevMonth = salesPrev.reduce((sum, s) => sum + ca(s), 0)
  const caVariation = caPrevMonth > 0 ? ((caThisMonth - caPrevMonth) / caPrevMonth) * 100 : 0

  // Top partenaires
  const partnerMap = new Map<string, { name: string; code: string; total: number }>()
  for (const s of salesThis) {
    const cur = partnerMap.get(s.partnerId) ?? { name: "", code: "", total: 0 }
    cur.total += ca(s)
    partnerMap.set(s.partnerId, cur)
  }
  const partners = await db.partner.findMany({ where: { id: { in: [...partnerMap.keys()] } } })
  for (const p of partners) {
    const cur = partnerMap.get(p.id)
    if (cur) { cur.name = p.name; cur.code = p.code }
  }
  const topPartners = [...partnerMap.values()].filter((p) => p.name).sort((a, b) => b.total - a.total).slice(0, 5)

  // Top produits
  const productMap = new Map<string, { name: string; code: string; qty: number; total: number }>()
  for (const s of salesThis) {
    const cur = productMap.get(s.productId) ?? { name: "", code: "", qty: 0, total: 0 }
    cur.qty += s.quantity
    cur.total += ca(s)
    productMap.set(s.productId, cur)
  }
  const products = await db.product.findMany({ where: { id: { in: [...productMap.keys()] } } })
  for (const p of products) {
    const cur = productMap.get(p.id)
    if (cur) { cur.name = p.name; cur.code = p.code }
  }
  const topProducts = [...productMap.values()].filter((p) => p.name).sort((a, b) => b.total - a.total).slice(0, 5)

  // Impayés
  const unpaidSales = await db.sale.findMany({
    where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
    include: { payments: true, partner: true },
  })
  let totalImpayes = 0
  for (const s of unpaidSales) {
    totalImpayes += ca(s) - s.payments.reduce((sum, p) => sum + p.amount, 0)
  }
  const enRetard = unpaidSales.filter((s) => {
    if (!s.partner?.paymentTermsDays) return false
    return new Date(s.date.getTime() + s.partner.paymentTermsDays * 86400000) < now
  }).length

  // Stock bas
  const movements = await db.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } })
  const allProducts = await db.product.findMany({ where: { archivedAt: null, category: "FINISHED" } })
  const stockBas = allProducts.map((p) => {
    const mv = movements.find((m) => m.productId === p.id)
    return { id: p.id, code: p.code, name: p.name, unit: p.unit, qty: mv?._sum.quantity ?? 0, minThreshold: p.minThreshold }
  }).filter((p) => p.qty < p.minThreshold)

  // Marchandises trading
  const merchs = await db.merchandise.findMany({
    where: { archivedAt: null },
    include: { operations: true, prices: { orderBy: { date: "desc" }, take: 1 } },
  })
  let valeurStockMarchandises = 0
  let coutAchatTotal = 0
  const merchDetails = merchs.map((m) => {
    const stock = m.operations.reduce((sum, o) => sum + (o.type === "BUY" ? o.quantity : -o.quantity), 0)
    const achats = m.operations.filter((o) => o.type === "BUY")
    const totalAchat = achats.reduce((sum, o) => sum + o.quantity * o.unitPrice + o.fees, 0)
    const totalQtyAchat = achats.reduce((sum, o) => sum + o.quantity, 0)
    const prixMoyen = totalQtyAchat > 0 ? totalAchat / totalQtyAchat : 0
    const dernierPrix = m.prices[0]?.price ?? prixMoyen
    const valeurMarche = stock * dernierPrix
    const gainLatent = valeurMarche - stock * prixMoyen
    valeurStockMarchandises += valeurMarche
    coutAchatTotal += stock * prixMoyen
    return { id: m.id, name: m.name, unit: m.unit, stock, prixMoyen, dernierPrix, valeurMarche, gainLatent }
  })

  // Évolution CA 6 mois
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const allSales6 = await db.sale.findMany({ where: { date: { gte: sixMonthsAgo } } })
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0)
  }
  for (const s of allSales6) {
    const k = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`
    monthMap.set(k, (monthMap.get(k) ?? 0) + ca(s))
  }
  const evolutionCA = [...monthMap.entries()].map(([month, total]) => ({ month, total }))

  return json({
    ca: { thisMonth: caThisMonth, prevMonth: caPrevMonth, variation: caVariation },
    topPartners,
    topProducts,
    impayes: { total: totalImpayes, count: unpaidSales.length, enRetard },
    stockBas,
    marchandises: {
      valeurTotal: valeurStockMarchandises,
      coutAchat: coutAchatTotal,
      gainLatent: valeurStockMarchandises - coutAchatTotal,
      details: merchDetails,
    },
    evolutionCA,
    ventesMois: salesThis.length,
    ventesMoisPrec: salesPrev.length,
  })
}
