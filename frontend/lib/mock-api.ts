import type {
  User,
  Address,
  ServiceCategory,
  ServiceRequest,
  Payment,
  Review,
  Worker,
  WorkerCapability,
  UserRole,
} from "./types"
import {
  mockCustomers,
  mockWorkers,
  mockAdmins,
  mockServiceCategories,
  mockAddresses,
  mockServiceRequests,
  mockPayments,
  mockReviews,
  generateOTP,
  generateId,
} from "./mock-data"

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// In-memory data stores (mutable for demo)
const customers = [...mockCustomers]
let workers = [...mockWorkers]
const admins = [...mockAdmins]
const categories = [...mockServiceCategories]
const addresses = [...mockAddresses]
const serviceRequests = [...mockServiceRequests]
const payments = [...mockPayments]
const reviews = [...mockReviews]

// Flag to switch between mock and real API
export const USE_MOCK_API = true

// Base API URL (for real API calls)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (USE_MOCK_API) {
    throw new Error("Mock API should be used")
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}

// ==================== AUTH API ====================

export async function login(email: string, password: string, role: UserRole): Promise<{ user: User; token: string }> {
  await delay(500)

  if (USE_MOCK_API) {
    let user: User | undefined

    if (role === "customer") {
      user = customers.find((c) => c.email === email)
      if (!user) {
        user = { ...mockCustomers[0], email, name: email.split("@")[0] }
      }
    } else if (role === "worker") {
      const worker = workers.find((w) => w.email === email)
      if (worker) {
        user = worker
      } else {
        user = { ...mockWorkers[0], email, name: email.split("@")[0] }
      }
    } else if (role === "admin") {
      user = admins.find((a) => a.email === email)
      if (!user) {
        user = { ...mockAdmins[0], email, name: email.split("@")[0] }
      }
    }

    if (!user) {
      throw new Error("Invalid credentials")
    }

    return {
      user,
      token: `mock_token_${role}_${Date.now()}`,
    }
  }

  // Real API calls
  const endpoints: Record<UserRole, string> = {
    customer: "/oauth/user/token",
    worker: "/oauth/worker/token",
    admin: "/oauth/admin/token",
  }

  return apiFetch(endpoints[role], {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function signup(
  email: string,
  password: string,
  name: string,
  role: UserRole,
): Promise<{ user: User; token: string }> {
  await delay(500)

  if (USE_MOCK_API) {
    const newUser: User = {
      id: generateId(role === "customer" ? "cust" : role === "worker" ? "work" : "admin"),
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    }

    if (role === "customer") {
      customers.push(newUser)
    } else if (role === "worker") {
      const newWorker: Worker = {
        ...newUser,
        capabilities: [],
        status: { workerId: newUser.id, isOnline: false, lastUpdated: new Date().toISOString() },
        rating: 0,
        totalJobs: 0,
      }
      workers.push(newWorker)
    } else {
      admins.push(newUser)
    }

    return {
      user: newUser,
      token: `mock_token_${role}_${Date.now()}`,
    }
  }

  const endpoints: Record<UserRole, string> = {
    customer: "/users/signup",
    worker: "/Workers/signup",
    admin: "/admin/signup",
  }

  return apiFetch(endpoints[role], {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  })
}

// ==================== PROFILE API ====================

export async function getProfile(role: UserRole, userId: string): Promise<User | Worker> {
  await delay(300)

  if (USE_MOCK_API) {
    if (role === "customer") {
      return customers.find((c) => c.id === userId) || mockCustomers[0]
    } else if (role === "worker") {
      return workers.find((w) => w.id === userId) || mockWorkers[0]
    } else {
      return admins.find((a) => a.id === userId) || mockAdmins[0]
    }
  }

  const endpoints: Record<UserRole, string> = {
    customer: "/users/Profile_details",
    worker: "/Workers/Profile_details",
    admin: "/admin/Profile_details",
  }

  return apiFetch(endpoints[role])
}

export async function updateProfile(role: UserRole, userId: string, data: { name?: string }): Promise<User> {
  await delay(300)

  if (USE_MOCK_API) {
    if (role === "customer") {
      const index = customers.findIndex((c) => c.id === userId)
      if (index !== -1) {
        customers[index] = { ...customers[index], ...data }
        return customers[index]
      }
    } else if (role === "worker") {
      const index = workers.findIndex((w) => w.id === userId)
      if (index !== -1) {
        workers[index] = { ...workers[index], ...data }
        return workers[index]
      }
    }
    throw new Error("User not found")
  }

  const endpoints: Record<UserRole, string> = {
    customer: "/users/update_name",
    worker: "/Workers/update_name",
    admin: "/admin/update_name",
  }

  return apiFetch(endpoints[role], {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// ==================== CUSTOMER API ====================

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return categories
  }

  return apiFetch("/users/service_categories")
}

export async function getAddresses(userId: string): Promise<Address[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return addresses.filter((a) => a.userId === userId)
  }

  return apiFetch("/users/location_details")
}

export async function addAddress(userId: string, address: Omit<Address, "id" | "userId">): Promise<Address> {
  await delay(300)

  if (USE_MOCK_API) {
    const newAddress: Address = {
      ...address,
      id: generateId("addr"),
      userId,
    }
    addresses.push(newAddress)
    return newAddress
  }

  return apiFetch("/users/AddAddress", {
    method: "POST",
    body: JSON.stringify(address),
  })
}

export async function updateAddress(addressId: string, data: Partial<Address>): Promise<Address> {
  await delay(300)

  if (USE_MOCK_API) {
    const index = addresses.findIndex((a) => a.id === addressId)
    if (index !== -1) {
      addresses[index] = { ...addresses[index], ...data }
      return addresses[index]
    }
    throw new Error("Address not found")
  }

  return apiFetch("/users/update_location_details", {
    method: "POST",
    body: JSON.stringify({ addressId, ...data }),
  })
}

export async function createServiceRequest(data: {
  customerId: string
  categoryId: string
  addressId: string
  description: string
}): Promise<ServiceRequest> {
  await delay(500)

  if (USE_MOCK_API) {
    const category = categories.find((c) => c.id === data.categoryId)
    const address = addresses.find((a) => a.id === data.addressId)

    if (!category || !address) {
      throw new Error("Invalid category or address")
    }

    const newRequest: ServiceRequest = {
      id: generateId("job"),
      customerId: data.customerId,
      categoryId: data.categoryId,
      categoryName: category.name,
      addressId: data.addressId,
      address,
      description: data.description,
      status: "pending",
      price: category.basePrice + Math.floor(Math.random() * 50),
      otp: generateOTP(),
      createdAt: new Date().toISOString(),
    }

    serviceRequests.push(newRequest)
    return newRequest
  }

  return apiFetch("/users/serviceRequest", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getBookingHistory(customerId: string): Promise<ServiceRequest[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return serviceRequests.filter((r) => r.customerId === customerId)
  }

  return apiFetch("/users/history")
}

export async function cancelJob(jobId: string): Promise<ServiceRequest> {
  await delay(300)

  if (USE_MOCK_API) {
    const index = serviceRequests.findIndex((r) => r.id === jobId)
    if (index !== -1) {
      serviceRequests[index].status = "cancelled"
      return serviceRequests[index]
    }
    throw new Error("Job not found")
  }

  return apiFetch("/users/cancel-job", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  })
}

export async function makePayment(jobId: string, amount: number): Promise<Payment> {
  await delay(500)

  if (USE_MOCK_API) {
    const job = serviceRequests.find((r) => r.id === jobId)
    if (!job) throw new Error("Job not found")

    const newPayment: Payment = {
      id: generateId("pay"),
      jobId,
      customerId: job.customerId,
      workerId: job.workerId || "",
      amount,
      status: "completed",
      createdAt: new Date().toISOString(),
    }

    payments.push(newPayment)
    return newPayment
  }

  return apiFetch("/users/make_payment", {
    method: "POST",
    body: JSON.stringify({ jobId, amount }),
  })
}

export async function getPaymentHistory(customerId: string): Promise<Payment[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return payments.filter((p) => p.customerId === customerId)
  }

  return apiFetch("/users/paymentHistory")
}

export async function submitReview(data: {
  jobId: string
  customerId: string
  workerId: string
  rating: number
  comment: string
}): Promise<Review> {
  await delay(300)

  if (USE_MOCK_API) {
    const newReview: Review = {
      id: generateId("rev"),
      ...data,
      createdAt: new Date().toISOString(),
    }

    reviews.push(newReview)

    // Update worker rating
    const workerIndex = workers.findIndex((w) => w.id === data.workerId)
    if (workerIndex !== -1) {
      const workerReviews = reviews.filter((r) => r.workerId === data.workerId)
      const avgRating = workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length
      workers[workerIndex].rating = Math.round(avgRating * 10) / 10
    }

    return newReview
  }

  return apiFetch("/users/review", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function aiChat(message: string): Promise<{ response: string }> {
  await delay(800)

  if (USE_MOCK_API) {
    const responses = [
      "I'd be happy to help you with your service booking! What type of service are you looking for?",
      "Based on your request, I recommend our plumbing service. Would you like me to help you book an appointment?",
      "Our workers are highly rated professionals. You can view their ratings and reviews before booking.",
      "You can track your service request in real-time once a worker accepts it.",
    ]
    return { response: responses[Math.floor(Math.random() * responses.length)] }
  }

  return apiFetch("/users/AIChat", {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}

// ==================== WORKER API ====================

export async function addWorkerCapability(workerId: string, categoryId: string): Promise<WorkerCapability> {
  await delay(300)

  if (USE_MOCK_API) {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) throw new Error("Category not found")

    const newCapability: WorkerCapability = {
      id: generateId("cap"),
      workerId,
      categoryId,
      categoryName: category.name,
    }

    const workerIndex = workers.findIndex((w) => w.id === workerId)
    if (workerIndex !== -1) {
      workers[workerIndex].capabilities.push(newCapability)
    }

    return newCapability
  }

  return apiFetch("/Workers/AddWorkerCapability", {
    method: "POST",
    body: JSON.stringify({ categoryId }),
  })
}

export async function updateWorkerStatus(
  workerId: string,
  isOnline: boolean,
  lat?: number,
  lng?: number,
): Promise<void> {
  await delay(300)

  if (USE_MOCK_API) {
    const workerIndex = workers.findIndex((w) => w.id === workerId)
    if (workerIndex !== -1) {
      workers[workerIndex].status = {
        workerId,
        isOnline,
        lat,
        lng,
        lastUpdated: new Date().toISOString(),
      }
    }
    return
  }

  await apiFetch("/Workers/workerStatus", {
    method: "POST",
    body: JSON.stringify({ isOnline, lat, lng }),
  })
}

export async function getWorkerRating(workerId: string): Promise<{ rating: number; totalReviews: number }> {
  await delay(300)

  if (USE_MOCK_API) {
    const worker = workers.find((w) => w.id === workerId)
    const workerReviews = reviews.filter((r) => r.workerId === workerId)
    return {
      rating: worker?.rating || 0,
      totalReviews: workerReviews.length,
    }
  }

  return apiFetch("/Workers/rating")
}

export async function getTodaysEarnings(workerId: string): Promise<{ amount: number; jobs: number }> {
  await delay(300)

  if (USE_MOCK_API) {
    const today = new Date().toISOString().split("T")[0]
    const todayPayments = payments.filter((p) => p.workerId === workerId && p.createdAt.startsWith(today))
    return {
      amount: todayPayments.reduce((sum, p) => sum + p.amount, 0),
      jobs: todayPayments.length,
    }
  }

  return apiFetch("/Workers/todays_earning")
}

export async function getMonthlyEarnings(workerId: string): Promise<{ amount: number; jobs: number }> {
  await delay(300)

  if (USE_MOCK_API) {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthPayments = payments.filter((p) => p.workerId === workerId && p.createdAt.startsWith(thisMonth))
    return {
      amount: monthPayments.reduce((sum, p) => sum + p.amount, 0) + 2500, // Add some mock data
      jobs: monthPayments.length + 35,
    }
  }

  return apiFetch("/Workers/monthly_earning")
}

export async function getCompletedJobs(workerId: string): Promise<ServiceRequest[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return serviceRequests.filter((r) => r.workerId === workerId && r.status === "completed")
  }

  return apiFetch("/Workers/Jobs_completed")
}

export async function getWorkerActiveJobs(workerId: string): Promise<ServiceRequest[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return serviceRequests.filter(
      (r) => r.workerId === workerId && (r.status === "accepted" || r.status === "in_progress"),
    )
  }

  return apiFetch("/Workers/active_jobs")
}

export async function getPendingJobs(): Promise<ServiceRequest[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return serviceRequests.filter((r) => r.status === "pending")
  }

  return apiFetch("/Workers/pending_jobs")
}

export async function acceptJob(workerId: string, jobId: string): Promise<ServiceRequest> {
  await delay(400)

  if (USE_MOCK_API) {
    const index = serviceRequests.findIndex((r) => r.id === jobId)
    if (index !== -1) {
      const worker = workers.find((w) => w.id === workerId)
      serviceRequests[index].status = "accepted"
      serviceRequests[index].workerId = workerId
      serviceRequests[index].workerName = worker?.name
      return serviceRequests[index]
    }
    throw new Error("Job not found")
  }

  return apiFetch("/Workers/accept_job", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  })
}

export async function completeJob(workerId: string, jobId: string, otp: string): Promise<ServiceRequest> {
  await delay(500)

  if (USE_MOCK_API) {
    const index = serviceRequests.findIndex((r) => r.id === jobId)
    if (index === -1) throw new Error("Job not found")

    if (serviceRequests[index].otp !== otp) {
      throw new Error("Invalid OTP")
    }

    serviceRequests[index].status = "completed"
    serviceRequests[index].completedAt = new Date().toISOString()

    // Update worker stats
    const workerIndex = workers.findIndex((w) => w.id === workerId)
    if (workerIndex !== -1) {
      workers[workerIndex].totalJobs++
    }

    return serviceRequests[index]
  }

  return apiFetch("/Workers/workcompleted", {
    method: "POST",
    body: JSON.stringify({ jobId, otp }),
  })
}

export async function workerCancelJob(workerId: string, jobId: string): Promise<ServiceRequest> {
  await delay(300)

  if (USE_MOCK_API) {
    const index = serviceRequests.findIndex((r) => r.id === jobId)
    if (index !== -1) {
      serviceRequests[index].status = "pending"
      serviceRequests[index].workerId = undefined
      serviceRequests[index].workerName = undefined
      return serviceRequests[index]
    }
    throw new Error("Job not found")
  }

  return apiFetch("/Workers/CancellJob", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  })
}

// ==================== ADMIN API ====================

export async function addServiceCategory(data: Omit<ServiceCategory, "id">): Promise<ServiceCategory> {
  await delay(300)

  if (USE_MOCK_API) {
    const newCategory: ServiceCategory = {
      id: generateId("cat"),
      ...data,
    }
    categories.push(newCategory)
    return newCategory
  }

  return apiFetch("/admin/AddService_Categories", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getAdminServiceCategories(): Promise<ServiceCategory[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return categories
  }

  return apiFetch("/admin/Service_categories")
}

export async function getAdminWorkers(): Promise<Worker[]> {
  await delay(300)

  if (USE_MOCK_API) {
    return workers
  }

  return apiFetch("/admin/workers")
}

export async function deleteWorker(workerId: string): Promise<void> {
  await delay(300)

  if (USE_MOCK_API) {
    workers = workers.filter((w) => w.id !== workerId)
    return
  }

  await apiFetch(`/admin/DeleteWorker`, {
    method: "DELETE",
    body: JSON.stringify({ workerId }),
  })
}

export async function getWorkerDetails(workerId: string): Promise<Worker> {
  await delay(300)

  if (USE_MOCK_API) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) throw new Error("Worker not found")
    return worker
  }

  return apiFetch(`/admin/GetWorkerDetails?workerId=${workerId}`)
}

export async function getWorkerLocation(workerId: string): Promise<{ lat: number; lng: number; lastUpdated: string }> {
  await delay(300)

  if (USE_MOCK_API) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) throw new Error("Worker not found")
    return {
      lat: worker.status.lat || 40.7128,
      lng: worker.status.lng || -74.006,
      lastUpdated: worker.status.lastUpdated,
    }
  }

  return apiFetch(`/admin/WhereIsWorker?workerId=${workerId}`)
}

export async function getTodayRevenue(): Promise<{ amount: number; transactions: number }> {
  await delay(300)

  if (USE_MOCK_API) {
    const today = new Date().toISOString().split("T")[0]
    const todayPayments = payments.filter((p) => p.createdAt.startsWith(today))
    return {
      amount: todayPayments.reduce((sum, p) => sum + p.amount, 0) + 850,
      transactions: todayPayments.length + 12,
    }
  }

  return apiFetch("/admin/TodayRevenue")
}

export async function getMonthlyRevenue(): Promise<{ amount: number; transactions: number }> {
  await delay(300)

  if (USE_MOCK_API) {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthPayments = payments.filter((p) => p.createdAt.startsWith(thisMonth))
    return {
      amount: monthPayments.reduce((sum, p) => sum + p.amount, 0) + 24500,
      transactions: monthPayments.length + 342,
    }
  }

  return apiFetch("/admin/MonthlyRevenue")
}
