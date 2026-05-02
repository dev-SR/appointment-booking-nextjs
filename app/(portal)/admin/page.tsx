import Link from "next/link"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { can } from "@/lib/services/authorization.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, Calendar, Clock, CreditCard, Settings, Shield, Users } from "lucide-react"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export default async function AdminPage() {
  const session = await auth()
  const userId = session?.user.id ?? ""
  const { start, end } = todayRange()
  const [
    canOperational,
    canFinancial,
    canAppointments,
    canQueue,
    canRoles,
    canAudit,
    canSettings,
  ] = await Promise.all([
    can(userId, "reports:view:operational"),
    can(userId, "reports:view:financial"),
    can(userId, "appointments:read:all"),
    can(userId, "queue:manage"),
    can(userId, "roles:manage"),
    can(userId, "audit:view"),
    can(userId, "settings:manage"),
  ])

  const [appointmentCount, patientCount, queueCount, revenue, recentAppointments, auditLogs] =
    await Promise.all([
      canOperational
        ? prisma.appointment.count({ where: { date: { gte: start, lte: end } } })
        : Promise.resolve(0),
      canOperational ? prisma.patient.count() : Promise.resolve(0),
      canQueue
        ? prisma.queueEntry.count({ where: { date: { gte: start, lte: end }, status: "WAITING" } })
        : Promise.resolve(0),
      canFinancial
        ? prisma.payment.aggregate({
            where: { status: "PAID", paidAt: { gte: start, lte: end } },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
      canAppointments
        ? prisma.appointment.findMany({
            where: { date: { gte: start, lte: end } },
            take: 6,
            orderBy: [{ startTime: "asc" }],
            include: {
              patient: { include: { user: { select: { nameEn: true, phone: true } } } },
              doctor: { include: { user: { select: { nameEn: true } } } },
              chamber: { select: { nameEn: true } },
            },
          })
        : Promise.resolve([]),
      canAudit
        ? prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: "desc" } })
        : Promise.resolve([]),
    ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Operations, access, revenue, and audit visibility in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {canOperational && (
          <>
            <Card>
              <CardHeader><CardTitle>Bookings Today</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{appointmentCount}</span>
                <Calendar className="text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Total Patients</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{patientCount}</span>
                <Users className="text-muted-foreground" />
              </CardContent>
            </Card>
          </>
        )}
        {canQueue && (
          <Card>
            <CardHeader><CardTitle>Waiting Queue</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-bold">{queueCount}</span>
              <Clock className="text-muted-foreground" />
            </CardContent>
          </Card>
        )}
        {canFinancial && (
          <Card>
            <CardHeader><CardTitle>Collected Today</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-bold">৳ {((revenue._sum.amount ?? 0) / 100).toLocaleString()}</span>
              <CreditCard className="text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {canAppointments && (
          <Card>
            <CardHeader><CardTitle>Today&apos;s Bookings</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{appointment.startTime}</TableCell>
                      <TableCell>{appointment.patient.user.nameEn}</TableCell>
                      <TableCell>{appointment.doctor.user.nameEn}</TableCell>
                      <TableCell><Badge variant="outline">{appointment.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {canRoles && (
            <Card>
              <CardHeader><CardTitle>Role Controls</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Manage dynamic permission bundles.</p>
                <Button asChild size="sm"><Link href="/admin/roles"><Shield /> Roles</Link></Button>
              </CardContent>
            </Card>
          )}
          {canSettings && (
            <Card>
              <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Audit retention and resource toggles.</p>
                <Button asChild size="sm" variant="outline"><Link href="/admin/settings"><Settings /> Settings</Link></Button>
              </CardContent>
            </Card>
          )}
          {canAudit && (
            <Card>
              <CardHeader><CardTitle>Audit Activity</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Activity className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.resourceType} · {log.resourceLabel ?? log.resourceId}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
