/**
 * Validação de uploads dentro do worker.
 * Resolve C-8: o worker confiava no Next.js. Agora valida tudo de novo.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);

// Magic bytes para detecção real do tipo (anti-spoofing de Content-Type)
async function detectMimeFromBytes(buffer: ArrayBuffer): Promise<string | null> {
  const view = new Uint8Array(buffer.slice(0, 16));
  // JPEG: FF D8 FF
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47)
    return "image/png";
  // GIF: 47 49 46 38
  if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x38)
    return "image/gif";
  // WEBP: RIFF....WEBP
  if (
    view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
    view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
  )
    return "image/webp";
  // SVG: começa com "<svg" ou "<?xml" (texto)
  const text = new TextDecoder().decode(view);
  if (text.trimStart().startsWith("<svg") || text.trimStart().startsWith("<?xml"))
    return "image/svg+xml";
  return null;
}

export interface ImageUploadResult {
  ok: true;
  buffer: ArrayBuffer;
  mime: string;
  extension: string;
}
export interface ImageUploadError {
  ok: false;
  error: string;
}

export async function validateImageUpload(
  file: File
): Promise<ImageUploadResult | ImageUploadError> {
  if (!file) return { ok: false, error: "Arquivo não enviado" };
  if (file.size === 0) return { ok: false, error: "Arquivo vazio" };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx 5MB)" };
  }

  // Bloqueio defensivo de path traversal em nomes de arquivo
  const fname = (file.name || "").toLowerCase();
  if (fname.includes("..") || fname.includes("/") || fname.includes("\\")) {
    return { ok: false, error: "Nome de arquivo inválido" };
  }

  // Extensão declarada (verificação básica de nome)
  const ext = fname.split(".").pop() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Extensão não permitida" };
  }

  // Magic bytes — fonte de verdade. Ignora o MIME declarado pelo browser
  // pra evitar falsos positivos quando extensão e tipo não batem (ex: JPEG salvo como .png).
  const buffer = await file.arrayBuffer();
  const detected = await detectMimeFromBytes(buffer);
  if (!detected) {
    return { ok: false, error: "Arquivo não é uma imagem válida" };
  }

  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };

  return { ok: true, buffer, mime: detected, extension: MIME_TO_EXT[detected] ?? ext };
}
