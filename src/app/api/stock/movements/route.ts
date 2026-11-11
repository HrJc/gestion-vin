import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/**
 * GET /api/stock/movements — historique des mouvements (filtrable).
 */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId") ?? undefined
  const type = searchParams.get("type") ?? undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500)

  const where: Record<string, unknown> = {}
  if (productId) where.productId = productId
  if (type) where.type = type
  if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = new Date(from)
    if (to) (where.date as Record<string, unknown>).lte = new Date(to)
  }

  const movements = await db.stockMovement.findMany({
    where,
    include: {
      product: true,
      supplier: true,
      locationFrom: true,
      locationTo: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  return json(movements)
}

const movementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["IN", "OUT", "TRANSFER", "PRODUCTION", "ADJUST"]),
  quantity: z.number(), // signé : + entrée, - sortie
  unitPrice: z.number().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  locationFromId: z.string().optional().nullable(),
  locationToId: z.string().optional().nullable(),
  motif: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  date: z.string().optional(),
})

/**
 * POST /api/stock/movements — enregistre un mouvement de stock.
 * Aucun mouvement n'est supprimé : une erreur se corrige par un mouvement inverse (section 5.2).
 */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const body = await req.json().catch(() => null)
  const parsed = movementSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const d = parsed.data

  // Validation : les sorties doivent être négatives, les entrées positives
  if ((d.type === "IN" || d.type === "PRODUCTION") && d.quantity < 0) {
    return error("Une entrée doit avoir une quantité positive", 422)
  }
  if (d.type === "OUT" && d.quantity > 0) {
    return error("Une sortie doit avoir une quantité négative", 422)
  }

  const movement = await db.stockMovement.create({
    data: {
      productId: d.productId,
      type: d.type,
      quantity: d.quantity,
      unitPrice: d.unitPrice ?? null,
      supplierId: d.supplierId ?? null,
      locationFromId: d.locationFromId ?? null,
      locationToId: d.locationToId ?? null,
      motif: d.motif ?? null,
      note: d.note ?? null,
      date: d.date ? new Date(d.date) : new Date(),
      createdBy: user.id,
    },
    include: { product: true },
  })

  await audit(user.id, "StockMovement", movement.id, "CREATE", `${d.type} ${d.quantity} ${movement.product.code}`)
  return json(movement, 201)
}
