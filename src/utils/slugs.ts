/**
 * Encode a folio like "H/PROJECT-34" into a URL-safe slug "H--PROJECT-34".
 * Slashes become "--" so Astro routing doesn't split them into path segments.
 */
export function folioToSlug(folio: string): string {
  return folio.replace(/\//g, '--');
}

/**
 * Decode a slug back to the original folio: "H--PROJECT-34" → "H/PROJECT-34".
 */
export function slugToFolio(slug: string): string {
  return slug.replace(/--/g, '/');
}
