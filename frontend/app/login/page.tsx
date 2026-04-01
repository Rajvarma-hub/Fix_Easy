import { LoginForm } from "@/components/auth/login-form"
import { Wrench } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <main className="min-h-screen flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow animation-delay-200" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl" />
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 flex-col justify-between p-12 relative">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">ServiceHub</span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Your Home Services,
            <br />
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Connect with verified professionals for all your home needs. Fast, reliable, and guaranteed quality.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold text-primary">50K+</p>
              <p className="text-sm text-muted-foreground">Happy Customers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">2K+</p>
              <p className="text-sm text-muted-foreground">Expert Workers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">4.9</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ServiceHub. All rights reserved.
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                <Wrench className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">ServiceHub</span>
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
