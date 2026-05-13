// Minimal worker configuration types to satisfy TypeScript in build
// Adjust bindings as needed for Cloudflare Worker environments.
// Minimal worker configuration types to satisfy TypeScript in build
// Adjust bindings as needed for Cloudflare Worker environments.
type D1Database = any;
type R2Bucket = any;

declare global {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    JWT_SECRET: string;
    NODE_ENV?: string;
    WORKER_URL?: string;
    ALLOWED_ORIGINS?: string; // CSV de origens permitidas no CORS
  }

  type File = any;
  // Basic Headers stub
  class Headers {
    constructor(init?: any);
    append(name: string, value: string): void;
    set(name: string, value: string): void;
  }

  type Console = typeof globalThis.console;
  const console: Console;
}

export {};

