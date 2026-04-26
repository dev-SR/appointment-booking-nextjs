import { Search, CalendarDays, CheckCircle } from 'lucide-react'
import { getIsEn } from '@/lib/i18n-server'

export async function HowItWorks() {
  const isEn = await getIsEn()
  const steps = [
    {
      icon: <Search className="w-8 h-8 text-primary" />,
      titleBn: 'ডাক্তার খুঁজুন',
      titleEn: 'Find a Doctor',
      desc: 'Search by specialty, location, or name. View ratings, fees, and available slots.'
    },
    {
      icon: <CalendarDays className="w-8 h-8 text-primary" />,
      titleBn: 'সময় বেছে নিন',
      titleEn: 'Pick a Time',
      desc: 'Choose your preferred date and time slot. Same-day and advance booking available.'
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      titleBn: 'বুক করুন',
      titleEn: 'Book & Pay',
      desc: 'Confirm your appointment. Pay instantly via bKash, Nagad, or pay at the clinic.'
    }
  ]

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{isEn ? 'How It Works' : 'কীভাবে কাজ করে?'}</h2>
          <p className="text-muted-foreground text-lg">{isEn ? '3 Simple Steps' : 'How It Works in 3 simple steps'}</p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {/* Connector Line (Desktop Only) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 step-connector">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path 
                d="M 0 0 C 50 0 50 0 100 0" 
                vectorEffect="non-scaling-stroke" 
                className="stroke-primary/20 stroke-2 fill-none"
                strokeDasharray="5 5"
              />
            </svg>
          </div>

          {steps.map((step, i) => (
            <div key={i} className="step-card relative flex flex-col items-center text-center z-10">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/20">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-1">{isEn ? step.titleEn : step.titleBn}</h3>
              {!isEn && <p className="text-sm font-medium text-primary mb-4">{step.titleEn}</p>}
              <p className={isEn ? "text-muted-foreground leading-relaxed mt-4" : "text-muted-foreground leading-relaxed"}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
