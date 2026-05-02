import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, Stethoscope, UserRound } from "lucide-react"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export default async function DoctorPage() {
  const session = await auth()
  const doctor = session?.user.id
    ? await prisma.doctor.findUnique({
        where: { userId: session.user.id },
        include: { user: true, specialty: true, schedules: true, chambers: { include: { chamber: true } } },
      })
    : null
  const { start, end } = todayRange()
  const appointments = doctor
    ? await prisma.appointment.findMany({
        where: { doctorId: doctor.id, date: { gte: start, lte: end } },
        orderBy: [{ startTime: "asc" }],
        include: {
          patient: { include: { user: { select: { nameEn: true, phone: true } } } },
          chamber: { select: { nameEn: true } },
        },
      })
    : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor Workspace</h1>
        <p className="text-muted-foreground">Today&apos;s patients, schedule, availability, and profile status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Today&apos;s Patients</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{appointments.length}</span>
            <Stethoscope className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Available</CardTitle></CardHeader>
          <CardContent><Badge variant={doctor?.isAvailable ? "default" : "secondary"}>{doctor?.isAvailable ? "Accepting visits" : "Paused"}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Specialty</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{doctor?.specialty.nameEn ?? "Profile pending"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Today&apos;s Patients</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chamber</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>#{appointment.serialNumber}</TableCell>
                    <TableCell>{appointment.startTime}</TableCell>
                    <TableCell>{appointment.patient.user.nameEn}<br /><span className="text-xs text-muted-foreground">{appointment.patient.user.phone}</span></TableCell>
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
            <CardHeader><CardTitle>Schedule Calendar</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {doctor?.schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <CalendarDays className="text-muted-foreground" />
                  <div>
                    <p className="font-medium">Day {schedule.dayOfWeek}</p>
                    <p className="text-xs text-muted-foreground">{schedule.startTime} - {schedule.endTime}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Profile Editor</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-3">
              <UserRound className="text-muted-foreground" />
              <div>
                <p className="font-medium">{doctor ? `${doctor.titleEn} ${doctor.user.nameEn}` : "No doctor profile"}</p>
                <p className="text-xs text-muted-foreground">{doctor?.qualificationsEn ?? "Ask admin to complete profile setup."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
