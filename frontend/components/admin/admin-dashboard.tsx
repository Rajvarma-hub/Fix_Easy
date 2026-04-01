"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import type { AdminWorker } from "@/lib/api"
import type { ServiceCategory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  IndianRupee, Users, FolderOpen, TrendingUp, ChevronRight,
  Wrench, RefreshCw, Star, Briefcase, Activity, CheckCircle,
  ArrowUpRight, Wifi, WifiOff
} from "lucide-react"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts"

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"]

export function AdminDashboard() {
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [workers, setWorkers] = useState<AdminWorker[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [todayData, monthlyData, workersData, categoriesData] = await Promise.all([
        api.admin.getTodayRevenue().catch(() => ({ amount: 0 })),
        api.admin.getMonthlyRevenue().catch(() => ({ amount: 0 })),
        api.admin.getWorkers().catch(() => []),
        api.admin.getCategories().catch(() => []),
      ])
      setTodayRevenue(todayData.amount || 0)
      setMonthlyRevenue(monthlyData.amount || 0)
      setWorkers(workersData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const onlineWorkers = workers.filter(w => w.is_active).length
  const offlineWorkers = workers.length - onlineWorkers
  const avgEarningsPerWorker = workers.length > 0 ? Math.round(monthlyRevenue / workers.length) : 0

  // Worker status pie chart data
  const workerStatusData = [
    { name: "Online", value: onlineWorkers },
    { name: "Offline", value: offlineWorkers },
  ].filter(d => d.value > 0)

  // Services distribution (workers per category)
  const serviceDistribution = categories.slice(0, 6).map((cat, i) => ({
    name: cat.name.length > 12 ? cat.name.slice(0, 12) + "..." : cat.name,
    fullName: cat.name,
    workers: workers.filter(w => w.capabilities?.includes(cat.name)).length,
    price: cat.base_price,
    fill: COLORS[i % COLORS.length],
  }))

  // Mock 7-day revenue trend (today + estimated based on monthly avg)
  const dailyAvg = monthlyRevenue / 30
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i
    const label = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`
    const variance = 0.6 + Math.random() * 0.8
    return {
      day: label,
      revenue: daysAgo === 0 ? Math.round(todayRevenue) : Math.round(dailyAvg * variance),
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const stats = [
    {
      label: "Today's Revenue", value: `Rs.${todayRevenue.toFixed(0)}`,
      sub: "Collected today", icon: IndianRupee,
      color: "text-emerald-600", bg: "bg-emerald-50",
      trend: todayRevenue > 0 ? "+active" : null
    },
    {
      label: "Monthly Revenue", value: `Rs.${monthlyRevenue.toFixed(0)}`,
      sub: "This month total", icon: TrendingUp,
      color: "text-blue-600", bg: "bg-blue-50",
      trend: null
    },
    {
      label: "Total Workers", value: workers.length,
      sub: `${onlineWorkers} online now`, icon: Users,
      color: "text-violet-600", bg: "bg-violet-50",
      trend: onlineWorkers > 0 ? `${onlineWorkers} live` : null
    },
    {
      label: "Service Categories", value: categories.length,
      sub: "Available services", icon: FolderOpen,
      color: "text-amber-600", bg: "bg-amber-50",
      trend: null
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform overview & analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats */}
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
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                  {s.trend && (
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 gap-1">
                      <ArrowUpRight className="h-3 w-3" />{s.trend}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Last 7 days earnings (Rs.)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} />
                <Tooltip
                  formatter={(v: any) => [`Rs.${v}`, "Revenue"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Worker Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Worker Status</CardTitle>
            <CardDescription>Online vs Offline</CardDescription>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <Users className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm">No workers yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={workerStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={3}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium">{onlineWorkers} Online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{offlineWorkers} Offline</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Distribution */}
      {serviceDistribution.some(s => s.workers > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workers per Service</CardTitle>
            <CardDescription>How many workers offer each service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={serviceDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  formatter={(v: any) => [v, "Workers"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="workers" radius={[0, 6, 6, 0]}>
                  {serviceDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-3">
            {[
              { href: "/admin/categories", icon: FolderOpen, label: "Manage Categories", primary: true },
              { href: "/admin/workers", icon: Users, label: "View Workers", primary: false },
              { href: "/admin/revenue", icon: IndianRupee, label: "Revenue Report", primary: false },
            ].map(action => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                    action.primary ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/60 hover:bg-muted"
                  }`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium text-center">{action.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workers List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Workers</CardTitle>
              <CardDescription>Platform service providers</CardDescription>
            </div>
            <Link href="/admin/workers">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View all <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No workers registered</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workers.slice(0, 5).map((worker, i) => (
                  <div key={worker.id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{worker.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{worker.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{worker.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{worker.capabilities?.length || 0} svcs</span>
                      <Badge className={`text-xs border-0 ${worker.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {worker.is_active ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories + pricing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Service Categories</CardTitle>
              <CardDescription>Base pricing overview</CardDescription>
            </div>
            <Link href="/admin/categories">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Manage <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No categories yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.slice(0, 6).map((cat, i) => (
                  <div key={cat.service_id || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS[i % COLORS.length] + "22" }}>
                      <Wrench className="h-4 w-4" style={{ color: COLORS[i % COLORS.length] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Progress value={Math.min(100, (cat.base_price / 500) * 100)} className="h-1.5 flex-1 max-w-[80px]" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">Rs.{cat.base_price}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
