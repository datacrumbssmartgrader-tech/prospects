import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import {
  updateUserRole,
  updateUserPassword,
  updateUserEmail,
  updateUserUsername,
  updateUserAvatar,
  deleteUser,
  findUserByEmail,
} from "@/lib/db";
import bcrypt from "bcryptjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const verified = await decrypt(session);
  if (!verified || (verified as any).role !== "admin") return null;
  return verified;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await request.json();
    const { email, role, password, avatarUrl, username } = body as {
      email?: string;
      role?: "admin" | "user";
      password?: string;
      avatarUrl?: string;
      username?: string;
    };

    if (email !== undefined) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
      if (!EMAIL_RE.test(trimmed)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      const existing = await findUserByEmail(trimmed);
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Email already taken" }, { status: 409 });
      }
      await updateUserEmail(userId, trimmed);
    }

    if (role) {
      if (!["admin", "user"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      await updateUserRole(userId, role);
    }

    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ error: "Password too short" }, { status: 400 });
      }
      const hash = await bcrypt.hash(password, 10);
      await updateUserPassword(userId, hash);
    }

    if (avatarUrl !== undefined) {
      await updateUserAvatar(userId, avatarUrl);
    }

    if (username !== undefined) {
      await updateUserUsername(userId, username.trim());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteUser(parseInt(id, 10));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
