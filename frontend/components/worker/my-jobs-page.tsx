"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { ServiceRequest } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { MapPin, Calendar, Clock, CheckCircle, XCircle, Loader2, AlertCircle, User, RefreshCw } from "lucide-react"

export function MyJobsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pendingJobs, setPendingJobs] = useState<ServiceRequest[]>([])
  const [completedJobs, setCompletedJobs] = useState<ServiceRequest[]>([])
  const [cancelledJobs, setCancelledJobs] = useState<ServiceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [selectedJob, setSelectedJob] = useState<ServiceRequest | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadJobs = useCallback(async () => {
    if (!user) return
    try {
      const response = await api.worker.getMyJobs()

      // Transform each category
      const transformJob = (job: any): ServiceRequest => ({
        id: job.job_id?.toString() || "",
        customerId: job.customer_details?.customer_name || "",
        categoryId: "",
        categoryName: job.service_category || "Unknown Service",
        addressId: "",
        address: {
          street: job.location_details?.house_no || "",
          city: job.location_details?.city || "",
          state: job.location_details?.state || "",
          zipCode: job.location_details?.pincode || "",
        },
        description: job.description || "",
        status: (job.status?.toLowerCase() || "pending") as ServiceRequest["status"],
        price: job.amount || 0,
        otp: job.otp,
        createdAt: job.requested_time || new Date().toISOString(),
        customerPhone: job.customer_details?.customer_phone || undefined,
      })

      setPendingJobs((response.pending || []).map(transformJob))
      setCompletedJobs((response.completed || []).map(transformJob))
      setCancelledJobs((response.cancelled || []).map(transformJob))
    } catch (error) {
      console.error("Failed to load jobs:", error)
      toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" })
    }
  }, [user, toast])

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

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedJob) return

    setIsSubmitting(true)
    try {
      await api.worker.completeJob(selectedJob.id, otp)
      toast({ title: "Job Completed!", description: "Great work! The job has been marked as complete." })
      await loadJobs()
      setCompleteDialogOpen(false)
      setOtp("")
      setSelectedJob(null)
    } catch (error) {
      toast({
        title: "Invalid OTP",
        description: "Please ask the customer for the correct OTP.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!user || !selectedJob) return

    setIsSubmitting(true)
    try {
      await api.worker.cancelJob(selectedJob.id)
      toast({ title: "Job Cancelled", description: "The job has been cancelled." })
      await loadJobs()
      setCancelDialogOpen(false)
      setSelectedJob(null)
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel job.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Status badge color mapping
  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    assigned: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
  } as const

  const statusColors = STATUS_COLORS;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={`skeleton-${i}`} className="h-48" />
        ))}
      </div>
    )
  }

  const JobCard = ({
    job,
    showActions = false,
    index,
  }: { job: ServiceRequest; showActions?: boolean; index: number }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{job.categoryName}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {new Date(job.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={STATUS_COLORS[job.status] || "bg-gray-100 text-gray-800"}>
            {job.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {job.address.street}, {job.address.city}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Customer: {job.customerId || "N/A"}</span>
        </div>
        <p className="text-sm line-clamp-2">{job.description}</p>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold text-green-600">${job.price}</span>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedJob(job)
                  setCancelDialogOpen(true)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedJob(job)
                  setCompleteDialogOpen(true)
                }}
              >
                Complete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Jobs</h2>
          <p className="text-muted-foreground">Manage your pending, completed, and cancelled jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Cancelled ({cancelledJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Jobs</h3>
                <p className="text-muted-foreground">You have no pending jobs at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingJobs.map((job, index) => (
                <JobCard key={job.id || `pending-${index}`} job={job} showActions index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Jobs</h3>
                <p className="text-muted-foreground">Your completed jobs will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedJobs.map((job, index) => (
                <JobCard key={job.id || `completed-${index}`} job={job} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelledJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Jobs</h3>
                <p className="text-muted-foreground">Your cancelled jobs will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cancelledJobs.map((job, index) => (
                <JobCard key={job.id || `cancelled-${index}`} job={job} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Complete Job Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>Enter the OTP provided by the customer to complete this job</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleComplete}>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedJob?.categoryName}</p>
                <p className="text-sm text-muted-foreground">{selectedJob?.address.street}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Customer OTP</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground">Ask the customer for their 6-digit verification code</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Job
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Job
            </DialogTitle>
            <DialogDescription>Are you sure you want to cancel this job?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Job
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
