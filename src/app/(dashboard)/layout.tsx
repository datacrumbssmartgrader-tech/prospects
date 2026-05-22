import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  async function logout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <span className="bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 w-8 h-8 rounded flex items-center justify-center font-bold">P</span>
            Prospects
          </h1>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 font-medium">
              <LogOut className="w-4 h-4 mr-2 text-zinc-400 dark:text-zinc-500" />
              Logout
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
