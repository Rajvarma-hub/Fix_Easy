"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getWorkerMyJobs, completeJob, cancelWorkerJob } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  MapPin, Calendar, Clock, CheckCircle, XCircle,
  Loader2, AlertCircle, User, RefreshCw, Briefcase, IndianRupee
} from "lucide-react"

interface WorkerJob {
  id: number
  service_name: string
  customer_name: string
  description: string
  location: string
  city?: string
  state?: string
  status: string
  accepted_at: string | null
  amount: number
}

export function MyJobsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pendingJobs, setPendingJobs] = useState<WorkerJob[]>([])
  const [completedJobs, setCompletedJobs] = useState<WorkerJob[]>([])
  const [cancelledJobs, setCancelledJobs] = useState<WorkerJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [selectedJob, setSelectedJob] = useState<WorkerJob | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [otp, setOtp] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadJobs = useCallback(async () => {
    if (!user) return
    try {
      const response = await getWorkerMyJobs()
      setPendingJobs(response.pending || [])
      setCompletedJobs(response.completed || [])
      setCancelledJobs(response.cancelled || [])
    } catch (error) {
      console.error("Failed to load jobs:", error)
      toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" })
    }
  }, [user, toast])

  useEffect(() => {
    setIsLoading(true)
    loadJobs().finally(() => setIsLoading(false))
  }, [loadJobs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadJobs()
    setIsRefreshing(false)
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return
    setIsSubmitting(true)
    try {
      await completeJob(selectedJob.id, otp)
      toast({ title: "Job Completed! ", description: "Great work! The job has been marked as complete." })
      await loadJobs()
      setCompleteDialogOpen(false)
      setOtp("")
      setSelectedJob(null)
    } catch (error) {
      toast({ title: "Invalid OTP", description: "Please ask the customer for the correct 6-digit OTP.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedJob) return
    setIsSubmitting(true)
    try {
      await cancelWorkerJob(selectedJob.id)
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  const JobCard = ({ job, showActions = false }: { job: WorkerJob; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{job.service_name || "Service Job"}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {job.accepted_at ? new Date(job.accepted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "--"}
            </CardDescription>
          </div>
          <Badge className={
            job.status === "completed" ? "bg-green-100 text-green-800 border-0" :
            job.status === "cancelled" ? "bg-red-100 text-red-800 border-0" :
            "bg-orange-100 text-orange-800 border-0"
          }>
            {job.status === "assigned" ? "Active" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
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
        {job.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {job.location}{job.city ? `, ${job.city}` : ""}{job.state ? `, ${job.state}` : ""}
            </span>
          </div>
        )}
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold text-emerald-600 flex items-center gap-1">
            <IndianRupee className="h-3.5 w-3.5" />{job.amount > 0 ? job.amount.toFixed(0) : "--"}
          </span>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                onClick={() => { setSelectedJob(job); setCancelDialogOpen(true) }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { setSelectedJob(job); setCompleteDialogOpen(true) }}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />Complete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const EmptyState = ({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground text-center">{sub}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Jobs</h2>
          <p className="text-muted-foreground text-sm">Manage your assigned, completed, and cancelled jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active ({pendingJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Done ({completedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Cancelled ({cancelledJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {pendingJobs.length === 0
            ? <EmptyState icon={Clock} title="No Active Jobs" sub="Your assigned jobs will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{pendingJobs.map(job => <JobCard key={job.id} job={job} showActions />)}</div>
          }
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedJobs.length === 0
            ? <EmptyState icon={CheckCircle} title="No Completed Jobs" sub="Completed jobs will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{completedJobs.map(job => <JobCard key={job.id} job={job} />)}</div>
          }
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelledJobs.length === 0
            ? <EmptyState icon={XCircle} title="No Cancelled Jobs" sub="Cancelled jobs will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{cancelledJobs.map(job => <JobCard key={job.id} job={job} />)}</div>
          }
        </TabsContent>
      </Tabs>

      {/* Complete Job Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
            <DialogDescription>Enter the 6-digit OTP provided by the customer</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleComplete}>
            <div className="space-y-4 py-4">
              {selectedJob && (
                <div className="p-4 bg-muted rounded-xl">
                  <p className="font-medium text-sm">{selectedJob.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.location}{selectedJob.city ? `, ${selectedJob.city}` : ""}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="otp">Customer OTP (6 digits)</Label>
                <Input
                  id="otp"
                  placeholder="_ _ _ _ _ _"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  className="text-center text-3xl tracking-[0.5em] font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Ask the customer for their 6-digit verification code
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCompleteDialogOpen(false); setOtp("") }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || otp.length !== 6} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                  : <><CheckCircle className="mr-2 h-4 w-4" />Complete Job</>
                }
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
            <DialogDescription>
              Are you sure you want to cancel this job? The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Job</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
                : <><XCircle className="mr-2 h-4 w-4" />Cancel Job</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
