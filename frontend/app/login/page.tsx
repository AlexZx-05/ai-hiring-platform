"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasAuthParams, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const processingCallback =
    typeof window !== "undefined" && hasAuthParams();

  useEffect(() => {
    const storedNotice = localStorage.getItem("auth_notice");
    if (storedNotice === "logged_out") {
      setNotice("Signed out successfully.");
      localStorage.removeItem("auth_notice");
    }
    if (storedNotice === "session_expired") {
      setNotice("Session expired. Please sign in again.");
      localStorage.removeItem("auth_notice");
    }
    if (storedNotice === "signup_verified") {
      setNotice("Email verified. Continue by signing in.");
      localStorage.removeItem("auth_notice");
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      window.location.replace("/dashboard");
    }
  }, [auth.isAuthenticated]);

  if (auth.isLoading || processingCallback || auth.activeNavigator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-white">
          Signing you in...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050B1F] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/20 blur-[150px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-500" />
            <span className="text-2xl font-bold">HireAI</span>
          </div>
          <nav className="hidden gap-10 text-sm text-slate-300 md:flex">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
          </nav>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium transition hover:bg-blue-500"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-10 lg:pt-20">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h1 className="max-w-xl text-5xl font-bold leading-tight lg:text-7xl">
              Hire Smarter with AI
            </h1>
            <p className="mt-8 max-w-xl text-lg text-slate-400">
              Streamline your hiring process with intelligent resume analysis,
              AI-powered candidate ranking, and automated interview tools.
            </p>

            {notice && (
              <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-300">
                {notice}
              </div>
            )}

            {auth.error && (
              <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
                {auth.error.message}
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-4">
              {/* ✅ CHANGED: now goes to /signin instead of auth.signinRedirect() */}
              <button
                onClick={() => router.push("/signin")}
                className="rounded-lg bg-blue-600 px-8 py-4 font-semibold transition hover:bg-blue-500"
              >
                Login with AWS Cognito
              </button>

              <Link
                href="/signup"
                className="rounded-lg border border-slate-700 px-8 py-4 text-slate-200 transition hover:border-slate-500"
              >
                Create Account
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-cyan-500/30 via-slate-900 to-orange-500/20 p-1 shadow-2xl">
              <div className="flex h-[450px] items-center justify-center rounded-3xl bg-slate-950">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-8xl font-black text-transparent">
                    AI
                  </div>
                  <p className="mt-4 text-slate-400">Intelligent Hiring Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto mt-24 max-w-7xl px-6 pb-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Powerful AI Features</h2>
          <p className="mt-4 text-slate-400">Everything you need to hire the best talent efficiently</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard title="Resume Parsing" description="Extract skills, education, projects and experience automatically." />
          <FeatureCard title="AI Candidate Ranking" description="Generate AI-powered rankings and candidate matching scores." />
          <FeatureCard title="ATS Pipeline" description="Track candidates from application to hiring using Kanban workflow." />
          <FeatureCard title="Interview Questions" description="Generate personalized interview questions automatically." />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-blue-500">
      <div className="mb-4 h-12 w-12 rounded-lg bg-blue-500/20" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
    </div>
  );
}