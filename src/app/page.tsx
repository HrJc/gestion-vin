"use client"

import { useSession } from "next-auth/react"
import { LoginView } from "@/components/login-view"
import { AppShell } from "@/components/app-shell"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return <LoginView />
  }

  return <AppShell />
}
