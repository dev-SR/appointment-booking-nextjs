"use client"

/**
 * React Query hooks for appointments API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateAppointmentInput, ListAppointmentsQuery } from "@/lib/zod-schemas/appointment"

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  errors?: string[]
}

/**
 * List appointments with filters
 */
export function useAppointments(query: Partial<ListAppointmentsQuery> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, value instanceof Date ? value.toISOString() : String(value))
    }
  })

  return useQuery({
    queryKey: ["appointments", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?${params}`)
      const json: ApiResponse<unknown> = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to fetch appointments")
      return json.data
    },
  })
}

/**
 * Get a single appointment
 */
export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${id}`)
      const json: ApiResponse<unknown> = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to fetch appointment")
      return json.data
    },
    enabled: !!id,
  })
}

/**
 * Create a new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          date: input.date instanceof Date ? input.date.toISOString() : input.date,
        }),
      })
      const json: ApiResponse<{ appointmentId: string; serialNumber: number; status: string; finalFee: number }> = await res.json()
      if (!json.success) {
        throw new Error(json.errors?.join(", ") || json.error || "Failed to create appointment")
      }
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["slots"] })
      queryClient.invalidateQueries({ queryKey: ["slotDates"] })
    },
  })
}

/**
 * Cancel an appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const json: ApiResponse<unknown> = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to cancel appointment")
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["appointment"] })
      queryClient.invalidateQueries({ queryKey: ["slots"] })
    },
  })
}
