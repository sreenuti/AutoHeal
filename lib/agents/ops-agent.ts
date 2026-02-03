import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSOPByErrorCode, formatSOPAsText } from "@/lib/knowledge/sop-db";

export type TroubleshootResult = {
  explanation: string;
  confidenceScore: number;
  reasoningSteps: string[];
  toolCalls: { name: string; args: unknown; result: string }[];
  rawText: string;
};

export async function troubleshootLog(logEntry: {
  rawLog: string;
  errorCode?: string;
  workflowName?: string;
  nodeId?: string;
}): Promise<TroubleshootResult> {
  const reasoningSteps: string[] = [];
  const toolCallHistory: { name: string; args: unknown; result: string }[] = [];

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are an Informatica operations expert. Your job is to troubleshoot fatal errors in Informatica logs.
Analyze the provided log entry, use the get_sop_guidance tool to look up the relevant SOP for the error code,
optionally use simulate_fix to validate a proposed remediation, and then provide a final fix.
Always include:
1. A clear Explanation of the recommended fix.
2. A Confidence Score from 0 to 100 (integer) based on how well the SOP matches the error.
Format your final response as:
Explanation: <your explanation>
Confidence Score: <number>`,
    prompt: `Troubleshoot this Informatica log:

\`\`\`
${logEntry.rawLog}
\`\`\`

Error code (if present): ${logEntry.errorCode ?? "extract from log"}
Workflow: ${logEntry.workflowName ?? "unknown"}
Node ID: ${logEntry.nodeId ?? "unknown"}

Analyze the log, fetch SOP guidance for the error code, propose a fix, and provide your Explanation and Confidence Score.`,
    tools: {
      get_sop_guidance: tool({
        description:
          "Returns SOP (Standard Operating Procedure) text from the Informatica knowledge base for a given error code. Use this to look up remediation steps.",
        inputSchema: z.object({
          errorCode: z
            .string()
            .describe(
              "Informatica error hex code (e.g. 0x80040115, 0x80070005)"
            ),
        }),
        execute: async ({ errorCode }) => {
          const entry = getSOPByErrorCode(errorCode);
          const text = formatSOPAsText(entry);
          toolCallHistory.push({
            name: "get_sop_guidance",
            args: { errorCode },
            result: text,
          });
          return text;
        },
      }),
      simulate_fix: tool({
        description:
          "Simulates applying a suggested fix (e.g. restart node, check permissions). Returns success or failure message.",
        inputSchema: z.object({
          action: z.string().describe("The action to simulate (e.g. 'restart node', 'check file path')"),
          targetNode: z.string().optional().describe("Node ID or target of the action"),
        }),
        execute: async ({ action, targetNode }) => {
          // Deterministic mock: success for restart/check, fail for invalid actions
          const success =
            /restart|check|verify|validate/i.test(action) ||
            action.toLowerCase().includes("permission");
          const msg = success
            ? `Simulation: ${action}${targetNode ? ` on ${targetNode}` : ""} — SUCCESS.`
            : `Simulation: ${action} — FAILED (action not in SOP).`;
          toolCallHistory.push({
            name: "simulate_fix",
            args: { action, targetNode },
            result: msg,
          });
          return msg;
        },
      }),
    },
    stopWhen: stepCountIs(5),
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      if (text) reasoningSteps.push(text);
      toolCalls?.forEach((tc, i) => {
        const res = toolResults?.[i];
        const input = "input" in tc ? tc.input : undefined;
        if (res != null) {
          reasoningSteps.push(
            `Tool: ${tc.toolName}(${JSON.stringify(input ?? {})}) => ${String(res)}`
          );
        }
      });
    },
  });

  const rawText = result.text;
  let explanation = "";
  let confidenceScore = 70;

  const explanationMatch = rawText.match(/Explanation:\s*([\s\S]*?)(?=Confidence Score:|$)/i);
  if (explanationMatch) explanation = explanationMatch[1].trim();

  const scoreMatch = rawText.match(/Confidence Score:\s*(\d+)/i);
  if (scoreMatch) confidenceScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));

  if (!explanation && rawText) explanation = rawText;

  return {
    explanation,
    confidenceScore,
    reasoningSteps,
    toolCalls: toolCallHistory,
    rawText,
  };
}
