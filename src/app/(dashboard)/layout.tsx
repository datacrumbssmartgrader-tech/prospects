import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut, Users, Home } from "lucide-react";
import { decrypt } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);
  const email = (payload as any)?.email as string | undefined;
  const role = (payload as any)?.role as string | undefined;

  async function logout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/prospects" className="flex items-center gap-2 cursor-pointer">
              <Image
                src="/LOGO.png"
                alt="Cognos CRM"
                width={80}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 hidden sm:block">
                Cognos CRM
              </span>
            </Link>
            <Link href="/prospects" className="cursor-pointer">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 font-medium cursor-pointer"
              >
                <Home className="w-4 h-4 mr-2 text-zinc-400 dark:text-zinc-500" />
                Home
              </Button>
            </Link>
            {role === "admin" && (
              <Link href="/admin" className="cursor-pointer">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 font-medium cursor-pointer"
                >
                  <Users className="w-4 h-4 mr-2 text-zinc-400 dark:text-zinc-500" />
                  Accounts
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {email && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
                {email}
              </span>
            )}
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2 text-zinc-400 dark:text-zinc-500" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
