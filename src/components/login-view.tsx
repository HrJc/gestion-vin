"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wine, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function LoginView() {
  const [email, setEmail] = useState("admin@domaine.mg")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      toast.error("Identifiants incorrects")
    } else {
      toast.success("Connexion réussie")
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Wine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Domaine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion vin en vrac &amp; trading
          </p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              Identifiez-vous pour accéder à l&apos;application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@domaine.mg"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Se connecter
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Comptes de démonstration</p>
              <p>Admin : <span className="font-mono">admin@domaine.mg</span> / <span className="font-mono">admin123</span></p>
              <p>Employé : <span className="font-mono">employe@domaine.mg</span> / <span className="font-mono">employe123</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
