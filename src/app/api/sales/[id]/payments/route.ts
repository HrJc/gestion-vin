import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"
import { saleTotal } from "@/lib/format"

/**
 * GET /api/sales/[id]/payments — liste des paiements d'une vente.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const payments = await db.payment.findMany({
    where: { saleId: id },
    orderBy: { date: "desc" },
  })
  return json(payments)
}

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "MOBILE_MONEY"]),
  note: z.string().optional().nullable(),
})

/**
 * POST /api/sales/[id]/payments — enregistre un paiement reçu (total ou partiel).
 * Met à jour automatiquement le statut de la vente (PAID / PARTIAL / UNPAID).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const sale = await db.sale.findUnique({
    where: { id },
    include: { payments: true },
  })
  if (!sale) return error("Vente introuvable", 404)

  const total = saleTotal(sale.quantity, sale.unitPriceSnapshot, sale.deliveryFee)

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        saleId: id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        note: parsed.data.note ?? null,
        createdBy: user.id,
      },
    })

    // Recalcule le statut
    const allPayments = await tx.payment.findMany({ where: { saleId: id } })
    const paid = allPayments.reduce((sum, p) => sum + p.amount, 0)
    let status: "PAID" | "PARTIAL" | "UNPAID"
    if (paid >= total - 1) status = "PAID"
    else if (paid > 0) status = "PARTIAL"
    else status = "UNPAID"

    await tx.sale.update({ where: { id }, data: { paymentStatus: status } })
    return { payment, status, paid }
  })

  await audit(user.id, "Payment", result.payment.id, "CREATE", `Paiement ${parsed.data.amount} Ar — vente ${id.slice(-6)}`)
  return json(result, 201)
}
