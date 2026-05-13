import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Retorna usuário a partir do JWT no cookie.
 * Validação completa de sessão (incluindo revogação) é feita pelo worker
 * em cada chamada de API real. Aqui só lemos o JWT para a UI.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error) {
    console.error("Erro ao obter usuário:", error);
    return NextResponse.json(
      { error: "Erro ao obter informações do usuário" },
      { status: 500 }
    );
  }
}
