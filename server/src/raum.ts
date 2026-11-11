// Ein Durable Object pro Raum. Hält die WebSocket-Verbindungen der Handys.
// Hibernation-API: Das Objekt schläft, wenn keine Nachrichten kommen, und kostet dann keine Laufzeit.

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

  // Platzhalter: Nachrichten werden bestätigt. Die Spielregeln folgen.
  webSocketMessage(ws: WebSocket, nachricht: string | ArrayBuffer): void {
    ws.send(JSON.stringify({ typ: 'ack', daten: String(nachricht) }));
  }

  webSocketClose(ws: WebSocket, code: number, grund: string): void {
    ws.close(code, grund);
  }
}
