import { z } from 'zod';
import { dayOfWeekSchema, paginationSchema, timeSchema } from './common';

// Exception type enum
export const exceptionTypeEnum = z.enum([
  'LEAVE',    // Full day off
  'HOLIDAY',  // Public holiday
  'BREAK',    // Mid-day break
  'EXTENDED', // Extended hours
  'REDUCED',  // Reduced hours
]);

// Create schedule (weekly template)
export const createScheduleSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  slotIntervalMins: z.number().int().min(5).max(120).default(15),
  maxPatients: z.number().int().min(1).max(10).nullable().default(null), // null = 1
}).refine(data => {
  const [startH, startM] = data.startTime.split(':').map(Number);
  const [endH, endM] = data.endTime.split(':').map(Number);
  return (startH * 60 + startM) < (endH * 60 + endM);
}, {
  message: 'End time must be after start time',
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

// Update schedule
export const updateScheduleSchema = z.object({
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  slotIntervalMins: z.number().int().min(5).max(120).optional(),
  maxPatients: z.number().int().min(1).max(10).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(data => {
  if (data.startTime && data.endTime) {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
  }
  return true;
}, {
  message: 'End time must be after start time',
});

export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

// Bulk update schedules (set entire week template)
export const bulkUpdateSchedulesSchema = z.object({
  schedules: z.array(createScheduleSchema).max(7),
});

export type BulkUpdateSchedulesInput = z.infer<typeof bulkUpdateSchedulesSchema>;

// List schedules query (for a doctor)
export const listSchedulesQuerySchema = z.object({
  doctorId: z.string().cuid(),
  isActive: z.coerce.boolean().optional(),
});

export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;

// Schedule response
export const scheduleResponseSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  dayOfWeek: z.number(),
  dayName: z.string(), // "Sunday", "Monday", etc.
  startTime: z.string(),
  endTime: z.string(),
  slotIntervalMins: z.number(),
  maxPatients: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScheduleResponse = z.infer<typeof scheduleResponseSchema>;

// Weekly schedule view (grouped by day)
export const weeklyScheduleResponseSchema = z.object({
  doctorId: z.string(),
  doctorName: z.string(),
  schedules: z.array(scheduleResponseSchema),
});

export type WeeklyScheduleResponse = z.infer<typeof weeklyScheduleResponseSchema>;

// Create schedule exception
export const createScheduleExceptionSchema = z.object({
  date: z.coerce.date(),
  exceptionType: exceptionTypeEnum,
  startTime: timeSchema.optional(), // For EXTENDED, REDUCED
  endTime: timeSchema.optional(),
  reason: z.string().max(500).optional(),
}).refine(data => {
  // LEAVE and HOLIDAY don't need times
  if (data.exceptionType === 'LEAVE' || data.exceptionType === 'HOLIDAY') {
    return true;
  }
  // BREAK, EXTENDED, REDUCED need times
  return data.startTime && data.endTime;
}, {
  message: 'Start and end times are required for this exception type',
}).refine(data => {
  if (data.startTime && data.endTime) {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    return (startH * 60 + startM) < (endH * 60 + endM);
  }
  return true;
}, {
  message: 'End time must be after start time',
});

export type CreateScheduleExceptionInput = z.infer<typeof createScheduleExceptionSchema>;

// Update schedule exception
export const updateScheduleExceptionSchema = createScheduleExceptionSchema.partial();

export type UpdateScheduleExceptionInput = z.infer<typeof updateScheduleExceptionSchema>;

// List schedule exceptions query
export const listScheduleExceptionsQuerySchema = paginationSchema.extend({
  doctorId: z.string().cuid(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  exceptionType: exceptionTypeEnum.optional(),
});

export type ListScheduleExceptionsQuery = z.infer<typeof listScheduleExceptionsQuerySchema>;

// Schedule exception response
export const scheduleExceptionResponseSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  date: z.date(),
  exceptionType: exceptionTypeEnum,
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ScheduleExceptionResponse = z.infer<typeof scheduleExceptionResponseSchema>;

// Holiday
export const createHolidaySchema = z.object({
  date: z.coerce.date(),
  nameEn: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  isRecurring: z.boolean().default(false), // Annual
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = createHolidaySchema.partial();

export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;

export const listHolidaysQuerySchema = paginationSchema.extend({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  isRecurring: z.coerce.boolean().optional(),
});

export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>;

export const holidayResponseSchema = z.object({
  id: z.string(),
  date: z.date(),
  nameEn: z.string(),
  nameBn: z.string().nullable(),
  isRecurring: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type HolidayResponse = z.infer<typeof holidayResponseSchema>;
