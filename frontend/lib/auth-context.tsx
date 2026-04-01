"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import {
  login as apiLogin,
  signupUser,
  signupWorker,
  getUserProfile,
  getWorkerProfile,
  storeToken,
  removeToken,
  getStoredToken,
  type UserRole,
  type UserProfile,
  type LoginResponse,
} from "./api"

export interface User {
  id: number
  email: string
  name: string
  phone?: string
  dob?: string
  role: UserRole
  workerId?: number
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  role: UserRole | null
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, role: UserRole) => Promise<void>
  signup: (data: {
    email: string
    password: string
    name: string
    phone: string
    dob: string
    role: UserRole
  }) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_STORAGE_KEY = "service_booking_auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    role: null,
    isLoading: true,
  })

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
      const token = getStoredToken()

      if (storedAuth && token) {
        try {
          const parsed = JSON.parse(storedAuth)
          setAuthState({
            ...parsed,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          removeToken()
          localStorage.removeItem(AUTH_STORAGE_KEY)
          setAuthState((prev) => ({ ...prev, isLoading: false }))
        }
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      }
    }
    loadAuth()
  }, [])

  const saveAuthState = useCallback((user: User, token: string, role: UserRole) => {
    storeToken(token)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, role }))
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      role,
      isLoading: false,
    })
  }, [])

  const login = useCallback(
    async (email: string, password: string, role: UserRole) => {
      const result: LoginResponse = await apiLogin(email, password, role)
      storeToken(result.access_token)

      // Fetch user profile after login
      let profile: UserProfile | null = null
      try {
        if (role === "customer") {
          profile = await getUserProfile()
        } else if (role === "worker") {
          profile = await getWorkerProfile()
        }
      } catch {
        // Profile fetch failed, use email as name
      }

      const user: User = {
        id: result.user_id || 0,
        email,
        name: profile?.name || email.split("@")[0],
        phone: profile?.phone,
        dob: profile?.dob,
        role,
        workerId: result.worker_id, // CRITICAL: This is used for worker WebSocket
      }

      console.log("[v0] Login successful, user:", user)
      saveAuthState(user, result.access_token, role)
    },
    [saveAuthState],
  )

  const signup = useCallback(
    async (data: {
      email: string
      password: string
      name: string
      phone: string
      dob: string
      role: UserRole
    }) => {
      let userId: number

      if (data.role === "customer") {
        userId = await signupUser({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          dob: data.dob,
        })
      } else if (data.role === "worker") {
        userId = await signupWorker({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          dob: data.dob,
        })
      } else {
        throw new Error("Admin signup not supported")
      }

      // Auto-login after signup
      const loginResult: LoginResponse = await apiLogin(data.email, data.password, data.role)

      const user: User = {
        id: userId,
        email: data.email,
        name: data.name,
        phone: data.phone,
        dob: data.dob,
        role: data.role,
        workerId: loginResult.worker_id,
      }

      saveAuthState(user, loginResult.access_token, data.role)
    },
    [saveAuthState],
  )

  const logout = useCallback(() => {
    removeToken()
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
      isLoading: false,
    })
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState((prev) => {
      if (!prev.user) return prev
      const updatedUser = { ...prev.user, ...updates }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: updatedUser, role: prev.role }))
      return { ...prev, user: updatedUser }
    })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (authState.role === "customer") {
      const profile = await getUserProfile()
      updateUser({
        name: profile.name,
        phone: profile.phone,
        dob: profile.dob,
      })
    } else if (authState.role === "worker") {
      const profile = await getWorkerProfile()
      updateUser({
        name: profile.name,
        phone: profile.phone,
        dob: profile.dob,
      })
    }
  }, [authState.role, updateUser])

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        signup,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
