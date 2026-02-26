import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import type { NextAuthOptions } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      churchId?: string | null
      phone?: string | null
      penaltyPoints: number
      isBlocked: boolean
    }
  }
  interface User {
    id: string
    email: string
    name: string
    role: string
    churchId?: string | null
    phone?: string | null
    penaltyPoints: number
    isBlocked: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
    churchId?: string | null
    phone?: string | null
    penaltyPoints: number
    isBlocked: boolean
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          })

          if (!user || !user.password) {
            return null
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!passwordMatch) {
            return null
          }

          if (!user.isActive) {
            throw new Error("Usuário inativo")
          }

          // Verificar se o bloqueio expirou e desbloquear automaticamente
          if (user.isBlocked && user.blockedUntil && new Date() > user.blockedUntil) {
            const updatedUser = await db.user.update({
              where: { id: user.id },
              data: {
                isBlocked: false,
                blockedUntil: null,
                penaltyPoints: 0 // Zerar pontos após cumprir o bloqueio
              }
            })
            return {
              id: updatedUser.id,
              email: updatedUser.email,
              name: updatedUser.name,
              role: updatedUser.role,
              churchId: updatedUser.churchId,
              phone: updatedUser.phone,
              penaltyPoints: updatedUser.penaltyPoints,
              isBlocked: updatedUser.isBlocked,
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            churchId: user.churchId,
            phone: user.phone,
            penaltyPoints: user.penaltyPoints,
            isBlocked: user.isBlocked,
          }
        } catch (error) {
          console.error("Erro na autenticação:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.churchId = user.churchId
        token.phone = user.phone
        token.penaltyPoints = user.penaltyPoints
        token.isBlocked = user.isBlocked
      }

      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as string
        session.user.churchId = token.churchId as string | null
        session.user.phone = token.phone as string | null
        session.user.penaltyPoints = token.penaltyPoints as number
        session.user.isBlocked = token.isBlocked as boolean
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
