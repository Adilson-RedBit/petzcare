import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const workerResponse = await proxyToWorker(request, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    if (!workerResponse) return workerUnavailableResponse();
    const data = await workerResponse.json().catch(() => null);

    if (!workerResponse.ok) {
      return NextResponse.json(
        { error: (data as any)?.error || "Erro ao criar conta" },
        { status: workerResponse.status }
      );
    }

    if ((data as any)?.jwt) {
      await setSessionCookie((data as any).jwt);
    }

    return NextResponse.json(
      { success: true, user: (data as any)?.user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}
