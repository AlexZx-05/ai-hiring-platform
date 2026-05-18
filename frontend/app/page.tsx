import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">AI Resume Screening Platform</h1>
      <p className="text-slate-600">Serverless hiring intelligence for recruiters and candidates.</p>
      <div className="flex gap-3">
        <Link className="rounded bg-blue-600 px-4 py-2 text-white" href="/login">Login</Link>
        <Link className="rounded border border-slate-300 px-4 py-2" href="/signup">Sign Up</Link>
      </div>
    </main>
  );
}
