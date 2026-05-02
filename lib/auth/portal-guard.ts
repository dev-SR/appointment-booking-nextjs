import type { Session } from "next-auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { can, canAll, canAny } from "@/lib/services/authorization.service"
import { AuditAction } from "@/app/generated/prisma/enums"
import { AuditService } from "@/lib/audit/audit.service"

interface PortalAccessInput {
  session: Session | null
  currentPath: string
  any?: string[]
  all?: string[]
  redirectTo?: string
}

export interface PortalAccessDecision {
  allowed: boolean
  redirectTo?: string
  reason?: "NO_SESSION" | "INACTIVE" | "INCOMPLETE_PROFILE" | "MISSING_PERMISSION"
}

export async function evaluatePortalAccess({
  session,
  currentPath,
  any = [],
  all = [],
  redirectTo = "/unauthorized",
}: PortalAccessInput): Promise<PortalAccessDecision> {
  if (!session?.user?.id) {
    return {
      allowed: false,
      reason: "NO_SESSION",
      redirectTo: `/login?callbackUrl=${encodeURIComponent(currentPath)}`,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      isActive: true,
      nameEn: true,
      preferredLocale: true,
      phone: true,
      email: true,
    },
  })

  if (!user || !user.isActive) {
    return { allowed: false, reason: "INACTIVE", redirectTo: "/inactive" }
  }

  if (!user.nameEn || !user.preferredLocale || (!user.phone && !user.email)) {
    return {
      allowed: false,
      reason: "INCOMPLETE_PROFILE",
      redirectTo: "/complete-profile",
    }
  }

  const anyAllowed = any.length > 0 ? await canAny(session.user.id, any) : false
  const allAllowed = all.length > 0 ? await canAll(session.user.id, all) : false
  const allowed =
    any.length > 0 && all.length > 0
      ? anyAllowed || allAllowed
      : any.length > 0
        ? anyAllowed
        : all.length > 0
          ? allAllowed
          : true

  if (!allowed) {
    AuditService.record({
      action: AuditAction.USER_LOGIN_FAILED,
      resourceType: "portal",
      resourceId: currentPath,
      resourceLabel: "Forbidden portal access",
      actor: {
        id: session.user.id,
        name: session.user.nameEn,
      },
      metadata: {
        requiredAny: any,
        requiredAll: all,
        reason: "MISSING_PERMISSION",
      },
    })

    return { allowed: false, reason: "MISSING_PERMISSION", redirectTo }
  }

  return { allowed: true }
}

export async function requirePortalAccess(input: PortalAccessInput): Promise<void> {
  const decision = await evaluatePortalAccess(input)
  if (!decision.allowed && decision.redirectTo) {
    redirect(decision.redirectTo)
  }
}

export async function getPostLoginRedirect(userId: string): Promise<string> {
  if ((await can(userId, "dashboard:view:admin")) || (await can(userId, "settings:manage"))) {
    return "/admin"
  }
  if (await can(userId, "dashboard:view:receptionist")) return "/receptionist"
  if (await can(userId, "dashboard:view:doctor")) return "/doctor"
  if (await can(userId, "dashboard:view:accountant")) return "/accountant"
  if (
    (await can(userId, "dashboard:view:patient")) ||
    (await can(userId, "appointments:read:own"))
  ) {
    return "/patient"
  }
  return "/unauthorized"
}
