"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getWorkerRating } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Star, RefreshCw, TrendingUp } from "lucide-react"

export function RatingsPage() {
  const { user } = useAuth()

  const [rating, setRating] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const data = await getWorkerRating()
      setRating(typeof data.Average_rating === "number" ? data.Average_rating : 0)
    } catch (error) {
      console.error("Failed to load rating:", error)
    }
  }, [user])

  useEffect(() => {
    setIsLoading(true)
    loadData().finally(() => setIsLoading(false))
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const hasRating = rating > 0
  const roundedRating = Math.round(rating)

  // Visual distribution based on rating (approximate bell curve around actual avg)
  const getDistribution = (avg: number) => {
    if (avg === 0) return [0, 0, 0, 0, 0]
    const base = [
      Math.max(0, avg - 4) * 10,
      Math.max(0, avg - 3) * 15,
      Math.max(0, 5 - Math.abs(avg - 3)) * 12,
      Math.max(0, avg - 2) * 20,
      Math.min(100, avg * 18),
    ]
    return base.reverse()
  }

  const dist = getDistribution(rating)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
          <p className="text-muted-foreground text-sm">See what customers say about your service</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Rating Score Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Rating</CardTitle>
            <CardDescription>Based on customer feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRating ? (
              <div className="flex flex-col items-center py-4 gap-4">
                <div className="relative">
                  <div className="text-7xl font-bold tracking-tight text-center">{rating.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground text-center mt-1">out of 5</div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-7 w-7 ${star <= roundedRating
                        ? "fill-amber-400 text-amber-400"
                        : star - 0.5 <= rating
                          ? "fill-amber-200 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  rating >= 4.5 ? "bg-emerald-100 text-emerald-800" :
                  rating >= 3.5 ? "bg-blue-100 text-blue-800" :
                  rating >= 2.5 ? "bg-amber-100 text-amber-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  {rating >= 4.5 ? "Excellent" : rating >= 3.5 ? "Good" : rating >= 2.5 ? "Average" : "Needs Improvement"}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Star className="h-6 w-6 opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">No ratings yet</p>
                  <p className="text-xs mt-1">Complete jobs to start receiving customer feedback</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
            <CardDescription>Estimated breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {[5, 4, 3, 2, 1].map((star, idx) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-10 justify-end">
                  <span className="text-sm font-medium">{star}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </div>
                <Progress
                  value={hasRating ? dist[idx] : 0}
                  className="flex-1 h-2"
                />
              </div>
            ))}
            {!hasRating && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Distribution will show once you have reviews
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to improve your rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { emoji: "", tip: "Respond quickly to job notifications" },
              { emoji: "", tip: "Arrive on time at the customer's location" },
              { emoji: "", tip: "Complete jobs thoroughly and professionally" },
              { emoji: "", tip: "Be polite and communicate clearly" },
              { emoji: "", tip: "Bring proper tools and equipment" },
              { emoji: "", tip: "Keep the customer updated on progress" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-sm text-muted-foreground">{item.tip}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
