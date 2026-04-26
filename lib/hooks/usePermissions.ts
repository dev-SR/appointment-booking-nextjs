"use client"

/**
 * Frontend Permission Hook
 *
 * Never check role names in UI - always check permission keys
 *
 * Usage:
 * const { can, canAny } = usePermissions()
 * {can('appointments:cancel:any') && <CancelButton />}
 */

import { useAuthStore } from "@/store/auth.store"
import { PERMISSIONS, type PermissionKey } from "@/lib/services/authorization.types"

export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions)

  /**
   * Check if user has a specific permission
   * Handles wildcard (*) and scope hierarchy
   */
  const can = (permission: string): boolean => {
    // Not authenticated
    if (!permissions || permissions.size === 0) {
      return false
    }

    // Super admin wildcard check
    if (permissions.has(PERMISSIONS.ALL)) {
      return true
    }

    // Direct permission check
    if (permissions.has(permission)) {
      return true
    }

    // Scope hierarchy: :any includes :own
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
   * Check if user has any of the specified permissions
   */
  const canAny = (permissionList: string[]): boolean => {
    return permissionList.some((p) => can(p))
  }

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissionList: string[]): boolean => {
    return permissionList.every((p) => can(p))
  }

  return {
    can,
    canAny,
    canAll,
    permissions,
  }
}

// Re-export permission constants for convenience
export { PERMISSIONS }
export type { PermissionKey }
