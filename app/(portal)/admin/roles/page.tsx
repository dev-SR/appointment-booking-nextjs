import prisma from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
  const groups = Array.from(new Set(permissions.map((permission) => permission.group)))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">Dynamic PBAC bundles. All checks use permission keys, never role names.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
            <CardDescription>System roles are locked from deletion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <p className="font-medium">{role.displayName}</p>
                      <p className="text-xs text-muted-foreground">{role.name}</p>
                    </TableCell>
                    <TableCell>{role._count.userRoles}</TableCell>
                    <TableCell><Badge variant={role.isSystem ? "secondary" : "outline"}>{role.isSystem ? "System" : "Custom"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>Create or update roles through the role API; this view shows current grants.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-3">
                <h2 className="font-semibold">{group}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {permissions.filter((permission) => permission.group === group).map((permission) => (
                    <div key={permission.id} className="rounded-lg border p-3">
                      <p className="font-mono text-sm">{permission.key}</p>
                      <p className="text-xs text-muted-foreground">{permission.displayName}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {roles
                          .filter((role) => role.rolePermissions.some((grant) => grant.permissionId === permission.id))
                          .map((role) => (
                            <Badge key={role.id} variant="outline">{role.displayName}</Badge>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
