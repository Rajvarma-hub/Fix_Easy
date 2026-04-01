"use client"

import { useEffect, useState } from "react"
import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { XCircle, X, RefreshCw, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export function CustomerJobCancellationPopup() {
  const router = useRouter()
  const { jobCancellation, clearJobCancellation } = useCustomerJobWebSocket()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (jobCancellation) setTimeout(() => setVisible(true), 50)
    else setVisible(false)
  }, [jobCancellation])

  if (!jobCancellation) return null

  const isByWorker = jobCancellation.cancelled_by === "WORKER"

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(clearJobCancellation, 300)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div className={`w-full max-w-sm bg-background rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300 ${visible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}`}>
        <div className={`p-5 text-white relative ${isByWorker ? "bg-gradient-to-r from-red-500 to-rose-600" : "bg-gradient-to-r from-slate-500 to-slate-600"}`}>
          <Button
            variant="ghost" size="icon"
            className="absolute top-3 right-3 h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 mb-0.5">Job #{jobCancellation.job_id}</p>
              <h3 className="text-xl font-bold">{isByWorker ? "Worker Cancelled" : "Job Cancelled"}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className={`flex gap-3 p-4 rounded-2xl ${isByWorker ? "bg-red-50 border border-red-100" : "bg-muted/50"}`}>
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isByWorker ? "text-red-500" : "text-muted-foreground"}`} />
            <p className="text-sm text-muted-foreground">
              {isByWorker
                ? "The assigned worker has cancelled this job. We apologize for the inconvenience. You can book again and a new worker will be assigned."
                : "Your booking has been cancelled successfully."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDismiss}>Dismiss</Button>
            {isByWorker && (
              <Button className="flex-1 gap-2" onClick={() => { handleDismiss(); router.push("/dashboard/services") }}>
                <RefreshCw className="h-4 w-4" /> Book Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
