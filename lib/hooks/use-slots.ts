"use client"

/**
 * React Query hooks for slot engine API
 */

import { useQuery } from "@tanstack/react-query"
import type { AvailableSlotsResponse, AvailableDatesResponse } from "@/lib/zod-schemas/slot"

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

/**
 * Fetch available slots for a doctor on a specific date
 */
export function useAvailableSlots(
  doctorId: string | null,
  date: Date | null,
  chamberId?: string
) {
  return useQuery<AvailableSlotsResponse>({
    queryKey: ["slots", doctorId, date?.toISOString(), chamberId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (doctorId) params.set("doctorId", doctorId)
      if (date) params.set("date", date.toISOString())
      if (chamberId) params.set("chamberId", chamberId)

      const res = await fetch(`/api/slots?${params}`)
      const json: ApiResponse<AvailableSlotsResponse> = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to fetch slots")
      return json.data
    },
    enabled: !!doctorId && !!date,
    staleTime: 30 * 1000, // 30s — slots change frequently
  })
}

/**
 * Fetch available dates for a doctor in a date range
 */
export function useAvailableDates(
  doctorId: string | null,
  from: Date | null,
  to: Date | null,
  chamberId?: string
) {
  return useQuery<AvailableDatesResponse>({
    queryKey: ["slotDates", doctorId, from?.toISOString(), to?.toISOString(), chamberId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (doctorId) params.set("doctorId", doctorId)
      if (from) params.set("from", from.toISOString())
      if (to) params.set("to", to.toISOString())
      if (chamberId) params.set("chamberId", chamberId)

      const res = await fetch(`/api/slots/dates?${params}`)
      const json: ApiResponse<AvailableDatesResponse> = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to fetch dates")
      return json.data
    },
    enabled: !!doctorId && !!from && !!to,
    staleTime: 60 * 1000,
  })
}
