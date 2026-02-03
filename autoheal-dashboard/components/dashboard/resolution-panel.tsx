"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { executeBulkFixStepAction } from "@/app/actions/ai-ops";
import type { TroubleshootResponse } from "@/app/actions/ai-ops";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";
import type { BulkAuditEntry } from "@/lib/sop";
import { getFixType } from "@/lib/ops/fix-type";
import { getProjectedImpact, isMasterNodeRestart } from "@/lib/ops/impact-analysis";
import { SuccessDialog } from "./success-dialog";

type ResolutionPanelProps = {
  result: TroubleshootResponse | null;
  selectedLog: SyntheticLog | null;
  isLoading?: boolean;
  reviewMode?: boolean;
  fixedLogIds?: Set<string>;
  onFixExecuted?: (logId: string) => void;
};

export function ResolutionPanel({
  result,
  selectedLog,
  isLoading,
  reviewMode = false,
  fixedLogIds = new Set(),
  onFixExecuted,
}: ResolutionPanelProps) {
  const isAlreadyFixed = selectedLog ? fixedLogIds.has(selectedLog.id) : false;
  const [executeState, setExecuteState] = useState<
    "idle" | "running" | "done" | "halted_escalate" | "aborted"
  >("idle");
  const [executeLog, setExecuteLog] = useState<string[]>([]);
  const [humanVerified, setHumanVerified] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [bulkAuditEntries, setBulkAuditEntries] = useState<BulkAuditEntry[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    logIds: string[];
    masterReason: string;
    bulkRunId: string;
  } | null>(null);
  const bulkStepInFlight = useRef(false);
  const executionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [secondApproval, setSecondApproval] = useState<{ name: string; confirmed: boolean } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogResolvedCount, setSuccessDialogResolvedCount] = useState(1);

  useEffect(() => {
    if (selectedLog && fixedLogIds.has(selectedLog.id) && executeState !== "halted_escalate" && executeState !== "aborted") {
      setExecuteState("done");
      setExecuteLog((prev) => (prev.length > 0 ? prev : ["Done."]));
    } else if (executeState !== "halted_escalate" && executeState !== "aborted") {
      setExecuteState("idle");
      setExecuteLog([]);
      setHumanVerified(false);
    }
  }, [result, selectedLog?.id, fixedLogIds]);

  useEffect(() => {
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
      executionTimeoutRef.current = null;
    }
    setBulkProgress(null);
    setBulkAuditEntries([]);
    setExecuteState("idle");
    setSecondApproval(null);
    bulkStepInFlight.current = false;
  }, [selectedLog?.id]);

  useEffect(() => {
    if (bulkProgress == null || bulkStepInFlight.current) return;
    if (bulkProgress.current >= bulkProgress.total) {
      setSuccessDialogResolvedCount(bulkProgress.total);
      setShowSuccessDialog(true);
      setBulkProgress(null);
      setExecuteState("done");
      setExecuteLog((prev) => [...prev, "All resolved."]);
      bulkStepInFlight.current = false;
      return;
    }
    const id = bulkProgress.logIds[bulkProgress.current];
    const index = bulkProgress.current;
    const total = bulkProgress.total;
    const masterReason = bulkProgress.masterReason;
    const bulkRunId = bulkProgress.bulkRunId;
    bulkStepInFlight.current = true;

    executeBulkFixStepAction({
      logId: id,
      masterReason,
      bulkRunId,
      index,
      total,
    }).then((res) => {
      bulkStepInFlight.current = false;
      if (res.success) {
        setBulkAuditEntries((prev) => [...prev, res.auditEntry]);
        onFixExecuted?.(id);
        setExecuteLog((prev) => [
          ...prev,
          `Resolved log ${index + 1} of ${total} (Resolved by AI Agent)`,
        ]);
        setBulkProgress((p) =>
          p ? { ...p, current: p.current + 1 } : null
        );
      } else {
        setBulkAuditEntries((prev) => [...prev, res.auditEntry]);
        setExecuteLog((prev) => [
          ...prev,
          `HALT: Fix failed on log ${index + 1} of ${total}. Escalating — no further bulk steps.`,
        ]);
        setExecuteState("halted_escalate");
        setBulkProgress(null);
      }
    });
  }, [bulkProgress, onFixExecuted]);

  const fixType = getFixType(result, selectedLog);
  const impactAssessment = result?.success ? result.data.impactAssessment : undefined;
  const projectedImpact = getProjectedImpact(
    fixType,
    selectedLog?.nodeId,
    selectedLog ? 1 + (result?.success ? (result.data.similarIssueIds?.length ?? 0) : 0) : 0
  );
  const requiresSecondApproval = isMasterNodeRestart(selectedLog?.nodeId, fixType);
  const secondApprovalGiven = requiresSecondApproval ? secondApproval?.confirmed === true : true;

  const similarIssueCount = result?.success ? (result.data.similarIssueCount ?? 0) : 0;
  const similarIssueIds = result?.success ? (result.data.similarIssueIds ?? []) : [];
  const totalApplyCount = selectedLog ? 1 + similarIssueIds.length : 0;
  const matchingLogIds = selectedLog ? [selectedLog.id, ...similarIssueIds] : [];

  const handleApplyToAll = () => {
    if (!selectedLog || !result?.success || matchingLogIds.length === 0) return;
    const masterReason = result.data.explanation;
    const bulkRunId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setExecuteState("running");
    setExecuteLog([]);
    setBulkAuditEntries([]);
    setBulkProgress({
      current: 0,
      total: matchingLogIds.length,
      logIds: matchingLogIds,
      masterReason,
      bulkRunId,
    });
  };

  const handleAbortRollback = () => {
    if (executionTimeoutRef.current) {
      clearTimeout(executionTimeoutRef.current);
      executionTimeoutRef.current = null;
    }
    bulkStepInFlight.current = false;
    setBulkProgress(null);
    setExecuteLog((prev) => [...prev, "Aborted by user. No further steps. Manual override available."]);
    setExecuteState("aborted");
  };

  const handleExecuteFix = () => {
    if (!selectedLog || !result?.success) return;
    setExecuteState("running");
    setExecuteLog([]);

    const nodeId = selectedLog.nodeId;
    const steps =
      fixType === "tcc_escalation"
        ? [
            "Escalating to TCC (BMCC – EDA Prod Batch)...",
            "Request sent. Awaiting job restart.",
            "Closure email queued.",
            "Done.",
          ]
        : [
            `Sequential restart: ${nodeId}...`,
            "Shutting down worker process...",
            "Starting worker process...",
            "Verifying workflow state...",
            "Done.",
          ];

    let i = 0;
    const run = () => {
      if (i < steps.length) {
        setExecuteLog((prev) => [...prev, steps[i]]);
        i += 1;
        executionTimeoutRef.current = setTimeout(run, 800);
      } else {
        executionTimeoutRef.current = null;
        setSuccessDialogResolvedCount(1);
        setShowSuccessDialog(true);
        setExecuteState("done");
        selectedLog && onFixExecuted?.(selectedLog.id);
      }
    };
    executionTimeoutRef.current = setTimeout(run, 400);
  };

  if (isLoading) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-emerald-900/50 bg-emerald-950/20 dark:border-emerald-800/50 dark:bg-emerald-950/30">
        <CardHeader className="border-b border-emerald-800/40 pb-3">
          <CardTitle className="text-base font-semibold text-emerald-100">
            The Resolution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <p className="text-sm text-emerald-400/80">
            Waiting for reasoning to complete...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!result || !result.success) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-emerald-900/50 bg-emerald-950/20 dark:border-emerald-800/50 dark:bg-emerald-950/30">
        <CardHeader className="border-b border-emerald-800/40 pb-3">
          <CardTitle className="text-base font-semibold text-emerald-100">
            The Resolution — Gain
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <p className="text-sm text-emerald-500/90">
            Run Troubleshoot on a selected error to see the recommended fix and
            confidence score.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data } = result;

  const auditEntries = (() => {
    const now = new Date();
    const ts = (offsetSec: number) => {
      const d = new Date(now.getTime() - offsetSec * 1000);
      return d.toISOString().replace("T", " ").slice(0, 19) + " Z";
    };
    const entries = [
      { time: ts(120), action: "Log selected", detail: selectedLog ? `Error ${selectedLog.errorCode} · Node ${selectedLog.nodeId}` : "" },
      { time: ts(115), action: "Troubleshoot requested", detail: "AI agent invoked" },
      { time: ts(108), action: "Reasoning completed", detail: `Confidence ${data.confidenceScore}%` },
      { time: ts(105), action: "Recommendation generated", detail: data.explanation.slice(0, 60) + "…" },
      ...(reviewMode ? [{ time: ts(95), action: "Human verification", detail: "Review Mode · AI reasoning approved" }] : []),
      { time: ts(85), action: "Fix executed", detail: executeLog.length ? executeLog[0] : "Resolution applied" },
      { time: ts(5), action: "Trail sealed", detail: "Immutable · Compliant" },
    ];
    return entries;
  })();

  return (
    <>
    <Card className="flex h-full flex-col overflow-hidden border-emerald-900/50 bg-emerald-950/20 dark:border-emerald-800/50 dark:bg-emerald-950/30">
      <CardHeader className="border-b border-emerald-800/40 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-emerald-100">
            The Resolution — Gain
          </CardTitle>
          <Badge
            className="bg-emerald-600/90 text-emerald-50 border-emerald-500/50"
            variant="outline"
          >
            Confidence: {data.confidenceScore}%
          </Badge>
        </div>
        <p className="text-xs text-emerald-300/80">
          Structured recommendation · Execute when ready
        </p>
        {similarIssueCount > 0 && (
          <Badge
            variant="outline"
            className="mt-2 border-amber-500/50 bg-amber-950/30 text-amber-200"
          >
            Similar Issues Found: {similarIssueCount}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
        {executeState === "halted_escalate" && (
          <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-3">
            <p className="text-sm font-medium text-red-200">Halt and Escalate</p>
            <p className="mt-1 text-xs text-red-300/90">
              Bulk fix failed on one ticket. Agent stopped immediately; no further logs were touched. Escalation required.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-red-500/50 text-red-200 hover:bg-red-900/30"
              onClick={() => setExecuteState("idle")}
            >
              Dismiss
            </Button>
          </div>
        )}

        {executeState === "aborted" && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-950/30 p-3">
            <p className="text-sm font-medium text-amber-200">Aborted — manual override available</p>
            <p className="mt-1 text-xs text-amber-300/90">
              Execution was halted. No further automated steps will run. Revert or manual intervention can be performed from your runbook.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
              onClick={() => setExecuteState("idle")}
            >
              Dismiss
            </Button>
          </div>
        )}

        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            Recommendation
          </h4>
          <p className="whitespace-pre-wrap rounded-lg bg-emerald-950/50 border border-emerald-800/30 p-3 text-sm text-emerald-100/95">
            {data.explanation}
          </p>
        </div>

        {reviewMode && executeState !== "done" && executeState !== "halted_escalate" && executeState !== "aborted" && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200/90">
            <input
              type="checkbox"
              checked={humanVerified}
              onChange={(e) => setHumanVerified(e.target.checked)}
              className="h-4 w-4 rounded border-amber-600 bg-emerald-950/50 text-amber-500 focus:ring-amber-500"
            />
            <span>I have reviewed the AI&apos;s reasoning</span>
          </label>
        )}

        {requiresSecondApproval && !secondApprovalGiven && executeState !== "running" && executeState !== "done" && executeState !== "halted_escalate" && executeState !== "aborted" && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-950/30 p-3">
            <p className="text-sm font-medium text-amber-200">
              Second approver required (Four-Eyes · SOC2/BCBS 239)
            </p>
            <p className="mt-1 text-xs text-amber-300/90">
              Master Node restart requires a second admin to confirm before execution.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Second approver name or ID"
                value={secondApproval?.name ?? ""}
                onChange={(e) =>
                  setSecondApproval((prev) => ({ name: e.target.value, confirmed: prev?.confirmed ?? false }))
                }
                className="rounded border border-amber-600/50 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-100 placeholder:text-amber-500/70"
              />
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
                disabled={!secondApproval?.name?.trim()}
                onClick={() =>
                  setSecondApproval((prev) => (prev ? { ...prev, confirmed: true } : { name: "", confirmed: true }))
                }
              >
                Confirm as second approver
              </Button>
            </div>
          </div>
        )}

        {impactAssessment && executeState !== "done" && executeState !== "halted_escalate" && executeState !== "aborted" && (
          <>
            <div className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2.5 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-emerald-400/90">Dependency &amp; risk</p>
              <ul className="list-none space-y-1">
                <li>
                  <span className="text-slate-400">Downstream systems: </span>
                  <span className="text-slate-200">{impactAssessment.downstreamSystems.join(", ")}</span>
                </li>
                <li>
                  <span className="text-slate-400">Est. downtime: </span>
                  <span className="text-slate-200">{impactAssessment.estimatedDowntimeMinutes} min</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">Risk: </span>
                  <Badge
                    variant="outline"
                    className={
                      impactAssessment.riskLevel === "High"
                        ? "border-red-500/60 text-red-300"
                        : impactAssessment.riskLevel === "Medium"
                          ? "border-amber-500/60 text-amber-300"
                          : "border-emerald-500/60 text-emerald-300"
                    }
                  >
                    {impactAssessment.riskLevel}
                  </Badge>
                </li>
                {impactAssessment.affectedSLA && (
                  <li className="text-amber-300 font-medium">SLA may be affected</li>
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Projected Operational Impact
              </p>
              <p className="text-xs text-slate-300">
                Execute now only if impact is acceptable. Use a low-traffic window for Medium/High.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Risk level:</span>
                <Badge
                  variant="outline"
                  className={
                    impactAssessment.riskLevel === "High"
                      ? "animate-pulse border-red-500/70 bg-red-950/40 text-red-300 ring-1 ring-red-500/40"
                      : impactAssessment.riskLevel === "Medium"
                        ? "animate-pulse border-amber-500/70 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/40"
                        : "border-emerald-500/60 bg-emerald-950/30 text-emerald-300"
                  }
                >
                  {impactAssessment.riskLevel}
                </Badge>
              </div>
            </div>
          </>
        )}

        {projectedImpact && executeState !== "done" && executeState !== "halted_escalate" && executeState !== "aborted" && (
          <p className="rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
            <span className="font-semibold text-emerald-400/90">Projected Impact: </span>
            {projectedImpact.summary}
          </p>
        )}

        {similarIssueCount > 0 && executeState !== "running" && executeState !== "done" && executeState !== "halted_escalate" && executeState !== "aborted" && (
          <Button
            onClick={handleApplyToAll}
            disabled={(reviewMode && !humanVerified) || !secondApprovalGiven}
            variant="outline"
            className="w-full border-amber-500/50 bg-amber-950/20 text-amber-200 hover:bg-amber-900/30"
          >
            Apply Fix to {totalApplyCount} Similar Issues
          </Button>
        )}

        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={handleExecuteFix}
              disabled={
                executeState === "running" ||
                executeState === "done" ||
                executeState === "halted_escalate" ||
                executeState === "aborted" ||
                (reviewMode && !humanVerified) ||
                !secondApprovalGiven
              }
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {executeState === "running"
                ? "Executing..."
                : executeState === "done"
                  ? "Fix executed"
                  : executeState === "halted_escalate"
                    ? "Halted — Escalate"
                    : executeState === "aborted"
                      ? "Aborted — manual override"
                      : "Execute Fix"}
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleAbortRollback}
              disabled={executeState !== "running" && bulkProgress == null}
              title={executeState === "running" || bulkProgress != null ? "Halt execution immediately" : "Available during execution"}
              className="shrink-0 border-2 border-red-500/70 bg-transparent text-red-300 hover:bg-red-950/40 hover:border-red-400/80 hover:text-red-200 disabled:opacity-50 disabled:pointer-events-none font-medium"
            >
              Emergency Abort
            </Button>
          </div>
          {bulkProgress != null && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-emerald-300/90">
                <span>Agent resolving matching logs…</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-950/80 border border-emerald-800/40">
                <div
                  className="h-full bg-emerald-500/90 transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {executeLog.length > 0 && (
            <ul className="mt-3 space-y-1.5 font-mono text-xs text-emerald-200/90">
              {executeLog.map((msg, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">→</span>
                  {msg}
                </li>
              ))}
            </ul>
          )}
          {(executeState === "done" || executeState === "halted_escalate" || executeState === "aborted" || bulkAuditEntries.length > 0) && (
            <button
              type="button"
              onClick={() => setShowAuditTrail(true)}
              className="mt-3 inline-block text-left text-xs font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
            >
              {bulkAuditEntries.length > 0 ? "View Bulk Audit Trail" : "View Immutable Audit Trail"}
            </button>
          )}
        </div>
      </CardContent>

      {showAuditTrail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-title"
          onClick={() => setShowAuditTrail(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg border border-emerald-800/50 bg-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <h2 id="audit-title" className="text-sm font-semibold text-slate-100">
                Immutable Audit Trail
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuditTrail(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Close
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <p className="mb-3 text-xs text-slate-500">
                Every decision is logged and compliant with banking regulations.
              </p>
              {bulkAuditEntries.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bulk run audit — each ticket linked to Master Reason
                  </h3>
                  <ul className="space-y-2 font-mono text-xs">
                    {bulkAuditEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-1 rounded border border-slate-700/80 bg-slate-800/50 px-3 py-2"
                      >
                        <span className="text-slate-400">{entry.timestamp.slice(0, 19).replace("T", " ")} Z</span>
                        <span className="font-medium text-emerald-400">
                          Ticket {entry.index}/{entry.total} · logId {entry.logId.slice(0, 8)}…
                        </span>
                        <span className="text-slate-400">
                          Master Reason: {entry.masterReason.slice(0, 80)}…
                        </span>
                        <span className={entry.outcome === "failed" ? "text-red-400" : "text-emerald-400"}>
                          Outcome: {entry.outcome}
                        </span>
                        {entry.note && (
                          <span className="text-amber-400/90">{entry.note}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="space-y-2 font-mono text-xs">
                {auditEntries.map((entry, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-0.5 rounded border border-slate-700/80 bg-slate-800/50 px-3 py-2"
                  >
                    <span className="text-slate-400">{entry.time}</span>
                    <span className="font-medium text-emerald-400">{entry.action}</span>
                    {entry.detail && (
                      <span className="text-slate-400">{entry.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>

    <SuccessDialog
      open={showSuccessDialog}
      onOpenChange={setShowSuccessDialog}
      resolvedCount={successDialogResolvedCount}
      slaImpactMitigated={impactAssessment?.affectedSLA ?? false}
      auditLines={bulkAuditEntries.length > 0
        ? bulkAuditEntries.map((e) => `${e.timestamp} Ticket ${e.index}/${e.total} ${e.outcome}`)
        : executeLog}
    />
  </>
  );
}
