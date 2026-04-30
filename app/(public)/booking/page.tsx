import type { Metadata } from "next"
import { BookingWizard } from "@/components/booking/BookingWizard"

export const metadata: Metadata = {
  title: "Book Appointment | Doctor Appointment System",
  description: "Book an appointment with a specialist doctor. Choose your doctor, date, and time slot.",
}

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-background">
      <BookingWizard />
    </main>
  )
}
