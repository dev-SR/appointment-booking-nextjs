import prisma from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma/client';
import type {
  CreateDoctorInput,
  UpdateDoctorAdminInput,
  UpdateDoctorOwnInput,
  ListDoctorsQuery,
  DoctorServiceInput,
  UpdateDoctorServiceInput,
} from '@/lib/zod-schemas/doctor';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Transform DB doctor to response format
function transformDoctor(doctor: Awaited<ReturnType<typeof prisma.doctor.findUnique>> & { user?: { nameEn: string; nameBn: string | null; profileImageUrl: string | null; phone?: string } }) {
  if (!doctor) return null;
  return {
    id: doctor.id,
    userId: doctor.userId,
    registrationNumber: doctor.registrationNumber,
    titleEn: doctor.titleEn,
    titleBn: doctor.titleBn,
    nameEn: doctor.user?.nameEn ?? '',
    nameBn: doctor.user?.nameBn ?? null,
    profileImageUrl: doctor.user?.profileImageUrl ?? null,
    bioEn: doctor.bioEn,
    bioBn: doctor.bioBn,
    qualificationsEn: doctor.qualificationsEn,
    qualificationsBn: doctor.qualificationsBn,
    experienceYears: doctor.experienceYears,
    consultationFee: doctor.consultationFee,
    followUpFee: doctor.followUpFee,
    followUpValidDays: doctor.followUpValidDays,
    isAvailable: doctor.isAvailable,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
  };
}

export class DoctorService {
  /**
   * Create a new doctor with associated user account
   */
  static async create(input: CreateDoctorInput): Promise<{ id: string }> {
    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          profileImageUrl: input.profileImageUrl,
          isPhoneVerified: false,
        },
      });

      // Assign doctor role
      const doctorRole = await tx.role.findUnique({ where: { name: 'doctor' } });
      if (doctorRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: doctorRole.id,
            assignedBy: 'system',
          },
        });
      }

      // Create doctor profile
      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          registrationNumber: input.registrationNumber,
          specialtyId: input.specialtyId,
          titleEn: input.titleEn,
          titleBn: input.titleBn,
          bioEn: input.bioEn,
          bioBn: input.bioBn,
          qualificationsEn: input.qualificationsEn,
          qualificationsBn: input.qualificationsBn,
          experienceYears: input.experienceYears,
          consultationFee: input.consultationFee,
          followUpFee: input.followUpFee,
          followUpValidDays: input.followUpValidDays,
        },
      });

      return doctor;
    });

    return { id: result.id };
  }

  /**
   * Get doctor by ID
   */
  static async getById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            profileImageUrl: true,
            phone: true,
          },
        },
        specialty: {
          select: {
            id: true,
            nameEn: true,
            nameBn: true,
          },
        },
        chambers: {
          include: {
            chamber: {
              select: {
                id: true,
                nameEn: true,
                nameBn: true,
                addressEn: true,
              },
            },
          },
        },
        services: {
          where: { isActive: true },
          select: {
            id: true,
            nameEn: true,
            nameBn: true,
            durationMinutes: true,
            fee: true,
            isActive: true,
          },
        },
      },
    });

    if (!doctor) return null;

    return {
      ...transformDoctor(doctor),
      specialty: doctor.specialty,
      chambers: doctor.chambers.map((dc) => ({
        id: dc.id,
        chamberId: dc.chamber.id,
        nameEn: dc.chamber.nameEn,
        nameBn: dc.chamber.nameBn,
        addressEn: dc.chamber.addressEn,
        isPrimary: dc.isPrimary,
      })),
      services: doctor.services,
    };
  }

  /**
   * Get doctor by user ID
   */
  static async getByUserId(userId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            profileImageUrl: true,
            phone: true,
          },
        },
        specialty: {
          select: {
            id: true,
            nameEn: true,
            nameBn: true,
          },
        },
      },
    });

    if (!doctor) return null;

    return {
      ...transformDoctor(doctor),
      specialty: doctor.specialty,
    };
  }

  /**
   * List doctors with pagination and filtering
   */
  static async list(query: ListDoctorsQuery) {
    const { page, limit, q, specialtyId, chamberId, isAvailable, minExperience, maxFee, sortBy, sortOrder } = query;

    const where: Prisma.DoctorWhereInput = {};

    // Search by name or registration number
    if (q) {
      where.OR = [
        { user: { nameEn: { contains: q } } },
        { user: { nameBn: { contains: q } } },
        { registrationNumber: { contains: q } },
      ];
    }

    if (specialtyId) where.specialtyId = specialtyId;
    if (typeof isAvailable === 'boolean') where.isAvailable = isAvailable;
    if (minExperience) where.experienceYears = { gte: minExperience };
    if (maxFee) where.consultationFee = { lte: maxFee };

    // Filter by chamber
    if (chamberId) {
      where.chambers = { some: { chamberId } };
    }

    // Build order by
    const orderBy: Prisma.DoctorOrderByWithRelationInput = {};
    if (sortBy === 'nameEn') {
      orderBy.user = { nameEn: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              nameEn: true,
              nameBn: true,
              profileImageUrl: true,
            },
          },
          specialty: {
            select: {
              id: true,
              nameEn: true,
              nameBn: true,
            },
          },
          _count: {
            select: { chambers: true },
          },
        },
      }),
      prisma.doctor.count({ where }),
    ]);

    return {
      data: doctors.map((d) => ({
        ...transformDoctor(d),
        specialty: d.specialty,
        chambersCount: d._count.chambers,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update doctor profile (own)
   */
  static async updateOwn(doctorId: string, input: UpdateDoctorOwnInput) {
    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        titleEn: input.titleEn,
        titleBn: input.titleBn,
        bioEn: input.bioEn,
        bioBn: input.bioBn,
        qualificationsEn: input.qualificationsEn,
        qualificationsBn: input.qualificationsBn,
        user: input.profileImageUrl
          ? { update: { profileImageUrl: input.profileImageUrl } }
          : undefined,
      },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return transformDoctor(doctor);
  }

  /**
   * Update doctor profile (admin)
   */
  static async updateAdmin(doctorId: string, input: UpdateDoctorAdminInput) {
    const doctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        titleEn: input.titleEn,
        titleBn: input.titleBn,
        bioEn: input.bioEn,
        bioBn: input.bioBn,
        qualificationsEn: input.qualificationsEn,
        qualificationsBn: input.qualificationsBn,
        specialty: input.specialtyId ? { connect: { id: input.specialtyId } } : undefined,
        experienceYears: input.experienceYears,
        consultationFee: input.consultationFee,
        followUpFee: input.followUpFee,
        followUpValidDays: input.followUpValidDays,
        isAvailable: input.isAvailable,
        user: input.profileImageUrl
          ? { update: { profileImageUrl: input.profileImageUrl } }
          : undefined,
      },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return transformDoctor(doctor);
  }

  /**
   * Delete doctor
   */
  static async delete(doctorId: string) {
    // Get doctor to find user ID
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { userId: true },
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Delete doctor and user (cascade)
    await prisma.user.delete({
      where: { id: doctor.userId },
    });

    return { success: true };
  }

  /**
   * Add service to doctor
   */
  static async addService(doctorId: string, input: DoctorServiceInput) {
    const service = await prisma.doctorService.create({
      data: {
        doctorId,
        nameEn: input.nameEn,
        nameBn: input.nameBn,
        durationMinutes: input.durationMinutes,
        fee: input.fee,
        preBufferMinutes: input.preBufferMinutes,
        postBufferMinutes: input.postBufferMinutes,
      },
    });

    return service;
  }

  /**
   * Update doctor service
   */
  static async updateService(serviceId: string, input: UpdateDoctorServiceInput) {
    const service = await prisma.doctorService.update({
      where: { id: serviceId },
      data: input,
    });

    return service;
  }

  /**
   * Delete doctor service
   */
  static async deleteService(serviceId: string) {
    await prisma.doctorService.delete({
      where: { id: serviceId },
    });

    return { success: true };
  }

  /**
   * Get doctor services
   */
  static async getServices(doctorId: string) {
    const services = await prisma.doctorService.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'asc' },
    });

    return services;
  }
}

// Specialty service
export class SpecialtyService {
  static async list(query: { page: number; limit: number; isActive?: boolean; q?: string }) {
    const { page, limit, isActive, q } = query;

    const where: Prisma.SpecialtyWhereInput = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (q) {
      where.OR = [
        { nameEn: { contains: q } },
        { nameBn: { contains: q } },
      ];
    }

    const [specialties, total] = await Promise.all([
      prisma.specialty.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { doctors: true } },
        },
      }),
      prisma.specialty.count({ where }),
    ]);

    return {
      data: specialties.map((s) => ({
        ...s,
        doctorCount: s._count.doctors,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    return prisma.specialty.findUnique({
      where: { id },
      include: {
        _count: { select: { doctors: true } },
      },
    });
  }

  static async create(input: { nameEn: string; nameBn?: string; iconUrl?: string; description?: string; sortOrder?: number }) {
    return prisma.specialty.create({
      data: input,
    });
  }

  static async update(id: string, input: { nameEn?: string; nameBn?: string; iconUrl?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    return prisma.specialty.update({
      where: { id },
      data: input,
    });
  }

  static async delete(id: string) {
    // Check if any doctors use this specialty
    const doctorCount = await prisma.doctor.count({
      where: { specialtyId: id },
    });

    if (doctorCount > 0) {
      throw new Error('Cannot delete specialty with associated doctors');
    }

    await prisma.specialty.delete({
      where: { id },
    });

    return { success: true };
  }
}
