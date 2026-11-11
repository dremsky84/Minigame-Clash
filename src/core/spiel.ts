// Regelkern: reine Funktionen ohne Darstellung. Wird vom Server (Durable Object) genutzt.

/** So lange wartet eine Partie auf einen abgemeldeten Spieler, bevor ein Bot übernimmt. */
export const ABMELDEFRIST_MS = 60_000;
export const MIN_SPIELER = 2;
export const MAX_SPIELER = 6;

export interface Spieler {
  id: string;
  name: string;
  istBot: boolean;
  /** false, solange die Verbindung eines menschlichen Spielers fehlt. */
  verbunden: boolean;
  /** Zeitpunkt der Abmeldung in Millisekunden, sonst null. */
  abgemeldetSeit: number | null;
}

export interface Raumzustand {
  spieler: Spieler[];
  gestartet: boolean;
  /** Index des Spielers, der gerade am Zug ist. */
  aktuell: number;
  /** IDs der verbundenen Spieler, die „Warten überspringen“ gedrückt haben. */
  warteStimmen: string[];
}

/** Gibt die Position des nächsten Spielers im Zug zurück (zyklisch). */
export function naechsterZugIndex(aktuell: number, anzahl: number): number {
  if (anzahl <= 0) {
    throw new Error('Es braucht mindestens einen Spieler.');
  }
  return (aktuell + 1) % anzahl;
}

export function leererRaum(): Raumzustand {
  return { spieler: [], gestartet: false, aktuell: 0, warteStimmen: [] };
}

function aendere(zustand: Raumzustand, id: string, teil: Partial<Spieler>): Raumzustand {
  return { ...zustand, spieler: zustand.spieler.map((s) => (s.id === id ? { ...s, ...teil } : s)) };
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
    spieler: [
      ...zustand.spieler,
      { id, name: saubererName, istBot: false, verbunden: true, abgemeldetSeit: null },
    ],
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

/** Markiert einen menschlichen Spieler als abgemeldet. Bots und Unbekannte bleiben unverändert. */
export function abmelden(zustand: Raumzustand, id: string, jetzt: number): Raumzustand {
  const spieler = zustand.spieler.find((s) => s.id === id);
  if (!spieler || spieler.istBot || !spieler.verbunden) return zustand;
  return aendere(zustand, id, { verbunden: false, abgemeldetSeit: jetzt });
}

/** Gibt einem abgemeldeten Spieler seinen Platz zurück, solange kein Bot ihn übernommen hat. */
export function wiederverbinden(zustand: Raumzustand, id: string): Raumzustand {
  const spieler = zustand.spieler.find((s) => s.id === id);
  if (!spieler) throw new Error('Dieser Spieler ist nicht im Raum.');
  if (spieler.istBot) throw new Error('Dein Platz wurde von einem Bot übernommen.');
  return {
    ...aendere(zustand, id, { verbunden: true, abgemeldetSeit: null }),
    warteStimmen: zustand.warteStimmen.filter((w) => w !== id),
  };
}

/** Ein verbundener Spieler stimmt dafür, nicht länger auf Abgemeldete zu warten. */
export function stimmeUeberspringen(zustand: Raumzustand, id: string): Raumzustand {
  const spieler = zustand.spieler.find((s) => s.id === id);
  if (!spieler || spieler.istBot || !spieler.verbunden) {
    throw new Error('Nur verbundene Spieler können warten überspringen.');
  }
  if (!zustand.spieler.some((s) => !s.istBot && !s.verbunden)) {
    throw new Error('Gerade wartet niemand.');
  }
  if (zustand.warteStimmen.includes(id)) return zustand;
  return { ...zustand, warteStimmen: [...zustand.warteStimmen, id] };
}

/**
 * Macht abgemeldete Spieler zu Bots: nach Ablauf der Frist, oder sofort,
 * wenn alle verbundenen Spieler „Warten überspringen“ gedrückt haben.
 */
export function aktualisiereBots(zustand: Raumzustand, jetzt: number): Raumzustand {
  const verbundene = zustand.spieler.filter((s) => !s.istBot && s.verbunden);
  const alleHabenGewartet =
    verbundene.length > 0 && verbundene.every((s) => zustand.warteStimmen.includes(s.id));

  let geaendert = false;
  const spieler = zustand.spieler.map((s) => {
    if (s.istBot || s.verbunden) return s;
    const abgelaufen = s.abgemeldetSeit !== null && jetzt - s.abgemeldetSeit >= ABMELDEFRIST_MS;
    if (!abgelaufen && !alleHabenGewartet) return s;
    geaendert = true;
    return { ...s, istBot: true, verbunden: true, abgemeldetSeit: null };
  });
  if (!geaendert) return zustand;
  return { ...zustand, spieler, warteStimmen: [] };
}

/** Lässt Bots am Zug automatisch spielen, solange ein Bot an der Reihe ist (höchstens eine Runde). */
export function botsSpielenZuege(zustand: Raumzustand): Raumzustand {
  let ergebnis = zustand;
  for (let i = 0; i < ergebnis.spieler.length && ergebnis.gestartet; i++) {
    const amZug = ergebnis.spieler[ergebnis.aktuell];
    if (!amZug?.istBot) break;
    ergebnis = zugBeenden(ergebnis, amZug.id);
  }
  return ergebnis;
}

/** Früheste Zeit, zu der ein Bot einen Abgemeldeten ersetzen würde, oder null. */
export function naechsteAbmeldefrist(zustand: Raumzustand): number | null {
  let fruehest: number | null = null;
  for (const s of zustand.spieler) {
    if (s.istBot || s.verbunden || s.abgemeldetSeit === null) continue;
    const frist = s.abgemeldetSeit + ABMELDEFRIST_MS;
    if (fruehest === null || frist < fruehest) fruehest = frist;
  }
  return fruehest;
}
