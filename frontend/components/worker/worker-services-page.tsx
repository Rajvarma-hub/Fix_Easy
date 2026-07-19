"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api, getServiceCategories, addWorkerCapability, removeWorkerCapability } from "@/lib/api"
import type { ServiceCategory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Wrench, Plus, Check, Loader2, RefreshCw, X } from "lucide-react"

interface LocalCapability {
  id: string
  name: string
}

export function WorkerServicesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [myCapabilities, setMyCapabilities] = useState<LocalCapability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [categoriesData, capabilitiesData] = await Promise.all([
        getServiceCategories(),
        api.worker.getCapabilities(),
      ])
      setCategories(categoriesData)
      setMyCapabilities(
        capabilitiesData.map((id) => {
          const category = categoriesData.find((c) => c.service_id.toString() === id)
          return {
            id: id,
            name: category?.name || "Unknown Service",
          }
        }),
      )
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({ title: "Error", description: "Failed to load services", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  const handleAddCapability = async (serviceId: number, serviceName: string) => {
    if (!user) return
    setAddingId(serviceId)
    try {
      await addWorkerCapability([serviceId])
      setMyCapabilities((prev) => [...prev, { id: serviceId.toString(), name: serviceName }])
      toast({ title: "Service Added", description: `You can now receive jobs for ${serviceName}.` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to add service", variant: "destructive" })
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveCapability = async (serviceId: number, serviceName: string) => {
    if (!user) return
    setRemovingId(serviceId)
    try {
      await removeWorkerCapability([serviceId])
      setMyCapabilities((prev) => prev.filter((c) => c.id !== serviceId.toString() && c.name !== serviceName))
      toast({ title: "Service Removed", description: `You will no longer receive jobs for ${serviceName}.` })
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove service", variant: "destructive" })
    } finally {
      setRemovingId(null)
    }
  }

  const isServiceAdded = (serviceId: number) => {
    return myCapabilities.some(
      (c) => c.id === serviceId.toString() || c.name === categories.find((cat) => cat.service_id === serviceId)?.name,
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Services</h2>
          <p className="text-muted-foreground">Manage the services you offer</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Current Services */}
      <Card>
        <CardHeader>
          <CardTitle>Active Services</CardTitle>
          <CardDescription>Services you're currently offering</CardDescription>
        </CardHeader>
        <CardContent>
          {myCapabilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You haven't added any services yet</p>
              <p className="text-sm">Add services below to start receiving jobs</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myCapabilities.map((cap, index) => (
                <Badge key={`cap-${cap.id}-${index}`} variant="secondary" className="text-sm py-1.5 px-3">
                  <Check className="mr-1 h-3 w-3" />
                  {cap.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Services */}
      <Card>
        <CardHeader>
          <CardTitle>Available Services</CardTitle>
          <CardDescription>Add more services to expand your offerings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const isAdded = isServiceAdded(category.service_id)
              return (
                <div key={`category-${category.service_id}`} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">Base: ${category.base_price}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                  <Button
                    className="w-full"
                    variant={isAdded ? "outline" : "default"}
                    disabled={addingId === category.service_id || removingId === category.service_id}
                    onClick={() =>
                      isAdded
                        ? handleRemoveCapability(category.service_id, category.name)
                        : handleAddCapability(category.service_id, category.name)
                    }
                  >
                    {addingId === category.service_id || removingId === category.service_id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {addingId === category.service_id ? "Adding..." : "Removing..."}
                      </>
                    ) : isAdded ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Remove Service
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
