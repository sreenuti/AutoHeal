import type { TroubleshootResponse } from "@/app/actions/ai-ops";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";

export type FixType = "node_restart" | "tcc_escalation" | null;

export function getFixType(
  result: TroubleshootResponse | null,
  log: SyntheticLog | null
): FixType {
  if (!result?.success || !log) return null;
  const code = log.errorCode;
  const explanation = result.success ? result.data.explanation : "";
  if (
    code === "0xC0042003" ||
    explanation.toLowerCase().includes("tcc") ||
    explanation.toLowerCase().includes("escalat")
  ) {
    return "tcc_escalation";
  }
  if (
    code === "0x80040115" ||
    code === "0x80070005" ||
    explanation.toLowerCase().includes("restart") ||
    explanation.toLowerCase().includes("node")
  ) {
    return "node_restart";
  }
  return "node_restart";
}
