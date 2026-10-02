/**
 * Adaptador del export real de contratos de Samva (stored procedure
 * `dbo.stp_ObtenerResumenContratosJSON`, ver mocks/healt-score/ExportarContratos.txt)
 * al contrato canónico `CsCliente[]` del tablero CS 360.
 *
 * Normalizaciones (hallazgos del análisis del export de 461 clientes):
 * - Centinelas `"- - - - - -"` / `"- -"` → null.
 * - Fechas raíz en `DD/MM/YYYY` → ISO `YYYY-MM-DD` (las de tickets/actividades/
 *   llamadas ya vienen ISO y pasan tal cual).
 * - `id` numérico → string; 2 de 461 vienen duplicados → se desambiguan con sufijo.
 * - Tickets: `estado_nombre` → `estatus`; se conserva `fecha_termino` (señal
 *   canónica de cierre, null = abierto). Se descartan campos de UI
 *   (`*_color`, `*_icono`, métricas dMinutos*) para adelgazar el payload.
 * - Actividades: `responsable_registro_alias_publico || responsable_registro_alias`
 *   → `responsable`.
 * - Llamadas: URLs de `grabacion` vienen malformadas con doble prefijo
 *   (`https://static.samva.io/1/connect/https://bit-connect.s3...`) → se toma
 *   la última URL embebida. `percepcion_cliente_*` con centinela → null.
 * - `uso_plataforma`: el export trae ~40 métricas; se proyectan las 5 que la
 *   UI consume. Si el bloque sólo trae identificadores (62/461) → null.
 *
 * Es PURO (sin fs/red): testeable con Node y reutilizable si el día de mañana
 * el endpoint consume el stored procedure directo en lugar de un archivo.
 */
import type {
  CsCliente,
  CsTicket,
  CsActividad,
  CsLlamada,
  CsUsoPlataforma,
  CsKpiFinanciero,
} from '../utils/cs360';

type RawRec = Record<string, unknown>;
export type RawContrato = RawRec;

/** String limpio: trim + centinelas de Samva ("- - - - - -", "- -") → null. */
function s(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v === '' || /^(- )+-$/.test(v)) return null;
  return v;
}

function n(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** DD/MM/YYYY → YYYY-MM-DD. Fechas ya-ISO pasan tal cual. Centinelas → null. */
function fechaISO(value: unknown): string | null {
  const v = s(value);
  if (!v) return null;
  const ddmmyyyy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  return v;
}

/**
 * Repara las URLs de grabación con doble prefijo del export
 * (p.ej. `https://static.samva.io/1/connect/https://bit-connect.s3...`):
 * conserva la última URL embebida.
 */
function fixGrabacion(value: unknown): string | null {
  const v = s(value);
  if (!v) return null;
  const idx = v.lastIndexOf('http');
  return idx > 0 ? v.slice(idx) : v;
}

function adaptTicket(raw: RawRec): CsTicket {
  return {
    id: String(raw.id ?? ''),
    folio: s(raw.folio) ?? String(raw.id ?? ''),
    titulo: s(raw.titulo) ?? '',
    estatus: s(raw.estado_nombre) ?? s(raw.estatus) ?? '',
    prioridad: s(raw.prioridad) ?? '',
    tipo_incidencia: s(raw.tipo_incidencia) ?? '',
    equipo_actual: s(raw.equipo_actual) ?? '',
    asignado_actual: s(raw.asignado_actual) ?? s(raw.responsable),
    fecha_registro: s(raw.fecha_registro) ?? '',
    fecha_termino: s(raw.fecha_termino),
    descripcion: s(raw.descripcion),
    comentarios: s(raw.comentarios),
    url: null,
  };
}

function adaptActividad(raw: RawRec): CsActividad {
  return {
    id: String(raw.id ?? ''),
    fecha_inicio: s(raw.fecha_inicio) ?? '',
    tipo_nombre: s(raw.tipo_nombre) ?? '',
    responsable: s(raw.responsable_registro_alias_publico) ?? s(raw.responsable_registro_alias),
    asunto: s(raw.asunto) ?? '',
    contenido: s(raw.contenido),
  };
}

function adaptLlamada(raw: RawRec): CsLlamada {
  return {
    id: String(raw.id ?? ''),
    fecha_inicio: s(raw.fecha_inicio) ?? '',
    agente_nombre: s(raw.agente_nombre),
    duracion_textual: s(raw.duracion_textual),
    percepcion_cliente_estado: s(raw.percepcion_cliente_estado),
    percepcion_cliente_texto: s(raw.percepcion_cliente_texto),
    calificacion: n(raw.calificacion),
    grabacion: fixGrabacion(raw.grabacion),
    resumen: null,
  };
}

function adaptUsoPlataforma(raw: unknown): CsUsoPlataforma | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as RawRec;
  // 62/461 traen sólo identificadores (sin métricas) → tratarlo como ausente.
  if (!('admin_finanzas_pagos' in u)) return null;
  return {
    alumnos_inscritos_admon_actuales: n(u.alumnos_inscritos_admon_actuales) ?? 0,
    admin_finanzas_pagos: n(u.admin_finanzas_pagos) ?? 0,
    admin_finanzas_facturas: n(u.admin_finanzas_facturas) ?? 0,
    control_escolar_clases_contenidos_adicionales:
      n(u.control_escolar_clases_contenidos_adicionales) ?? 0,
    crm_prospectos_actuales: n(u.crm_prospectos_actuales) ?? 0,
  };
}

function adaptKpi(raw: unknown): CsKpiFinanciero {
  const k = (raw && typeof raw === 'object' ? raw : {}) as RawRec;
  const abc = s(k.clasificacion_abc);
  return {
    ranking: n(k.ranking),
    clasificacion_abc: abc === 'A' || abc === 'B' || abc === 'C' ? abc : null,
    es_vital: k.es_vital === true,
  };
}

/** Orden descendente por fecha (más reciente primero) para todas las listas. */
function byFechaDesc(field: string) {
  return (a: RawRec, b: RawRec): number =>
    String(b[field] ?? '').localeCompare(String(a[field] ?? ''));
}

export function adaptContrato(raw: RawContrato): CsCliente {
  const tickets = Array.isArray(raw.tickets) ? ([...raw.tickets] as RawRec[]) : [];
  const actividades = Array.isArray(raw.actividades) ? ([...raw.actividades] as RawRec[]) : [];
  const llamadas = Array.isArray(raw.llamadas) ? ([...raw.llamadas] as RawRec[]) : [];
  tickets.sort(byFechaDesc('fecha_registro'));
  actividades.sort(byFechaDesc('fecha_inicio'));
  llamadas.sort(byFechaDesc('fecha_inicio'));

  return {
    id: String(raw.id ?? ''),
    numero_cliente: s(raw.numero_cliente) ?? String(n(raw.numero_cliente) ?? ''),
    nombre: s(raw.nombre) ?? s(raw.alias) ?? `Cliente ${String(raw.id ?? '?')}`,
    alias: s(raw.alias),
    estatus: s(raw.estatus) ?? 'Desconocido',
    url: s(raw.url),
    url_academic: s(raw.url_academic),
    fecha_vigencia: fechaISO(raw.fecha_vigencia),
    alumnos_vigentes: n(raw.alumnos_vigentes) ?? 0,
    nivel_servicio: s(raw.nivel_servicio),
    resultado_html_magnum: s(raw.resultado_html_magnum),
    kpi_financiero: adaptKpi(raw.kpi_financiero),
    uso_plataforma: adaptUsoPlataforma(raw.uso_plataforma),
    tickets: tickets.map(adaptTicket),
    actividades: actividades.map(adaptActividad),
    llamadas: llamadas.map(adaptLlamada),
  };
}

export function adaptContratos(raw: RawContrato[]): CsCliente[] {
  const clientes = raw.map(adaptContrato);
  // El export trae ids duplicados (2/461). Los ids alimentan la selección de la
  // UI y el store de IA, así que se desambiguan determinísticamente.
  const seen = new Map<string, number>();
  for (const c of clientes) {
    const count = seen.get(c.id) ?? 0;
    seen.set(c.id, count + 1);
    if (count > 0) c.id = `${c.id}-${count + 1}`;
  }
  return clientes;
}
