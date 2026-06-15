"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { confirmSignUp, resendSignUpCode, signUp } from "aws-amplify/auth";
import { getCognitoAuthorizeUrl } from "@/services/auth";

type Role = "candidate" | "recruiter";

export default function SignupPage() {
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    tenantId: "",
    role: "candidate" as Role,
  });

  const helperText = useMemo(() => {
    if (form.role === "recruiter") {
      return "Recruiter access may require admin approval after signup.";
    }
    return "Candidate accounts can upload resumes and apply to jobs.";
  }, [form.role]);

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const response = await signUp({
        username: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          userAttributes: {
            email: form.email.trim().toLowerCase(),
            name: form.name.trim(),
            "custom:tenantId": form.tenantId.trim(),
          },
          clientMetadata: {
            role: form.role,
          },
        },
      });

      if (response.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setStep("verify");
        setNotice("Verification code sent to your email.");
      } else {
        setNotice("Signup completed. Redirecting to sign in...");
        window.location.assign(getCognitoAuthorizeUrl(form.email));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      await confirmSignUp({
        username: form.email.trim().toLowerCase(),
        confirmationCode: code.trim(),
      });
      localStorage.setItem("auth_notice", "signup_verified");
      window.location.assign(getCognitoAuthorizeUrl(form.email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await resendSignUpCode({
        username: form.email.trim().toLowerCase(),
      });
      setNotice("Verification code resent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#0369a1_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#1d4ed8_0%,transparent_35%)] opacity-40" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2">
        <section className="hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 p-8 shadow-2xl shadow-black/30 lg:block">
          <p className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            HireFlow
          </p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
            Build your hiring workspace in minutes.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-slate-300">
            Upload resumes, run AI evaluation pipelines, and streamline recruiter
            decisions from one cloud-native platform.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <MetricCard label="Screening Speed" value="3.1x faster" />
            <MetricCard label="Resume Throughput" value="10k/day" />
            <MetricCard label="Shortlist Accuracy" value="+27%" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-7 shadow-2xl shadow-black/30 backdrop-blur">
          <h2 className="text-3xl font-semibold text-white">Create Account</h2>
          <p className="mt-2 text-sm text-slate-400">
            {step === "signup"
              ? "Sign up and verify your email to continue."
              : "Enter the verification code sent to your email."}
          </p>

          {notice ? (
            <p className="mt-5 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mt-5 rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {step === "signup" ? (
            <form onSubmit={onSignup} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Full Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Tenant ID
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={form.tenantId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tenantId: e.target.value }))
                  }
                  required
                />
                <p className="mt-2 text-xs text-slate-400">
                  Used for tenant-scoped access control in API and data queries.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Role
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={form.role}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, role: e.target.value as Role }))
                  }
                >
                  <option value="candidate">Candidate</option>
                  <option value="recruiter">Recruiter</option>
                </select>
                <p className="mt-2 text-xs text-slate-400">{helperText}</p>
              </div>

              <button
                className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Verification Code
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <button
                className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <button
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-70"
                type="button"
                disabled={loading}
                onClick={onResendCode}
              >
                Resend Code
              </button>
            </form>
          )}

          <p className="mt-5 text-sm text-slate-400">
            Already have an account?{" "}
            <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/login">
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </article>
  );
}
