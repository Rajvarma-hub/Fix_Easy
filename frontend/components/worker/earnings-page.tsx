"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getWorkerTodayEarnings, getWorkerMonthlyEarnings, getWorkerMyJobs } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { IndianRupee, TrendingUp, Calendar, Briefcase, RefreshCw, CheckCircle } from "lucide-react"

interface CompletedJob {
  id: number
  service_name: string
  location: string
  city?: string
  accepted_at: string | null
  amount: number
}

export function EarningsPage() {
  const { user } = useAuth()

  const [todayEarnings, setTodayEarnings] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [todayData, monthlyData, jobsData] = await Promise.all([
        getWorkerTodayEarnings().catch(() => ({ amount: 0 })),
        getWorkerMonthlyEarnings().catch(() => ({ amount: 0 })),
        getWorkerMyJobs().catch(() => ({ pending: [], completed: [], cancelled: [] })),
      ])
      setTodayEarnings(todayData.amount || 0)
      setMonthlyEarnings(monthlyData.amount || 0)
      setCompletedJobs((jobsData.completed || []).slice(0, 15))
    } catch (error) {
      console.error("Failed to load earnings:", error)
    }
  }, [user])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
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
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const totalFromJobs = completedJobs.reduce((sum, j) => sum + (j.amount || 0), 0)
  const avgPerJob = completedJobs.length > 0 ? (totalFromJobs / completedJobs.length) : 0

  const stats = [
    {
      label: "Today's Earnings",
      value: `Rs.${todayEarnings.toFixed(0)}`,
      sub: "Jobs completed today",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "This Month",
      value: `Rs.${monthlyEarnings.toFixed(0)}`,
      sub: "Monthly total",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Completed Jobs",
      value: completedJobs.length,
      sub: "In recent history",
      icon: Briefcase,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
    {
      label: "Avg. Per Job",
      value: `Rs.${avgPerJob.toFixed(0)}`,
      sub: "Recent average",
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings</h2>
          <p className="text-muted-foreground text-sm">Track your income and job performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                  <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Completed Jobs</CardTitle>
          <CardDescription>Your last {completedJobs.length} completed jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {completedJobs.length === 0 ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <IndianRupee className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No earnings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete jobs to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedJobs.map((job, index) => (
                <div
                  key={job.id || index}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{job.service_name || "Service Job"}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.accepted_at
                        ? new Date(job.accepted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "--"
                      }
                      {job.city ? `  ${job.city}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 text-sm flex-shrink-0">
                    +Rs.{job.amount > 0 ? job.amount.toFixed(0) : "--"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
