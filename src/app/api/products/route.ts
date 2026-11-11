import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** GET /api/products — liste des produits (actifs par défaut). */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("archived") === "1"
  const category = searchParams.get("category") ?? undefined

  const products = await db.product.findMany({
    where: {
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  })
  return json(products)
}

const productSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  category: z.enum(["RAW_MATERIAL", "FINISHED"]),
  unit: z.string().min(1),
  minThreshold: z.number().min(0).default(0),
  defaultPurchasePrice: z.number().min(0).default(0),
})

/** POST /api/products — crée un produit (admin). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const exists = await db.product.findUnique({ where: { code: parsed.data.code } })
  if (exists) return error("Ce code produit existe déjà", 409)

  const product = await db.product.create({ data: parsed.data })
  await audit(user.id, "Product", product.id, "CREATE", `Création produit ${product.code}`)
  return json(product, 201)
}
