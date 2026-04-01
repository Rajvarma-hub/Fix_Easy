"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getPaymentHistory, getUserJobHistory, makePayment } from "@/lib/api"
import type { PaymentHistoryItem, JobHistoryItem } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Calendar, IndianRupee, CheckCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react"

export function PaymentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [pendingJobs, setPendingJobs] = useState<JobHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobHistoryItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH" | "UPI">("UPI")
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [paymentsData, bookingsData] = await Promise.all([
        getPaymentHistory().catch(() => []),
        getUserJobHistory().catch(() => []),
      ])
      setPayments(paymentsData)
      const paidIds = new Set(paymentsData.map(p => p.job_id))
      setPendingJobs(bookingsData.filter(b => b.status === "completed" && !paidIds.has(b.job_id) && b.amount))
    } catch (error) {
      toast({ title: "Error", description: "Failed to load payment data", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const handlePayment = async () => {
    if (!selectedJob) return
    setIsProcessing(true)
    try {
      await makePayment({ job_id: selectedJob.job_id, amount: selectedJob.amount || 0, payment_method: paymentMethod })
      toast({ title: "Payment Successful! " })
      await loadData()
      setPaymentDialogOpen(false)
    } catch (error) {
      toast({ title: "Payment Failed", description: error instanceof Error ? error.message : "Try again", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const totalSpent = payments.reduce((s, p) => s + p.amount, 0)
  const thisMonth = payments.filter(p => {
    const d = new Date(p.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, p) => s + p.amount, 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="text-muted-foreground text-sm">Manage your payments and billing</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Spent", value: `Rs.${totalSpent.toFixed(0)}`, sub: "All time", icon: IndianRupee, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "This Month", value: `Rs.${thisMonth.toFixed(0)}`, sub: "Current month", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Pending", value: pendingJobs.length, sub: "Awaiting payment", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-50" },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pending Payments */}
      {pendingJobs.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">Pending Payments</CardTitle>
            <CardDescription>Pay to complete these services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingJobs.map(job => (
              <div key={job.job_id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div>
                  <p className="font-medium text-sm">{job.service_category}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.worker_details?.worker_name || "Worker"}  {new Date(job.requested_time).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-700">Rs.{job.amount}</span>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    onClick={() => { setSelectedJob(job); setPaymentDialogOpen(true) }}>
                    Pay Now
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>Your completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={p.transaction_id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Payment #{String(p.transaction_id || i).slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}  {p.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">Paid</Badge>
                    <span className="font-semibold text-emerald-600">Rs.{p.amount}</span>
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
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />Complete Payment
            </DialogTitle>
            <DialogDescription>Pay for your {selectedJob?.service_category} service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-2xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedJob?.service_category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Worker</span>
                <span className="font-medium">{selectedJob?.worker_details?.worker_name || "--"}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-emerald-600">Rs.{selectedJob?.amount}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><CreditCard className="mr-2 h-4 w-4" />Pay Rs.{selectedJob?.amount}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
