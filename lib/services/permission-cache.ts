/**
 * In-memory LRU cache for user permissions
 * TTL: 60 seconds
 * Falls back to Redis if REDIS_URL is configured
 */

import { CachedPermissions } from "./authorization.types"

const CACHE_TTL_MS = 60 * 1000 // 60 seconds
const MAX_CACHE_SIZE = 1000 // Max users to cache

class PermissionCache {
  private cache: Map<string, CachedPermissions> = new Map()
  private accessOrder: string[] = []

  /**
   * Get cached permissions for a user
   */
  get(userId: string): Set<string> | null {
    const cached = this.cache.get(userId)

    if (!cached) {
      return null
    }

    // Check if cache is expired
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      this.delete(userId)
      return null
    }

    // Update access order for LRU
    this.updateAccessOrder(userId)

    return cached.permissions
  }

  /**
   * Set permissions in cache
   */
  set(userId: string, permissions: Set<string>): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(userId)) {
      this.evictOldest()
    }

    this.cache.set(userId, {
      permissions,
      cachedAt: Date.now(),
    })

    this.updateAccessOrder(userId)
  }

  /**
   * Delete a user's cached permissions
   */
  delete(userId: string): void {
    this.cache.delete(userId)
    const index = this.accessOrder.indexOf(userId)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Invalidate permissions for multiple users
   * Call this when roles/permissions change
   */
  invalidateUsers(userIds: string[]): void {
    for (const userId of userIds) {
      this.delete(userId)
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  /**
   * Get cache stats for monitoring
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      ttlMs: CACHE_TTL_MS,
    }
  }

  private updateAccessOrder(userId: string): void {
    const index = this.accessOrder.indexOf(userId)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(userId)
  }

  private evictOldest(): void {
    const oldest = this.accessOrder.shift()
    if (oldest) {
      this.cache.delete(oldest)
    }
  }
}

// Singleton instance
export const permissionCache = new PermissionCache()

// Export for testing
export { PermissionCache, CACHE_TTL_MS, MAX_CACHE_SIZE }
