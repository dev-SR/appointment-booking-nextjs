"use client"

import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

const TESTIMONIALS = [
  {
    rating: 5,
    bodyBn: "খুবই সহজে অ্যাপয়েন্টমেন্ট নিতে পারলাম। ডাক্তার সাহেব অনেক ভালো দেখলেন।",
    bodyEn: "I was able to book an appointment very easily. The doctor was very attentive.",
    name: "Fatema Begum",
    location: "Dhaka"
  },
  {
    rating: 5,
    bodyBn: "বিকাশ দিয়ে পেমেন্ট করার সুবিধা থাকায় অনেক সময় বেঁচে গেলো। সার্ভিস খুব ভালো।",
    bodyEn: "Paying with bKash saved a lot of time. Excellent service.",
    name: "Rahim Uddin",
    location: "Chittagong"
  },
  {
    rating: 4,
    bodyBn: "সিরিয়াল নিয়ে বসে থাকতে হয়নি। নির্দিষ্ট সময়েই ডাক্তার দেখাতে পেরেছি।",
    bodyEn: "Didn't have to wait in line. Saw the doctor exactly on time.",
    name: "Sadia Islam",
    location: "Sylhet"
  },
  {
    rating: 5,
    bodyBn: "এসএমএস এর মাধ্যমে রিমাইন্ডার পাওয়ার কারণে অ্যাপয়েন্টমেন্ট মিস হয়নি।",
    bodyEn: "The SMS reminders ensured I didn't miss my appointment.",
    name: "Kamal Hossain",
    location: "Rajshahi"
  }
]

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [isHovered, setIsHovered] = useState(false)
  const { i18n } = useTranslation('common')
  const isEn = i18n.language === 'en'

  // Simple auto-play
  useEffect(() => {
    if (!emblaApi || isHovered) return
    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, 4000)
    return () => clearInterval(interval)
  }, [emblaApi, isHovered])

  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{isEn ? 'What Our Patients Say' : 'রোগীরা যা বলছেন'}</h2>
          <p className="text-muted-foreground text-lg">{isEn ? 'Testimonials' : 'What Our Patients Say'}</p>
        </div>

        <div 
          className="embla overflow-hidden max-w-6xl mx-auto" 
          ref={emblaRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="embla__container flex">
            {TESTIMONIALS.map((t, i) => (
              <div className="embla__slide flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.33%] min-w-0 pl-4" key={i}>
                <Card className="testimonial-card h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                      ))}
                    </div>
                    <p className="text-lg mb-6 flex-grow italic leading-relaxed">
                      &quot;{isEn ? t.bodyEn : t.bodyBn}&quot;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t mt-auto">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
