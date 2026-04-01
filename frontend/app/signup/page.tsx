import { SignupForm } from "@/components/auth/signup-form"
import { Wrench, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow animation-delay-200" />
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

        <div className="space-y-8">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Join Thousands of
            <br />
            <span className="text-primary">Happy Users</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Create your account and start booking professional home services in minutes.
          </p>
          <ul className="space-y-4">
            {[
              "Access to 2,000+ verified professionals",
              "Real-time tracking and updates",
              "Secure payments and refunds",
              "24/7 customer support",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ServiceHub. All rights reserved.
        </p>
      </div>

      {/* Right Side - Signup Form */}
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
          <SignupForm />
        </div>
      </div>
    </main>
  )
}
