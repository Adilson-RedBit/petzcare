import { NextRequest, NextResponse } from "next/server";
import { proxyToWorker, workerUnavailableResponse } from "@/lib/workerProxy";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const decoded = decodeURIComponent(filename);

  if (decoded.includes("..")) {
    return NextResponse.json({ error: "Path inválido" }, { status: 400 });
  }

  // Se contém /, redireciona pra catch-all
  if (decoded.includes("/")) {
    const url = new URL(request.url);
    url.pathname = `/api/files/${decoded}`;
    return NextResponse.redirect(url);
  }

  const res = await proxyToWorker(request, `/api/files/${decoded}`, {
    method: "GET",
  });
  if (!res) return workerUnavailableResponse();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Arquivo não encontrado" }, {
      status: res.status,
    });
  }

  const blob = await res.blob();
  const headers = new Headers();
  res.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "content-type" || k === "cache-control" || k === "etag") {
      headers.set(key, value);
    }
  });
  if (!headers.has("content-type")) {
    const ext = decoded.split(".").pop()?.toLowerCase();
    headers.set("content-type", (ext && MIME_BY_EXT[ext]) || "application/octet-stream");
  }
  return new NextResponse(blob, { headers });
}
