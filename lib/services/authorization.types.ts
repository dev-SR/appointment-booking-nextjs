/**
 * PBAC Authorization Types
 * Permission-Based Access Control - Never check role names, always check permission keys
 */

// Permission format: resource:action[:scope]
// Examples:
// - appointments:create
// - appointments:read:own
// - appointments:read:all
// - appointments:cancel:any
// - doctors:update:own
// - payments:refund

export interface PermissionCheck {
  userId: string
  permission: string
}

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

export interface CachedPermissions {
  permissions: Set<string>
  cachedAt: number
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403
  public readonly code = "PERMISSION_DENIED"

  constructor(permission: string, message?: string) {
    super(message || `Permission denied: ${permission}`)
    this.name = "ForbiddenError"
  }
}

export class UnauthorizedError extends Error {
  public readonly statusCode = 401
  public readonly code = "UNAUTHORIZED"

  constructor(message?: string) {
    super(message || "Authentication required")
    this.name = "UnauthorizedError"
  }
}

// Permission key constants for type safety
export const PERMISSIONS = {
  // Appointments
  APPOINTMENTS_CREATE: "appointments:create",
  APPOINTMENTS_READ_OWN: "appointments:read:own",
  APPOINTMENTS_READ_ALL: "appointments:read:all",
  APPOINTMENTS_UPDATE_OWN: "appointments:update:own",
  APPOINTMENTS_UPDATE_ANY: "appointments:update:any",
  APPOINTMENTS_CANCEL_OWN: "appointments:cancel:own",
  APPOINTMENTS_CANCEL_ANY: "appointments:cancel:any",

  // Doctors
  DOCTORS_CREATE: "doctors:create",
  DOCTORS_READ_ALL: "doctors:read:all",
  DOCTORS_UPDATE_OWN: "doctors:update:own",
  DOCTORS_UPDATE_ANY: "doctors:update:any",
  DOCTORS_DELETE: "doctors:delete",

  // Patients
  PATIENTS_CREATE: "patients:create",
  PATIENTS_READ_OWN: "patients:read:own",
  PATIENTS_READ_ASSIGNED: "patients:read:assigned",
  PATIENTS_READ_ALL: "patients:read:all",
  PATIENTS_UPDATE_OWN: "patients:update:own",
  PATIENTS_UPDATE_ANY: "patients:update:any",

  // Payments
  PAYMENTS_READ_OWN: "payments:read:own",
  PAYMENTS_READ_ALL: "payments:read:all",
  PAYMENTS_REFUND: "payments:refund",

  // Queue
  QUEUE_MANAGE: "queue:manage",
  QUEUE_VIEW: "queue:view",

  // Reports
  REPORTS_VIEW_FINANCIAL: "reports:view:financial",
  REPORTS_VIEW_OPERATIONAL: "reports:view:operational",

  // Roles & Permissions
  ROLES_MANAGE: "roles:manage",
  ROLES_VIEW: "roles:view",

  // Staff
  STAFF_MANAGE: "staff:manage",
  STAFF_VIEW: "staff:view",

  // Settings
  SETTINGS_MANAGE: "settings:manage",
  SETTINGS_VIEW: "settings:view",

  // Schedule
  SCHEDULE_MANAGE_OWN: "schedule:manage:own",
  SCHEDULE_MANAGE_ANY: "schedule:manage:any",

  // Invoices
  INVOICES_GENERATE: "invoices:generate",
  INVOICES_VIEW_OWN: "invoices:view:own",
  INVOICES_VIEW_ALL: "invoices:view:all",

  // Audit
  AUDIT_VIEW: "audit:view",

  // Super Admin wildcard
  ALL: "*",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Default system roles with their permissions
export const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: "super_admin",
    displayName: "Super Admin",
    isSystem: true,
    permissions: [PERMISSIONS.ALL],
  },
  RECEPTIONIST: {
    name: "receptionist",
    displayName: "Receptionist",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_CREATE,
      PERMISSIONS.APPOINTMENTS_READ_ALL,
      PERMISSIONS.APPOINTMENTS_CANCEL_ANY,
      PERMISSIONS.QUEUE_MANAGE,
      PERMISSIONS.PATIENTS_READ_ALL,
      PERMISSIONS.INVOICES_GENERATE,
    ],
  },
  DOCTOR: {
    name: "doctor",
    displayName: "Doctor",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_READ_OWN,
      PERMISSIONS.APPOINTMENTS_UPDATE_OWN,
      PERMISSIONS.PATIENTS_READ_ASSIGNED,
      PERMISSIONS.DOCTORS_UPDATE_OWN,
      PERMISSIONS.SCHEDULE_MANAGE_OWN,
    ],
  },
  ACCOUNTANT: {
    name: "accountant",
    displayName: "Accountant",
    isSystem: true,
    permissions: [
      PERMISSIONS.PAYMENTS_READ_ALL,
      PERMISSIONS.PAYMENTS_REFUND,
      PERMISSIONS.REPORTS_VIEW_FINANCIAL,
      PERMISSIONS.INVOICES_GENERATE,
    ],
  },
  PATIENT: {
    name: "patient",
    displayName: "Patient",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_CREATE,
      PERMISSIONS.APPOINTMENTS_READ_OWN,
      PERMISSIONS.APPOINTMENTS_CANCEL_OWN,
      PERMISSIONS.PAYMENTS_READ_OWN,
      PERMISSIONS.PATIENTS_UPDATE_OWN,
    ],
  },
} as const

export type SystemRoleName = keyof typeof SYSTEM_ROLES
