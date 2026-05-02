"use client"

/**
 * Step 6: Payment Method Selection
 * Choose between Cash, Pay Later (online payments deferred to Phase 6).
 */

import { useBookingStore } from "@/store/booking.store"
import { useCreateAppointment } from "@/lib/hooks/use-appointments"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2, Banknote, Clock, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

const PAYMENT_METHODS = [
  {
    value: "CASH" as const,
    label: "Cash at Clinic",
    labelBn: "ক্লিনিকে ক্যাশ",
    description: "Pay when you arrive at the clinic",
    icon: Banknote,
    available: true,
  },
  {
    value: "PAY_LATER" as const,
    label: "Pay Later",
    labelBn: "পরে পেমেন্ট",
    description: "Book now, pay at a later time",
    icon: Clock,
    available: true,
  },
  {
    value: "BKASH" as const,
    label: "bKash",
    labelBn: "বিকাশ",
    description: "Pay instantly via bKash (coming soon)",
    icon: CreditCard,
    available: false,
  },
  {
    value: "NAGAD" as const,
    label: "Nagad",
    labelBn: "নগদ",
    description: "Pay instantly via Nagad (coming soon)",
    icon: CreditCard,
    available: false,
  },
]

export function StepPayment() {
  const {
    paymentMethod, setPaymentMethod,
    doctor, chamber, date, slot, symptoms, notes, familyMemberId, couponCode,
    setResult, nextStep, prevStep,
  } = useBookingStore()

  const createAppointment = useCreateAppointment()

  const handleConfirm = async () => {
    if (!doctor || !chamber || !date || !slot) return

    try {
      const result = await createAppointment.mutateAsync({
        doctorId: doctor.id,
        chamberId: chamber.id,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: "CONSULTATION",
        symptoms: symptoms || undefined,
        notes: notes || undefined,
        familyMemberId: familyMemberId || undefined,
        paymentMethod,
        couponCode: couponCode || undefined,
      })

      setResult(result.appointmentId, result.serialNumber)
      nextStep()
    } catch {
      // Error handled by React Query
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Payment</h2>
          <p className="text-muted-foreground mt-1">Choose how you'd like to pay</p>
        </div>
      </div>

      {/* Fee summary */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Consultation Fee</span>
          <span className="text-2xl font-bold text-primary">
            ৳ {((doctor?.consultationFee || 0) / 100).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment method selection */}
      <div className="grid gap-3">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon
          return (
            <Card
              key={method.value}
              className={cn(
                "cursor-pointer transition-all duration-200",
                !method.available && "opacity-50 cursor-not-allowed",
                paymentMethod === method.value
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              )}
              onClick={() => method.available && setPaymentMethod(method.value)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  paymentMethod === method.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  paymentMethod === method.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {paymentMethod === method.value && (
                    <svg className="h-full w-full text-primary-foreground p-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {createAppointment.isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {createAppointment.error.message}
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={createAppointment.isPending}
        className="w-full gap-2 h-12 text-base"
        size="lg"
      >
        {createAppointment.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Booking...
          </>
        ) : (
          "Confirm Booking"
        )}
      </Button>
    </div>
  )
}
