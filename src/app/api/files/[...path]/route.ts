import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:5173";

async function proxyToWorker(path: string) {
  try {
    console.log('🔄 Fazendo proxy para:', `${WORKER_URL}${path}`);
    const response = await fetch(`${WORKER_URL}${path}`, {
      method: "GET",
      headers: {
        'Accept': 'image/*,*/*',
      },
    });
    console.log('📥 Resposta recebida:', response.status, response.statusText);
    return response;
  } catch (error) {
    console.error("❌ Erro ao fazer proxy para worker:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    // Juntar o array de path em uma string com barras
    const filePath = Array.isArray(path) ? path.join('/') : path;
    const decodedPath = decodeURIComponent(filePath);
    console.log('📁 Buscando arquivo via proxy (catch-all):', decodedPath);

    // Tentar fazer proxy para o worker
    const workerPath = `/api/files/${decodedPath}`;
    console.log('🔗 Caminho do worker:', workerPath);
    
    const workerResponse = await proxyToWorker(workerPath);

    if (workerResponse) {
      console.log('📡 Resposta do worker:', workerResponse.status, workerResponse.statusText);
      
      if (workerResponse.ok) {
        // Retornar a resposta do worker com os headers corretos
        const blob = await workerResponse.blob();
        const headers = new Headers();
        
        // Copiar headers importantes do worker
        workerResponse.headers.forEach((value, key) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === "content-type" || lowerKey === "cache-control" || lowerKey === "etag") {
            headers.set(key, value);
          }
        });
        
        // Se não tiver content-type, tentar inferir do filename
        if (!headers.has("content-type")) {
          const extension = decodedPath.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
          };
          if (extension && mimeTypes[extension]) {
            headers.set("content-type", mimeTypes[extension]);
          } else {
            headers.set("content-type", "application/octet-stream");
          }
        }
        
        return new NextResponse(blob, { headers });
      } else {
        const errorData = await workerResponse.json().catch(() => ({ error: 'Erro desconhecido do worker' }));
        console.error('❌ Erro do worker:', errorData);
        return NextResponse.json(
          { error: errorData.error || 'Erro ao buscar arquivo no worker' },
          { status: workerResponse.status }
        );
      }
    }

    // Se o worker não estiver disponível, retornar 404
    console.warn('⚠️ Worker não respondeu ou arquivo não encontrado:', decodedPath);
    return NextResponse.json(
      { error: "Arquivo não encontrado ou worker não está rodando" },
      { status: 404 }
    );
  } catch (error) {
    console.error("❌ Erro ao buscar arquivo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar arquivo" },
      { status: 500 }
    );
  }
}



























