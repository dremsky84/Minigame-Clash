import { describe, expect, it } from 'vitest';
import { parseServerbotschaft } from './nachrichten';

const zustand = { spieler: [{ id: 'a', name: 'Anna', istBot: false }], gestartet: false, aktuell: 0 };

describe('parseServerbotschaft', () => {
  it('liest willkommen, zustand und fehler', () => {
    expect(parseServerbotschaft(JSON.stringify({ typ: 'willkommen', id: 'a' }))).toEqual({ typ: 'willkommen', id: 'a' });
    expect(parseServerbotschaft(JSON.stringify({ typ: 'zustand', daten: zustand }))).toEqual({ typ: 'zustand', daten: zustand });
    expect(parseServerbotschaft(JSON.stringify({ typ: 'fehler', grund: 'x' }))).toEqual({ typ: 'fehler', grund: 'x' });
  });

  it('verwirft kaputtes JSON und falsche Formen', () => {
    expect(parseServerbotschaft('kein json')).toBeNull();
    expect(parseServerbotschaft('null')).toBeNull();
    expect(parseServerbotschaft(JSON.stringify({ typ: 'zustand', daten: { spieler: 'nein' } }))).toBeNull();
    expect(parseServerbotschaft(JSON.stringify({ typ: 'unbekannt' }))).toBeNull();
  });
});
