"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";
import type { FixType } from "@/lib/ops/fix-type";
import { NodeMap } from "./node-map";

const REASONING_DELAY_MS = 550;

function buildReasoningLines(log: SyntheticLog): string[] {
  const { errorCode, nodeId } = log;
  const isFileWriter = log.errorCode === "0xC0042003";
  return [
    `Detected ${errorCode}. Accessing lib/sop.ts...`,
    `Cross-referencing ${nodeId} history. Identifying SIGSEGV pattern...`,
    isFileWriter
      ? "Checking TCC lock status for File Writer..."
      : "Mapping error code to SOP knowledge base...",
    `Fetching SOP guidance for ${errorCode}...`,
    "Evaluating remediation steps (node restart vs. escalation)...",
    "Proposing fix and computing confidence score...",
  ];
}

function buildSuccessLogLines(log: SyntheticLog): string[] {
  const rawLines = log.rawLog.split("\n");
  const moduleMatch = rawLines[0]?.match(/MAPPING>\s+\S+\s+(\S+)\s+\[/);
  const moduleName = moduleMatch?.[1] ?? "IS_Worker_Thread";
  const timestamp = log.timestamp;
  const prefix = "INFO_00000";

  return [
    rawLines[0] ?? `MAPPING> ${prefix} ${moduleName} [${timestamp}] INFO: Initializing task...`,
    `MAPPING> ${prefix} ${moduleName} [${timestamp}] INFO: Workflow ${log.workflowName} completed successfully.`,
    `MAPPING> ${prefix} ${moduleName} [${timestamp}] INFO: Session ${log.sessionId} ended with status SUCCESS.`,
    rawLines[3] ?? `--- Context: Folder [${log.metadata.folder}] | IntegrationSvc [${log.metadata.integrationService}] | Source [${log.metadata.sourceSystem}] ---`,
  ];
}

type ReasoningStreamProps = {
  selectedLog: SyntheticLog | null;
  isRunning: boolean;
  onComplete: () => void;
  /** When true, stream has finished and backend result is ready */
  streamDone?: boolean;
  fixType?: FixType;
  isAgentHealthy?: boolean;
};

export function ReasoningStream({
  selectedLog,
  isRunning,
  onComplete,
  streamDone = false,
  fixType,
  isAgentHealthy = true,
}: ReasoningStreamProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const lastLogIdRef = useRef<string | null>(null);
  const failedLines = useMemo(
    () => (selectedLog ? selectedLog.rawLog.split("\n") : []),
    [selectedLog]
  );
  const successLines = useMemo(
    () => (selectedLog ? buildSuccessLogLines(selectedLog) : []),
    [selectedLog]
  );

  // Clear reasoning only when user selects a different error (or none)
  useEffect(() => {
    if (!selectedLog) {
      setLines([]);
      lastLogIdRef.current = null;
      setShowDiff(false);
      return;
    }
    if (selectedLog.id !== lastLogIdRef.current) {
      setLines([]);
      lastLogIdRef.current = selectedLog.id;
      setShowDiff(false);
    }
  }, [selectedLog]);

  // Run stream only when Troubleshoot is running; keep lines when resolution is done
  useEffect(() => {
    if (!isRunning || !selectedLog) return;
    setLines([]);
    const built = buildReasoningLines(selectedLog);
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const next = () => {
      if (i < built.length) {
        setLines((prev) => [...prev, built[i]]);
        i += 1;
        timers.push(setTimeout(next, REASONING_DELAY_MS));
      } else {
        onComplete();
      }
    };
    timers.push(setTimeout(next, REASONING_DELAY_MS));
    return () => timers.forEach(clearTimeout);
  }, [isRunning, selectedLog, onComplete]);

  // When returning to a previously troubleshooted log: show reasoning again (stream is done but lines were cleared on switch)
  useEffect(() => {
    if (selectedLog && streamDone && !isRunning && lines.length === 0) {
      setLines(buildReasoningLines(selectedLog));
    }
  }, [selectedLog, streamDone, isRunning, lines.length]);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-amber-900/50 bg-amber-950/20 dark:border-amber-800/50 dark:bg-amber-950/30">
      <CardHeader className="border-b border-amber-800/40 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-100">
              <span
                className={`inline-block h-2 w-2 rounded-full bg-amber-400 ${isRunning ? "animate-pulse" : ""}`}
                aria-hidden
              />
              The Reasoning — Live Stream
            </CardTitle>
            <p className="text-xs text-amber-300/80">
              Agent thinking · SOP lookup &amp; pattern match
            </p>
          </div>
          {selectedLog && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30"
              onClick={() => setShowDiff((prev) => !prev)}
            >
              {showDiff ? "Hide Diff" : "Diff"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {selectedLog && (
          <div className="border-b border-amber-800/30 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs text-amber-300/80">
              <span>Contextual Node Map</span>
              <span>
                Focus: {selectedLog.nodeId} · {selectedLog.workflowName}
              </span>
            </div>
            <NodeMap
              focusedNodeId={selectedLog.nodeId}
              fixType={fixType}
              isDimmed={!isAgentHealthy}
            />
          </div>
        )}
        <div className="min-h-[120px] p-4 font-mono text-sm">
          {!selectedLog && !isRunning && (
            <p className="text-amber-500/80">
              Select a fatal error from the left panel and run Troubleshoot to
              see the live reasoning stream.
            </p>
          )}
          {selectedLog && isRunning && lines.length === 0 && (
            <p className="text-amber-400/90">Initializing agent...</p>
          )}
          <ul className="space-y-2">
            {lines.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 text-amber-200/95"
              >
                <span className="text-amber-500 select-none">&gt;</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {streamDone && lines.length > 0 && (
            <p className="mt-3 text-amber-400/80">Reasoning complete.</p>
          )}
        </div>
        {selectedLog && showDiff && (
          <div className="border-t border-amber-800/30 bg-amber-950/30 px-4 py-4">
            <div className="mb-2 flex items-center justify-between text-xs text-amber-300/80">
              <span>Failed vs. last successful run</span>
              <span>Workflow {selectedLog.workflowName}</span>
            </div>
            <div className="grid gap-2">
              {Array.from({
                length: Math.max(failedLines.length, successLines.length),
              }).map((_, index) => {
                const failed = failedLines[index] ?? "";
                const success = successLines[index] ?? "";
                const changed = failed !== success;
                return (
                  <div
                    key={`diff-${index}`}
                    className="grid grid-cols-1 gap-2 md:grid-cols-2"
                  >
                    <div
                      className={`rounded-md border px-2 py-1 text-xs text-red-100 ${
                        changed
                          ? "border-red-500/60 bg-red-950/50"
                          : "border-slate-700/60 bg-slate-950/40 text-slate-300"
                      }`}
                    >
                      {failed || " "}
                    </div>
                    <div
                      className={`rounded-md border px-2 py-1 text-xs text-emerald-100 ${
                        changed
                          ? "border-emerald-500/60 bg-emerald-950/50"
                          : "border-slate-700/60 bg-slate-950/40 text-slate-300"
                      }`}
                    >
                      {success || " "}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
