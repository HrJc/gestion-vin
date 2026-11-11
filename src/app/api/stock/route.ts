import { db } from "@/lib/db"
import { json, requireAuth } from "@/lib/session"

/**
 * GET /api/stock — stock courant calculé à partir des mouvements.
 * Quantité par produit + valeur (à partir des prix d'achat).
 * Section 5.3 du CDC.
 */
export async function GET() {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const products = await db.product.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  })

  const movements = await db.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
  })

  // Valeur du stock : on utilise le dernier prix d'achat connu (mouvement IN/PRODUCTION avec unitPrice)
  const lastPrices = await db.stockMovement.findMany({
    where: { type: { in: ["IN", "PRODUCTION"] }, unitPrice: { not: null } },
    orderBy: { date: "desc" },
    distinct: ["productId"],
  })
  const priceMap = new Map<string, number>()
  for (const m of lastPrices) {
    if (m.unitPrice != null) priceMap.set(m.productId, m.unitPrice)
  }

  let valeurTotale = 0
  const stock = products.map((p) => {
    const mv = movements.find((m) => m.productId === p.id)
    const qty = mv?._sum.quantity ?? 0
    const prix = priceMap.get(p.id) ?? p.defaultPurchasePrice
    const valeur = qty * prix
    valeurTotale += valeur
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      unit: p.unit,
      minThreshold: p.minThreshold,
      quantity: qty,
      prixUnitaire: prix,
      valeur,
      lowStock: qty < p.minThreshold,
    }
  })

  return json({ items: stock, valeurTotale })
}
