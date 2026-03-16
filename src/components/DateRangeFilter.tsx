import { CalendarRange, X } from "lucide-react";

import type { DateRangeValue } from "../lib/dateFilters";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
}

export function DateRangeFilter({
  value,
  onChange,
  label = "Date Filter",
}: DateRangeFilterProps) {
  const hasValue = Boolean(value.startDate || value.endDate);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-[140px]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            <CalendarRange className="h-4 w-4" />
            {label}
          </div>
        </div>

        <label className="block flex-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
          From
          <input
            type="date"
            value={value.startDate}
            onChange={(event) =>
              onChange({ ...value, startDate: event.target.value })
            }
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold normal-case text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="block flex-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
          To
          <input
            type="date"
            value={value.endDate}
            onChange={(event) =>
              onChange({ ...value, endDate: event.target.value })
            }
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold normal-case text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <button
          type="button"
          onClick={() => onChange({ startDate: "", endDate: "" })}
          disabled={!hasValue}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
