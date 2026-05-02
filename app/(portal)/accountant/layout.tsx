import { PortalSidebar, ACCOUNTANT_NAV } from "@/components/layouts/PortalSidebar"
import { auth } from "@/lib/auth"
import { requirePortalAccess } from "@/lib/auth/portal-guard"

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  await requirePortalAccess({
    session,
    currentPath: "/accountant",
    any: ["dashboard:view:accountant", "payments:read:all", "reports:view:financial"],
  })

  return (
    <PortalSidebar portalName="Accountant Portal" navItems={ACCOUNTANT_NAV}>
      {children}
    </PortalSidebar>
  )
}
