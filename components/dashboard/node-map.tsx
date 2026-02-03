"use client";

import { cn } from "@/lib/utils";
import type { FixType } from "@/lib/ops/fix-type";

const NODE_IDS = Array.from({ length: 9 }, (_, i) => `Node_${i + 1}`);

type NodeMapProps = {
  focusedNodeId?: string | null;
  fixType?: FixType;
  isDimmed?: boolean;
};

function getNodeTone(nodeId: string, focusedNodeId: string | null, fixType?: FixType) {
  const isMaster = nodeId === "Node_1";
  const isFocused = focusedNodeId === nodeId;

  if (isFocused && fixType === "node_restart") {
    return "border-red-400/70 bg-red-900/40 text-red-100";
  }
  if (isFocused && fixType === "tcc_escalation") {
    return "border-amber-400/70 bg-amber-900/40 text-amber-100";
  }
  if (isFocused) {
    return "border-amber-300/60 bg-amber-900/20 text-amber-100";
  }
  if (isMaster) {
    return "border-sky-400/60 bg-sky-950/40 text-sky-100";
  }
  return "border-slate-700/60 bg-slate-900/40 text-slate-200";
}

export function NodeMap({ focusedNodeId, fixType, isDimmed = false }: NodeMapProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 rounded-lg border border-slate-800/70 bg-slate-950/60 p-2",
        isDimmed && "opacity-60"
      )}
      aria-label="Node map"
    >
      {NODE_IDS.map((nodeId) => {
        const isMaster = nodeId === "Node_1";
        return (
          <button
            key={nodeId}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center rounded-md border px-2 py-2 text-xs font-semibold transition-colors hover:border-slate-500",
              getNodeTone(nodeId, focusedNodeId ?? null, fixType)
            )}
            title={isMaster ? `${nodeId} · Master` : nodeId}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {isMaster ? "Master" : "Node"}
            </span>
            <span>{nodeId.replace("Node_", "")}</span>
          </button>
        );
      })}
    </div>
  );
}
