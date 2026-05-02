import { z } from 'zod';
import { paginationSchema } from './common';

// Appointment status enum
export const appointmentStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
]);

export type AppointmentStatusEnum = z.infer<typeof appointmentStatusEnum>;

// Appointment type enum
export const appointmentTypeEnum = z.enum([
  'CONSULTATION',
  'FOLLOW_UP',
  'PROCEDURE',
  'EMERGENCY',
]);

export type AppointmentTypeEnum = z.infer<typeof appointmentTypeEnum>;

// Payment method for booking
export const paymentMethodEnum = z.enum([
  'BKASH',
  'NAGAD',
  'STRIPE',
  'CASH',
  'PAY_LATER',
]);

export type PaymentMethodEnum = z.infer<typeof paymentMethodEnum>;

// Create appointment
export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  chamberId: z.string().min(1, 'Chamber ID is required'),
  date: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  type: appointmentTypeEnum.default('CONSULTATION'),
  symptoms: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  familyMemberId: z.string().optional(),
  couponCode: z.string().max(50).optional(),
  paymentMethod: paymentMethodEnum.default('CASH'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// Cancel appointment
export const cancelAppointmentSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

// Reschedule appointment
export const rescheduleAppointmentSchema = z.object({
  newDate: z.coerce.date(),
  newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

// List appointments query
export const listAppointmentsQuerySchema = paginationSchema.extend({
  patientId: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  doctorId: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  chamberId: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  dateFrom: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
  dateTo: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
  status: z.preprocess((val) => (val === '' ? undefined : val), appointmentStatusEnum.optional()),
  type: z.preprocess((val) => (val === '' ? undefined : val), appointmentTypeEnum.optional()),
  sortBy: z.preprocess((val) => (val === '' ? undefined : val), z.enum(['date', 'createdAt', 'serialNumber']).default('date')),
  sortOrder: z.preprocess((val) => (val === '' ? undefined : val), z.enum(['asc', 'desc']).default('desc')),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

// Appointment response
export const appointmentResponseSchema = z.object({
  id: z.string(),
  serialNumber: z.number(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: appointmentStatusEnum,
  type: appointmentTypeEnum,
  isFollowUp: z.boolean(),
  symptoms: z.string().nullable(),
  notes: z.string().nullable(),
  consultationFee: z.number(),
  discountAmount: z.number(),
  finalFee: z.number(),
  checkedInAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.string(),
  patient: z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    phone: z.string(),
  }),
  doctor: z.object({
    id: z.string(),
    titleEn: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    specialtyEn: z.string(),
  }),
  chamber: z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    addressEn: z.string(),
  }),
  familyMember: z.object({
    id: z.string(),
    nameEn: z.string(),
    relationship: z.string(),
  }).nullable(),
  payment: z.object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
    provider: z.string().nullable(),
  }).nullable(),
});

export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;

// Fee calculation response
export const feeCalculationResponseSchema = z.object({
  baseFee: z.number(),
  isFollowUp: z.boolean(),
  adjustments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    amount: z.number(),
  })),
  discounts: z.array(z.object({
    name: z.string(),
    type: z.string(),
    amount: z.number(),
  })),
  creditsApplied: z.number(),
  finalFee: z.number(),
});

export type FeeCalculationResponse = z.infer<typeof feeCalculationResponseSchema>;
