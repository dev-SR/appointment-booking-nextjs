import { PortalSidebar, DOCTOR_NAV } from "@/components/layouts/PortalSidebar"
import { auth } from "@/lib/auth"
import { requirePortalAccess } from "@/lib/auth/portal-guard"

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  await requirePortalAccess({
    session,
    currentPath: "/doctor",
    any: ["dashboard:view:doctor", "appointments:read:own", "schedule:manage:own"],
  })

  return (
    <PortalSidebar portalName="Doctor Portal" navItems={DOCTOR_NAV}>
      {children}
    </PortalSidebar>
  )
}
