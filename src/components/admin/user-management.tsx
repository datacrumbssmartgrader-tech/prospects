"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarCircle } from "@/components/ui/avatar-circle";
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
import { Loader2, UserPlus, Pencil, Trash2, Check, X, Camera } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AppUser = {
  id: number;
  email: string;
  username: string | null;
  role: "admin" | "user";
  avatar_url: string | null;
  created_at: string;
};

type EditState = {
  email: string;
  username: string;
  role: "admin" | "user";
  password: string;
  avatarUrl: string | null;
  avatarPreview: string | null;
  saving: boolean;
};

function AvatarUpload({
  value,
  preview,
  onChange,
}: {
  value: string | null;
  preview: string | null;
  onChange: (url: string, preview: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url, localPreview);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const display = preview ?? value;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <AvatarCircle src={display} size={48} />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 rounded-full bg-zinc-800 dark:bg-zinc-200 p-1 cursor-pointer hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-3 h-3 text-white dark:text-zinc-900 animate-spin" />
          ) : (
            <Camera className="w-3 h-3 text-white dark:text-zinc-900" />
          )}
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <span className="text-xs text-zinc-400">
        {uploading ? "Uploading…" : "Click to upload"}
      </span>
    </div>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({
    email: "",
    username: "",
    role: "user",
    password: "",
    avatarUrl: null,
    avatarPreview: null,
    saving: false,
  });

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
    if (!newEmail.trim() || !newPassword) {
      toast.error("Email and password are required");
      return;
    }
    if (!EMAIL_RE.test(newEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      setCreating(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          username: newUsername.trim() || null,
          password: newPassword,
          role: newRole,
          avatarUrl: newAvatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      toast.success(`Account "${newUsername.trim() || newEmail.trim()}" created`);
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setNewAvatarUrl(null);
      setNewAvatarPreview(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (user: AppUser) => {
    setEditingId(user.id);
    setEditState({
      email: user.email,
      username: user.username ?? "",
      role: user.role,
      password: "",
      avatarUrl: user.avatar_url,
      avatarPreview: null,
      saving: false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState({ email: "", username: "", role: "user", password: "", avatarUrl: null, avatarPreview: null, saving: false });
  };

  const saveEdit = async (userId: number) => {
    if (!EMAIL_RE.test(editState.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    setEditState((s) => ({ ...s, saving: true }));
    try {
      const body: Record<string, unknown> = {
        email: editState.email.trim().toLowerCase(),
        username: editState.username.trim() || null,
        role: editState.role,
      };
      if (editState.password) body.password = editState.password;
      if (editState.avatarUrl !== null) body.avatarUrl = editState.avatarUrl;

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
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Email *</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Username</label>
              <Input
                type="text"
                placeholder="display name"
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
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Profile picture</label>
            <AvatarUpload
              value={newAvatarUrl}
              preview={newAvatarPreview}
              onChange={(url, preview) => {
                setNewAvatarUrl(url);
                setNewAvatarPreview(preview);
              }}
            />
          </div>

          <Button
            type="submit"
            disabled={creating || !newEmail.trim() || !newPassword}
            className="h-9 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium cursor-pointer"
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
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Existing Accounts</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30">
              <TableHead className="w-10" />
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Email</TableHead>
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
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex items-center justify-center text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  No accounts created yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isEditing = editingId === u.id;
                const isDeleting = deletingId === u.id;

                return (
                  <TableRow key={u.id}>
                    {/* Avatar */}
                    <TableCell>
                      {isEditing ? (
                        <AvatarUpload
                          value={editState.avatarUrl}
                          preview={editState.avatarPreview}
                          onChange={(url, preview) =>
                            setEditState((s) => ({ ...s, avatarUrl: url, avatarPreview: preview }))
                          }
                        />
                      ) : (
                        <AvatarCircle src={u.avatar_url} name={u.username ?? u.email} size={32} />
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editState.email}
                          onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))}
                          className="h-8 w-48 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-sm"
                        />
                      ) : (
                        u.email
                      )}
                    </TableCell>

                    {/* Username */}
                    <TableCell className="text-zinc-600 dark:text-zinc-400">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editState.username}
                          placeholder="display name"
                          onChange={(e) => setEditState((s) => ({ ...s, username: e.target.value }))}
                          className="h-8 w-32 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{u.username ?? <span className="text-zinc-400 italic text-xs">—</span>}</span>
                      )}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editState.role}
                          onValueChange={(v) => setEditState((s) => ({ ...s, role: v as "admin" | "user" }))}
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {u.role}
                        </span>
                      )}
                    </TableCell>

                    {/* Password */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="password"
                          placeholder="Leave blank to keep"
                          value={editState.password}
                          onChange={(e) => setEditState((s) => ({ ...s, password: e.target.value }))}
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
                            <Button size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 cursor-pointer"
                              disabled={editState.saving} onClick={() => saveEdit(u.id)}>
                              {editState.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-700 cursor-pointer"
                              disabled={editState.saving} onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                              onClick={() => startEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-500 cursor-pointer"
                              disabled={isDeleting} onClick={() => handleDelete(u.id)}>
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
