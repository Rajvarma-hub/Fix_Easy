"use client"

import { useWorkerWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { XCircle, X } from "lucide-react"

export function WorkerJobCancellationPopup() {
  const { jobCancellation, clearJobCancellation } = useWorkerWebSocket()

  if (!jobCancellation) return null

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
          <CardTitle className="text-xl text-center">Job Cancelled</CardTitle>
          <p className="text-muted-foreground text-center">
            Job #{jobCancellation.job_id} has been cancelled by the {jobCancellation.cancelled_by.toLowerCase()}.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full bg-transparent" onClick={clearJobCancellation}>
            Dismiss
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
