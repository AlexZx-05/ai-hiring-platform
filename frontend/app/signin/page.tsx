"use client";

import Link from "next/link";
import { useAuth } from "react-oidc-context";
import { useState } from "react";
import { signIn } from "aws-amplify/auth";
import { configureAmplifyAuth } from "@/lib/amplify";

export default function SignInPage() {
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCognitoRedirecting, setIsCognitoRedirecting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // ── Validation ──
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

  // ── Email/Password Login via Amplify ──
  const handleLogin = async () => {
    configureAmplifyAuth();
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });

      if (isSignedIn) {
        window.location.replace("/dashboard");
      } else if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
        window.location.replace("/verify-email");
      } else if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        window.location.replace("/reset-password");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      if (message.includes("User does not exist") || message.includes("Incorrect username")) {
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

  // ── Cognito Hosted UI (SSO / federated) ──
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

      {/* ══════════════════════════════
          LEFT PANEL — dark branding
      ══════════════════════════════ */}
      <div className="hidden lg:flex w-[42%] bg-[#0f1c2e] flex-col p-10 relative overflow-hidden">

        {/* glow blob */}
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

        {/* Hero text */}
        <div className="flex-1 flex flex-col justify-center z-10 py-8">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-400/25 text-blue-400 text-[11px] px-3 py-1.5 rounded-full mb-6 w-fit">
            ✦ Smarter hiring, faster decisions
          </span>

          <h1 className="text-white text-[2rem] font-bold leading-tight mb-4">
            Your Next Great Hire<br />Starts Here
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            Streamline recruiting with AI-powered screening,
            candidate insights, and a polished experience built
            for modern teams.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                title: "Candidate Insights",
                desc: "Review profiles with clarity and speed.",
                icon: (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
              {
                title: "Hiring Analytics",
                desc: "Track pipeline performance in real time.",
                icon: (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                title: "ATS Workflow",
                desc: "Move candidates through every stage.",
                icon: (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                  </svg>
                ),
              },
            ].map((feat) => (
              <div key={feat.title} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="mb-2">{feat.icon}</div>
                <p className="text-slate-200 text-[11px] font-semibold mb-1">{feat.title}</p>
                <p className="text-slate-500 text-[10px] leading-snug">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT PANEL — login form
      ══════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-7">
            Sign in to continue to your hiring dashboard.
          </p>

          {/* General error */}
          {errors.general && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.general}
            </div>
          )}

          {/* Email field */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="name@company.com"
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors ${errors.email ? "border-red-400" : "border-gray-200"}`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
          </div>

          {/* Password field */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your password"
                className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors ${errors.password ? "border-red-400" : "border-gray-200"}`}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between mb-5">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
              />
              Remember Me
            </label>
            <Link href="/forgot-password" className="text-xs text-blue-600 font-medium hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 mb-4"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Cognito SSO button */}
          <button
            onClick={handleCognitoSSO}
            disabled={isCognitoRedirecting}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mb-5 disabled:opacity-60"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
            </svg>
            {isCognitoRedirecting ? "Redirecting..." : "Login with AWS Cognito"}
          </button>

          {/* Sign up */}
          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}