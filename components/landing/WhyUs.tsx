import { Card, CardContent } from "@/components/ui/card"
import { Zap, CreditCard, Smartphone, Bell, Users, ShieldCheck } from "lucide-react"
import { getIsEn } from '@/lib/i18n-server'

export async function WhyUs() {
  const isEn = await getIsEn()
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      titleEn: 'Instant Confirmation',
      titleBn: 'তাৎক্ষণিক কনফার্মেশন',
      desc: 'Get confirmed in seconds, not hours. No phone calls needed.'
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-500" />,
      titleEn: 'Pay Your Way',
      titleBn: 'সহজ পেমেন্ট',
      desc: 'bKash, Nagad, card, or cash at clinic — your choice.'
    },
    {
      icon: <Smartphone className="w-6 h-6 text-indigo-500" />,
      titleEn: 'Mobile First',
      titleBn: 'মোবাইল ফ্রেন্ডলি',
      desc: 'Book from anywhere, on any device, in under 2 minutes.'
    },
    {
      icon: <Bell className="w-6 h-6 text-red-500" />,
      titleEn: 'Smart Reminders',
      titleBn: 'স্মার্ট রিমাইন্ডার',
      desc: 'SMS + app reminders so you never miss an appointment.'
    },
    {
      icon: <Users className="w-6 h-6 text-green-500" />,
      titleEn: 'Family Accounts',
      titleBn: 'ফ্যামিলি অ্যাকাউন্ট',
      desc: 'Book for your entire family from a single account.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-slate-700 dark:text-slate-300" />,
      titleEn: 'Secure & Private',
      titleBn: 'নিরাপদ ও গোপনীয়',
      desc: 'Your medical data is encrypted and never shared.'
    }
  ]

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{isEn ? 'Why Choose Us?' : 'কেন আমাদের বেছে নেবেন?'}</h2>
          <p className="text-muted-foreground text-lg">{isEn ? 'The best healthcare platform' : 'Why Choose Us?'}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <Card key={i} className="border bg-card/50 hover:bg-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-background border flex items-center justify-center mb-6 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-1">{isEn ? feature.titleEn : feature.titleBn}</h3>
                {!isEn && <p className="text-sm font-medium text-primary mb-3">{feature.titleEn}</p>}
                <p className={isEn ? "text-muted-foreground leading-relaxed mt-4" : "text-muted-foreground leading-relaxed"}>{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
