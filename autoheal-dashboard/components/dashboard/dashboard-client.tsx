"use client";

import { useCallback, useEffect, useState } from "react";
import { LogTable } from "./log-table";
import { ReasoningPanel } from "./reasoning-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { troubleshootFromLog } from "@/app/actions/ai-ops";
import type { TroubleshootResponse } from "@/app/actions/ai-ops";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";

export function DashboardClient() {
  const [logs, setLogs] = useState<SyntheticLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyntheticLog | null>(null);
  const [result, setResult] = useState<TroubleshootResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleTroubleshoot = useCallback(async () => {
    if (!selectedLog) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await troubleshootFromLog(selectedLog);
      setResult(res);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLog]);

  const fatalCount = logs.filter((l) => l.severity === "FATAL").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Informatica Log Troubleshooter
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              AutoHeal Dashboard
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Logs
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {logs.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Fatal Errors
              </p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {fatalCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                SOP Knowledge Base
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                4 Error Codes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LogTable
              logs={logs}
              selectedLogId={selectedLog?.id ?? null}
              onSelectLog={setSelectedLog}
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleTroubleshoot}
                disabled={!selectedLog || isLoading}
              >
                {isLoading ? "Analyzing…" : "Troubleshoot"}
              </Button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <ReasoningPanel result={result} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
