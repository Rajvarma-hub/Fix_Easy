"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import { getWorkerPendingJobs, type PendingJob } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  MapPin, Calendar, Briefcase, Loader2, RefreshCw,
  User, Clock, Wifi, WifiOff, Check, X, Info
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AvailableJobsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { isConnected, respondToJob, pendingJobRequest, clearPendingJob } = useWorkerWebSocket()

  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [respondingJobId, setRespondingJobId] = useState<number | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const data = await getWorkerPendingJobs()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error("Failed to load jobs:", error)
      toast({ title: "Error", description: "Failed to load available jobs", variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    setIsLoading(true)
    loadJobs().finally(() => setIsLoading(false))
  }, [loadJobs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadJobs()
    setIsRefreshing(false)
  }

  // Accept/reject job via WebSocket (the correct flow matching backend)
  const handleRespond = async (jobId: number, action: "accept" | "reject") => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please go to Status page and set yourself Online first.",
        variant: "destructive",
      })
      return
    }
    setRespondingJobId(jobId)
    try {
      respondToJob(jobId, action)
      if (action === "accept") {
        toast({ title: "Job Accepted! ", description: "Check My Jobs tab for details and OTP." })
        // Remove from list after short delay
        setTimeout(() => {
          setJobs(prev => prev.filter(j => j.job_id !== jobId))
        }, 800)
      } else {
        toast({ title: "Job Rejected", description: "You passed on this job." })
        setJobs(prev => prev.filter(j => j.job_id !== jobId))
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to respond to job.", variant: "destructive" })
    } finally {
      setTimeout(() => setRespondingJobId(null), 800)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Available Jobs</h2>
          <p className="text-muted-foreground text-sm">Browse pending service requests in your area</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isConnected
              ? "text-emerald-600 border-emerald-300 bg-emerald-50"
              : "text-amber-600 border-amber-300 bg-amber-50"
            }
          >
            {isConnected
              ? <><Wifi className="h-3 w-3 mr-1.5" />Online</>
              : <><WifiOff className="h-3 w-3 mr-1.5" />Offline</>
            }
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info alert if offline */}
      {!isConnected && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            You're offline. Go to <strong>Status</strong> page and toggle yourself Online to accept jobs in real-time.
            You can still browse and respond to jobs listed below.
          </AlertDescription>
        </Alert>
      )}

      {/* Live job popup from WebSocket shown inline */}
      {pendingJobRequest && (
        <Card className="border-2 border-primary/40 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500 text-white animate-pulse"> New Live Request</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearPendingJob}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-lg mt-2">{pendingJobRequest.service_category}</CardTitle>
            <CardDescription>Job #{pendingJobRequest.service_request_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {pendingJobRequest.service_location.house_no && `${pendingJobRequest.service_location.house_no}, `}
                {pendingJobRequest.service_location.city}
                {pendingJobRequest.service_location.state && `, ${pendingJobRequest.service_location.state}`}
              </span>
            </div>
            {pendingJobRequest.service_description && (
              <p className="text-sm text-muted-foreground">{pendingJobRequest.service_description}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                onClick={() => handleRespond(pendingJobRequest.service_request_id, "reject")}
                disabled={respondingJobId === pendingJobRequest.service_request_id}
              >
                <X className="h-4 w-4 mr-2" />Reject
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleRespond(pendingJobRequest.service_request_id, "accept")}
                disabled={respondingJobId === pendingJobRequest.service_request_id}
              >
                {respondingJobId === pendingJobRequest.service_request_id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Check className="h-4 w-4 mr-2" />Accept</>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending jobs list */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Briefcase className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-semibold mb-1">No Pending Jobs</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              No jobs match your skills right now. New jobs will appear here as customers place requests.
            </p>
            <Button className="mt-4" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Check Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job, index) => (
            <Card key={`job-${job.job_id || index}`} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{job.service_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {new Date(job.requested_time).toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-0 flex-shrink-0">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {job.customer_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>{job.customer_name}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {[job.house_no, job.city, job.state].filter(Boolean).join(", ")}
                    {job.pincode ? ` - ${job.pincode}` : ""}
                  </span>
                </div>
                {job.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                    onClick={() => handleRespond(job.job_id, "reject")}
                    disabled={respondingJobId === job.job_id || !isConnected}
                  >
                    {respondingJobId === job.job_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><X className="h-4 w-4 mr-1" />Reject</>
                    }
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleRespond(job.job_id, "accept")}
                    disabled={respondingJobId === job.job_id || !isConnected}
                  >
                    {respondingJobId === job.job_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Check className="h-4 w-4 mr-1" />Accept</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
