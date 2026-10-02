/**
 * Filtrado del glosario según permisos efectivos. Misma regla que
 * GlosarioSection (cliente) y /api/glossary (server). Pure: dada un
 * `EffectivePermissions`, devuelve `{ sections, entries }` recortados.
 *
 * Regla (jerárquica):
 *   1. Sección visible si su page-key equivalente (GLOSSARY_SECTION_PAGE_KEY)
 *      está en `perms.pages`. Slug sin page-key = default-ALLOW.
 *   2. Entrada visible si su sección lo es Y el bloque (`block:<id>`) no está
 *      explícitamente denegado.
 *
 * `intro.related` se recorta para no enlazar a secciones invisibles
 * (evita dead-links cross-ref).
 */
import {
  GLOSSARY,
  GLOSSARY_SECTIONS,
  GLOSSARY_SECTION_PAGE_KEY,
  type GlossaryEntry,
  type GlossarySection,
} from '../data/glossary';
import type { EffectivePermissions } from './permissions/types';

export function canSeeGlossarySection(perms: EffectivePermissions, slug: string): boolean {
  const pageKey = GLOSSARY_SECTION_PAGE_KEY[slug];
  if (!pageKey) return true;
  return perms.pages.includes(pageKey);
}

export function canSeeGlossaryEntry(perms: EffectivePermissions, e: GlossaryEntry): boolean {
  if (!canSeeGlossarySection(perms, e.sectionSlug)) return false;
  return !perms.blockDenies.includes(e.id);
}

export function filterGlossary(perms: EffectivePermissions): {
  sections: GlossarySection[];
  entries: GlossaryEntry[];
} {
  const sections = GLOSSARY_SECTIONS.filter((s) => canSeeGlossarySection(perms, s.slug)).map((s) => {
    if (!s.intro?.related?.length) return s;
    // Quita refs a secciones que el usuario no puede ver (evita dead links).
    const related = s.intro.related.filter((r) => canSeeGlossarySection(perms, r.slug));
    return { ...s, intro: { ...s.intro, related } };
  });
  const entries = GLOSSARY.filter((e) => canSeeGlossaryEntry(perms, e));
  return { sections, entries };
}
