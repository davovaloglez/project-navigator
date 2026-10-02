import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ApiError } from '../data/api.js';

export function textResult(payload: unknown): CallToolResult {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: 'text', text }] };
}

/**
 * Convierte cualquier error en un CallToolResult con mensaje legible. Trata 401
 * y 403 de la API Astro de manera especial: hereda la denegación del rol del
 * usuario y la transmite al cliente del MCP de forma clara, sin marcarla como
 * "isError" (es una respuesta válida del sistema de permisos).
 */
export function errorResult(err: unknown): CallToolResult {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: 'Token MCP inválido o expirado. Genera uno nuevo en /cuenta → "Tokens MCP" y actualiza tu config (PN_API_TOKEN).',
        }],
      };
    }
    if (err.status === 403) {
      return {
        content: [{
          type: 'text',
          text: `Tu rol no tiene permiso para acceder a este recurso (${err.message}). Si necesitas acceso, pide a un admin que ajuste tus overrides en /admin.`,
        }],
      };
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${msg}` }],
  };
}
