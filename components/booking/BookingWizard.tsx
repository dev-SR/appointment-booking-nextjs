"use client"

/**
 * BookingWizard — Multi-step appointment booking flow
 *
 * 7 steps: Doctor → Chamber → Date → Slot → Details → Payment → Confirmation
 * Uses Zustand booking store for state management.
 * GSAP slide animation between steps.
 */

import { useRef, useEffect } from "react"
import { useBookingStore } from "@/store/booking.store"
import { StepDoctor } from "./StepDoctor"
import { StepChamber } from "./StepChamber"
import { StepDate } from "./StepDate"
import { StepSlot } from "./StepSlot"
import { StepDetails } from "./StepDetails"
import { StepPayment } from "./StepPayment"
import { StepConfirmation } from "./StepConfirmation"
import { cn } from "@/lib/utils"

const STEPS = [
  { num: 1, label: "Doctor", labelBn: "ডাক্তার" },
  { num: 2, label: "Chamber", labelBn: "চেম্বার" },
  { num: 3, label: "Date", labelBn: "তারিখ" },
  { num: 4, label: "Time", labelBn: "সময়" },
  { num: 5, label: "Details", labelBn: "বিবরণ" },
  { num: 6, label: "Payment", labelBn: "পেমেন্ট" },
  { num: 7, label: "Confirm", labelBn: "নিশ্চিত" },
]

import type { SelectedDoctor } from "@/store/booking.store"

export function BookingWizard({ initialDoctor }: { initialDoctor?: SelectedDoctor }) {
  const currentStep = useBookingStore((s) => s.currentStep)
  const setDoctor = useBookingStore((s) => s.setDoctor)
  const setStep = useBookingStore((s) => s.setStep)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialDoctor && currentStep === 1) {
      setDoctor(initialDoctor)
      setStep(2)
    }
  }, [initialDoctor, setDoctor, setStep, currentStep])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                  currentStep === step.num
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                    : currentStep > step.num
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.num ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium hidden sm:block",
                currentStep === step.num ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div ref={containerRef} className="min-h-[400px]">
        {currentStep === 1 && <StepDoctor />}
        {currentStep === 2 && <StepChamber />}
        {currentStep === 3 && <StepDate />}
        {currentStep === 4 && <StepSlot />}
        {currentStep === 5 && <StepDetails />}
        {currentStep === 6 && <StepPayment />}
        {currentStep === 7 && <StepConfirmation />}
      </div>
    </div>
  )
}
