import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/**
 * GET /api/trading/operations — historique des opérations trading.
 */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const merchId = searchParams.get("merchandiseId") ?? undefined
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500)

  const ops = await db.tradeOperation.findMany({
    where: merchId ? { merchandiseId: merchId } : {},
    include: { merchandise: true },
    orderBy: { date: "desc" },
    take: limit,
  })
  return json(ops)
}

const opSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  merchandiseId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  fees: z.number().min(0).default(0),
  counterparty: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY"]).optional().nullable(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]),
  note: z.string().optional().nullable(),
  date: z.string().optional(),
})

/**
 * POST /api/trading/operations — saisit une opération d'achat ou de vente.
 */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const body = await req.json().catch(() => null)
  const parsed = opSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const d = parsed.data
  const op = await db.tradeOperation.create({
    data: {
      type: d.type,
      merchandiseId: d.merchandiseId,
      quantity: d.quantity,
      unitPrice: d.unitPrice,
      fees: d.fees,
      counterparty: d.counterparty ?? null,
      paymentMethod: d.paymentMethod ?? null,
      paymentStatus: d.paymentStatus,
      note: d.note ?? null,
      date: d.date ? new Date(d.date) : new Date(),
      createdBy: user.id,
    },
    include: { merchandise: true },
  })
  await audit(user.id, "TradeOperation", op.id, "CREATE", `${d.type} ${d.quantity} ${op.merchandise.name}`)
  return json(op, 201)
}
