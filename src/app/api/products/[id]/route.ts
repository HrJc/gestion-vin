import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** PATCH /api/products/[id] — modifie un produit (admin). */
const updateSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).optional(),
  category: z.enum(["RAW_MATERIAL", "FINISHED"]).optional(),
  unit: z.string().min(1).optional(),
  minThreshold: z.number().min(0).optional(),
  defaultPurchasePrice: z.number().min(0).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const product = await db.product.update({ where: { id }, data: parsed.data })
  await audit(user.id, "Product", id, "UPDATE", `Modification produit ${product.code}`)
  return json(product)
}

/** DELETE /api/products/[id] — archive (jamais de suppression définitive). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params

  const product = await db.product.update({ where: { id }, data: { archivedAt: new Date() } })
  await audit(user.id, "Product", id, "ARCHIVE", `Archivage produit ${product.code}`)
  return json({ ok: true })
}
