import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ExternalLink, BookOpen, Info, ArrowRight } from 'lucide-react';
import Header from '../layout/Header';
import MarkdownText, { InlineMarkdown } from '../ui/MarkdownText';
import { GLOSSARY, GLOSSARY_SECTIONS, type GlossaryEntry, type GlossarySection } from '../../data/glossary';
import { usePermissions } from '../../hooks/usePermissions';
import { canSeeGlossarySection as canSeeSection, canSeeGlossaryEntry as canSeeEntry } from '../../lib/glossaryFilter';

function slugifyForId(id: string): string {
  return id;
}

function IntroCard({ section }: { section: GlossarySection }) {
  if (!section.intro) return null;
  const { whatIs, whenToUse, related } = section.intro;
  return (
    <article
      id={`intro-${section.slug}`}
      className="scroll-mt-6 bg-blue-500/5 border border-blue-500/30 rounded-xl p-5 mb-4"
    >
      <header className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-400" />
        <h3 className="text-base font-semibold text-white">Acerca de {section.title}</h3>
      </header>
      <div className="space-y-3">
        <section>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">¿Qué es esta sección?</h4>
          <MarkdownText text={whatIs} className="text-sm text-slate-300 leading-relaxed" />
        </section>
        <section>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">¿Cuándo usarla?</h4>
          <MarkdownText text={whenToUse} className="text-sm text-slate-300 leading-relaxed" />
        </section>
        {related && related.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">Diferencias con otras secciones</h4>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug} className="text-sm text-slate-300 leading-relaxed">
                  <a
                    href={`#intro-${r.slug}`}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {r.label} <ArrowRight className="w-3 h-3" />
                  </a>
                  <span className="text-slate-300"> — </span>
                  <InlineMarkdown text={r.difference} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function EntryCard({ entry, highlighted }: { entry: GlossaryEntry; highlighted: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlighted]);

  return (
    <article
      ref={ref}
      id={slugifyForId(entry.id)}
      className={`scroll-mt-6 bg-slate-800 border rounded-xl p-5 transition-colors ${
        highlighted ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-slate-700/50'
      }`}
    >
      <header className="mb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{entry.section}</p>
        <h3 className="text-lg font-semibold text-white">{entry.title}</h3>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
          <InlineMarkdown text={entry.summary} />
        </p>
      </header>

      <div className="space-y-4 mt-4 pt-4 border-t border-slate-700/50">
        <section>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">¿Qué es?</h4>
          <MarkdownText text={entry.whatIs} className="text-sm text-slate-300 leading-relaxed" />
        </section>

        <section>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">¿Cómo se calcula?</h4>
          <MarkdownText text={entry.howCalculated} className="text-sm text-slate-300 leading-relaxed" />
        </section>

        <section>
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1.5">¿Por qué importa?</h4>
          <MarkdownText text={entry.whyMatters} className="text-sm text-slate-300 leading-relaxed" />
        </section>
      </div>

      {entry.sources && entry.sources.length > 0 && (
        <footer className="mt-4 pt-3 border-t border-slate-700/50">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Ver código</p>
          <ul className="flex flex-wrap gap-2">
            {entry.sources.map((src) => (
              <li key={src.href}>
                <a
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-slate-900/60 border border-slate-700/60 rounded-md px-2 py-1 transition-colors"
                >
                  {src.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

export default function GlosarioSection() {
  const { perms } = usePermissions();
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>(GLOSSARY_SECTIONS[0]?.slug ?? '');
  const [hash, setHash] = useState<string>('');

  const visibleSections = useMemo(
    () => GLOSSARY_SECTIONS.filter((s) => canSeeSection(perms, s.slug)),
    [perms],
  );

  // Si la sección activa quedó oculta tras hidratar permisos, salta a la 1ª visible.
  useEffect(() => {
    if (visibleSections.length && !visibleSections.some((s) => s.slug === activeSection)) {
      setActiveSection(visibleSections[0].slug);
    }
  }, [visibleSections, activeSection]);

  useEffect(() => {
    function syncHash() {
      const h = window.location.hash.replace(/^#/, '');
      setHash(h);
      if (!h) return;
      if (h.startsWith('intro-')) {
        const slug = h.slice('intro-'.length);
        if (GLOSSARY_SECTIONS.some((s) => s.slug === slug) && canSeeSection(perms, slug)) {
          setActiveSection(slug);
          requestAnimationFrame(() => {
            document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
        return;
      }
      const entry = GLOSSARY.find((e) => e.id === h);
      if (entry && canSeeEntry(perms, entry)) setActiveSection(entry.sectionSlug);
    }
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [perms]);

  // Sólo lo que el rol puede ver: el buscador opera sobre el subconjunto
  // permitido (una entrada denegada nunca se renderiza igual).
  const allowedEntries = useMemo(
    () => GLOSSARY.filter((e) => canSeeEntry(perms, e)),
    [perms],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allowedEntries;
    return allowedEntries.filter((e) =>
      [e.title, e.summary, e.whatIs, e.howCalculated, e.whyMatters]
        .some((t) => t.toLowerCase().includes(q))
    );
  }, [query, allowedEntries]);

  const sectionsWithEntries = useMemo(() => {
    return visibleSections.map((s) => ({
      section: s,
      entries: filtered.filter((e) => e.sectionSlug === s.slug),
    })).filter((g) => g.entries.length > 0);
  }, [filtered, visibleSections]);

  const totalCount = allowedEntries.length;

  return (
    <div>
      <Header title="Glosario" />

      <div className="mb-6">
        <p className="text-sm text-slate-400 max-w-3xl">
          Definiciones, fórmulas y contexto de cada KPI, gráfica y bloque visible en el tablero. {totalCount} entradas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6">
        {/* Sidebar interno */}
        <aside className="lg:sticky lg:top-4 lg:self-start space-y-1 print:hidden">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-2 py-2 text-sm bg-slate-800 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40"
            />
          </div>
          <nav className="space-y-1">
            {visibleSections.map((s) => {
              const count = filtered.filter((e) => e.sectionSlug === s.slug).length;
              const isActive = activeSection === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => {
                    setActiveSection(s.slug);
                    const target = document.getElementById(`intro-${s.slug}`);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {s.title}
                  </span>
                  <span className="text-[10px] text-slate-500">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Entradas */}
        <div className="space-y-6 min-w-0">
          {sectionsWithEntries.length === 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <p className="text-slate-400">Sin resultados para "{query}".</p>
            </div>
          )}
          {sectionsWithEntries.map(({ section, entries }) => (
            <section key={section.slug}>
              <header className="mb-3">
                <h2 className="text-base font-semibold text-white">{section.title}</h2>
                {section.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                )}
              </header>
              {!query && <IntroCard section={section} />}
              <div className="space-y-4">
                {entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} highlighted={hash === entry.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
