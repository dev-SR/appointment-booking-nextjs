import { MapPin, Phone, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getIsEn } from '@/lib/i18n-server'

export async function generateMetadata() {
  const isEn = await getIsEn()
  return {
    title: isEn ? 'Contact Us | YourClinic' : 'যোগাযোগ | YourClinic',
    description: isEn ? 'Get in touch with us.' : 'আমাদের সাথে যোগাযোগ করুন।',
  }
}

export default async function ContactPage() {
  const isEn = await getIsEn()
  return (
    <div className="pt-32 pb-24 bg-muted/20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{isEn ? 'Contact Us' : 'যোগাযোগ করুন'}</h1>
          <p className="text-muted-foreground text-lg">
            {isEn ? 'Get in touch with us for any inquiries' : 'যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">{isEn ? 'Contact Information' : 'যোগাযোগের ঠিকানা'}</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{isEn ? 'Office' : 'অফিস'}</h3>
                  <p className="text-muted-foreground">123 Health Avenue, Dhaka 1212, Bangladesh</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{isEn ? 'Phone' : 'ফোন'}</h3>
                  <p className="text-muted-foreground">+880 1700 000 000</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{isEn ? 'Email' : 'ইমেইল'}</h3>
                  <p className="text-muted-foreground">info@yourclinic.com.bd</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form Placeholder */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">{isEn ? 'Send a Message' : 'বার্তা পাঠান'}</h2>
              <form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? 'Name' : 'নাম'}</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2" placeholder={isEn ? "Your Name" : "আপনার নাম"} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? 'Phone / Email' : 'ফোন / ইমেইল'}</label>
                  <input type="text" className="w-full border rounded-md px-3 py-2" placeholder={isEn ? "Phone number or email" : "ফোন নাম্বার বা ইমেইল"} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? 'Message' : 'বার্তা'}</label>
                  <textarea className="w-full border rounded-md px-3 py-2 min-h-[120px]" placeholder={isEn ? "How can we help?" : "কীভাবে সাহায্য করতে পারি?"}></textarea>
                </div>
                <Button type="button" className="w-full">{isEn ? 'Send' : 'পাঠান'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
