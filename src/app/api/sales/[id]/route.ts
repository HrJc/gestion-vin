import { db } from "@/lib/db"
import { json, requireAuth, error } from "@/lib/session"
import { saleTotal } from "@/lib/format"

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
