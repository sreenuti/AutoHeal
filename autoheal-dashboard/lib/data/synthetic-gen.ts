/**
 * Faker.js-based generator for synthetic Informatica logs.
 * Bank-grade: realistic raw log prefix, contextual breadcrumbs, and module/stack hints.
 */

import { faker } from "@faker-js/faker";

export type SyntheticLog = {
  id: string;
  timestamp: string;
  severity: "FATAL" | "ERROR" | "WARN";
  nodeId: string;
  workflowName: string;
  sessionId: string;
  taskName: string;
  errorCode: string;
  message: string;
  rawLog: string;
  metadata: {
    folder: string;
    integrationService: string;
    sourceSystem: string;
    targetTable?: string;
  };
};

const ERROR_MAP = {
  "0x80040115": {
    msg: "FATAL ERROR: caught a fatal signal of exception [SIGSEGV].",
    module: "IS_Worker_Thread",
  },
  "0xC0042003": {
    msg: "ERROR: Writer execution failed. Target file [tran_prod_ledger.csv] is locked by another process.",
    module: "WRITER_1_1_1",
  },
  "0x80070005": {
    msg: "FATAL: Access Denied to repository metadata. Check Kerberos ticket status.",
    module: "REP_61016",
  },
} as const;

const FOLDERS = ["FIN_PROD", "RETAIL_OPS", "AUDIT_V3"] as const;
const SOURCE_SYSTEMS = ["Mainframe_DB2_CORE", "Wealth_SOR", "Retail_ODS"] as const;
const TARGET_TABLES = ["tran_prod_ledger", "compliance_audit_log", "retail_daily_staging", "gl_recon_master"] as const;

export function generateSyntheticLog(): SyntheticLog {
  const errorCode = faker.helpers.arrayElement(
    Object.keys(ERROR_MAP)
  ) as keyof typeof ERROR_MAP;
  const nodeId = `Node_${faker.number.int({ min: 1, max: 9 })}`;
  const workflowName = faker.helpers.arrayElement([
    "wf_Retail_Daily",
    "wf_Compliance_Audit",
    "wf_General_Ledger",
  ]);
  const timestamp = new Date().toISOString();
  const folder = faker.helpers.arrayElement(FOLDERS);
  const sourceSystem = faker.helpers.arrayElement(SOURCE_SYSTEMS);
  const targetTable = faker.helpers.arrayElement(TARGET_TABLES);
  const threadId = faker.number.int({ min: 14000, max: 14999 });

  const { msg, module } = ERROR_MAP[errorCode];
  const severityTag = errorCode === "0xC0042003" ? "ERROR" : "FATAL";
  const prefix = `${severityTag}_${threadId}`;

  // Real-looking Informatica raw log: severity + thread ID, module, contextual breadcrumbs
  const rawLog = [
    `MAPPING> ${prefix} ${module} [${timestamp}] INFO: Initializing task...`,
    `MAPPING> ${prefix} ${module} [${timestamp}] ${msg} (Error Code: ${errorCode})`,
    `MAPPING> ${prefix} ${module} [${timestamp}] FATAL: process [pid=${faker.number.int({ min: 10000, max: 50000 })}] exiting.`,
    `--- Context: Folder [${folder}] | IntegrationSvc [IS_Bank_Prod_Grid] | Source [${sourceSystem}] ---`,
  ].join("\n");

  return {
    id: faker.string.uuid(),
    timestamp,
    severity: severityTag as "FATAL" | "ERROR",
    nodeId,
    workflowName,
    sessionId: `SESS_${faker.string.alphanumeric(6).toUpperCase()}`,
    taskName: `mkt_Load_${faker.word.noun()}`,
    errorCode,
    message: msg,
    rawLog,
    metadata: {
      folder,
      integrationService: "IS_Bank_Prod_Grid",
      sourceSystem,
      targetTable,
    },
  };
}

export function generateSyntheticLogs(count: number): SyntheticLog[] {
  return Array.from({ length: count }, () => generateSyntheticLog()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
