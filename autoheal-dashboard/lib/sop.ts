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