import { PortalSidebar, PATIENT_NAV } from "@/components/layouts/PortalSidebar"
import { auth } from "@/lib/auth"
import { requirePortalAccess } from "@/lib/auth/portal-guard"

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  await requirePortalAccess({
    session,
    currentPath: "/patient",
    any: ["dashboard:view:patient", "appointments:read:own"],
  })

  return (
    <PortalSidebar portalName="Patient Portal" navItems={PATIENT_NAV}>
      {children}
    </PortalSidebar>
  )
}
