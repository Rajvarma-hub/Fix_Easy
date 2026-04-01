"use client"

import { useAuth } from "@/lib/auth-context"
import { CustomerDashboard } from "@/components/customer/customer-dashboard"
import { WorkerDashboard } from "@/components/worker/worker-dashboard"

export default function DashboardPage() {
  const { role } = useAuth()

  if (role === "worker") {
    return <WorkerDashboard />
  }

  return <CustomerDashboard />
}
