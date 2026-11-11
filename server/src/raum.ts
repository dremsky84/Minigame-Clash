// Ein Durable Object pro Raum. Hält den Spielzustand und die WebSocket-Verbindungen der Handys.
// Hibernation-API: Das Objekt schläft, wenn keine Nachrichten kommen, und kostet dann keine Laufzeit.
import {
  leererRaum,
  spielerHinzufuegen,
  starteSpiel,
  zugBeenden,
  type Raumzustand,
} from '../../src/core/spiel';

const SCHLUESSEL = 'zustand';

/** Die Spieler-ID wird beim Beitritt an die Verbindung gebunden. */
interface Anhang {
  id: string;
}

type Nachricht =
  | { typ: 'beitreten'; name: string }
  | { typ: 'start' }
  | { typ: 'zug' };

export class Raum {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Erwartet eine WebSocket-Verbindung.', { status: 426 });
    }
    const paar = new WebSocketPair();
    const [client, server] = Object.values(paar);
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, roh: string | ArrayBuffer): Promise<void> {
    let nachricht: Nachricht;
    try {
      nachricht = JSON.parse(String(roh)) as Nachricht;
    } catch {
      return this.fehler(ws, 'Ungültige Nachricht.');
    }

    try {
      let zustand = await this.lade();
      switch (nachricht.typ) {
        case 'beitreten': {
          const id = crypto.randomUUID();
          zustand = spielerHinzufuegen(zustand, id, String(nachricht.name ?? ''));
          ws.serializeAttachment({ id } satisfies Anhang);
          break;
        }
        case 'start':
          zustand = starteSpiel(zustand);
          break;
        case 'zug': {
          const anhang = ws.deserializeAttachment() as Anhang | null;
          if (!anhang) return this.fehler(ws, 'Erst beitreten.');
          zustand = zugBeenden(zustand, anhang.id);
          break;
        }
        default:
          return this.fehler(ws, 'Unbekannter Nachrichtentyp.');
      }
      await this.speichere(zustand);
      this.sendeAlle(zustand);
    } catch (fehler) {
      this.fehler(ws, fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.');
    }
  }

  webSocketClose(ws: WebSocket, code: number, grund: string): void {
    ws.close(code, grund);
  }

  private async lade(): Promise<Raumzustand> {
    return (await this.state.storage.get<Raumzustand>(SCHLUESSEL)) ?? leererRaum();
  }

  private async speichere(zustand: Raumzustand): Promise<void> {
    await this.state.storage.put(SCHLUESSEL, zustand);
  }

  private sendeAlle(zustand: Raumzustand): void {
    const text = JSON.stringify({ typ: 'zustand', daten: zustand });
    for (const ws of this.state.getWebSockets()) {
      ws.send(text);
    }
  }

  private fehler(ws: WebSocket, grund: string): void {
    ws.send(JSON.stringify({ typ: 'fehler', grund }));
  }
}
