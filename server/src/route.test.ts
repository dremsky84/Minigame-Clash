import { describe, expect, it } from 'vitest';
import { parseRaumCode } from './route';

describe('parseRaumCode', () => {
  it('liest einen gültigen Code', () => {
    expect(parseRaumCode('/raum/AB12')).toBe('AB12');
  });

  it('macht Kleinbuchstaben groß', () => {
    expect(parseRaumCode('/raum/ab12')).toBe('AB12');
  });

  it('lehnt falsche Längen und Zeichen ab', () => {
    expect(parseRaumCode('/raum/ABC')).toBeNull();
    expect(parseRaumCode('/raum/AB-1')).toBeNull();
    expect(parseRaumCode('/raum/AB12/x')).toBeNull();
  });

  it('lehnt fremde Pfade ab', () => {
    expect(parseRaumCode('/')).toBeNull();
    expect(parseRaumCode('/andere/AB12')).toBeNull();
  });
});
