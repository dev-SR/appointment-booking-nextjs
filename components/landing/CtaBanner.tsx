import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getIsEn } from '@/lib/i18n-server'

export async function CtaBanner() {
  const isEn = await getIsEn()
  return (
    <section className="cta-section py-20 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 max-w-3xl mx-auto leading-tight">
          {isEn ? 'Book Your Appointment Today' : 'আজই আপনার অ্যাপয়েন্টমেন্ট বুক করুন'}
        </h2>
        <p className="text-xl md:text-2xl opacity-90 mb-10">
          {isEn ? 'Join thousands of patients who trust us' : 'হাজারো রোগীর বিশ্বাসের প্ল্যাটফর্মে যোগ দিন'}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" variant="secondary" asChild className="font-bold text-base h-14 px-8">
            <Link href="/booking">{isEn ? 'Book Now' : 'এখনই বুক করুন'}</Link>
          </Button>
          <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 h-14 px-8 font-bold" asChild>
            <Link href="/about">{isEn ? 'Learn More' : 'আরও জানুন'}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
