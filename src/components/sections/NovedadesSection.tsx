import { useMemo, useState } from 'react';
import { Sparkles, Wrench, Bug, FileText, ChevronDown, ChevronUp, Tag, Calendar } from 'lucide-react';
import Header from '../layout/Header';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import type { ChangelogRelease, ChangelogSection } from '../../utils/changelog';
import { formatReleaseDate, renderMarkdownInline } from '../../utils/changelog';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

interface Props {
  releases: ChangelogRelease[];
  currentVersion: string;
}

function sectionMeta(name: string): { Icon: typeof Sparkles; color: string; bg: string } {
  const n = name.toLowerCase();
  if (n === 'added') return { Icon: Sparkles, color: 'text-green-400', bg: 'bg-green-500/10' };
  if (n === 'changed') return { Icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10' };
  if (n === 'fixed') return { Icon: Bug, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  return { Icon: FileText, color: 'text-slate-400', bg: 'bg-slate-500/10' };
}

function SectionBlock({ section }: { section: ChangelogSection }) {
  const meta = sectionMeta(section.name);
  const Icon = meta.Icon;
  return (
    <div className="mb-4 last:mb-0">
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md mb-2.5 ${meta.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        <span className={`text-xs font-semibold ${meta.color} uppercase tracking-wider`}>{section.name}</span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {section.items.map((item, idx) => (
          <li key={idx} className="text-sm text-slate-300 flex gap-2">
            <span className="text-slate-600 shrink-0 mt-1.5">•</span>
            <span
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdownInline(item)) }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NovedadesSection({ releases, currentVersion }: Props) {
  const sortedReleases = useMemo(
    () => [...releases].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })),
    [releases]
  );

  const currentRelease = useMemo(
    () => sortedReleases.find((r) => r.version === currentVersion) ?? sortedReleases[0],
    [sortedReleases, currentVersion]
  );

  const [openVersions, setOpenVersions] = useState<Set<string>>(
    () => new Set(currentRelease ? [currentRelease.version] : [])
  );

  function toggle(version: string) {
    setOpenVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  }

  function expandAll() {
    setOpenVersions(new Set(sortedReleases.map((r) => r.version)));
  }

  function collapseAll() {
    setOpenVersions(new Set());
  }

  if (sortedReleases.length === 0) {
    return (
      <div>
        <Header title="Novedades" />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400">No se encontraron releases en el changelog</p>
        </div>
      </div>
    );
  }

  const firstRelease = sortedReleases[sortedReleases.length - 1];

  return (
    <div>
      <Header title="Novedades" />

      {/* Hero card */}
      <div className="bg-linear-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-purple-300 uppercase tracking-wider font-medium mb-1 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Versión actual
              <GlossaryTooltip id="novedades-hero" />
            </p>
            <h2 className="text-3xl font-bold text-white font-mono">v{currentVersion}</h2>
            {currentRelease && (
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Liberada el {formatReleaseDate(currentRelease.date)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{sortedReleases.length}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {sortedReleases.length === 1 ? 'Release' : 'Releases'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Desde {formatReleaseDate(firstRelease.date)}</p>
          </div>
        </div>
      </div>

      {/* Expand/collapse controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Historial de versiones</h3>
          <GlossaryTooltip id="novedades-historial" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Expandir todos
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            Colapsar todos
          </button>
        </div>
      </div>

      {/* Accordion list */}
      <div className="space-y-3">
        {sortedReleases.map((release) => {
          const isOpen = openVersions.has(release.version);
          const isCurrent = release.version === currentVersion;
          const Chevron = isOpen ? ChevronUp : ChevronDown;
          return (
            <div
              key={release.version}
              className={`bg-slate-800 border rounded-xl overflow-hidden transition-colors ${isCurrent ? 'border-purple-500/40' : 'border-slate-700/50'}`}
            >
              <button
                onClick={() => toggle(release.version)}
                className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <span className="font-mono text-base font-bold text-white">v{release.version}</span>
                  <span className="text-xs text-slate-500">{formatReleaseDate(release.date)}</span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] font-medium uppercase tracking-wider border border-purple-500/30">
                      Actual
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    {release.sections.reduce((s, sec) => s + sec.items.length, 0)} cambios
                  </span>
                </div>
                <Chevron className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-slate-700/50">
                  {release.sections.map((section, idx) => (
                    <SectionBlock key={`${release.version}-${idx}`} section={section} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
