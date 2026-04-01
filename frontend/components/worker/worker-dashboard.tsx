"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import {
  getWorkerMyJobs, getWorkerTodayEarnings, getWorkerMonthlyEarnings,
  getWorkerRating, getWorkerJobStats
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IndianRupee, Star, Briefcase, TrendingUp, ChevronRight,
  MapPin, RefreshCw, Wifi, WifiOff, Zap, User
} from "lucide-react"
import Link from "next/link"

export function WorkerDashboard() {
  const { user } = useAuth()
  const { isConnected } = useWorkerWebSocket()
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)
  const [rating, setRating] = useState(0)
  const [jobStats, setJobStats] = useState({ daily_jobs: 0, total_jobs: 0, cancelled_jobs: 0 })
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [todayData, monthlyData, ratingData, statsData, jobsData] = await Promise.all([
        getWorkerTodayEarnings().catch(() => ({ amount: 0 })),
        getWorkerMonthlyEarnings().catch(() => ({ amount: 0 })),
        getWorkerRating().catch(() => ({ Average_rating: 0 })),
        getWorkerJobStats().catch(() => ({ daily_jobs: 0, total_jobs: 0, cancelled_jobs: 0 })),
        getWorkerMyJobs().catch(() => ({ pending: [], completed: [], cancelled: [] })),
      ])
      setTodayEarnings(todayData.amount || 0)
      setMonthlyEarnings(monthlyData.amount || 0)
      setRating(ratingData.Average_rating || 0)
      setJobStats(statsData)
      setActiveJobs(jobsData.pending || [])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
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
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const stats = [
    {
      label: "Today's Earnings",
      value: `Rs.${todayEarnings.toFixed(0)}`,
      sub: `${jobStats.daily_jobs} jobs today`,
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Monthly Earnings",
      value: `Rs.${monthlyEarnings.toFixed(0)}`,
      sub: "This month",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Your Rating",
      value: rating > 0 ? rating.toFixed(1) : "--",
      sub: rating > 0 ? "Average score" : "No ratings yet",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Total Jobs",
      value: jobStats.total_jobs,
      sub: `${jobStats.cancelled_jobs} cancelled`,
      icon: Briefcase,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]} 
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening today</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={isConnected
              ? "text-emerald-600 border-emerald-300 bg-emerald-50"
              : "text-red-500 border-red-300 bg-red-50"
            }
          >
            {isConnected
              ? <><Wifi className="h-3 w-3 mr-1.5" />Live</>
              : <><WifiOff className="h-3 w-3 mr-1.5" />Offline</>
            }
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
                <div className="text-2xl font-bold tracking-tight">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { href: "/dashboard/jobs", icon: Zap, label: "Find Jobs", primary: true },
              { href: "/dashboard/status", icon: isConnected ? Wifi : WifiOff, label: "My Status", primary: false },
              { href: "/dashboard/earnings", icon: IndianRupee, label: "Earnings", primary: false },
              { href: "/dashboard/my-jobs", icon: Briefcase, label: "My Jobs", primary: false },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                    action.primary
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/60 hover:bg-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Active Jobs</CardTitle>
          <Link href="/dashboard/my-jobs">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              View all <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">No active jobs</p>
              <p className="text-xs mt-1 text-muted-foreground">Go online and browse available jobs</p>
              <Link href="/dashboard/jobs">
                <Button size="sm" className="mt-4">Find Jobs</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.slice(0, 4).map((job: any, i: number) => (
                <div key={job.id || i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{job.service_name || "Service Job"}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {job.customer_name && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />{job.customer_name}
                        </span>
                      )}
                      {job.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">Assigned</Badge>
                    {job.amount > 0 && (
                      <span className="text-sm font-semibold text-emerald-600">Rs.{job.amount}</span>
                    )}
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
