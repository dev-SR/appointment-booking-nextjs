"use client"

import Link from "next/link"
import { Link as TransitionLink } from "next-transition-router"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Menu, Moon, Sun, Globe } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { t, i18n } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const toggleLanguage = () => {
    const nextLang = i18n.language === "en" ? "bn" : "en"
    i18n.changeLanguage(nextLang)
    document.cookie = `NEXT_LOCALE=${nextLang}; path=/`
    router.refresh()
  }

  const navLinks = [
    { href: "/", label: t("nav.home", "Home") },
    { href: "/doctors", label: t("nav.doctors", "Doctors") },
    { href: "/about", label: t("nav.about", "About") },
    { href: "/contact", label: t("nav.contact", "Contact") },
  ]

  return (
    <header className="navbar-container fixed top-0 z-50 w-full border-b border-transparent transition-colors">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-primary"
        >
          {process.env.NEXT_PUBLIC_CLINIC_NAME || "YourClinic"}
        </Link>

        {/* Desktop Nav */}
        <nav className="relative hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <TransitionLink
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </TransitionLink>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            onClick={toggleLanguage}
            title="Toggle Language"
            className="w-12 font-bold"
          >
            {i18n.language === "en" ? "EN" : "বাং"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
          <Button asChild>
            <TransitionLink href="/booking">
              {t("nav.book_appointment", "Book Appointment")}
            </TransitionLink>
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="flex items-center md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="top"
              className="flex h-[100dvh] flex-col items-center gap-6 pt-16"
            >
              {navLinks.map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </TransitionLink>
              ))}
              <div className="mt-4 flex w-full gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={toggleLanguage}
                >
                  {i18n.language === "en" ? "বাংলায় দেখুন" : "View in English"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                </Button>
              </div>
              <Button className="mt-auto mb-8 w-full" asChild>
                <TransitionLink
                  href="/booking"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("nav.book_appointment", "Book Appointment")}
                </TransitionLink>
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
