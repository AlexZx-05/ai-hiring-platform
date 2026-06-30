"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, UserCheck, XCircle } from "lucide-react";
import {
  listJobApplications,
  updateApplicationStatus,
  type RecruiterApplication,
} from "@/services/recruiter";

const statusStyle: Record<RecruiterApplication["status"], string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  PARSING: "bg-amber-50 text-amber-700",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700",
  SHORTLISTED: "bg-green-50 text-green-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

export default function RecruiterJobApplicantsPage() {
  const params = useParams<{ id: string }>();
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    listJobApplications(params.id)
      .then(setApplications)
      .catch((err) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load applications."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const onStatus = async (
    application: RecruiterApplication,
    status: RecruiterApplication["status"]
  ) => {
    setError(null);
    try {
      const updated = await updateApplicationStatus({
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        status,
      });
      setApplications((current) =>
        current.map((item) =>
          item.applicationId === updated.applicationId ? updated : item
        )
      );
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Unable to update status."
      );
    }
  };

  const ranked = [...applications].sort(
    (a, b) => (b.atsScore ?? 0) - (a.atsScore ?? 0)
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <Link href="/recruiter/jobs" className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to recruiter jobs
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Applicants</h1>
          <p className="text-xs text-gray-500">Ranked candidate list for this job.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Loading applicants...
          </div>
        ) : ranked.length ? (
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="grid grid-cols-[1fr_120px_140px_210px] border-b border-gray-100 px-4 py-3 text-xs font-semibold text-gray-500">
              <span>Candidate</span>
              <span>AI Score</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {ranked.map((application) => (
              <div
                key={application.applicationId}
                className="grid grid-cols-[1fr_120px_140px_210px] items-center border-b border-gray-50 px-4 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/recruiter/candidates/${application.candidateId}`}
                    className="truncate text-sm font-semibold text-gray-900 hover:text-blue-700"
                  >
                    {application.candidateEmail ?? application.candidateId}
                  </Link>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    Resume {application.resumeId}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {application.atsScore ?? "-"}
                  {application.atsScore ? "%" : ""}
                </div>
                <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[application.status]}`}>
                  {application.status.replace("_", " ")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStatus(application, "SHORTLISTED")}
                    className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Shortlist
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus(application, "REJECTED")}
                    className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-900">No applicants yet</p>
            <p className="mt-1 text-xs text-gray-500">Applications will appear here after candidates apply.</p>
          </div>
        )}
      </section>
    </main>
  );
}
