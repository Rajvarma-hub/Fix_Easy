// Real API client - connects to FastAPI backend
// Base URL from environment variables

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8000"

// Token storage key
const TOKEN_KEY = "service_booking_token"
const AUTH_STORAGE_KEY = "service_booking_auth"

// Get stored token
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

// Store token
export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

// Remove token
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function handleAuthError(): never {
  removeToken()
  localStorage.removeItem(AUTH_STORAGE_KEY)
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
  throw new Error("Session expired - Please login again")
}

// Generic fetch wrapper with auth
async function apiFetch<T>(endpoint: string, options?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }

  if (!options?.skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    handleAuthError()
  }

  if (response.status === 403) {
    throw new Error("Forbidden - You do not have permission")
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `API Error: ${response.status}`)
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) return {} as T

  return JSON.parse(text)
}

// Form data fetch for OAuth endpoints
async function authFetch<T>(endpoint: string, formData: URLSearchParams): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || "Authentication failed")
  }

  return response.json()
}

// ==================== AUTH API ====================

export type UserRole = "customer" | "worker" | "admin"

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id?: number
  worker_id?: number
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)
  return authFetch("/oauth/user/token", formData)
}

export async function loginWorker(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)
  return authFetch("/oauth/worker/token", formData)
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append("username", email)
  formData.append("password", password)
  return authFetch("/oauth/admin/token", formData)
}

export async function login(email: string, password: string, role: UserRole): Promise<LoginResponse> {
  switch (role) {
    case "customer":
      return loginUser(email, password)
    case "worker":
      return loginWorker(email, password)
    case "admin":
      return loginAdmin(email, password)
    default:
      throw new Error("Invalid role")
  }
}

// ==================== USER SIGNUP ====================

export interface UserSignupInput {
  name: string
  email: string
  password: string
  phone: string
  dob: string // YYYY-MM-DD
}

export async function signupUser(data: UserSignupInput): Promise<number> {
  return apiFetch("/users/signup", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuth: true,
  })
}

// ==================== USER PROFILE ====================

export interface UserProfile {
  name: string
  dob: string
  email: string
  phone: string
}

export async function getUserProfile(): Promise<UserProfile> {
  return apiFetch("/users/Profile_details")
}

export async function updateUserProfile(data: { name?: string; dob?: string; phone?: string }): Promise<{
  message: string
  data: object
}> {
  return apiFetch("/users/update_name", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateUserName(name: string): Promise<{ message: string; data: object }> {
  return updateUserProfile({ name })
}

// ==================== USER ADDRESSES ====================

export interface AddressInput {
  house_no: string
  city: string
  state: string
  pincode: number
  country: string
  latitude: number
  longitude: number
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

export async function addAddress(data: AddressInput): Promise<{ Location_id: number; Status: string }> {
  return apiFetch("/users/AddAddress", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getAddresses(): Promise<Address[]> {
  return apiFetch("/users/location_details")
}

export interface UpdateAddressInput {
  id: number
  house_no?: string
  city?: string
  state?: string
  pincode?: number
  country?: string
  latitude?: number
  longitude?: number
}

export async function updateAddress(data: UpdateAddressInput): Promise<{ message: string; data: object }> {
  return apiFetch("/users/update_location_details", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== SERVICE REQUESTS ====================

export interface ServiceRequestInput {
  service_id: number
  location_id: number
  description: string
}

export async function createServiceRequest(
  data: ServiceRequestInput,
): Promise<{ status: string; Service_request_id: number }> {
  return apiFetch("/users/serviceRequest", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== USER JOB HISTORY ====================

export interface JobHistoryItem {
  job_id?: number
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

export async function getUserJobHistory(): Promise<JobHistoryItem[]> {
  return apiFetch("/users/history")
}

// ==================== CANCEL JOB ====================

export async function cancelUserJob(jobId: number): Promise<{ message: string }> {
  const id = typeof jobId === "string" ? Number.parseInt(jobId, 10) : jobId
  if (!id || isNaN(id)) {
    throw new Error("Invalid job ID")
  }
  return apiFetch("/users/users/CancellJob", {
    method: "POST",
    body: JSON.stringify({ job_id: id }),
  })
}

// ==================== PAYMENTS ====================

export interface MakePaymentInput {
  job_id: number
  amount: number
  payment_method: "CARD" | "CASH" | "UPI"
}

export async function makePayment(data: MakePaymentInput): Promise<{ message: string; transaction_id: string }> {
  return apiFetch("/users/make_payment", {
    method: "POST",
    body: JSON.stringify(data),
  })
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

export async function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  return apiFetch("/users/paymentHistory")
}

// ==================== REVIEWS ====================

export interface ReviewInput {
  job_id: number
  worker_id: number
  rating: number // 1-5
  comments: string
}

export async function submitReview(data: ReviewInput): Promise<string> {
  return apiFetch("/users/review", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== AI CHAT ====================

export async function aiChat(query: string): Promise<{ response: string }> {
  return apiFetch(`/users/AIChat?query=${encodeURIComponent(query)}`, {
    method: "POST",
  })
}

// ==================== WORKER SIGNUP ====================

export interface WorkerSignupInput {
  name: string
  email: string
  password: string
  phone: string
  dob: string
}

export async function signupWorker(data: WorkerSignupInput): Promise<number> {
  return apiFetch("/Workers/signup", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuth: true,
  })
}

// ==================== WORKER CAPABILITY ====================

export async function addWorkerCapability(workerCapability: number[]): Promise<{ message: string }> {
  return apiFetch("/Workers/AddWorkerCapability", {
    method: "POST",
    body: JSON.stringify({ worker_capability: workerCapability }),
  })
}

export async function getWorkerCapabilities(): Promise<string[]> {
  try {
    // Get worker profile which includes capabilities
    const profile = await apiFetch<{ capabilities?: string[] }>("/Workers/Profile_details")
    return profile.capabilities || []
  } catch {
    return []
  }
}

// ==================== WORKER PROFILE ====================

export async function getWorkerProfile(): Promise<UserProfile> {
  return apiFetch("/Workers/Profile_details")
}

export async function updateWorkerProfile(data: { name?: string; dob?: string; phone?: string }): Promise<{
  message: string
  data: object
}> {
  return apiFetch("/Workers/update_name", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== WORKER STATUS ====================
export type ActiveStatus = "online" | "offline" | "assigned"

export async function updateWorkerStatus(
  isActive: ActiveStatus,
  latitude: number,
  longitude: number,
): Promise<{ Status: string }> {
  if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinates - latitude and longitude must be numbers")
  }
  return apiFetch("/Workers/workerStatus", {
    method: "POST",
    body: JSON.stringify({
      is_active: isActive,
      latitude: latitude,
      longitude: longitude,
    }),
  })
}

// ==================== WORKER COMPLETE JOB ====================

export async function completeJob(jobId: number, otp: string): Promise<{ message: string }> {
  return apiFetch("/Workers/workcompleted", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, otp }),
  })
}

// ==================== WORKER CANCEL JOB ====================

export async function cancelWorkerJob(jobId: number): Promise<{ message: string }> {
  return apiFetch("/Workers/CancellJob", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId }),
  })
}

// ==================== WORKER JOBS STATS ====================

export interface WorkerJobStats {
  daily_jobs: number
  total_jobs: number
  cancelled_jobs: number
}

export async function getWorkerJobStats(): Promise<WorkerJobStats> {
  return apiFetch("/Workers/Jobs_completed")
}

// ==================== WORKER MY JOBS ====================
export interface WorkerJob {
  id: number
  service_name: string
  customer_name: string
  description: string
  location: string
  city?: string
  state?: string
  status: string
  accepted_at: string | null
  amount: number
}

export interface WorkerJobsResponse {
  pending: WorkerJob[]
  completed: WorkerJob[]
  cancelled: WorkerJob[]
}

export async function getWorkerMyJobs(): Promise<WorkerJobsResponse> {
  const jobs = await apiFetch<WorkerJob[]>("/Workers/my_jobs")
  const arr = Array.isArray(jobs) ? jobs : []
  return {
    pending: arr.filter((j) => j.status?.toLowerCase() === "assigned" || j.status?.toLowerCase() === "pending"),
    completed: arr.filter((j) => j.status?.toLowerCase() === "completed"),
    cancelled: arr.filter((j) => j.status?.toLowerCase() === "cancelled"),
  }
}

// ==================== WORKER EARNINGS ====================

export async function getWorkerTodayEarnings(): Promise<{ message: string; amount: number }> {
  return apiFetch("/Workers/todays_earning")
}

export async function getWorkerMonthlyEarnings(): Promise<{ message: string; amount: number }> {
  return apiFetch("/Workers/monthly_earning")
}

// ==================== WORKER RATING ====================

export async function getWorkerRating(): Promise<{ Average_rating: number }> {
  return apiFetch("/Workers/rating")
}

// ==================== ADMIN SIGNUP ====================

export interface AdminSignupInput {
  name: string
  email: string
  password: string
}

export async function signupAdmin(data: AdminSignupInput): Promise<number> {
  return apiFetch("/admin/signup", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuth: true,
  })
}

// ==================== ADMIN SERVICE CATEGORIES ====================

export interface ServiceCategoryInput {
  name: string
  base_price: number
  description: string
}

export async function addServiceCategory(data: ServiceCategoryInput): Promise<{ record_id: number; Status: string }> {
  return apiFetch("/admin/AddService_Categories", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export interface AdminServiceCategory {
  id: number
  name: string
  base_price: number
  description: string
}

export async function getAdminServiceCategories(): Promise<AdminServiceCategory[]> {
  return apiFetch("/admin/Service_categories")
}

// ==================== SERVICE CATEGORIES (for customers) ====================

export interface ServiceCategory {
  service_id: number
  name: string
  description: string
  base_price: number
  icon?: string
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const categories = await getAdminServiceCategories()
  return categories.map((cat) => ({
    service_id: cat.id,
    name: cat.name,
    description: cat.description,
    base_price: cat.base_price,
  }))
}

// ==================== ADMIN WORKERS ====================

export interface AdminWorker {
  id: number
  name: string
  dob: string
  phone: string
  email: string
  is_active: boolean
  capabilities: string[]
}

export async function getAdminWorkers(): Promise<AdminWorker[]> {
  return apiFetch("/admin/workers")
}

export async function deleteWorker(workerId: number): Promise<string> {
  return apiFetch("/admin/DeleteWorker", {
    method: "DELETE",
    body: JSON.stringify({ id: workerId }),
  })
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

export async function getWorkerDetails(workerId: number): Promise<WorkerDetails> {
  return apiFetch(`/admin/GetWorkerDetails?worker_id=${workerId}`)
}

export async function getWorkerLocation(workerId: number): Promise<{ latitude: number; longitude: number }> {
  return apiFetch(`/admin/WhereIsWorker?worker_id=${workerId}`)
}

// ==================== ADMIN REVENUE ====================

export async function getTodayRevenue(): Promise<{ todays_earing: number }> {
  return apiFetch("/admin/TodayRevenue")
}

export async function getMonthlyRevenue(): Promise<{ monthly_amount: number }> {
  return apiFetch("/admin/MonthlyRevenue")
}

// ==================== WORKER PENDING JOBS ====================

export interface PendingJob {
  job_id: number
  service_name: string
  customer_name: string
  description: string
  house_no: string
  city: string
  state: string
  pincode: number
  country: string
  requested_time: string
}

export interface PendingJobsResponse {
  jobs: PendingJob[]
}

export async function getWorkerPendingJobs(): Promise<PendingJobsResponse> {
  const jobs = await apiFetch<PendingJob[]>("/Workers/pending_jobs")
  // Backend returns array directly, wrap in {jobs: [...]}
  return { jobs: Array.isArray(jobs) ? jobs : [] }
}

// NOTE: Job accept/reject is done via WebSocket (respondToJob in websocket-context.tsx)
// This REST endpoint does NOT exist on the backend - kept for reference only
export async function acceptWorkerJob(jobId: number): Promise<{ message: string }> {
  console.warn("acceptWorkerJob REST call - use WebSocket respondToJob() instead")
  return { message: "Use WebSocket to accept/reject jobs" }
}

// ==================== NAMESPACED API OBJECT ====================

import type { ServiceRequest } from "./types"

// Helper to transform WorkerJob to ServiceRequest format
function transformWorkerJob(job: WorkerJob): ServiceRequest {
  return {
    id: job.id?.toString() || "",
    customerId: job.customer_name || "",
    categoryId: "",
    categoryName: job.service_name || "Unknown Service",
    addressId: "",
    address: {
      street: job.location || "",
      city: job.city || "",
      state: job.state || "",
      zipCode: "",
    },
    description: job.description || "",
    status: (job.status?.toLowerCase() || "pending") as ServiceRequest["status"],
    price: job.amount || 0,
    createdAt: job.accepted_at || new Date().toISOString(),
  }
}

export const api = {
  // Auth methods
  auth: {
    login,
    loginUser,
    loginWorker,
    loginAdmin,
    signupUser,
    signupWorker,
    signupAdmin,
  },

  // Services
  services: {
    getCategories: getServiceCategories,
  },

  // Customer/User methods
  customer: {
    getProfile: getUserProfile,
    updateProfile: updateUserProfile,
    updateUserName, // Added for backward compatibility
    getAddresses,
    addAddress,
    updateAddress,
    createServiceRequest,
    getJobHistory: getUserJobHistory,
    cancelJob: cancelUserJob,
    makePayment,
    getPaymentHistory,
    submitReview,
    aiChat,
  },

  // Worker methods
  worker: {
    getProfile: getWorkerProfile,
    updateProfile: updateWorkerProfile,
    getCapabilities: async (): Promise<string[]> => {
      try {
        const capabilities = await getWorkerCapabilities()
        return capabilities
      } catch {
        return []
      }
    },
    addCapability: async (categoryId: string) => {
      await addWorkerCapability([Number.parseInt(categoryId)])
      return { id: categoryId, categoryId, categoryName: "" }
    },
    // Get my jobs (all categories)
    getMyJobs: getWorkerMyJobs,
    // Get job stats
    getJobStats: getWorkerJobStats,
    // Get available jobs
    getAvailableJobs: async (): Promise<ServiceRequest[]> => {
      try {
        const response = await getWorkerPendingJobs()
        const jobs = response.jobs || []
        return jobs.map((job) => ({
          id: job.job_id?.toString() || "",
          customerId: job.customer_name || "",
          categoryId: "",
          categoryName: job.service_name || "Unknown Service",
          addressId: "",
          address: {
            street: job.house_no || "",
            city: job.city || "",
            state: job.state || "",
            zipCode: job.pincode?.toString() || "",
          },
          description: job.description || "",
          status: "pending" as ServiceRequest["status"],
          price: 0,
          createdAt: job.requested_time || new Date().toISOString(),
        }))
      } catch (error) {
        console.error("Failed to get available jobs:", error)
        return []
      }
    },
    // Get active jobs (assigned jobs for worker)
    getActiveJobs: async (): Promise<ServiceRequest[]> => {
      try {
        const response = await getWorkerMyJobs()
        return (response.pending || []).map(transformWorkerJob)
      } catch (error) {
        console.error("Failed to get active jobs:", error)
        return []
      }
    },
    // Accept job
    acceptJob: async (jobId: string | number): Promise<{ message: string }> => {
      const id = typeof jobId === "string" ? Number.parseInt(jobId) : jobId
      return acceptWorkerJob(id)
    },
    // Complete job
    completeJob: async (jobId: number | string, otp: string) => {
      const id = typeof jobId === "string" ? Number.parseInt(jobId) : jobId
      return completeJob(id, otp)
    },
    // Cancel job
    cancelJob: async (jobId: number | string) => {
      const id = typeof jobId === "string" ? Number.parseInt(jobId) : jobId
      return cancelWorkerJob(id)
    },
    // Update status
    updateStatus: async (isOnline: boolean, lat: number, lng: number) => {
      const status: ActiveStatus = isOnline ? "online" : "offline"
      return updateWorkerStatus(status, lat, lng)
    },
    // Get today's earnings
    getTodaysEarnings: async () => {
      try {
        const result = await getWorkerTodayEarnings()
        return { amount: result.amount || 0, jobs: 0 }
      } catch {
        return { amount: 0, jobs: 0 }
      }
    },
    // Get monthly earnings
    getMonthlyEarnings: async () => {
      try {
        const result = await getWorkerMonthlyEarnings()
        return { amount: result.amount || 0, jobs: 0 }
      } catch {
        return { amount: 0, jobs: 0 }
      }
    },
    // Get rating
    getRating: async () => {
      try {
        const result = await getWorkerRating()
        return { rating: result.Average_rating || 0, totalReviews: 0 }
      } catch {
        return { rating: 0, totalReviews: 0 }
      }
    },
    // Get pending jobs
    getPendingJobs: getWorkerPendingJobs,
  },

  // Admin methods
  admin: {
    getCategories: async (): Promise<ServiceCategory[]> => {
      const categories = await getAdminServiceCategories()
      return categories.map((cat) => ({
        service_id: cat.id,
        name: cat.name,
        description: cat.description,
        base_price: cat.base_price,
      }))
    },
    addCategory: async (data: ServiceCategoryInput & { icon?: string }) => {
      // Note: Backend doesn't support icon field, we just ignore it
      return addServiceCategory({
        name: data.name,
        base_price: data.base_price,
        description: data.description,
      })
    },
    getWorkers: getAdminWorkers,
    deleteWorker,
    getWorkerDetails,
    getWorkerLocation,
    getTodayRevenue: async () => {
      try {
        const result = await getTodayRevenue()
        return { amount: result.todays_earing || 0, transactions: 0 }
      } catch {
        return { amount: 0, transactions: 0 }
      }
    },
    getMonthlyRevenue: async () => {
      try {
        const result = await getMonthlyRevenue()
        return { amount: result.monthly_amount || 0, transactions: 0 }
      } catch {
        return { amount: 0, transactions: 0 }
      }
    },
  },
}
