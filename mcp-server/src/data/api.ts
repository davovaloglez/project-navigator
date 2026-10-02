/**
 * Cliente HTTP al API de Project Navigator. Reemplaza al acceso directo a
 * Google Sheets/Turso: el server hace el scoping por identidad y los gates de
 * permisos (data:costos, etc.), así el MCP hereda los mismos permisos que la
 * UI del usuario dueño del token.
 *
 * Cache: 5 min en memoria por proceso (mismo TTL que la app). Refresco
 * inmediato = reiniciar el MCP.
 */
import type {
  CostoRecord,
  CursoRecord,
  EquipoRecord,
  EvaluacionRecord,
  FinancialModel,
  GlossaryEntry,
  GlossarySection,
  ProjectRecord,
  TareaRecord,
} from './types.js';

const CACHE_TTL = 5 * 60 * 1000;

type CacheEntry<T> = { data: T; timestamp: number };
const cache = new Map<string, CacheEntry<unknown>>();

function envBaseUrl(): string {
  const raw = process.env.PN_API_URL;
  if (!raw) throw new Error('PN_API_URL env var is not set (ej. http://localhost:4321 o https://tu-deployment.amplifyapp.com)');
  return raw.replace(/\/+$/, '');
}

function envToken(): string {
  const t = process.env.PN_API_TOKEN;
  if (!t) throw new Error('PN_API_TOKEN env var is not set (genera uno en /cuenta → "Tokens MCP")');
  if (!t.startsWith('pn_mcp_')) {
    throw new Error('PN_API_TOKEN no tiene el formato esperado (`pn_mcp_*`). Verifica que copiaste el token completo desde /cuenta.');
  }
  return t;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${envBaseUrl()}${path}`;
  const token = envToken();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (err) {
    throw new ApiError(0, `Network error contacting ${url}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (body && typeof body === 'object' && 'error' in body) ? String((body as { error: unknown }).error) : `HTTP ${res.status}`;
    const code = (body && typeof body === 'object' && 'code' in body) ? String((body as { code: unknown }).code) : undefined;
    throw new ApiError(res.status, message, code);
  }
  return (await res.json()) as T;
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.timestamp < CACHE_TTL) return hit.data;
  const data = await loader();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function invalidateCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

// --- loaders por endpoint ---------------------------------------------------

export function loadProjects(): Promise<ProjectRecord[]> {
  return cached('projects', () => fetchJson<ProjectRecord[]>('/api/proyectos'));
}

export function loadTareas(): Promise<TareaRecord[]> {
  return cached('tareas', () => fetchJson<TareaRecord[]>('/api/tareas'));
}

export function loadCursos(): Promise<CursoRecord[]> {
  return cached('cursos', () => fetchJson<CursoRecord[]>('/api/cursos'));
}

export function loadCostos(): Promise<CostoRecord[]> {
  return cached('costos', () => fetchJson<CostoRecord[]>('/api/costos'));
}

export function loadFinancialModel(): Promise<FinancialModel> {
  return cached('financial-model', async () => {
    // El endpoint devuelve [FinancialModel] (lista de 1), no un objeto suelto.
    const list = await fetchJson<FinancialModel[]>('/api/costos-modelo');
    return list[0] ?? { steps: [], costoOperativo: 0, valorExperienciaRate: 0, costoAdminRate: 0, margenRate: 0, ivaRate: 0, total: 0 };
  });
}

export interface EquipoPayload {
  equipo: EquipoRecord[];
  roles: { id: string; name: string }[];
}

export function loadEquipo(): Promise<EquipoPayload> {
  return cached('equipo', async () => {
    const raw = await fetchJson<{ equipo: Array<Record<string, unknown>>; roles: Array<{ id: string; name: string }> }>('/api/equipo');
    const equipo: EquipoRecord[] = raw.equipo.map((e) => ({
      id: String(e.id ?? ''),
      fullName: String(e.fullName ?? ''),
      nickname: String(e.nickname ?? ''),
      tag: String(e.tag ?? ''),
      email: String(e.email ?? ''),
      title: String(e.title ?? ''),
      department: String(e.department ?? ''),
      roleId: String(e.roleId ?? ''),
      roleName: String(e.roleName ?? ''),
      managerId: String(e.managerId ?? ''),
      managerName: String(e.managerName ?? ''),
      active: Boolean(e.active),
      hasLogin: Boolean(e.hasLogin),
      image: e.image == null ? null : String(e.image),
    }));
    return { equipo, roles: raw.roles ?? [] };
  });
}

// --- Evaluaciones (HU NAV-78) ----------------------------------------------

/**
 * Lectura cross-persona de evaluaciones trimestrales (sólo admin por
 * default; gateado por `action:evaluacion:view-all`). Si el usuario no
 * tiene permiso, ApiError(403) se propaga y errorResult lo traduce.
 */
export function loadEvaluaciones(): Promise<EvaluacionRecord[]> {
  return cached('evaluaciones', async () => {
    const raw = await fetchJson<{ evaluaciones: EvaluacionRecord[] }>('/api/evaluaciones');
    return raw.evaluaciones ?? [];
  });
}

/**
 * Auto-evaluación del usuario autenticado (filtrada server-side por
 * `user.equipoId`). Sin permisos especiales.
 */
export function loadMisEvaluaciones(): Promise<{ evaluaciones: EvaluacionRecord[]; equipoId: string | null }> {
  return cached('mis-evaluaciones', async () => {
    return fetchJson<{ evaluaciones: EvaluacionRecord[]; equipoId: string | null }>('/api/me/evaluaciones');
  });
}

export interface GlossaryPayload {
  sections: GlossarySection[];
  entries: GlossaryEntry[];
}

/**
 * Glosario filtrado por permisos del usuario (el server aplica las mismas
 * reglas que GlosarioSection: sólo secciones de páginas visibles, sólo
 * entradas de bloques no denegados). El MCP lo recibe ya recortado.
 */
export function loadGlossary(): Promise<GlossaryPayload> {
  return cached('glossary', () => fetchJson<GlossaryPayload>('/api/glossary'));
}
