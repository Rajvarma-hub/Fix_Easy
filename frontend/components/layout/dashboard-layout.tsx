"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useWorkerWebSocket } from "@/lib/websocket-context"
import { JobRequestPopup } from "@/components/worker/job-request-popup"
import { PaymentNotificationPopup } from "@/components/worker/payment-notification-popup"
import { WorkerJobCancellationPopup } from "@/components/worker/job-cancellation-popup"
import { JobAcceptedPopup } from "@/components/customer/job-accepted-popup"
import { CustomerJobCancellationPopup } from "@/components/customer/job-cancellation-popup"
import { AIAssistantPopup } from "@/components/customer/ai-assistant-popup"
import { getAvatarColor, getInitials } from "@/lib/avatar-utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Search,
  MapPin,
  History,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Bell,
  Wrench,
  LayoutDashboard,
  Users,
  DollarSign,
  Briefcase,
  Star,
  ToggleLeft,
  FolderOpen,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState } from "react"

const customerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/services", label: "Services", icon: Search },
  { href: "/dashboard/addresses", label: "Addresses", icon: MapPin },
  { href: "/dashboard/bookings", label: "Bookings", icon: History },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/ai-chat", label: "AI Help", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
]

const workerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/jobs", label: "Available Jobs", icon: Briefcase },
  { href: "/dashboard/my-jobs", label: "My Jobs", icon: FolderOpen },
  { href: "/dashboard/status", label: "Status", icon: ToggleLeft },
  { href: "/dashboard/earnings", label: "Earnings", icon: DollarSign },
  { href: "/dashboard/ratings", label: "Ratings", icon: Star },
  { href: "/dashboard/services", label: "My Services", icon: Wrench },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
]

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, role, logout } = useAuth()
  const { connect: connectWorkerWs, disconnect: disconnectWorkerWs, isConnected, messages } = useWorkerWebSocket()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const wsConnectedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    // Only connect if we have a valid worker and haven't connected yet
    if (user && role === "worker" && user.workerId && !wsConnectedRef.current) {
      console.log("[v0] Dashboard: Connecting worker WebSocket for workerId:", user.workerId)
      connectWorkerWs(user.workerId)
      wsConnectedRef.current = true
    }

    // Don't disconnect on cleanup - let the connection persist
    // This prevents React StrictMode double-mount from breaking the connection
  }, [user, role, connectWorkerWs])

  if (!isAuthenticated || !user) {
    return null
  }

  const navItems = role === "admin" ? adminNavItems : role === "worker" ? workerNavItems : customerNavItems

  const unreadNotifications = messages.filter((m) => {
    const msg = m as Record<string, unknown>
    return msg.topic_name === "job_request" || msg.topic_name === "payment_notification"
  }).length

  const avatarStyle = getAvatarColor(user.name)
  const initials = getInitials(user.name)

  const NavContent = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {role === "worker" && (
        <>
          <JobRequestPopup />
          <PaymentNotificationPopup />
          <WorkerJobCancellationPopup />
        </>
      )}

      {role === "customer" && (
        <>
          <JobAcceptedPopup />
          <CustomerJobCancellationPopup />
          <AIAssistantPopup />
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
        <div className="flex h-16 items-center border-b px-6">
          <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ServiceHub</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <NavContent />
        </div>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={"/placeholder.svg"} alt={user.name} />
              <AvatarFallback className={`${avatarStyle.bg} ${avatarStyle.text} font-semibold`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            {role === "worker" && (
              <span
                className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                title={isConnected ? "Connected - receiving jobs" : "Disconnected"}
              />
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 lg:hidden flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-xl px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card/95 backdrop-blur-xl">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">Main navigation menu for ServiceHub dashboard</SheetDescription>
            <div className="flex h-16 items-center border-b px-6">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <Wrench className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">ServiceHub</span>
              </div>
            </div>
            <div className="p-4">
              <NavContent />
            </div>
          </SheetContent>
        </Sheet>

        <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">ServiceHub</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                {unreadNotifications}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src={"/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className={`${avatarStyle.bg} ${avatarStyle.text} text-sm font-semibold`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  logout()
                  router.push("/login")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="fixed top-0 left-64 right-0 z-40 hidden lg:flex h-16 items-center justify-between border-b bg-card/50 backdrop-blur-xl px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold capitalize">
            {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
          </h1>
          {role === "worker" && (
            <Badge
              variant="outline"
              className={
                isConnected
                  ? "text-green-600 border-green-500/50 bg-green-500/10"
                  : "text-red-600 border-red-500/50 bg-red-500/10"
              }
            >
              <span
                className={`mr-1.5 h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"} inline-block`}
              />
              {isConnected ? "Live" : "Offline"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                {unreadNotifications}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 pr-2 hover:bg-muted rounded-full">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src={"/placeholder.svg"} alt={user.name} />
                  <AvatarFallback className={`${avatarStyle.bg} ${avatarStyle.text} text-sm font-semibold`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  logout()
                  router.push("/login")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
