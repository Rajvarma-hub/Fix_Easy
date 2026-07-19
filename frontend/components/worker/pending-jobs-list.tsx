"use client"

import { useEffect, useState, useCallback } from "react"
import { getWorkerPendingJobs, type PendingJob } from "@/lib/api"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Calendar, User, FileText, RefreshCw, Check, X, Loader2, Briefcase } from "lucide-react"

export function PendingJobsList() {
  const { toast } = useToast()
  const { respondToJob, isConnected } = useWorkerWebSocket()

  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [respondingJobId, setRespondingJobId] = useState<number | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const response = await getWorkerPendingJobs()
      setJobs(response.jobs || [])
    } catch (error) {
      console.error("Failed to load pending jobs:", error)
      toast({ title: "Error", description: "Failed to load pending jobs", variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true)
      await loadJobs()
      setIsLoading(false)
    }
    initialLoad()
  }, [loadJobs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadJobs()
    setIsRefreshing(false)
  }

  const handleResponse = async (jobId: number, action: "accept" | "reject") => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please go online to accept/reject jobs",
        variant: "destructive",
      })
      return
    }

    setRespondingJobId(jobId)
    try {
      // Send response via WebSocket
      respondToJob(jobId, action)

      // Remove job from list
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId))

      toast({
        title: action === "accept" ? "Job Accepted" : "Job Rejected",
        description: action === "accept" ? "Check My Jobs for details" : "Job has been rejected",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to job",
        variant: "destructive",
      })
    } finally {
      setRespondingJobId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={`skeleton-${i}`} className="h-48" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending Jobs</h2>
          <p className="text-muted-foreground">Jobs waiting for your response</p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500">
              Go online to respond
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Jobs</h3>
            <p className="text-muted-foreground text-center">
              No jobs are waiting for your response. Stay online to receive new requests!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.job_id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.service_name}</CardTitle>
                    <CardDescription>Job #{job.job_id}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{job.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {job.house_no}, {job.city}, {job.state} - {job.pincode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(job.requested_time).toLocaleString()}</span>
                </div>
                {job.description && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mt-0.5" />
                    <span className="line-clamp-2">{job.description}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                    onClick={() => handleResponse(job.job_id, "reject")}
                    disabled={respondingJobId === job.job_id || !isConnected}
                  >
                    {respondingJobId === job.job_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleResponse(job.job_id, "accept")}
                    disabled={respondingJobId === job.job_id || !isConnected}
                  >
                    {respondingJobId === job.job_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
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
