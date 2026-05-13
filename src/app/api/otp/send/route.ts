import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

/**
 * Proxy para o worker que armazena OTP no D1 (C-4).
 * O Map em memória foi removido.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.identifier) {
      return NextResponse.json(
        { error: "Identificador obrigatório" },
        { status: 400 }
      );
    }

    const workerResponse = await proxyToWorker(request, "/api/otp/send", {
      method: "POST",
      body: JSON.stringify({ identifier: body.identifier }),
    });
    if (!workerResponse) return workerUnavailableResponse();

    const data = await workerResponse.json().catch(() => null);
    return NextResponse.json(data, { status: workerResponse.status });
  } catch (error) {
    console.error("Erro ao enviar OTP:", error);
    return NextResponse.json(
      { error: "Erro ao enviar código" },
      { status: 500 }
    );
  }
}
