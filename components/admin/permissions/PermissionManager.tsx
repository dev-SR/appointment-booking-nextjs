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
import { toast } from "sonner"
import { Plus, Edit2, Trash2 } from "lucide-react"

type Permission = {
  id: string
  key: string
  displayName: string
  group: string
  description?: string | null
}

interface PermissionManagerProps {
  permissions: Permission[]
}

export function PermissionManager({ permissions }: PermissionManagerProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  )
  const [formData, setFormData] = useState({
    key: "",
    displayName: "",
    group: "",
    description: "",
  })

  const handleOpenCreate = () => {
    setEditingPermission(null)
    setFormData({ key: "", displayName: "", group: "", description: "" })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (permission: Permission) => {
    setEditingPermission(permission)
    setFormData({
      key: permission.key,
      displayName: permission.displayName,
      group: permission.group,
      description: permission.description || "",
    })
    setIsModalOpen(true)
  }

  const handleOpenDelete = (permission: Permission) => {
    setEditingPermission(permission)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.key || !formData.displayName || !formData.group) {
      toast.error("Key, Display Name, and Group are required")
      return
    }

    setIsLoading(true)
    try {
      const isEditing = !!editingPermission
      const url = isEditing
        ? `/api/permissions/${editingPermission.id}`
        : "/api/permissions"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save permission")
      }

      toast.success(
        isEditing
          ? "Permission updated successfully"
          : "Permission created successfully"
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
    if (!editingPermission) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/permissions/${editingPermission.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete permission")
      }

      toast.success("Permission deleted successfully")
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
          <h2 className="text-xl font-semibold">Managed Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Create or edit system permissions for fine-grained access control.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Permission
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-xs">
                    {permission.key}
                  </code>
                </TableCell>
                <TableCell className="font-medium">
                  {permission.displayName}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{permission.group}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(permission)}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="sr-only">Edit permission</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(permission)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete permission</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {permissions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No permissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="flex max-h-[90vh] w-[95%] flex-col sm:w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? "Edit Permission" : "Create Permission"}
            </DialogTitle>
            <DialogDescription>
              {editingPermission
                ? "Update the details for this permission key."
                : "Create a new permission key to assign to roles."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="key">Permission Key</Label>
              <Input
                id="key"
                placeholder="e.g., resource:action:scope"
                value={formData.key}
                onChange={(e) =>
                  setFormData({ ...formData, key: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Follows the format resource:action:scope (e.g.,
                appointments:read:all)
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Read All Appointments"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">UI Group</Label>
                <Input
                  id="group"
                  placeholder="e.g., Appointments"
                  value={formData.group}
                  onChange={(e) =>
                    setFormData({ ...formData, group: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of what this permission grants..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Permission"}
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
            <AlertDialogTitle>Delete Permission?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{editingPermission?.key}</strong>? This will permanently
              remove it from the system and from all roles that currently have
              it assigned.
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
              {isLoading ? "Deleting..." : "Delete Permission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
