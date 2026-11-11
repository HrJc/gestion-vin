import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/**
 * GET /api/trading/prices?merchandiseId=... — historique des prix du marché.
 */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const merchId = searchParams.get("merchandiseId")

  const prices = await db.marketPrice.findMany({
    where: merchId ? { merchandiseId: merchId } : {},
    include: { merchandise: true },
    orderBy: { date: "asc" },
  })
  return json(prices)
}

const priceSchema = z.object({
  merchandiseId: z.string().min(1),
  price: z.number().positive(),
})

/**
 * POST /api/trading/prices — saisit un nouveau prix du marché (section 6.1).
 */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const body = await req.json().catch(() => null)
  const parsed = priceSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const price = await db.marketPrice.create({
    data: {
      merchandiseId: parsed.data.merchandiseId,
      price: parsed.data.price,
      createdBy: user.id,
    },
    include: { merchandise: true },
  })
  await audit(user.id, "MarketPrice", price.id, "CREATE", `Prix marché ${price.merchandise.name} = ${price.price} Ar`)
  return json(price, 201)
}
