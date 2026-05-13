import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const res = await proxyToWorker(request, `/api/admin/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? null, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await proxyToWorker(request, `/api/admin/services/${id}`, {
    method: "DELETE",
  });
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? null, { status: res.status });
}
