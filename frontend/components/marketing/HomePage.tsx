"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { hasAuthParams, useAuth } from "react-oidc-context";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export default function HomePage() {
  const auth = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const processingCallback =
    typeof window !== "undefined" && hasAuthParams();

  useEffect(() => {
    const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
    if (requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")) {
      setReturnTo(requestedReturnTo);
    }

    const storedNotice = localStorage.getItem("auth_notice");
    if (storedNotice === "logged_out") {
      setNotice("You have signed out successfully.");
      localStorage.removeItem("auth_notice");
    } else if (storedNotice === "session_expired") {
      setNotice("Your session expired. Please sign in again.");
      localStorage.removeItem("auth_notice");
    } else if (storedNotice === "signup_verified") {
      setNotice("Email verified. Continue by signing in.");
      localStorage.removeItem("auth_notice");
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo");
      const savedReturnTo =
        requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
          ? requestedReturnTo
          : localStorage.getItem("post_login_return_to");
      const destination = savedReturnTo?.startsWith("/") && !savedReturnTo.startsWith("//")
        ? savedReturnTo
        : "/dashboard";
      localStorage.removeItem("post_login_return_to");
      window.location.replace(destination);
    }
  }, [auth.isAuthenticated]);

  const loginHref = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  if (auth.isLoading || processingCallback || auth.activeNavigator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071126] px-6 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 shadow-2xl">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
          <span className="text-sm text-slate-200">Signing you in…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#071126] text-white selection:bg-blue-500/30">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-20 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute right-[-180px] top-[380px] h-[520px] w-[520px] rounded-full bg-cyan-500/[0.09] blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      </div>

      <header className="relative z-20 border-b border-white/[0.06] bg-[#071126]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="HireAI home" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600 shadow-lg shadow-blue-950/50 transition group-hover:rotate-3">
              <Sparkles className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="text-[20px] font-bold tracking-tight">Hire<span className="text-blue-400">AI</span></span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-9 text-[13px] font-medium text-slate-400 md:flex">
            <a className="transition hover:text-white" href="#features">Features</a>
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <a className="transition hover:text-white" href="#about">About</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link href={loginHref} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-blue-950/40 transition hover:bg-blue-500">
              Create account
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 sm:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <nav aria-label="Mobile navigation" className="border-t border-white/[0.08] bg-[#0a1730] px-5 py-4 sm:hidden">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
              <a onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5" href="#features">Features</a>
              <a onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5" href="#how-it-works">How it works</a>
              <a onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5" href="#about">About</a>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
                <Link onClick={() => setMenuOpen(false)} href={loginHref} className="rounded-lg border border-white/10 px-3 py-2.5 text-center text-sm font-medium text-slate-200">Sign in</Link>
                <Link onClick={() => setMenuOpen(false)} href="/signup" className="rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Create account</Link>
              </div>
            </div>
          </nav>
        ) : null}
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12 lg:min-h-[calc(100svh-76px)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:px-12 lg:py-8 xl:gap-12">
        <div className="max-w-[620px]">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200 sm:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
            AI-powered recruitment platform
          </div>

          <h1 className="mt-5 max-w-[620px] text-[clamp(3rem,8vw,5rem)] font-semibold leading-[0.96] tracking-[-0.065em] text-white sm:mt-6 lg:mt-5 lg:text-[clamp(3.25rem,5vw,4.5rem)]">
            Hire smarter.
            <span className="mt-1 block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
              See the whole
              <br className="hidden sm:block" /> picture.
            </span>
          </h1>

          <p className="mt-5 max-w-[520px] text-sm leading-6 text-slate-400 sm:text-base sm:leading-7 lg:mt-4">
            Bring job postings, resume insights, and candidate reviews into one clear workflow. Let AI organize the evidence—your team makes the decision.
          </p>

          {notice ? (
            <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-6 text-emerald-200">
              <Check className="mt-1 h-4 w-4 flex-none" />
              <span>{notice}</span>
            </div>
          ) : null}
          {auth.error ? (
            <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm leading-6 text-rose-200">
              {auth.error.message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-5">
            <button
              type="button"
              onClick={() => router.push(loginHref)}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-6 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Explore the platform
              <ArrowDownRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-400" /> Recruiter-led decisions</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-slate-400" /> Clear, evidence-based review</span>
          </div>
        </div>

        <DashboardPreview />
      </section>

      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p className="max-w-[210px] text-[10px] font-semibold uppercase leading-5 tracking-[0.18em] text-slate-500">
            A clearer workflow for every hiring team
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs font-medium text-slate-400 sm:grid-cols-4 sm:gap-x-10">
            <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-blue-400" /> Job management</span>
            <span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-cyan-300" /> Resume insights</span>
            <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" /> Candidate review</span>
            <span className="inline-flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-emerald-300" /> Job-wise rankings</span>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-[1440px] scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">One connected workflow</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Spend less time sorting. More time deciding.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Keep role criteria and candidate evidence together, so every review has the context it needs.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            icon={BriefcaseBusiness}
            number="01"
            title="Manage every role"
            description="Create and edit job details, set role criteria, and control whether a job is open, draft, or closed."
          />
          <FeatureCard
            icon={FileCheck2}
            number="02"
            title="Understand each resume"
            description="Review role-specific match scores alongside skills, gaps, and evidence from the candidate's application."
          />
          <FeatureCard
            icon={Users}
            number="03"
            title="Review candidates by job"
            description="Compare applicants for the same role and track their progress through recruiter-controlled stages."
          />
          <FeatureCard
            icon={ShieldCheck}
            number="04"
            title="Keep people in control"
            description="AI provides decision support only. Recruiters review the evidence and make hiring decisions themselves."
          />
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 scroll-mt-20 border-y border-white/[0.06] bg-[#0a1730]/70">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From open role to thoughtful review.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400 sm:text-base">
              A simple process that keeps job criteria, applicant reports, and recruiter decisions connected.
            </p>
            <Link href="/signup" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200">
              Create your account <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StepCard number="01" title="Set the role" detail="Publish the role details and the criteria your team will use." />
            <StepCard number="02" title="Review evidence" detail="Candidates apply and receive a structured, role-specific report." />
            <StepCard number="03" title="Choose the next step" detail="Compare applicants, review evidence, and update candidate status." />
          </div>
        </div>
      </section>

      <section id="about" className="relative z-10 mx-auto max-w-[1440px] scroll-mt-20 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="overflow-hidden rounded-3xl border border-blue-300/15 bg-gradient-to-br from-blue-500/[0.12] via-[#101f3b] to-cyan-400/[0.06] p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Built for thoughtful hiring</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A useful signal, never the final say.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Match scores help organize a review—not decide who gets hired. Recruiters stay responsible for evaluating each person fairly and making the final decision.
            </p>
          </div>
          <Link href={loginHref} className="mt-7 inline-flex flex-none items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50 lg:mt-0">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="font-semibold tracking-tight text-slate-300">Hire<span className="text-blue-400">AI</span></Link>
          <p>AI-supported hiring, with people making the decisions.</p>
          <div className="flex gap-5">
            <Link href={loginHref} className="transition hover:text-white">Sign in</Link>
            <Link href="/signup" className="transition hover:text-white">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[700px] lg:ml-auto">
      <div aria-hidden="true" className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-blue-500/15 via-transparent to-cyan-300/10 blur-2xl" />
      <div className="relative rounded-[22px] border border-slate-700/80 bg-[#101a2b] p-2 shadow-[0_35px_100px_rgba(0,0,0,0.48)] sm:rounded-[28px] sm:p-2.5">
        <div className="overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#0b1423]">
          <Image
            src="/images/hireai-dashboard-preview.png"
            alt="HireAI recruitment dashboard preview"
            width={1475}
            height={768}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-auto max-h-[calc(100svh-150px)] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: typeof BriefcaseBusiness;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-400/25 hover:bg-blue-400/[0.045] sm:p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/10 bg-blue-400/[0.08] text-blue-300 transition group-hover:bg-blue-400/[0.14]">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[10px] font-medium tracking-[0.14em] text-slate-600">{number}</span>
      </div>
      <h3 className="mt-6 text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}

function StepCard({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#0c192e] p-5">
      <span className="text-xs font-semibold tracking-[0.14em] text-blue-300">{number}</span>
      <h3 className="mt-5 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
}
