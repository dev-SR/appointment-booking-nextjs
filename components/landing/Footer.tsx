import Link from 'next/link'
import { Globe, MessageCircle, MapPin, Phone, Mail } from 'lucide-react'
import { getIsEn } from '@/lib/i18n-server'

export async function Footer() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'YourClinic'
  const isEn = await getIsEn()

  return (
    <footer className="bg-muted text-muted-foreground pt-16 pb-8 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4">{clinicName}</h3>
            <p className="mb-6 text-sm leading-relaxed">
              {isEn ? 'Leading reliable healthcare platform in Bangladesh. We are always by your side for your wellbeing.' : 'বাংলাদেশের অন্যতম নির্ভরযোগ্য স্বাস্থ্যসেবা প্ল্যাটফর্ম। আমরা আপনার সুস্থতায় সবসময় পাশে আছি।'}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-background border flex items-center justify-center hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/doctors" className="hover:text-primary transition-colors">Doctors</Link></li>
              <li><Link href="/book" className="hover:text-primary transition-colors">Book Appointment</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-lg font-bold text-foreground mb-4">Specialties</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/doctors?specialty=cardiology" className="hover:text-primary transition-colors">Cardiology</Link></li>
              <li><Link href="/doctors?specialty=neurology" className="hover:text-primary transition-colors">Neurology</Link></li>
              <li><Link href="/doctors?specialty=orthopedics" className="hover:text-primary transition-colors">Orthopedics</Link></li>
              <li><Link href="/doctors?specialty=dermatology" className="hover:text-primary transition-colors">Dermatology</Link></li>
              <li><Link href="/doctors?specialty=pediatrics" className="hover:text-primary transition-colors">Pediatrics</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold text-foreground mb-4">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>123 Health Avenue, Dhaka 1212, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <span>+880 1700 000 000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <span>info@yourclinic.com.bd</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>© {new Date().getFullYear()} {clinicName}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
