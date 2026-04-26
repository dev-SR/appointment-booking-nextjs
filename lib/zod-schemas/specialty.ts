import { z } from 'zod';
import { paginationSchema, searchQuerySchema } from './common';

// Create specialty
export const createSpecialtySchema = z.object({
  nameEn: z.string().min(2).max(100),
  nameBn: z.string().max(100).optional(),
  iconUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateSpecialtyInput = z.infer<typeof createSpecialtySchema>;

// Update specialty
export const updateSpecialtySchema = createSpecialtySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateSpecialtyInput = z.infer<typeof updateSpecialtySchema>;

// List specialties query
export const listSpecialtiesQuerySchema = paginationSchema.merge(searchQuerySchema).extend({
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['nameEn', 'sortOrder', 'createdAt']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListSpecialtiesQuery = z.infer<typeof listSpecialtiesQuerySchema>;

// Specialty response
export const specialtyResponseSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameBn: z.string().nullable(),
  iconUrl: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  doctorCount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SpecialtyResponse = z.infer<typeof specialtyResponseSchema>;
