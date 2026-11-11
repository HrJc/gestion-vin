import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

const updateSchema = z.object({
  type: z.enum(["BUY", "SELL"]).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  fees: z.number().min(0).optional(),
  counterparty: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY"]).optional().nullable(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]).optional(),
  note: z.string().optional().nullable(),
})

/** PATCH /api/trading/operations/[id] — modifie une opération trading. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const op = await db.tradeOperation.update({ where: { id }, data: parsed.data, include: { merchandise: true } })
  await audit(user.id, "TradeOperation", id, "UPDATE", `Modification opération ${op.merchandise.name}`)
  return json(op)
}

/** DELETE /api/trading/operations/[id] — supprime une opération trading. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  await db.tradeOperation.delete({ where: { id } })
  await audit(user.id, "TradeOperation", id, "DELETE", `Suppression opération trading`)
  return json({ ok: true })
}
