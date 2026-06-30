"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "aws-amplify/auth";
import { configureAmplifyAuth } from "@/lib/amplify";
import {
  Lock, Mail, Send, ArrowLeft, CheckCircle2,
  Inbox, KeyRound, HelpCircle, ShieldCheck, AlertTriangle,
} from "lucide-react";

type Stage = "form" | "sent";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [stage, setStage]     = useState<Stage>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    configureAmplifyAuth();
    setIsLoading(true);
    setError("");
    try {
      await resetPassword({ username: email });
      setStage("sent");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Even if user not found, show success (security best practice)
      if (msg.includes("UserNotFoundException") || msg.includes("User does not exist")) {
        setStage("sent");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-[38%] bg-[#0f1c2e] flex-col p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <div>
            <p className="text-white text-xs font-semibold tracking-widest uppercase">TalentFlow AI</p>
            <p className="text-slate-400 text-[11px]">Hiring Intelligence Platform</p>
          </div>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center z-10 py-8">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-400/25 text-blue-400 text-[11px] px-3 py-1.5 rounded-full mb-6 w-fit">
            <Lock className="w-3 h-3" /> Forgot password
          </span>
          <h1 className="text-white text-[2rem] font-bold leading-tight mb-4">
            Reset Your<br />Password
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { title: "Candidate Insights", desc: "Review profiles with clarity and speed." },
              { title: "Hiring Analytics",   desc: "Track pipeline performance in real time." },
              { title: "ATS Workflow",       desc: "Move candidates through every stage." },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-slate-200 text-[11px] font-semibold mb-1">{f.title}</p>
                <p className="text-slate-500 text-[10px] leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE ── */}
      <div className="flex-1 flex bg-gray-50">

        {/* ── FORM PANEL ── */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
          <div className="w-full max-w-sm">

            {stage === "form" ? (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h2>
                <p className="text-sm text-gray-500 mb-7">
                  Enter the email address associated with your account and we&apos;ll send you a secure reset link.
                </p>

                {/* Email */}
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Email address
                </label>
                <div className="relative mb-5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="john.doe@email.com"
                    className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors ${error ? "border-red-400" : "border-gray-200"}`}
                  />
                </div>
                {error && <p className="text-red-500 text-[11px] mb-4">{error}</p>}

                {/* What happens next */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <p className="text-[12px] font-semibold text-gray-700">What happens next</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    We&apos;ll send a one-time reset link to your inbox. The link expires shortly for security.
                  </p>
                </div>

                {/* Spam warning */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      If you don&apos;t see the email, check your spam or promotions folder.
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 mb-4"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? "Sending..." : "Send reset link"}
                </button>

                {/* Back */}
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </>
            ) : (
              /* ── SUCCESS STATE ── */
              <>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h2>
                <p className="text-sm text-gray-500 mb-6">
                  We sent a reset link to <span className="font-medium text-gray-900">{email}</span>. It expires in 15 minutes.
                </p>

                {/* Delivery status */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold text-gray-700">Reset link sent</p>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2">{email}</p>
                  <div className="h-1 bg-green-500 rounded-full w-full mb-2" />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">Delivery status</span>
                    <span className="text-[10px] font-medium text-green-600">Ready</span>
                  </div>
                </div>

                {/* Spam warning */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      If you don&apos;t see the email, check your spam or promotions folder.
                    </p>
                  </div>
                </div>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT INFO PANEL ── */}
        <div className="hidden xl:flex w-72 flex-shrink-0 flex-col justify-center p-8 border-l border-gray-100 bg-white">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Secure recovery</p>
          </div>
          <KeyRound className="w-5 h-5 text-gray-300 mb-6 mt-1" />

          <h3 className="text-xl font-bold text-gray-900 mb-2">Protect your account</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-8">
            Use a strong password that you haven&apos;t used before to keep your recruiter workspace secure.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-4">
            {[
              {
                icon: CheckCircle2,
                iconColor: "text-green-500",
                bg: "bg-green-50",
                title: "Reset link sent",
                desc: "Open the email and click the reset button.",
              },
              {
                icon: Inbox,
                iconColor: "text-gray-500",
                bg: "bg-gray-50",
                title: "Check your inbox",
                desc: "Open the email and click the reset button.",
              },
              {
                icon: KeyRound,
                iconColor: "text-blue-500",
                bg: "bg-blue-50",
                title: "Set a new password",
                desc: "Choose a secure password with at least 8 characters.",
              },
              {
                icon: HelpCircle,
                iconColor: "text-gray-400",
                bg: "bg-gray-50",
                title: "Need help?",
                desc: "Contact support if you can't access your email or the reset link has expired.",
              },
            ].map(({ icon: Icon, iconColor, bg, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-900">{title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}