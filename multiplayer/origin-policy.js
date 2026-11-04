// Only these classroom website origins may access the multiplayer service.
// Preserve the existing GitHub Pages origin for bookmarks and live classes.
export const LEGACY_SITE_ORIGIN='https://chriswalker-afk.github.io';
export const CUSTOM_SITE_ORIGIN='https://sampling.mrwalkermaths.com';
export const ALLOWED_SITE_ORIGINS=Object.freeze([
  LEGACY_SITE_ORIGIN,
  CUSTOM_SITE_ORIGIN,
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);
const allowed=new Set(ALLOWED_SITE_ORIGINS);

export function allowedBrowserOrigin(origin){
  // Server-to-server health/smoke requests often have no Origin header.
  return origin===null || allowed.has(origin);
}

export function corsResponseOrigin(origin){
  // Invalid origins fail validation; don't echo them in CORS on errors.
  return allowed.has(origin) ? origin : LEGACY_SITE_ORIGIN;
}
