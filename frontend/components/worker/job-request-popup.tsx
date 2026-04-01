"use client"

import { useWorkerWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, FileText, X, Check, Loader2, Briefcase } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function JobRequestPopup() {
  const { pendingJobRequest, respondToJob, clearPendingJob, isConnected } = useWorkerWebSocket()
  const { toast } = useToast()
  const [isResponding, setIsResponding] = useState(false)

  // Debug logging
  console.log("[v0] JobRequestPopup: Render check - pendingJobRequest:", pendingJobRequest)
  console.log("[v0] JobRequestPopup: isConnected:", isConnected)

  if (!pendingJobRequest) {
    console.log("[v0] JobRequestPopup: No pending job, returning null")
    return null
  }
  
  console.log("[v0] JobRequestPopup: SHOWING POPUP for job:", pendingJobRequest.service_request_id)

  const jobId = pendingJobRequest.service_request_id
  const serviceName = pendingJobRequest.service_category || "Service Request"
  const description = pendingJobRequest.service_description || ""
  const location = pendingJobRequest.service_location || {
    house_no: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    latitude: 0,
    longitude: 0,
  }

  const handleResponse = async (action: "accept" | "reject") => {
    if (!jobId) {
      toast({
        title: "Error",
        description: "Invalid job request - missing job ID",
        variant: "destructive",
      })
      return
    }

    setIsResponding(true)
    try {

      respondToJob(jobId, action)
      toast({
        title: action === "accept" ? "Job Accepted!" : "Job Rejected",
        description:
          action === "accept"
            ? "You have accepted the job. Navigate to the customer location."
            : "You have rejected the job request.",
      })
    } catch (error) {
      console.error("Failed to respond to job:", error)
      toast({
        title: "Error",
        description: "Failed to respond to job request",
        variant: "destructive",
      })
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 animate-pulse">
              New Job Request
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearPendingJob}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-xl mt-2">{serviceName}</CardTitle>
          <CardDescription>Job #{jobId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Info */}
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Service ID</p>
              <p className="text-sm text-muted-foreground">#{pendingJobRequest.service_id}</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm text-muted-foreground">
                {location.house_no && `${location.house_no}, `}
                {location.city}
              </p>
              {(location.state || location.pincode) && (
                <p className="text-xs text-muted-foreground">
                  {location.state}
                  {location.pincode && ` - ${location.pincode}`}, {location.country}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-transparent border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => handleResponse("reject")}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Reject
              </>
            )}
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => handleResponse("accept")}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accept
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
