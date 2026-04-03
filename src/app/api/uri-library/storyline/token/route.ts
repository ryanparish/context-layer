import { NextResponse } from "next/server";

import { requireSession } from "@/server/auth/requireSession";
import { signStorylineValidationToken } from "@/server/auth/session";

export async function POST() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await signStorylineValidationToken(session.tenantId);
  return NextResponse.json({ token, expiresIn: "30d" });
}

