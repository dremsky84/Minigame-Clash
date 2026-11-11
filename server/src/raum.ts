// Ein Durable Object pro Raum: hält den Spielzustand und die WebSocket-Verbindungen der Handys.
// Hibernation-API: Das Objekt schläft zwischen Nachrichten. Die Abmeldefrist läuft über einen Alarm.
import {
  abmelden,
  aktualisiereBots,
  botsSpielenZuege,
  leererRaum,
  naechsteAbmeldefrist,
  spielerHinzufuegen,
  starteSpiel,
  stimmeUeberspringen,
  wiederverbinden,
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
  | { typ: 'wiederbeitreten'; id: string }
  | { typ: 'start' }
  | { typ: 'zug' }
  | { typ: 'warten_ueberspringen' };

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
      const jetzt = Date.now();
      let zustand = await this.lade();
      switch (nachricht.typ) {
        case 'beitreten': {
          const id = crypto.randomUUID();
          zustand = spielerHinzufuegen(zustand, id, String(nachricht.name ?? ''));
          this.bindeAn(ws, id);
          break;
        }
        case 'wiederbeitreten': {
          const id = String(nachricht.id ?? '');
          zustand = wiederverbinden(zustand, id);
          this.bindeAn(ws, id);
          break;
        }
        case 'start':
          zustand = starteSpiel(zustand);
          break;
        case 'zug':
          zustand = zugBeenden(zustand, this.eigeneId(ws));
          break;
        case 'warten_ueberspringen':
          zustand = stimmeUeberspringen(zustand, this.eigeneId(ws));
          break;
        default:
          return this.fehler(ws, 'Unbekannter Nachrichtentyp.');
      }
      zustand = this.fertig(zustand, jetzt);
      await this.speichere(zustand);
      await this.planeAlarm(zustand);
      this.sendeAlle(zustand);
    } catch (fehler) {
      this.fehler(ws, fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.');
    }
  }

  async webSocketClose(ws: WebSocket, code: number, grund: string): Promise<void> {
    try {
      ws.close(code, grund);
    } catch {
      // Die Verbindung ist schon geschlossen.
    }
    const anhang = ws.deserializeAttachment() as Anhang | null;
    // Hat der Spieler schon eine neue Verbindung (z. B. nach einem Neuladen), bleibt er verbunden.
    if (!anhang || this.hatAndereVerbindung(anhang.id, ws)) return;

    const jetzt = Date.now();
    let zustand = await this.lade();
    zustand = this.fertig(abmelden(zustand, anhang.id, jetzt), jetzt);
    await this.speichere(zustand);
    await this.planeAlarm(zustand);
    this.sendeAlle(zustand, ws);
  }

  /** Läuft die Abmeldefrist ab, übernehmen Bots die Plätze. */
  async alarm(): Promise<void> {
    const zustand = this.fertig(await this.lade(), Date.now());
    await this.speichere(zustand);
    await this.planeAlarm(zustand);
    this.sendeAlle(zustand);
  }

  private bindeAn(ws: WebSocket, id: string): void {
    ws.serializeAttachment({ id } satisfies Anhang);
    ws.send(JSON.stringify({ typ: 'willkommen', id }));
  }

  private eigeneId(ws: WebSocket): string {
    const anhang = ws.deserializeAttachment() as Anhang | null;
    if (!anhang) throw new Error('Erst beitreten.');
    return anhang.id;
  }

  private hatAndereVerbindung(id: string, ausser: WebSocket): boolean {
    return this.state.getWebSockets().some((other) => {
      if (other === ausser) return false;
      const anhang = other.deserializeAttachment() as Anhang | null;
      return anhang?.id === id;
    });
  }

  private fertig(zustand: Raumzustand, jetzt: number): Raumzustand {
    return botsSpielenZuege(aktualisiereBots(zustand, jetzt));
  }

  private async lade(): Promise<Raumzustand> {
    return (await this.state.storage.get<Raumzustand>(SCHLUESSEL)) ?? leererRaum();
  }

  private async speichere(zustand: Raumzustand): Promise<void> {
    await this.state.storage.put(SCHLUESSEL, zustand);
  }

  private async planeAlarm(zustand: Raumzustand): Promise<void> {
    const frist = naechsteAbmeldefrist(zustand);
    if (frist === null) {
      await this.state.storage.deleteAlarm();
    } else {
      await this.state.storage.setAlarm(frist);
    }
  }

  /** Schickt den Stand an alle offenen Verbindungen. Eine kaputte Verbindung stoppt die anderen nicht. */
  private sendeAlle(zustand: Raumzustand, ausser?: WebSocket): void {
    const text = JSON.stringify({ typ: 'zustand', daten: zustand });
    for (const ws of this.state.getWebSockets()) {
      if (ws === ausser) continue;
      try {
        ws.send(text);
      } catch {
        // Die Verbindung ist gerade geschlossen worden.
      }
    }
  }

  private fehler(ws: WebSocket, grund: string): void {
    ws.send(JSON.stringify({ typ: 'fehler', grund }));
  }
}
