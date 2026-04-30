import prisma from '@/lib/prisma';
import type {
  CreateChamberInput,
  UpdateChamberInput,
  ListChambersQuery,
  AssignDoctorToChamberInput,
} from '@/lib/zod-schemas/chamber';

export class ChamberService {
  /**
   * Create a new chamber
   */
  static async create(input: CreateChamberInput): Promise<{ id: string }> {
    const chamber = await prisma.chamber.create({
      data: {
        nameEn: input.nameEn,
        nameBn: input.nameBn,
        addressEn: input.addressEn,
        addressBn: input.addressBn,
        phone: input.phone,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    return { id: chamber.id };
  }

  /**
   * Get chamber by ID
   */
  static async getById(id: string) {
    const chamber = await prisma.chamber.findUnique({
      where: { id },
      include: {
        doctorChamber: {
          include: {
            doctor: {
              include: {
                user: {
                  select: {
                    nameEn: true,
                    nameBn: true,
                  },
                },
                specialty: {
                  select: {
                    nameEn: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!chamber) return null;

    return {
      id: chamber.id,
      nameEn: chamber.nameEn,
      nameBn: chamber.nameBn,
      addressEn: chamber.addressEn,
      addressBn: chamber.addressBn,
      phone: chamber.phone,
      latitude: chamber.latitude,
      longitude: chamber.longitude,
      isActive: chamber.isActive,
      doctors: chamber.doctorChamber.map((dc) => ({
        id: dc.id,
        doctorId: dc.doctor.id,
        titleEn: dc.doctor.titleEn,
        nameEn: dc.doctor.user.nameEn,
        nameBn: dc.doctor.user.nameBn,
        specialtyEn: dc.doctor.specialty.nameEn,
        isPrimary: dc.isPrimary,
        consultationFee: dc.doctor.consultationFee,
      })),
      createdAt: chamber.createdAt,
      updatedAt: chamber.updatedAt,
    };
  }

  /**
   * List chambers with pagination and filtering
   */
  static async list(query: ListChambersQuery) {
    const { page, limit, q, isActive, doctorId, sortBy, sortOrder } = query;

    const where: Parameters<typeof prisma.chamber.findMany>[0]['where'] = {};

    if (q) {
      where.OR = [
        { nameEn: { contains: q } },
        { nameBn: { contains: q } },
        { addressEn: { contains: q } },
      ];
    }

    if (typeof isActive === 'boolean') where.isActive = isActive;

    if (doctorId) {
      where.doctorChamber = { some: { doctorId } };
    }

    const orderBy: Parameters<typeof prisma.chamber.findMany>[0]['orderBy'] = {
      [sortBy]: sortOrder,
    };

    const [chambers, total] = await Promise.all([
      prisma.chamber.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { doctorChamber: true },
          },
        },
      }),
      prisma.chamber.count({ where }),
    ]);

    return {
      data: chambers.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameBn: c.nameBn,
        addressEn: c.addressEn,
        addressBn: c.addressBn,
        phone: c.phone,
        latitude: c.latitude,
        longitude: c.longitude,
        isActive: c.isActive,
        doctorsCount: c._count.doctorChamber,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
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
   * Update chamber
   */
  static async update(chamberId: string, input: UpdateChamberInput) {
    const chamber = await prisma.chamber.update({
      where: { id: chamberId },
      data: input,
    });

    return chamber;
  }

  /**
   * Delete chamber
   */
  static async delete(chamberId: string) {
    // Check for associated appointments
    const appointmentCount = await prisma.appointment.count({
      where: { chamberId },
    });

    if (appointmentCount > 0) {
      throw new Error('Cannot delete chamber with appointments');
    }

    await prisma.chamber.delete({
      where: { id: chamberId },
    });

    return { success: true };
  }

  /**
   * Assign doctor to chamber
   */
  static async assignDoctor(chamberId: string, input: AssignDoctorToChamberInput) {
    // If setting as primary, remove primary from other chambers for this doctor
    if (input.isPrimary) {
      await prisma.doctorChamber.updateMany({
        where: { doctorId: input.doctorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const assignment = await prisma.doctorChamber.create({
      data: {
        chamberId,
        doctorId: input.doctorId,
        isPrimary: input.isPrimary,
      },
    });

    return assignment;
  }

  /**
   * Remove doctor from chamber
   */
  static async removeDoctor(chamberId: string, doctorId: string) {
    await prisma.doctorChamber.delete({
      where: {
        doctorId_chamberId: {
          doctorId,
          chamberId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Update doctor-chamber assignment
   */
  static async updateDoctorAssignment(
    chamberId: string,
    doctorId: string,
    isPrimary: boolean
  ) {
    // If setting as primary, remove primary from other chambers
    if (isPrimary) {
      await prisma.doctorChamber.updateMany({
        where: { doctorId, isPrimary: true, NOT: { chamberId } },
        data: { isPrimary: false },
      });
    }

    const assignment = await prisma.doctorChamber.update({
      where: {
        doctorId_chamberId: {
          doctorId,
          chamberId,
        },
      },
      data: { isPrimary },
    });

    return assignment;
  }

  /**
   * Get doctors for a chamber
   */
  static async getDoctors(chamberId: string) {
    const doctors = await prisma.doctorChamber.findMany({
      where: { chamberId },
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
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return doctors.map((dc) => ({
      id: dc.doctor.id,
      titleEn: dc.doctor.titleEn,
      nameEn: dc.doctor.user.nameEn,
      nameBn: dc.doctor.user.nameBn,
      profileImageUrl: dc.doctor.user.profileImageUrl,
      specialty: dc.doctor.specialty,
      consultationFee: dc.doctor.consultationFee,
      followUpFee: dc.doctor.followUpFee,
      isPrimary: dc.isPrimary,
      isAvailable: dc.doctor.isAvailable,
    }));
  }
}
