import { z } from "zod"

export const createPermissionSchema = z.object({
  key: z
    .string()
    .min(3, "Key must be at least 3 characters")
    .max(100, "Key must be less than 100 characters")
    .regex(/^[a-z0-9:]+$/, "Key can only contain lowercase letters, numbers, and colons (e.g., resource:action:scope)"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
  group: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name must be less than 50 characters"),
  description: z.string().max(255, "Description is too long").optional(),
})

export const updatePermissionSchema = z.object({
  key: z
    .string()
    .min(3, "Key must be at least 3 characters")
    .max(100, "Key must be less than 100 characters")
    .regex(/^[a-z0-9:]+$/, "Key can only contain lowercase letters, numbers, and colons (e.g., resource:action:scope)"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
  group: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name must be less than 50 characters"),
  description: z.string().max(255, "Description is too long").optional(),
})

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>
