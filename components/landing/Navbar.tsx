"use client"

import Link from "next/link"
import { Link as TransitionLink } from "next-transition-router"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { Menu, Moon, Sun, LogOut, LayoutDashboard, UserCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

export function Navbar() {
  const { t, i18n } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated" && !!session?.user

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

  /** Determine the portal link for the current user */
  function getPortalLink() {
    if (!isLoggedIn) return "/login"
    const perms = session.user.permissions ?? []
    if (perms.some((p) => p.startsWith("admin:"))) return "/admin"
    if (perms.some((p) => p.startsWith("doctor:"))) return "/doctor"
    if (perms.some((p) => p.startsWith("receptionist:"))) return "/receptionist"
    if (perms.some((p) => p.startsWith("accountant:"))) return "/accountant"
    return "/patient"
  }

  const initials = isLoggedIn
    ? (session.user.nameEn ?? "?")
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : ""

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
          {/* Language toggle */}
          <Button
            variant="outline"
            onClick={toggleLanguage}
            title="Toggle Language"
            className="w-12 font-bold"
          >
            {i18n.language === "en" ? "EN" : "বাং"}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            <Sun className="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>

          {/* Book Appointment CTA */}
          <Button asChild>
            <TransitionLink href="/booking">
              {t("nav.book_appointment", "Book Appointment")}
            </TransitionLink>
          </Button>

          {/* Auth area */}
          {status === "loading" ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full ring-2 ring-primary/20 transition-all hover:ring-primary/60 focus:outline-none focus:ring-primary"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user.profileImageUrl ?? undefined} alt={session.user.nameEn} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-semibold">{session.user.nameEn}</span>
                  {session.user.email && (
                    <span className="text-xs font-normal text-muted-foreground">{session.user.email}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getPortalLink()} className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("nav.my_portal", "My Portal")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.logout", "Sign Out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">{t("nav.login", "Sign In")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">{t("nav.register", "Register")}</Link>
              </Button>
            </div>
          )}
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
              {/* User info when logged in */}
              {isLoggedIn && (
                <div className="flex items-center gap-3 w-full px-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.user.profileImageUrl ?? undefined} alt={session.user.nameEn} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{session.user.nameEn}</span>
                    {session.user.email && (
                      <span className="text-xs text-muted-foreground">{session.user.email}</span>
                    )}
                  </div>
                </div>
              )}

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

              {/* Auth links on mobile */}
              {!isLoggedIn ? (
                <div className="flex w-full gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      {t("nav.login", "Sign In")}
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      {t("nav.register", "Register")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex w-full gap-3">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={getPortalLink()} onClick={() => setIsMobileMenuOpen(false)}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("nav.my_portal", "My Portal")}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      signOut({ callbackUrl: "/" })
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.logout", "Sign Out")}
                  </Button>
                </div>
              )}

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
