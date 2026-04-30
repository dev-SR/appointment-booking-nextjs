"use client"

/**
 * Booking Store (Zustand)
 *
 * Manages multi-step booking wizard state on the client side.
 * Tracks the user's selections across all 7 booking steps.
 */

import { create } from "zustand"

export interface SelectedDoctor {
  id: string
  titleEn: string
  nameEn: string
  nameBn?: string | null
  specialtyEn: string
  consultationFee: number
  profileImageUrl?: string | null
}

export interface SelectedChamber {
  id: string
  nameEn: string
  nameBn?: string | null
  addressEn: string
}

export interface SelectedSlot {
  startTime: string
  endTime: string
}

interface BookingState {
  // Current step (1-7)
  currentStep: number

  // Selections
  doctor: SelectedDoctor | null
  chamber: SelectedChamber | null
  date: Date | null
  slot: SelectedSlot | null
  symptoms: string
  notes: string
  familyMemberId: string | null
  paymentMethod: "BKASH" | "NAGAD" | "STRIPE" | "CASH" | "PAY_LATER"
  couponCode: string

  // Result
  appointmentId: string | null
  serialNumber: number | null

  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setDoctor: (doctor: SelectedDoctor) => void
  setChamber: (chamber: SelectedChamber) => void
  setDate: (date: Date) => void
  setSlot: (slot: SelectedSlot) => void
  setSymptoms: (symptoms: string) => void
  setNotes: (notes: string) => void
  setFamilyMemberId: (id: string | null) => void
  setPaymentMethod: (method: BookingState["paymentMethod"]) => void
  setCouponCode: (code: string) => void
  setResult: (appointmentId: string, serialNumber: number) => void
  reset: () => void
}

const initialState = {
  currentStep: 1,
  doctor: null,
  chamber: null,
  date: null,
  slot: null,
  symptoms: "",
  notes: "",
  familyMemberId: null,
  paymentMethod: "CASH" as const,
  couponCode: "",
  appointmentId: null,
  serialNumber: null,
}

export const useBookingStore = create<BookingState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 7) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
  setDoctor: (doctor) => set({ doctor, chamber: null, date: null, slot: null }),
  setChamber: (chamber) => set({ chamber, date: null, slot: null }),
  setDate: (date) => set({ date, slot: null }),
  setSlot: (slot) => set({ slot }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setNotes: (notes) => set({ notes }),
  setFamilyMemberId: (familyMemberId) => set({ familyMemberId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCouponCode: (couponCode) => set({ couponCode }),
  setResult: (appointmentId, serialNumber) => set({ appointmentId, serialNumber }),
  reset: () => set(initialState),
}))
