import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";
import { updateUserRole, updateUserPassword, updateUsername, deleteUser, findUserByUsername } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    const { username, role, password } = body as {
      username?: string;
      role?: "admin" | "user";
      password?: string;
    };

    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      const existing = await findUserByUsername(trimmed);
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      await updateUsername(userId, trimmed);
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
