"use client"

/**
 * Step 2: Select Chamber
 * Shows chambers associated with the selected doctor.
 */

import { useQuery } from "@tanstack/react-query"
import { useBookingStore, type SelectedChamber } from "@/store/booking.store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Phone, ArrowLeft } from "lucide-react"

export function StepChamber() {
  const { doctor, setChamber, nextStep, prevStep, chamber: selectedChamber } = useBookingStore()

  const { data, isLoading } = useQuery({
    queryKey: ["doctorChambers", doctor?.id],
    queryFn: async () => {
      const res = await fetch(`/api/doctors/${doctor!.id}`)
      return res.json()
    },
    enabled: !!doctor?.id,
  })

  const chambers = data?.success ? (data.data?.chambers || []) : []

  const handleSelect = (ch: Record<string, unknown>) => {
    const selected: SelectedChamber = {
      id: ch.chamberId as string,
      nameEn: ch.nameEn as string,
      nameBn: ch.nameBn as string | null,
      addressEn: ch.addressEn as string,
    }
    setChamber(selected)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Select Chamber</h2>
          <p className="text-muted-foreground mt-1">
            Choose a location for your appointment with {doctor?.titleEn} {doctor?.nameEn}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : chambers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>No chambers available for this doctor</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {chambers.map((ch: Record<string, unknown>) => (
            <Card
              key={ch.chamberId as string}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 ${
                selectedChamber?.id === ch.chamberId ? "border-primary ring-2 ring-primary/20" : ""
              }`}
              onClick={() => handleSelect(ch)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{ch.nameEn as string}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{ch.addressEn as string}</p>
                    {ch.isPrimary === true && (
                      <span className="inline-block mt-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Primary Chamber
                      </span>
                    )}
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
