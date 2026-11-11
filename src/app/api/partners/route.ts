import { db } from "@/lib/db"
import { json, requireAuth, audit, error } from "@/lib/session"
import { z } from "zod"

/** GET /api/partners — liste des partenaires (actifs par défaut). */
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("archived") === "1"

  const partners = await db.partner.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    include: {
      prices: {
        where: { validTo: null },
        include: { product: true },
      },
      _count: { select: { sales: true } },
    },
    orderBy: { name: "asc" },
  })

  return json(partners)
}

const partnerSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  type: z.enum(["RESELLER", "VENDOR"]),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  paymentTermsDays: z.number().int().min(0).default(0),
  discountPct: z.number().min(0).max(100).default(0),
})

/** POST /api/partners — crée un partenaire (admin seulement). */
export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response || !user) return response
  if (user.role !== "ADMIN") return error("Réservé aux administrateurs", 403)

  const body = await req.json().catch(() => null)
  const parsed = partnerSchema.safeParse(body)
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Données invalides", 422)

  const d = parsed.data
  const exists = await db.partner.findUnique({ where: { code: d.code } })
  if (exists) return error("Ce code partenaire existe déjà", 409)

  const partner = await db.partner.create({
    data: {
      code: d.code,
      name: d.name,
      type: d.type,
      phone: d.phone ?? null,
      address: d.address ?? null,
      zone: d.zone ?? null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      paymentTermsDays: d.paymentTermsDays,
      discountPct: d.discountPct,
    },
  })
  await audit(user.id, "Partner", partner.id, "CREATE", `Création partenaire ${partner.code}`)
  return json(partner, 201)
}
