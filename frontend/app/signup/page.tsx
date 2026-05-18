"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <form onSubmit={onSubmit} className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Sign Up</h1>
        <p className="mb-6 text-sm text-slate-600">Create your platform account.</p>
        <label className="mb-2 block text-sm font-medium">Full Name</label>
        <input className="mb-4 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input className="mb-4 w-full rounded border px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mb-2 block text-sm font-medium">Password</label>
        <input className="mb-5 w-full rounded border px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="w-full rounded bg-blue-600 py-2 font-medium text-white" type="submit">Create Account</button>
        <p className="mt-4 text-sm text-slate-600">Already have an account? <Link className="text-blue-700" href="/login">Login</Link></p>
      </form>
    </main>
  );
}
