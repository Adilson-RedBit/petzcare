import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Parâmetro 'date' é obrigatório" }, { status: 400 });
  }
  const res = await proxyToWorker(
    request,
    `/api/available-slots?date=${encodeURIComponent(date)}`,
    { method: "GET" }
  );
  if (!res) return workerUnavailableResponse();
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? [], { status: res.status });
}
