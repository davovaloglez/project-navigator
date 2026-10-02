/// <reference types="astro/client" />

import type { Session } from './lib/auth';

declare global {
  namespace App {
    interface Locals {
      user: Session['user'] | null;
      session: Session['session'] | null;
    }
  }
}

interface ImportMetaEnv {
  readonly GOOGLE_CREDENTIALS: string;
  readonly SHEET_ID: string;
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly BETTER_AUTH_URL: string;
  readonly GOOGLE_OAUTH_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_CLIENT_SECRET: string;
  readonly ALLOWED_GOOGLE_DOMAIN?: string;
  readonly CRON_SECRET?: string;
  readonly AI_BEARER_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
