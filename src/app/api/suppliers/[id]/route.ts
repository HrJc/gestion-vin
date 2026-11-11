import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)
  const supplier = await db.supplier.update({ where: { id }, data: parsed.data })
  await audit(user.id, "Supplier", id, "UPDATE", `Modification fournisseur ${supplier.name}`)
  return json(supplier)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params
  const supplier = await db.supplier.update({ where: { id }, data: { archivedAt: new Date() } })
  await audit(user.id, "Supplier", id, "ARCHIVE", `Archivage fournisseur ${supplier.name}`)
  return json({ ok: true })
}
