"use client"

/**
 * Admin Appointments Dashboard
 * Lists all appointments with filters, search, and status management.
 */

import { useState } from "react"
import { useAppointments } from "@/lib/hooks/use-appointments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Calendar, Search, Filter, Clock, CheckCircle2, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, Users, TrendingUp,
} from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending", variant: "outline", icon: Clock },
  CONFIRMED: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  CHECKED_IN: { label: "Checked In", variant: "secondary", icon: Users },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: TrendingUp },
  COMPLETED: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
  NO_SHOW: { label: "No Show", variant: "destructive", icon: AlertCircle },
  RESCHEDULED: { label: "Rescheduled", variant: "outline", icon: Calendar },
}

export default function AdminAppointmentsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useAppointments({
    page,
    limit: 20,
    status: statusFilter as unknown as undefined,
    sortBy: "date",
    sortOrder: "desc",
  })

  const result = data as Record<string, unknown> | undefined
  const appointments = (result?.data || []) as Record<string, unknown>[]
  const pagination = result?.pagination as Record<string, number> | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">Manage all appointments across the system</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Today", value: "—", icon: Calendar, color: "text-blue-600" },
          { label: "Confirmed", value: "—", icon: CheckCircle2, color: "text-green-600" },
          { label: "Pending", value: "—", icon: Clock, color: "text-amber-600" },
          { label: "Cancelled", value: "—", icon: XCircle, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-md border bg-background px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No appointments found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => {
                    const status = appt.status as string
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
                    const StatusIcon = config.icon
                    const patient = appt.patient as Record<string, unknown> | undefined
                    const doctor = appt.doctor as Record<string, unknown> | undefined
                    const payment = appt.payment as Record<string, unknown> | undefined
                    const patientUser = patient?.user as Record<string, string> | undefined

                    return (
                      <TableRow key={appt.id as string} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono font-bold text-primary">
                          #{appt.serialNumber as number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{patientUser?.nameEn || "—"}</p>
                            <p className="text-xs text-muted-foreground">{patientUser?.phone || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{(doctor?.user as Record<string, string>)?.nameEn || "—"}</p>
                            <p className="text-xs text-muted-foreground">{(doctor?.specialty as Record<string, string>)?.nameEn || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{appt.date ? new Date(appt.date as string).toLocaleDateString() : "—"}</p>
                            <p className="text-xs text-muted-foreground">{appt.startTime as string} - {appt.endTime as string}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ৳ {((appt.finalFee as number) / 100).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment?.status === "PAID" ? "default" : "outline"} className="text-xs">
                            {(payment?.status as string) || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
