"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { ServiceRequest } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, Star, Briefcase, TrendingUp, ChevronRight, MapPin, RefreshCw } from "lucide-react"
import Link from "next/link"

export function WorkerDashboard() {
  const { user } = useAuth()
  const [todayEarnings, setTodayEarnings] = useState({ amount: 0, jobs: 0 })
  const [monthlyEarnings, setMonthlyEarnings] = useState({ amount: 0, jobs: 0 })
  const [rating, setRating] = useState({ rating: 0, totalReviews: 0 })
  const [completedJobsCount, setCompletedJobsCount] = useState(0)
  const [pendingJobs, setPendingJobs] = useState<ServiceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return

    try {
      const [todayData, monthlyData, ratingData, jobsResponse] = await Promise.all([
        api.worker.getTodaysEarnings(),
        api.worker.getMonthlyEarnings(),
        api.worker.getRating(),
        api.worker.getMyJobs(),
      ])

      setTodayEarnings(todayData)
      setMonthlyEarnings(monthlyData)
      setRating(ratingData)

      const completed = jobsResponse.completed || []
      const pending = jobsResponse.pending || []
      setCompletedJobsCount(completed.length)

      // Transform pending jobs for display
      const transformedPending = pending.map((job: any) => ({
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
      }))
      setPendingJobs(transformedPending)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }, [user])

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true)
      await loadData()
      setIsLoading(false)
    }
    initialLoad()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayEarnings.amount}</div>
            <p className="text-xs text-muted-foreground">{todayEarnings.jobs} jobs completed today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyEarnings.amount}</div>
            <p className="text-xs text-muted-foreground">{monthlyEarnings.jobs} jobs this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {rating.rating.toFixed(1)}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">{rating.totalReviews} reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobsCount}</div>
            <p className="text-xs text-muted-foreground">Jobs completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your work and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/dashboard/jobs">
                <Briefcase className="h-6 w-6" />
                <span>Find Jobs</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/dashboard/status">
                <Star className="h-6 w-6" />
                <span>Toggle Status</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/dashboard/earnings">
                <DollarSign className="h-6 w-6" />
                <span>View Earnings</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/dashboard/my-jobs">
                <Briefcase className="h-6 w-6" />
                <span>My Jobs</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending Jobs</CardTitle>
            <CardDescription>Jobs waiting for your action</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/my-jobs">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pending jobs. Browse available jobs to get started!</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/jobs">Find Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingJobs.slice(0, 5).map((job, index) => (
                <div
                  key={job.id || `pending-job-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{job.categoryName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.address.street}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{job.status.replace("_", " ")}</Badge>
                    <span className="font-medium">${job.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
