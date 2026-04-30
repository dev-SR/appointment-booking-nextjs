"use client"

/**
 * Step 3: Select Date
 * Calendar with available dates highlighted.
 */

import { useMemo } from "react"
import { useBookingStore } from "@/store/booking.store"
import { useAvailableDates } from "@/lib/hooks/use-slots"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { addDays, format } from "date-fns"

export function StepDate() {
  const { doctor, chamber, date: selectedDate, setDate, nextStep, prevStep } = useBookingStore()

  const from = new Date()
  const to = addDays(from, 30)

  const { data: datesData, isLoading } = useAvailableDates(
    doctor?.id || null,
    from,
    to,
    chamber?.id
  )

  // Build set of available dates for quick lookup
  const availableDateSet = useMemo(() => {
    const set = new Set<string>()
    if (datesData?.dates) {
      for (const d of datesData.dates) {
        set.add(d.date)
      }
    }
    return set
  }, [datesData])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date)
      nextStep()
    }
  }

  // Disable dates without available slots
  const disabledDays = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today || !availableDateSet.has(dateStr)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Select Date</h2>
          <p className="text-muted-foreground mt-1">
            Pick a date for your appointment with {doctor?.titleEn} {doctor?.nameEn}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <Skeleton className="h-[350px] w-[350px] rounded-xl" />
        </div>
      ) : availableDateSet.size === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>No available dates in the next 30 days</p>
          <p className="text-sm mt-1">Try selecting a different doctor or chamber</p>
        </div>
      ) : (
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            fromDate={new Date()}
            toDate={to}
            className="rounded-xl border shadow-sm p-4"
          />
        </div>
      )}

      {selectedDate && (
        <p className="text-center text-sm text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
        </p>
      )}
    </div>
  )
}
