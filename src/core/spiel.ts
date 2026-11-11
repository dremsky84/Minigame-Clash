// Regelkern: reine Funktionen ohne Darstellung. Wird vom Server (Durable Object) genutzt.

export interface Spieler {
  id: string;
  name: string;
  istBot: boolean;
}

export interface Raumzustand {
  spieler: Spieler[];
  gestartet: boolean;
  /** Index des Spielers, der gerade am Zug ist. */
  aktuell: number;
}

export const MIN_SPIELER = 2;
export const MAX_SPIELER = 6;

/** Gibt die Position des nächsten Spielers im Zug zurück (zyklisch). */
export function naechsterZugIndex(aktuell: number, anzahl: number): number {
  if (anzahl <= 0) {
    throw new Error('Es braucht mindestens einen Spieler.');
  }
  return (aktuell + 1) % anzahl;
}

export function leererRaum(): Raumzustand {
  return { spieler: [], gestartet: false, aktuell: 0 };
}

/** Fügt einen menschlichen Spieler hinzu. Wirft einen Fehler bei Regelverstößen. */
export function spielerHinzufuegen(zustand: Raumzustand, id: string, name: string): Raumzustand {
  const saubererName = name.trim();
  if (zustand.gestartet) {
    throw new Error('Die Partie läuft bereits.');
  }
  if (zustand.spieler.length >= MAX_SPIELER) {
    throw new Error(`Der Raum ist voll (maximal ${MAX_SPIELER} Spieler).`);
  }
  if (saubererName.length === 0 || saubererName.length > 20) {
    throw new Error('Der Name muss 1 bis 20 Zeichen lang sein.');
  }
  if (zustand.spieler.some((s) => s.id === id)) {
    throw new Error('Dieser Spieler ist schon im Raum.');
  }
  return {
    ...zustand,
    spieler: [...zustand.spieler, { id, name: saubererName, istBot: false }],
  };
}

/** Startet die Partie. Braucht mindestens MIN_SPIELER Spieler. */
export function starteSpiel(zustand: Raumzustand): Raumzustand {
  if (zustand.gestartet) {
    throw new Error('Die Partie läuft bereits.');
  }
  if (zustand.spieler.length < MIN_SPIELER) {
    throw new Error(`Es braucht mindestens ${MIN_SPIELER} Spieler.`);
  }
  return { ...zustand, gestartet: true, aktuell: 0 };
}

/** Beendet den Zug des Spielers mit dieser ID und gibt den Zug weiter. */
export function zugBeenden(zustand: Raumzustand, id: string): Raumzustand {
  if (!zustand.gestartet) {
    throw new Error('Die Partie hat noch nicht begonnen.');
  }
  if (zustand.spieler[zustand.aktuell]?.id !== id) {
    throw new Error('Du bist nicht am Zug.');
  }
  return {
    ...zustand,
    aktuell: naechsterZugIndex(zustand.aktuell, zustand.spieler.length),
  };
}
