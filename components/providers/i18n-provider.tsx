"use client"

import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import React, { useState, useEffect } from 'react'

export function I18nProvider({ children, locale = 'bn' }: { children: React.ReactNode, locale?: string }) {
  const [isClient, setIsClient] = useState(false)
  
  // Initialize on first render
  if (!i18next.isInitialized) {
    i18next
      .use(initReactI18next)
      .init({
        resources: {
          en: { 
            common: { 
              nav: { 
                home: 'Home', 
                doctors: 'Doctors', 
                about: 'About', 
                contact: 'Contact', 
                book_appointment: 'Book Appointment' 
              } 
            } 
          },
          bn: { 
            common: { 
              nav: { 
                home: 'হোম', 
                doctors: 'ডাক্তারগণ', 
                about: 'আমাদের সম্পর্কে', 
                contact: 'যোগাযোগ', 
                book_appointment: 'অ্যাপয়েন্টমেন্ট বুক করুন' 
              } 
            } 
          }
        },
        lng: locale,
        fallbackLng: 'en',
        interpolation: { escapeValue: false }
      })
  } else if (i18next.language !== locale) {
    i18next.changeLanguage(locale)
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return <>{children}</>

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}
