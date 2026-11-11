import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"
import bcrypt from "bcryptjs"

/** GET /api/users — liste des utilisateurs (admin seulement). */
export async function GET() {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const users = await db.user.findMany({
    where: { archivedAt: null },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  })
  return json(users)
}

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "EMPLOYEE", "PARTNER"]),
  password: z.string().min(6).optional(),
  active: z.boolean().default(true),
})

/** POST /api/users — crée un utilisateur (admin). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = userSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const d = parsed.data
  const exists = await db.user.findUnique({ where: { email: d.email.toLowerCase() } })
  if (exists) return error("Cet email existe déjà", 409)

  const passwordHash = await bcrypt.hash(d.password ?? "changeme123", 10)
  const newUser = await db.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      role: d.role,
      passwordHash,
      active: d.active,
    },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  })
  await audit(user.id, "User", newUser.id, "CREATE", `Création utilisateur ${newUser.email}`)
  return json(newUser, 201)
}
