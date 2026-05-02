import prisma from "@/lib/prisma"
import { getAuditSettings } from "@/lib/audit/audit-settings.cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AuditPage() {
  const [logs, settings] = await Promise.all([
    prisma.auditLog.findMany({ take: 50, orderBy: { createdAt: "desc" } }),
    getAuditSettings(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Append-only activity history and retention coverage.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {settings.map((setting) => (
          <Card key={setting.resourceType}>
            <CardHeader><CardTitle className="capitalize">{setting.resourceType}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={setting.isEnabled ? "default" : "secondary"}>{setting.isEnabled ? "Enabled" : "Off"}</Badge>
              <span className="text-sm text-muted-foreground">{setting.retentionDays ? `${setting.retentionDays}d` : "Forever"}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.createdAt.toLocaleString()}</TableCell>
                  <TableCell>{log.actorName ?? "System"}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell>{log.resourceType}</TableCell>
                  <TableCell>{log.resourceLabel ?? log.resourceId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
