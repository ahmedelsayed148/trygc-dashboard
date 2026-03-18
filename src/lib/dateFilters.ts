export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

export const emptyDateRange: DateRangeValue = {
  startDate: "",
  endDate: "",
};

function normalizeDateInput(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : value;

  const parsed = new Date(normalized as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isDateWithinRange(
  value: unknown,
  { startDate, endDate }: DateRangeValue,
) {
  const parsedValue = normalizeDateInput(value);

  if (!parsedValue) {
    return !startDate && !endDate;
  }

  if (startDate) {
    const start = normalizeDateInput(startDate);
    if (start && parsedValue < start) {
      return false;
    }
  }

  if (endDate) {
    const end = normalizeDateInput(endDate);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (parsedValue > end) {
        return false;
      }
    }
  }

  return true;
}

export function filterByDateRange<T>(
  records: T[],
  range: DateRangeValue,
  getDate: (record: T) => unknown,
) {
  return records.filter((record) => isDateWithinRange(getDate(record), range));
}
