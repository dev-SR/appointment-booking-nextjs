"use client"

import Link from "next/link"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    if (result?.error) {
      setError("Invalid credentials or inactive account.")
      return
    }
    router.push(result?.url ?? callbackUrl)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your staff or patient email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </Field>
            </FieldGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Sign in</Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => signIn("google", { callbackUrl })}>Google</Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => signIn("facebook", { callbackUrl })}>Facebook</Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              New patient? <Link className="underline" href="/register">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
