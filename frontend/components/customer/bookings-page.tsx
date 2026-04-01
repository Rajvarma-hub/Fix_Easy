"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { getUserJobHistory, cancelUserJob, submitReview, makePayment } from "@/lib/api"
import type { JobHistoryItem } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar, MapPin, User, Star, Loader2, XCircle, AlertCircle,
  RefreshCw, CreditCard, CheckCircle, UserCheck, Shield, Clock,
  Phone, Copy, Check
} from "lucide-react"

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",     className: "bg-amber-100 text-amber-800 border-amber-200" },
  accepted:    { label: "Accepted",    className: "bg-blue-100 text-blue-800 border-blue-200" },
  assigned:    { label: "Assigned",    className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800 border-purple-200" },
  completed:   { label: "Completed",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-800 border-red-200" },
}

export function BookingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { getJobData, jobAccepted } = useCustomerJobWebSocket()

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
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH" | "UPI">("UPI")
  const [copiedOtp, setCopiedOtp] = useState<number | null>(null)

  const loadBookings = useCallback(async () => {
    if (!user) return
    try {
      const data = await getUserJobHistory()
      setBookings(data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => { loadBookings() }, [loadBookings])
  useEffect(() => { if (jobAccepted) loadBookings() }, [jobAccepted, loadBookings])

  const enhancedBookings = useMemo(() => {
    return bookings.map(booking => {
      const wsData = getJobData(booking.job_id)
      if (!wsData) return booking
      return {
        ...booking,
        otp: wsData.otp || booking.otp,
        worker_details: {
          ...booking.worker_details,
          worker_id: wsData.worker_id ?? booking.worker_details?.worker_id,
          worker_name: wsData.worker_name || booking.worker_details?.worker_name,
          worker_phone: wsData.worker_phone || booking.worker_details?.worker_phone,
        },
      }
    })
  }, [bookings, getJobData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadBookings()
    setIsRefreshing(false)
  }

  const handleCopyOtp = (otp: string, jobId: number) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopiedOtp(jobId)
    toast({ title: "OTP Copied!" })
    setTimeout(() => setCopiedOtp(null), 2000)
  }

  const handleCancel = async () => {
    if (!selectedBooking?.job_id) return
    setIsSubmitting(true)
    try {
      await cancelUserJob(selectedBooking.job_id)
      toast({ title: "Booking Cancelled" })
      await loadBookings()
      setCancelDialogOpen(false)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to cancel", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBooking?.job_id || !selectedBooking.amount) return
    setIsSubmitting(true)
    try {
      await makePayment({ job_id: selectedBooking.job_id, amount: selectedBooking.amount, payment_method: paymentMethod })
      toast({ title: "Payment Successful!" })
      await loadBookings()
      setPaymentDialogOpen(false)
    } catch (error) {
      toast({ title: "Payment Failed", description: error instanceof Error ? error.message : "Try again", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReview = async () => {
    if (!selectedBooking || !user) return
    const workerId = selectedBooking.worker_details?.worker_id
    if (!workerId) {
      toast({ title: "Error", description: "Worker info not available", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await submitReview({ job_id: selectedBooking.job_id, worker_id: workerId, rating, comments: reviewComment })
      toast({ title: "Review Submitted!", description: "Thank you for your feedback!" })
      setReviewDialogOpen(false)
      setRating(5)
      setReviewComment("")
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to submit", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingBookings = enhancedBookings.filter(b => b.status === "pending")
  const assignedBookings = enhancedBookings.filter(b => ["assigned", "accepted", "in_progress"].includes(b.status))
  const completedBookings = enhancedBookings.filter(b => b.status === "completed")
  const cancelledBookings = enhancedBookings.filter(b => b.status === "cancelled")

  const EmptyState = ({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )

  const BookingCard = ({ booking }: { booking: JobHistoryItem }) => {
    const s = STATUS_STYLES[booking.status] || STATUS_STYLES.pending
    const isActive = ["assigned", "accepted", "in_progress"].includes(booking.status)
    const isCompleted = booking.status === "completed"
    const isPending = booking.status === "pending"
    const showOtp = isActive && booking.otp

    return (
      <Card className={`transition-all hover:shadow-md ${isActive ? "border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-transparent" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{booking.service_category}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                <Calendar className="h-3 w-3" />
                {booking.requested_time ? new Date(booking.requested_time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No date"}
              </CardDescription>
            </div>
            <Badge className={`text-xs border flex-shrink-0 ${s.className}`}>{s.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {booking.location_details && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {[booking.location_details.house_no, booking.location_details.city, booking.location_details.state].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {booking.worker_details?.worker_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4 flex-shrink-0" />
              <span>{booking.worker_details.worker_name}</span>
              {booking.worker_details.worker_phone && (
                <span className="flex items-center gap-1 ml-2">
                  <Phone className="h-3 w-3" />{booking.worker_details.worker_phone}
                </span>
              )}
            </div>
          )}

          {booking.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{booking.description}</p>
          )}

          {showOtp && (
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Verification OTP</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {booking.otp!.split("").map((digit, i) => (
                    <div key={i} className="h-10 w-8 bg-white rounded-xl border-2 border-amber-200 flex items-center justify-center font-mono text-lg font-bold text-amber-900">
                      {digit}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl"
                  onClick={() => handleCopyOtp(booking.otp!, booking.job_id)}
                >
                  {copiedOtp === booking.job_id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-2">Share with worker upon arrival</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold text-emerald-600 text-sm">
              {booking.amount ? `Rs. ${booking.amount.toFixed(0)}` : "TBD"}
            </span>
            <div className="flex gap-2">
              {isPending && (
                <Button variant="outline" size="sm"
                  className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={() => { setSelectedBooking(booking); setCancelDialogOpen(true) }}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
              )}
              {isCompleted && booking.amount && booking.amount > 0 && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { setSelectedBooking(booking); setPaymentDialogOpen(true) }}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" />Pay
                </Button>
              )}
              {isCompleted && (
                <Button size="sm" variant="outline"
                  onClick={() => { setSelectedBooking(booking); setReviewDialogOpen(true) }}>
                  <Star className="h-3.5 w-3.5 mr-1" />Review
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
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Bookings</h2>
          <p className="text-muted-foreground text-sm">View and manage your service requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="active" className="text-xs gap-1">
            <UserCheck className="h-3.5 w-3.5" />Active ({assignedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs gap-1">
            <Clock className="h-3.5 w-3.5" />Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs gap-1">
            <CheckCircle className="h-3.5 w-3.5" />Done ({completedBookings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs gap-1">
            <XCircle className="h-3.5 w-3.5" />({cancelledBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {assignedBookings.length === 0
            ? <EmptyState icon={UserCheck} title="No Active Jobs" sub="Assigned jobs with OTP will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{assignedBookings.map((b, i) => <BookingCard key={b.job_id ?? `a-${i}`} booking={b} />)}</div>}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingBookings.length === 0
            ? <EmptyState icon={Clock} title="No Pending Bookings" sub="New bookings waiting for a worker" />
            : <div className="grid gap-4 md:grid-cols-2">{pendingBookings.map((b, i) => <BookingCard key={b.job_id ?? `p-${i}`} booking={b} />)}</div>}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedBookings.length === 0
            ? <EmptyState icon={CheckCircle} title="No Completed Jobs" sub="Finished services will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{completedBookings.map((b, i) => <BookingCard key={b.job_id ?? `c-${i}`} booking={b} />)}</div>}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          {cancelledBookings.length === 0
            ? <EmptyState icon={XCircle} title="No Cancelled Bookings" sub="Cancelled jobs will appear here" />
            : <div className="grid gap-4 md:grid-cols-2">{cancelledBookings.map((b, i) => <BookingCard key={b.job_id ?? `x-${i}`} booking={b} />)}</div>}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your {selectedBooking?.service_category} booking? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</> : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />Complete Payment
            </DialogTitle>
            <DialogDescription>Pay for your {selectedBooking?.service_category} service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-2xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedBooking?.service_category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Worker</span>
                <span className="font-medium">{selectedBooking?.worker_details?.worker_name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-emerald-600">Rs. {selectedBooking?.amount}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                : <><CreditCard className="mr-2 h-4 w-4" />Pay Rs. {selectedBooking?.amount}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>How was your {selectedBooking?.service_category} service?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                    <Star className={`h-9 w-9 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea placeholder="Share your experience..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
