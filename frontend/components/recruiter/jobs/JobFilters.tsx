"use client";

type JobFiltersProps = {
  status: string;
  onStatusChange: (value: string) => void;
};

export default function JobFilters({
  status,
  onStatusChange,
}: JobFiltersProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Status
          </label>

          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>
    </div>
  );
}