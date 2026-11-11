import { describe, expect, it } from 'vitest';
import {
  MAX_SPIELER,
  leererRaum,
  naechsterZugIndex,
  spielerHinzufuegen,
  starteSpiel,
  zugBeenden,
} from './spiel';

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
    expect(z.spieler).toEqual([{ id: 'a', name: 'Anna', istBot: false }]);
  });

  it('lehnt doppelte IDs, leere Namen und volle Räume ab', () => {
    const eins = spielerHinzufuegen(leererRaum(), 'a', 'Anna');
    expect(() => spielerHinzufuegen(eins, 'a', 'Anna2')).toThrow();
    expect(() => spielerHinzufuegen(eins, 'b', '   ')).toThrow();

    let voll = leererRaum();
    for (let i = 0; i < MAX_SPIELER; i++) {
      voll = spielerHinzufuegen(voll, `s${i}`, `S${i}`);
    }
    expect(() => spielerHinzufuegen(voll, 'x', 'X')).toThrow();
  });

  it('lässt nach dem Start keinen Beitritt mehr zu', () => {
    const z = starteSpiel(
      spielerHinzufuegen(spielerHinzufuegen(leererRaum(), 'a', 'A'), 'b', 'B'),
    );
    expect(() => spielerHinzufuegen(z, 'c', 'C')).toThrow();
  });
});

describe('Start und Zug', () => {
  const zweiSpieler = () =>
    spielerHinzufuegen(spielerHinzufuegen(leererRaum(), 'a', 'A'), 'b', 'B');

  it('startet erst ab zwei Spielern', () => {
    expect(() => starteSpiel(spielerHinzufuegen(leererRaum(), 'a', 'A'))).toThrow();
    expect(starteSpiel(zweiSpieler()).gestartet).toBe(true);
  });

  it('lässt nur den aktuellen Spieler ziehen und gibt den Zug weiter', () => {
    const z = starteSpiel(zweiSpieler());
    expect(() => zugBeenden(z, 'b')).toThrow();
    const nach1 = zugBeenden(z, 'a');
    expect(nach1.aktuell).toBe(1);
    const nach2 = zugBeenden(nach1, 'b');
    expect(nach2.aktuell).toBe(0);
  });

  it('erlaubt keinen Zug vor dem Start', () => {
    expect(() => zugBeenden(zweiSpieler(), 'a')).toThrow();
  });
});
