# `GET /api/glossary`

- **Source:** [src/pages/api/glossary.ts](../../../src/pages/api/glossary.ts)
- **Auth:** middleware (sesión o token MCP requerido). Gateado adicionalmente por `page:glosario` — usuarios o roles sin ese permiso reciben `403` antes de tocar el handler.
- **Fuente de datos:** [src/data/glossary.ts](../../../src/data/glossary.ts) (estático, en repo)
- **Cache:** `private, max-age=60` (por usuario, no cachear entre usuarios — los permisos varían)

Expone el glosario filtrado por los permisos efectivos del usuario autenticado. La misma lógica de filtrado que usa `GlosarioSection` en el cliente: mismas reglas, mismo helper compartido.

El propósito principal es servir al servidor MCP (`mcp-server/`) los tools `list_glossary_sections`, `get_glossary_entry` y `search_glossary` sin duplicar la lógica de permisos.

## Request

Sin query params. La identidad y los permisos del usuario se leen de `Astro.locals.user` (populado por el middleware, tanto para sesiones de browser como para tokens MCP).

## Response

```ts
type GlossaryResponse = {
  sections: GlossarySection[];  // sólo las visibles para el usuario
  entries: GlossaryEntry[];     // sólo las permitidas; intro.related depurado
};
```

Los tipos `GlossarySection` y `GlossaryEntry` están definidos en [src/data/glossary.ts](../../../src/data/glossary.ts).

`intro.related[]` en cada sección se recorta para eliminar referencias a secciones que el usuario no puede ver (evita dead-links cross-ref en el MCP).

## Lógica de filtrado

Delegada íntegramente a [src/lib/glossaryFilter.ts](../../../src/lib/glossaryFilter.ts):

```ts
const perms = await getEffectivePermissions(locals.user);
const { sections, entries } = filterGlossary(perms);
```

Reglas (en `filterGlossary`):

1. **Sección visible** si `GLOSSARY_SECTION_PAGE_KEY[slug]` está en `perms.pages`. Si el slug no tiene page-key equivalente, es default-ALLOW.
2. **Entrada visible** si su sección lo es **y** `block:<id>` no está denegado (`perms.blockDenies`).

`GLOSSARY_SECTION_PAGE_KEY` es un export de `glossary.ts` — fuente única usada por este endpoint, por la sección cliente y por el MCP.

## Errores

| Status | Causa |
|---|---|
| 401 | Sin sesión (middleware corta antes) |
| 403 | Usuario sin `page:glosario` (middleware corta antes) |
| 500 | Error interno al resolver permisos |

## Side effects

Ninguno. Sólo lectura de datos estáticos (`glossary.ts`) y de permisos (Turso, vía cache TTL 30 s de `getEffectivePermissions`).

## Detalles no obvios

- El endpoint **no** tiene cache de 5 min como los endpoints de Sheets. Los permisos son per-user y pueden cambiar (override de bloque, cambio de rol, ban), así que se usa `private, max-age=60` para permitir algo de revalidación client-side sin servir datos stale entre usuarios.
- Los tokens MCP heredan `page:glosario` del rol del usuario: si un `dev` no tiene ese permiso, `get_glossary_entry` en el MCP devuelve un mensaje de error (403 del endpoint, traducido por `errorResult`).
- La lógica de filtrado es **pura**: dado un `EffectivePermissions`, siempre produce el mismo resultado. No hay estado mutable entre requests.
