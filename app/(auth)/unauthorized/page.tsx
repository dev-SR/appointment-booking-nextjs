import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>Your account does not have permission for this portal or action.</CardDescription>
        </CardHeader>
        <CardContent><Button asChild><Link href="/">Return home</Link></Button></CardContent>
      </Card>
    </main>
  )
}
