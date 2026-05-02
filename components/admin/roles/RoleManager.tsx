"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Plus, Edit2, Trash2 } from "lucide-react"

// Types matching the Prisma output
type Role = {
  id: string
  name: string
  displayName: string
  isSystem: boolean
  rolePermissions: { permission: { id: string; key: string } }[]
  _count: { userRoles: number }
}

type Permission = {
  id: string
  key: string
  displayName: string
  group: string
}

interface RoleManagerProps {
  roles: Role[]
  permissions: Permission[]
}

export function RoleManager({ roles, permissions }: RoleManagerProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Current editing state
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  )

  const groups = Array.from(new Set(permissions.map((p) => p.group)))

  const handleOpenCreate = () => {
    setEditingRole(null)
    setFormData({ name: "", displayName: "" })
    setSelectedPermissions(new Set())
    setIsModalOpen(true)
  }

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({ name: role.name, displayName: role.displayName })
    setSelectedPermissions(
      new Set(role.rolePermissions.map((rp) => rp.permission.id))
    )
    setIsModalOpen(true)
  }

  const handleOpenDelete = (role: Role) => {
    setEditingRole(role)
    setIsDeleteDialogOpen(true)
  }

  const handleTogglePermission = (permissionId: string) => {
    const newSelection = new Set(selectedPermissions)
    if (newSelection.has(permissionId)) {
      newSelection.delete(permissionId)
    } else {
      newSelection.add(permissionId)
    }
    setSelectedPermissions(newSelection)
  }

  const handleSave = async () => {
    if (!formData.displayName) {
      toast.error("Display name is required")
      return
    }
    if (!editingRole && !formData.name) {
      toast.error("Role name is required for new roles")
      return
    }

    setIsLoading(true)
    try {
      const isEditing = !!editingRole
      const url = isEditing ? `/api/roles/${editingRole.id}` : "/api/roles"
      const method = isEditing ? "PUT" : "POST"
      const body = {
        name: isEditing ? undefined : formData.name,
        displayName: formData.displayName,
        permissionIds: Array.from(selectedPermissions),
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save role")
      }

      toast.success(
        isEditing ? "Role updated successfully" : "Role created successfully"
      )
      setIsModalOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingRole) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete role")
      }

      toast.success("Role deleted successfully")
      setIsDeleteDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Managed Roles</h2>
          <p className="text-sm text-muted-foreground">
            Create custom roles and assign granular permissions.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <p className="font-medium">{role.displayName}</p>
                  <p className="text-xs text-muted-foreground">{role.name}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={role.isSystem ? "secondary" : "outline"}>
                    {role.isSystem ? "System" : "Custom"}
                  </Badge>
                </TableCell>
                <TableCell>{role.rolePermissions.length}</TableCell>
                <TableCell>{role._count.userRoles}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(role)}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="sr-only">Edit role</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(role)}
                      disabled={role.isSystem || role._count.userRoles > 0}
                      className={
                        role.isSystem || role._count.userRoles > 0
                          ? "opacity-50"
                          : "text-destructive hover:text-destructive"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete role</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="flex max-h-[90vh] w-[95%] flex-col sm:w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Update the display name and assigned permissions for this role."
                : "Create a new role with specific permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">System Name (ID)</Label>
                <Input
                  id="name"
                  placeholder="e.g., senior_doctor"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!!editingRole}
                />
                {!editingRole && (
                  <p className="text-xs text-muted-foreground">
                    Lowercase, numbers, and underscores only.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Senior Doctor"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="border-b pb-2 text-lg font-semibold">
                Permissions
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                {groups.map((group) => (
                  <div key={group} className="space-y-3 rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">{group}</h4>
                    <div className="space-y-2">
                      {permissions
                        .filter((p) => p.group === group)
                        .map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={selectedPermissions.has(permission.id)}
                              onCheckedChange={() =>
                                handleTogglePermission(permission.id)
                              }
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`perm-${permission.id}`}
                                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.displayName}
                              </label>
                              <p className="font-mono text-[0.8rem] text-muted-foreground">
                                {permission.key}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{editingRole?.displayName}</strong> role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isLoading}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
