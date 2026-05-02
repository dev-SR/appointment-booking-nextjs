"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

interface ApiValidationIssue {
  path: string[]
  message: string
  code?: string
}

interface ApiErrorResponse {
  success: false
  validationErrors?: ApiValidationIssue[]
  error?: string
}

/** Maps a Zod validation issue path + code to a localised translation key */
function getValidationErrorKey(issue: ApiValidationIssue): string | null {
  const path = issue.path[0]
  const code = issue.code ?? ""

  if (path === "password" && (code === "too_small" || issue.message.toLowerCase().includes("least 8"))) {
    return "auth.error_password_min"
  }
  if (path === "email" && (code === "invalid_string" || issue.message.toLowerCase().includes("email"))) {
    return "auth.error_invalid_email"
  }
  if (path === "phone" && code === "too_small") {
    return "auth.error_invalid_phone"
  }
  if (path === "nameEn" && code === "too_small") {
    return "auth.error_name_min"
  }
  return null
}

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation("common")
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors([])
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    let response: Response

    try {
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      })
    } catch {
      setErrors([t("auth.error_generic")])
      setLoading(false)
      return
    }

    if (response.ok) {
      setSuccess(true)
      // Redirect to home page (not login → admin)
      setTimeout(() => router.push("/login"), 1500)
      return
    }

    // Parse the error body for specific messages
    let body: ApiErrorResponse | null = null
    try {
      body = (await response.json()) as ApiErrorResponse
    } catch {
      /* non-JSON body */
    }

    const messages: string[] = []

    if (body?.validationErrors?.length) {
      for (const issue of body.validationErrors) {
        const key = getValidationErrorKey(issue)
        messages.push(key ? t(key) : issue.message)
      }
    } else if (response.status === 409 || body?.error === "DUPLICATE_OR_INTERNAL_ERROR") {
      // Could be duplicate email or phone – show both hints
      messages.push(t("auth.error_email_exists"))
      messages.push(t("auth.error_phone_exists"))
    } else {
      messages.push(t("auth.error_generic"))
    }

    setErrors(messages)
    setLoading(false)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("auth.register_title", "Patient Registration")}</CardTitle>
          <CardDescription>{t("auth.register_desc", "Create a patient account for booking and payment history.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="nameEn">{t("auth.field_name", "Full Name")}</FieldLabel>
                <Input id="nameEn" name="nameEn" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">{t("auth.field_email", "Email")}</FieldLabel>
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">{t("auth.field_phone", "Phone")}</FieldLabel>
                <Input id="phone" name="phone" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t("auth.field_password", "Password")}</FieldLabel>
                <Input id="password" name="password" type="password" minLength={8} required />
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  {t("auth.password_hint", "At least 8 characters")}
                </p>
              </Field>
            </FieldGroup>
            <input type="hidden" name="preferredLocale" value="bn" />

            {/* Validation / API errors */}
            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <ul className="space-y-1">
                    {errors.map((msg, i) => (
                      <li key={i} className="text-sm text-destructive">
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Success feedback */}
            {success && (
              <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {t("auth.register_success", "Account created! Redirecting to sign in…")}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading || success}>
              {loading ? "…" : t("auth.create_account", "Create Account")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.already_registered", "Already registered?")}{" "}
              <Link className="underline" href="/login">
                {t("auth.sign_in", "Sign in")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
