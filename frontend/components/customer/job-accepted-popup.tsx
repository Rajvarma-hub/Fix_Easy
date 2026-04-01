"use client"

import { useEffect, useState } from "react"
import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, User, Shield, Copy, Check, Phone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function JobAcceptedPopup() {
  const router = useRouter()
  const { toast } = useToast()
  const { jobAccepted, clearJobAccepted, storedJobData } = useCustomerJobWebSocket()
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    if (jobAccepted) {
      setTimeout(() => setVisible(true), 50)
    } else {
      setVisible(false)
    }
  }, [jobAccepted])

  if (!jobAccepted) return null

  const otp = jobAccepted.Otp
  const workerName = jobAccepted.worker_name
  const workerPhone = jobAccepted.worker_phone

  const handleCopy = () => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(true)
    toast({ title: "OTP Copied!", description: "Share it with the worker when they arrive." })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(clearJobAccepted, 300)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <div className={`w-full max-w-sm bg-background rounded-3xl shadow-2xl border overflow-hidden transition-all duration-300 ${visible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"}`}>
        {/* Green top bar */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-white relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 text-xs mb-1">Worker Assigned </Badge>
              <h3 className="text-xl font-bold">Job Accepted!</h3>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Worker info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Your Worker</p>
              <p className="font-semibold truncate">{workerName || "Worker assigned"}</p>
            </div>
            {workerPhone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />{workerPhone}
              </div>
            )}
          </div>

          {/* OTP display - the critical part */}
          <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Verification OTP</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {otp.split("").map((digit, i) => (
                  <div key={i} className="h-11 w-9 bg-white rounded-xl border-2 border-amber-200 flex items-center justify-center font-mono text-xl font-bold text-amber-900 shadow-sm">
                    {digit}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-600 mt-3 leading-relaxed">
               Share this 6-digit OTP with the worker when they arrive. This verifies their identity and completes the job.
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The OTP is also saved in your <strong>Bookings</strong> page
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDismiss}>
              Dismiss
            </Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleDismiss(); router.push("/dashboard/bookings") }}>
              View Booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
