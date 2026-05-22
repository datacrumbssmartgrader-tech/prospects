import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";

    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (
      username === process.env.APP_USERNAME &&
      password === process.env.APP_PASSWORD
    ) {
      const session = await encrypt({ user: username });
      const cookieStore = await cookies();
      cookieStore.set("session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      redirect("/prospects");
    } else {
      // In a real app we'd handle the error more gracefully.
      // For this simple internal tool, we can throw or redirect back.
      redirect("/login?error=Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to Prospects
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
              placeholder="admin"
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
