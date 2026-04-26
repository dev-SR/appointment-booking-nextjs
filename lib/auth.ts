/**
 * NextAuth.js v5 Configuration
 *
 * Supports:
 * - Phone OTP authentication (primary for Bangladesh)
 * - Google OAuth
 * - Facebook OAuth
 *
 * JWT-only strategy with permissions embedded in token
 */

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { getUserPermissions } from "@/lib/services/authorization.service"
import { verifyOtp } from "@/lib/services/otp.service"

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
    // Phone OTP Provider
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) {
          throw new Error("Phone and OTP are required")
        }

        const phone = credentials.phone as string
        const otp = credentials.otp as string

        // Verify OTP
        const isValid = await verifyOtp(phone, otp, "login")
        if (!isValid) {
          throw new Error("Invalid or expired OTP")
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { phone },
        })

        if (!user) {
          // Create new user with patient role by default
          user = await prisma.user.create({
            data: {
              phone,
              nameEn: phone, // Will be updated in profile
              isPhoneVerified: true,
              preferredLocale: "bn",
            },
          })

          // Assign patient role
          const patientRole = await prisma.role.findUnique({
            where: { name: "patient" },
          })

          if (patientRole) {
            await prisma.userRole.create({
              data: {
                userId: user.id,
                roleId: patientRole.id,
                assignedBy: "system",
              },
            })
          }

          // Create patient profile
          await prisma.patient.create({
            data: {
              userId: user.id,
            },
          })
        } else {
          // Update phone verification status
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isPhoneVerified: true,
              lastLoginAt: new Date(),
            },
          })
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
          phone: "", // Will need to be added later
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
      // For OAuth providers, ensure user has phone number
      if (account?.provider !== "phone-otp") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (existingUser && !existingUser.phone) {
          // Redirect to phone verification
          return "/verify-phone"
        }
      }

      return true
    },
  },

  events: {
    async signIn({ user }) {
      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    },
  },
})
