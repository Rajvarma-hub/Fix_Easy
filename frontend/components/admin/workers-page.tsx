"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import type { AdminWorker, WorkerDetails } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Users, Search, Eye, Trash2, MapPin, Star, Briefcase,
  Mail, Phone, Loader2, RefreshCw, Wifi, WifiOff, IndianRupee, CheckCircle, XCircle
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

export function WorkersPage() {
  const { toast } = useToast()

  const [workers, setWorkers] = useState<AdminWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedWorker, setSelectedWorker] = useState<AdminWorker | null>(null)
  const [workerDetails, setWorkerDetails] = useState<WorkerDetails | null>(null)
  const [workerLocation, setWorkerLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const loadWorkers = useCallback(async () => {
    try {
      const data = await api.admin.getWorkers()
      setWorkers(data)
    } catch (error) {
      console.error("Failed to load workers:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadWorkers() }, [loadWorkers])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadWorkers()
    setIsRefreshing(false)
  }

  const handleViewDetails = async (worker: AdminWorker) => {
    setSelectedWorker(worker)
    setDetailsDialogOpen(true)
    setIsLoadingDetails(true)
    setWorkerDetails(null)
    setWorkerLocation(null)
    try {
      const [details, location] = await Promise.all([
        api.admin.getWorkerDetails(worker.id),
        api.admin.getWorkerLocation(worker.id).catch(() => null),
      ])
      setWorkerDetails(details)
      if (location) setWorkerLocation(location)
    } catch (error) {
      console.error("Failed to load worker details:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorker) return
    setIsDeleting(true)
    try {
      await api.admin.deleteWorker(selectedWorker.id)
      toast({ title: "Worker Removed", description: `${selectedWorker.name} has been removed from the platform.` })
      await loadWorkers()
      setDeleteDialogOpen(false)
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete worker.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onlineCount = workers.filter(w => w.is_active).length
  const offlineCount = workers.length - onlineCount

  // Service distribution for chart
  const serviceMap: Record<string, number> = {}
  workers.forEach(w => (w.capabilities || []).forEach(cap => {
    serviceMap[cap] = (serviceMap[cap] || 0) + 1
  }))
  const serviceChartData = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count], i) => ({ name: name.length > 14 ? name.slice(0, 14) + "..." : name, count, fill: ["#6366f1","#8b5cf6","#a78bfa","#22c55e","#f59e0b","#ef4444"][i] }))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workers</h2>
          <p className="text-muted-foreground text-sm">Manage platform service providers</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Workers", value: workers.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", sub: "Registered" },
          { label: "Online Now", value: onlineCount, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50", sub: "Active & available" },
          { label: "Offline", value: offlineCount, icon: WifiOff, color: "text-muted-foreground", bg: "bg-muted", sub: "Not available" },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Service distribution chart */}
      {serviceChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workers by Service Capability</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={serviceChartData} margin={{ top: 0, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} formatter={(v: any) => [v, "Workers"]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {serviceChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl h-10"
        />
      </div>

      {/* Workers list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 opacity-40" />
            </div>
            <h3 className="font-semibold mb-1">{searchQuery ? "No Workers Found" : "No Workers Yet"}</h3>
            <p className="text-sm text-muted-foreground">{searchQuery ? `No match for "${searchQuery}"` : "Workers will appear here once they sign up"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((worker, i) => (
            <Card key={worker.id || i} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-primary">{worker.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{worker.name}</p>
                    <Badge className={`text-xs border-0 ${worker.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {worker.is_active ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{worker.email}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />{worker.capabilities?.length || 0} services
                    </span>
                    {worker.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{worker.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleViewDetails(worker)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                    onClick={() => { setSelectedWorker(worker); setDeleteDialogOpen(true) }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Worker Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Worker Profile</DialogTitle>
            <DialogDescription>Detailed stats and information</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">{selectedWorker.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{workerDetails?.personal_details?.name || selectedWorker.name}</p>
                  <Badge className={`text-xs border-0 mt-1 ${selectedWorker.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {selectedWorker.is_active ? " Online" : " Offline"}
                  </Badge>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{workerDetails?.personal_details?.email || selectedWorker.email}</span>
                </div>
                {(workerDetails?.personal_details?.phone || selectedWorker.phone) && (
                  <div className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{workerDetails?.personal_details?.phone || selectedWorker.phone}</span>
                  </div>
                )}
              </div>

              {isLoadingDetails ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              ) : workerDetails ? (
                <>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-lg">{workerDetails.average_rating?.toFixed(1) || "--"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <IndianRupee className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-lg">{workerDetails.amount_earned || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-lg">{workerDetails.jobs?.completed?.length || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-bold text-lg">{workerDetails.jobs?.cancelled?.length || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Services Offered</p>
                    {workerDetails.capabilities && workerDetails.capabilities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {workerDetails.capabilities.map((cap, i) => (
                          <Badge key={i} variant="outline" className="text-xs rounded-xl">{cap}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No services added yet</p>
                    )}
                  </div>

                  {/* Location */}
                  {workerLocation && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3.5 w-3.5" />Last Known Location
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {workerLocation.latitude?.toFixed(5)}, {workerLocation.longitude?.toFixed(5)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Could not load details</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedWorker?.name}</strong>? This cannot be undone and will delete all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removing...</> : "Remove Worker"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
