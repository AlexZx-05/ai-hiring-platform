"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, UserCheck } from "lucide-react";
import { getRecruiterCandidate, type CandidateRecord } from "@/services/recruiter";

export default function RecruiterCandidateProfilePage() {
  const params = useParams<{ id: string }>();
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getRecruiterCandidate(params.id)
      .then((result) => setRecords(result.records))
      .catch((err) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load candidate profile."
        );
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const grouped = useMemo(() => {
    return records.reduce<Record<string, CandidateRecord[]>>((acc, record) => {
      const type = String(record.entityType ?? "RECORD");
      acc[type] = [...(acc[type] ?? []), record];
      return acc;
    }, {});
  }, [records]);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link href="/recruiter/jobs" className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to recruiter jobs
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Candidate Profile</h1>
              <p className="text-xs text-gray-500">{params.id}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Loading candidate...
          </div>
        ) : records.length ? (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, items]) => (
              <article key={type} className="rounded-xl border border-gray-100 bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-700" />
                  <h2 className="text-sm font-semibold text-gray-900">{type.replace("_", " ")}</h2>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <pre
                      key={`${type}-${index}`}
                      className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-700"
                    >
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
            <UserCheck className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-900">No profile records found</p>
          </div>
        )}
      </section>
    </main>
  );
}
