import { getIsEn } from '@/lib/i18n-server'

export async function generateMetadata() {
  const isEn = await getIsEn()
  return {
    title: isEn ? 'About Us | YourClinic' : 'আমাদের সম্পর্কে | YourClinic',
    description: isEn ? 'Learn more about YourClinic.' : 'আমাদের সম্পর্কে জানুন।',
  }
}

export default async function AboutPage() {
  const isEn = await getIsEn()
  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">{isEn ? 'About Us' : 'আমাদের সম্পর্কে'}</h1>
        <div className="prose prose-lg mx-auto text-left text-muted-foreground">
          <p className="mb-6">
            {isEn 
              ? 'YourClinic is a trusted digital healthcare platform in Bangladesh. Our main goal is to make doctor appointments easier for patients.'
              : 'YourClinic হলো বাংলাদেশের একটি বিশ্বস্ত ডিজিটাল স্বাস্থ্যসেবা প্ল্যাটফর্ম। আমাদের মূল লক্ষ্য হলো রোগীদের জন্য ডাক্তারদের অ্যাপয়েন্টমেন্ট নেওয়া সহজতর করা।'}
          </p>
          <p className="mb-6">
            {isEn
              ? 'Through our platform, you can easily find your required specialist doctor, view their ratings and fees, and book an appointment from the comfort of your home.'
              : 'আমাদের প্ল্যাটফর্মের মাধ্যমে আপনি সহজেই আপনার প্রয়োজনীয় বিশেষজ্ঞ ডাক্তার খুঁজে পেতে পারেন, তাদের রেটিং ও ফি দেখতে পারেন এবং ঘরে বসেই অ্যাপয়েন্টমেন্ট বুক করতে পারেন।'}
          </p>
          <p>
            {isEn
              ? 'We provide secure payment options via bKash, Nagad, and cards so you can receive healthcare hassle-free.'
              : 'আমরা বিকাশ, নগদ এবং কার্ডের মাধ্যমে নিরাপদ পেমেন্ট সুবিধা দিয়ে থাকি যাতে আপনি ঝামেলাহীনভাবে স্বাস্থ্যসেবা পেতে পারেন।'}
          </p>
        </div>
      </div>
    </div>
  )
}
