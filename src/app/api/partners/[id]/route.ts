import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** GET /api/partners/[id] — détail d'un partenaire avec historique des prix. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { id } = await params

  const partner = await db.partner.findUnique({
    where: { id },
    include: {
      prices: { include: { product: true }, orderBy: { validFrom: "desc" } },
      sales: { orderBy: { date: "desc" }, take: 20, include: { product: true, payments: true } },
    },
  })
  if (!partner) return error("Partenaire introuvable", 404)
  return json(partner)
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["RESELLER", "VENDOR"]).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  paymentTermsDays: z.number().int().min(0).optional(),
  discountPct: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
})

/** PATCH /api/partners/[id] — modifie un partenaire (admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const partner = await db.partner.update({ where: { id }, data: parsed.data })
  await audit(user.id, "Partner", id, "UPDATE", `Modification partenaire ${partner.code}`)
  return json(partner)
}

/** DELETE /api/partners/[id] — archive (jamais de suppression définitive). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params

  const partner = await db.partner.update({
    where: { id },
    data: { archivedAt: new Date(), active: false },
  })
  await audit(user.id, "Partner", id, "ARCHIVE", `Archivage partenaire ${partner.code}`)
  return json({ ok: true })
}
