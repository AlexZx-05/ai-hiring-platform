export default function LoadingJobs() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border bg-white p-5"
        >
          <div className="h-5 w-48 rounded bg-gray-200"></div>

          <div className="mt-4 h-4 w-64 rounded bg-gray-100"></div>

          <div className="mt-3 h-4 w-32 rounded bg-gray-100"></div>
        </div>
      ))}
    </div>
  );
}