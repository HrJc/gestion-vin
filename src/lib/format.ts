/**
 * Utilitaires de formatage — Ariary (MGA) + dates françaises
 * Conforme aux exigences locales du CDC (section 8.5)
 */

/** Formate un montant en ariary (MGA) avec séparateur de milliers. */
export function formatMGA(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  if (Number.isNaN(value)) return "0 Ar"
  // Pas de décimales pour l'ariary (montants entiers usuels)
  const rounded = Math.round(value)
  return (
    rounded.toLocaleString("fr-FR", {
      groupingSeparatorUsed: true,
      maximumFractionDigits: 0,
    }) + " Ar"
  )
}

/** Formate un montant avec signe (+ / -) pour les variations. */
export function formatSignedMGA(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${formatMGA(Math.abs(value)).replace(/\s/g, " ")}`
}

/** Variations en pourcentage, signées. */
export function formatPct(value: number | null | undefined): string {
  const v = Number(value ?? 0)
  const sign = v > 0 ? "+" : v < 0 ? "−" : ""
  return `${sign}${Math.abs(v).toFixed(1)} %`
}

/** Date au format JJ/MM/AAAA. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "—"
  const jj = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const aaaa = d.getFullYear()
  return `${jj}/${mm}/${aaaa}`
}

/** Date et heure au format JJ/MM/AAAA HH:MM. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return "—"
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${formatDate(d)} ${hh}:${min}`
}

/** Nom du mois en français. */
const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]

export function formatMois(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`
}

export function moisLabel(index: number): string {
  return MOIS_FR[index] ?? ""
}

/** Clé de regroupement mensuel : "AAAA-MM". */
export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** Convertit une chaîne "AAAA-MM" en objet Date (1er du mois). */
export function monthKeyToDate(key: string): Date {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, 1)
}

/** Quantité formatée avec unité. */
export function formatQty(qty: number | null | undefined, unit?: string): string {
  const v = Number(qty ?? 0)
  const n = Number.isInteger(v)
    ? v.toLocaleString("fr-FR")
    : v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
  return unit ? `${n} ${unit}` : n
}

/** Calcule le total d'une vente : quantité × prix unitaire + frais de livraison. */
export function saleTotal(
  quantity: number,
  unitPrice: number,
  deliveryFee = 0,
  discountPct = 0,
): number {
  const brut = quantity * unitPrice
  const remise = brut * (discountPct / 100)
  return brut - remise + (deliveryFee ?? 0)
}

/** Mappe un code de statut de paiement WhatsApp (OK/NP) vers PaymentStatus. */
export function parseWhatsappStatus(code: string): "PAID" | "UNPAID" | "PARTIAL" {
  const c = code.trim().toUpperCase()
  if (c === "OK" || c === "PAYÉ" || c === "PAYE") return "PAID"
  if (c === "NP" || c === "NON PAYÉ" || c === "NON PAYE") return "UNPAID"
  if (c === "PARTIEL" || c === "PP") return "PARTIAL"
  return "UNPAID"
}

/** Libellé lisible d'un statut de paiement. */
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Payé"
    case "PARTIAL":
      return "Partiel"
    case "UNPAID":
      return "À payer"
    default:
      return status
  }
}

/** Libellé d'un type de partenaire. */
export function partnerTypeLabel(type: string): string {
  return type === "RESELLER" ? "Revendeur" : type === "VENDOR" ? "Vendeur" : type
}

/** Couche le statut de paiement en classes Tailwind (badge). */
export function paymentStatusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    case "PARTIAL":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    case "UNPAID":
    default:
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
  }
}
