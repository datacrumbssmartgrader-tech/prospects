import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/auth";
import { findUserByUsername } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import bcrypt from "bcryptjs";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";

    const username = (formData.get("username") as string).trim();
    const password = formData.get("password") as string;

    let role: "admin" | "user" | null = null;

    // Check the hardcoded env-var admin first
    if (
      username === process.env.APP_USERNAME &&
      password === process.env.APP_PASSWORD
    ) {
      role = "admin";
    } else {
      // Fall back to NeonDB users
      try {
        const dbUser = await findUserByUsername(username);
        if (dbUser && (await bcrypt.compare(password, dbUser.password_hash))) {
          role = dbUser.role;
        }
      } catch {
        // If DB is unavailable, fall through to invalid credentials
      }
    }

    if (!role) {
      redirect("/login?error=Invalid credentials");
    }

    const session = await encrypt({ username, role });
    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    redirect("/prospects");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to Cognos CRM
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Enter your credentials to continue
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-zinc-300">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-700"
              placeholder="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-700"
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 mt-4 font-medium"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
