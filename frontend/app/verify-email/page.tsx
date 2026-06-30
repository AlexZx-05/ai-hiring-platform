import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-3xl font-bold">Verify your email</h1>
        <p className="mt-4 text-slate-300">
          Check your inbox for the verification message, then continue to sign in.
        </p>
        <Link
          href="/signin"
          className="mt-8 inline-flex rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500"
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
