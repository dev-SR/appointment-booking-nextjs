import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Star } from "lucide-react"
import Link from "next/link"

interface DoctorCardProps {
  doctor: any
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  // Safe defaults if data is missing
  const name = `${doctor.titleEn || 'Dr.'} ${doctor.user?.nameEn || 'Unknown'}`
  const specialty = doctor.specialty?.nameEn || 'General'
  const qualifications = doctor.qualificationsEn || 'MBBS'
  const primaryChamber = doctor.chambers?.find((c: any) => c.isPrimary)?.chamber || doctor.chambers?.[0]?.chamber
  const chamberName = primaryChamber?.nameEn || 'Clinic'
  const fee = doctor.consultationFee ? doctor.consultationFee / 100 : 0

  return (
    <Card className="doctor-card overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full gap-4">
        <div className="flex gap-4 items-start">
          <div className="h-16 w-16 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-primary font-bold text-xl">
            {doctor.user?.nameEn?.charAt(0) || 'D'}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{name}</h3>
            <p className="text-sm text-primary font-medium">{specialty}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{qualifications}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 text-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-medium">4.8</span>
          <span className="text-muted-foreground ml-1">(124 reviews)</span>
        </div>

        <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-2 flex-grow">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{chamberName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="font-bold">
            Tk {fee} <span className="text-xs font-normal text-muted-foreground">fee</span>
          </div>
          <Button size="sm" asChild>
            <Link href={`/book?doctorId=${doctor.id}`}>Book Now</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
