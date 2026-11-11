import { parseServerbotschaft, type Clientnachricht, type Serverbotschaft } from './nachrichten';

/** Adresse des Servers. Lokal lässt sie sich über VITE_SERVER_URL überschreiben. */
export const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  'wss://minigame-clash-server.dremsky84.workers.dev';

export interface VerbindungsHandler {
  onVerbindung(status: 'verbunden' | 'getrennt'): void;
  onNachricht(botschaft: Serverbotschaft): void;
}

/** Eine WebSocket-Verbindung zu einem Raum. Ohne automatische Wiederverbindung (kommt später). */
export class RaumVerbindung {
  private ws: WebSocket | null = null;

  constructor(private readonly handler: VerbindungsHandler) {}

  verbinde(raumCode: string): void {
    this.trenne();
    const ws = new WebSocket(`${SERVER_URL}/raum/${encodeURIComponent(raumCode)}`);
    this.ws = ws;
    ws.onopen = () => this.handler.onVerbindung('verbunden');
    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
        this.handler.onVerbindung('getrennt');
      }
    };
    ws.onmessage = (e) => {
      const botschaft = parseServerbotschaft(String(e.data));
      if (botschaft) this.handler.onNachricht(botschaft);
    };
  }

  sende(nachricht: Clientnachricht): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(nachricht));
    } else {
      this.handler.onNachricht({ typ: 'fehler', grund: 'Nicht mit dem Server verbunden.' });
    }
  }

  trenne(): void {
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}
