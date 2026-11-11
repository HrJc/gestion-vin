import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** GET /api/locations — liste des emplacements. */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("archived") === "1"

  const locations = await db.location.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: "asc" },
  })
  return json(locations)
}

const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().nullable(),
})

/** POST /api/locations — crée un emplacement (admin). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = locationSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const location = await db.location.create({ data: parsed.data })
  await audit(user.id, "Location", location.id, "CREATE", `Création emplacement ${location.name}`)
  return json(location, 201)
}
