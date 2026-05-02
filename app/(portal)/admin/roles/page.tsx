import prisma from "@/lib/prisma"
import { RoleManager } from "@/components/admin/roles/RoleManager"
import { PermissionManager } from "@/components/admin/permissions/PermissionManager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Roles & Permissions | Admin Portal",
  description: "Manage system roles and permissions",
}

export default async function RolesPage() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { displayName: "asc" },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    }),
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">
          Dynamic PBAC bundles. Manage custom roles and the fine-grained permissions that back them.
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="border-none p-0 outline-none">
          <RoleManager roles={roles} permissions={permissions} />
        </TabsContent>
        <TabsContent value="permissions" className="border-none p-0 outline-none">
          <PermissionManager permissions={permissions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

