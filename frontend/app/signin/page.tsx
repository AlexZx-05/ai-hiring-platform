"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  fetchAuthSession,
  fetchUserAttributes,
  signIn,
  signOut,
} from "aws-amplify/auth";
import {
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
import { getUserRoleFromIdToken, persistAuthArtifacts } from "@/services/auth";

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

export default function SignInPage() {
  const auth = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>("recruiter");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCognitoRedirecting, setIsCognitoRedirecting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const content = roleContent[selectedRole];

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
        window.location.replace(getRedirectForRole(role));
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
      await auth.signinRedirect();
    } catch {
      setIsCognitoRedirecting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <section className="relative hidden w-[42%] flex-col overflow-hidden bg-[#0f1c2e] p-10 lg:flex">
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
            {content.eyebrow}
          </span>
          <h1 className="mb-4 max-w-lg text-[2rem] font-bold leading-tight text-white">
            {content.hero}
          </h1>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-slate-400">
            {content.body}
          </p>

          <div className="grid grid-cols-3 gap-2">
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
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mb-6 text-sm text-gray-500">{content.description}</p>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["recruiter", "candidate"] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  selectedRole === role
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {role === "recruiter" ? "Recruiter" : "Candidate"}
              </button>
            ))}
          </div>

          {errors.general && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((previous) => ({ ...previous, email: undefined }));
                }}
                placeholder="name@company.com"
                className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 ${
                  errors.email ? "border-red-400" : "border-gray-200"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-600">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
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
                className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 ${
                  errors.password ? "border-red-400" : "border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <p className="mt-1 text-[11px] text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="mb-5 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
              />
              Remember Me
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="mb-4 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : content.submit}
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleCognitoSSO}
            disabled={isCognitoRedirecting}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <BriefcaseBusiness className="h-4 w-4 text-blue-500" />
            {isCognitoRedirecting ? "Redirecting..." : "Continue with AWS Cognito"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup?role=${selectedRole}`}
              className="font-medium text-blue-600 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </section>
    </div>
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
