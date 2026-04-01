"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getAdminServiceCategories, addWorkerCapability } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Wrench, Plus, Check, Loader2, RefreshCw, IndianRupee } from "lucide-react"

interface ServiceCategory {
  id: number
  name: string
  base_price: number
  description: string
}

export function WorkerServicesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  // Store added category IDs (from admin profile or optimistic state)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const cats = await getAdminServiceCategories()
      setCategories(cats)
    } catch (error) {
      console.error("Failed to load services:", error)
      toast({ title: "Error", description: "Failed to load services", variant: "destructive" })
    }
  }, [user, toast])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
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
      setAddedIds(prev => new Set(prev).add(serviceId))
      toast({ title: "Service Added ", description: `You can now receive ${serviceName} jobs.` })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add service.",
        variant: "destructive",
      })
    } finally {
      setAddingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Services</h2>
          <p className="text-muted-foreground text-sm">Choose which services you offer to get matched with jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Added services summary */}
      {addedIds.size > 0 && (
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300">
               Your Active Services ({addedIds.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(addedIds).map(id => {
                const cat = categories.find(c => c.id === id)
                return cat ? (
                  <Badge key={id} className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    <Check className="mr-1 h-3 w-3" />{cat.name}
                  </Badge>
                ) : null
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All available service categories */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Wrench className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-semibold mb-1">No Services Available</h3>
            <p className="text-sm text-muted-foreground">Ask your admin to add service categories</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isAdded = addedIds.has(category.id)
            return (
              <Card key={category.id} className={`transition-all hover:shadow-md ${isAdded ? "border-emerald-200" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    {isAdded && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                        <Check className="h-3 w-3 mr-1" />Added
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{category.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    Base price: Rs.{category.base_price}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{category.description}</p>
                  <Button
                    className="w-full"
                    variant={isAdded ? "outline" : "default"}
                    disabled={isAdded || addingId === category.id}
                    onClick={() => handleAddCapability(category.id, category.name)}
                  >
                    {addingId === category.id ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                    ) : isAdded ? (
                      <><Check className="mr-2 h-4 w-4" />Service Added</>
                    ) : (
                      <><Plus className="mr-2 h-4 w-4" />Add Service</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
