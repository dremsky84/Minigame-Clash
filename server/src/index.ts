import { parseRaumCode } from './route';
export { Raum } from './raum';

interface Env {
  RAUM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      return new Response('Minigame-Clash Server läuft.');
    }
    const code = parseRaumCode(url.pathname);
    if (!code) {
      return new Response('Unbekannter Pfad. Erwartet /raum/CODE.', { status: 404 });
    }
    const stub = env.RAUM.get(env.RAUM.idFromName(code));
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
