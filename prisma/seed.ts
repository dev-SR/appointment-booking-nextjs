/**
 * Database Seed Script
 *
 * Seeds the database with:
 * 1. All permission keys
 * 2. Default system roles
 * 3. Role-permission mappings
 * 4. Sample specialties
 * 5. Default booking rules
 * 6. A super admin user (for development)
 */

import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const dbType = process.env.DB_TYPE

let adapter

if (dbType === "sqlite") {
  adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL,
  })
} else if (dbType === "postgres") {
  adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
} else {
  throw new Error("Invalid DB_TYPE. Use 'sqlite' or 'postgres'")
}

const prisma = new PrismaClient({
  adapter,
})

// Permission constants (duplicated here for seed script independence)
const PERMISSIONS = {
  APPOINTMENTS_CREATE: "appointments:create",
  APPOINTMENTS_READ_OWN: "appointments:read:own",
  APPOINTMENTS_READ_ALL: "appointments:read:all",
  APPOINTMENTS_UPDATE_OWN: "appointments:update:own",
  APPOINTMENTS_UPDATE_ANY: "appointments:update:any",
  APPOINTMENTS_CANCEL_OWN: "appointments:cancel:own",
  APPOINTMENTS_CANCEL_ANY: "appointments:cancel:any",
  DOCTORS_CREATE: "doctors:create",
  DOCTORS_READ_ALL: "doctors:read:all",
  DOCTORS_UPDATE_OWN: "doctors:update:own",
  DOCTORS_UPDATE_ANY: "doctors:update:any",
  DOCTORS_DELETE: "doctors:delete",
  PATIENTS_CREATE: "patients:create",
  PATIENTS_READ_OWN: "patients:read:own",
  PATIENTS_READ_ASSIGNED: "patients:read:assigned",
  PATIENTS_READ_ALL: "patients:read:all",
  PATIENTS_UPDATE_OWN: "patients:update:own",
  PATIENTS_UPDATE_ANY: "patients:update:any",
  PAYMENTS_READ_OWN: "payments:read:own",
  PAYMENTS_READ_ALL: "payments:read:all",
  PAYMENTS_REFUND: "payments:refund",
  QUEUE_MANAGE: "queue:manage",
  QUEUE_VIEW: "queue:view",
  REPORTS_VIEW_FINANCIAL: "reports:view:financial",
  REPORTS_VIEW_OPERATIONAL: "reports:view:operational",
  ROLES_MANAGE: "roles:manage",
  ROLES_VIEW: "roles:view",
  STAFF_MANAGE: "staff:manage",
  STAFF_VIEW: "staff:view",
  SETTINGS_MANAGE: "settings:manage",
  SETTINGS_VIEW: "settings:view",
  SCHEDULE_MANAGE_OWN: "schedule:manage:own",
  SCHEDULE_MANAGE_ANY: "schedule:manage:any",
  INVOICES_GENERATE: "invoices:generate",
  INVOICES_VIEW_OWN: "invoices:view:own",
  INVOICES_VIEW_ALL: "invoices:view:all",
  AUDIT_VIEW: "audit:view",
  ALL: "*",
} as const

// System roles configuration
const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: "super_admin",
    displayName: "Super Admin",
    isSystem: true,
    permissions: [PERMISSIONS.ALL],
  },
  RECEPTIONIST: {
    name: "receptionist",
    displayName: "Receptionist",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_CREATE,
      PERMISSIONS.APPOINTMENTS_READ_ALL,
      PERMISSIONS.APPOINTMENTS_CANCEL_ANY,
      PERMISSIONS.QUEUE_MANAGE,
      PERMISSIONS.PATIENTS_READ_ALL,
      PERMISSIONS.INVOICES_GENERATE,
    ],
  },
  DOCTOR: {
    name: "doctor",
    displayName: "Doctor",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_READ_OWN,
      PERMISSIONS.APPOINTMENTS_UPDATE_OWN,
      PERMISSIONS.PATIENTS_READ_ASSIGNED,
      PERMISSIONS.DOCTORS_UPDATE_OWN,
      PERMISSIONS.SCHEDULE_MANAGE_OWN,
    ],
  },
  ACCOUNTANT: {
    name: "accountant",
    displayName: "Accountant",
    isSystem: true,
    permissions: [
      PERMISSIONS.PAYMENTS_READ_ALL,
      PERMISSIONS.PAYMENTS_REFUND,
      PERMISSIONS.REPORTS_VIEW_FINANCIAL,
      PERMISSIONS.INVOICES_GENERATE,
    ],
  },
  PATIENT: {
    name: "patient",
    displayName: "Patient",
    isSystem: true,
    permissions: [
      PERMISSIONS.APPOINTMENTS_CREATE,
      PERMISSIONS.APPOINTMENTS_READ_OWN,
      PERMISSIONS.APPOINTMENTS_CANCEL_OWN,
      PERMISSIONS.PAYMENTS_READ_OWN,
      PERMISSIONS.PATIENTS_UPDATE_OWN,
    ],
  },
}

async function main() {
  console.log("🌱 Starting database seed...")

  // 1. Create all permissions
  console.log("Creating permissions...")
  const permissionData = [
    // Appointments
    { key: PERMISSIONS.APPOINTMENTS_CREATE, displayName: "Create Appointments", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_READ_OWN, displayName: "View Own Appointments", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_READ_ALL, displayName: "View All Appointments", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_UPDATE_OWN, displayName: "Update Own Appointments", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_UPDATE_ANY, displayName: "Update Any Appointment", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_CANCEL_OWN, displayName: "Cancel Own Appointments", group: "Appointments" },
    { key: PERMISSIONS.APPOINTMENTS_CANCEL_ANY, displayName: "Cancel Any Appointment", group: "Appointments" },

    // Doctors
    { key: PERMISSIONS.DOCTORS_CREATE, displayName: "Create Doctors", group: "Doctors" },
    { key: PERMISSIONS.DOCTORS_READ_ALL, displayName: "View All Doctors", group: "Doctors" },
    { key: PERMISSIONS.DOCTORS_UPDATE_OWN, displayName: "Update Own Profile", group: "Doctors" },
    { key: PERMISSIONS.DOCTORS_UPDATE_ANY, displayName: "Update Any Doctor", group: "Doctors" },
    { key: PERMISSIONS.DOCTORS_DELETE, displayName: "Delete Doctors", group: "Doctors" },

    // Patients
    { key: PERMISSIONS.PATIENTS_CREATE, displayName: "Create Patients", group: "Patients" },
    { key: PERMISSIONS.PATIENTS_READ_OWN, displayName: "View Own Profile", group: "Patients" },
    { key: PERMISSIONS.PATIENTS_READ_ASSIGNED, displayName: "View Assigned Patients", group: "Patients" },
    { key: PERMISSIONS.PATIENTS_READ_ALL, displayName: "View All Patients", group: "Patients" },
    { key: PERMISSIONS.PATIENTS_UPDATE_OWN, displayName: "Update Own Profile", group: "Patients" },
    { key: PERMISSIONS.PATIENTS_UPDATE_ANY, displayName: "Update Any Patient", group: "Patients" },

    // Payments
    { key: PERMISSIONS.PAYMENTS_READ_OWN, displayName: "View Own Payments", group: "Payments" },
    { key: PERMISSIONS.PAYMENTS_READ_ALL, displayName: "View All Payments", group: "Payments" },
    { key: PERMISSIONS.PAYMENTS_REFUND, displayName: "Process Refunds", group: "Payments" },

    // Queue
    { key: PERMISSIONS.QUEUE_MANAGE, displayName: "Manage Queue", group: "Queue" },
    { key: PERMISSIONS.QUEUE_VIEW, displayName: "View Queue", group: "Queue" },

    // Reports
    { key: PERMISSIONS.REPORTS_VIEW_FINANCIAL, displayName: "View Financial Reports", group: "Reports" },
    { key: PERMISSIONS.REPORTS_VIEW_OPERATIONAL, displayName: "View Operational Reports", group: "Reports" },

    // Roles & Permissions
    { key: PERMISSIONS.ROLES_MANAGE, displayName: "Manage Roles", group: "Administration" },
    { key: PERMISSIONS.ROLES_VIEW, displayName: "View Roles", group: "Administration" },

    // Staff
    { key: PERMISSIONS.STAFF_MANAGE, displayName: "Manage Staff", group: "Administration" },
    { key: PERMISSIONS.STAFF_VIEW, displayName: "View Staff", group: "Administration" },

    // Settings
    { key: PERMISSIONS.SETTINGS_MANAGE, displayName: "Manage Settings", group: "Administration" },
    { key: PERMISSIONS.SETTINGS_VIEW, displayName: "View Settings", group: "Administration" },

    // Schedule
    { key: PERMISSIONS.SCHEDULE_MANAGE_OWN, displayName: "Manage Own Schedule", group: "Schedule" },
    { key: PERMISSIONS.SCHEDULE_MANAGE_ANY, displayName: "Manage Any Schedule", group: "Schedule" },

    // Invoices
    { key: PERMISSIONS.INVOICES_GENERATE, displayName: "Generate Invoices", group: "Invoices" },
    { key: PERMISSIONS.INVOICES_VIEW_OWN, displayName: "View Own Invoices", group: "Invoices" },
    { key: PERMISSIONS.INVOICES_VIEW_ALL, displayName: "View All Invoices", group: "Invoices" },

    // Audit
    { key: PERMISSIONS.AUDIT_VIEW, displayName: "View Audit Logs", group: "Administration" },

    // Super Admin wildcard
    { key: PERMISSIONS.ALL, displayName: "Full Access", group: "Super Admin", description: "Full system access" },
  ]

  const permissions: Record<string, string> = {}
  for (const perm of permissionData) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    })
    permissions[perm.key] = created.id
  }
  console.log(`✓ Created ${permissionData.length} permissions`)

  // 2. Create system roles
  console.log("Creating system roles...")
  const roles: Record<string, string> = {}

  for (const [, roleData] of Object.entries(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        displayName: roleData.displayName,
        isSystem: roleData.isSystem,
      },
      create: {
        name: roleData.name,
        displayName: roleData.displayName,
        isSystem: roleData.isSystem,
      },
    })
    roles[roleData.name] = role.id

    // Assign permissions to role
    for (const permKey of roleData.permissions) {
      const permId = permissions[permKey]
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
            grantedBy: "system",
          },
        })
      }
    }
  }
  console.log(`✓ Created ${Object.keys(SYSTEM_ROLES).length} system roles`)

  // 3. Create specialties
  console.log("Creating specialties...")
  const specialties = [
    { nameEn: "General Medicine", nameBn: "সাধারণ চিকিৎসা", sortOrder: 1 },
    { nameEn: "Cardiology", nameBn: "হৃদরোগ", sortOrder: 2 },
    { nameEn: "Dermatology", nameBn: "চর্মরোগ", sortOrder: 3 },
    { nameEn: "ENT", nameBn: "নাক-কান-গলা", sortOrder: 4 },
    { nameEn: "Gastroenterology", nameBn: "পরিপাকতন্ত্র", sortOrder: 5 },
    { nameEn: "Gynecology", nameBn: "স্ত্রীরোগ", sortOrder: 6 },
    { nameEn: "Nephrology", nameBn: "বৃক্করোগ", sortOrder: 7 },
    { nameEn: "Neurology", nameBn: "স্নায়ুরোগ", sortOrder: 8 },
    { nameEn: "Oncology", nameBn: "ক্যান্সার", sortOrder: 9 },
    { nameEn: "Ophthalmology", nameBn: "চক্ষুরোগ", sortOrder: 10 },
    { nameEn: "Orthopedics", nameBn: "হাড়রোগ", sortOrder: 11 },
    { nameEn: "Pediatrics", nameBn: "শিশুরোগ", sortOrder: 12 },
    { nameEn: "Psychiatry", nameBn: "মানসিক রোগ", sortOrder: 13 },
    { nameEn: "Pulmonology", nameBn: "শ্বাসতন্ত্র", sortOrder: 14 },
    { nameEn: "Urology", nameBn: "মূত্ররোগ", sortOrder: 15 },
  ]

  for (const specialty of specialties) {
    await prisma.specialty.upsert({
      where: { nameEn: specialty.nameEn },
      update: specialty,
      create: specialty,
    })
  }
  console.log(`✓ Created ${specialties.length} specialties`)

  // 4. Create default booking rules
  console.log("Creating booking rules...")
  await prisma.bookingRule.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      minLeadTimeMinutes: 60,
      maxAdvanceBookingDays: 30,
      sameDayCutoffTime: "14:00",
      cancellationDeadlineMins: 120,
      rescheduleDeadlineMins: 120,
      maxActiveBookings: 5,
      isActive: true,
    },
  })
  console.log("✓ Created default booking rules")

  // 5. Create notification templates
  console.log("Creating notification templates...")
  const templates = [
    {
      key: "appointment.confirmed",
      channel: "sms",
      bodyEn: "Your appointment with Dr. {{doctorName}} is confirmed for {{date}} at {{time}}. Token: {{token}}",
      bodyBn: "ডাঃ {{doctorName}} এর সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে। তারিখ: {{date}}, সময়: {{time}}। টোকেন: {{token}}",
      variables: JSON.stringify(["doctorName", "date", "time", "token"]),
    },
    {
      key: "appointment.reminder",
      channel: "sms",
      bodyEn: "Reminder: Your appointment with Dr. {{doctorName}} is tomorrow at {{time}}. Token: {{token}}",
      bodyBn: "স্মরণ: ডাঃ {{doctorName}} এর সাথে আপনার অ্যাপয়েন্টমেন্ট আগামীকাল {{time}} তে। টোকেন: {{token}}",
      variables: JSON.stringify(["doctorName", "time", "token"]),
    },
    {
      key: "appointment.cancelled",
      channel: "sms",
      bodyEn: "Your appointment with Dr. {{doctorName}} on {{date}} has been cancelled. Reason: {{reason}}",
      bodyBn: "ডাঃ {{doctorName}} এর সাথে {{date}} তারিখের আপনার অ্যাপয়েন্টমেন্ট বাতিল হয়েছে। কারণ: {{reason}}",
      variables: JSON.stringify(["doctorName", "date", "reason"]),
    },
    {
      key: "queue.next_patient",
      channel: "sms",
      bodyEn: "You are next! Please proceed to {{chamber}}. Token: {{token}}",
      bodyBn: "আপনার পালা! অনুগ্রহ করে {{chamber}} এ যান। টোকেন: {{token}}",
      variables: JSON.stringify(["chamber", "token"]),
    },
    {
      key: "payment.received",
      channel: "sms",
      bodyEn: "Payment of Tk. {{amount}} received for your appointment on {{date}}. Transaction ID: {{trxId}}",
      bodyBn: "{{date}} তারিখের অ্যাপয়েন্টমেন্টের জন্য {{amount}} টাকা পেয়েছি। লেনদেন আইডি: {{trxId}}",
      variables: JSON.stringify(["amount", "date", "trxId"]),
    },
    {
      key: "otp.verification",
      channel: "sms",
      bodyEn: "Your OTP is {{otp}}. Valid for 5 minutes. Do not share with anyone.",
      bodyBn: "আপনার OTP হল {{otp}}। ৫ মিনিট বৈধ। কারো সাথে শেয়ার করবেন না।",
      variables: JSON.stringify(["otp"]),
    },
  ]

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { key: template.key },
      update: template,
      create: template,
    })
  }
  console.log(`✓ Created ${templates.length} notification templates`)

  // 6. Create a super admin user (development only)
  if (process.env.NODE_ENV === "development" || process.env.SEED_ADMIN === "true") {
    console.log("Creating super admin user...")
    const adminUser = await prisma.user.upsert({
      where: { phone: "+8801700000000" },
      update: {},
      create: {
        phone: "+8801700000000",
        email: "admin@example.com",
        nameEn: "Super Admin",
        nameBn: "সুপার অ্যাডমিন",
        isPhoneVerified: true,
        isEmailVerified: true,
        preferredLocale: "en",
      },
    })

    // Assign super admin role
    const superAdminRoleId = roles["super_admin"]
    if (superAdminRoleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: superAdminRoleId,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: superAdminRoleId,
          assignedBy: "system",
        },
      })
    }
    console.log("✓ Created super admin user (phone: +8801700000000)")
  }

  // 7. Create sample chambers
  console.log("Creating sample chambers...")
  const chambers = [
    {
      nameEn: "Main Chamber - Dhaka",
      nameBn: "প্রধান চেম্বার - ঢাকা",
      addressEn: "123 Dhanmondi, Road 27, Dhaka 1209",
      addressBn: "১২৩ ধানমন্ডি, রোড ২৭, ঢাকা ১২০৯",
      phone: "+8801700000001",
      latitude: 23.7465,
      longitude: 90.3760,
    },
    {
      nameEn: "Branch - Gulshan",
      nameBn: "শাখা - গুলশান",
      addressEn: "45 Gulshan Avenue, Dhaka 1212",
      addressBn: "৪৫ গুলশান এভিনিউ, ঢাকা ১২১২",
      phone: "+8801700000002",
      latitude: 23.7925,
      longitude: 90.4078,
    },
  ]

  for (const chamber of chambers) {
    await prisma.chamber.upsert({
      where: { id: chamber.nameEn.toLowerCase().replace(/\s+/g, "-") },
      update: chamber,
      create: {
        id: chamber.nameEn.toLowerCase().replace(/\s+/g, "-"),
        ...chamber,
      },
    })
  }
  console.log(`✓ Created ${chambers.length} chambers`)

  // 8. Create sample doctors for booking
  console.log("Creating sample doctors...")
  const doctorSpecialty = await prisma.specialty.findFirst({
    where: { nameEn: "Cardiology" }
  })
  
  if (doctorSpecialty) {
    const docUser = await prisma.user.upsert({
      where: { phone: "+8801711111111" },
      update: {},
      create: {
        phone: "+8801711111111",
        email: "doctor@example.com",
        nameEn: "John Doe",
        nameBn: "জন ডো",
        isPhoneVerified: true,
      }
    })

    const doctorRoleId = roles["doctor"]
    if (doctorRoleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: docUser.id, roleId: doctorRoleId } },
        update: {},
        create: { userId: docUser.id, roleId: doctorRoleId, assignedBy: "system" }
      })
    }

    // Find existing doctor to upsert correctly without unique constraint issues
    let doctor = await prisma.doctor.findFirst({ where: { userId: docUser.id } })
    
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId: docUser.id,
          registrationNumber: "BMDC-12345",
          specialtyId: doctorSpecialty.id,
          titleEn: "Dr.",
          titleBn: "ডাঃ",
          qualificationsEn: "MBBS, MD (Cardiology)",
          experienceYears: 10,
          consultationFee: 100000, // 1000 BDT
          followUpFee: 70000,
        }
      })
    }

    const chamberId = chambers[0].nameEn.toLowerCase().replace(/\s+/g, "-")

    await prisma.doctorChamber.upsert({
      where: { doctorId_chamberId: { doctorId: doctor.id, chamberId: chamberId } },
      update: {},
      create: {
        doctorId: doctor.id,
        chamberId: chamberId,
        isPrimary: true
      }
    })

    // Delete existing schedules to avoid duplicates on re-seed
    await prisma.schedule.deleteMany({ where: { doctorId: doctor.id } })

    // Add schedule for the next 7 days (day 0 to 6)
    for (let day = 0; day <= 6; day++) {
      // Morning
      await prisma.schedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: "10:00",
          endTime: "13:00",
          slotIntervalMins: 15,
          maxPatients: 1
        }
      })
      // Evening
      await prisma.schedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: "17:00",
          endTime: "21:00",
          slotIntervalMins: 15,
          maxPatients: 1
        }
      })
    }
    
    console.log("✓ Created sample doctor (Dr. John Doe)")
  }

  console.log("\n✅ Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
