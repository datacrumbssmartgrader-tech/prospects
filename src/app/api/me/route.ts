import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "@/lib/auth";
import {
  findUserByEmail,
  updateUserUsername,
  updateUserAvatar,
  updateUserPassword,
} from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    const verified = await decrypt(session);

    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = (verified as any).email as string;
    const role = (verified as any).role as "admin" | "user";

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { username, avatarUrl, password } = body as {
      username?: string;
      avatarUrl?: string;
      password?: string;
    };

    if (username !== undefined) {
      await updateUserUsername(user.id, username.trim());
    }

    if (avatarUrl !== undefined) {
      await updateUserAvatar(user.id, avatarUrl);
    }

    if (password) {
      if (password.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
      }
      const hash = await bcrypt.hash(password, 10);
      await updateUserPassword(user.id, hash);
    }

    // Re-issue session cookie with updated username so navbar reflects change immediately
    const newUsername = username !== undefined ? username.trim() || null : ((verified as any).username ?? null);
    const newSession = await encrypt({ email, role, username: newUsername });
    cookieStore.set("session", newSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account update error:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
