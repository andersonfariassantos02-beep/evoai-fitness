export type ReportPeriod = "weekly" | "monthly";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

export function reportRange(period: ReportPeriod, anchor: string) {
  const date = localDate(anchor);
  if (period === "monthly") {
    return {
      startDate: dateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
      endDate: dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
    };
  }
  const mondayOffset = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

export function previousReportRange(period: ReportPeriod, startDate: string) {
  const start = localDate(startDate);
  if (period === "monthly") {
    const previous = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    return reportRange("monthly", dateKey(previous));
  }
  start.setDate(start.getDate() - 7);
  return reportRange("weekly", dateKey(start));
}
