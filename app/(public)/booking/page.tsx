import type { Metadata } from "next"
import { BookingWizard } from "@/components/booking/BookingWizard"
import { DoctorService } from "@/lib/services/doctor.service"
import { SelectedDoctor } from "@/store/booking.store"

export const metadata: Metadata = {
  title: "Book Appointment | Doctor Appointment System",
  description: "Book an appointment with a specialist doctor. Choose your doctor, date, and time slot.",
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BookingPage(props: Props) {
  const searchParams = await props.searchParams
  const doctorId = typeof searchParams.doctorId === "string" ? searchParams.doctorId : undefined

  let initialDoctor: SelectedDoctor | undefined = undefined;
  if (doctorId) {
    try {
      const doctor = await DoctorService.getById(doctorId)
      if (doctor && doctor.id) {
        initialDoctor = {
          id: doctor.id,
          titleEn: doctor.titleEn || "",
          nameEn: doctor.nameEn || "",
          nameBn: doctor.nameBn || null,
          specialtyEn: (doctor.specialty as any)?.nameEn || "",
          consultationFee: doctor.consultationFee || 0,
          profileImageUrl: doctor.profileImageUrl || null,
        }
      }
    } catch (e) {
      console.error("Failed to fetch initial doctor:", e)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <BookingWizard initialDoctor={initialDoctor} />
    </main>
  )
}
