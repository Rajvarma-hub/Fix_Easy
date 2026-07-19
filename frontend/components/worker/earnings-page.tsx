"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { ServiceRequest } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, Calendar, Briefcase, RefreshCw } from "lucide-react"

export function EarningsPage() {
  const { user } = useAuth()

  const [todayEarnings, setTodayEarnings] = useState({ amount: 0, jobs: 0 })
  const [monthlyEarnings, setMonthlyEarnings] = useState({ amount: 0, jobs: 0 })
  const [recentJobs, setRecentJobs] = useState<ServiceRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [today, monthly, jobsResponse] = await Promise.all([
        api.worker.getTodaysEarnings(),
        api.worker.getMonthlyEarnings(),
        api.worker.getMyJobs(),
      ])
      setTodayEarnings(today)
      setMonthlyEarnings(monthly)

      const completed = jobsResponse.completed || []
      const transformedJobs = completed.slice(0, 10).map((job: any) => ({
        id: job.job_id?.toString() || "",
        customerId: "",
        categoryId: "",
        categoryName: job.service_category || "Unknown Service",
        addressId: "",
        address: { street: "", city: "", state: "", zipCode: "" },
        description: "",
        status: "completed" as const,
        price: job.amount || 0,
        createdAt: job.requested_time || new Date().toISOString(),
        completedAt: job.completed_time,
      }))
      setRecentJobs(transformedJobs)
    } catch (error) {
      console.error("Failed to load earnings:", error)
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
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const avgPerJob =
    recentJobs.length > 0 ? (recentJobs.reduce((sum, job) => sum + job.price, 0) / recentJobs.length).toFixed(2) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings</h2>
          <p className="text-muted-foreground">Track your income and performance</p>
        </div>
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
            <div className="text-2xl font-bold text-green-600">${todayEarnings.amount}</div>
            <p className="text-xs text-muted-foreground">{todayEarnings.jobs} jobs completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${monthlyEarnings.amount}</div>
            <p className="text-xs text-muted-foreground">{monthlyEarnings.jobs} jobs completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentJobs.length}</div>
            <p className="text-xs text-muted-foreground">Recent completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Per Job</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPerJob}</div>
            <p className="text-xs text-muted-foreground">Recent average</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Your completed jobs and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No earnings yet. Complete jobs to start earning!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job, index) => (
                <div
                  key={job.id || `earning-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{job.categoryName}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.completedAt
                          ? new Date(job.completedAt).toLocaleDateString()
                          : new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">+${job.price}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
