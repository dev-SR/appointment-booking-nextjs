"use client"

/**
 * Portal Sidebar — Shared sidebar for all portal layouts (admin, doctor, receptionist, accountant)
 * Navigation items are filtered by usePermissions() — no hardcoded role checks.
 */

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard, Calendar, Users, UserCog, Shield,
  CreditCard, BarChart3, Settings, FileText, Clock,
  Stethoscope, ChevronLeft, ChevronRight, LogOut, Menu,
  UserRound, WalletCards, HeartHandshake, ClipboardList,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  any?: string[]
  all?: string[]
}

interface PortalSidebarProps {
  portalName: string
  navItems: NavItem[]
  children: React.ReactNode
}

export function PortalSidebar({ portalName, navItems, children }: PortalSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { can, canAny, canAll } = usePermissions()
  const visibleNavItems = navItems.filter((item) => {
    if (item.permission && !can(item.permission)) return false
    if (item.any && !canAny(item.any)) return false
    if (item.all && !canAll(item.all)) return false
    return true
  })

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300",
          "lg:relative lg:z-auto",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">{portalName}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3 text-muted-foreground", collapsed && "justify-center")}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

// Pre-configured nav items for each portal
export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, any: ["dashboard:view:admin", "settings:manage"] },
  { label: "Appointments", href: "/admin/appointments", icon: Calendar, permission: "appointments:read:all" },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, any: ["doctors:read:all", "doctors:read"] },
  { label: "Patients", href: "/admin/patients", icon: Users, permission: "patients:read:all" },
  { label: "Staff & Roles", href: "/admin/staff", icon: UserCog, permission: "staff:manage" },
  { label: "Permissions", href: "/admin/roles", icon: Shield, permission: "roles:manage" },
  { label: "Queue", href: "/admin/queue", icon: Clock, permission: "queue:manage" },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, permission: "payments:read:all" },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, any: ["reports:view:financial", "reports:view:operational"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings:manage" },
  { label: "Audit Logs", href: "/admin/audit", icon: FileText, permission: "audit:view" },
]

export const RECEPTIONIST_NAV: NavItem[] = [
  { label: "Dashboard", href: "/receptionist", icon: LayoutDashboard, any: ["dashboard:view:receptionist", "appointments:create"] },
  { label: "Fast Booking", href: "/booking", icon: Calendar, permission: "appointments:create" },
  { label: "Today's Board", href: "/receptionist", icon: ClipboardList, permission: "appointments:read:all" },
  { label: "Patients", href: "/receptionist", icon: Users, permission: "patients:read:all" },
  { label: "Queue", href: "/receptionist", icon: Clock, permission: "queue:manage" },
]

export const DOCTOR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/doctor", icon: LayoutDashboard, any: ["dashboard:view:doctor", "appointments:read:own"] },
  { label: "Patients", href: "/doctor", icon: Users, permission: "patients:read:assigned" },
  { label: "Schedule", href: "/doctor", icon: Calendar, permission: "schedule:manage:own" },
  { label: "Profile", href: "/doctor", icon: UserRound, permission: "doctors:update:own" },
]

export const ACCOUNTANT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/accountant", icon: LayoutDashboard, any: ["dashboard:view:accountant", "payments:read:all"] },
  { label: "Collections", href: "/accountant", icon: WalletCards, permission: "payments:read:all" },
  { label: "Refunds", href: "/accountant", icon: CreditCard, permission: "payments:refund" },
  { label: "Reports", href: "/accountant", icon: BarChart3, permission: "reports:view:financial" },
]

export const PATIENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/patient", icon: LayoutDashboard, any: ["dashboard:view:patient", "appointments:read:own"] },
  { label: "Book Visit", href: "/booking", icon: Calendar, permission: "appointments:create" },
  { label: "Appointments", href: "/patient", icon: ClipboardList, permission: "appointments:read:own" },
  { label: "Family", href: "/patient", icon: HeartHandshake, permission: "patients:update:own" },
  { label: "Payments", href: "/patient", icon: CreditCard, permission: "payments:read:own" },
]
