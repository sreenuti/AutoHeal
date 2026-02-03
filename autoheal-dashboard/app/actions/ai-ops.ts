"use server";

import { troubleshootLog } from "@/lib/agents/ops-agent";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";

export type TroubleshootResponse =
  | { success: true; data: Awaited<ReturnType<typeof troubleshootLog>> }
  | { success: false; error: string };

export async function runTroubleshoot(logEntry: {
  rawLog: string;
  errorCode?: string;
  workflowName?: string;
  nodeId?: string;
}): Promise<TroubleshootResponse> {
  try {
    const data = await troubleshootLog(logEntry);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Troubleshoot failed";
    return { success: false, error: message };
  }
}

export async function troubleshootFromLog(log: SyntheticLog): Promise<TroubleshootResponse> {
  return runTroubleshoot({
    rawLog: log.rawLog,
    errorCode: log.errorCode,
    workflowName: log.workflowName,
    nodeId: log.nodeId,
  });
}
