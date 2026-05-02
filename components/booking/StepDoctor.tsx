"use client"

/**
 * Step 1: Select Doctor
 * Searchable doctor list with specialty filters.
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBookingStore, type SelectedDoctor } from "@/store/booking.store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Star, MapPin, Stethoscope } from "lucide-react"

export function StepDoctor() {
  const [search, setSearch] = useState("")
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("")
  const { setDoctor, nextStep, doctor: selectedDoctor } = useBookingStore()

  // Fetch doctors
  const { data, isLoading } = useQuery({
    queryKey: ["doctors", search, specialtyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "20" })
      if (search) params.set("q", search)
      if (specialtyFilter) params.set("specialtyId", specialtyFilter)
      params.set("isAvailable", "true")
      const res = await fetch(`/api/doctors?${params}`)
      return res.json()
    },
  })

  // Fetch specialties for filter
  const { data: specialtiesData } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const res = await fetch("/api/specialties?limit=50")
      return res.json()
    },
  })

  const doctors = data?.success ? data.data || [] : []
  const specialties = specialtiesData?.success ? specialtiesData.data || [] : []

  const handleSelect = (doc: Record<string, unknown>) => {
    const selected: SelectedDoctor = {
      id: doc.id as string,
      titleEn: doc.titleEn as string,
      nameEn: doc.nameEn as string,
      nameBn: doc.nameBn as string | null,
      specialtyEn: (doc.specialty as Record<string, string>)?.nameEn || "",
      consultationFee: doc.consultationFee as number,
      profileImageUrl: doc.profileImageUrl as string | null,
    }
    setDoctor(selected)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select a Doctor</h2>
        <p className="text-muted-foreground mt-1">Choose a specialist for your appointment</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Specialties</option>
          {specialties.map((s: Record<string, unknown>) => (
            <option key={s.id as string} value={s.id as string}>
              {s.nameEn as string}
            </option>
          ))}
        </select>
      </div>

      {/* Doctor Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Stethoscope className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>No doctors found matching your criteria</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {doctors.map((doc: Record<string, unknown>) => (
            <Card
              key={doc.id as string}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 ${
                selectedDoctor?.id === doc.id ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => handleSelect(doc)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                    {((doc.titleEn as string) || "Dr")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {doc.titleEn as string} {doc.nameEn as string}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.qualificationsEn as string}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Stethoscope className="mr-1 h-3 w-3" />
                        {(doc.specialty as Record<string, string>)?.nameEn}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {doc.experienceYears as number} yrs exp
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">
                        ৳ {((doc.consultationFee as number) / 100).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs">4.8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
