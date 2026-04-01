"use client"

import { useAuth } from "@/lib/auth-context"
import { ServicesPage } from "@/components/customer/services-page"
import { WorkerServicesPage } from "@/components/worker/worker-services-page"
import { Suspense } from "react"

export default function Page() {
  const { role } = useAuth()

  if (role === "worker") {
    return <WorkerServicesPage />
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServicesPage />
    </Suspense>
  )
}
