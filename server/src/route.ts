// Reine Hilfsfunktionen für das Routing, ohne Cloudflare-Abhängigkeit (testbar).

/** Raumcodes sind 4 Zeichen aus Großbuchstaben und Ziffern. */
const RAUM_CODE = /^[A-Z0-9]{4}$/;

/** Liefert den Raumcode aus einem Pfad wie `/raum/AB12`, sonst null. */
export function parseRaumCode(pfad: string): string | null {
  const treffer = /^\/raum\/([^/]+)$/.exec(pfad);
  if (!treffer) return null;
  const code = treffer[1].toUpperCase();
  return RAUM_CODE.test(code) ? code : null;
}
