import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { TransitionProvider } from "@/components/providers/transition-provider"
import { cn } from "@/lib/utils";
import { cookies } from "next/headers"

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'bn'

  return (
    <html
      lang={locale === 'en' ? 'en' : 'bn'}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <I18nProvider locale={locale}>
          <TransitionProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </TransitionProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
