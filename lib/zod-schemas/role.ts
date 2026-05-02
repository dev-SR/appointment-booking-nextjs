import { z } from "zod"

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-z0-9_]+$/, "Name can only contain lowercase letters, numbers, and underscores"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters"),
  permissionIds: z.array(z.string()).optional().default([]),
})

export const updateRoleSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters"),
  permissionIds: z.array(z.string()).optional().default([]),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
