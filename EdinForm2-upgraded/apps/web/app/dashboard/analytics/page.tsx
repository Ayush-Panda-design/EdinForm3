"use client";

import { trpc } from "~/trpc/client";
import { FileText, Eye, BarChart3, TrendingUp, Loader2 } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const { data: dashboard, isLoading } = trpc.analytics.dashboard.useQuery(undefined);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>;

  const stats = [
    { label: "Total Forms", value: dashboard?.totalForms ?? 0, icon: FileText, desc: "Forms created" },
    { label: "Total Views", value: dashboard?.totalViews ?? 0, icon: Eye, desc: "Across all forms" },
    { label: "Total Responses", value: dashboard?.totalResponses ?? 0, icon: BarChart3, desc: "Submissions received" },
    { label: "Avg Conversion", value: dashboard ? dashboard.avgConversionRate.toFixed(1) + "%" : "0%", icon: TrendingUp, desc: "Views to submissions" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Overview</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Your forms performance at a glance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
              <s.icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{s.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">Per-form analytics available on each form's analytics page.</p>
      </div>
    </div>
  );
}
