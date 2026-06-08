"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, UserPlus, Pencil, Trash2, Check, X } from "lucide-react";

type AppUser = {
  id: number;
  username: string;
  role: "admin" | "user";
  created_at: string;
};

type EditState = {
  username: string;
  role: "admin" | "user";
  password: string;
  saving: boolean;
};

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);

  // Edit state: keyed by user id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ username: "", role: "user", password: "", saving: false });

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) {
      toast.error("Username and password are required");
      return;
    }
    try {
      setCreating(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      toast.success(`Account "${newUsername.trim()}" created`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (user: AppUser) => {
    setEditingId(user.id);
    setEditState({ username: user.username, role: user.role, password: "", saving: false });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState({ username: "", role: "user", password: "", saving: false });
  };

  const saveEdit = async (userId: number) => {
    setEditState((s) => ({ ...s, saving: true }));
    try {
      const body: Record<string, string> = {
        username: editState.username,
        role: editState.role,
      };
      if (editState.password) body.password = editState.password;

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      toast.success("Account updated");
      setEditingId(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
      setEditState((s) => ({ ...s, saving: false }));
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      setDeletingId(userId);
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      toast.success("Account deleted");
      setUsers((u) => u.filter((x) => x.id !== userId));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create user form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Create New Account
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Username *</label>
            <Input
              placeholder="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Password *</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Role</label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "user")}>
              <SelectTrigger className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={creating || !newUsername.trim() || !newPassword}
            className="h-9 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium"
          >
            {creating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Existing Accounts
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30">
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Username</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Role</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">New Password</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Created</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex items-center justify-center text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  No accounts created yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isEditing = editingId === u.id;
                const isDeleting = deletingId === u.id;

                return (
                  <TableRow key={u.id}>
                    {/* Username */}
                    <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                      {isEditing ? (
                        <Input
                          value={editState.username}
                          onChange={(e) =>
                            setEditState((s) => ({ ...s, username: e.target.value }))
                          }
                          className="h-8 w-36 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-sm"
                        />
                      ) : (
                        u.username
                      )}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editState.role}
                          onValueChange={(v) =>
                            setEditState((s) => ({ ...s, role: v as "admin" | "user" }))
                          }
                        >
                          <SelectTrigger className="h-8 w-28 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {u.role}
                        </span>
                      )}
                    </TableCell>

                    {/* Password reset */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="password"
                          placeholder="Leave blank to keep"
                          value={editState.password}
                          onChange={(e) =>
                            setEditState((s) => ({ ...s, password: e.target.value }))
                          }
                          className="h-8 w-44 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-sm"
                        />
                      ) : (
                        <span className="text-zinc-400 text-xs italic">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-zinc-500 text-sm hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                              disabled={editState.saving}
                              onClick={() => saveEdit(u.id)}
                            >
                              {editState.saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-700"
                              disabled={editState.saving}
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              onClick={() => startEdit(u)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-500"
                              disabled={isDeleting}
                              onClick={() => handleDelete(u.id)}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
