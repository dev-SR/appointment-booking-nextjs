import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Receipt, RotateCcw, WalletCards } from "lucide-react"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export default async function AccountantPage() {
  const { start, end } = todayRange()
  const [payments, paidToday, outstanding, refunds] = await Promise.all([
    prisma.payment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { nameEn: true, phone: true } } } },
            doctor: { include: { user: { select: { nameEn: true } } } },
          },
        },
      },
    }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.payment.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.payment.count({ where: { status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } } }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts Desk</h1>
        <p className="text-muted-foreground">Daily collections, outstanding payments, refunds, and invoices.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Daily Collection</CardTitle></CardHeader><CardContent className="text-3xl font-bold">৳ {((paidToday._sum.amount ?? 0) / 100).toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle>Outstanding</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{outstanding}</CardContent></Card>
        <Card><CardHeader><CardTitle>Refund Cases</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{refunds}</CardContent></Card>
        <Card><CardHeader><CardTitle>Cash Register</CardTitle></CardHeader><CardContent><Button size="sm" variant="outline"><WalletCards /> Register cash</Button></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Payment Ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.appointment.patient.user.nameEn}</TableCell>
                  <TableCell>{payment.appointment.doctor.user.nameEn}</TableCell>
                  <TableCell>৳ {(payment.amount / 100).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={payment.status === "PAID" ? "default" : "outline"}>{payment.status}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline"><Receipt /> Receipt</Button>
                    <Button size="sm" variant="outline"><RotateCcw /> Refund</Button>
                    <Button size="sm" variant="outline"><FileText /> Invoice</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
