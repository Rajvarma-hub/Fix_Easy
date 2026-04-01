"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { updateWorkerStatus } from "@/lib/api"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import { useLocation } from "@/lib/use-location"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Wifi, WifiOff, Loader2, Navigation, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const LOCATION_UPDATE_INTERVAL = 15000 // 15 seconds

export function WorkerStatusPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { connect: connectWorkerWs, isConnected } = useWorkerWebSocket()
  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,
    permissionGranted,
    requestLocation,
    startAutoUpdate,
    stopAutoUpdate,
  } = useLocation({ updateInterval: LOCATION_UPDATE_INTERVAL })

  const [isOnline, setIsOnline] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false)

  // Request location permission on mount
  useEffect(() => {
    if (!hasRequestedPermission) {
      setHasRequestedPermission(true)
      requestLocation().catch(() => {
        // Error handled by the hook
      })
    }
  }, [hasRequestedPermission, requestLocation])

  const handleLocationUpdate = useCallback(
    async (lat: number, lng: number) => {
      if (!isOnline) return

      try {
        await updateWorkerStatus("online", lat, lng)
        setLastUpdated(new Date().toISOString())
      } catch (error) {
        console.error("Failed to update worker status:", error)
      }
    },
    [isOnline],
  )

  // Start/stop auto updates based on online status
  useEffect(() => {
    if (isOnline && permissionGranted) {
      startAutoUpdate(handleLocationUpdate)
    } else {
      stopAutoUpdate()
    }

    return () => {
      stopAutoUpdate()
    }
  }, [isOnline, permissionGranted, startAutoUpdate, stopAutoUpdate, handleLocationUpdate])

  const handleToggleStatus = async () => {
    if (!user) return

    // Must have location permission to go online
    if (!isOnline && !permissionGranted) {
      toast({
        title: "Location Required",
        description: "Please grant location permission to go online.",
        variant: "destructive",
      })
      requestLocation()
      return
    }

    if (!isOnline && (latitude === null || longitude === null)) {
      toast({
        title: "Location Required",
        description: "Waiting for location... Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      const newStatus = !isOnline
      const lat = latitude ?? 0
      const lng = longitude ?? 0


      await updateWorkerStatus(newStatus ? "online" : "offline", lat, lng)
      setIsOnline(newStatus)
      setLastUpdated(new Date().toISOString())

      if (newStatus && user.workerId) {

        connectWorkerWs(user.workerId)
      }

      toast({
        title: newStatus ? "You're Online!" : "You're Offline",
        description: newStatus
          ? "You can now receive job notifications. Location updates every 15s."
          : "You won't receive new job notifications",
      })
    } catch (error) {
      console.error("Failed to toggle status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRefreshLocation = async () => {
    try {
      const loc = await requestLocation()
      if (isOnline && loc.latitude && loc.longitude) {
        await updateWorkerStatus("online", loc.latitude, loc.longitude)
        setLastUpdated(new Date().toISOString())
      }
      toast({
        title: "Location Updated",
        description: "Your location has been refreshed successfully.",
      })
    } catch (error) {
      toast({
        title: "Location Error",
        description: error instanceof Error ? error.message : "Could not get your location.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Availability Status</h2>
        <p className="text-muted-foreground">Manage your online status and location</p>
      </div>

      {/* Location Permission Alert */}
      {!permissionGranted && locationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location Permission Required</AlertTitle>
          <AlertDescription>
            {locationError}
            <Button variant="outline" size="sm" className="ml-2 bg-transparent" onClick={() => requestLocation()}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Online Status</CardTitle>
          <CardDescription>Toggle your availability to receive job notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 border rounded-lg">
            <div className="flex items-center gap-4">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center ${isOnline ? "bg-green-100" : "bg-muted"}`}
              >
                {isOnline ? (
                  <Wifi className="h-8 w-8 text-green-600" />
                ) : (
                  <WifiOff className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xl font-semibold">{isOnline ? "Online" : "Offline"}</p>
                <p className="text-sm text-muted-foreground">
                  {isOnline
                    ? `Receiving job notifications  ${isConnected ? "WebSocket Connected" : "Connecting..."}`
                    : "You are not receiving notifications"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="status-toggle" className="sr-only">
                Toggle online status
              </Label>
              <Switch
                id="status-toggle"
                checked={isOnline}
                onCheckedChange={handleToggleStatus}
                disabled={isUpdating || locationLoading}
              />
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Location
          </CardTitle>
          <CardDescription>
            Your location is automatically tracked when online (updates every 15 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <Label className="text-sm text-muted-foreground">Latitude</Label>
              <p className="text-lg font-mono">{latitude !== null ? latitude.toFixed(6) : "--"}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Label className="text-sm text-muted-foreground">Longitude</Label>
              <p className="text-lg font-mono">{longitude !== null ? longitude.toFixed(6) : "--"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div className={`h-2 w-2 rounded-full ${permissionGranted ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm">
              {permissionGranted ? "Location permission granted" : "Location permission not granted"}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleRefreshLocation}
            className="w-full bg-transparent"
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Refresh Location Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Better Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">1.</span>
              Stay online during peak hours (8 AM - 10 AM, 4 PM - 8 PM)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">2.</span>
              Keep location permission enabled for accurate job matching
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">3.</span>
              Respond quickly to job notifications
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">4.</span>
              Maintain high ratings for priority job access
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
