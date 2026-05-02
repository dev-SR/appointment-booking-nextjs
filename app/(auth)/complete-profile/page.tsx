"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function CompleteProfilePage() {
  const router = useRouter()
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const response = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    })
    if (!response.ok) {
      setError("Could not update your profile.")
      return
    }
    router.push("/patient")
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Complete profile</CardTitle>
          <CardDescription>Add the details required for portal access.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="nameEn">Full name</FieldLabel><Input id="nameEn" name="nameEn" required /></Field>
              <Field><FieldLabel htmlFor="phone">Phone</FieldLabel><Input id="phone" name="phone" /></Field>
            </FieldGroup>
            <input type="hidden" name="preferredLocale" value="bn" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
