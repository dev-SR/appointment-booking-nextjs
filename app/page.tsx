import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import prisma from "@/lib/prisma"
import Link from "next/link"

export default async function Page() {
  // Fetch stats from the database
  const [specialtyCount, roleCount, permissionCount, chamberCount] = await Promise.all([
    prisma.specialty.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.chamber.count(),
  ])

  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: { rolePermissions: true },
      },
    },
  })

  const specialties = await prisma.specialty.findMany({
    orderBy: { sortOrder: "asc" },
    take: 8,
  })

  return (
    <div className="min-h-svh bg-background p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Doctor Appointment System
          </h1>
          <p className="mt-2 text-muted-foreground">
            Phase 1 Foundation Complete - PBAC Authorization & NextAuth.js v5 Setup
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Permissions</CardDescription>
              <CardTitle className="text-4xl">{permissionCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">PBAC permission keys</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System Roles</CardDescription>
              <CardTitle className="text-4xl">{roleCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Pre-configured roles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Specialties</CardDescription>
              <CardTitle className="text-4xl">{specialtyCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Medical specializations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Chambers</CardDescription>
              <CardTitle className="text-4xl">{chamberCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Clinic locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Roles & Permissions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Pre-configured roles with PBAC permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{role.displayName}</p>
                      <p className="text-sm text-muted-foreground">{role.name}</p>
                    </div>
                    <Badge variant={role.isSystem ? "default" : "secondary"}>
                      {role._count.rolePermissions} permissions
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Specialties</CardTitle>
              <CardDescription>
                Available specializations (Bengali & English)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {specialties.map((specialty) => (
                  <div
                    key={specialty.id}
                    className="rounded-lg border p-3"
                  >
                    <p className="font-medium">{specialty.nameEn}</p>
                    <p className="text-sm text-muted-foreground">{specialty.nameBn}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phase 1 Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Phase 1 - Foundation Complete</CardTitle>
            <CardDescription>
              Database schema, PBAC authorization, and authentication are ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm">Prisma Schema</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm">PBAC Service</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm">NextAuth.js v5</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-sm">Database Seeded</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/api/auth/providers">View Auth Providers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dev Info */}
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Dev Login:</strong> Phone: +8801700000000 (Super Admin) - OTP will be logged to console in development mode.
          </p>
        </div>
      </div>
    </div>
  )
}
