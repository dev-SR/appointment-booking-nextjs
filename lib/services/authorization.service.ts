/**
 * PBAC Authorization Service
 *
 * Permission-Based Access Control - Never check role names, always check permission keys
 *
 * Every protected action checks a permission key string in the format:
 * resource:action[:scope]
 *
 * Examples:
 * - appointments:create
 * - appointments:read:own
 * - appointments:cancel:any
 */

import prisma from "@/lib/prisma"
import { permissionCache } from "./permission-cache"
import {
  ForbiddenError,
  UnauthorizedError,
  PERMISSIONS,
  type PermissionKey,
} from "./authorization.types"

/**
 * Get all permission keys for a user
 * Caches results for 60 seconds in LRU cache
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  // Check cache first
  const cached = permissionCache.get(userId)
  if (cached) {
    return cached
  }

  // Fetch from database
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const permissions = new Set<string>()

  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.key)
    }
  }

  // Cache the result
  permissionCache.set(userId, permissions)

  return permissions
}

/**
 * Check if a user has a specific permission
 *
 * Handles wildcard (*) permission for super admins
 * Handles scope hierarchy (e.g., :any includes :own)
 */
export async function can(
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)

  // Super admin wildcard check
  if (permissions.has(PERMISSIONS.ALL)) {
    return true
  }

  // Direct permission check
  if (permissions.has(permission)) {
    return true
  }

  // Scope hierarchy: :any includes :own
  // e.g., if user has "appointments:cancel:any", they can also do "appointments:cancel:own"
  if (permission.endsWith(":own")) {
    const anyPermission = permission.replace(":own", ":any")
    if (permissions.has(anyPermission)) {
      return true
    }
  }

  // :all includes :own and :assigned
  if (permission.endsWith(":own") || permission.endsWith(":assigned")) {
    const allPermission = permission.replace(/:own$|:assigned$/, ":all")
    if (permissions.has(allPermission)) {
      return true
    }
  }

  return false
}

/**
 * Check if a user has any of the specified permissions
 */
export async function canAny(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await can(userId, permission)) {
      return true
    }
  }
  return false
}

/**
 * Check if a user has all of the specified permissions
 */
export async function canAll(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await can(userId, permission))) {
      return false
    }
  }
  return true
}

/**
 * Require a permission - throws ForbiddenError if not allowed
 * Use in API route handlers after authentication
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<void> {
  if (!userId) {
    throw new UnauthorizedError()
  }

  const allowed = await can(userId, permission)

  if (!allowed) {
    throw new ForbiddenError(permission)
  }
}

/**
 * Require any of the permissions - throws ForbiddenError if none are allowed
 */
export async function requireAnyPermission(
  userId: string,
  permissions: string[]
): Promise<void> {
  if (!userId) {
    throw new UnauthorizedError()
  }

  const allowed = await canAny(userId, permissions)

  if (!allowed) {
    throw new ForbiddenError(permissions.join(" | "))
  }
}

/**
 * Require all permissions - throws ForbiddenError if any is not allowed
 */
export async function requireAllPermissions(
  userId: string,
  permissions: string[]
): Promise<void> {
  if (!userId) {
    throw new UnauthorizedError()
  }

  for (const permission of permissions) {
    const allowed = await can(userId, permission)
    if (!allowed) {
      throw new ForbiddenError(permission)
    }
  }
}

/**
 * Invalidate cached permissions for a user
 * Call this when user's roles change
 */
export function invalidateUserPermissions(userId: string): void {
  permissionCache.delete(userId)
}

/**
 * Invalidate cached permissions for multiple users
 * Call this when a role's permissions change
 */
export async function invalidateRolePermissions(roleId: string): Promise<void> {
  // Get all users with this role
  const userRoles = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  })

  const userIds = userRoles.map((ur) => ur.userId)
  permissionCache.invalidateUsers(userIds)
}

/**
 * Check resource ownership for scoped permissions
 * Returns true if the user owns the resource
 */
export async function isResourceOwner(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  switch (resourceType) {
    case "appointment": {
      const appointment = await prisma.appointment.findUnique({
        where: { id: resourceId },
        include: { patient: true },
      })
      return appointment?.patient.userId === userId
    }

    case "doctor": {
      const doctor = await prisma.doctor.findUnique({
        where: { id: resourceId },
      })
      return doctor?.userId === userId
    }

    case "patient": {
      const patient = await prisma.patient.findUnique({
        where: { id: resourceId },
      })
      return patient?.userId === userId
    }

    case "payment": {
      const payment = await prisma.payment.findUnique({
        where: { id: resourceId },
        include: { appointment: { include: { patient: true } } },
      })
      return payment?.appointment.patient.userId === userId
    }

    default:
      return false
  }
}

/**
 * Determine the required permission scope based on ownership
 * Use this to decide between :own and :any permissions
 */
export async function getRequiredScope(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<"own" | "any"> {
  const isOwner = await isResourceOwner(userId, resourceType, resourceId)
  return isOwner ? "own" : "any"
}

/**
 * Build permission key with scope
 */
export function buildPermission(
  resource: string,
  action: string,
  scope?: "own" | "any" | "all" | "assigned"
): string {
  if (scope) {
    return `${resource}:${action}:${scope}`
  }
  return `${resource}:${action}`
}

// Re-export types and constants
export { ForbiddenError, UnauthorizedError, PERMISSIONS }
export type { PermissionKey }
