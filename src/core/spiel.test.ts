import { describe, expect, it } from 'vitest';
import {
  ABMELDEFRIST_MS,
  MAX_SPIELER,
  abmelden,
  aktualisiereBots,
  botsSpielenZuege,
  leererRaum,
  naechsteAbmeldefrist,
  naechsterZugIndex,
  spielerHinzufuegen,
  starteSpiel,
  stimmeUeberspringen,
  wiederverbinden,
  zugBeenden,
} from './spiel';

const mit = (ids: string[]) =>
  ids.reduce((z, id) => spielerHinzufuegen(z, id, id.toUpperCase()), leererRaum());

describe('naechsterZugIndex', () => {
  it('zählt im Kreis weiter', () => {
    expect(naechsterZugIndex(0, 4)).toBe(1);
    expect(naechsterZugIndex(3, 4)).toBe(0);
  });

  it('wirft bei keinem Spieler einen Fehler', () => {
    expect(() => naechsterZugIndex(0, 0)).toThrow();
  });
});

describe('Raum und Beitritt', () => {
  it('fügt Spieler mit gesäubertem Namen hinzu', () => {
    const z = spielerHinzufuegen(leererRaum(), 'a', '  Anna  ');
    expect(z.spieler).toEqual([
      { id: 'a', name: 'Anna', istBot: false, verbunden: true, abgemeldetSeit: null },
    ]);
  });

  it('lehnt doppelte IDs, leere Namen und volle Räume ab', () => {
    const eins = spielerHinzufuegen(leererRaum(), 'a', 'Anna');
    expect(() => spielerHinzufuegen(eins, 'a', 'Anna2')).toThrow();
    expect(() => spielerHinzufuegen(eins, 'b', '   ')).toThrow();

    const voll = mit(Array.from({ length: MAX_SPIELER }, (_, i) => `s${i}`));
    expect(() => spielerHinzufuegen(voll, 'x', 'X')).toThrow();
  });

  it('lässt nach dem Start keinen Beitritt mehr zu', () => {
    const z = starteSpiel(mit(['a', 'b']));
    expect(() => spielerHinzufuegen(z, 'c', 'C')).toThrow();
  });
});

describe('Start und Zug', () => {
  it('startet erst ab zwei Spielern', () => {
    expect(() => starteSpiel(mit(['a']))).toThrow();
    expect(starteSpiel(mit(['a', 'b'])).gestartet).toBe(true);
  });

  it('lässt nur den aktuellen Spieler ziehen und gibt den Zug weiter', () => {
    const z = starteSpiel(mit(['a', 'b']));
    expect(() => zugBeenden(z, 'b')).toThrow();
    const nach1 = zugBeenden(z, 'a');
    expect(nach1.aktuell).toBe(1);
    expect(zugBeenden(nach1, 'b').aktuell).toBe(0);
  });

  it('erlaubt keinen Zug vor dem Start', () => {
    expect(() => zugBeenden(mit(['a', 'b']), 'a')).toThrow();
  });
});

describe('Abmeldung und Wiederverbindung', () => {
  it('markiert abgemeldete Spieler und gibt ihnen den Platz zurück', () => {
    const abgemeldet = abmelden(mit(['a', 'b']), 'a', 1000);
    expect(abgemeldet.spieler[0]).toMatchObject({ verbunden: false, abgemeldetSeit: 1000 });
    const zurueck = wiederverbinden(abgemeldet, 'a');
    expect(zurueck.spieler[0]).toMatchObject({ verbunden: true, abgemeldetSeit: null, istBot: false });
  });

  it('ändert nichts bei Bots oder unbekannten IDs', () => {
    const z = mit(['a', 'b']);
    expect(abmelden(z, 'x', 1000)).toBe(z);
  });

  it('Wiederverbinden schlägt fehl, wenn ein Bot den Platz übernommen hat', () => {
    const z = abmelden(mit(['a', 'b']), 'a', 1000);
    const bot = aktualisiereBots(z, 1000 + ABMELDEFRIST_MS);
    expect(() => wiederverbinden(bot, 'a')).toThrow('Bot');
  });
});

describe('Bots übernehmen', () => {
  it('erst nach Ablauf der Frist', () => {
    const z = abmelden(mit(['a', 'b']), 'a', 1000);
    expect(aktualisiereBots(z, 1000 + ABMELDEFRIST_MS - 1).spieler[0].istBot).toBe(false);
    expect(aktualisiereBots(z, 1000 + ABMELDEFRIST_MS).spieler[0].istBot).toBe(true);
  });

  it('sofort, wenn alle verbundenen Spieler „Warten überspringen“ gedrückt haben', () => {
    const z = abmelden(mit(['a', 'b', 'c']), 'c', 1000);
    const einer = stimmeUeberspringen(z, 'a');
    expect(aktualisiereBots(einer, 1001).spieler[2].istBot).toBe(false);
    const beide = stimmeUeberspringen(einer, 'b');
    const ergebnis = aktualisiereBots(beide, 1001);
    expect(ergebnis.spieler[2].istBot).toBe(true);
    expect(ergebnis.warteStimmen).toEqual([]);
  });

  it('Überspringen ist nur möglich, wenn jemand wartet', () => {
    expect(() => stimmeUeberspringen(mit(['a', 'b']), 'a')).toThrow('Gerade wartet niemand.');
  });

  it('der Bot spielt den Zug weiter, bis ein Mensch dran ist', () => {
    const z = starteSpiel(mit(['a', 'b', 'c']));
    const abgemeldet = abmelden(z, 'a', 1000);
    const bot = aktualisiereBots(abgemeldet, 1000 + ABMELDEFRIST_MS);
    expect(botsSpielenZuege(bot).aktuell).toBe(1);
  });

  it('naechsteAbmeldefrist liefert den frühesten Zeitpunkt', () => {
    expect(naechsteAbmeldefrist(mit(['a', 'b']))).toBeNull();
    const z = abmelden(abmelden(mit(['a', 'b']), 'b', 2000), 'a', 1000);
    expect(naechsteAbmeldefrist(z)).toBe(1000 + ABMELDEFRIST_MS);
  });
});
