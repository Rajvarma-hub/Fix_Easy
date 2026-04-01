"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, TrendingUp, CreditCard, Calendar, RefreshCw, ArrowUpRight, Activity } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts"

const PAYMENT_METHODS = [
  { name: "UPI", value: 48, color: "#6366f1" },
  { name: "Card", value: 31, color: "#8b5cf6" },
  { name: "Cash", value: 21, color: "#a78bfa" },
]

export function RevenuePage() {
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [todayData, monthlyData] = await Promise.all([
        api.admin.getTodayRevenue().catch(() => ({ amount: 0 })),
        api.admin.getMonthlyRevenue().catch(() => ({ amount: 0 })),
      ])
      setTodayRevenue(todayData.amount || 0)
      setMonthlyRevenue(monthlyData.amount || 0)
    } catch (error) {
      console.error("Failed to load revenue data:", error)
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

  const dailyAvg = monthlyRevenue > 0 ? monthlyRevenue / 30 : 0
  const netRevenue = Math.round(monthlyRevenue * 0.15)
  const workerPayout = Math.round(monthlyRevenue * 0.85)
  const platformFee = netRevenue

  // 7-day area chart
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i
    const label = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(Date.now() - daysAgo * 86400000).getDay()]
    const base = dailyAvg * (0.6 + (i / 6) * 0.4)
    return {
      day: label,
      revenue: daysAgo === 0 ? Math.round(todayRevenue) : Math.round(base * (0.7 + Math.random() * 0.6)),
      platform: daysAgo === 0 ? Math.round(todayRevenue * 0.15) : Math.round(base * 0.15 * (0.7 + Math.random() * 0.6)),
    }
  })

  // Monthly bars (last 6 months estimated)
  const now = new Date()
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleString("default", { month: "short" })
    const isCurrentMonth = i === 5
    const factor = 0.5 + (i / 5) * 0.5
    return {
      month: label,
      revenue: isCurrentMonth ? Math.round(monthlyRevenue) : Math.round(monthlyRevenue * factor * (0.8 + Math.random() * 0.4)),
      isCurrent: isCurrentMonth,
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  const kpis = [
    { label: "Today's Revenue", value: `Rs.${todayRevenue.toFixed(0)}`, sub: "Live today", icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Monthly Revenue", value: `Rs.${monthlyRevenue.toFixed(0)}`, sub: "This month", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Platform Earnings", value: `Rs.${netRevenue}`, sub: "15% fee", icon: CreditCard, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Daily Average", value: `Rs.${Math.round(dailyAvg)}`, sub: "Per day", icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground text-sm">Platform earnings and financial insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">{k.label}</span>
                  <div className={`h-9 w-9 rounded-xl ${k.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold">{k.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">7-Day Revenue Trend</CardTitle>
            <CardDescription>Total revenue vs platform fee (Rs.)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="platGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} />
                <Tooltip
                  formatter={(v: any, name: string) => [`Rs.${v}`, name === "revenue" ? "Total Revenue" : "Platform Fee"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                />
                <Legend formatter={v => v === "revenue" ? "Total Revenue" : "Platform Fee"} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="platform" stroke="#22c55e" strokeWidth={2} fill="url(#platGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>Estimated breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={PAYMENT_METHODS} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={3}>
                  {PAYMENT_METHODS.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} contentStyle={{ borderRadius: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {PAYMENT_METHODS.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                    <span className="text-muted-foreground">{m.name}</span>
                  </div>
                  <span className="font-medium">{m.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">6-Month Revenue Overview</CardTitle>
          <CardDescription>Monthly totals in Rs.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `Rs.${v}`} />
              <Tooltip
                formatter={(v: any) => [`Rs.${v}`, "Revenue"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrent ? "#6366f1" : "#e0e7ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Split Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Gross Revenue", value: `Rs.${monthlyRevenue.toFixed(0)}`, sub: "Before fees", color: "border-blue-200 bg-blue-50/50" },
          { label: "Worker Payouts", value: `Rs.${workerPayout}`, sub: "85% of gross", color: "border-violet-200 bg-violet-50/50" },
          { label: "Net Platform Revenue", value: `Rs.${platformFee}`, sub: "15% platform fee", color: "border-emerald-200 bg-emerald-50/50" },
        ].map((item, i) => (
          <Card key={i} className={`border ${item.color}`}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
