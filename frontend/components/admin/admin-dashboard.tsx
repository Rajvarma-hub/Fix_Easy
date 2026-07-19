"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { AdminWorker } from "@/lib/api"
import type { ServiceCategory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, FolderOpen, TrendingUp, ChevronRight, Wrench } from "lucide-react"
import Link from "next/link"

export function AdminDashboard() {
  const [todayRevenue, setTodayRevenue] = useState({ amount: 0, transactions: 0 })
  const [monthlyRevenue, setMonthlyRevenue] = useState({ amount: 0, transactions: 0 })
  const [workers, setWorkers] = useState<AdminWorker[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [todayData, monthlyData, workersData, categoriesData] = await Promise.all([
          api.admin.getTodayRevenue(),
          api.admin.getMonthlyRevenue(),
          api.admin.getWorkers(),
          api.admin.getCategories(),
        ])
        setTodayRevenue(todayData)
        setMonthlyRevenue(monthlyData)
        setWorkers(workersData)
        setCategories(categoriesData)
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const onlineWorkers = workers.filter((w) => w.is_active).length

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
            <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers.length}</div>
            <p className="text-xs text-muted-foreground">{onlineWorkers} currently online</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Service Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/categories">
                <FolderOpen className="h-6 w-6" />
                <span>Manage Categories</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/admin/workers">
                <Users className="h-6 w-6" />
                <span>View Workers</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/admin/revenue">
                <DollarSign className="h-6 w-6" />
                <span>Revenue Report</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Workers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workers</CardTitle>
            <CardDescription>Platform service providers</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/workers">
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workers.slice(0, 5).map((worker, index) => (
              <div
                key={worker.id || `worker-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{worker.name}</p>
                    <p className="text-sm text-muted-foreground">{worker.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={worker.is_active ? "default" : "secondary"}>
                    {worker.is_active ? "Online" : "Offline"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{worker.capabilities?.length || 0} services</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Service Categories</CardTitle>
            <CardDescription>Available service types</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/categories">
              Manage
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <div key={category.service_id || `category-${index}`} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">Base: ${category.base_price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
