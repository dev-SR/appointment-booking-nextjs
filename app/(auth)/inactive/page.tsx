import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function InactivePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account inactive</CardTitle>
          <CardDescription>Please contact an administrator to reactivate portal access.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
