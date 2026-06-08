"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { toast } from "sonner";
import { Loader2, Camera, Save } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  email: string;
  initialUsername: string | null;
  initialAvatarUrl: string | null;
};

export function AccountForm({ email, initialUsername, initialAvatarUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(initialUsername ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAvatarUrl(data.url);
    } catch (err: any) {
      toast.error(err.message);
      setAvatarPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        username: username.trim() || null,
        avatarUrl: avatarUrl,
      };
      if (password) body.password = password;

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Account updated");
      setPassword("");
      setConfirmPassword("");
      // Refresh the page so the navbar reflects the new session
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-lg">
      {/* Avatar */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Profile picture</Label>
        <div className="flex items-center gap-4">
          <div className="relative">
            <AvatarCircle src={displayAvatar} name={username || email} size={72} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 rounded-full bg-zinc-800 dark:bg-zinc-200 p-1.5 cursor-pointer hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 text-white dark:text-zinc-900 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-white dark:text-zinc-900" />
              )}
            </button>
          </div>
          <div className="text-sm text-zinc-500">
            <p>{uploading ? "Uploading…" : "Click the camera icon to change"}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Max 2 MB · JPG, PNG, WebP</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</Label>
        <Input
          value={email}
          disabled
          className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
        />
        <p className="text-xs text-zinc-400">Email cannot be changed here. Contact your admin.</p>
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
        </Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your display name"
          className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
        />
        <p className="text-xs text-zinc-400">Shown in the navbar and as "Comment By" on prospects.</p>
      </div>

      {/* Password change */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Change password</h3>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirm new password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving || uploading}
        className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium cursor-pointer"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save changes
          </>
        )}
      </Button>
    </form>
  );
}
