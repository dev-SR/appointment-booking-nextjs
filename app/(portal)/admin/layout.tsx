/**
 * Admin Portal Layout
 * Wraps admin pages with the portal sidebar.
 */

import { PortalSidebar, ADMIN_NAV } from "@/components/layouts/PortalSidebar"
import { auth } from "@/lib/auth"
import { requirePortalAccess } from "@/lib/auth/portal-guard"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  await requirePortalAccess({
    session,
    currentPath: "/admin",
    any: [
      "dashboard:view:admin",
      "settings:manage",
      "roles:manage",
      "reports:view:operational",
    ],
  })

  return (
    <PortalSidebar portalName="Admin Portal" navItems={ADMIN_NAV}>
      {children}
    </PortalSidebar>
  )
}
