"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getPaymentHistory, getUserJobHistory, makePayment } from "@/lib/api"
import type { PaymentHistoryItem, JobHistoryItem } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Calendar, DollarSign, CheckCircle, Loader2 } from "lucide-react"

export function PaymentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [pendingJobs, setPendingJobs] = useState<JobHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobHistoryItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    try {
      const [paymentsData, bookingsData] = await Promise.all([getPaymentHistory(), getUserJobHistory()])
      setPayments(paymentsData)
      // Jobs that are completed but not yet paid
      const paidJobIds = new Set(paymentsData.map((p) => p.job_id))
      const unpaidCompletedJobs = bookingsData.filter((b) => b.status === "completed" && !paidJobIds.has(b.job_id))
      setPendingJobs(unpaidCompletedJobs)
    } catch (error) {
      console.error("Failed to load payments:", error)
      toast({ title: "Error", description: "Failed to load payment data", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedJob) return

    setIsProcessing(true)
    try {
      await makePayment({
        job_id: selectedJob.job_id,
        amount: selectedJob.amount || 0,
        payment_method: paymentMethod,
      })
      toast({ title: "Payment Successful", description: "Your payment has been processed." })
      await loadData()
      setPaymentDialogOpen(false)
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payments</h2>
        <p className="text-muted-foreground">Manage your payments and billing</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobs.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {pendingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>Complete payment for these services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <div key={job.job_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{job.service_category}</p>
                    <p className="text-sm text-muted-foreground">
                      Completed on {new Date(job.requested_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">${job.amount || "TBD"}</span>
                    <Button
                      onClick={() => {
                        setSelectedJob(job)
                        setPaymentDialogOpen(true)
                      }}
                      disabled={!job.amount}
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.transaction_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Payment #{payment.transaction_id.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()} - {payment.payment_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {payment.status}
                    </Badge>
                    <span className="font-semibold">${payment.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Pay for your {selectedJob?.service_category} service</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedJob?.service_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Worker</span>
                <span className="font-medium">{selectedJob?.worker_details.worker_name || "N/A"}</span>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="netbanking">Net Banking</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">${selectedJob?.amount || 0}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay ${selectedJob?.amount || 0}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
