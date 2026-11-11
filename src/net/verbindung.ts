import { parseServerbotschaft, type Clientnachricht, type Serverbotschaft } from './nachrichten';

/** Adresse des Servers. Lokal lässt sie sich über VITE_SERVER_URL überschreiben. */
export const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  'wss://minigame-clash-server.dremsky84.workers.dev';

/** Wie oft der Client nach einem Verbindungsabbruch neu versucht (mit wachsenden Pausen). */
const WIEDERVERSUCHE_MAX = 10;
const MAX_PAUSE_MS = 30_000;

export interface VerbindungsHandler {
  onVerbindung(status: 'verbunden' | 'getrennt' | 'aufgegeben'): void;
  onNachricht(botschaft: Serverbotschaft): void;
}

/**
 * Eine WebSocket-Verbindung zu einem Raum. Bricht sie ab, wird automatisch neu verbunden,
 * bis WIEDERVERSUCHE_MAX Versuche erreicht sind oder trenne() aufgerufen wird.
 */
export class RaumVerbindung {
  private ws: WebSocket | null = null;
  private raumCode = '';
  private gewollt = false;
  private versuche = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly handler: VerbindungsHandler) {}

  verbinde(raumCode: string): void {
    this.trenne();
    this.raumCode = raumCode;
    this.gewollt = true;
    this.versuche = 0;
    this.oeffne();
  }

  sende(nachricht: Clientnachricht): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(nachricht));
    } else {
      this.handler.onNachricht({ typ: 'fehler', grund: 'Nicht mit dem Server verbunden.' });
    }
  }

  trenne(): void {
    this.gewollt = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }

  private oeffne(): void {
    const ws = new WebSocket(`${SERVER_URL}/raum/${encodeURIComponent(this.raumCode)}`);
    this.ws = ws;
    ws.onopen = () => this.handler.onVerbindung('verbunden');
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.gewollt) return;
      if (this.versuche >= WIEDERVERSUCHE_MAX) {
        this.gewollt = false;
        this.handler.onVerbindung('aufgegeben');
        return;
      }
      this.handler.onVerbindung('getrennt');
      const pause = Math.min(MAX_PAUSE_MS, 1000 * 2 ** this.versuche);
      this.versuche++;
      this.timer = setTimeout(() => {
        this.timer = null;
        if (this.gewollt) this.oeffne();
      }, pause);
    };
    ws.onmessage = (e) => {
      const botschaft = parseServerbotschaft(String(e.data));
      if (!botschaft) return;
      if (botschaft.typ === 'willkommen') this.versuche = 0;
      this.handler.onNachricht(botschaft);
    };
  }
}
