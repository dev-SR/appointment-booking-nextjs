import { FeaturedDoctors } from '@/components/landing/FeaturedDoctors'
import { getIsEn } from '@/lib/i18n-server'

export async function generateMetadata() {
  const isEn = await getIsEn()
  return {
    title: isEn ? 'Our Doctors | YourClinic' : 'আমাদের ডাক্তারগণ | YourClinic',
    description: isEn ? 'View our specialist doctors and book an appointment.' : 'আমাদের বিশেষজ্ঞ ডাক্তারদের তালিকা দেখুন এবং অ্যাপয়েন্টমেন্ট বুক করুন।'
  }
}

export default async function DoctorsPage() {
  const isEn = await getIsEn()
  return (
    <div className="pt-24 pb-12">
      <div className="container mx-auto px-4 mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">{isEn ? 'Our Doctors' : 'আমাদের ডাক্তারগণ'}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {isEn ? 'Find your required specialist doctor and book an appointment from home.' : 'খুঁজে নিন আপনার প্রয়োজনীয় বিশেষজ্ঞ ডাক্তার এবং ঘরে বসেই বুক করুন অ্যাপয়েন্টমেন্ট।'}
        </p>
      </div>
      <FeaturedDoctors />
    </div>
  )
}
