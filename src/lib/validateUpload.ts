/**
 * Validação robusta de uploads de arquivos
 */

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadConfig {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

/**
 * Configurações padrão para diferentes tipos de upload
 */
export const UPLOAD_CONFIGS = {
  image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
} as const;

/**
 * Valida um arquivo de upload
 */
export function validateUpload(
  file: File,
  config: UploadConfig = UPLOAD_CONFIGS.image
): UploadValidationResult {
  // Verificar se arquivo existe
  if (!file) {
    return {
      valid: false,
      error: 'Nenhum arquivo fornecido',
    };
  }

  // Validar tamanho
  if (file.size > config.maxSizeBytes) {
    const maxSizeMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    };
  }

  // Validar tipo MIME
  if (!config.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${config.allowedMimeTypes.join(', ')}`,
    };
  }

  // Validar extensão
  const fileName = file.name.toLowerCase();
  const hasValidExtension = config.allowedExtensions.some(ext => 
    fileName.endsWith(ext.toLowerCase())
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Extensão não permitida. Extensões aceitas: ${config.allowedExtensions.join(', ')}`,
    };
  }

  // Validar nome do arquivo (prevenir path traversal)
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: 'Nome de arquivo inválido',
    };
  }

  // Validar tamanho mínimo (arquivo não pode estar vazio)
  if (file.size === 0) {
    return {
      valid: false,
      error: 'Arquivo vazio não é permitido',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Valida múltiplos arquivos
 */
export function validateMultipleUploads(
  files: File[],
  config: UploadConfig = UPLOAD_CONFIGS.image,
  maxFiles: number = 10
): UploadValidationResult {
  if (files.length === 0) {
    return {
      valid: false,
      error: 'Nenhum arquivo fornecido',
    };
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Muitos arquivos. Máximo permitido: ${maxFiles}`,
    };
  }

  // Validar cada arquivo
  for (const file of files) {
    const result = validateUpload(file, config);
    if (!result.valid) {
      return result;
    }
  }

  return {
    valid: true,
  };
}





















