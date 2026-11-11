import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/**
 * GET /api/partners/[id]/prices — historique complet des prix d'un partenaire.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const prices = await db.priceGrid.findMany({
    where: { partnerId: id },
    include: { product: true },
    orderBy: { validFrom: "desc" },
  })
  return json(prices)
}

const priceSchema = z.object({
  productId: z.string().min(1),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).default(0),
})

/**
 * POST /api/partners/[id]/prices — ajoute un prix.
 * Ferme automatiquement le prix précédent (validTo) sans toucher aux ventes passées.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = priceSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  // Ferme le prix en cours pour ce produit/partenaire
  await db.priceGrid.updateMany({
    where: { partnerId: id, productId: parsed.data.productId, validTo: null },
    data: { validTo: new Date() },
  })

  const price = await db.priceGrid.create({
    data: {
      partnerId: id,
      productId: parsed.data.productId,
      unitPrice: parsed.data.unitPrice,
      discountPct: parsed.data.discountPct,
      validFrom: new Date(),
    },
    include: { product: true },
  })
  await audit(user.id, "PriceGrid", price.id, "CREATE", `Nouveau prix ${price.product.code} = ${price.unitPrice} Ar`)
  return json(price, 201)
}
