import { z } from 'zod';
import { bangladeshPhoneSchema, paginationSchema, paisaSchema, searchQuerySchema } from './common';

// Create doctor
export const createDoctorSchema = z.object({
  // User fields
  phone: bangladeshPhoneSchema,
  email: z.string().email().optional(),
  nameEn: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  profileImageUrl: z.string().url().optional(),
  
  // Doctor fields
  registrationNumber: z.string().min(3).max(50), // BMDC registration
  specialtyId: z.string().cuid(),
  titleEn: z.string().min(2).max(50), // "Dr.", "Prof. Dr."
  titleBn: z.string().max(50).optional(),
  bioEn: z.string().max(2000).optional(),
  bioBn: z.string().max(2000).optional(),
  qualificationsEn: z.string().min(2).max(500), // "MBBS, FCPS, MD"
  qualificationsBn: z.string().max(500).optional(),
  experienceYears: z.number().int().min(0).max(70),
  consultationFee: paisaSchema.min(0), // Base fee in paisa
  followUpFee: paisaSchema.min(0),
  followUpValidDays: z.number().int().min(1).max(365).default(30),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

// Update doctor (own profile)
export const updateDoctorOwnSchema = z.object({
  titleEn: z.string().min(2).max(50).optional(),
  titleBn: z.string().max(50).optional(),
  bioEn: z.string().max(2000).optional(),
  bioBn: z.string().max(2000).optional(),
  qualificationsEn: z.string().min(2).max(500).optional(),
  qualificationsBn: z.string().max(500).optional(),
  profileImageUrl: z.string().url().optional(),
});

export type UpdateDoctorOwnInput = z.infer<typeof updateDoctorOwnSchema>;

// Update doctor (admin)
export const updateDoctorAdminSchema = updateDoctorOwnSchema.extend({
  specialtyId: z.string().cuid().optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  consultationFee: paisaSchema.optional(),
  followUpFee: paisaSchema.optional(),
  followUpValidDays: z.number().int().min(1).max(365).optional(),
  isAvailable: z.boolean().optional(),
});

export type UpdateDoctorAdminInput = z.infer<typeof updateDoctorAdminSchema>;

// List doctors query
export const listDoctorsQuerySchema = paginationSchema.merge(searchQuerySchema).extend({
  specialtyId: z.string().cuid().optional(),
  chamberId: z.string().cuid().optional(),
  isAvailable: z.coerce.boolean().optional(),
  minExperience: z.coerce.number().int().min(0).optional(),
  maxFee: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(['nameEn', 'experienceYears', 'consultationFee', 'createdAt']).default('nameEn'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;

// Doctor response (list view)
export const doctorListResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  registrationNumber: z.string(),
  titleEn: z.string(),
  titleBn: z.string().nullable(),
  nameEn: z.string(),
  nameBn: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
  qualificationsEn: z.string(),
  qualificationsBn: z.string().nullable(),
  experienceYears: z.number(),
  consultationFee: z.number(),
  followUpFee: z.number(),
  isAvailable: z.boolean(),
  specialty: z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
  }),
  chambersCount: z.number().optional(),
});

export type DoctorListResponse = z.infer<typeof doctorListResponseSchema>;

// Doctor response (detail view)
export const doctorDetailResponseSchema = doctorListResponseSchema.extend({
  bioEn: z.string().nullable(),
  bioBn: z.string().nullable(),
  followUpValidDays: z.number(),
  chambers: z.array(z.object({
    id: z.string(),
    chamberId: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    addressEn: z.string(),
    isPrimary: z.boolean(),
  })),
  services: z.array(z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    durationMinutes: z.number(),
    fee: z.number(),
    isActive: z.boolean(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DoctorDetailResponse = z.infer<typeof doctorDetailResponseSchema>;

// Doctor service (add/update)
export const doctorServiceSchema = z.object({
  nameEn: z.string().min(2).max(100),
  nameBn: z.string().max(100).optional(),
  durationMinutes: z.number().int().min(5).max(240).default(15),
  fee: paisaSchema,
  preBufferMinutes: z.number().int().min(0).max(60).default(0),
  postBufferMinutes: z.number().int().min(0).max(60).default(0),
});

export type DoctorServiceInput = z.infer<typeof doctorServiceSchema>;

export const updateDoctorServiceSchema = doctorServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateDoctorServiceInput = z.infer<typeof updateDoctorServiceSchema>;
