"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react"

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://127.0.0.1:8000"

export interface JobRequestPayload {
  topic_name: "job_request"
  service_request_id: number
  service_id: number
  service_category: string
  service_location: {
    house_no: string
    latitude: number
    longitude: number
    city: string
    pincode: string
    state: string
    country: string
  }
  service_description: string
}

export interface JobAcceptedPayload {
  type: "Job_Accepted"
  job_id: number
  worker_name: string
  worker_id?: number
  worker_phone?: string
  Status: string
  Otp: string
}

export interface PaymentNotificationPayload {
  topic_name: "payment_notification"
  worker_id: number
  mesage: string // Note: Backend sends "mesage" not "message"
  type: string
  transaction_id: string
}

export interface JobCancelledPayload {
  type: "JOB_CANCELLED"
  job_id: number
  cancelled_by: "WORKER" | "USER"
}

export type WebSocketMessage =
  | JobRequestPayload
  | JobAcceptedPayload
  | PaymentNotificationPayload
  | JobCancelledPayload
  | Record<string, unknown>

function playNotificationSound() {
  try {
    const audioContext = new (
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    // Silent fail for notification sound
  }
}

interface WorkerWebSocketContextType {
  isConnected: boolean
  messages: WebSocketMessage[]
  lastMessage: WebSocketMessage | null
  pendingJobRequest: JobRequestPayload | null
  paymentNotification: PaymentNotificationPayload | null
  jobCancellation: JobCancelledPayload | null
  connect: (workerId: number) => void
  disconnect: () => void
  clearMessages: () => void
  respondToJob: (serviceRequestId: number, action: "accept" | "reject") => void
  clearPendingJob: () => void
  clearPaymentNotification: () => void
  clearJobCancellation: () => void
}

// Storage key for persisting job data (OTP, worker details)
const JOB_DATA_STORAGE_KEY = "service_booking_job_data"

// Interface for stored job data
export interface StoredJobData {
  job_id: number
  otp: string
  worker_id?: number
  worker_name?: string
  worker_phone?: string
  status: string
  updated_at: string
}

interface CustomerJobWebSocketContextType {
  isConnected: boolean
  activeConnections: Map<number, WebSocket>
  messages: WebSocketMessage[]
  lastMessage: WebSocketMessage | null
  jobAccepted: JobAcceptedPayload | null
  jobCancellation: JobCancelledPayload | null
  storedJobData: Map<number, StoredJobData>
  connectToJob: (serviceRequestId: number) => void
  disconnectFromJob: (serviceRequestId: number) => void
  disconnectAll: () => void
  clearMessages: () => void
  clearJobAccepted: () => void
  clearJobCancellation: () => void
  getJobData: (jobId: number) => StoredJobData | undefined
}

const WorkerWebSocketContext = createContext<WorkerWebSocketContextType | null>(null)
const CustomerJobWebSocketContext = createContext<CustomerJobWebSocketContextType | null>(null)

export function WorkerWebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [pendingJobRequest, setPendingJobRequest] = useState<JobRequestPayload | null>(null)
  const [paymentNotification, setPaymentNotification] = useState<PaymentNotificationPayload | null>(null)
  const [jobCancellation, setJobCancellation] = useState<JobCancelledPayload | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const workerIdRef = useRef<number | null>(null)
  const isConnectingRef = useRef(false) // Prevent race conditions
  const maxReconnectAttempts = 10

  const connect = useCallback((workerId: number) => {
    if (!workerId || typeof workerId !== "number" || workerId <= 0 || isNaN(workerId)) {
      return
    }

    // Prevent multiple simultaneous connection attempts (React StrictMode fix)
    if (isConnectingRef.current) {
      return
    }

    // Already connected to this worker
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && workerIdRef.current === workerId) {
      return
    }

    // WebSocket is connecting
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return
    }

    // Close existing connection if connecting to different worker
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close()
    }

    isConnectingRef.current = true
    workerIdRef.current = workerId
    const url = `${WS_BASE_URL}/ws/${workerId}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        isConnectingRef.current = false
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          setMessages((prev) => [...prev, message])
          setLastMessage(message)

          // Check for job request with multiple possible formats
          const isJobRequest = 
            message.topic_name === "job_request" ||
            message.topic_name === "Job_Requested" ||
            message.topic_name === "job_requested" ||
            message.type === "job_request" ||
            message.type === "Job_Requested" ||
            message.type === "job_requested" ||
            message.type === "NEW_JOB" ||
            message.event === "job_request" ||
            message.action === "job_request" ||
            (message.service_request_id && message.service_category) // fallback: has job-like structure

          if (isJobRequest) {
            playNotificationSound()
            // Normalize the payload to match JobRequestPayload interface
            const jobPayload: JobRequestPayload = {
              topic_name: "job_request",
              service_request_id: message.service_request_id || message.job_id || message.id,
              service_id: message.service_id,
              service_category: message.service_category || message.category || message.service_name || "Service Request",
              service_location: message.service_location || message.location || {
                house_no: message.house_no || "",
                latitude: message.latitude || 0,
                longitude: message.longitude || 0,
                city: message.city || "",
                pincode: message.pincode || "",
                state: message.state || "",
                country: message.country || "India",
              },
              service_description: message.service_description || message.description || "",
            }
            setPendingJobRequest(jobPayload)
          } else if (message.topic_name === "payment_notification" || message.type === "payment_notification") {
            playNotificationSound()
            setPaymentNotification(message as PaymentNotificationPayload)
          } else if (message.type === "JOB_CANCELLED" || message.topic_name === "job_cancelled") {
            playNotificationSound()
            setJobCancellation(message as JobCancelledPayload)
          }
        } catch (error) {
          console.error("Worker WebSocket: Parse error:", error)
        }
      }

      ws.onclose = (event) => {
        isConnectingRef.current = false
        setIsConnected(false)

        // Auto-reconnect if not intentionally closed
        if (
          workerIdRef.current &&
          workerIdRef.current > 0 &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          event.code !== 1000
        ) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (workerIdRef.current && workerIdRef.current > 0) {
              connect(workerIdRef.current)
            }
          }, delay)
        }
      }

      ws.onerror = () => {
        isConnectingRef.current = false
      }
    } catch (error) {
      console.error("Worker WebSocket: Failed to create connection:", error)
      isConnectingRef.current = false
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    reconnectAttemptsRef.current = maxReconnectAttempts
    workerIdRef.current = null
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected")
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastMessage(null)
  }, [])

  const respondToJob = useCallback(
    (serviceRequestId: number, action: "accept" | "reject") => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Try to reconnect if disconnected
        if (workerIdRef.current && workerIdRef.current > 0) {
          connect(workerIdRef.current)
          // Queue the response to be sent after reconnection
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const response = {
                type: "JOB_RESPONSE",
                action: action,
                service_request_id: serviceRequestId,
                job_id: serviceRequestId, // Include job_id for compatibility
                worker_id: workerIdRef.current,
              }
              wsRef.current.send(JSON.stringify(response))
              setPendingJobRequest(null)
            }
          }, 1000)
        }
        return
      }

      const response = {
        type: "JOB_RESPONSE",
        action: action,
        service_request_id: serviceRequestId,
        job_id: serviceRequestId, // Include job_id for compatibility
        worker_id: workerIdRef.current,
      }
      wsRef.current.send(JSON.stringify(response))
      setPendingJobRequest(null)
    },
    [connect],
  )

  const clearPendingJob = useCallback(() => {
    setPendingJobRequest(null)
  }, [])

  const clearPaymentNotification = useCallback(() => {
    setPaymentNotification(null)
  }, [])

  const clearJobCancellation = useCallback(() => {
    setJobCancellation(null)
  }, [])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting")
      }
    }
  }, [])

  return (
    <WorkerWebSocketContext.Provider
      value={{
        isConnected,
        messages,
        lastMessage,
        pendingJobRequest,
        paymentNotification,
        jobCancellation,
        connect,
        disconnect,
        clearMessages,
        respondToJob,
        clearPendingJob,
        clearPaymentNotification,
        clearJobCancellation,
      }}
    >
      {children}
    </WorkerWebSocketContext.Provider>
  )
}

// Helper to load stored job data from localStorage
function loadStoredJobData(): Map<number, StoredJobData> {
  if (typeof window === "undefined") return new Map()
  try {
    const stored = localStorage.getItem(JOB_DATA_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as StoredJobData[]
      return new Map(parsed.map((item) => [item.job_id, item]))
    }
  } catch (e) {
    console.error("Failed to load stored job data:", e)
  }
  return new Map()
}

// Helper to save job data to localStorage
function saveJobDataToStorage(data: Map<number, StoredJobData>) {
  if (typeof window === "undefined") return
  try {
    const arr = Array.from(data.values())
    localStorage.setItem(JOB_DATA_STORAGE_KEY, JSON.stringify(arr))
  } catch (e) {
    console.error("Failed to save job data:", e)
  }
}

export function CustomerJobWebSocketProvider({ children }: { children: ReactNode }) {
  const [activeConnections, setActiveConnections] = useState<Map<number, WebSocket>>(new Map())
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [jobAccepted, setJobAccepted] = useState<JobAcceptedPayload | null>(null)
  const [jobCancellation, setJobCancellation] = useState<JobCancelledPayload | null>(null)
  const [storedJobData, setStoredJobData] = useState<Map<number, StoredJobData>>(new Map())
  const connectionsRef = useRef<Map<number, WebSocket>>(new Map())

  const isConnected = activeConnections.size > 0

  // Load stored job data on mount
  useEffect(() => {
    const loaded = loadStoredJobData()
    setStoredJobData(loaded)
  }, [])

  const connectToJob = useCallback((serviceRequestId: number) => {
    if (!serviceRequestId || typeof serviceRequestId !== "number" || serviceRequestId <= 0) {
      return
    }

    if (connectionsRef.current.has(serviceRequestId)) {
      return
    }

    const url = `${WS_BASE_URL}/ws/user/job/${serviceRequestId}`

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        connectionsRef.current.set(serviceRequestId, ws)
        setActiveConnections(new Map(connectionsRef.current))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          setMessages((prev) => [...prev, message])
          setLastMessage(message)

          if (message.type === "Job_Accepted") {
            playNotificationSound()
            const acceptedPayload = message as JobAcceptedPayload
            setJobAccepted(acceptedPayload)

            // Store job data (OTP, worker details) persistently
            const jobData: StoredJobData = {
              job_id: acceptedPayload.job_id,
              otp: acceptedPayload.Otp,
              worker_id: acceptedPayload.worker_id,
              worker_name: acceptedPayload.worker_name,
              worker_phone: acceptedPayload.worker_phone,
              status: acceptedPayload.Status,
              updated_at: new Date().toISOString(),
            }
            setStoredJobData((prev) => {
              const newMap = new Map(prev)
              newMap.set(acceptedPayload.job_id, jobData)
              saveJobDataToStorage(newMap)
              return newMap
            })
          } else if (message.type === "JOB_CANCELLED") {
            playNotificationSound()
            setJobCancellation(message as JobCancelledPayload)
          }
        } catch (error) {
          console.error("Customer WebSocket: Parse error:", error)
        }
      }

      ws.onclose = () => {
        connectionsRef.current.delete(serviceRequestId)
        setActiveConnections(new Map(connectionsRef.current))
      }

      ws.onerror = () => {
        // Silent error handling
      }
    } catch (error) {
      console.error("Customer WebSocket: Failed to connect:", error)
    }
  }, [])

  const disconnectFromJob = useCallback((serviceRequestId: number) => {
    const ws = connectionsRef.current.get(serviceRequestId)
    if (ws) {
      ws.close(1000, "User disconnected from job")
      connectionsRef.current.delete(serviceRequestId)
      setActiveConnections(new Map(connectionsRef.current))
    }
  }, [])

  const disconnectAll = useCallback(() => {
    connectionsRef.current.forEach((ws) => {
      ws.close(1000, "Disconnecting all")
    })
    connectionsRef.current.clear()
    setActiveConnections(new Map())
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastMessage(null)
  }, [])

  const clearJobAccepted = useCallback(() => {
    setJobAccepted(null)
  }, [])

  const clearJobCancellation = useCallback(() => {
    setJobCancellation(null)
  }, [])

  const getJobData = useCallback(
    (jobId: number): StoredJobData | undefined => {
      return storedJobData.get(jobId)
    },
    [storedJobData],
  )

  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((ws) => {
        ws.close(1000, "Component unmounting")
      })
    }
  }, [])

  return (
    <CustomerJobWebSocketContext.Provider
      value={{
        isConnected,
        activeConnections,
        messages,
        lastMessage,
        jobAccepted,
        jobCancellation,
        storedJobData,
        connectToJob,
        disconnectFromJob,
        disconnectAll,
        clearMessages,
        clearJobAccepted,
        clearJobCancellation,
        getJobData,
      }}
    >
      {children}
    </CustomerJobWebSocketContext.Provider>
  )
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  return (
    <WorkerWebSocketProvider>
      <CustomerJobWebSocketProvider>{children}</CustomerJobWebSocketProvider>
    </WorkerWebSocketProvider>
  )
}

export function useWorkerWebSocket() {
  const context = useContext(WorkerWebSocketContext)
  if (!context) {
    return {
      isConnected: false,
      messages: [],
      lastMessage: null,
      pendingJobRequest: null,
      paymentNotification: null,
      jobCancellation: null,
      connect: () => {},
      disconnect: () => {},
      clearMessages: () => {},
      respondToJob: () => {},
      clearPendingJob: () => {},
      clearPaymentNotification: () => {},
      clearJobCancellation: () => {},
    }
  }
  return context
}

export function useCustomerJobWebSocket() {
  const context = useContext(CustomerJobWebSocketContext)
  if (!context) {
    return {
      isConnected: false,
      activeConnections: new Map<number, WebSocket>(),
      messages: [],
      lastMessage: null,
      jobAccepted: null,
      jobCancellation: null,
      storedJobData: new Map<number, StoredJobData>(),
      connectToJob: () => {},
      disconnectFromJob: () => {},
      disconnectAll: () => {},
      clearMessages: () => {},
      clearJobAccepted: () => {},
      clearJobCancellation: () => {},
      getJobData: () => undefined,
    }
  }
  return context
}

export function useWebSocket() {
  return useWorkerWebSocket()
}
