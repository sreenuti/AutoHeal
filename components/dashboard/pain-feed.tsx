"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type PainFeedProps = {
  initialLogs: SyntheticLog[];
  selectedLogId: string | null;
  onSelectLog: (log: SyntheticLog) => void;
  /** Log IDs for which a fix has been executed (highlight as fixed) */
  fixedLogIds?: Set<string>;
  /** Called when the feed list changes (for parent to compute Fixed/Not fixed counts) */
  onFeedChange?: (feed: SyntheticLog[]) => void;
};

export function PainFeed({
  initialLogs,
  selectedLogId,
  onSelectLog,
  fixedLogIds = new Set(),
  onFeedChange,
}: PainFeedProps) {
  const [feed, setFeed] = useState<SyntheticLog[]>(initialLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onFeedChange?.(feed);
  }, [feed, onFeedChange]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialLogs.length > 0 && !initialized.current) {
      setFeed(initialLogs);
      initialized.current = true;
    }
  }, [initialLogs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed.length]);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-red-900/50 bg-red-950/30 dark:border-red-950 dark:bg-red-950/50">
      <CardHeader className="border-b border-red-800/50 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-100">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400"
            aria-hidden
          />
          The Problem — Fatal Errors
        </CardTitle>
        <p className="text-xs text-red-300/80">
          Fatal errors · High severity only (frozen)
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <ul className="divide-y divide-red-900/50">
          {feed.map((log) => {
            const isFixed = fixedLogIds.has(log.id);
            return (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => onSelectLog(log)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-red-900/40 ${
                    selectedLogId === log.id
                      ? "bg-red-900/60 ring-inset ring-1 ring-red-500/50"
                      : ""
                  } ${isFixed ? "border-l-4 border-l-emerald-500 bg-emerald-950/30 hover:bg-emerald-950/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-red-200">
                      {formatTime(log.timestamp)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="group/metadata relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-600/50 bg-red-950/50 text-red-400 hover:bg-red-900/60 hover:border-red-500/60 hover:text-red-300"
                        title="Source & target"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-left text-xs text-slate-200 shadow-lg opacity-0 transition-opacity duration-150 group-hover/metadata:opacity-100">
                          <span className="font-semibold text-slate-400">Source System:</span> {log.metadata.sourceSystem}
                          <br />
                          <span className="font-semibold text-slate-400">Target Table:</span> {log.metadata.targetTable ?? log.workflowName}
                        </span>
                      </span>
                      {isFixed && (
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-950 bg-emerald-400"
                          aria-label="Fixed"
                        >
                          Fixed
                        </span>
                      )}
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-950 bg-red-400"
                        aria-label="Fatal"
                      >
                        Fatal
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 font-mono text-xs text-red-300">
                    {log.errorCode} · {log.nodeId}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-red-200/90">
                    {log.message}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </CardContent>
    </Card>
  );
}
