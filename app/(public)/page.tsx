import type { Metadata } from 'next'
import { Hero } from '@/components/landing/Hero'
import { StatsBar } from '@/components/landing/StatsBar'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeaturedDoctors } from '@/components/landing/FeaturedDoctors'
import { WhyUs } from '@/components/landing/WhyUs'
import { Testimonials } from '@/components/landing/Testimonials'
import { CtaBanner } from '@/components/landing/CtaBanner'

export const metadata: Metadata = {
  title: 'ডাক্তার অ্যাপয়েন্টমেন্ট | YourClinic',
  description: 'বাংলাদেশের সেরা ডাক্তারদের সাথে অনলাইনে অ্যাপয়েন্টমেন্ট বুক করুন।',
  keywords: ['doctor appointment', 'ডাক্তার', 'appointment booking', 'bangladesh'],
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <FeaturedDoctors />
      <WhyUs />
      <Testimonials />
      <CtaBanner />
    </>
  )
}
