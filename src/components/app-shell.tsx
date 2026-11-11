"use client"

import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useAppStore, type ModuleKey } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Boxes,
  TrendingUp,
  FileBarChart,
  Package,
  Truck,
  MapPin,
  UserCog,
  Wine,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardModule } from "@/components/modules/dashboard"
import { SalesModule } from "@/components/modules/sales"
import { PartnersModule } from "@/components/modules/partners"
import { StockModule } from "@/components/modules/stock"
import { TradingModule } from "@/components/modules/trading"
import { ReportsModule } from "@/components/modules/reports"
import { ProductsModule } from "@/components/modules/products"
import { SuppliersModule } from "@/components/modules/suppliers"
import { LocationsModule } from "@/components/modules/locations"
import { UsersModule } from "@/components/modules/users"

interface NavItem {
  key: ModuleKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { key: "sales", label: "Ventes", icon: ShoppingCart },
      { key: "partners", label: "Partenaires", icon: Users },
      { key: "stock", label: "Stock", icon: Boxes },
      { key: "trading", label: "Achat-vente", icon: TrendingUp, adminOnly: true },
      { key: "reports", label: "Bilans", icon: FileBarChart },
    ],
  },
  {
    label: "Référentiels",
    items: [
      { key: "products", label: "Produits", icon: Package, adminOnly: true },
      { key: "suppliers", label: "Fournisseurs", icon: Truck, adminOnly: true },
      { key: "locations", label: "Emplacements", icon: MapPin, adminOnly: true },
      { key: "users", label: "Utilisateurs", icon: UserCog, adminOnly: true },
    ],
  },
]

const MODULES: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardModule,
  sales: SalesModule,
  partners: PartnersModule,
  stock: StockModule,
  trading: TradingModule,
  reports: ReportsModule,
  products: ProductsModule,
  suppliers: SuppliersModule,
  locations: LocationsModule,
  users: UsersModule,
}

export function AppShell() {
  const { data: session } = useSession()
  const { activeModule, setModule, sidebarOpen, setSidebarOpen } = useAppStore()
  const { theme, setTheme } = useTheme()

  const role = session?.user?.role ?? "EMPLOYEE"
  const isAdmin = role === "ADMIN"

  // Filter sections by role
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((s) => s.items.length > 0)

  const ActiveComponent = MODULES[activeModule] ?? DashboardModule
  const allItems = NAV_SECTIONS.flatMap((s) => s.items)
  const activeItem = allItems.find((i) => i.key === activeModule)

  const userName = session?.user?.name ?? "Utilisateur"
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const navList = (
    <nav className="flex flex-col px-3 py-2 gap-4 overflow-y-auto scroll-thin">
      {visibleSections.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.label}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon
              const active = activeModule === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setModule(item.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const brand = (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
        <Wine className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-sm">Domaine</span>
        <span className="text-[10px] text-muted-foreground">Gestion vin &amp; trading</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header mobile */}
      <header className="md:hidden flex items-center gap-2 h-14 px-3 border-b bg-background sticky top-0 z-30">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {brand}
            {navList}
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Wine className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm truncate">{activeItem?.label}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-60 border-r bg-sidebar shrink-0">
          {brand}
          <div className="flex-1 overflow-y-auto scroll-thin">{navList}</div>
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{userName}</p>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {role === "ADMIN" ? "Administrateur" : role === "PARTNER" ? "Partenaire" : "Employé"}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground mt-1"
              onClick={() => signOut({ redirect: false }).then(() => window.location.reload())}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar desktop */}
          <header className="hidden md:flex items-center justify-between h-14 px-6 border-b bg-background sticky top-0 z-20">
            <h1 className="text-base font-semibold">{activeItem?.label}</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto scroll-thin">
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto w-full">
              <ActiveComponent />
            </div>
          </main>
        </div>
      </div>

      {/* Footer sticky */}
      <footer className="mt-auto border-t bg-background py-3 px-6 text-center text-xs text-muted-foreground">
        Domaine — Gestion vin en vrac &amp; trading · Ariary (MGA) · Données conservées en permanence
      </footer>
    </div>
  )
}
