"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  fetchAuthSession,
  fetchUserAttributes,
  signIn,
  signOut,
} from "aws-amplify/auth";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Monitor,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { configureAmplifyAuth } from "@/lib/amplify";
import {
  getUserRoleFromIdToken,
  persistAuthArtifacts,
} from "@/services/auth";

type Role = "candidate" | "recruiter";
type AccountRole = Role | "admin";

const roleContent = {
  recruiter: {
    eyebrow: "Recruiter workspace",
    hero: "Your Next Great Hire Starts Here",
    body: "Streamline recruiting with AI-powered screening, candidate insights, and a polished experience built for modern teams.",
    description: "Sign in to continue to your hiring dashboard.",
    submit: "Login as Recruiter",
    redirect: "/dashboard",
  },
  candidate: {
    eyebrow: "Candidate workspace",
    hero: "Your Next Opportunity Starts Here",
    body: "Explore open roles, submit resumes, and track every application from one focused workspace.",
    description: "Sign in to continue to your candidate workspace.",
    submit: "Login as Candidate",
    redirect: "/jobs",
  },
} satisfies Record<Role, {
  eyebrow: string;
  hero: string;
  body: string;
  description: string;
  submit: string;
  redirect: string;
}>;

function normalizeRole(role?: string): AccountRole {
  if (role === "admin" || role === "recruiter") {
    return role;
  }
  return "candidate";
}

function getRedirectForRole(role: AccountRole) {
  if (role === "admin" || role === "recruiter") {
    return roleContent.recruiter.redirect;
  }
  return roleContent.candidate.redirect;
}

function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export default function SignInForm({
  isAuthCallback = false,
}: {
  isAuthCallback?: boolean;
}) {
  const auth = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>("recruiter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCognitoRedirecting, setIsCognitoRedirecting] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const content = roleContent[selectedRole];

  useEffect(() => {
    setReturnTo(safeReturnPath(new URLSearchParams(window.location.search).get("returnTo")));
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    const profileRole = auth.user?.profile["custom:role"];
    const role = normalizeRole(
      typeof profileRole === "string"
        ? profileRole
        : getUserRoleFromIdToken(auth.user?.id_token)
    );
    const requestedReturnTo = safeReturnPath(
      new URLSearchParams(window.location.search).get("returnTo")
    );
    const savedReturnTo = safeReturnPath(
      localStorage.getItem("post_login_return_to")
    );
    const destination =
      requestedReturnTo ?? savedReturnTo ?? getRedirectForRole(role);

    localStorage.removeItem("post_login_return_to");
    window.location.replace(destination);
  }, [auth.isAuthenticated, auth.user?.id_token, auth.user?.profile]);

  const destinationForRole = (role: AccountRole): string => {
    const savedReturnTo = typeof window === "undefined"
      ? null
      : safeReturnPath(localStorage.getItem("post_login_return_to"));
    const destination = returnTo ?? savedReturnTo ?? getRedirectForRole(role);
    if (typeof window !== "undefined") {
      localStorage.removeItem("post_login_return_to");
    }
    return destination;
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    configureAmplifyAuth();
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email.trim().toLowerCase(),
        password,
      });

      if (isSignedIn) {
        const attributes = await fetchUserAttributes();
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken?.toString();
        const idToken = session.tokens?.idToken?.toString();
        const role = normalizeRole(
          attributes["custom:role"] ?? getUserRoleFromIdToken(idToken)
        );

        if (role !== "admin" && role !== selectedRole) {
          await signOut();
          setErrors({
            general: `This account is registered as a ${role}. Select ${role} to continue.`,
          });
          return;
        }

        persistAuthArtifacts(accessToken, idToken);
        document.cookie = `user_role=${role}; path=/; max-age=${
          rememberMe ? 2592000 : 86400
        }; SameSite=Lax`;
        window.location.replace(destinationForRole(role));
        return;
      }

      if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        window.location.replace("/verify-email");
      } else if (
        nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        window.location.replace("/reset-password");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (
        message.includes("User does not exist") ||
        message.includes("Incorrect username")
      ) {
        setErrors({ general: "Incorrect email or password." });
      } else if (message.includes("User is not confirmed")) {
        setErrors({ general: "Please verify your email first." });
      } else {
        setErrors({ general: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCognitoSSO = async () => {
    try {
      setIsCognitoRedirecting(true);
      if (returnTo) {
        localStorage.setItem("post_login_return_to", returnTo);
      } else {
        localStorage.removeItem("post_login_return_to");
      }
      await auth.signinRedirect();
    } catch {
      setIsCognitoRedirecting(false);
    }
  };

  if (isAuthCallback && auth.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08152b] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <p role="alert" className="text-sm leading-6 text-slate-200">
            Sign-in could not be completed: {auth.error.message}
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200"
          >
            Return to sign in
          </Link>
        </div>
      </main>
    );
  }

  if (isAuthCallback || auth.isLoading || auth.activeNavigator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08152b] px-6 text-white">
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 shadow-2xl">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
          <span className="text-sm text-slate-200">Completing secure sign-in…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[#08152b] p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-[110px]" />
          <div className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600 shadow-lg shadow-blue-950/50">
            <BriefcaseBusiness className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              HireAI
            </p>
            <p className="text-[11px] text-slate-400">
              Hiring Intelligence Platform
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center py-10">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/[0.08] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
            <Sparkles className="h-3.5 w-3.5" />
            {content.eyebrow}
          </span>
          <h1 className="mb-4 max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl">
            {content.hero}
          </h1>
          <p className="mb-9 max-w-xl text-base leading-7 text-slate-300/80">
            {content.body}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <FeatureCard
              icon={UsersRound}
              title="Role Matching"
              desc="Route each user to the right workspace."
            />
            <FeatureCard
              icon={BarChart3}
              title="Hiring Analytics"
              desc="Track pipeline performance in real time."
            />
            <FeatureCard
              icon={Monitor}
              title="ATS Workflow"
              desc="Move work through every stage."
            />
          </div>
          <p className="mt-10 flex items-center gap-2 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            AI-assisted insights. Human-led decisions.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© {new Date().getFullYear()} HireAI</p>
      </section>

      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[440px]">
          <Link href="/" aria-label="HireAI home" className="mb-9 flex w-fit items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600 shadow-md shadow-blue-900/20">
              <BriefcaseBusiness className="h-[18px] w-[18px] text-white" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">HireAI</span>
              <span className="block text-[11px] text-slate-500">Hiring Intelligence Platform</span>
            </span>
          </Link>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Secure workspace access</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Welcome back
          </h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-slate-500">{content.description}</p>

          <div role="group" aria-label="Choose workspace" className="mb-6 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1.5">
            {(["recruiter", "candidate"] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                aria-pressed={selectedRole === role}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  selectedRole === role
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {role === "recruiter" ? "Recruiter" : "Candidate"}
              </button>
            ))}
          </div>

          {errors.general && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.general}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="signin-email" className="mb-2 block text-xs font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((previous) => ({ ...previous, email: undefined }));
                }}
                placeholder="name@company.com"
                aria-invalid={Boolean(errors.email)}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                  errors.email ? "border-rose-400" : "border-slate-200"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-600">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="signin-password" className="mb-2 block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    password: undefined,
                  }));
                }}
                onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
                  errors.password ? "border-rose-400" : "border-slate-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-600">{errors.password}</p>
            )}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 focus:ring-blue-500"
              />
              Remember Me
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="group mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-700/15 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : content.submit}
            {!isLoading ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /> : null}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleCognitoSSO}
            disabled={isCognitoRedirecting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BriefcaseBusiness className="h-4 w-4 text-blue-700" />
            {isCognitoRedirecting ? "Redirecting..." : "Continue with AWS Cognito"}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup?role=${selectedRole}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              Sign up
            </Link>
          </p>
          </div>
          <p className="mt-5 text-center text-[11px] text-slate-400">
            Protected sign-in powered by AWS Cognito
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof UsersRound;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <Icon className="mb-2 h-4 w-4 text-blue-400" />
      <p className="mb-1 text-[11px] font-semibold text-slate-200">{title}</p>
      <p className="text-[10px] leading-snug text-slate-500">{desc}</p>
    </div>
  );
}
