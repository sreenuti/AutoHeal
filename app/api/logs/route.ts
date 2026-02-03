import { NextResponse } from "next/server";
import { generateSyntheticLogs } from "@/lib/data/synthetic-gen";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = generateSyntheticLogs(12);
  return NextResponse.json({
    logs,
    total: logs.length,
    generatedAt: new Date().toISOString(),
  });
}
