import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findResetToken, findUserByEmail, updateUserPassword, markResetTokenUsed } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body as { token: string; password: string };

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const resetToken = await findResetToken(token);

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    const user = await findUserByEmail(resetToken.email);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hash);
    await markResetTokenUsed(resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
