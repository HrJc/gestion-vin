import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"
import bcrypt from "bcryptjs"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE", "PARTNER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    delete data.password
  }
  if (parsed.data.email) data.email = parsed.data.email.toLowerCase()

  const updated = await db.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, active: true } })
  await audit(user.id, "User", id, "UPDATE", `Modification utilisateur ${updated.email}`)
  return json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)
  const { id } = await params
  if (id === user.id) return error("Vous ne pouvez pas vous désactiver vous-même", 422)
  const target = await db.user.update({ where: { id }, data: { archivedAt: new Date(), active: false } })
  await audit(user.id, "User", id, "ARCHIVE", `Désactivation utilisateur ${target.email}`)
  return json({ ok: true })
}
