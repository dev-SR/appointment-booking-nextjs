"use client"

import i18next from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import React from 'react'

export function I18nProvider({ children, locale = 'bn' }: { children: React.ReactNode, locale?: string }) {
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
                book_appointment: 'Book Appointment',
                login: 'Sign In',
                register: 'Register',
                my_portal: 'My Portal',
                logout: 'Sign Out',
              },
              auth: {
                register_title: 'Patient Registration',
                register_desc: 'Create a patient account for booking and payment history.',
                field_name: 'Full Name',
                field_email: 'Email',
                field_phone: 'Phone',
                field_password: 'Password',
                password_hint: 'At least 8 characters',
                create_account: 'Create Account',
                already_registered: 'Already registered?',
                sign_in: 'Sign in',
                error_email_exists: 'An account with this email already exists.',
                error_phone_exists: 'An account with this phone number already exists.',
                error_password_min: 'Password must be at least 8 characters.',
                error_name_min: 'Name must be at least 2 characters.',
                error_invalid_email: 'Please enter a valid email address.',
                error_invalid_phone: 'Please enter a valid phone number (at least 6 digits).',
                error_generic: 'Could not create the account. Please check your details and try again.',
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
                book_appointment: 'অ্যাপয়েন্টমেন্ট বুক করুন',
                login: 'সাইন ইন',
                register: 'নিবন্ধন করুন',
                my_portal: 'আমার পোর্টাল',
                logout: 'সাইন আউট',
              },
              auth: {
                register_title: 'রোগী নিবন্ধন',
                register_desc: 'অ্যাপয়েন্টমেন্ট বুকিং ও পেমেন্ট ইতিহাসের জন্য রোগীর অ্যাকাউন্ট তৈরি করুন।',
                field_name: 'পূর্ণ নাম',
                field_email: 'ইমেইল',
                field_phone: 'ফোন নম্বর',
                field_password: 'পাসওয়ার্ড',
                password_hint: 'কমপক্ষে ৮টি অক্ষর',
                create_account: 'অ্যাকাউন্ট তৈরি করুন',
                already_registered: 'ইতিমধ্যে নিবন্ধিত?',
                sign_in: 'সাইন ইন করুন',
                error_email_exists: 'এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট বিদ্যমান।',
                error_phone_exists: 'এই ফোন নম্বরে ইতিমধ্যে একটি অ্যাকাউন্ট বিদ্যমান।',
                error_password_min: 'পাসওয়ার্ড কমপক্ষে ৮টি অক্ষরের হতে হবে।',
                error_name_min: 'নাম কমপক্ষে ২টি অক্ষরের হতে হবে।',
                error_invalid_email: 'একটি বৈধ ইমেইল ঠিকানা লিখুন।',
                error_invalid_phone: 'একটি বৈধ ফোন নম্বর লিখুন (কমপক্ষে ৬টি সংখ্যা)।',
                error_generic: 'অ্যাকাউন্ট তৈরি করা যায়নি। বিস্তারিত পরীক্ষা করুন এবং আবার চেষ্টা করুন।',
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

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}
