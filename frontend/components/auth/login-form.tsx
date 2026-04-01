"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Wrench, Shield, Loader2, Mail, Lock, ArrowRight } from "lucide-react"
import type { UserRole } from "@/lib/api"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [role, setRole] = useState<UserRole>("customer")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(email, password, role)
      router.push(role === "admin" ? "/admin" : "/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const roleConfig = {
    customer: { icon: User, label: "Customer", color: "bg-blue-500/10 text-blue-600" },
    worker: { icon: Wrench, label: "Worker", color: "bg-emerald-500/10 text-emerald-600" },
    admin: { icon: Shield, label: "Admin", color: "bg-violet-500/10 text-violet-600" },
  }

  return (
    <Card className="w-full border-0 shadow-xl bg-card/80 backdrop-blur-xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="mb-6">
          <TabsList className="grid grid-cols-3 w-full h-12 p-1 bg-muted/50">
            {(["customer", "worker", "admin"] as UserRole[]).map((r) => {
              const config = roleConfig[r]
              const Icon = config.icon
              return (
                <TabsTrigger
                  key={r}
                  value={r}
                  className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{config.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 h-11 bg-background/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 h-11 bg-background/50"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full h-11 font-medium group" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in as {roleConfig[role].label}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold text-primary"
            onClick={() => router.push("/signup")}
          >
            Sign up
          </Button>
        </p>
      </CardFooter>
    </Card>
  )
}
