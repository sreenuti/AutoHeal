"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PainFeed } from "./pain-feed";
import { ReasoningStream } from "./reasoning-stream";
import { ResolutionPanel } from "./resolution-panel";
import { Button } from "@/components/ui/button";
import { troubleshootFromLog } from "@/app/actions/ai-ops";
import type { TroubleshootResponse } from "@/app/actions/ai-ops";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";
import { KPI_DEFAULTS, HOURS_SAVED_PER_FIX } from "@/lib/data/kpi-defaults";
import type { KpiItem } from "@/lib/data/kpi-defaults";
import { getFixType } from "@/lib/ops/fix-type";

export function DashboardClient() {
  const [logs, setLogs] = useState<SyntheticLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyntheticLog | null>(null);
  const [result, setResult] = useState<TroubleshootResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningComplete, setReasoningComplete] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [fixedLogIds, setFixedLogIds] = useState<Set<string>>(new Set());
  const [resultCache, setResultCache] = useState<Record<string, TroubleshootResponse>>({});
  const [feedLogs, setFeedLogs] = useState<SyntheticLog[]>([]);
  const [agentStatus, setAgentStatus] = useState<"healthy" | "offline">("healthy");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const handleFeedChange = useCallback((feed: SyntheticLog[]) => {
    setFeedLogs((prev) => {
      if (feed.length > 0) return feed;
      if (prev.length > 0) return prev;
      return feed;
    });
  }, []);

  const fixedCount = feedLogs.filter((log) => fixedLogIds.has(log.id)).length;
  const notFixedCount = feedLogs.length - fixedCount;
  const totalFeed = feedLogs.length;

  const KPI_BAR: KpiItem[] = [
    {
      ...KPI_DEFAULTS[0],
      value: fixedCount > 0 ? KPI_DEFAULTS[0].value : "0 min",
    },
    {
      ...KPI_DEFAULTS[1],
      value: fixedCount > 0
        ? `${Math.max(1, Math.round(fixedCount * HOURS_SAVED_PER_FIX))}h`
        : "0h",
    },
    {
      ...KPI_DEFAULTS[2],
      value: fixedCount > 0 && totalFeed > 0
        ? `${(100 * fixedCount / totalFeed).toFixed(1)}%`
        : "0%",
    },
  ];

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch logs.");
      const data = await res.json();
      setLogs(data.logs ?? []);
      setAgentStatus("healthy");
      setLastHeartbeatAt(Date.now());
    } catch {
      setAgentStatus("offline");
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 12000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // When selection changes: restore cached result for this log (so fixed/previously run errors show reasoning + resolution)
  useEffect(() => {
    const logId = selectedLog?.id ?? null;
    if (!logId) {
      setResult(null);
      setReasoningComplete(false);
      return;
    }
    const cached = resultCache[logId];
    setResult(cached ?? null);
    setReasoningComplete(!!cached?.success);
  }, [selectedLog?.id, resultCache]);

  const handleTroubleshoot = useCallback(async () => {
    if (!selectedLog) return;
    setIsLoading(true);
    setResult(null);
    setReasoningComplete(false);
    try {
      const logsForBulk = feedLogs.length > 0 ? feedLogs : logs;
      const res = await troubleshootFromLog(selectedLog, logsForBulk);
      setResult(res);
      setResultCache((prev) => ({ ...prev, [selectedLog.id]: res }));
    } finally {
      setIsLoading(false);
      setReasoningComplete(true);
    }
  }, [selectedLog]);

  const fixType = useMemo(() => getFixType(result, selectedLog), [result, selectedLog]);
  const heartbeatAgeSec = lastHeartbeatAt ? Math.max(0, Math.round((now - lastHeartbeatAt) / 1000)) : null;
  const isHeartbeatStale = lastHeartbeatAt ? now - lastHeartbeatAt > 15000 : true;
  const agentHealthy = agentStatus === "healthy" && !isHeartbeatStale;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* KPI mini-widgets */}
      <div className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-full flex-wrap items-center gap-6 px-6 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Fixed:
            </span>
            <span className="text-lg font-semibold text-emerald-400">
              {fixedCount}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Not fixed:
            </span>
            <span className="text-lg font-semibold text-amber-400">
              {notFixedCount}
            </span>
          </div>
          <div className="mr-2 h-4 w-px bg-slate-600" aria-hidden />
          {KPI_BAR.map((kpi) => (
            <div key={kpi.label} className="flex items-baseline gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {kpi.label}:
              </span>
              <span className="text-lg font-semibold text-emerald-400">
                {kpi.value}
              </span>
              {kpi.sub && (
                <span className="text-xs text-slate-500">({kpi.sub})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-full flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            AutoHeal Command Center
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${agentHealthy ? "bg-emerald-400" : "bg-red-400"}`}
                aria-hidden
              />
              <span className="font-semibold">
                Agent Health: {agentHealthy ? "Online" : "Disconnected"}
              </span>
              <span className="text-slate-400">
                {heartbeatAgeSec != null ? `Heartbeat ${heartbeatAgeSec}s ago` : "Heartbeat pending"}
              </span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={(e) => setReviewMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Review Mode</span>
              {reviewMode && (
                <span className="text-xs text-amber-400/90">(Safety First)</span>
              )}
            </label>
            <span className="text-sm text-slate-400">
              Informatica Fatal Error Troubleshooter
            </span>
            {selectedLog && (
              <Button
                onClick={handleTroubleshoot}
                disabled={isLoading}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                {isLoading ? "Analyzing…" : "Troubleshoot"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {!agentHealthy && (
        <div className="border-b border-red-900/60 bg-red-950/40 px-6 py-2 text-xs text-red-200">
          Agent heartbeat lost — dashboard paused to prevent false confidence. Verify grid connectivity.
        </div>
      )}

      <main className={`mx-auto grid h-[calc(100vh-65px)] max-w-full grid-cols-1 gap-4 p-4 md:grid-cols-3 ${agentHealthy ? "" : "pointer-events-none opacity-50"}`}>
        {/* The Problem (Pain) — real-time fatal error feed */}
        <section className="flex min-h-[200px] flex-col md:min-h-0">
          <PainFeed
            initialLogs={logs}
            selectedLogId={selectedLog?.id ?? null}
            onSelectLog={setSelectedLog}
            fixedLogIds={fixedLogIds}
            onFeedChange={handleFeedChange}
          />
        </section>

        {/* The Reasoning (Brain) — live reasoning stream */}
        <section className="flex min-h-[200px] flex-col md:min-h-0">
          <ReasoningStream
            selectedLog={selectedLog}
            isRunning={isLoading}
            onComplete={() => {}}
            streamDone={reasoningComplete && !!result?.success}
            fixType={fixType}
            isAgentHealthy={agentHealthy}
          />
        </section>

        {/* The Resolution (Gain) — recommendation + Execute Fix */}
        <section className="flex min-h-[200px] flex-col md:min-h-0">
          <ResolutionPanel
            result={result}
            selectedLog={selectedLog}
            isLoading={isLoading}
            reviewMode={reviewMode}
            fixedLogIds={fixedLogIds}
            onFixExecuted={(id) => setFixedLogIds((prev) => new Set(prev).add(id))}
          />
        </section>
      </main>
    </div>
  );
}
