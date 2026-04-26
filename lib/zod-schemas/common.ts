import { z } from 'zod';

// Bangladesh phone number format: +8801[3-9]XXXXXXXX
export const bangladeshPhoneSchema = z
  .string()
  .regex(/^\+8801[3-9]\d{8}$/, 'Invalid Bangladesh phone number format');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Common response wrapper
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// ID param
export const idParamSchema = z.object({
  id: z.string().cuid(),
});

// Time format (24h)
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)');

// Day of week (0 = Sunday, 6 = Saturday)
export const dayOfWeekSchema = z.number().int().min(0).max(6);

// Currency in paisa (integer)
export const paisaSchema = z.number().int().min(0);

// Bilingual text
export const bilingualTextSchema = z.object({
  en: z.string().min(1),
  bn: z.string().optional(),
});

// Sort order
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// Date range
export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine(data => data.from <= data.to, {
  message: 'From date must be before or equal to to date',
});

// Search query
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

// Status filter
export const statusFilterSchema = <T extends [string, ...string[]]>(statuses: T) =>
  z.object({
    status: z.enum(statuses).optional(),
  });
