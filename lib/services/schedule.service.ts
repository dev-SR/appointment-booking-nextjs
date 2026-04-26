import prisma from '@/lib/prisma'
import { z } from 'zod'

export const createScheduleSchema = z.object({
  doctorId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  slotIntervalMins: z.number().int().positive().default(15),
  maxPatients: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true)
})

export const updateScheduleSchema = createScheduleSchema.partial().omit({ doctorId: true })

export class ScheduleService {
  static async getDoctorSchedules(doctorId: string) {
    return prisma.schedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' }
    })
  }

  static async createSchedule(data: z.infer<typeof createScheduleSchema>) {
    // Validate overlapping schedules here if needed
    return prisma.schedule.create({
      data
    })
  }

  static async updateSchedule(id: string, data: z.infer<typeof updateScheduleSchema>) {
    return prisma.schedule.update({
      where: { id },
      data
    })
  }

  static async deleteSchedule(id: string) {
    return prisma.schedule.delete({
      where: { id }
    })
  }

  static async getSchedule(id: string) {
    return prisma.schedule.findUnique({
      where: { id }
    })
  }
}
