"use client"

/**
 * Step 7: Booking Confirmation
 * Success screen with appointment details, serial number, and actions.
 */

import { useBookingStore } from "@/store/booking.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Calendar, MapPin, Clock, Hash, ArrowRight, Home } from "lucide-react"
import Link from "next/link"

export function StepConfirmation() {
  const { doctor, chamber, date, slot, appointmentId, serialNumber, reset } = useBookingStore()

  return (
    <div className="space-y-8 text-center">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
          Appointment Booked!
        </h2>
        <p className="text-muted-foreground mt-2">
          Your appointment has been successfully confirmed
        </p>
      </div>

      {/* Token number */}
      <div className="inline-flex flex-col items-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-8 py-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Token Number</span>
        <span className="text-5xl font-black text-primary mt-1">{serialNumber}</span>
      </div>

      {/* Appointment details card */}
      <Card className="text-left max-w-md mx-auto">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-medium">
                {date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-sm text-muted-foreground">{slot?.startTime} - {slot?.endTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doctor</p>
              <p className="font-medium">{doctor?.titleEn} {doctor?.nameEn}</p>
              <p className="text-sm text-muted-foreground">{doctor?.specialtyEn}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{chamber?.nameEn}</p>
              <p className="text-sm text-muted-foreground">{chamber?.addressEn}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Appointment ID</p>
              <p className="font-mono text-sm">{appointmentId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
        <Button
          variant="outline"
          className="gap-2 flex-1"
          onClick={reset}
          asChild
        >
          <Link href="/">
            <Home className="h-4 w-4" /> Go Home
          </Link>
        </Button>
        <Button
          className="gap-2 flex-1"
          onClick={reset}
        >
          Book Another <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
