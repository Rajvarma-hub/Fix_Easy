"use client"

import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { XCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function CustomerJobCancellationPopup() {
  const router = useRouter()
  const { jobCancellation, clearJobCancellation } = useCustomerJobWebSocket()

  if (!jobCancellation) return null

  const isCancelledByWorker = jobCancellation.cancelled_by === "WORKER"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-destructive/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="destructive">Job Cancelled</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearJobCancellation}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-center">
            {isCancelledByWorker ? "Worker Cancelled" : "Job Cancelled"}
          </CardTitle>
          <p className="text-muted-foreground text-center">
            {isCancelledByWorker
              ? "The worker has cancelled this job. We apologize for the inconvenience."
              : "Your job has been cancelled successfully."}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={clearJobCancellation}>
            Dismiss
          </Button>
          {isCancelledByWorker && (
            <Button
              className="flex-1"
              onClick={() => {
                clearJobCancellation()
                router.push("/dashboard/services")
              }}
            >
              Book Again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
