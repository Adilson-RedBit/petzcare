import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const qs = url.search ? url.search : "";
  const res = await proxyToWorker(request, `/api/appointments${qs}`, {
    method: "GET",
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? [], { status: res.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await proxyToWorker(request, "/api/appointments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? null, { status: res.status });
}
