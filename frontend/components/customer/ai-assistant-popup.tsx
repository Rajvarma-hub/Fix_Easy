"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { aiChat } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Bot, X, Send, Loader2, Minimize2, Maximize2,
  Sparkles, User, ChevronDown, MessageCircle
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  "How do I book a service?",
  "Track my booking",
  "Payment methods",
  "Cancel a booking",
]

export function AIAssistantPopup() {
  const { user, role } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only show for customers
  if (role !== "customer") return null

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 50)
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 200)
      // Welcome message on first open
      if (messages.length === 0) {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: `Hi ${user?.name?.split(" ")[0] || "there"}!  I'm your ServiceHub assistant. I can help you book services, track your bookings, understand pricing, and answer any questions.\n\nWhat can I help you with today?`,
          timestamp: new Date(),
        }])
      }
    }
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const response = await aiChat(text)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
      if (!isOpen) setUnread(n => n + 1)
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"} bg-gradient-to-br from-primary to-primary/70`}
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
            {unread}
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 origin-bottom-right ${isOpen ? "scale-100 opacity-100" : "scale-75 opacity-0 pointer-events-none"}`}>
        <div className={`bg-background border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[540px]"}`}>

          {/* Header */}
          <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">AI Assistant</span>
                <Badge className="bg-white/20 text-white border-0 text-xs px-1.5 py-0">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />Live
                </Badge>
              </div>
              {!isMinimized && (
                <p className="text-xs text-white/70">Powered by ServiceHub AI</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(m => !m)}
                className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`h-7 w-7 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.role === "assistant" ? "bg-primary/10" : "bg-muted"}`}>
                        {msg.role === "assistant"
                          ? <Bot className="h-3.5 w-3.5 text-primary" />
                          : <User className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </div>
                      <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "assistant"
                            ? "bg-muted text-foreground rounded-tl-sm"
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ask anything..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 rounded-xl h-9 text-sm bg-muted border-0 focus-visible:ring-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="h-9 w-9 rounded-xl flex-shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
