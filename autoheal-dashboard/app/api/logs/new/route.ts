import { NextResponse } from "next/server";
import { generateSyntheticLog } from "@/lib/data/synthetic-gen";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = generateSyntheticLog();
  return NextResponse.json({ log });
}
