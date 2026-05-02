"use client"

/**
 * Step 4: Select Time Slot
 * Grid of available time slots for the selected date.
 */

import { useBookingStore, type SelectedSlot } from "@/store/booking.store"
import { useAvailableSlots } from "@/lib/hooks/use-slots"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function StepSlot() {
  const { doctor, chamber, date, slot: selectedSlot, setSlot, nextStep, prevStep } = useBookingStore()

  const { data: slotsData, isLoading } = useAvailableSlots(
    doctor?.id || null,
    date,
    chamber?.id
  )

  const slots = slotsData?.slots || []
  const availableSlots = slots.filter((s) => s.isAvailable)

  const handleSelect = (slot: { startTime: string; endTime: string }) => {
    setSlot({ startTime: slot.startTime, endTime: slot.endTime })
    nextStep()
  }

  // Group slots by morning/afternoon/evening
  const morning = availableSlots.filter((s) => {
    const h = parseInt(s.startTime.split(":")[0])
    return h < 12
  })
  const afternoon = availableSlots.filter((s) => {
    const h = parseInt(s.startTime.split(":")[0])
    return h >= 12 && h < 17
  })
  const evening = availableSlots.filter((s) => {
    const h = parseInt(s.startTime.split(":")[0])
    return h >= 17
  })

  const renderSlotGroup = (
    label: string,
    icon: string,
    slots: typeof availableSlots
  ) => {
    if (slots.length === 0) return null
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>{icon}</span> {label}
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{slots.length} slots</span>
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              onClick={() => handleSelect(slot)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
                selectedSlot?.startTime === slot.startTime
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background"
              )}
            >
              {slot.startTime}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Select Time</h2>
          <p className="text-muted-foreground mt-1">
            {availableSlots.length} slots available
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p>No available time slots for this date</p>
          <Button variant="outline" onClick={prevStep} className="mt-4">
            Choose another date
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSlotGroup("Morning", "🌅", morning)}
          {renderSlotGroup("Afternoon", "☀️", afternoon)}
          {renderSlotGroup("Evening", "🌆", evening)}
        </div>
      )}
    </div>
  )
}
