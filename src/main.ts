import type { Raumzustand } from './core/spiel';
import type { Serverbotschaft } from './net/nachrichten';
import { RaumVerbindung } from './net/verbindung';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Element #app fehlt.');

app.innerHTML = `
  <main>
    <h1>Minigame-Clash</h1>
    <form id="beitritt">
      <label>Raumcode <input id="raum" maxlength="4" autocomplete="off" required></label>
      <label>Name <input id="name" maxlength="20" autocomplete="nickname" required></label>
      <button type="submit">Beitreten</button>
    </form>
    <p id="status" class="status"></p>
    <p id="fehler" class="fehler" role="alert"></p>
    <section id="raum-ansicht" hidden>
      <h2>Spieler</h2>
      <ul id="spieler"></ul>
      <p id="zug" class="zug"></p>
      <div class="knoepfe">
        <button id="start" type="button">Partie starten</button>
        <button id="zugEnde" type="button">Zug beenden</button>
      </div>
    </section>
  </main>`;

function el<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} fehlt.`);
  return element as T;
}

const formular = el<HTMLFormElement>('beitritt');
const eingabeRaum = el<HTMLInputElement>('raum');
const eingabeName = el<HTMLInputElement>('name');
const statusZeile = el<HTMLParagraphElement>('status');
const fehlerZeile = el<HTMLParagraphElement>('fehler');
const raumAnsicht = el<HTMLElement>('raum-ansicht');
const spielerListe = el<HTMLUListElement>('spieler');
const zugZeile = el<HTMLParagraphElement>('zug');
const startKnopf = el<HTMLButtonElement>('start');
const zugEndeKnopf = el<HTMLButtonElement>('zugEnde');

let eigeneId: string | null = null;
let zustand: Raumzustand | null = null;
let raumCode = '';
let name = '';

function zeigeZustand(): void {
  if (!zustand) return;
  raumAnsicht.hidden = false;

  spielerListe.replaceChildren(
    ...zustand.spieler.map((s) => {
      const eintrag = document.createElement('li');
      const zusatz = [s.istBot ? 'Bot' : '', s.id === eigeneId ? 'du' : ''].filter(Boolean);
      eintrag.textContent = zusatz.length ? `${s.name} (${zusatz.join(', ')})` : s.name;
      return eintrag;
    }),
  );

  const aktuell = zustand.spieler[zustand.aktuell];
  if (!zustand.gestartet) {
    zugZeile.textContent = 'Warten auf den Start.';
  } else if (aktuell) {
    const dran = aktuell.id === eigeneId;
    zugZeile.textContent = `Am Zug: ${aktuell.name}${dran ? ' (du)' : ''}`;
  }

  startKnopf.disabled = zustand.gestartet;
  zugEndeKnopf.disabled = !(zustand.gestartet && aktuell?.id === eigeneId);
}

function verarbeite(botschaft: Serverbotschaft): void {
  switch (botschaft.typ) {
    case 'willkommen':
      eigeneId = botschaft.id;
      fehlerZeile.textContent = '';
      zeigeZustand();
      break;
    case 'zustand':
      zustand = botschaft.daten;
      fehlerZeile.textContent = '';
      zeigeZustand();
      break;
    case 'fehler':
      fehlerZeile.textContent = botschaft.grund;
      break;
  }
}

const verbindung = new RaumVerbindung({
  onVerbindung(status) {
    statusZeile.textContent =
      status === 'verbunden' ? `Verbunden mit Raum ${raumCode}.` : 'Verbindung getrennt.';
    if (status === 'verbunden') {
      verbindung.sende({ typ: 'beitreten', name });
    }
  },
  onNachricht: verarbeite,
});

formular.addEventListener('submit', (e) => {
  e.preventDefault();
  raumCode = eingabeRaum.value.trim().toUpperCase();
  name = eingabeName.value.trim();
  eigeneId = null;
  zustand = null;
  raumAnsicht.hidden = true;
  fehlerZeile.textContent = '';
  statusZeile.textContent = 'Verbinde …';
  verbindung.verbinde(raumCode);
});

startKnopf.addEventListener('click', () => verbindung.sende({ typ: 'start' }));
zugEndeKnopf.addEventListener('click', () => verbindung.sende({ typ: 'zug' }));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js');
}
