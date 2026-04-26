import prisma from '@/lib/prisma'
import { getIsEn } from '@/lib/i18n-server'

export async function StatsBar() {
  const [patients, doctors, specialties] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.specialty.count()
  ])

  const isEn = await getIsEn()

  // Using some base numbers if DB is empty to look good on landing
  const stats = [
    { value: Math.max(patients, 10000), labelBn: 'নিবন্ধিত রোগী', labelEn: 'Registered Patients' },
    { value: Math.max(doctors, 500), labelBn: 'বিশেষজ্ঞ ডাক্তার', labelEn: 'Specialist Doctors' },
    { value: Math.max(specialties, 50), labelBn: 'বিশেষত্ব', labelEn: 'Medical Specialties' },
    { value: 4.9, labelBn: 'গড় রেটিং', labelEn: 'Average Rating', isFloat: true }
  ]

  return (
    <section className="stats-section py-12 border-y bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="stat-card text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2 flex items-center justify-center">
                <span className="stat-number" data-target={stat.value}>0</span>
                {stat.isFloat ? '★' : '+'}
              </div>
              <p className="text-sm md:text-base font-medium text-foreground">{isEn ? stat.labelEn : stat.labelBn}</p>
              {!isEn && <p className="text-xs text-muted-foreground mt-1">{stat.labelEn}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
