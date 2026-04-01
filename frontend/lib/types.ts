// Core types for the service booking application - matching FastAPI backend

export type UserRole = "customer" | "worker" | "admin"

export interface User {
  id: number
  email: string
  name: string
  phone?: string
  dob?: string
  role: UserRole
  workerId?: number // For workers, this is their worker_id
}

export interface Address {
  location_id: number
  house_no: string
  city: string
  state: string
  country: string
  pincode: number
  latitude: number
  longitude: number
}

export interface ServiceCategory {
  service_id: number
  name: string
  description: string
  base_price: number
  icon?: string
}

export interface JobHistoryItem {
  job_id: number
  service_category: string
  location_details: {
    house_no: string
    city: string
    state: string
    country: string
    pincode: string
  }
  requested_time: string
  description: string
  status: string
  worker_details: {
    worker_name: string | null
    worker_phone: string | null
    worker_id?: number
  }
  otp?: string
  amount?: number
}

export interface PaymentHistoryItem {
  id: number
  job_id: number
  amount: number
  platform_fee: number
  provider_amount: number
  payment_status: string
  payment_method: string
  transaction_id: string
  created_at: string
}

export interface AdminWorker {
  id: number
  name: string
  dob: string
  phone: string
  email: string
  is_active: boolean
  capabilities: string[]
}

export interface WorkerDetails {
  personal_details: {
    name: string
    email: string
    phone: string
    dob: string
  }
  is_active: boolean
  capabilities: string[]
  jobs: {
    completed: number[]
    cancelled: number[]
  }
  amount_earned: number
  average_rating: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
  isLoading: boolean
}

export type WebSocketEventType = "JOB_REQUEST" | "JOB_ASSIGNED" | "JOB_COMPLETED" | "PAYMENT_NOTIFICATION"

export interface WebSocketMessage {
  type: WebSocketEventType
  payload: Record<string, unknown>
  timestamp: string
}

// Service request used by worker and customer dashboards
export interface ServiceRequest {
  id: string
  customerId: string
  workerId?: string
  categoryId: string
  categoryName: string
  addressId: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  description: string
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "assigned"
  price: number
  otp?: string
  createdAt: string
  completedAt?: string
  customerPhone?: string
  distanceKm?: number
}

// Worker type for admin and worker dashboards (frontend representation)
export interface Worker {
  id: number
  name: string
  email: string
  phone?: string
  dob?: string
  role: "worker"
  rating: number
  totalJobs: number
  capabilities: WorkerCapability[]
  status?: {
    isOnline: boolean
    lat: number
    lng: number
    lastUpdated: string
  }
}

// Worker capability
export interface WorkerCapability {
  id: string
  categoryId: string
  categoryName: string
}

// Review type
export interface Review {
  id: string
  jobId: string
  customerId: string
  workerId: string
  rating: number
  comment: string
  createdAt: string
}

// Payment type
export interface Payment {
  id: string
  jobId: string
  customerId: string
  amount: number
  status: "pending" | "completed" | "failed"
  method: string
  createdAt: string
}

// Service Category with extended fields for UI
export interface ServiceCategoryUI {
  id: string
  name: string
  description: string
  basePrice: number
  icon: string
}
