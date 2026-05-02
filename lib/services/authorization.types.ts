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
  APPOINTMENTS_RESCHEDULE_OWN: "appointments:reschedule:own",
  APPOINTMENTS_RESCHEDULE_ANY: "appointments:reschedule:any",
  APPOINTMENTS_CHECKIN_ANY: "appointments:checkin:any",
  APPOINTMENTS_COMPLETE_OWN: "appointments:complete:own",

  // Doctors
  DOCTORS_READ: "doctors:read",
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
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_UPDATE_ANY: "payments:update:any",
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

  // Chambers and specialties
  CHAMBERS_READ: "chambers:read",
  CHAMBERS_MANAGE: "chambers:manage",
  SPECIALTIES_READ: "specialties:read",
  SPECIALTIES_MANAGE: "specialties:manage",

  // Schedule
  SCHEDULE_MANAGE_OWN: "schedule:manage:own",
  SCHEDULE_MANAGE_ANY: "schedule:manage:any",

  // Dashboards
  DASHBOARD_VIEW_ADMIN: "dashboard:view:admin",
  DASHBOARD_VIEW_RECEPTIONIST: "dashboard:view:receptionist",
  DASHBOARD_VIEW_DOCTOR: "dashboard:view:doctor",
  DASHBOARD_VIEW_ACCOUNTANT: "dashboard:view:accountant",
  DASHBOARD_VIEW_PATIENT: "dashboard:view:patient",

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

