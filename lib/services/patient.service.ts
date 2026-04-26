import { prisma } from '@/lib/prisma';
import type {
  CreatePatientInput,
  UpdatePatientOwnInput,
  UpdatePatientAdminInput,
  ListPatientsQuery,
  CreateFamilyMemberInput,
  UpdateFamilyMemberInput,
} from '@/lib/zod-schemas/patient';

export class PatientService {
  /**
   * Create a new patient with user account
   */
  static async create(input: CreatePatientInput): Promise<{ id: string; userId: string }> {
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          phone: input.phone,
          email: input.email,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          isPhoneVerified: false,
        },
      });

      // Assign patient role
      const patientRole = await tx.role.findUnique({ where: { name: 'patient' } });
      if (patientRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: patientRole.id,
            assignedBy: 'system',
          },
        });
      }

      // Create patient profile
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          bloodGroup: input.bloodGroup,
          addressEn: input.addressEn,
          addressBn: input.addressBn,
          emergencyContact: input.emergencyContact,
        },
      });

      return { id: patient.id, userId: user.id };
    });

    return result;
  }

  /**
   * Get patient by ID
   */
  static async getById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            phone: true,
            email: true,
            profileImageUrl: true,
          },
        },
        familyMembers: {
          orderBy: { createdAt: 'asc' },
        },
        patientCredits: {
          where: {
            usedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
        _count: {
          select: {
            appointments: true,
            favouriteDoctors: true,
          },
        },
      },
    });

    if (!patient) return null;

    // Calculate total available credits
    const totalCredits = patient.patientCredits.reduce((sum, c) => sum + c.amount, 0);

    return {
      id: patient.id,
      userId: patient.userId,
      phone: patient.user.phone,
      nameEn: patient.user.nameEn,
      nameBn: patient.user.nameBn,
      email: patient.user.email,
      profileImageUrl: patient.user.profileImageUrl,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      addressEn: patient.addressEn,
      addressBn: patient.addressBn,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      medicalHistory: patient.medicalHistory,
      familyMembers: patient.familyMembers,
      credits: totalCredits,
      appointmentsCount: patient._count.appointments,
      favouriteDoctorsCount: patient._count.favouriteDoctors,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Get patient by user ID
   */
  static async getByUserId(userId: string) {
    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            phone: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!patient) return null;

    return {
      id: patient.id,
      userId: patient.userId,
      phone: patient.user.phone,
      nameEn: patient.user.nameEn,
      nameBn: patient.user.nameBn,
      email: patient.user.email,
      profileImageUrl: patient.user.profileImageUrl,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      createdAt: patient.createdAt,
    };
  }

  /**
   * List patients with pagination and filtering
   */
  static async list(query: ListPatientsQuery) {
    const { page, limit, q, gender, bloodGroup, sortBy, sortOrder } = query;

    const where: Parameters<typeof prisma.patient.findMany>[0]['where'] = {};

    // Search by name, phone, or email
    if (q) {
      where.OR = [
        { user: { nameEn: { contains: q } } },
        { user: { nameBn: { contains: q } } },
        { user: { phone: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    if (gender) where.gender = gender;
    if (bloodGroup) where.bloodGroup = bloodGroup;

    // Build order by
    const orderBy: Parameters<typeof prisma.patient.findMany>[0]['orderBy'] = {};
    if (sortBy === 'nameEn') {
      orderBy.user = { nameEn: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              nameEn: true,
              nameBn: true,
              phone: true,
              email: true,
              profileImageUrl: true,
            },
          },
          _count: {
            select: { appointments: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients.map((p) => ({
        id: p.id,
        userId: p.userId,
        phone: p.user.phone,
        nameEn: p.user.nameEn,
        nameBn: p.user.nameBn,
        email: p.user.email,
        profileImageUrl: p.user.profileImageUrl,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        appointmentsCount: p._count.appointments,
        createdAt: p.createdAt,
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
   * Update patient profile (own)
   */
  static async updateOwn(patientId: string, input: UpdatePatientOwnInput) {
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        addressEn: input.addressEn,
        addressBn: input.addressBn,
        emergencyContact: input.emergencyContact,
        allergies: input.allergies,
        medicalHistory: input.medicalHistory,
        user: {
          update: {
            nameEn: input.nameEn,
            nameBn: input.nameBn,
            email: input.email,
            profileImageUrl: input.profileImageUrl,
          },
        },
      },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            phone: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return {
      id: patient.id,
      userId: patient.userId,
      phone: patient.user.phone,
      nameEn: patient.user.nameEn,
      nameBn: patient.user.nameBn,
      email: patient.user.email,
      profileImageUrl: patient.user.profileImageUrl,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      addressEn: patient.addressEn,
      addressBn: patient.addressBn,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Update patient profile (admin)
   */
  static async updateAdmin(patientId: string, input: UpdatePatientAdminInput) {
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        addressEn: input.addressEn,
        addressBn: input.addressBn,
        emergencyContact: input.emergencyContact,
        allergies: input.allergies,
        medicalHistory: input.medicalHistory,
        user: {
          update: {
            nameEn: input.nameEn,
            nameBn: input.nameBn,
            email: input.email,
            phone: input.phone,
            profileImageUrl: input.profileImageUrl,
            isActive: input.isActive,
          },
        },
      },
      include: {
        user: {
          select: {
            nameEn: true,
            nameBn: true,
            phone: true,
            email: true,
            profileImageUrl: true,
            isActive: true,
          },
        },
      },
    });

    return patient;
  }

  /**
   * Delete patient
   */
  static async delete(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { userId: true },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    await prisma.user.delete({
      where: { id: patient.userId },
    });

    return { success: true };
  }

  // Family Members
  static async addFamilyMember(patientId: string, input: CreateFamilyMemberInput) {
    return prisma.familyMember.create({
      data: {
        patientId,
        ...input,
      },
    });
  }

  static async updateFamilyMember(memberId: string, input: UpdateFamilyMemberInput) {
    return prisma.familyMember.update({
      where: { id: memberId },
      data: input,
    });
  }

  static async deleteFamilyMember(memberId: string) {
    await prisma.familyMember.delete({
      where: { id: memberId },
    });
    return { success: true };
  }

  static async getFamilyMembers(patientId: string) {
    return prisma.familyMember.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Favourite doctors
  static async addFavouriteDoctor(patientId: string, doctorId: string) {
    return prisma.patientFavourite.create({
      data: {
        patientId,
        doctorId,
      },
    });
  }

  static async removeFavouriteDoctor(patientId: string, doctorId: string) {
    await prisma.patientFavourite.delete({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });
    return { success: true };
  }

  static async getFavouriteDoctors(patientId: string) {
    const favourites = await prisma.patientFavourite.findMany({
      where: { patientId },
      include: {
        doctor: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favourites.map((f) => ({
      id: f.doctor.id,
      titleEn: f.doctor.titleEn,
      nameEn: f.doctor.user.nameEn,
      nameBn: f.doctor.user.nameBn,
      profileImageUrl: f.doctor.user.profileImageUrl,
      specialty: f.doctor.specialty,
      consultationFee: f.doctor.consultationFee,
      addedAt: f.createdAt,
    }));
  }
}
