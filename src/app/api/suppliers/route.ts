import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** GET /api/suppliers — liste des fournisseurs. */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("archived") === "1"

  const suppliers = await db.supplier.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: { name: "asc" },
  })
  return json(suppliers)
}

const supplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
})

/** POST /api/suppliers — crée un fournisseur (admin). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = supplierSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const supplier = await db.supplier.create({ data: parsed.data })
  await audit(user.id, "Supplier", supplier.id, "CREATE", `Création fournisseur ${supplier.name}`)
  return json(supplier, 201)
}
