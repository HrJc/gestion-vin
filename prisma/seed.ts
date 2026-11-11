/**
 * Seed — données de démonstration conformes au CDC.
 * - Comptes : 2 admins + 1 employé
 * - Partenaires : NLS, BEAHITSE, THM (exemples du CDC section 4.6)
 * - Produits : D, L, SV (vin en vrac) + matières premières
 * - Grille de prix par partenaire (illustrant les prix différents)
 * - Ventes + paiements exemples
 * - Mouvements de stock + inventaire
 * - Marchandises trading + prix + opérations
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Début du seed…")

  // ---- Utilisateurs ----
  const pwdAdmin = await bcrypt.hash("admin123", 10)
  const pwdEmp = await bcrypt.hash("employe123", 10)

  const admin1 = await db.user.upsert({
    where: { email: "admin@domaine.mg" },
    update: {},
    create: {
      email: "admin@domaine.mg",
      name: "Rakoto (dirigeant)",
      passwordHash: pwdAdmin,
      role: "ADMIN",
    },
  })
  const admin2 = await db.user.upsert({
    where: { email: "associe@domaine.mg" },
    update: {},
    create: {
      email: "associe@domaine.mg",
      name: "Andry (associé)",
      passwordHash: pwdAdmin,
      role: "ADMIN",
    },
  })
  const employe = await db.user.upsert({
    where: { email: "employe@domaine.mg" },
    update: {},
    create: {
      email: "employe@domaine.mg",
      name: "Hery (employé)",
      passwordHash: pwdEmp,
      role: "EMPLOYEE",
    },
  })
  console.log(`  Utilisateurs : ${admin1.name}, ${admin2.name}, ${employe.name}`)

  const SYS = admin1.id

  // ---- Produits ----
  const prodD = await db.product.create({
    data: { code: "D", name: "Vin rouge D — vrac", category: "FINISHED", unit: "liter", minThreshold: 50, defaultPurchasePrice: 9000 },
  })
  const prodL = await db.product.create({
    data: { code: "L", name: "Vin blanc L — vrac", category: "FINISHED", unit: "liter", minThreshold: 40, defaultPurchasePrice: 8500 },
  })
  const prodSV = await db.product.create({
    data: { code: "SV", name: "Vin rosé SV — vrac", category: "FINISHED", unit: "liter", minThreshold: 30, defaultPurchasePrice: 8800 },
  })
  const prodRaisin = await db.product.create({
    data: { code: "RAISIN", name: "Raisin frais", category: "RAW_MATERIAL", unit: "kg", minThreshold: 200, defaultPurchasePrice: 2500 },
  })
  const prodSucre = await db.product.create({
    data: { code: "SUCRE", name: "Sucre", category: "RAW_MATERIAL", unit: "kg", minThreshold: 100, defaultPurchasePrice: 1800 },
  })
  const prodLevure = await db.product.create({
    data: { code: "LEVURE", name: "Levure", category: "RAW_MATERIAL", unit: "kg", minThreshold: 10, defaultPurchasePrice: 12000 },
  })
  const prodBidon = await db.product.create({
    data: { code: "BIDON", name: "Bidon 20 L", category: "RAW_MATERIAL", unit: "piece", minThreshold: 30, defaultPurchasePrice: 4000 },
  })
  console.log("  Produits créés : D, L, SV, RAISIN, SUCRE, LEVURE, BIDON")

  // ---- Fournisseurs ----
  const sup1 = await db.supplier.create({ data: { name: "Domaine Antsirabe", contact: "Mamy", phone: "0341000001" } })
  const sup2 = await db.supplier.create({ data: { name: "Coopérative Betsileo", contact: "Lalao", phone: "0341000002" } })
  const sup3 = await db.supplier.create({ data: { name: "Tropical Agro", contact: "Tovo", phone: "0341000003" } })
  console.log("  Fournisseurs créés")

  // ---- Emplacements ----
  const loc1 = await db.location.create({ data: { name: "Dépôt principal Antsirabe", address: "Antsirabe" } })
  const loc2 = await db.location.create({ data: { name: "Cave Tanà", address: "Antananarivo" } })
  const loc3 = await db.location.create({ data: { name: "Magasin Fianarantsoa", address: "Fianarantsoa" } })
  console.log("  Emplacements créés")

  // ---- Partenaires ----
  const partnerNLS = await db.partner.create({
    data: { code: "NLS", name: "NLS Distribution", type: "RESELLER", phone: "0342000001", zone: "Antananarivo", startDate: new Date("2024-01-15"), paymentTermsDays: 15, discountPct: 0 },
  })
  const partnerBEAH = await db.partner.create({
    data: { code: "BEAHITSE", name: "Beahitse Ventes", type: "RESELLER", phone: "0342000002", zone: "Toliara", startDate: new Date("2024-03-01"), paymentTermsDays: 30, discountPct: 5 },
  })
  const partnerTHM = await db.partner.create({
    data: { code: "THM", name: "THM Commerce", type: "VENDOR", phone: "0342000003", zone: "Fianarantsoa", startDate: new Date("2024-05-10"), paymentTermsDays: 7, discountPct: 0 },
  })
  console.log("  Partenaires créés : NLS, BEAHITSE, THM")

  // ---- Grilles de prix (illustrant les prix différents selon partenaire) ----
  // D : 20 500 Ar chez plusieurs, 25 000 chez BEAHITSE, 28 000 via NLS
  const priceGrids = [
    // NLS
    { partnerId: partnerNLS.id, productId: prodD.id, unitPrice: 28000 },
    { partnerId: partnerNLS.id, productId: prodL.id, unitPrice: 22000 },
    { partnerId: partnerNLS.id, productId: prodSV.id, unitPrice: 24000 },
    // BEAHITSE (remise 5%)
    { partnerId: partnerBEAH.id, productId: prodD.id, unitPrice: 25000 },
    { partnerId: partnerBEAH.id, productId: prodL.id, unitPrice: 21000 },
    { partnerId: partnerBEAH.id, productId: prodSV.id, unitPrice: 23000 },
    // THM
    { partnerId: partnerTHM.id, productId: prodD.id, unitPrice: 20500 },
    { partnerId: partnerTHM.id, productId: prodL.id, unitPrice: 19000 },
    { partnerId: partnerTHM.id, productId: prodSV.id, unitPrice: 19500 },
  ]
  for (const pg of priceGrids) {
    await db.priceGrid.create({ data: { ...pg, validFrom: new Date("2024-01-01") } })
  }
  console.log("  Grilles de prix créées (9 lignes)")

  // ---- Mouvements de stock initiaux (inventaire de départ) ----
  const now = new Date()
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
  const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Achats matière première
  await db.stockMovement.create({ data: { productId: prodRaisin.id, type: "IN", quantity: 800, unitPrice: 2500, supplierId: sup1.id, locationToId: loc1.id, createdBy: SYS, date: debutMoisPrec, note: "Achat raisin Domaine Antsirabe" } })
  await db.stockMovement.create({ data: { productId: prodSucre.id, type: "IN", quantity: 300, unitPrice: 1800, supplierId: sup3.id, locationToId: loc1.id, createdBy: SYS, date: debutMoisPrec, note: "Achat sucre Tropical Agro" } })
  await db.stockMovement.create({ data: { productId: prodLevure.id, type: "IN", quantity: 20, unitPrice: 12000, supplierId: sup3.id, locationToId: loc2.id, createdBy: SYS, date: debutMoisPrec } })
  await db.stockMovement.create({ data: { productId: prodBidon.id, type: "IN", quantity: 100, unitPrice: 4000, supplierId: sup2.id, locationToId: loc1.id, createdBy: SYS, date: debutMoisPrec } })

  // Production : consommation matières + entrée vin D
  await db.stockMovement.create({ data: { productId: prodRaisin.id, type: "PRODUCTION", quantity: -500, locationFromId: loc1.id, createdBy: SYS, date: debutMoisPrec, note: "Production vin D (consommation raisin)" } })
  await db.stockMovement.create({ data: { productId: prodSucre.id, type: "PRODUCTION", quantity: -80, locationFromId: loc1.id, createdBy: SYS, date: debutMoisPrec } })
  await db.stockMovement.create({ data: { productId: prodLevure.id, type: "PRODUCTION", quantity: -5, locationFromId: loc2.id, createdBy: SYS, date: debutMoisPrec } })
  await db.stockMovement.create({ data: { productId: prodD.id, type: "PRODUCTION", quantity: 350, unitPrice: 9000, locationToId: loc2.id, createdBy: SYS, date: debutMoisPrec, note: "Vin D produit" } })
  await db.stockMovement.create({ data: { productId: prodL.id, type: "IN", quantity: 120, unitPrice: 8500, supplierId: sup2.id, locationToId: loc2.id, createdBy: SYS, date: debutMoisPrec, note: "Achat vin blanc L coopérative" } })
  await db.stockMovement.create({ data: { productId: prodSV.id, type: "IN", quantity: 80, unitPrice: 8800, supplierId: sup1.id, locationToId: loc3.id, createdBy: SYS, date: debutMoisPrec, note: "Achat vin rosé SV" } })
  // Transfert
  await db.stockMovement.create({ data: { productId: prodD.id, type: "TRANSFER", quantity: 100, locationFromId: loc2.id, locationToId: loc1.id, createdBy: SYS, date: debutMoisPrec, note: "Transfert cave Tanà → dépôt Antsirabe" } })
  console.log("  Mouvements de stock initiaux créés")

  // ---- Ventes exemples (ce mois et mois précédent) ----
  const ventes = [
    // Mois précédent
    { partnerId: partnerNLS.id, deliveredClient: "DON BOSCO", productId: prodD.id, quantity: 10, unitPrice: 28000, deliveryFee: 4000, status: "PAID", method: "MOBILE_MONEY", days: 35 },
    { partnerId: partnerNLS.id, deliveredClient: "UFEEL", productId: prodSV.id, quantity: 5, unitPrice: 24000, deliveryFee: 2000, status: "PAID", method: "CASH", days: 33 },
    { partnerId: partnerBEAH.id, deliveredClient: null, productId: prodD.id, quantity: 8, unitPrice: 25000, deliveryFee: 3000, status: "PARTIAL", method: "MOBILE_MONEY", days: 40 },
    { partnerId: partnerTHM.id, deliveredClient: null, productId: prodL.id, quantity: 12, unitPrice: 19000, deliveryFee: 0, status: "UNPAID", method: null, days: 45 },
    // Mois courant
    { partnerId: partnerNLS.id, deliveredClient: "DON BOSCO", productId: prodD.id, quantity: 5, unitPrice: 28000, deliveryFee: 2000, status: "PAID", method: "MOBILE_MONEY", days: 12 },
    { partnerId: partnerNLS.id, deliveredClient: "CONT", productId: prodSV.id, quantity: 10, unitPrice: 24000, deliveryFee: 2000, status: "PARTIAL", method: "MOBILE_MONEY", days: 8 },
    { partnerId: partnerBEAH.id, deliveredClient: null, productId: prodD.id, quantity: 6, unitPrice: 25000, deliveryFee: 0, status: "PAID", method: "CASH", days: 5 },
    { partnerId: partnerTHM.id, deliveredClient: null, productId: prodSV.id, quantity: 4, unitPrice: 19500, deliveryFee: 1500, status: "UNPAID", method: null, days: 3 },
    { partnerId: partnerTHM.id, deliveredClient: null, productId: prodL.id, quantity: 7, unitPrice: 19000, deliveryFee: 0, status: "PAID", method: "MOBILE_MONEY", days: 1 },
  ]

  for (const v of ventes) {
    const sale = await db.sale.create({
      data: {
        partnerId: v.partnerId,
        deliveredClient: v.deliveredClient,
        productId: v.productId,
        quantity: v.quantity,
        unitPriceSnapshot: v.unitPrice,
        deliveryFee: v.deliveryFee,
        paymentStatus: v.status,
        paymentMethod: v.method,
        createdBy: SYS,
        date: new Date(now.getTime() - v.days * 86400000),
      },
    })
    // Paiements pour ventes payées / partielles
    const total = v.quantity * v.unitPrice + v.deliveryFee
    if (v.status === "PAID") {
      await db.payment.create({ data: { saleId: sale.id, amount: total, method: v.method ?? "CASH", createdBy: SYS, date: sale.date } })
    } else if (v.status === "PARTIAL") {
      await db.payment.create({ data: { saleId: sale.id, amount: total * 0.5, method: v.method ?? "CASH", createdBy: SYS, date: sale.date, note: "Acompte 50%" } })
    }
    // Décrémente le stock automatiquement (lien ventes-stock)
    await db.stockMovement.create({ data: { productId: v.productId, type: "OUT", quantity: -v.quantity, locationFromId: loc1.id, createdBy: SYS, date: sale.date, motif: "Vente", note: `Vente ${sale.id.slice(-6)}` } })
  }
  console.log(`  ${ventes.length} ventes créées avec paiements + mouvements de stock liés`)

  // ---- Module 3 : Marchandises trading ----
  const merRiz = await db.merchandise.create({ data: { name: "Riz local", unit: "sac 50 kg", alertLow: 25000, alertHigh: 35000 } })
  const merHuile = await db.merchandise.create({ data: { name: "Huile végétale", unit: "bidon 20 L", alertLow: 90000, alertHigh: 120000 } })
  const merSucre2 = await db.merchandise.create({ data: { name: "Sucre gros", unit: "sac 50 kg", alertLow: 90000, alertHigh: 110000 } })
  console.log("  Marchandises trading créées")

  // Prix du marché historiques (3 mois)
  for (const mer of [merRiz, merHuile, merSucre2]) {
    const base = mer.id === merRiz.id ? 30000 : mer.id === merHuile.id ? 100000 : 95000
    for (let i = 90; i >= 0; i -= 7) {
      const variation = (Math.sin(i / 10) + Math.random() * 0.5) * 0.08
      await db.marketPrice.create({ data: { merchandiseId: mer.id, price: Math.round(base * (1 + variation)), createdBy: SYS, date: new Date(now.getTime() - i * 86400000) } })
    }
  }
  console.log("  Prix du marché créés (historique 3 mois)")

  // Opérations trading
  await db.tradeOperation.create({ data: { type: "BUY", merchandiseId: merRiz.id, quantity: 20, unitPrice: 28000, fees: 5000, counterparty: "Marché Anosy", paymentMethod: "CASH", paymentStatus: "PAID", createdBy: SYS, date: new Date(now.getTime() - 60 * 86400000) } })
  await db.tradeOperation.create({ data: { type: "SELL", merchandiseId: merRiz.id, quantity: 8, unitPrice: 32000, fees: 2000, counterparty: "Restaurant Tsara", paymentMethod: "MOBILE_MONEY", paymentStatus: "PAID", createdBy: SYS, date: new Date(now.getTime() - 30 * 86400000) } })
  await db.tradeOperation.create({ data: { type: "BUY", merchandiseId: merHuile.id, quantity: 15, unitPrice: 95000, fees: 3000, counterparty: "Grossiste Analakely", paymentMethod: "MOBILE_MONEY", paymentStatus: "PAID", createdBy: SYS, date: new Date(now.getTime() - 45 * 86400000) } })
  await db.tradeOperation.create({ data: { type: "SELL", merchandiseId: merHuile.id, quantity: 5, unitPrice: 108000, fees: 1500, counterparty: "Épicerie Jumbo", paymentMethod: "CASH", paymentStatus: "PAID", createdBy: SYS, date: new Date(now.getTime() - 10 * 86400000) } })
  await db.tradeOperation.create({ data: { type: "BUY", merchandiseId: merSucre2.id, quantity: 12, unitPrice: 90000, fees: 4000, counterparty: "Sucrerie Miandrivazo", paymentMethod: "MOBILE_MONEY", paymentStatus: "PARTIAL", createdBy: SYS, date: new Date(now.getTime() - 20 * 86400000) } })
  console.log("  Opérations trading créées")

  // ---- Audit log initial ----
  await db.auditLog.create({ data: { userId: SYS, entity: "System", entityId: "seed", action: "CREATE", summary: "Initialisation des données de démonstration", at: now } })

  console.log("✅ Seed terminé avec succès")
  console.log("   Connexion admin : admin@domaine.mg / admin123")
  console.log("   Connexion employé : employe@domaine.mg / employe123")
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
