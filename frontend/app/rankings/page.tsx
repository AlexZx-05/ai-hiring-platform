"use client";

import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";

export default function RankingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-5 py-6">
      <section className="mx-auto max-w-5xl rounded-xl border border-gray-100 bg-white p-6">
        <Link
          href="/dashboard"
          className="mb-5 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700">
            <BarChart2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Candidate Rankings</h1>
            <p className="text-xs text-gray-500">
              Ranking data will appear here after applications are analyzed.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
