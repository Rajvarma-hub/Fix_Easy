"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface LocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  permissionGranted: boolean
}

export interface UseLocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  autoUpdate?: boolean
  updateInterval?: number // in milliseconds
}

const DEFAULT_OPTIONS: UseLocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  autoUpdate: false,
  updateInterval: 15000, // 15 seconds
}

export function useLocation(options: UseLocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionGranted: false,
  })

  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
        return
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      })
    })
  }, [opts.enableHighAccuracy, opts.timeout, opts.maximumAge])

  const requestLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const position = await getCurrentPosition()
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
        permissionGranted: true,
      })
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
    } catch (error) {
      const errorMessage =
        error instanceof GeolocationPositionError ? getGeolocationErrorMessage(error) : "Failed to get location"

      setLocation((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
        permissionGranted: false,
      }))
      throw new Error(errorMessage)
    }
  }, [getCurrentPosition])

  const startAutoUpdate = useCallback(
    (callback?: (lat: number, lng: number) => void) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Initial fetch
      requestLocation()
        .then((loc) => {
          if (callback && loc.latitude && loc.longitude) {
            callback(loc.latitude, loc.longitude)
          }
        })
        .catch(() => {})

      // Set up interval for periodic updates
      intervalRef.current = setInterval(async () => {
        try {
          const loc = await requestLocation()
          if (callback && loc.latitude && loc.longitude) {
            callback(loc.latitude, loc.longitude)
          }
        } catch (error) {
          console.error("[v0] Auto location update failed:", error)
        }
      }, opts.updateInterval)
    },
    [requestLocation, opts.updateInterval],
  )

  const stopAutoUpdate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoUpdate()
    }
  }, [stopAutoUpdate])

  return {
    ...location,
    requestLocation,
    startAutoUpdate,
    stopAutoUpdate,
  }
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please enable location access in your browser settings."
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable. Please try again."
    case error.TIMEOUT:
      return "Location request timed out. Please try again."
    default:
      return "An unknown error occurred while getting your location."
  }
}
