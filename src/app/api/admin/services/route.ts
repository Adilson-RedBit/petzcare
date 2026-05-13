import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function GET(request: NextRequest) {
  const res = await proxyToWorker(request, "/api/admin/services", { method: "GET" });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? [], { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await proxyToWorker(request, "/api/admin/services", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? null, { status: res.status });
}
