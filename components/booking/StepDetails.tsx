"use client"

/**
 * Step 5: Patient Details
 * Symptoms, notes, and optional family member selection.
 */

import { useBookingStore } from "@/store/booking.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight } from "lucide-react"

export function StepDetails() {
  const { symptoms, notes, setSymptoms, setNotes, nextStep, prevStep, doctor, date, slot } = useBookingStore()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Appointment Details</h2>
          <p className="text-muted-foreground mt-1">
            Add any information for the doctor (optional)
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Doctor</span>
            <span className="font-medium">{doctor?.titleEn} {doctor?.nameEn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{date?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{slot?.startTime} - {slot?.endTime}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="symptoms">Symptoms / Reason for Visit</Label>
          <Textarea
            id="symptoms"
            placeholder="Describe your symptoms or reason for visiting..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information for the doctor..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={nextStep} className="gap-2">
          Continue to Payment <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
