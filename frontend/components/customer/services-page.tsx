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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Wrench, Zap, Sparkles, Wind, Hammer, Paintbrush,
  Search, Loader2, CheckCircle, Wifi, MapPin, IndianRupee
} from "lucide-react"

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  wrench:     <Wrench className="h-6 w-6" />,
  zap:        <Zap className="h-6 w-6" />,
  sparkles:   <Sparkles className="h-6 w-6" />,
  wind:       <Wind className="h-6 w-6" />,
  hammer:     <Hammer className="h-6 w-6" />,
  paintbrush: <Paintbrush className="h-6 w-6" />,
}

export function ServicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { connectToJob } = useCustomerJobWebSocket()

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

  useEffect(() => {
    async function loadData() {
      if (!user) return
      try {
        const [categoriesData, addressesData] = await Promise.all([getServiceCategories(), getAddresses()])
        setCategories(categoriesData)
        setAddresses(addressesData)
        if (addressesData.length > 0) setSelectedAddress(addressesData[0].location_id.toString())

        const catId = searchParams.get("category")
        if (catId) {
          const cat = categoriesData.find(c => c.service_id === Number(catId))
          if (cat) { setSelectedCategory(cat); setBookingDialogOpen(true) }
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load services", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user, searchParams, toast])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleBook = (cat: ServiceCategory) => {
    setSelectedCategory(cat)
    setBookingDialogOpen(true)
    setBookingSuccess(false)
    setDescription("")
    if (addresses.length > 0) setSelectedAddress(addresses[0].location_id.toString())
  }

  const handleSubmit = async () => {
    if (!user || !selectedCategory || !selectedAddress) return
    setIsBooking(true)
    try {
      const result = await createServiceRequest({
        service_id: selectedCategory.service_id,
        location_id: Number(selectedAddress),
        description: description || "No description provided",
      })
      if (result.Service_request_id > 0) {
        connectToJob(result.Service_request_id)
      }
      setBookingSuccess(true)
      toast({ title: "Booking Created! ", description: "Your service request was submitted. A worker will be assigned shortly." })
    } catch (error) {
      toast({ title: "Booking Failed", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" })
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Book a Service</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Choose from our professional service categories</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl h-11"
        />
      </div>

      {/* Category Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No services found for "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(cat => (
            <Card key={cat.service_id} className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group" onClick={() => handleBook(cat)}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    {SERVICE_ICONS[cat.icon as string] || <Wrench className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-0.5">
                      <IndianRupee className="h-3 w-3" />
                      {cat.base_price}+
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2 mb-4">{cat.description}</CardDescription>
                <Button className="w-full rounded-xl" onClick={e => { e.stopPropagation(); handleBook(cat) }}>
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {bookingSuccess ? (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <DialogTitle className="text-xl">Booking Confirmed!</DialogTitle>
                  <DialogDescription className="text-center">
                    Your <strong>{selectedCategory?.name}</strong> request is submitted. A nearby worker will be assigned shortly.
                  </DialogDescription>
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
                    <Wifi className="h-4 w-4" />
                    <span>Listening for worker assignment...</span>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>Book Another</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/dashboard/bookings")}>View Bookings</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Book {selectedCategory?.name}</DialogTitle>
                <DialogDescription>Fill in your service request details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />Service Location
                  </Label>
                  {addresses.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-xl">
                      No addresses saved.{" "}
                      <button className="text-primary underline" onClick={() => { setBookingDialogOpen(false); router.push("/dashboard/addresses") }}>
                        Add address first
                      </button>
                    </div>
                  ) : (
                    <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map(addr => (
                          <SelectItem key={addr.location_id} value={addr.location_id.toString()}>
                            {addr.house_no}, {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Describe the issue</Label>
                  <Textarea
                    placeholder="Describe what needs to be done..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-sm text-muted-foreground">Estimated Price</span>
                  <span className="font-semibold text-emerald-700">
                    Rs.{selectedCategory?.base_price}  Rs.{(selectedCategory?.base_price || 0) + 500}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isBooking || !selectedAddress}>
                  {isBooking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Booking...</> : "Confirm Booking"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
