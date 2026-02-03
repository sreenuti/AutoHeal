/**
 * SOP knowledge base keyed by Informatica error hex codes.
 * Used by get_sop_guidance tool for AI agent lookups.
 */

export type SOPEntry = {
  errorCode: string;
  title: string;
  trigger: string;
  steps: string[];
  escalation?: string;
};

export const SOP_BY_ERROR_CODE: Record<string, SOPEntry> = {
  "0x80040115": {
    errorCode: "0x80040115",
    title: "FATAL ERROR: caught a fatal signal of exception",
    trigger: "FATAL ERROR: caught a fatal signal of exception",
    steps: [
      "Open Workflow Monitor in Informatica Admin Console",
      "Extract full log for the failed session",
      "Verify Workflow/Folder details via ESP Work Directory",
      "Check for OOM or resource exhaustion; restart the failed node if needed",
      "Escalate to TCC if issue persists after restart",
    ],
    escalation: "Contact TCC (BMCC – EDA Prod Batch) for job restart and closure email.",
  },
  "0x80070005": {
    errorCode: "0x80070005",
    title: "Access Denied / Permission Error",
    trigger: "Access denied or insufficient permissions",
    steps: [
      "Verify folder permissions in ESP Work Directory",
      "Check file system permissions for source/target paths",
      "Validate service account has read/write access to staging areas",
      "Escalate to Infra if permission changes are required",
    ],
  },
  "0x80070003": {
    errorCode: "0x80070003",
    title: "Path Not Found / File System Error",
    trigger: "The system cannot find the path specified",
    steps: [
      "Verify source/target file paths exist and are accessible",
      "Check for typos in mapping expressions",
      "Validate network drives are mounted and available",
      "Review recent folder or path changes in the workflow",
    ],
  },
  "0xC0042003": {
    errorCode: "0xC0042003",
    title: "File Writer / Transformation Error",
    trigger: "Failure in File Writer job",
    steps: [
      "Inspect File Writer transformation configuration",
      "Verify target directory exists and is writable",
      "Check for data truncation or type mismatch in columns",
    ],
    escalation: "Contact TCC (BMCC – EDA Prod Batch) to request job restart and send closure email.",
  },
};

export const DEFAULT_SOP: SOPEntry = {
  errorCode: "UNKNOWN",
  title: "Generic Fatal Error",
  trigger: "Unrecognized fatal error",
  steps: [
    "Open Workflow Monitor and extract the full log",
    "Search for error hex codes (e.g. 0x80040115) in the log",
    "Cross-reference with SOP knowledge base using the error code",
    "Apply recommended remediation steps for the matching code",
    "Escalate to TCC if no matching SOP or issue persists",
  ],
};

export function getSOPByErrorCode(errorCode: string): SOPEntry {
  const normalized = errorCode.trim().toLowerCase();
  const entry =
    SOP_BY_ERROR_CODE[errorCode] ??
    SOP_BY_ERROR_CODE[normalized] ??
    Object.values(SOP_BY_ERROR_CODE).find(
      (e) => e.errorCode.toLowerCase() === normalized
    );
  return entry ?? DEFAULT_SOP;
}

export function formatSOPAsText(entry: SOPEntry): string {
  const lines = [
    `[${entry.errorCode}] ${entry.title}`,
    `Trigger: ${entry.trigger}`,
    "Steps:",
    ...entry.steps.map((s, i) => `  ${i + 1}. ${s}`),
  ];
  if (entry.escalation) lines.push(`Escalation: ${entry.escalation}`);
  return lines.join("\n");
}
