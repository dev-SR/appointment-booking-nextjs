import Link from "next/link"
import { Globe, MessageCircle, MapPin, Phone, Mail } from "lucide-react"
import { getIsEn } from "@/lib/i18n-server"

export async function Footer() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "YourClinic"
  const isEn = await getIsEn()

  return (
    <footer className="border-t bg-muted pt-16 pb-8 text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div>
            <h3 className="mb-4 text-2xl font-bold text-foreground">
              {clinicName}
            </h3>
            <p className="mb-6 text-sm leading-relaxed">
              {isEn
                ? "Leading reliable healthcare platform in Bangladesh. We are always by your side for your wellbeing."
                : "বাংলাদেশের অন্যতম নির্ভরযোগ্য স্বাস্থ্যসেবা প্ল্যাটফর্ম। আমরা আপনার সুস্থতায় সবসময় পাশে আছি।"}
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-background transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Globe className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-background transition-colors hover:border-[#25D366] hover:bg-[#25D366] hover:text-white"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-lg font-bold text-foreground">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/doctors"
                  className="transition-colors hover:text-primary"
                >
                  Doctors
                </Link>
              </li>
              <li>
                <Link
                  href="/booking"
                  className="transition-colors hover:text-primary"
                >
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-primary"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-primary"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="mb-4 text-lg font-bold text-foreground">
              Specialties
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/doctors?specialty=cardiology"
                  className="transition-colors hover:text-primary"
                >
                  Cardiology
                </Link>
              </li>
              <li>
                <Link
                  href="/doctors?specialty=neurology"
                  className="transition-colors hover:text-primary"
                >
                  Neurology
                </Link>
              </li>
              <li>
                <Link
                  href="/doctors?specialty=orthopedics"
                  className="transition-colors hover:text-primary"
                >
                  Orthopedics
                </Link>
              </li>
              <li>
                <Link
                  href="/doctors?specialty=dermatology"
                  className="transition-colors hover:text-primary"
                >
                  Dermatology
                </Link>
              </li>
              <li>
                <Link
                  href="/doctors?specialty=pediatrics"
                  className="transition-colors hover:text-primary"
                >
                  Pediatrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-lg font-bold text-foreground">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <span>123 Health Avenue, Dhaka 1212, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>+880 1700 000 000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>info@yourclinic.com.bd</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm md:flex-row">
          <p>
            © {new Date().getFullYear()} {clinicName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
