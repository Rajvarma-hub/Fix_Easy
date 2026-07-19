"use client"

import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, User, Key } from "lucide-react"
import { useRouter } from "next/navigation"

export function JobAcceptedPopup() {
  const router = useRouter()
  const { jobAccepted, clearJobAccepted } = useCustomerJobWebSocket()

  if (!jobAccepted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-green-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge className="bg-green-500 hover:bg-green-600">Worker Assigned</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearJobAccepted}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-center">Worker Assigned!</h3>
          <p className="text-sm text-muted-foreground text-center">
            Job #{jobAccepted.job_id} - Status: {jobAccepted.Status}
          </p>

          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Worker Name</p>
                <p className="font-medium">{jobAccepted.worker_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Verification OTP</p>
                <p className="font-mono text-2xl font-bold text-primary">{jobAccepted.Otp}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Share this OTP with the worker when they arrive to verify their identity and complete the job.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={clearJobAccepted}>
            Dismiss
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              clearJobAccepted()
              router.push("/dashboard/bookings")
            }}
          >
            View Booking
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
