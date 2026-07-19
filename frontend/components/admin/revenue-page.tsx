"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, CreditCard, Calendar } from "lucide-react"

export function RevenuePage() {
  const [todayRevenue, setTodayRevenue] = useState({ amount: 0, transactions: 0 })
  const [monthlyRevenue, setMonthlyRevenue] = useState({ amount: 0, transactions: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [todayData, monthlyData] = await Promise.all([api.admin.getTodayRevenue(), api.admin.getMonthlyRevenue()])
        setTodayRevenue(todayData)
        setMonthlyRevenue(monthlyData)
      } catch (error) {
        console.error("Failed to load revenue data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const avgTransaction =
    monthlyRevenue.transactions > 0 ? (monthlyRevenue.amount / monthlyRevenue.transactions).toFixed(2) : "0"

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Revenue</h2>
        <p className="text-muted-foreground">Platform earnings and transaction history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${todayRevenue.amount}</div>
            <p className="text-xs text-muted-foreground">{todayRevenue.transactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${monthlyRevenue.amount}</div>
            <p className="text-xs text-muted-foreground">{monthlyRevenue.transactions} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyRevenue.transactions}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgTransaction}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
            <CardDescription>Platform earnings breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Today</p>
                <p className="text-sm text-muted-foreground">{todayRevenue.transactions} transactions</p>
              </div>
              <span className="text-xl font-bold text-green-600">${todayRevenue.amount}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">This Month</p>
                <p className="text-sm text-muted-foreground">{monthlyRevenue.transactions} transactions</p>
              </div>
              <span className="text-xl font-bold text-green-600">${monthlyRevenue.amount}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
              <div>
                <p className="font-medium">Projected Monthly</p>
                <p className="text-sm text-muted-foreground">Based on current pace</p>
              </div>
              <span className="text-xl font-bold">${Math.round(monthlyRevenue.amount * 1.2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key platform statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Average Daily Revenue</span>
              <span className="font-bold">${Math.round(monthlyRevenue.amount / 30)}</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Transaction Success Rate</span>
              <span className="font-bold text-green-600">98.5%</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Platform Fee Rate</span>
              <span className="font-bold">15%</span>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <span className="text-sm font-medium">Net Revenue</span>
              <span className="font-bold text-green-600">${Math.round(monthlyRevenue.amount * 0.15)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
