import prisma from '@/lib/prisma'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DoctorCard } from './DoctorCard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getIsEn } from '@/lib/i18n-server'

export async function FeaturedDoctors() {
  const doctors = await prisma.doctor.findMany({
    // take: 8,
    // where: { isFeatured: true }, // We don't have isFeatured in schema yet, so let's just take top 8
    take: 8,
    include: {
      user: true,
      specialty: true,
      chambers: { include: { chamber: true } }
    }
  })

  const isEn = await getIsEn()

  const specialties = await prisma.specialty.findMany({
    take: 5,
    orderBy: { sortOrder: 'asc' }
  })

  // Group by specialty for tabs
  const tabs = [
    { id: 'all', label: 'All' },
    ...specialties.map(s => ({ id: s.id, label: s.nameEn }))
  ]

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{isEn ? 'Our Specialist Doctors' : 'আমাদের বিশেষজ্ঞ ডাক্তারগণ'}</h2>
            <p className="text-muted-foreground text-lg">{isEn ? 'Top rated professionals' : 'Our Specialist Doctors'}</p>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex">
            <Link href="/doctors">{isEn ? 'View All Doctors →' : 'সকল ডাক্তার দেখুন →'}</Link>
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8 flex-wrap h-auto p-1 justify-start overflow-x-auto w-full inline-flex max-w-full">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="min-w-fit">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map(doctor => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
            {doctors.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border rounded-lg bg-background">
                No doctors found. Please run seed script.
              </div>
            )}
          </TabsContent>

          {specialties.map(spec => {
            const filteredDoctors = doctors.filter(d => d.specialtyId === spec.id)
            return (
              <TabsContent key={spec.id} value={spec.id} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredDoctors.map(doctor => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
                {filteredDoctors.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg bg-background">
                    No doctors available in this specialty.
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild className="w-full">
            <Link href="/doctors">{isEn ? 'View All Doctors →' : 'সকল ডাক্তার দেখুন →'}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
