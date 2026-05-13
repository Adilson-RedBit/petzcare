import { NextRequest, NextResponse } from "next/server";
import { validateUpload, UPLOAD_CONFIGS } from "@/lib/validateUpload";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;
    if (!file) {
      return NextResponse.json({ error: "Foto não enviada" }, { status: 400 });
    }
    const validation = validateUpload(file, UPLOAD_CONFIGS.image);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const res = await proxyToWorker(request, "/api/upload-pet-photo", {
      method: "POST",
      body: formData,
    });
    if (!res) return workerUnavailableResponse();
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? null, { status: res.status });
  } catch (error) {
    console.error("Erro upload foto:", error);
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 });
  }
}
