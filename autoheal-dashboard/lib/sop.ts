export type SOPStep = {
    id: string;
    category: "Informatica" | "ServiceNow" | "Escalation";
    trigger: string;
    action: string;
    target_node?: string;
    frequency?: string;
  };
  
  export const INFORMATICA_SOP: SOPStep[] = [
    {
      id: "INFRA_SHUTDOWN_WORKER",
      category: "Informatica",
      trigger: "Maintenance window start / Pre-change activities",
      action: "Sequentially shut down worker nodes from Node 9 down to Node 2.",
      target_node: "Node 9 -> Node 2",
      frequency: "Twice weekly (PC), Once weekly (IDQ)"
    },
    {
      id: "INFRA_SHUTDOWN_MASTER",
      category: "Informatica",
      trigger: "Worker nodes offline",
      action: "Shut down Master Node (Node 1) last to ensure coordination layer is stable.",
      target_node: "Node 1"
    },
    {
      id: "INFRA_STARTUP_MASTER",
      category: "Informatica",
      trigger: "Startup sequence initiated",
      action: "Start Master Node (Node 1) and validate via Admin Console before starting others.",
      target_node: "Node 1"
    },
    {
      id: "FATAL_ERR_LOG_ANALYSIS",
      category: "Informatica",
      trigger: "FATAL ERROR: caught a fatal signal of exception",
      action: "Open Workflow Monitor, extract log, verify Workflow/Folder details via ESP Work Directory."
    },
    {
      id: "FILE_WRITER_ESCALATION",
      category: "Escalation",
      trigger: "Failure in File Writer job",
      action: "Contact TCC (BMCC – EDA Prod Batch) to request job restart and send closure email."
    },
    {
      id: "SNOW_DAILY_REPORT",
      category: "ServiceNow",
      trigger: "Daily 1-hour status update",
      action: "Capture open Incidents/RITMs/Problems, prepare SLA table, and email assigned owners."
    }
  ];
  
  export const getGuidance = (errorString: string) => {
    if (errorString.includes("caught a fatal signal")) return INFORMATICA_SOP.find(s => s.id === "FATAL_ERR_LOG_ANALYSIS");
    if (errorString.includes("File Writer")) return INFORMATICA_SOP.find(s => s.id === "FILE_WRITER_ESCALATION");
    return null;
  };

  // ——— Bulk action guardrails (Audit + Safe-Stopping) ———

  export type BulkAuditEntry = {
    id: string;
    bulkRunId: string;
    logId: string;
    masterReason: string;
    index: number;
    total: number;
    outcome: "success" | "failed" | "halted";
    timestamp: string;
    note?: string;
  };

  export type BulkFixStepResult = {
    success: boolean;
    auditEntry: BulkAuditEntry;
    shouldHaltAndEscalate: boolean;
  };

  /** Creates a unique audit entry for a single ticket in a bulk run, linked to the Master Reason. */
  export function createBulkAuditEntry(
    masterReason: string,
    logId: string,
    bulkRunId: string,
    index: number,
    total: number,
    outcome: BulkAuditEntry["outcome"],
    note?: string
  ): BulkAuditEntry {
    return {
      id: `bulk-audit-${bulkRunId}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      bulkRunId,
      logId,
      masterReason,
      index: index + 1,
      total,
      outcome,
      timestamp: new Date().toISOString(),
      note,
    };
  }

  /**
   * Deterministic rule for when a bulk fix step "fails" (e.g. target unreachable, validation error).
   * Used for Safe-Stopping: when this returns true, the Agent must Halt and Escalate.
   */
  export function isBulkFixStepSimulatedFailure(index: number, _total: number): boolean {
    return index === 2;
  }

  /**
   * Executes one step of a bulk fix: creates a unique audit entry for the ticket and simulates
   * the fix. If the fix fails, returns shouldHaltAndEscalate so the Agent stops and escalates.
   */
  export function executeBulkFixStep(
    logId: string,
    masterReason: string,
    bulkRunId: string,
    index: number,
    total: number
  ): BulkFixStepResult {
    const failed = isBulkFixStepSimulatedFailure(index, total);
    const outcome: BulkAuditEntry["outcome"] = failed ? "failed" : "success";
    const auditEntry = createBulkAuditEntry(
      masterReason,
      logId,
      bulkRunId,
      index,
      total,
      failed ? "failed" : "success",
      failed ? "Fix failed on this ticket; bulk run halted and escalated." : undefined
    );
    return {
      success: !failed,
      auditEntry,
      shouldHaltAndEscalate: failed,
    };
  }