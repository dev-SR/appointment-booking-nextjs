import { getAuditSettings } from "@/lib/audit/audit-settings.cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminSettingsPage() {
  const auditSettings = await getAuditSettings()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">Operational settings with audit retention controls.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Audit Retention</CardTitle>
          <CardDescription>Use the API endpoints to toggle resource auditing or adjust retention days.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retention</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditSettings.map((setting) => (
                <TableRow key={setting.resourceType}>
                  <TableCell className="capitalize">{setting.resourceType}</TableCell>
                  <TableCell><Badge variant={setting.isEnabled ? "default" : "secondary"}>{setting.isEnabled ? "Enabled" : "Disabled"}</Badge></TableCell>
                  <TableCell>{setting.retentionDays ? `${setting.retentionDays} days` : "Forever"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
