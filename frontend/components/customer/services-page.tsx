"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCustomerJobWebSocket } from "@/lib/websocket-context"
import { getServiceCategories, getAddresses, createServiceRequest } from "@/lib/api"
import type { ServiceCategory, Address } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Wrench, Zap, Sparkles, Wind, Hammer, Paintbrush, Search, Loader2, CheckCircle, Wifi } from "lucide-react"

const iconMap: Record<string, React.ReactNode> = {
  wrench: <Wrench className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  wind: <Wind className="h-6 w-6" />,
  hammer: <Hammer className="h-6 w-6" />,
  paintbrush: <Paintbrush className="h-6 w-6" />,
}

export function ServicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { connectToJob, isConnected: isJobWsConnected, lastMessage, activeConnections } = useCustomerJobWebSocket()

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState("")
  const [description, setDescription] = useState("")
  const [isBooking, setIsBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookedJobId, setBookedJobId] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!user) return

      try {
        const [categoriesData, addressesData] = await Promise.all([getServiceCategories(), getAddresses()])
        setCategories(categoriesData)
        setAddresses(addressesData)

        // Check for pre-selected category
        const categoryId = searchParams.get("category")
        if (categoryId) {
          const category = categoriesData.find((c) => c.service_id === Number(categoryId))
          if (category) {
            setSelectedCategory(category)
            setBookingDialogOpen(true)
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error)
        toast({ title: "Error", description: "Failed to load services", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, searchParams, toast])

  useEffect(() => {
    if (lastMessage && bookedJobId) {
      
      if (lastMessage.type === "JOB_ASSIGNED") {
        toast({
          title: "Worker Assigned!",
          description: "A worker has been assigned to your job and is on their way.",
        })
      } else if (lastMessage.type === "STATUS_UPDATE") {
        toast({
          title: "Job Update",
          description: `Your job status has been updated.`,
        })
      }
    }
  }, [lastMessage, bookedJobId, toast])

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleBook = (category: ServiceCategory) => {
    setSelectedCategory(category)
    setBookingDialogOpen(true)
    setBookingSuccess(false)
    setBookedJobId(null)
    setDescription("")
    setSelectedAddress(addresses[0]?.location_id?.toString() || "")
  }

  const handleSubmitBooking = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to book a service",
        variant: "destructive",
      })
      return
    }

    if (!selectedCategory || !selectedCategory.service_id) {
      toast({
        title: "Error",
        description: "Please select a service",
        variant: "destructive",
      })
      return
    }

    if (!selectedAddress) {
      toast({
        title: "Error",
        description: "Please select an address",
        variant: "destructive",
      })
      return
    }

    setIsBooking(true)
    try {
      const requestPayload = {
        service_id: selectedCategory.service_id,
        location_id: Number(selectedAddress),
        description: description || "No description provided",
      }

      

      const result = await createServiceRequest(requestPayload)

      

      if (result.Service_request_id && result.Service_request_id > 0) {
        setBookedJobId(result.Service_request_id)
        connectToJob(result.Service_request_id)
        
      }

      setBookingSuccess(true)
      toast({
        title: "Booking Created!",
        description: "Your service request has been submitted successfully.",
      })
    } catch (error) {
      console.error("Booking failed:", error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <Card
            key={category.service_id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleBook(category)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {iconMap[category.icon] || <Wrench className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">From ${category.base_price}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{category.description}</CardDescription>
              <Button className="w-full mt-4" onClick={() => handleBook(category)}>
                Book Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No services found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {bookingSuccess ? (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <DialogTitle className="text-xl">Booking Confirmed!</DialogTitle>
                  <DialogDescription className="text-center">
                    Your {selectedCategory?.name} service request has been submitted. A worker will be assigned shortly.
                  </DialogDescription>
                  {isJobWsConnected && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Wifi className="h-4 w-4" />
                      <span>Connected for real-time updates</span>
                    </div>
                  )}
                </div>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                  Book Another
                </Button>
                <Button onClick={() => router.push("/dashboard/bookings")}>View Bookings</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Book {selectedCategory?.name}</DialogTitle>
                <DialogDescription>Fill in the details for your service request</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Service Location</Label>
                  {addresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      <p>No addresses saved.</p>
                      <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/dashboard/addresses")}>
                        Add an address first
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((addr) => (
                          <SelectItem key={addr.location_id} value={addr.location_id.toString()}>
                            {addr.house_no}, {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue or service you need..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Estimated Price</span>
                  <span className="font-semibold">
                    ${selectedCategory?.base_price} - ${(selectedCategory?.base_price || 0) + 50}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitBooking} disabled={isBooking || !selectedAddress}>
                  {isBooking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
