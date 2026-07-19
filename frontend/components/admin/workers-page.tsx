"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { AdminWorker, WorkerDetails } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Users, Search, Eye, Trash2, MapPin, Star, Briefcase, Mail, Phone, Loader2 } from "lucide-react"

export function WorkersPage() {
  const { toast } = useToast()

  const [workers, setWorkers] = useState<AdminWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedWorker, setSelectedWorker] = useState<AdminWorker | null>(null)
  const [workerDetails, setWorkerDetails] = useState<WorkerDetails | null>(null)
  const [workerLocation, setWorkerLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  useEffect(() => {
    loadWorkers()
  }, [])

  async function loadWorkers() {
    try {
      const data = await api.admin.getWorkers()
      setWorkers(data)
    } catch (error) {
      console.error("Failed to load workers:", error)
    } finally {
      setIsLoading(false)
    }
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
      if (location) {
        setWorkerLocation(location)
      }
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
      toast({ title: "Worker Deleted", description: "The worker has been removed from the platform." })
      await loadWorkers()
      setDeleteDialogOpen(false)
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete worker.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Workers</h2>
          <p className="text-muted-foreground">Manage platform service providers</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{searchQuery ? "No Workers Found" : "No Workers Yet"}</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery ? `No workers match "${searchQuery}"` : "Workers will appear here once they sign up"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkers.map((worker, index) => (
            <Card key={worker.id || `worker-${index}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{worker.name}</p>
                    <p className="text-sm text-muted-foreground">{worker.email}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {worker.capabilities?.length || 0} services
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={worker.is_active ? "default" : "secondary"}>
                    {worker.is_active ? "Online" : "Offline"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(worker)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                    onClick={() => {
                      setSelectedWorker(worker)
                      setDeleteDialogOpen(true)
                    }}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Worker Details</DialogTitle>
            <DialogDescription>Detailed information about this worker</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {workerDetails?.personal_details?.name || selectedWorker.name}
                  </p>
                  <Badge variant={selectedWorker.is_active ? "default" : "secondary"}>
                    {selectedWorker.is_active ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{workerDetails?.personal_details?.email || selectedWorker.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{workerDetails?.personal_details?.phone || selectedWorker.phone}</span>
                </div>
              </div>

              {isLoadingDetails ? (
                <Skeleton className="h-20" />
              ) : workerDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="text-xl font-bold flex items-center gap-1">
                        {workerDetails.average_rating?.toFixed(1) || "N/A"}
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Earnings</p>
                      <p className="text-xl font-bold">${workerDetails.amount_earned || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Completed Jobs</p>
                      <p className="text-xl font-bold">{workerDetails.jobs?.completed?.length || 0}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Cancelled Jobs</p>
                      <p className="text-xl font-bold">{workerDetails.jobs?.cancelled?.length || 0}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {workerDetails.capabilities && workerDetails.capabilities.length > 0 ? (
                        workerDetails.capabilities.map((cap, index) => (
                          <Badge key={`cap-${index}`} variant="outline">
                            {cap}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No services added</span>
                      )}
                    </div>
                  </div>

                  {workerLocation && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4" />
                        Location
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lat: {workerLocation.latitude?.toFixed(4)}, Lng: {workerLocation.longitude?.toFixed(4)}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedWorker?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
