import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await proxyToWorker(request, `/api/appointments/${id}/confirm`, {
    method: "PATCH",
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? null, { status: res.status });
}
