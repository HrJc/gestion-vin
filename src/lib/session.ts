import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

/** Récupère la session serveur courante. */
export async function getSession() {
  return getServerSession(authOptions)
}

/** Récupère l'utilisateur courant (avec son rôle) ou null. */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user?.id) return null
  return session.user as { id: string; name?: string | null; email?: string | null; role: string }
}

/** Vérifie l'auth ; renvoie l'utilisateur ou une réponse 401. */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    }
  }
  return { user, response: null }
}

/** Vérifie que l'utilisateur a l'un des rôles requis. */
export async function requireRole(...roles: string[]) {
  const { user, response } = await requireAuth()
  if (response || !user) return { user: null, response }
  if (!roles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    }
  }
  return { user, response: null }
}

/** Réponse JSON standard avec en-têtes de cache désactivés (données temps réel). */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  })
}

/** Erreur JSON standard. */
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**ID système par défaut (fallback si pas de session, ex. seed). */
export const SYSTEM_USER_ID = "system"

/** Enregistre une entrée d'audit. */
export async function audit(
  userId: string | null | undefined,
  entity: string,
  entityId: string,
  action: string,
  summary?: string,
) {
  try {
    await db.auditLog.create({
      data: { userId: userId || null, entity, entityId, action, summary },
    })
  } catch {
    // L'audit ne doit jamais casser le flux principal
  }
}
