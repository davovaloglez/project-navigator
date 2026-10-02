/** Recurso evaluable por `can()`. El prefijo determina el statement. */
export type Resource =
  | `page:${string}`
  | `data:${string}`
  | `action:${string}`
  | `block:${string}`;

export type OverrideEffect = 'allow' | 'deny';

/** Payload compacto enviado al cliente (sólo lo necesario para la UX). */
export interface EffectivePermissions {
  role: string;
  pages: string[];
  data: string[];
  actions: string[];
  /** Sólo los bloques DENEGADOS (no los ~149); default es allow. */
  blockDenies: string[];
}

/** Forma mínima del usuario que necesita el resolver. */
export interface PermUser {
  id: string;
  role?: string | null;
  banned?: boolean | null;
}
