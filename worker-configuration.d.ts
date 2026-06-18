// Tipos do ambiente Cloudflare Workers para o PetCare Agenda.
// Stub mínimo de D1 e R2 sem depender de @cloudflare/workers-types.

declare global {
  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta?: unknown;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(column?: string): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run(): Promise<{ success: boolean; meta?: unknown }>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<{ count: number; duration: number }>;
  }

  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  }

  interface R2Object {
    key: string;
    httpEtag: string;
    body: ReadableStream;
    writeHttpMetadata(headers: Headers): void;
  }

  interface R2Bucket {
    get(key: string): Promise<R2Object | null>;
    put(
      key: string,
      value: ArrayBuffer | ReadableStream | string,
      options?: { httpMetadata?: R2HTTPMetadata }
    ): Promise<R2Object>;
    delete(key: string): Promise<void>;
  }

  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    JWT_SECRET: string;
    RESEND_API_KEY?: string;
    NODE_ENV?: string;
    WORKER_URL?: string;
    ALLOWED_ORIGINS?: string;
  }

  // `process.env` é disponível via nodejs_compat no Workers runtime.
  const process: {
    env: {
      JWT_SECRET?: string;
      NODE_ENV?: string;
      WORKER_URL?: string;
      ALLOWED_ORIGINS?: string;
      [key: string]: string | undefined;
    };
  };
}

export {};
