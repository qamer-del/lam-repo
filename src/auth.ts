import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string }
        })

        // Block inactive users and any non-ACTIVE status (PENDING / REJECTED)
        if (!user || user.isActive === false || (user as any).status !== 'ACTIVE') return null

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            branchId: user.branchId ?? 1,
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.username = (user as any).username
        token.branchId = (user as any).branchId ?? 1
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.username = token.username as string
        session.user.branchId = token.branchId as number
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "lamv_auth_secret_fallback_9x8123908123",
})

