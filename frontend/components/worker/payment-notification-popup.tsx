"use client"

import { useWorkerWebSocket } from "@/lib/websocket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, X, DollarSign } from "lucide-react"

export function PaymentNotificationPopup() {
  const { paymentNotification, clearPaymentNotification } = useWorkerWebSocket()

  if (!paymentNotification) return null

  const message = paymentNotification.mesage || "Payment received"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-200 shadow-2xl border-2 border-green-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge className="bg-green-500 hover:bg-green-600">
              <DollarSign className="h-3 w-3 mr-1" />
              Payment Received
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearPaymentNotification}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-center">Payment Successful!</h3>
          <p className="text-muted-foreground text-center">{message}</p>
          <div className="bg-muted p-3 rounded-lg w-full space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-sm">{paymentNotification.transaction_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-green-600">{paymentNotification.type}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={clearPaymentNotification}>
            Got it
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
