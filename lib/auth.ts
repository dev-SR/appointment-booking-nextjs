/**
 * NextAuth.js v5 Configuration
 *
 * Supports:
 * - Google OAuth
 * - Facebook OAuth
 * - Credentials authentication with email + password
 *
 * JWT-only strategy with permissions embedded in token
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import "next-auth/jwt"
import { compare } from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { getUserPermissions } from "@/lib/services/authorization.service"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      phone: string
      email?: string | null
      nameEn: string
      nameBn?: string | null
      profileImageUrl?: string | null
      preferredLocale: string
      permissions: string[]
    }
  }

  interface User {
    id: string
    phone: string
    email?: string | null
    nameEn: string
    nameBn?: string | null
    profileImageUrl?: string | null
    preferredLocale: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    phone: string
    nameEn: string
    nameBn?: string | null
    preferredLocale: string
    permissions: string[]
    permissionsCachedAt: number
  }
}

// Permission cache TTL in JWT (60 seconds)
const PERMISSION_CACHE_TTL = 60 * 1000

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const email = String(credentials.email).toLowerCase()
        const password = String(credentials.password)

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user?.passwordHash) {
          AuditService.record({
            action: AuditAction.USER_LOGIN_FAILED,
            resourceType: "user",
            resourceId: email,
            resourceLabel: email,
            metadata: { provider: "credentials", reason: "USER_NOT_FOUND" },
          })
          throw new Error("Invalid email or password")
        }

        const validPassword = await compare(password, user.passwordHash)
        if (!validPassword) {
          AuditService.record({
            action: AuditAction.USER_LOGIN_FAILED,
            resourceType: "user",
            resourceId: user.id,
            resourceLabel: user.email,
            actor: { id: user.id, name: user.nameEn },
            metadata: { provider: "credentials", reason: "INVALID_PASSWORD" },
          })
          throw new Error("Invalid email or password")
        }

        if (!user.isActive) {
          throw new Error("Account inactive")
        }

        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          nameEn: user.nameEn,
          nameBn: user.nameBn,
          profileImageUrl: user.profileImageUrl,
          preferredLocale: user.preferredLocale,
        }
      },
    }),

    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          phone: `oauth:google:${profile.sub}`,
          email: profile.email,
          nameEn: profile.name,
          nameBn: null,
          profileImageUrl: profile.picture,
          preferredLocale: "bn",
        }
      },
    }),

    // Facebook OAuth
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id,
          phone: `oauth:facebook:${profile.id}`,
          email: profile.email,
          nameEn: profile.name,
          nameBn: null,
          profileImageUrl: null,
          preferredLocale: "bn",
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.phone = user.phone
        token.nameEn = user.nameEn
        token.nameBn = user.nameBn
        token.preferredLocale = user.preferredLocale

        // Load permissions
        const permissions = await getUserPermissions(user.id)
        token.permissions = Array.from(permissions)
        token.permissionsCachedAt = Date.now()
      }

      // Refresh permissions if cache expired
      if (token.id && Date.now() - (token.permissionsCachedAt || 0) > PERMISSION_CACHE_TTL) {
        const permissions = await getUserPermissions(token.id)
        token.permissions = Array.from(permissions)
        token.permissionsCachedAt = Date.now()
      }

      // Handle session update
      if (trigger === "update" && session) {
        if (session.nameEn) token.nameEn = session.nameEn
        if (session.nameBn) token.nameBn = session.nameBn
        if (session.preferredLocale) token.preferredLocale = session.preferredLocale
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.phone = token.phone
        session.user.nameEn = token.nameEn
        session.user.nameBn = token.nameBn
        session.user.preferredLocale = token.preferredLocale
        session.user.permissions = token.permissions || []
      }
      return session
    },

    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials" && user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: user.email } })
        if (existingUser && !existingUser.isActive) {
          return "/inactive"
        }
      }

      return true
    },
  },

  events: {
    async signIn({ user }) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { patient: true, userRoles: true },
      })

      if (!updatedUser.patient) {
        const patientRole = await prisma.role.findUnique({ where: { name: "patient" } })
        await prisma.$transaction([
          prisma.patient.create({ data: { userId: user.id } }),
          ...(patientRole && updatedUser.userRoles.length === 0
            ? [
                prisma.userRole.create({
                  data: {
                    userId: user.id,
                    roleId: patientRole.id,
                    assignedBy: "system",
                  },
                }),
              ]
            : []),
        ])
      }

      AuditService.record({
        action: AuditAction.USER_LOGIN,
        resourceType: "user",
        resourceId: user.id,
        resourceLabel: user.email ?? user.nameEn,
        actor: { id: user.id, name: user.nameEn },
        metadata: { provider: "nextauth" },
      })
    },
  },
})
