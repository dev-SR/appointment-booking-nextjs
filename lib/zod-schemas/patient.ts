import { z } from 'zod';
import { bangladeshPhoneSchema, paginationSchema, searchQuerySchema } from './common';

// Blood group enum
export const bloodGroupEnum = z.enum([
  'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE',
]);

// Gender enum
export const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

// Register patient (self-registration)
export const registerPatientSchema = z.object({
  phone: bangladeshPhoneSchema,
  nameEn: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  bloodGroup: bloodGroupEnum.optional(),
  addressEn: z.string().max(500).optional(),
  addressBn: z.string().max(500).optional(),
  emergencyContact: bangladeshPhoneSchema.optional(),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

// Create patient (receptionist/admin)
export const createPatientSchema = registerPatientSchema;

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

// Update patient (own profile)
export const updatePatientOwnSchema = z.object({
  nameEn: z.string().min(2).max(200).optional(),
  nameBn: z.string().max(200).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  bloodGroup: bloodGroupEnum.optional(),
  addressEn: z.string().max(500).optional(),
  addressBn: z.string().max(500).optional(),
  emergencyContact: bangladeshPhoneSchema.optional(),
  allergies: z.string().max(1000).optional(),
  medicalHistory: z.string().max(5000).optional(), // JSON string
  profileImageUrl: z.string().url().optional(),
});

export type UpdatePatientOwnInput = z.infer<typeof updatePatientOwnSchema>;

// Update patient (admin - can update more fields)
export const updatePatientAdminSchema = updatePatientOwnSchema.extend({
  phone: bangladeshPhoneSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePatientAdminInput = z.infer<typeof updatePatientAdminSchema>;

// List patients query
export const listPatientsQuerySchema = paginationSchema.merge(searchQuerySchema).extend({
  gender: genderEnum.optional(),
  bloodGroup: bloodGroupEnum.optional(),
  hasUpcomingAppointment: z.coerce.boolean().optional(),
  sortBy: z.enum(['nameEn', 'createdAt', 'lastVisit']).default('nameEn'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

// Patient response (list view)
export const patientListResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  phone: z.string(),
  nameEn: z.string(),
  nameBn: z.string().nullable(),
  email: z.string().nullable(),
  dateOfBirth: z.date().nullable(),
  gender: genderEnum.nullable(),
  bloodGroup: bloodGroupEnum.nullable(),
  profileImageUrl: z.string().nullable(),
  appointmentsCount: z.number().optional(),
  lastVisit: z.date().nullable().optional(),
  createdAt: z.date(),
});

export type PatientListResponse = z.infer<typeof patientListResponseSchema>;

// Patient response (detail view)
export const patientDetailResponseSchema = patientListResponseSchema.extend({
  addressEn: z.string().nullable(),
  addressBn: z.string().nullable(),
  emergencyContact: z.string().nullable(),
  allergies: z.string().nullable(),
  medicalHistory: z.string().nullable(),
  familyMembers: z.array(z.object({
    id: z.string(),
    nameEn: z.string(),
    nameBn: z.string().nullable(),
    relationship: z.string(),
    dateOfBirth: z.date().nullable(),
    gender: genderEnum.nullable(),
    phone: z.string().nullable(),
  })),
  credits: z.number(), // Total available credits in paisa
  favouriteDoctorsCount: z.number(),
  updatedAt: z.date(),
});

export type PatientDetailResponse = z.infer<typeof patientDetailResponseSchema>;

// Family member
export const createFamilyMemberSchema = z.object({
  nameEn: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
  dateOfBirth: z.coerce.date().optional(),
  gender: genderEnum.optional(),
  phone: bangladeshPhoneSchema.optional(),
});

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;

export const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;

// Patient favourite doctor
export const addFavouriteDoctorSchema = z.object({
  doctorId: z.string().cuid(),
});

export type AddFavouriteDoctorInput = z.infer<typeof addFavouriteDoctorSchema>;
