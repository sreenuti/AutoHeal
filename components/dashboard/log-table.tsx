"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyntheticLog } from "@/lib/data/synthetic-gen";

type LogTableProps = {
  logs: SyntheticLog[];
  onSelectLog?: (log: SyntheticLog) => void;
  selectedLogId?: string | null;
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LogTable({ logs, onSelectLog, selectedLogId }: LogTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Fatal Logs</CardTitle>
        <p className="text-sm text-neutral-500">
          {logs.length} synthetic log entries — click a row to troubleshoot
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Error Code</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                data-state={selectedLogId === log.id ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onSelectLog?.(log)}
              >
                <TableCell className="font-mono text-xs">
                  {formatTime(log.timestamp)}
                </TableCell>
                <TableCell className="font-mono text-xs">{log.nodeId}</TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[180px]">
                  {log.workflowName}
                </TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[140px]">
                  {log.taskName}
                </TableCell>
                <TableCell className="font-mono text-xs text-amber-600 dark:text-amber-400">
                  {log.errorCode}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">{log.severity}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
