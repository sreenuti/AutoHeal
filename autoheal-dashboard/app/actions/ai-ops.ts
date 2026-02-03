"use server";

import { troubleshootLog } from "@/lib/agents/ops-agent";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";
import { executeBulkFixStep } from "@/lib/sop";
import type { BulkAuditEntry } from "@/lib/sop";
import { analyzeImpact } from "@/lib/actions/impact-analysis";
import type { ImpactAssessment } from "@/lib/actions/impact-analysis";
import { getFixType } from "@/lib/ops/fix-type";

export type TroubleshootResultData = Awaited<ReturnType<typeof troubleshootLog>> & {
  similarIssueCount?: number;
  similarIssueIds?: string[];
  impactAssessment?: ImpactAssessment;
};

export type TroubleshootResponse =
  | { success: true; data: TroubleshootResultData }
  | { success: false; error: string };

export async function runTroubleshoot(
  logEntry: {
    rawLog: string;
    errorCode?: string;
    workflowName?: string;
    nodeId?: string;
    id?: string;
  },
  allLogs?: SyntheticLog[]
): Promise<TroubleshootResponse> {
  try {
    const data = await troubleshootLog(logEntry);
    const workflowName = logEntry.workflowName ?? "Unknown_Workflow";
    const fixType = getFixType(
      { success: true, data },
      { ...logEntry, rawLog: logEntry.rawLog, errorCode: logEntry.errorCode, workflowName: logEntry.workflowName, nodeId: logEntry.nodeId, id: logEntry.id } as SyntheticLog
    );
    const impactAssessment = await analyzeImpact(workflowName, fixType ?? "node_restart");

    const dataWithImpact: TroubleshootResultData = {
      ...data,
      impactAssessment,
    };

    if (allLogs != null && allLogs.length > 0 && logEntry.errorCode != null && logEntry.nodeId != null) {
      const currentId = logEntry.id ?? null;
      const similar = allLogs.filter(
        (l) =>
          l.errorCode === logEntry.errorCode &&
          l.nodeId === logEntry.nodeId &&
          (currentId == null || l.id !== currentId)
      );
      return {
        success: true,
        data: {
          ...dataWithImpact,
          similarIssueCount: similar.length,
          similarIssueIds: similar.map((l) => l.id),
        },
      };
    }
    return { success: true, data: dataWithImpact };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Troubleshoot failed";
    return { success: false, error: message };
  }
}

export async function troubleshootFromLog(
  log: SyntheticLog,
  allLogs?: SyntheticLog[]
): Promise<TroubleshootResponse> {
  return runTroubleshoot(
    {
      rawLog: log.rawLog,
      errorCode: log.errorCode,
      workflowName: log.workflowName,
      nodeId: log.nodeId,
      id: log.id,
    },
    allLogs
  );
}

export type ExecuteBulkFixStepResponse =
  | { success: true; auditEntry: BulkAuditEntry }
  | { success: false; auditEntry: BulkAuditEntry; shouldHaltAndEscalate: true };

/** One step of a bulk fix: audit entry per ticket + safe-stopping on failure. */
export async function executeBulkFixStepAction(params: {
  logId: string;
  masterReason: string;
  bulkRunId: string;
  index: number;
  total: number;
}): Promise<ExecuteBulkFixStepResponse> {
  const result = executeBulkFixStep(
    params.logId,
    params.masterReason,
    params.bulkRunId,
    params.index,
    params.total
  );
  if (result.success) {
    return { success: true, auditEntry: result.auditEntry };
  }
  return {
    success: false,
    auditEntry: result.auditEntry,
    shouldHaltAndEscalate: true,
  };
}
