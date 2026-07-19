"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import { getWorkerPendingJobs, getErrorMessage } from "@/lib/api"
import type { PendingJob } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Calendar, Briefcase, Loader2, CheckCircle, RefreshCw, User } from "lucide-react"

export function AvailableJobsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { respondToJob, isConnected } = useWorkerWebSocket()

  const [jobs, setJobs] = useState<PendingJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedJob, setSelectedJob] = useState<PendingJob | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)

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
    toast({ title: "Refreshed", description: "Job list updated" })
  }

  const handleAccept = async () => {
    if (!user || !selectedJob) return

    // Check WebSocket connection before accepting
    if (!isConnected) {
      toast({
        title: "Connection Lost",
        description: "Please wait while we reconnect to the server...",
        variant: "destructive",
      })
      return
    }

    setIsAccepting(true)
    try {
      // Use WebSocket to accept job (no REST API)
      respondToJob(selectedJob.job_id, "accept")
      
      toast({
        title: "Job Accepted!",
        description: "You have successfully accepted this job. Check My Jobs for details.",
      })
      
      // Remove the accepted job from the list
      setJobs((prev) => prev.filter((job) => job.job_id !== selectedJob.job_id))
      setDialogOpen(false)
      setSelectedJob(null)
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsAccepting(false)
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
          <h2 className="text-2xl font-bold">Available Jobs</h2>
          <p className="text-muted-foreground">Browse and accept service requests in your area</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Available Jobs</h3>
            <p className="text-muted-foreground text-center">
              There are no pending jobs at the moment. Check back later!
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
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.service_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.requested_time).toLocaleDateString()}
                    </CardDescription>
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
                <p className="text-sm line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-end pt-2 border-t">
                  <Button
                    onClick={() => {
                      setSelectedJob(job)
                      setDialogOpen(true)
                    }}
                  >
                    Accept Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accept Job Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Job</DialogTitle>
            <DialogDescription>Review the job details before accepting</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedJob.service_name}</p>
                  <p className="text-sm text-muted-foreground">Customer: {selectedJob.customer_name}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedJob.house_no}, {selectedJob.city}, {selectedJob.state} - {selectedJob.pincode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Posted on {new Date(selectedJob.requested_time).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
