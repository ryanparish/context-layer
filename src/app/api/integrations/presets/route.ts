import { NextResponse } from "next/server";

import { integrationPresets } from "@/data/integrationPresets";

export async function GET() {
  return NextResponse.json({ presets: integrationPresets });
}
