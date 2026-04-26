import { LandingAnimations } from '@/components/landing/LandingAnimations'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingAnimations>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </LandingAnimations>
  )
}
