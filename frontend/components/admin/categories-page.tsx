"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { ServiceCategory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Wrench, Zap, Sparkles, Wind, Hammer, Paintbrush, Plus, Loader2, FolderOpen, IndianRupee } from "lucide-react"

const ICON_OPTIONS = [
  { value: "wrench", label: "Wrench", icon: Wrench },
  { value: "zap", label: "Lightning", icon: Zap },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "wind", label: "Wind", icon: Wind },
  { value: "hammer", label: "Hammer", icon: Hammer },
  { value: "paintbrush", label: "Paintbrush", icon: Paintbrush },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  wrench: <Wrench className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  wind: <Wind className="h-6 w-6" />,
  hammer: <Hammer className="h-6 w-6" />,
  paintbrush: <Paintbrush className="h-6 w-6" />,
}

const CAT_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#ec4899"]

export function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "", icon: "wrench", basePrice: "" })

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    try {
      const data = await api.admin.getCategories()
      setCategories(data)
    } catch (error) {
      console.error("Failed to load categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => setFormData({ name: "", description: "", icon: "wrench", basePrice: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.admin.addCategory({
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        base_price: parseFloat(formData.basePrice),
      })
      toast({ title: "Category Added ", description: `${formData.name} is now available for workers to offer.` })
      await loadCategories()
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Categories</h2>
          <p className="text-muted-foreground text-sm">Manage available service types on the platform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Service Category</DialogTitle>
              <DialogDescription>Create a new service that workers can offer</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input placeholder="e.g., Plumbing" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the service..." value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3} required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={formData.icon} onValueChange={v => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{opt.label}</div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Base Price (Rs.)</Label>
                  <Input type="number" placeholder="200" value={formData.basePrice}
                    onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                    min="0" step="1" required className="rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 opacity-40" />
            </div>
            <h3 className="font-semibold mb-1">No Categories Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first service category to get started</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const color = CAT_COLORS[i % CAT_COLORS.length]
            return (
              <Card key={cat.service_id || i} className="hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: color + "22", color }}>
                      {ICON_MAP[cat.icon || "wrench"] || <Wrench className="h-6 w-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-0.5 font-semibold text-sm text-emerald-600">
                        <IndianRupee className="h-3 w-3" />
                        {cat.base_price} base
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm line-clamp-2">{cat.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
