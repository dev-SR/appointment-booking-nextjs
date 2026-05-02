import { PortalSidebar, RECEPTIONIST_NAV } from "@/components/layouts/PortalSidebar"
import { auth } from "@/lib/auth"
import { requirePortalAccess } from "@/lib/auth/portal-guard"

export default async function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  await requirePortalAccess({
    session,
    currentPath: "/receptionist",
    any: ["dashboard:view:receptionist"],
    all: ["appointments:create", "queue:manage"],
  })

  return (
    <PortalSidebar portalName="Receptionist Portal" navItems={RECEPTIONIST_NAV}>
      {children}
    </PortalSidebar>
  )
}
