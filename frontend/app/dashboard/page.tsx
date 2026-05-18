export default function DashboardPage() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Total Applications</p>
        <h2 className="mt-2 text-2xl font-semibold">1,284</h2>
      </article>
      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Top Score</p>
        <h2 className="mt-2 text-2xl font-semibold">94 / 100</h2>
      </article>
      <article className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Shortlisted</p>
        <h2 className="mt-2 text-2xl font-semibold">86</h2>
      </article>
    </section>
  );
}
