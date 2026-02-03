/**
 * Projected impact for a fix — used to show dependency-aware messaging
 * (e.g. "This fix will pause 4 downstream compliance jobs for ~12 minutes").
 */

import type { FixType } from "./fix-type";

export type ProjectedImpact = {
  summary: string;
  downstreamJobCount: number;
  estimatedMinutes: number;
  isCritical: boolean; // Master Node or high-fanout
};

const MASTER_NODE_ID = "Node_1";

/** Downstream jobs per node type (mock dependency graph for demo). */
const DOWNSTREAM_BY_NODE: Record<string, number> = {
  [MASTER_NODE_ID]: 8,
  Node_2: 3,
  Node_3: 3,
  Node_4: 2,
  Node_5: 2,
  Node_6: 2,
  Node_7: 2,
  Node_8: 2,
  Node_9: 2,
};

/** Estimated pause duration (minutes) per node type. */
const MINUTES_BY_NODE: Record<string, number> = {
  [MASTER_NODE_ID]: 15,
  Node_2: 8,
  Node_3: 8,
  Node_4: 6,
  Node_5: 6,
  Node_6: 6,
  Node_7: 6,
  Node_8: 6,
  Node_9: 6,
};

export function getProjectedImpact(
  fixType: FixType,
  nodeId: string | undefined,
  totalApplyCount: number
): ProjectedImpact | null {
  if (!fixType || !nodeId) return null;

  if (fixType === "tcc_escalation") {
    return {
      summary: "TCC will coordinate job restart; 1–2 downstream file-writer jobs may be briefly paused.",
      downstreamJobCount: 2,
      estimatedMinutes: 5,
      isCritical: false,
    };
  }

  const downstream = DOWNSTREAM_BY_NODE[nodeId] ?? 2;
  const minutes = MINUTES_BY_NODE[nodeId] ?? 6;
  const totalDownstream = totalApplyCount > 1 ? downstream * totalApplyCount : downstream;
  const totalMinutes = totalApplyCount > 1 ? Math.ceil(minutes * 1.2 * totalApplyCount) : minutes;
  const isCritical = nodeId === MASTER_NODE_ID;

  const summary =
    totalApplyCount > 1
      ? `This fix will pause ${totalDownstream} downstream compliance/data jobs across ${totalApplyCount} nodes for approximately ${totalMinutes} minutes.`
      : `This fix will pause ${downstream} downstream compliance jobs for approximately ${minutes} minutes.`;

  return {
    summary,
    downstreamJobCount: totalDownstream,
    estimatedMinutes: totalMinutes,
    isCritical,
  };
}

export function isMasterNodeRestart(nodeId: string | undefined, fixType: FixType): boolean {
  return fixType === "node_restart" && nodeId === MASTER_NODE_ID;
}
