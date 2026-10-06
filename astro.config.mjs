// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

import tsconfigPaths from "vite-tsconfig-paths";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [react()],
  // CSP (security.csp, stable since astro@6.0.0). Astro emits the policy and
  // computes SHA-256 hashes for the scripts/styles it PROCESSES: bundled JS
  // chunks, React island hydration directives, and Astro-processed <script>
  // (i.e. WITHOUT is:inline). For SSR (output:'server', non-prerendered routes)
  // Astro's default cspDestination is "header" → it sends a Content-Security-Policy
  // RESPONSE HEADER (not a <meta> tag; <meta> is only used for prerendered routes).
  //
  // IMPORTANT — what Astro does NOT auto-hash: template-authored `<script is:inline>`.
  // is:inline opts the script out of Astro's processing, so Astro never sees its
  // body to hash it (verified in astro 6.4.8: core/csp/common.js trackScriptHashes
  // only hashes internals.inlinedScripts + client directives + bundled chunks +
  // settings.scripts; core/fetch/fetch-state.js extraScriptHashes only hashes the
  // route's head scripts — template is:inline is in NEITHER). We therefore pin the
  // SHA-256 of each static is:inline script by hand below (scriptDirective.hashes).
  // A guard test (tests/csp/inline-script-hashes.test.ts) recomputes these from the
  // .astro source on every CI run and FAILS if a body changes without updating the
  // pin — this neutralizes the whitespace/content footgun of hand-pinned hashes.
  //
  // Ownership split (see src/middleware.ts SECURITY_HEADERS):
  //   • Astro owns script-src + style-src for HTML pages (via the response header).
  //   • Middleware keeps the other security headers (HSTS, X-Frame-Options, etc.)
  //     and a minimal enforced CSP for non-HTML responses (/api/* JSON, redirects)
  //     where inline scripts never run. It skips its own CSP header for text/html
  //     responses so the two policies don't stack.
  //
  // Accepted residual: style-src 'unsafe-inline' is kept because React/Recharts/
  // Tailwind emit inline style *attributes* which CSP hashes cannot cover (hashes
  // only apply to <style> elements, not style="…" attributes).
  security: {
    csp: {
      // Additional directives beyond script-src / style-src that Astro injects.
      // Mirrors the current hand-rolled policy minus the script/style directives
      // (those are owned by Astro now) and minus 'unsafe-inline' from script-src.
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://accounts.google.com",
        "form-action 'self' https://accounts.google.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ],
      // style-src: keep 'unsafe-inline' for inline style attributes (React/Recharts/Tailwind).
      // 'self' is required to allow Astro's bundled .css files.
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },
      // script-src: Astro adds 'self' + the hashes it auto-computes for processed
      // scripts. We additionally pin the hashes of the THREE template-authored
      // `<script is:inline>` blocks Astro does NOT hash. Each is sha256(base64) of
      // the EXACT inner text between <script> and </script> (verbatim whitespace).
      // KEEP IN SYNC via the guard test (tests/csp/inline-script-hashes.test.ts):
      //   • Layout.astro theme/sidebar pre-paint script
      //   • Layout.astro window.__PN_PERMS__ reader (reads the JSON data island)
      //   • cs360.astro theme pre-paint script
      // The JSON data island (<script type="application/json" id="pn-perms">) is
      // NOT listed: type=application/json is non-executable, script-src ignores it.
      scriptDirective: {
        resources: ["'self'"],
        hashes: [
          "sha256-eyQISvBdLKbRa7R0Mh23MewpYs16/Vxk0Fh07SkaoMc=", // Layout.astro theme/sidebar pre-paint
          "sha256-S0Q/vr8X3UFEvmE7sVWwgzp2MqrdMpOISKXgQKY0jKo=", // Layout.astro __PN_PERMS__ reader
          "sha256-dT/YnBL2mD/fOUVPd+ITNdR/zBL7BdOu6IrjpxYFEHY=", // cs360.astro theme pre-paint
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss(), tsconfigPaths()],
    build:
      process.env.NODE_ENV === "production"
        ? { sourcemap: false }
        : undefined,
  },
});
