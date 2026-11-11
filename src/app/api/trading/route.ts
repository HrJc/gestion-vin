import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/**
 * GET /api/trading — écran principal du module achat-vente (section 6.5).
 * Valeur totale, liste des marchandises avec variation de prix en couleur,
 * gains/pertes latents et réalisés.
 */
export async function GET() {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const merchs = await db.merchandise.findMany({
    where: { archivedAt: null },
    include: {
      operations: { orderBy: { date: "desc" } },
      prices: { orderBy: { date: "desc" } },
    },
    orderBy: { name: "asc" },
  })

  let valeurTotale = 0
  let coutTotal = 0
  let gainRealiseTotal = 0

  const details = merchs.map((m) => {
    const ops = m.operations
    const stock = ops.reduce((s, o) => s + (o.type === "BUY" ? o.quantity : -o.quantity), 0)
    const achats = ops.filter((o) => o.type === "BUY")
    const ventes = ops.filter((o) => o.type === "SELL")
    const totalAchat = achats.reduce((s, o) => s + o.quantity * o.unitPrice + o.fees, 0)
    const totalQtyAchat = achats.reduce((s, o) => s + o.quantity, 0)
    const prixMoyen = totalQtyAchat > 0 ? totalAchat / totalQtyAchat : 0

    // Prix du marché actuel + précédent (pour la variation)
    const dernierPrix = m.prices[0]?.price ?? prixMoyen
    const prixPrecedent = m.prices[1]?.price ?? dernierPrix
    const variationPct = prixPrecedent > 0 ? ((dernierPrix - prixPrecedent) / prixPrecedent) * 100 : 0

    const valeurMarche = stock * dernierPrix
    const valeurAchat = stock * prixMoyen
    const gainLatent = valeurMarche - valeurAchat

    // Gain réalisé = somme (prix vente - prix achat moyen) × quantité vendue - frais
    const gainRealise = ventes.reduce((s, o) => {
      return s + (o.unitPrice - prixMoyen) * o.quantity - o.fees
    }, 0)

    valeurTotale += valeurMarche
    coutTotal += valeurAchat
    gainRealiseTotal += gainRealise

    const alerte =
      (m.alertHigh != null && dernierPrix >= m.alertHigh) ||
      (m.alertLow != null && dernierPrix <= m.alertLow)

    return {
      id: m.id,
      name: m.name,
      unit: m.unit,
      stock,
      prixMoyen,
      dernierPrix,
      variationPct,
      valeurMarche,
      gainLatent,
      gainRealise,
      alertHigh: m.alertHigh,
      alertLow: m.alertLow,
      alerte,
      historique: m.prices.slice(0, 30).reverse().map((p) => ({ date: p.date, price: p.price })),
    }
  })

  return json({
    valeurTotale,
    coutTotal,
    gainLatentTotal: valeurTotale - coutTotal,
    gainRealiseTotal,
    marchandises: details,
  })
}

const merchSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  alertHigh: z.number().optional().nullable(),
  alertLow: z.number().optional().nullable(),
})

/** POST /api/trading — crée une marchandise suivie (admin). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = merchSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const merch = await db.merchandise.create({ data: parsed.data })
  await audit(user.id, "Merchandise", merch.id, "CREATE", `Création marchandise ${merch.name}`)
  return json(merch, 201)
}
