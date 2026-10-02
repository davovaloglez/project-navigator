import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadProjects, loadTareas, loadCursos, loadCostos } from '../data/api.js';
import { estimatePersonCost } from '../data/costEngine.js';
import { isTareaDone } from '../data/types.js';
import { isActive } from '../data/projectStatus.js';
import { splitNames } from '../data/parsers.js';
import { getEquipoResolver } from '../data/equipoResolver.js';
import { textResult, errorResult } from './utils.js';

interface PersonSummary {
  /** equipo.id si resuelve; '' en modo degradado o cuando no hay match. */
  id: string;
  /** Display: usa fullName de equipo si está, si no el primer nombre encontrado en el Sheet. */
  nombre: string;
  nickname: string;
  roles: string[];
  activeProjects: number;
  totalProjects: number;
  pendingTasks: number;
}

export function registerPeopleTools(server: McpServer): void {
  server.tool(
    'list_people',
    'Lista personas del portafolio agregadas por identidad (equipo.id cuando resuelve). Incluye cuántos proyectos activos/totales tiene y tareas pendientes. La identidad viene del Sheet (columnas *_ID) o del resolver por nombre como fallback.',
    {},
    async () => {
      try {
        const [projects, tareas, cursos, resolver] = await Promise.all([
          loadProjects(),
          loadTareas(),
          loadCursos(),
          getEquipoResolver(),
        ]);

        // Agrupa por id resuelto. Si no resuelve, agrupa por nombre normalizado
        // como fallback para que no perdamos personas en modo degradado.
        const byId = new Map<string, PersonSummary>();
        const get = (id: string, nombre: string, nickname: string): PersonSummary => {
          let s = byId.get(id);
          if (!s) {
            s = { id: id.startsWith('name:') ? '' : id, nombre, nickname, roles: [], activeProjects: 0, totalProjects: 0, pendingTasks: 0 };
            byId.set(id, s);
          }
          return s;
        };
        const keyFor = (id: string | null, displayName: string) => id || `name:${displayName.toLowerCase().trim()}`;
        const displayFor = (id: string | null) => {
          if (!id) return '';
          const m = resolver.equipo.find((e) => e.id === id);
          return m ? m.fullName || m.nickname || id : id;
        };
        const nickFor = (id: string | null) => resolver.equipo.find((e) => e.id === id)?.nickname || '';

        const seenRole = (s: PersonSummary, r: string) => { if (!s.roles.includes(r)) s.roles.push(r); };

        for (const p of projects) {
          const active = isActive(p.estatus);
          const visit = (raw: string, ids: string[], role: string) => {
            const names = splitNames(raw);
            // Une nombres con ids: si el shape ids[] tiene la misma length, los empareja; si no, usa name-only fallback.
            const pairs: Array<{ name: string; id: string | null }> = [];
            if (ids.length === names.length) {
              for (let i = 0; i < names.length; i++) pairs.push({ name: names[i], id: ids[i] });
            } else {
              for (const n of names) pairs.push({ name: n, id: resolver.resolve(n) });
              // Si Sheet entregó ids para personas sin nombre legible, agrégalos también.
              for (const id of ids) if (!pairs.some((p) => p.id === id)) pairs.push({ name: displayFor(id) || id, id });
            }
            for (const { name, id } of pairs) {
              const k = keyFor(id, name);
              const display = displayFor(id) || name;
              const s = get(k, display, nickFor(id));
              seenRole(s, role);
              s.totalProjects++;
              if (active) s.activeProjects++;
            }
          };
          visit(p.arquitecto, p.arquitectoIds, 'Arquitecto');
          visit(p.pm, p.pmIds, 'PM');
          visit(p.devs.join(', '), p.devIds, 'Developer');
          visit(p.po, p.poIds, 'PO');
          visit(p.sqa, p.sqaIds, 'SQA');
        }

        // Agrega cursos (registro canónico): asegura que personas con curso pero sin proyecto aparezcan.
        for (const c of cursos) {
          const k = keyFor(c.equipoId || null, c.colaborador);
          const display = displayFor(c.equipoId || null) || c.colaborador;
          get(k, display, nickFor(c.equipoId || null));
        }

        // Cuenta tareas pendientes por asignadoId; fallback a nombre.
        for (const t of tareas) {
          if (isTareaDone(t.estatus)) continue;
          const id = t.asignadoId || resolver.resolve(t.asignado);
          const k = keyFor(id || null, t.asignado);
          const display = displayFor(id || null) || t.asignado;
          const s = get(k, display, nickFor(id || null));
          s.pendingTasks++;
        }

        const summaries = [...byId.values()].filter((s) => s.nombre);
        summaries.sort((a, b) => b.activeProjects - a.activeProjects || a.nombre.localeCompare(b.nombre));
        return textResult({ total: summaries.length, people: summaries });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_person',
    'Perfil de una persona: proyectos (rol, estatus, progreso), tareas, curso y costo estimado. Acepta `personId` (equipo.id, preferido) o `nombre` (resolverá por alias/fuzzy y caerá a substring si no hay registro).',
    {
      personId: z.string().optional().describe('equipo.id (preferido)'),
      nombre: z.string().optional().describe('Nombre/apodo; se resuelve a equipo.id si es posible'),
    },
    async ({ personId, nombre }) => {
      try {
        if (!personId && !nombre) return textResult({ error: 'Provee `personId` o `nombre`' });
        const [projects, tareas, cursos, costos, resolver] = await Promise.all([
          loadProjects(),
          loadTareas(),
          loadCursos(),
          loadCostos(),
          getEquipoResolver(),
        ]);

        const resolved = personId || (nombre ? resolver.resolve(nombre) : null);
        const member = resolved ? resolver.equipo.find((e) => e.id === resolved) || null : null;
        const display = member?.fullName || member?.nickname || nombre || resolved || '';

        const inField = (field: string) => {
          if (!nombre) return false;
          const q = nombre.toLowerCase();
          return splitNames(field).some((n) => n.toLowerCase() === q || n.toLowerCase().includes(q));
        };
        const projectMatches = (p: typeof projects[number]) => {
          if (resolved) {
            return p.arquitectoIds.includes(resolved) || p.pmIds.includes(resolved) ||
              p.devIds.includes(resolved) || p.poIds.includes(resolved) || p.sqaIds.includes(resolved);
          }
          return inField(p.arquitecto) || inField(p.pm) || p.devs.some((d) => d.toLowerCase().includes((nombre || '').toLowerCase())) ||
            inField(p.po) || inField(p.sqa);
        };
        const roleIn = (p: typeof projects[number]): string => {
          if (resolved) {
            if (p.arquitectoIds.includes(resolved)) return 'Arquitecto';
            if (p.pmIds.includes(resolved)) return 'PM';
            if (p.devIds.includes(resolved)) return 'Developer';
            if (p.poIds.includes(resolved)) return 'PO';
            if (p.sqaIds.includes(resolved)) return 'SQA';
            return '';
          }
          if (inField(p.arquitecto)) return 'Arquitecto';
          if (inField(p.pm)) return 'PM';
          if (p.devs.some((d) => d.toLowerCase().includes((nombre || '').toLowerCase()))) return 'Developer';
          if (inField(p.po)) return 'PO';
          if (inField(p.sqa)) return 'SQA';
          return '';
        };

        const personProjects = projects.filter(projectMatches);
        const personTasks = tareas.filter((t) => {
          if (resolved) return t.asignadoId === resolved;
          const q = (nombre || '').toLowerCase();
          return q && t.asignado.toLowerCase().includes(q);
        });
        const curso = cursos.find((c) => (resolved && c.equipoId === resolved) || (!resolved && nombre && c.colaborador.toLowerCase().includes(nombre.toLowerCase())));
        const costEstimate = estimatePersonCost({ personId: resolved || undefined, nombre }, projects, costos);

        return textResult({
          id: resolved || '',
          nombre: display,
          member,
          curso: curso ?? null,
          costEstimate,
          projects: personProjects.map((p) => ({
            id: p.id,
            folio: p.folio,
            actividad: p.actividad,
            estatus: p.estatus,
            salud: p.salud,
            progreso: p.progreso,
            sprint: p.sprint,
            role: roleIn(p),
          })),
          tasksSummary: {
            total: personTasks.length,
            pending: personTasks.filter((t) => !isTareaDone(t.estatus)).length,
            done: personTasks.filter((t) => isTareaDone(t.estatus)).length,
            points: personTasks.reduce((a, t) => a + (t.puntos || 0), 0),
            tracked: personTasks.reduce((a, t) => a + (t.tracked || 0), 0),
          },
          tasks: personTasks.slice(0, 50),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
