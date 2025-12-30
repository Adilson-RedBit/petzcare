import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:5173";

async function proxyToWorker(path: string, options?: RequestInit) {
  try {
    const response = await fetch(`${WORKER_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    return response;
  } catch (error) {
    console.error("Erro ao fazer proxy para worker:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get("pet_id");
    
    const path = petId ? `/api/services?pet_id=${petId}` : "/api/services";
    
    const workerResponse = await proxyToWorker(path, {
      method: "GET",
    });

    if (workerResponse && workerResponse.ok) {
      const data = await workerResponse.json();
      return NextResponse.json(data);
    }

    // Se o worker não estiver disponível, retornar array vazio
    return NextResponse.json([]);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviços" },
      { status: 500 }
    );
  }
}



























