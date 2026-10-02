import { useMemo, useState, useCallback } from 'react';
import { Search, ChevronRight, ChevronDown, Users, GitBranch, Layers, AlertCircle, Check, Crosshair, ArrowLeft } from 'lucide-react';
import { usePersistedFilters } from '../../../hooks/usePersistedFilters';
import Avatar from '../../ui/Avatar';
import GlossaryTooltip from '../../ui/GlossaryTooltip';

export interface OrgMember {
  id: string;
  fullName: string;
  image: string | null;
  active: boolean;
  managerId: string;
  managerName: string;
  roleName?: string;
  title?: string;
  department?: string;
}

interface OrgNode {
  member: OrgMember;
  children: OrgNode[];
  directCount: number;
  totalDescendants: number;
  level: number;
}

interface Filters {
  showInactive: boolean;
}

const DEFAULT_FILTERS: Filters = { showInactive: false };
const DEFAULT_EXPAND_LEVELS = 2;

function buildTree(members: OrgMember[]): {
  roots: OrgNode[];
  orphans: OrgMember[];
  cycles: OrgMember[];
  nodeById: Map<string, OrgNode>;
} {
  const byId = new Map(members.map((m) => [m.id, m] as const));
  const childrenById = new Map<string, string[]>();
  for (const m of members) {
    if (m.managerId && byId.has(m.managerId)) {
      const arr = childrenById.get(m.managerId) || [];
      arr.push(m.id);
      childrenById.set(m.managerId, arr);
    }
  }

  // Detección defensiva de ciclos (anti-cycle del backend debería prevenirlos).
  function inCycle(startId: string): boolean {
    const seen = new Set<string>();
    let curr: string | undefined = startId;
    while (curr) {
      if (seen.has(curr)) return true;
      seen.add(curr);
      curr = byId.get(curr)?.managerId || undefined;
      if (curr && !byId.has(curr)) return false;
    }
    return false;
  }
  const cycleIds = new Set<string>();
  for (const m of members) if (m.managerId && inCycle(m.id)) cycleIds.add(m.id);

  const nodeById = new Map<string, OrgNode>();
  function buildNode(id: string, level: number, ancestry: Set<string>): OrgNode {
    if (ancestry.has(id)) {
      // Cortocircuito defensivo
      return {
        member: byId.get(id)!,
        children: [],
        directCount: 0,
        totalDescendants: 0,
        level,
      };
    }
    const nextAncestry = new Set(ancestry).add(id);
    const member = byId.get(id)!;
    const childIds = childrenById.get(id) || [];
    const childNodes = childIds.map((cid) => buildNode(cid, level + 1, nextAncestry));
    childNodes.sort(
      (a, b) =>
        Number(b.member.active) - Number(a.member.active) ||
        b.totalDescendants - a.totalDescendants ||
        a.member.fullName.localeCompare(b.member.fullName),
    );
    const node: OrgNode = {
      member,
      children: childNodes,
      directCount: childIds.length,
      totalDescendants: childIds.length + childNodes.reduce((s, c) => s + c.totalDescendants, 0),
      level,
    };
    nodeById.set(id, node);
    return node;
  }

  const roots: OrgNode[] = [];
  const orphans: OrgMember[] = [];
  const cycles: OrgMember[] = [];
  for (const m of members) {
    if (cycleIds.has(m.id)) {
      cycles.push(m);
      continue;
    }
    const isRoot = !m.managerId || !byId.has(m.managerId);
    if (!isRoot) continue;
    const node = buildNode(m.id, 0, new Set());
    if (node.totalDescendants === 0) orphans.push(m);
    else roots.push(node);
  }
  roots.sort(
    (a, b) =>
      Number(b.member.active) - Number(a.member.active) ||
      b.totalDescendants - a.totalDescendants ||
      a.member.fullName.localeCompare(b.member.fullName),
  );
  orphans.sort(
    (a, b) => Number(b.active) - Number(a.active) || a.fullName.localeCompare(b.fullName),
  );

  return { roots, orphans, cycles, nodeById };
}

/** Computa qué nodos hacen match con la búsqueda (texto en cualquier campo display). */
function matchTokens(member: OrgMember, q: string): boolean {
  if (!q) return false;
  return [member.fullName, member.roleName, member.title, member.department]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}

/** IDs cuya rama contiene un match (incluye el match mismo y sus ancestros). */
function collectMatchAncestry(roots: OrgNode[], q: string): { matches: Set<string>; ancestorsOfMatch: Set<string> } {
  const matches = new Set<string>();
  const ancestorsOfMatch = new Set<string>();
  if (!q) return { matches, ancestorsOfMatch };
  function visit(node: OrgNode, ancestry: string[]): boolean {
    let any = false;
    if (matchTokens(node.member, q)) {
      matches.add(node.member.id);
      any = true;
    }
    for (const c of node.children) {
      if (visit(c, [...ancestry, node.member.id])) any = true;
    }
    if (any) {
      for (const a of ancestry) ancestorsOfMatch.add(a);
    }
    return any;
  }
  for (const r of roots) visit(r, []);
  return { matches, ancestorsOfMatch };
}

/** IDs hasta cierto nivel (para expansión por defecto). */
function idsUpToLevel(roots: OrgNode[], maxLevel: number): Set<string> {
  const ids = new Set<string>();
  function visit(node: OrgNode) {
    if (node.level < maxLevel) ids.add(node.member.id);
    for (const c of node.children) visit(c);
  }
  for (const r of roots) visit(r);
  return ids;
}

function collectAllIds(roots: OrgNode[]): Set<string> {
  const ids = new Set<string>();
  function visit(node: OrgNode) {
    ids.add(node.member.id);
    for (const c of node.children) visit(c);
  }
  for (const r of roots) visit(r);
  return ids;
}

interface Props {
  equipo: OrgMember[];
}

/**
 * Organigrama del equipo: tree indentado a partir de `equipo.manager_id`.
 * Soporta búsqueda (auto-expande ramas con match), expansión por defecto a
 * los primeros 2 niveles, Focus en un subárbol y manejo defensivo de
 * huérfanos (sin manager y sin subordinados) y ciclos.
 */
export default function Organigrama({ equipo }: Props) {
  const { state: filters, setState: setFilters } = usePersistedFilters<Filters>(
    'equipo-organigrama',
    DEFAULT_FILTERS,
  );
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const filteredMembers = useMemo(
    () => (filters.showInactive ? equipo : equipo.filter((m) => m.active)),
    [equipo, filters.showInactive],
  );

  const { roots, orphans, cycles, nodeById } = useMemo(
    () => buildTree(filteredMembers),
    [filteredMembers],
  );

  const focusedNode = focusId ? nodeById.get(focusId) ?? null : null;
  const displayRoots = focusedNode ? [focusedNode] : roots;

  const q = search.trim().toLowerCase();
  const { matches: searchMatches, ancestorsOfMatch } = useMemo(
    () => collectMatchAncestry(displayRoots, q),
    [displayRoots, q],
  );

  const defaultExpanded = useMemo(
    () => idsUpToLevel(displayRoots, focusedNode ? 99 : DEFAULT_EXPAND_LEVELS),
    [displayRoots, focusedNode],
  );

  const effectiveExpanded = useMemo(() => {
    const base = new Set(expanded || defaultExpanded);
    // Auto-expandir ancestros de cualquier match
    if (q) for (const id of ancestorsOfMatch) base.add(id);
    return base;
  }, [expanded, defaultExpanded, q, ancestorsOfMatch]);

  const toggleNode = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        const next = new Set(prev || defaultExpanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [defaultExpanded],
  );

  const expandAll = useCallback(() => setExpanded(collectAllIds(displayRoots)), [displayRoots]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const maxDepth = useMemo(() => {
    if (roots.length === 0) return 0;
    function depth(node: OrgNode): number {
      if (node.children.length === 0) return node.level;
      return Math.max(...node.children.map(depth));
    }
    return Math.max(...roots.map(depth)) + 1;
  }, [roots]);

  const total = filteredMembers.length;
  const orphanAndCycleCount = orphans.length + cycles.length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon={Users} value={total} label="Personas" color="text-blue-400" />
        <StatBox icon={GitBranch} value={roots.length} label="Raíces" color="text-cyan-400" />
        <StatBox icon={Layers} value={maxDepth} label="Niveles" color="text-purple-400" />
        <StatBox
          icon={AlertCircle}
          value={orphanAndCycleCount}
          label="Sin jerarquía"
          color={orphanAndCycleCount > 0 ? 'text-amber-400' : 'text-slate-400'}
          highlight={cycles.length > 0}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona, rol, departamento..."
            className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setFilters((p) => ({ ...p, showInactive: !p.showInactive }))}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            filters.showInactive
              ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <span
            className={`w-4 h-4 rounded border flex items-center justify-center ${
              filters.showInactive ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
            }`}
          >
            {filters.showInactive && <Check className="w-3 h-3 text-white" />}
          </span>
          Incluir inactivos
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white"
          >
            Colapsar
          </button>
        </div>
      </div>

      {/* Heading + focus breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Jerarquía del equipo</h3>
          <GlossaryTooltip id="equipo-organigrama" />
        </div>
        {focusedNode && (
          <button
            onClick={() => setFocusId(null)}
            className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/15 border border-blue-500/40 text-blue-300 rounded-lg text-xs hover:bg-blue-500/25 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Salir del foco · {focusedNode.member.fullName}
          </button>
        )}
      </div>

      {/* Tree */}
      {displayRoots.length === 0 && orphans.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">Sin personas para mostrar.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 space-y-0.5">
          {displayRoots.map((root) => (
            <OrgNodeView
              key={root.member.id}
              node={root}
              expanded={effectiveExpanded}
              onToggle={toggleNode}
              onFocus={setFocusId}
              searchMatches={searchMatches}
              ancestorsOfMatch={ancestorsOfMatch}
              hasSearch={!!q}
            />
          ))}
        </div>
      )}

      {/* Orphans (solo si no estamos en focus mode) */}
      {!focusedNode && orphans.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sin jerarquía ({orphans.length})
            </h4>
            <span className="text-[10px] text-slate-500">Sin jefe y sin subordinados</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {orphans.map((o) => (
              <OrgPersonChip
                key={o.id}
                member={o}
                dimmed={!!q && !matchTokens(o, q)}
              />
            ))}
          </div>
        </div>
      )}

      {!focusedNode && cycles.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-300">
          ⚠ Detectados {cycles.length} ciclo(s) en la jerarquía: {cycles.map((c) => c.fullName).join(', ')}. Revisa el campo "Jefe directo" en el módulo Admin.
        </div>
      )}
    </div>
  );
}

function OrgNodeView({
  node,
  expanded,
  onToggle,
  onFocus,
  searchMatches,
  ancestorsOfMatch,
  hasSearch,
}: {
  node: OrgNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  searchMatches: Set<string>;
  ancestorsOfMatch: Set<string>;
  hasSearch: boolean;
}) {
  const isExpanded = expanded.has(node.member.id);
  const hasChildren = node.children.length > 0;
  const isSelfMatch = searchMatches.has(node.member.id);
  const isAncestorMatch = ancestorsOfMatch.has(node.member.id);
  const isDimmed = hasSearch && !isSelfMatch && !isAncestorMatch;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 rounded-lg group transition-colors ${
          isDimmed ? 'opacity-30' : ''
        } ${isSelfMatch ? 'bg-blue-500/10' : 'hover:bg-slate-700/30'}`}
      >
        <button
          onClick={() => hasChildren && onToggle(node.member.id)}
          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
            hasChildren ? 'text-slate-400 hover:text-white' : 'text-transparent cursor-default'
          }`}
          aria-label={hasChildren ? (isExpanded ? 'Colapsar' : 'Expandir') : ''}
        >
          {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </button>
        <a
          href={`/persona/${node.member.id}`}
          className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity py-1"
        >
          <Avatar name={node.member.fullName} image={node.member.image} size={28} />
          <div className="min-w-0">
            <p className="text-sm text-slate-200 truncate">
              {node.member.fullName}
              {!node.member.active && (
                <span className="ml-1.5 text-[9px] text-amber-400">Inactivo</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {node.member.title || node.member.roleName || '—'}
              {node.member.department && (
                <span className="text-slate-600"> · {node.member.department}</span>
              )}
            </p>
          </div>
        </a>
        {hasChildren && (
          <>
            <span
              className="px-1.5 py-0.5 bg-slate-700/60 rounded text-[10px] text-slate-300 shrink-0"
              title="Directos / Total descendientes"
            >
              {node.directCount}/{node.totalDescendants}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFocus(node.member.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-blue-300 transition-opacity shrink-0"
              title="Foco en este subárbol"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div className="ml-3 pl-3 border-l border-slate-700/50 space-y-0.5 mt-0.5">
          {node.children.map((c) => (
            <OrgNodeView
              key={c.member.id}
              node={c}
              expanded={expanded}
              onToggle={onToggle}
              onFocus={onFocus}
              searchMatches={searchMatches}
              ancestorsOfMatch={ancestorsOfMatch}
              hasSearch={hasSearch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgPersonChip({ member, dimmed }: { member: OrgMember; dimmed: boolean }) {
  return (
    <a
      href={`/persona/${member.id}`}
      className={`flex items-center gap-2 p-2 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors ${
        dimmed ? 'opacity-30' : ''
      }`}
    >
      <Avatar name={member.fullName} image={member.image} size={24} />
      <div className="min-w-0">
        <p className="text-xs text-slate-200 truncate">{member.fullName}</p>
        <p className="text-[10px] text-slate-500 truncate">
          {member.title || member.roleName || '—'}
        </p>
      </div>
    </a>
  );
}

function StatBox({
  icon: Icon,
  value,
  label,
  color,
  highlight = false,
}: {
  icon: typeof Users;
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${
        highlight ? 'border-red-500/40' : 'border-slate-700/50'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${color}`} />
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}
