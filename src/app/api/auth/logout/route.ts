import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { proxyToWorker } from "@/lib/workerProxy";

/**
 * A-9: logout invalida a sessão no banco antes de apagar o cookie.
 */
export async function POST(request: NextRequest) {
  try {
    // Tenta invalidar no worker (best-effort)
    await proxyToWorker(request, "/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
