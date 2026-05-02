"use client"

/**
 * Auth Store (Zustand)
 *
 * Manages authentication state and user permissions on the client side
 * Permissions are loaded on login and stored as a Set<string>
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface User {
  id: string
  phone: string
  email?: string | null
  nameEn: string
  nameBn?: string | null
  profileImageUrl?: string | null
  preferredLocale: string
}

interface AuthState {
  // State
  user: User | null
  permissions: Set<string>
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  setUser: (user: User | null) => void
  setPermissions: (permissions: string[]) => void
  setLoading: (loading: boolean) => void
  login: (user: User, permissions: string[]) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

import { type PersistStorage } from "zustand/middleware"

// Custom storage to handle Set serialization
const customStorage: PersistStorage<any> = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name)
    if (!str) return null

    try {
      const data = JSON.parse(str)
      // Convert permissions array back to Set
      if (data.state?.permissions) {
        data.state.permissions = new Set(data.state.permissions)
      }
      return data
    } catch {
      return null
    }
  },
  setItem: (name: string, value: any) => {
    const serializable = {
      ...value,
      state: {
        ...value.state,
        // Convert Set to array for JSON serialization
        permissions: Array.from(value.state.permissions || []),
      },
    }
    localStorage.setItem(name, JSON.stringify(serializable))
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      permissions: new Set(),
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setPermissions: (permissions) =>
        set({
          permissions: new Set(permissions),
        }),

      setLoading: (isLoading) => set({ isLoading }),

      login: (user, permissions) =>
        set({
          user,
          permissions: new Set(permissions),
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          user: null,
          permissions: new Set(),
          isAuthenticated: false,
          isLoading: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "auth-storage",
      storage: customStorage,
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
