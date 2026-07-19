"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import type { Review } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Star, User, RefreshCw } from "lucide-react"

export function RatingsPage() {
  const { user } = useAuth()

  const [rating, setRating] = useState<{
    rating: number
    totalReviews: number
    distribution: Record<number, number>
  }>({
    rating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const ratingData = await api.worker.getRating()
      setRating(ratingData)

      const reviewsData = await api.worker.getReviews()
      setReviews(reviewsData)
    } catch (error) {
      console.error("Failed to load ratings:", error)
    }
  }, [user])

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true)
      await loadData()
      setIsLoading(false)
    }
    initialLoad()
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // Safely get count from distribution (handles string vs number keys)
  const getStarCount = (star: number) => {
    if (!rating.distribution) return 0
    const dist = rating.distribution as any
    return dist[star] || dist[star.toString()] || 0
  }

  const ratingDistribution = [
    { stars: 5, count: getStarCount(5) },
    { stars: 4, count: getStarCount(4) },
    { stars: 3, count: getStarCount(3) },
    { stars: 2, count: getStarCount(2) },
    { stars: 1, count: getStarCount(1) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
          <p className="text-muted-foreground">See what customers say about your service</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Rating Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overall Rating</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold">{rating.rating.toFixed(1)}</p>
              <div className="flex items-center justify-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={`star-${star}`}
                    className={`h-5 w-5 ${star <= Math.round(rating.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{rating.totalReviews} reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingDistribution.map(({ stars, count }) => (
              <div key={`dist-${stars}`} className="flex items-center gap-3">
                <span className="text-sm w-3">{stars}</span>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Progress
                  value={rating.totalReviews > 0 ? (count / rating.totalReviews) * 100 : 0}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-8">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>Feedback from your customers</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reviews yet. Complete jobs to receive feedback!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, index) => (
                <div key={review.id || `review-${index}`} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Customer</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={`review-star-${star}`}
                          className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
