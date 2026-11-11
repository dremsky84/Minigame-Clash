import { naechsterZugIndex } from './core/spiel';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main>
      <h1>Minigame-Clash</h1>
      <p>Projektgerüst. Die Spielansicht folgt.</p>
      <p class="zug">Nächster Zug: Spieler ${naechsterZugIndex(0, 4) + 1} von 4</p>
    </main>`;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js');
}
