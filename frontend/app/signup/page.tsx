"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { confirmSignUp, resendSignUpCode, signUp } from "aws-amplify/auth";
import {
  BarChart3,
  BriefcaseBusiness,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UsersRound,
  Workflow,
} from "lucide-react";
import { getCognitoAuthorizeUrl } from "@/services/auth";

export default function SignupPage() {
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "candidate",
  });

  const helperText = useMemo(() => {
    return "Self-service signup creates a candidate account. Recruiter access is issued by an organization administrator through an invitation.";
  }, [form.role]);

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (form.password !== form.confirmPassword) {
        throw new Error("Password and confirm password do not match");
      }
      if (!acceptedTerms) {
        throw new Error("Please accept the terms before creating an account");
      }

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const response = await signUp({
        username: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          userAttributes: {
            email: form.email.trim().toLowerCase(),
            name: fullName,
            // Privileged role and tenant claims are intentionally never accepted from the browser.
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
    <main className="flex min-h-screen bg-white text-gray-950">
      <section className="relative hidden w-[42%] flex-col overflow-hidden bg-[#0f1c2e] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
            <BriefcaseBusiness className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              TalentFlow AI
            </p>
            <p className="text-[11px] text-slate-400">
              Hiring Intelligence Platform
            </p>
          </div>
        </div>

        <div className="z-10 flex flex-1 flex-col justify-center py-8">
          <span className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-500/15 px-3 py-1.5 text-[11px] text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            Role-based onboarding
          </span>

          <h1 className="mb-4 max-w-lg text-[2rem] font-bold leading-tight text-white">
            Build the Right Workspace From Day One
          </h1>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-slate-400">
            Create a candidate or recruiter account with the correct permissions,
            tenant access, and hiring workflow ready after verification.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <FeatureCard
              icon={UsersRound}
              title="Role Access"
              description="Each user starts in the correct workspace."
            />
            <FeatureCard
              icon={BarChart3}
              title="Hiring Signals"
              description="Keep pipeline and profile data organized."
            />
            <FeatureCard
              icon={Workflow}
              title="ATS Flow"
              description="Move work through each stage cleanly."
            />
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-8">
        <div className="w-full max-w-[560px]">
          <div className="mb-7">
            <h2 className="text-3xl font-bold tracking-tight text-gray-950">
              {step === "signup" ? "Create your account" : "Verify your email"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {step === "signup"
                ? "Choose your role and set up secure access to TalentFlow AI."
                : "Enter the verification code sent to your email."}
            </p>
          </div>

          {notice ? (
            <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {step === "signup" ? (
            <form onSubmit={onSignup} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="First Name"
                  icon={User}
                  value={form.firstName}
                  placeholder="John"
                  onChange={(value) =>
                    setForm((p) => ({ ...p, firstName: value }))
                  }
                  required
                />
                <TextInput
                  label="Last Name"
                  icon={User}
                  value={form.lastName}
                  placeholder="Doe"
                  onChange={(value) =>
                    setForm((p) => ({ ...p, lastName: value }))
                  }
                  required
                />
              </div>

              <TextInput
                label="Email"
                icon={Mail}
                type="email"
                value={form.email}
                placeholder="name@company.com"
                onChange={(value) => setForm((p) => ({ ...p, email: value }))}
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <PasswordInput
                  label="Password"
                  value={form.password}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                  onChange={(value) =>
                    setForm((p) => ({ ...p, password: value }))
                  }
                />
                <PasswordInput
                  label="Confirm Password"
                  value={form.confirmPassword}
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                  onChange={(value) =>
                    setForm((p) => ({ ...p, confirmPassword: value }))
                  }
                />
              </div>

              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-gray-600">{helperText}</p>

              <label className="flex items-start gap-2 text-xs leading-5 text-gray-500">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                />
                <span>
                  I agree to the{" "}
                  <span className="font-semibold text-gray-800">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-gray-800">
                    Privacy Policy
                  </span>
                </span>
              </label>

              <button
                className="h-12 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="space-y-4">
              <TextInput
                label="Verification Code"
                icon={ShieldCheck}
                value={code}
                placeholder="123456"
                onChange={setCode}
                required
              />
              <button
                className="h-12 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <button
                className="h-11 w-full rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:opacity-60"
                type="button"
                disabled={loading}
                onClick={onResendCode}
              >
                Resend Code
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              className="font-semibold text-blue-600 hover:underline"
              href="/signin"
            >
              Sign In
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function RoleCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 text-gray-950 shadow-sm"
          : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
            active ? "border-blue-600 bg-blue-600" : "border-gray-300"
          }`}
        >
          {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
      </span>
      <span
        className={`mt-2 block text-xs leading-5 ${
          active ? "text-gray-600" : "text-gray-500"
        }`}
      >
        {description}
      </span>
    </button>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UsersRound;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-[11px] font-semibold leading-4 text-white">
        {title}
      </h3>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function TextInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  icon: typeof User;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-zinc-900">
      {label}
      <span className="relative mt-2 block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-[#eef4fd] pl-11 pr-3 text-sm text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
      </span>
    </label>
  );
}

function PasswordInput({
  label,
  value,
  visible,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-zinc-900">
      {label}
      <span className="relative mt-2 block">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-[#eef4fd] pl-11 pr-11 text-sm text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 hover:bg-white/70 hover:text-zinc-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <Eye className="h-4 w-4" />
        </button>
      </span>
    </label>
  );
}
