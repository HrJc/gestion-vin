import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/**
 * Configuration NextAuth — connexion par identifiant / mot de passe.
 * Stratégie JWT (pas de session en base) pour rester léger.
 * Le rôle est injecté dans le token et la session côté client.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findFirst({
          where: {
            email: credentials.email.toLowerCase(),
            active: true,
            archivedAt: null,
          },
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as { id: string; email: string; name: string; role: string }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string; role?: string }).id = token.id as string
        ;(session.user as { id?: string; role?: string }).role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-vin-trading-change-in-prod",
}

/** Types étendus pour la session côté client. */
declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      role?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
  }
}
