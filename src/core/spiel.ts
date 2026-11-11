// Regelkern: reine Funktionen ohne Darstellung, später von Server und Client genutzt.

export interface Spieler {
  id: string;
  name: string;
  istBot: boolean;
}

/** Gibt die Position des nächsten Spielers im Zug zurück (zyklisch). */
export function naechsterZugIndex(aktuell: number, anzahl: number): number {
  if (anzahl <= 0) {
    throw new Error('Es braucht mindestens einen Spieler.');
  }
  return (aktuell + 1) % anzahl;
}
