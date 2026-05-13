import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.identifier || !body?.code) {
      return NextResponse.json(
        { error: "Identificador e código obrigatórios" },
        { status: 400 }
      );
    }

    const workerResponse = await proxyToWorker(request, "/api/otp/verify", {
      method: "POST",
      body: JSON.stringify({ identifier: body.identifier, code: body.code }),
    });
    if (!workerResponse) return workerUnavailableResponse();

    const data = await workerResponse.json().catch(() => null);
    return NextResponse.json(data, { status: workerResponse.status });
  } catch (error) {
    console.error("Erro ao verificar OTP:", error);
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 }
    );
  }
}
