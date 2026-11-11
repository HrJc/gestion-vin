import { db } from "@/lib/db"
import { json, requireAuth, error } from "@/lib/session"
import { saleTotal } from "@/lib/format"

/**
 * GET /api/reports/monthly?year=2026&month=10
 * Bilan mensuel automatique (section 7.2 du CDC) :
 *  - Ventes par partenaire, par produit et par type
 *  - Achats de matières premières par fournisseur
 *  - Marge brute (ventes - coût des matières consommées)
 *  - État du stock en fin de mois
 *  - Résultat trading du mois
 */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = Number(searchParams.get("year") ?? now.getFullYear())
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1) // 1-12

  if (month < 1 || month > 12) return error("Mois invalide", 422)

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  // --- Ventes du mois ---
  const sales = await db.sale.findMany({
    where: { date: { gte: start, lt: end } },
    include: { partner: true, product: true, payments: true },
  })

  const caTotal = sales.reduce((s, v) => s + saleTotal(v.quantity, v.unitPriceSnapshot, v.deliveryFee), 0)
  const paidTotal = sales.reduce(
    (s, v) => s + v.payments.reduce((a, p) => a + p.amount, 0),
    0,
  )

  // Ventes par partenaire
  const parPartenaire = new Map<string, { name: string; code: string; type: string; ca: number; qty: number }>()
  for (const v of sales) {
    const cur = parPartenaire.get(v.partnerId) ?? { name: v.partner.name, code: v.partner.code, type: v.partner.type, ca: 0, qty: 0 }
    cur.ca += saleTotal(v.quantity, v.unitPriceSnapshot, v.deliveryFee)
    cur.qty += v.quantity
    parPartenaire.set(v.partnerId, cur)
  }

  // Ventes par produit
  const parProduit = new Map<string, { name: string; code: string; ca: number; qty: number }>()
  for (const v of sales) {
    const cur = parProduit.get(v.productId) ?? { name: v.product.name, code: v.product.code, ca: 0, qty: 0 }
    cur.ca += saleTotal(v.quantity, v.unitPriceSnapshot, v.deliveryFee)
    cur.qty += v.quantity
    parProduit.set(v.productId, cur)
  }

  // Ventes par type de partenaire
  const parType = { RESELLER: 0, VENDOR: 0 }
  for (const v of sales) {
    parType[v.partner.type] += saleTotal(v.quantity, v.unitPriceSnapshot, v.deliveryFee)
  }

  // --- Achats matières premières par fournisseur (mouvements IN du mois) ---
  const achats = await db.stockMovement.findMany({
    where: { type: "IN", date: { gte: start, lt: end } },
    include: { supplier: true, product: true },
  })
  const parFournisseur = new Map<string, { name: string; total: number }>()
  let coutAchatMatieres = 0
  for (const a of achats) {
    const cout = Math.abs(a.quantity) * (a.unitPrice ?? 0)
    coutAchatMatieres += cout
    const key = a.supplierId ?? "—"
    const cur = parFournisseur.get(key) ?? { name: a.supplier?.name ?? "Sans fournisseur", total: 0 }
    cur.total += cout
    parFournisseur.set(key, cur)
  }

  // --- Marge brute = ventes - coût des matières consommées ---
  // Estimation : coût des matières = achats du mois (simplification, le vrai calcul CUMP nécessiterait plus)
  const margeBrute = caTotal - coutAchatMatieres

  // --- État du stock à fin du mois ---
  const movementsUpToEnd = await db.stockMovement.findMany({
    where: { date: { lt: end } },
    select: { productId: true, quantity: true },
  })
  const stockByProduct = new Map<string, number>()
  for (const m of movementsUpToEnd) {
    stockByProduct.set(m.productId, (stockByProduct.get(m.productId) ?? 0) + m.quantity)
  }
  const products = await db.product.findMany({ where: { archivedAt: null } })
  let valeurStockFin = 0
  const etatStock = products.map((p) => {
    const qty = stockByProduct.get(p.id) ?? 0
    const valeur = qty * p.defaultPurchasePrice
    valeurStockFin += valeur
    return { code: p.code, name: p.name, unit: p.unit, category: p.category, quantity: qty, valeur }
  })

  // --- Résultat trading du mois ---
  const tradeOps = await db.tradeOperation.findMany({
    where: { date: { gte: start, lt: end } },
    include: { merchandise: true },
  })
  let resultatTrading = 0
  for (const o of tradeOps) {
    if (o.type === "SELL") {
      // Gain réalisé approximatif = CA - frais (le CUMP exact est dans le module trading)
      resultatTrading += o.quantity * o.unitPrice - o.fees
    } else {
      resultatTrading -= o.quantity * o.unitPrice + o.fees
    }
  }

  return json({
    periode: { year, month, label: `${month}/${year}` },
    ventes: {
      caTotal,
      paidTotal,
      count: sales.length,
      parPartenaire: [...parPartenaire.values()].sort((a, b) => b.ca - a.ca),
      parProduit: [...parProduit.values()].sort((a, b) => b.ca - a.ca),
      parType,
      ventesDetails: sales.map((v) => ({
        date: v.date,
        partenaire: v.partner.name,
        produit: v.product.name,
        quantite: v.quantity,
        prixUnitaire: v.unitPriceSnapshot,
        fraisLivraison: v.deliveryFee,
        total: saleTotal(v.quantity, v.unitPriceSnapshot, v.deliveryFee),
        statut: v.paymentStatus,
      })),
    },
    achats: {
      coutTotal: coutAchatMatieres,
      parFournisseur: [...parFournisseur.values()].sort((a, b) => b.total - a.total),
    },
    margeBrute,
    stockFin: { valeurTotale: valeurStockFin, details: etatStock },
    trading: { resultat: resultatTrading, operations: tradeOps.length },
  })
}
