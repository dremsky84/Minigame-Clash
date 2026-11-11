import type { Raumzustand } from '../core/spiel';

/** Nachrichten vom Handy an den Server. */
export type Clientnachricht =
  | { typ: 'beitreten'; name: string }
  | { typ: 'start' }
  | { typ: 'zug' };

/** Nachrichten vom Server an das Handy. */
export type Serverbotschaft =
  | { typ: 'willkommen'; id: string }
  | { typ: 'zustand'; daten: Raumzustand }
  | { typ: 'fehler'; grund: string };

function istObjekt(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function istRaumzustand(x: unknown): x is Raumzustand {
  if (!istObjekt(x) || !Array.isArray(x.spieler)) return false;
  const spielerOk = x.spieler.every(
    (s) => istObjekt(s) && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.istBot === 'boolean',
  );
  return spielerOk && typeof x.gestartet === 'boolean' && typeof x.aktuell === 'number';
}

/** Prüft eine eingehende Nachricht. Ungültiges liefert null und wird verworfen. */
export function parseServerbotschaft(text: string): Serverbotschaft | null {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return null;
  }
  if (!istObjekt(roh)) return null;
  if (roh.typ === 'willkommen' && typeof roh.id === 'string') {
    return { typ: 'willkommen', id: roh.id };
  }
  if (roh.typ === 'zustand' && istRaumzustand(roh.daten)) {
    return { typ: 'zustand', daten: roh.daten };
  }
  if (roh.typ === 'fehler' && typeof roh.grund === 'string') {
    return { typ: 'fehler', grund: roh.grund };
  }
  return null;
}
