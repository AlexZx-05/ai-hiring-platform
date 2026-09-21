"use client";

import { FormEvent, useState } from "react";
import { MailPlus, ShieldCheck } from "lucide-react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { inviteRecruiter, type RecruiterInvitation } from "@/services/recruiter";

function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? "Unable to send the recruiter invitation.";
}

export default function RecruiterInvitationsPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<RecruiterInvitation | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSent(null);
    setSending(true);
    try {
      const invitation = await inviteRecruiter(email.trim());
      setSent(invitation);
      setEmail("");
    } catch (inviteError) {
      setError(errorMessage(inviteError));
    } finally {
      setSending(false);
    }
  };

  return (
    <WorkspaceShell
      title="Recruiter access"
      subtitle="Invite recruiters to this organization. Recruiter privileges are never granted through public signup."
    >
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><ShieldCheck className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-slate-900">Invite a recruiter</h2><p className="mt-1 text-sm text-slate-600">Cognito sends an email with a temporary password. The invited user is assigned to your organization automatically.</p></div>
        </div>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="recruiter-email">Recruiter email</label>
          <input id="recruiter-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="recruiter@company.com" className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button disabled={sending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"><MailPlus className="h-4 w-4" />{sending ? "Sending…" : "Send invitation"}</button>
        </form>
        {error ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {sent ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Invitation sent to <strong>{sent.email}</strong>. Cognito will deliver the account setup email.</p> : null}
      </section>
    </WorkspaceShell>
  );
}
