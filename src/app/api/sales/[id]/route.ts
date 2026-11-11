import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { saleTotal } from "@/lib/format"
import { z } from "zod"

/** GET /api/sales/[id] — détail d'une vente avec paiements. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const sale = await db.sale.findUnique({
    where: { id },
    include: { partner: true, product: true, payments: { orderBy: { date: "desc" } } },
  })
  if (!sale) return error("Vente introuvable", 404)

  const total = saleTotal(sale.quantity, sale.unitPriceSnapshot, sale.deliveryFee)
  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0)
  return json({ ...sale, total, paid, due: total - paid })
}

const updateSchema = z.object({
  deliveredClient: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]).optional(),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY"]).optional().nullable(),
})

/** PATCH /api/sales/[id] — modifie une vente (note, client livré, statut). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const sale = await db.sale.update({ where: { id }, data: parsed.data })
  await audit(user.id, "Sale", id, "UPDATE", `Modification vente ${sale.id.slice(-6)}`)
  return json(sale)
}

/**
 * DELETE /api/sales/[id] — annule une vente.
 * Crée un mouvement de stock inverse (réintégration) et archive la vente.
 * Les paiements ne sont pas supprimés (historique conservé).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const sale = await db.sale.findUnique({ where: { id }, include: { payments: true } })
  if (!sale) return error("Vente introuvable", 404)

  // Transaction : mouvement inverse + marquage annulée
  await db.$transaction(async (tx) => {
    // Réintégration du stock (mouvement inverse positif)
    await tx.stockMovement.create({
      data: {
        productId: sale.productId,
        type: "ADJUST",
        quantity: sale.quantity, // positif = réintégration
        motif: "Annulation vente",
        note: `Annulation vente ${sale.id.slice(-6)} — stock réintégré`,
        date: new Date(),
        createdBy: user.id,
      },
    })
    // Marquer la vente comme annulée (note + statut)
    await tx.sale.update({
      where: { id },
      data: {
        note: `[ANNULÉE ${new Date().toLocaleDateString("fr-FR")}] ${sale.note ?? ""}`.trim(),
        paymentStatus: "UNPAID",
      },
    })
  })

  await audit(user.id, "Sale", id, "ARCHIVE", `Annulation vente ${id.slice(-6)} — stock réintégré`)
  return json({ ok: true })
}
