"use client";

import { Search, X } from "lucide-react";

type JobSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
};

export default function JobSearch({
  value,
  onChange,
  onClear,
}: JobSearchProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

        <input
          type="text"
          placeholder="Search by title, department or location..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 outline-none focus:border-blue-600"
        />

        {value && (
          <button
            onClick={onClear}
            className="absolute right-3 top-3 text-gray-500 hover:text-red-500"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}