import { z } from 'zod';

// Query schema for getting available slots
export const getAvailableSlotsQuerySchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.coerce.date(),
  chamberId: z.string().optional(),
});

export type GetAvailableSlotsQuery = z.infer<typeof getAvailableSlotsQuerySchema>;

// Query schema for getting available dates in a range
export const getAvailableDatesQuerySchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  from: z.coerce.date(),
  to: z.coerce.date(),
  chamberId: z.string().optional(),
}).refine(data => data.from <= data.to, {
  message: 'From date must be before or equal to to date',
});

export type GetAvailableDatesQuery = z.infer<typeof getAvailableDatesQuerySchema>;

// Individual slot shape
export const slotResponseSchema = z.object({
  startTime: z.string(), // "09:00"
  endTime: z.string(),   // "09:15"
  isAvailable: z.boolean(),
  remainingSlots: z.number().int().min(0),
});

export type SlotResponse = z.infer<typeof slotResponseSchema>;

// Available slots response
export const availableSlotsResponseSchema = z.object({
  doctorId: z.string(),
  date: z.string(), // ISO date string
  slots: z.array(slotResponseSchema),
  totalSlots: z.number(),
  availableCount: z.number(),
});

export type AvailableSlotsResponse = z.infer<typeof availableSlotsResponseSchema>;

// Available dates response
export const availableDatesResponseSchema = z.object({
  doctorId: z.string(),
  dates: z.array(z.object({
    date: z.string(), // ISO date string
    availableSlots: z.number().int().min(0),
  })),
});

export type AvailableDatesResponse = z.infer<typeof availableDatesResponseSchema>;
