import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const qs = url.search ? url.search : "";
  const res = await proxyToWorker(request, `/api/services${qs}`, { method: "GET" });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? [], { status: res.status });
}
