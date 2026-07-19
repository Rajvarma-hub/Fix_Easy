"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { getUserJobHistory, cancelUserJob, submitReview, makePayment, getErrorMessage } from "@/lib/api"
import type { JobHistoryItem } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  MapPin,
  User,
  Star,
  Loader2,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  CheckCircle,
  UserCheck,
  Key,
  Clock,
  Phone,
  DollarSign,
} from "lucide-react"

export function BookingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { storedJobData, getJobData, jobAccepted } = useCustomerJobWebSocket()

  const [bookings, setBookings] = useState<JobHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<JobHistoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH" | "UPI">("CARD")

  const loadBookings = useCallback(async () => {
    if (!user) return
    try {
      const data = await getUserJobHistory()

      setBookings(data)
    } catch (error) {
      console.error("Failed to load bookings:", error)
      toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Auto-refresh when a job is accepted via WebSocket
  useEffect(() => {
    if (jobAccepted) {
      loadBookings()
    }
  }, [jobAccepted, loadBookings])

  // Enhance bookings with stored WebSocket data (OTP, worker details)
  const enhancedBookings = useMemo(() => {
    return bookings.map((booking) => {
      const wsData = getJobData(booking.job_id)
      if (wsData) {
        // Merge WebSocket data into booking
        return {
          ...booking,
          otp: wsData.otp || booking.otp,
          worker_details: {
            ...booking.worker_details,
            worker_id: wsData.worker_id || booking.worker_details?.worker_id,
            worker_name: wsData.worker_name || booking.worker_details?.worker_name,
            worker_phone: wsData.worker_phone || booking.worker_details?.worker_phone,
          },
        }
      }
      return booking
    })
  }, [bookings, getJobData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadBookings()
    setIsRefreshing(false)
    toast({ title: "Refreshed", description: "Bookings list updated" })
  }

  const pendingBookings = enhancedBookings.filter((b) => b.status === "pending")
  const assignedBookings = enhancedBookings.filter(
    (b) => b.status === "assigned" || b.status === "accepted" || b.status === "in_progress",
  )
  const completedBookings = enhancedBookings.filter((b) => b.status === "completed")
  const cancelledBookings = enhancedBookings.filter((b) => b.status === "cancelled")

  // Status badge color mapping - moved outside component for better performance
  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    assigned: "bg-indigo-100 text-indigo-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  } as const

  const handleCancel = async () => {
    if (!selectedBooking) {
      toast({ title: "Error", description: "No booking selected", variant: "destructive" })
      return
    }

    const jobId = selectedBooking.job_id


    if (!jobId) {
      toast({ title: "Error", description: "Invalid job ID - job_id is missing", variant: "destructive" })
      return
    }

    const numericJobId = typeof jobId === "string" ? Number.parseInt(jobId, 10) : jobId
    if (isNaN(numericJobId) || numericJobId <= 0) {
      toast({ title: "Error", description: "Invalid job ID format", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {

      await cancelUserJob(numericJobId)
      toast({ title: "Booking Cancelled", description: "Your booking has been cancelled successfully." })
      await loadBookings()
      setCancelDialogOpen(false)
      setSelectedBooking(null)
    } catch (error) {
      console.error("Cancel failed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel booking.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBooking) {
      toast({ title: "Error", description: "No booking selected", variant: "destructive" })
      return
    }

    const jobId = selectedBooking.job_id
    const amount = selectedBooking.amount



    if (!jobId) {
      toast({ title: "Error", description: "Invalid job ID", variant: "destructive" })
      return
    }

    const numericJobId = typeof jobId === "string" ? Number.parseInt(jobId, 10) : jobId
    if (isNaN(numericJobId) || numericJobId <= 0) {
      toast({ title: "Error", description: "Invalid job ID format", variant: "destructive" })
      return
    }

    if (!amount || amount <= 0) {
      toast({ title: "Error", description: "Invalid payment amount", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await makePayment({
        job_id: numericJobId,
        amount: amount,
        payment_method: paymentMethod,
      })

      toast({ title: "Payment Successful", description: "Your payment has been processed." })
      await loadBookings()
      setPaymentDialogOpen(false)
      setSelectedBooking(null)
    } catch (error) {
      console.error("Payment failed:", error)
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReview = async () => {
    if (!selectedBooking || !user) return

    const workerId = selectedBooking.worker_details?.worker_id
    if (!workerId) {
      toast({
        title: "Error",
        description: "Worker information not available for this booking.",
        variant: "destructive",
      })
      return
    }

    if (!selectedBooking.job_id) {
      toast({
        title: "Error",
        description: "Job information not available for this booking.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await submitReview({
        job_id:
          typeof selectedBooking.job_id === "string"
            ? Number.parseInt(selectedBooking.job_id, 10)
            : selectedBooking.job_id,
        worker_id: workerId,
        rating,
        comments: reviewComment,
      })
      toast({ title: "Review Submitted", description: "Thank you for your feedback!" })
      await loadBookings()
      setReviewDialogOpen(false)
      setRating(5)
      setReviewComment("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit review.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const BookingCard = ({ booking, index }: { booking: JobHistoryItem; index: number }) => {
    const isAssigned = booking.status === "assigned" || booking.status === "accepted"
    const isInProgress = booking.status === "in_progress"
    const isCompleted = booking.status === "completed"
    const isPending = booking.status === "pending"
    const showOtp = (isAssigned || isInProgress) && booking.otp
    const showPayment = isCompleted && 
                       booking.amount && 
                       booking.amount > 0 && 
                       booking.payment_status?.toString().toLowerCase() !== "paid"
    
    const isPaid = booking.payment_status?.toString().toLowerCase() === "paid"
    const isRated = booking.is_rated === true

    return (
      <Card className={isAssigned || isInProgress ? "border-indigo-300 bg-indigo-50/30" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{booking.service_category}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {new Date(booking.requested_time).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge className={STATUS_COLORS[booking.status] || "bg-gray-100 text-gray-800"}>
              {booking.status.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {booking.location_details?.house_no}, {booking.location_details?.city}
            </span>
          </div>

          {booking.worker_details?.worker_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{booking.worker_details.worker_name}</span>
              {booking.worker_details.worker_phone && (
                <>
                  <Phone className="h-3 w-3 ml-2" />
                  <span>{booking.worker_details.worker_phone}</span>
                </>
              )}
            </div>
          )}

          <p className="text-sm">{booking.description}</p>

          {showOtp && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Verification OTP</span>
              </div>
              <p className="text-3xl font-mono font-bold text-amber-900 tracking-[0.3em] text-center">{booking.otp}</p>
              <p className="text-xs text-amber-600 mt-2 text-center">
                Share this OTP with the worker to complete the job
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold text-lg">${booking.amount || "TBD"}</span>
            <div className="flex gap-2">
              {isPending && booking.job_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedBooking(booking)
                    setCancelDialogOpen(true)
                  }}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              )}

              {showPayment && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedBooking(booking)
                    setPaymentDialogOpen(true)
                  }}
                >
                  <CreditCard className="mr-1 h-4 w-4" />
                  Pay ${booking.amount}
                </Button>
              )}

              {isPaid && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-3 py-1">
                  <CheckCircle className="h-3 w-3" />
                  Paid
                </Badge>
              )}

              {/* Review button for completed jobs */}
              {isCompleted && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRated}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedBooking(booking)
                    setReviewDialogOpen(true)
                  }}
                >
                  <Star className={`mr-1 h-4 w-4 ${isRated ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  {isRated ? "Rated" : "Review"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
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
          <h2 className="text-2xl font-bold">My Bookings</h2>
          <p className="text-muted-foreground">View and manage your service requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending" className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex items-center gap-1 text-xs">
            <UserCheck className="h-3 w-3" />
            Assigned ({assignedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 text-xs">
            <CheckCircle className="h-3 w-3" />
            Completed ({completedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1 text-xs">
            <XCircle className="h-3 w-3" />
            Cancelled ({cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Bookings</h3>
                <p className="text-muted-foreground">Waiting for a worker to accept your request</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingBookings.map((booking, index) => (
                <BookingCard key={booking.job_id || `pending-${index}`} booking={booking} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          {assignedBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assigned Jobs</h3>
                <p className="text-muted-foreground">Jobs assigned to workers will appear here with OTP</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {assignedBookings.map((booking, index) => (
                <BookingCard key={booking.job_id || `assigned-${index}`} booking={booking} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Bookings</h3>
                <p className="text-muted-foreground">Your completed services will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedBookings.map((booking, index) => (
                <BookingCard key={booking.job_id || `completed-${index}`} booking={booking} index={index} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelledBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Cancelled Bookings</h3>
                <p className="text-muted-foreground">Your cancelled services will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cancelledBookings.map((booking, index) => (
                <BookingCard key={booking.job_id || `cancelled-${index}`} booking={booking} index={index} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this {selectedBooking?.service_category} booking? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>Pay for your {selectedBooking?.service_category} service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedBooking?.service_category}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Worker</span>
                <span className="font-medium">{selectedBooking?.worker_details?.worker_name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t">
                <span className="font-medium">Total Amount</span>
                <span className="text-xl font-bold text-green-600">${selectedBooking?.amount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "CARD" | "CASH" | "UPI")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${selectedBooking?.amount}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              How was your {selectedBooking?.service_category} service with{" "}
              {selectedBooking?.worker_details?.worker_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-8 w-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
