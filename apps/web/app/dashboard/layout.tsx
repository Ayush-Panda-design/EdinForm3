"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "~/providers/auth-provider";
import { isAuthenticated } from "~/lib/auth";
import { useTheme } from "~/providers/theme-provider";
import { Sun, Moon } from "lucide-react";
import { LayoutDashboard, FileText, BarChart3, Settings, LogOut, Plus, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/forms/new", label: "New Form", icon: Plus },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  // Track whether we have confirmed the token exists in localStorage.
  // On first SSR render, isAuthenticated() returns false (no window).
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    setTokenChecked(true);
    // If there's no token at all, redirect immediately without waiting for auth.me
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, [router]);

  // Only redirect once we know: token was present but auth.me returned nothing
  useEffect(() => {
    if (tokenChecked && !isLoading && !user && !isAuthenticated()) {
      router.push("/auth/login");
    }
  }, [user, isLoading, tokenChecked, router]);

  // Show spinner while: token exists but auth.me is still in-flight
  if (!tokenChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">FormCraft</span>
          </Link>
        </div>

        <nav className="p-4 flex-1 space-y-1">
          <Link href="/dashboard"
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/dashboard" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800")}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/dashboard/forms/new"
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/dashboard/forms/new" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800")}>
            <Plus className="w-4 h-4" /> New Form
          </Link>
          <Link href="/dashboard/analytics"
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/dashboard/analytics" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800")}>
            <BarChart3 className="w-4 h-4" /> Analytics
          </Link>
          <Link href="/explore"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FileText className="w-4 h-4" /> Explore Forms
          </Link>
          <Link href="/dashboard/settings"
            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/dashboard/settings" ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800")}>
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
              {user.fullName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1.5 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
