import Link from "next/link"
import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarPlus, Clock, Search, UserCheck } from "lucide-react"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export default async function ReceptionistPage() {
  const { start, end } = todayRange()
  const [appointments, queueEntries, patients] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: [{ startTime: "asc" }],
      take: 20,
      include: {
        patient: { include: { user: { select: { nameEn: true, phone: true } } } },
        doctor: { include: { user: { select: { nameEn: true } } } },
        chamber: { select: { nameEn: true } },
      },
    }),
    prisma.queueEntry.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: [{ tokenNumber: "asc" }],
      take: 12,
    }),
    prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { nameEn: true, phone: true } } },
    }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reception Desk</h1>
          <p className="text-muted-foreground">Fast booking, check-in, walk-ins, and today&apos;s board.</p>
        </div>
        <Button asChild><Link href="/booking"><CalendarPlus /> Fast Booking</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Today&apos;s Board</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{appointments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Waiting Queue</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{queueEntries.filter((entry) => entry.status === "WAITING").length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>New Patients</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{patients.length}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Check-In Panel</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.startTime}</TableCell>
                    <TableCell>{appointment.patient.user.nameEn}<br /><span className="text-xs text-muted-foreground">{appointment.patient.user.phone}</span></TableCell>
                    <TableCell>{appointment.doctor.user.nameEn}</TableCell>
                    <TableCell>{appointment.chamber.nameEn}</TableCell>
                    <TableCell><Badge variant="outline">{appointment.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Walk-In Queue</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {queueEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">#{entry.tokenNumber} {entry.patientName}</p>
                    <p className="text-xs text-muted-foreground">{entry.patientPhone}</p>
                  </div>
                  <Badge>{entry.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Patient Search</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {patients.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Search className="text-muted-foreground" />
                  <div>
                    <p className="font-medium">{patient.user.nameEn}</p>
                    <p className="text-xs text-muted-foreground">{patient.user.phone}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Counter Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline"><UserCheck /> One-click check-in</Button>
              <Button size="sm" variant="outline"><Clock /> Late override</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
