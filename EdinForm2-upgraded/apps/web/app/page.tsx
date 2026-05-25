"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle, Zap, BarChart3, Globe, Lock, Star, Users,
  Sun, Moon,
} from "lucide-react";
import { isAuthenticated } from "~/lib/auth";
import { useTheme } from "~/providers/theme-provider";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  // CTA target — dashboard if logged in, otherwise the intended auth page
  const ctaHref = loggedIn ? "/dashboard" : "/auth/register";
  const signInHref = loggedIn ? "/dashboard" : "/auth/login";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo — always links to landing page */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-violet-300 dark:group-hover:shadow-violet-900 transition-shadow">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">FormCraft</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/explore" className="hover:text-gray-900 dark:hover:text-white transition-colors">Explore</Link>
            <Link href="/pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {loggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Sign in
                </Link>
                <Link href="/auth/register" className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-full px-4 py-1.5 text-sm text-violet-700 dark:text-violet-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>New: Conditional logic & multi-page forms</span>
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Build beautiful forms
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            that people love
          </span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Create stunning forms in minutes, share them anywhere, and analyze responses with powerful analytics. No design skills required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
          >
            {loggedIn ? "Go to Dashboard" : "Start building for free"}{" "}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Explore templates
          </Link>
        </div>
        {!loggedIn && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">No credit card required · Free forever plan</p>
        )}
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { number: "10K+", label: "Forms Created" },
            { number: "500K+", label: "Responses Collected" },
            { number: "99.9%", label: "Uptime" },
            { number: "4.9★", label: "User Rating" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold">{stat.number}</div>
              <div className="text-violet-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to build great forms
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            From simple contact forms to complex surveys — FormCraft handles it all.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "9 Field Types", desc: "Text, email, number, select, multi-select, checkbox, rating, date, and more.", color: "violet" },
            { icon: Globe, title: "Public & Unlisted", desc: "Publish forms publicly or keep them unlisted — only accessible via direct link.", color: "indigo" },
            { icon: BarChart3, title: "Analytics Dashboard", desc: "Track views, submissions, conversion rates, and completion times in real time.", color: "blue" },
            { icon: Lock, title: "Secure by Default", desc: "Rate limiting, spam protection, and proper validation on every submission.", color: "purple" },
            { icon: Users, title: "Team Ready", desc: "Share forms with respondents — no login required. Pure, frictionless filling.", color: "pink" },
            { icon: Star, title: "Beautiful Themes", desc: "Choose from curated themes inspired by anime, games, startups, and more.", color: "rose" },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800 transition-colors bg-white dark:bg-gray-900"
            >
              <div className={`w-12 h-12 rounded-xl bg-${f.color}-50 dark:bg-${f.color}-950/30 flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 text-${f.color}-600 dark:text-${f.color}-400`} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">How it works</h2>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Create", desc: "Build your form with our intuitive drag-and-drop builder. Add fields, set validations, choose a theme." },
            { step: "02", title: "Share", desc: "Publish your form and share the link. Set it as public or unlisted." },
            { step: "03", title: "Analyze", desc: "Track every submission in real time with beautiful analytics and charts." },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-5xl font-bold text-violet-100 dark:text-violet-900 mb-4">{s.step}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {loggedIn ? "Back to building?" : "Ready to build your first form?"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
          {loggedIn
            ? "Jump back to your dashboard and keep creating."
            : "Join thousands of creators who use FormCraft to collect data that matters."}
        </p>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg"
        >
          {loggedIn ? "Go to Dashboard" : "Get started — it's free"}{" "}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">FormCraft</span>
          </Link>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/explore" className="hover:text-gray-900 dark:hover:text-white transition-colors">Explore</Link>
            <Link href="/pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href={signInHref} className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {loggedIn ? "Dashboard" : "Sign in"}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <p className="text-sm text-gray-500">© 2024 FormCraft</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
