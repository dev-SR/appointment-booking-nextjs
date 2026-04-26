import { z } from 'zod';
import { bangladeshPhoneSchema, paginationSchema, searchQuerySchema } from './common';

// Create chamber
export const createChamberSchema = z.object({
  nameEn: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  addressEn: z.string().min(5).max(500),
  addressBn: z.string().max(500).optional(),
  phone: bangladeshPhoneSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type CreateChamberInput = z.infer<typeof createChamberSchema>;

// Update chamber
export const updateChamberSchema = createChamberSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateChamberInput = z.infer<typeof updateChamberSchema>;

// List chambers query
export const listChambersQuerySchema = paginationSchema.merge(searchQuerySchema).extend({
  isActive: z.coerce.boolean().optional(),
  doctorId: z.string().cuid().optional(),
  hasAvailableSlots: z.coerce.boolean().optional(),
  sortBy: z.enum(['nameEn', 'createdAt']).default('nameEn'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListChambersQuery = z.infer<typeof listChambersQuerySchema>;

// Chamber response (list view)
export const chamberListResponseSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameBn: z.string().nullable(),
  addressEn: z.string(),
  addressBn: z.string().nullable(),
  phone: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  isActive: z.boolean(),
  doctorsCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ChamberListResponse = z.infer<typeof chamberListResponseSchema>;

// Chamber response (detail view)
export const chamberDetailResponseSchema = chamberListResponseSchema.extend({
  doctors: z.array(z.object({
    id: z.string(),
    doctorId: z.string(),
    titleEn: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    specialtyEn: z.string(),
    isPrimary: z.boolean(),
    consultationFee: z.number(),
  })),
});

export type ChamberDetailResponse = z.infer<typeof chamberDetailResponseSchema>;

// Assign doctor to chamber
export const assignDoctorToChamberSchema = z.object({
  doctorId: z.string().cuid(),
  isPrimary: z.boolean().default(false),
});

export type AssignDoctorToChamberInput = z.infer<typeof assignDoctorToChamberSchema>;

// Update doctor-chamber assignment
export const updateDoctorChamberSchema = z.object({
  isPrimary: z.boolean(),
});

export type UpdateDoctorChamberInput = z.infer<typeof updateDoctorChamberSchema>;
