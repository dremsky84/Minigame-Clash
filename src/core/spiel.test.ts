import { describe, expect, it } from 'vitest';
import { naechsterZugIndex } from './spiel';

describe('naechsterZugIndex', () => {
  it('zählt im Kreis weiter', () => {
    expect(naechsterZugIndex(0, 4)).toBe(1);
    expect(naechsterZugIndex(3, 4)).toBe(0);
  });

  it('wirft bei keinem Spieler einen Fehler', () => {
    expect(() => naechsterZugIndex(0, 0)).toThrow();
  });
});
