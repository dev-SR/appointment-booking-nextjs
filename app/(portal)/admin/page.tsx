import { redirect } from "next/navigation"

/**
 * Admin Dashboard — redirects to appointments for now
 */
export default function AdminPage() {
  redirect("/admin/appointments")
}
