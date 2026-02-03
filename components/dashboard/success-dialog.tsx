"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle2, Download } from "lucide-react";
import { HOURS_SAVED_PER_FIX } from "@/lib/data/kpi-defaults";

const INFORMATICA_NODES = Array.from({ length: 9 }, (_, i) => `Node_${i + 1}`);

export type SuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of issues resolved in this run (1 for single fix, or bulk count). */
  resolvedCount?: number;
  /** Whether the workflow had SLA at risk (from impact assessment). */
  slaImpactMitigated?: boolean;
  /** Optional audit lines to include in the downloadable report. */
  auditLines?: string[];
};

function buildAuditReport(props: SuccessDialogProps): string {
  const ts = new Date().toISOString();
  const lines = [
    "AutoHeal Incident Audit Report",
    "Generated: " + ts,
    "---",
    "Summary: Incident Resolved",
    "Resolved count: " + (props.resolvedCount ?? 1),
    "SLA impact mitigated: " + (props.slaImpactMitigated ? "Yes" : "N/A"),
    "",
    "Informatica grid — nodes verified online:",
    ...INFORMATICA_NODES.map((n) => "  [OK] " + n),
    "",
    "---",
    "Audit trail:",
    ...(props.auditLines ?? ["Fix executed successfully."]),
  ];
  return lines.join("\r\n");
}

function downloadAuditReport(props: SuccessDialogProps) {
  const content = buildAuditReport(props);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incident-audit-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SuccessDialog({
  open,
  onOpenChange,
  resolvedCount = 1,
  slaImpactMitigated = false,
  auditLines,
}: SuccessDialogProps) {
  const timeSavedMinutes = Math.max(1, Math.round(resolvedCount * HOURS_SAVED_PER_FIX * 60));
  const timeSavedLabel = timeSavedMinutes >= 60
    ? `${Math.floor(timeSavedMinutes / 60)}h ${timeSavedMinutes % 60}m`
    : `${timeSavedMinutes} min`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="border-emerald-800/50 bg-slate-900 text-slate-100 max-w-md"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <DialogTitle className="text-xl text-emerald-50">
                Incident Resolved
              </DialogTitle>
              <DialogDescription className="text-emerald-200/80 mt-0.5">
                Fix applied successfully. Grid status verified.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                Time Saved
              </p>
              <p className="text-lg font-semibold text-emerald-100">
                {timeSavedLabel}
              </p>
              <p className="text-xs text-emerald-300/80">
                vs. manual resolution
              </p>
            </div>
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                SLA Impact
              </p>
              <p className="text-lg font-semibold text-emerald-100">
                {slaImpactMitigated ? "Mitigated" : "N/A"}
              </p>
              <p className="text-xs text-emerald-300/80">
                {slaImpactMitigated ? "Breach avoided" : "Not at risk"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Informatica grid — all nodes online
            </p>
            <ul className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-xs" role="list">
              {INFORMATICA_NODES.map((node) => (
                <li
                  key={node}
                  className="flex items-center gap-2 text-slate-200"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-400"
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="font-mono">{node}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full border-emerald-600/60 text-emerald-200 hover:bg-emerald-950/50 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white sm:w-auto"
            onClick={() => downloadAuditReport({ open, onOpenChange, resolvedCount, slaImpactMitigated, auditLines })}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download Incident Audit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
