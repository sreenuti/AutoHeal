"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TroubleshootResponse } from "@/app/actions/ai-ops";

type ReasoningPanelProps = {
  result: TroubleshootResponse | null;
  isLoading?: boolean;
};

export function ReasoningPanel({ result, isLoading }: ReasoningPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            AI Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="size-2 animate-pulse rounded-full bg-blue-500" />
            Analyzing log and fetching SOP guidance...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            AI Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Select a log entry above and click &quot;Troubleshoot&quot; to run the AI agent.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            AI Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 dark:text-red-400">
            {result.error}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data } = result;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            AI Troubleshooting
          </CardTitle>
          <Badge variant="outline">
            Confidence: {data.confidenceScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Explanation
          </h4>
          <p className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
            {data.explanation}
          </p>
        </div>

        {data.toolCalls.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tool Calls
            </h4>
            <ul className="space-y-2">
              {data.toolCalls.map((tc, i) => (
                <li
                  key={i}
                  className="rounded-md border border-neutral-200 bg-neutral-50/50 p-2 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <span className="text-blue-600 dark:text-blue-400">
                    {tc.name}
                  </span>
                  <span className="text-neutral-500">({JSON.stringify(tc.args)})</span>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-neutral-600 dark:text-neutral-400">
                    {tc.result}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.reasoningSteps.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Reasoning Steps
            </h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              {data.reasoningSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
