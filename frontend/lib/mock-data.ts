import type { User, Address, ServiceCategory, ServiceRequest, Worker, Payment, Review } from "./types"

// Mock Users
export const mockCustomers: User[] = [
  {
    id: "cust_1",
    email: "john@example.com",
    name: "John Doe",
    avatar: "/male-avatar.png",
    role: "customer",
    phone: "+1234567890",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cust_2",
    email: "jane@example.com",
    name: "Jane Smith",
    avatar: "/diverse-female-avatar.png",
    role: "customer",
    phone: "+1234567891",
    createdAt: "2024-02-20T10:00:00Z",
  },
]

export const mockWorkers: Worker[] = [
  {
    id: "work_1",
    email: "mike@example.com",
    name: "Mike Johnson",
    avatar: "/worker-male-avatar.jpg",
    role: "worker",
    phone: "+1234567892",
    createdAt: "2024-01-10T10:00:00Z",
    capabilities: [
      { id: "cap_1", workerId: "work_1", categoryId: "cat_1", categoryName: "Plumbing" },
      { id: "cap_2", workerId: "work_1", categoryId: "cat_2", categoryName: "Electrical" },
    ],
    status: {
      workerId: "work_1",
      isOnline: true,
      lat: 40.7128,
      lng: -74.006,
      lastUpdated: new Date().toISOString(),
    },
    rating: 4.8,
    totalJobs: 156,
  },
  {
    id: "work_2",
    email: "sarah@example.com",
    name: "Sarah Williams",
    avatar: "/worker-female-avatar.jpg",
    role: "worker",
    phone: "+1234567893",
    createdAt: "2024-01-12T10:00:00Z",
    capabilities: [
      { id: "cap_3", workerId: "work_2", categoryId: "cat_3", categoryName: "Cleaning" },
      { id: "cap_4", workerId: "work_2", categoryId: "cat_4", categoryName: "AC Repair" },
    ],
    status: {
      workerId: "work_2",
      isOnline: false,
      lat: 40.758,
      lng: -73.9855,
      lastUpdated: new Date().toISOString(),
    },
    rating: 4.9,
    totalJobs: 203,
  },
]

export const mockAdmins: User[] = [
  {
    id: "admin_1",
    email: "admin@example.com",
    name: "Admin User",
    avatar: "/admin-avatar.png",
    role: "admin",
    createdAt: "2024-01-01T10:00:00Z",
  },
]

// Mock Service Categories
export const mockServiceCategories: ServiceCategory[] = [
  {
    id: "cat_1",
    name: "Plumbing",
    description: "Pipe repairs, installations, and maintenance",
    icon: "wrench",
    basePrice: 50,
  },
  { id: "cat_2", name: "Electrical", description: "Wiring, repairs, and installations", icon: "zap", basePrice: 60 },
  { id: "cat_3", name: "Cleaning", description: "Home and office cleaning services", icon: "sparkles", basePrice: 40 },
  { id: "cat_4", name: "AC Repair", description: "Air conditioning service and repair", icon: "wind", basePrice: 75 },
  { id: "cat_5", name: "Carpentry", description: "Furniture repair and woodwork", icon: "hammer", basePrice: 55 },
  { id: "cat_6", name: "Painting", description: "Interior and exterior painting", icon: "paintbrush", basePrice: 45 },
]

// Mock Addresses
export const mockAddresses: Address[] = [
  {
    id: "addr_1",
    userId: "cust_1",
    label: "Home",
    street: "123 Main Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    isDefault: true,
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "addr_2",
    userId: "cust_1",
    label: "Office",
    street: "456 Business Ave",
    city: "New York",
    state: "NY",
    zipCode: "10002",
    isDefault: false,
    lat: 40.758,
    lng: -73.9855,
  },
]

// Mock Service Requests
export const mockServiceRequests: ServiceRequest[] = [
  {
    id: "job_1",
    customerId: "cust_1",
    categoryId: "cat_1",
    categoryName: "Plumbing",
    addressId: "addr_1",
    address: mockAddresses[0],
    description: "Leaky faucet in kitchen",
    status: "completed",
    workerId: "work_1",
    workerName: "Mike Johnson",
    price: 75,
    otp: "1234",
    createdAt: "2024-12-01T10:00:00Z",
    completedAt: "2024-12-01T12:00:00Z",
  },
  {
    id: "job_2",
    customerId: "cust_1",
    categoryId: "cat_2",
    categoryName: "Electrical",
    addressId: "addr_2",
    address: mockAddresses[1],
    description: "Install new light fixtures",
    status: "in_progress",
    workerId: "work_1",
    workerName: "Mike Johnson",
    price: 120,
    otp: "5678",
    createdAt: "2024-12-15T14:00:00Z",
  },
  {
    id: "job_3",
    customerId: "cust_1",
    categoryId: "cat_3",
    categoryName: "Cleaning",
    addressId: "addr_1",
    address: mockAddresses[0],
    description: "Deep clean living room",
    status: "pending",
    price: 80,
    createdAt: "2024-12-20T09:00:00Z",
  },
]

// Mock Payments
export const mockPayments: Payment[] = [
  {
    id: "pay_1",
    jobId: "job_1",
    customerId: "cust_1",
    workerId: "work_1",
    amount: 75,
    status: "completed",
    createdAt: "2024-12-01T12:00:00Z",
  },
]

// Mock Reviews
export const mockReviews: Review[] = [
  {
    id: "rev_1",
    jobId: "job_1",
    customerId: "cust_1",
    workerId: "work_1",
    rating: 5,
    comment: "Excellent work! Fixed the leak quickly.",
    createdAt: "2024-12-01T13:00:00Z",
  },
]

// Helper function to generate OTP
export function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Helper function to generate unique ID
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
