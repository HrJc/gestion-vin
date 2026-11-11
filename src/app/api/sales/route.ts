import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"
import { saleTotal } from "@/lib/format"

/**
 * GET /api/sales — liste des ventes avec filtres (partenaire, produit, période, statut).
 */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const partnerId = searchParams.get("partnerId") ?? undefined
  const productId = searchParams.get("productId") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500)

  const where: Record<string, unknown> = {}
  if (partnerId) where.partnerId = partnerId
  if (productId) where.productId = productId
  if (status) where.paymentStatus = status
  if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = new Date(from)
    if (to) (where.date as Record<string, unknown>).lte = new Date(to)
  }

  // Les employés ne voient que leurs propres saisies
  if (user.role === "EMPLOYEE") where.createdBy = user.id

  const sales = await db.sale.findMany({
    where,
    include: {
      partner: true,
      product: true,
      payments: { orderBy: { date: "desc" } },
    },
    orderBy: { date: "desc" },
    take: limit,
  })

  // Enrichit avec le montant payé et le reste dû
  const enriched = sales.map((s) => {
    const total = saleTotal(s.quantity, s.unitPriceSnapshot, s.deliveryFee)
    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0)
    return { ...s, total, paid, due: total - paid }
  })

  return json(enriched)
}

const saleSchema = z.object({
  partnerId: z.string().min(1),
  deliveredClient: z.string().optional().nullable(),
  productId: z.string().min(1),
  quantity: z.number().positive(),
  deliveryFee: z.number().min(0).default(0),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY"]).optional().nullable(),
  note: z.string().optional().nullable(),
  /** Prix unitaire forcé manuellement (note obligatoire si différent de la grille). */
  unitPriceOverride: z.number().positive().optional().nullable(),
  date: z.string().optional(),
})

/**
 * POST /api/sales — saisie rapide d'une vente.
 * Le prix unitaire est calculé automatiquement depuis la grille du partenaire,
 * sauf si unitPriceOverride est fourni (note obligatoire dans ce cas).
 * Décrémente automatiquement le stock (lien ventes-stock, section 4.4).
 */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const body = await req.json().catch(() => null)
  const parsed = saleSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const d = parsed.data

  // Récupère le prix en cours dans la grille du partenaire
  const priceGrid = await db.priceGrid.findFirst({
    where: { partnerId: d.partnerId, productId: d.productId, validTo: null },
  })
  if (!priceGrid) {
    return error(
      "Aucun prix défini pour ce produit chez ce partenaire. Ajoutez d'abord un prix dans la grille.",
      422,
    )
  }

  // Prix appliqué : override manuel ou prix de grille (avec remise)
  let unitPrice: number
  if (d.unitPriceOverride != null) {
    if (!d.note || d.note.trim().length === 0) {
      return error("Une note est obligatoire quand le prix est modifié manuellement", 422)
    }
    unitPrice = d.unitPriceOverride
  } else {
    unitPrice = priceGrid.unitPrice
    // La remise % est appliquée sur le total (pas sur le prix unitaire) — on garde le snapshot du prix brut
  }

  // Transaction atomique : vente + paiement + mouvement de stock
  const saleDate = d.date ? new Date(d.date) : new Date()

  const result = await db.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        partnerId: d.partnerId,
        deliveredClient: d.deliveredClient ?? null,
        productId: d.productId,
        quantity: d.quantity,
        unitPriceSnapshot: unitPrice,
        deliveryFee: d.deliveryFee,
        paymentStatus: d.paymentStatus,
        paymentMethod: d.paymentMethod ?? null,
        note: d.note ?? null,
        date: saleDate,
        createdBy: user.id,
      },
    })

    // Paiement initial si payé ou partiel
    if (d.paymentStatus !== "UNPAID") {
      const total = saleTotal(d.quantity, unitPrice, d.deliveryFee)
      const amount = d.paymentStatus === "PAID" ? total : Math.round(total * 0.5)
      await tx.payment.create({
        data: {
          saleId: sale.id,
          amount,
          method: d.paymentMethod ?? "CASH",
          createdBy: user.id,
          date: saleDate,
          note: d.paymentStatus === "PARTIAL" ? "Acompte 50 %" : null,
        },
      })
    }

    // Lien ventes-stock : décrémente le stock (mouvement OUT immuable)
    await tx.stockMovement.create({
      data: {
        productId: d.productId,
        type: "OUT",
        quantity: -d.quantity,
        motif: "Vente",
        note: `Vente ${sale.id.slice(-6)} — ${d.deliveredClient ?? "partenaire"}`,
        date: saleDate,
        createdBy: user.id,
      },
    })

    return sale
  })

  await audit(user.id, "Sale", result.id, "CREATE", `Vente ${d.quantity} × produit ${d.productId}`)
  return json(result, 201)
}
