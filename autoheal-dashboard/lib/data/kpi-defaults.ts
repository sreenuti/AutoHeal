/**
 * Default KPI values and labels. Used as fallbacks when there's no live data.
 * Values can be overridden by derived metrics (e.g. success rate from fixed/total).
 */

export type KpiItem = {
  label: string;
  value: string;
  sub: string;
};

export const KPI_DEFAULTS: KpiItem[] = [
  { label: "Avg. MTTR", value: "1.2 min", sub: "vs. 4 hours manual" },
  { label: "Manual Hours Saved", value: "14h", sub: "this week" },
  { label: "Success Rate", value: "98.5%", sub: "" },
];

/** Hours assumed saved per resolved ticket (for derived "Manual Hours Saved"). */
export const HOURS_SAVED_PER_FIX = 0.5;
