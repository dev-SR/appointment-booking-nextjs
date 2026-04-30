"use client"

/**
 * Admin Portal Layout
 * Wraps admin pages with the portal sidebar.
 */

import { PortalSidebar, ADMIN_NAV } from "@/components/layouts/PortalSidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalSidebar portalName="Admin Portal" navItems={ADMIN_NAV}>
      {children}
    </PortalSidebar>
  )
}
