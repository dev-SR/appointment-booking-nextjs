import Link from "next/link"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarPlus, Heart, Users } from "lucide-react"

export default async function PatientPage() {
  const session = await auth()
  const patient = session?.user.id
    ? await prisma.patient.findUnique({
        where: { userId: session.user.id },
        include: {
          user: true,
          familyMembers: true,
          favouriteDoctors: {
            include: {
              doctor: { include: { user: { select: { nameEn: true } }, specialty: true } },
            },
          },
        },
      })
    : null
  const appointments = patient
    ? await prisma.appointment.findMany({
        where: { patientId: patient.id },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          doctor: { include: { user: { select: { nameEn: true } }, specialty: true } },
          chamber: true,
          payment: true,
        },
      })
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Portal</h1>
          <p className="text-muted-foreground">Appointments, family members, payments, and favourite doctors.</p>
        </div>
        <Button asChild><Link href="/booking"><CalendarPlus /> Book Appointment</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>My Appointments</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{appointments.length}</CardContent></Card>
        <Card><CardHeader><CardTitle>Family Members</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><span className="text-3xl font-bold">{patient?.familyMembers.length ?? 0}</span><Users className="text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader><CardTitle>Favourite Doctors</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><span className="text-3xl font-bold">{patient?.favouriteDoctors.length ?? 0}</span><Heart className="text-muted-foreground" /></CardContent></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>My Appointments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Chamber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>{appointment.date.toLocaleDateString()} · {appointment.startTime}</TableCell>
                    <TableCell>{appointment.doctor.user.nameEn}<br /><span className="text-xs text-muted-foreground">{appointment.doctor.specialty.nameEn}</span></TableCell>
                    <TableCell>{appointment.chamber.nameEn}</TableCell>
                    <TableCell><Badge variant="outline">{appointment.status}</Badge></TableCell>
                    <TableCell><Badge>{appointment.payment?.status ?? "PENDING"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Family Members</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {patient?.familyMembers.map((member) => (
                <div key={member.id} className="rounded-lg border p-3">
                  <p className="font-medium">{member.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{member.relationship}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Favourite Doctors</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {patient?.favouriteDoctors.map((favorite) => (
                <div key={favorite.doctorId} className="rounded-lg border p-3">
                  <p className="font-medium">{favorite.doctor.user.nameEn}</p>
                  <p className="text-xs text-muted-foreground">{favorite.doctor.specialty.nameEn}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
