import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Star } from "lucide-react"
import Link from "next/link"

interface DoctorCardDoctor {
  id: string
  titleEn?: string | null
  qualificationsEn?: string | null
  consultationFee?: number | null
  user?: {
    nameEn?: string | null
  } | null
  specialty?: {
    nameEn?: string | null
  } | null
  chambers?: Array<{
    isPrimary?: boolean
    chamber?: {
      nameEn?: string | null
    } | null
  }>
}

interface DoctorCardProps {
  doctor: DoctorCardDoctor
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  // Safe defaults if data is missing
  const name = `${doctor.titleEn || "Dr."} ${doctor.user?.nameEn || "Unknown"}`
  const specialty = doctor.specialty?.nameEn || "General"
  const qualifications = doctor.qualificationsEn || "MBBS"
  const primaryChamber =
    doctor.chambers?.find((chamber) => chamber.isPrimary)?.chamber ||
    doctor.chambers?.[0]?.chamber
  const chamberName = primaryChamber?.nameEn || "Clinic"
  const fee = doctor.consultationFee ? doctor.consultationFee / 100 : 0

  return (
    <Card className="doctor-card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
            {doctor.user?.nameEn?.charAt(0) || "D"}
          </div>
          <div>
            <h3 className="text-lg leading-tight font-bold">{name}</h3>
            <p className="text-sm font-medium text-primary">{specialty}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {qualifications}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-medium">4.8</span>
          <span className="ml-1 text-muted-foreground">(124 reviews)</span>
        </div>

        <div className="mt-2 flex flex-grow flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-2">{chamberName}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="font-bold">
            Tk {fee}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              fee
            </span>
          </div>
          <Button size="sm" asChild>
            <Link href={`/booking?doctorId=${doctor.id}`}>Book Now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
