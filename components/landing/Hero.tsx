"use client"

import { Link as TransitionLink } from 'next-transition-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, CheckCircle2, Shield, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export function Hero() {
  const router = useRouter()
  const { i18n } = useTranslation('common')
  const isEn = i18n.language === 'en'

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = formData.get('q')
    if (q) {
      router.push(`/doctors?q=${encodeURIComponent(q as string)}`)
    }
  }

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column */}
        <div className="max-w-2xl">
          <Badge variant="secondary" className="hero-badge mb-6 py-1 px-3 text-sm font-medium">
            {isEn ? 'Trusted Healthcare in Bangladesh' : '🇧🇩 বাংলাদেশের বিশ্বস্ত স্বাস্থ্যসেবা'}
          </Badge>
          
          <h1 className="hero-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {isEn ? (
              <>Find the Right <span className="text-primary">Doctor</span> for Your Health</>
            ) : (
              <>আপনার সুস্বাস্থ্যের জন্য <br className="hidden md:block"/> 
              <span className="text-primary">সঠিক ডাক্তার</span> খুঁজুন</>
            )}
          </h1>
          
          <p className="hero-sub text-lg text-muted-foreground mb-8 max-w-lg">
            {isEn 
              ? 'Book appointments from home — pay with bKash, Nagad, or cash.' 
              : 'ঘরে বসেই অ্যাপয়েন্টমেন্ট বুক করুন — bKash, Nagad বা ক্যাশে পেমেন্ট করুন।'}
          </p>

          <div className="hero-cta space-y-6">
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  name="q"
                  placeholder={isEn ? "Search doctor or specialty..." : "ডাক্তার বা স্পেশালিটি খুঁজুন..."} 
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button type="submit">{isEn ? 'Search' : 'খুঁজুন'}</Button>
            </form>

            <div className="flex flex-wrap gap-4 pt-4 border-t">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <TransitionLink href="/book">{isEn ? 'Book Appointment' : 'অ্যাপয়েন্টমেন্ট বুক করুন'}</TransitionLink>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                <TransitionLink href="/doctors">{isEn ? 'View Doctors' : 'ডাক্তারদের দেখুন'}</TransitionLink>
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-8">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500"/> {isEn ? '500+ Doctors' : '500+ ডাক্তার'}</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500"/> {isEn ? 'Instant Confirmation' : 'তাৎক্ষণিক কনফার্মেশন'}</span>
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-blue-500"/> {isEn ? 'Secure Payment' : 'নিরাপদ পেমেন্ট'}</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="relative aspect-square md:aspect-[4/3] max-w-lg mx-auto w-full">
          <div className="hero-image relative w-full h-full rounded-2xl overflow-hidden bg-primary/5">
            {/* Using a placeholder gradient/shape instead of a raw image if not available */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent flex items-center justify-center">
               <div className="w-64 h-64 rounded-full bg-primary/10 blur-3xl absolute" />
               <div className="w-48 h-48 rounded-full bg-blue-500/10 blur-2xl absolute -bottom-10 -right-10" />
            </div>
          </div>

          {/* Floating Cards */}
          <div className="hero-float-card absolute top-8 right-0 md:-right-8 bg-background border shadow-lg rounded-xl p-3 flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">কনফার্মড</p>
              <p className="text-xs text-muted-foreground">অ্যাপয়েন্টমেন্ট সফল</p>
            </div>
          </div>

          <div className="hero-float-card absolute bottom-16 -left-4 md:-left-12 bg-background border shadow-lg rounded-xl p-3 flex items-center gap-3">
            <div className="text-xl">⭐</div>
            <div>
              <p className="text-sm font-semibold">4.9 রেটিং</p>
              <p className="text-xs text-muted-foreground">Dr. Rahman, Cardiology</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
