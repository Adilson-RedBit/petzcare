import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const workerResponse = await proxyToWorker(request, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    if (!workerResponse) return workerUnavailableResponse();

    const data = await workerResponse.json().catch(() => null);
    if (!workerResponse.ok) {
      return NextResponse.json(
        { error: (data as any)?.error || "Email ou senha inválidos" },
        { status: workerResponse.status }
      );
    }

    if (!(data as any)?.jwt) {
      return NextResponse.json(
        { error: "Resposta inválida do servidor" },
        { status: 500 }
      );
    }

    // Setar cookie httpOnly com o JWT emitido pelo worker
    await setSessionCookie((data as any).jwt);

    // Não retornar o JWT no body para evitar leakage em logs/JS
    return NextResponse.json({
      success: true,
      user: (data as any).user,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro ao processar login" },
      { status: 500 }
    );
  }
}
