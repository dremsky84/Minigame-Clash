# Minigame-Clash: Konzept

Stand: 11.11.2026. Konzept für den Prototyp, ohne Code. Repo: `dremsky84/Minigame-Clash`.

## Spielidee

Eine Sammlung von Partyspielen für 2 bis 6 Spieler, jeder mit eigenem Handy, über das Internet. Den Rahmen bildet ein Brettspiel nach dem Vorbild von Mario Party: Alle würfeln und ziehen über ein Spielbrett. Auf bestimmten Feldern passieren Ereignisse. Nach jeweils drei Runden folgt ein Minispiel. Gewonnen hat, wer am Ende die meisten Sterne besitzt.

Eine Partie dauert etwa 20 bis 25 Minuten.

## Spielmodus

- **Online-Mehrspieler:** Ein Spieler erstellt einen Raum und teilt Code oder Link. Die anderen treten mit dem eigenen Handy bei.
- **Fehlende Plätze:** Bots übernehmen freie Plätze, damit man auch zu zweit oder allein testen kann.
- **Verbindungsabbruch:** Fällt ein Spieler aus, startet ein 60-Sekunden-Timer. Der Spieler kann in dieser Zeit mit dem Raumcode zurückkehren. Läuft der Timer ab, übernimmt ein Bot die Figur. Drücken alle verbleibenden menschlichen Spieler den Button „Warten überspringen“, übernimmt der Bot sofort.

## Ablauf einer Partie

1. **Lobby:** Raum erstellen, Spieler treten bei, der Host startet die Partie.
2. **Zugphase:** Reihum würfeln, die Figur ziehen, das Feldereignis auslösen.
3. **Minispiel:** Nach Runde 3, 6, 9 und 12 spielen alle gleichzeitig ein Minispiel.
4. **Zwischenstand:** Münzen und Sterne werden angezeigt.
5. **Ende:** Nach 12 Runden entscheidet die Sternzahl, bei Gleichstand die Münzen.

Eine Runde heißt: Jeder Spieler hat einmal gezogen.

## Brett

- **Zwei handgebaute Bretter** mit je etwa 40 Feldern.
- **Feldtypen:**
  - Münzen gewinnen (+3) und verlieren (−3)
  - Stern-Feld: Ein Stern kostet 10 Münzen.
  - Ereignisfeld: Tausch mit einem Mitspieler, Teleport, Bonuswürfel
- Das Brett wird vor der Partie zufällig gewählt.

## Minispiele (Prototyp: 6 Stück)

| Minispiel | Kurzbeschreibung | Wertung |
|---|---|---|
| Reaktion | Auf Signal tippen. Zu früh getippt = ausgeschieden. | Alle gegen alle |
| Schätzen | Jeder schätzt eine Zahl, am nächsten am Ziel gewinnt. | Alle gegen alle |
| Gedächtnis | Eine Symbolfolge wird gezeigt und muss nachgetippt werden. | Länge der richtigen Folge |
| Mut oder Sicherheit | Geheime Wahl: riskant oder sicher. Die Mehrheit bestimmt den Ausgang. | Alle gegen alle |
| Duell | Zwei Spieler treten gegeneinander an, Paarung zufällig. | 1 gegen 1 |
| Team | Zwei Teams, gemeinsame Aufgabe. | Teamwertung |

Belohnung pro Minispiel: Platz 1 erhält 10 Münzen, Platz 2 erhält 6, Platz 3 erhält 3, der Rest 1.

## Technik und Veröffentlichung

Wie bei Gildenstadt und No Risk No Fun:
- Vite und TypeScript, Tests mit Vitest.
- Frontend auf GitHub Pages, Workflow bei Push auf `main`.
- `base: './'`, PWA-Manifest, Service Worker, Hochformat.

Neu gegenüber den Vorlagen, weil es online läuft:
- **Spielregeln auf dem Server:** Der Server führt den Spielzustand. Die Handys zeigen nur an und senden Eingaben. So lässt sich nicht schummeln, und alle sehen denselben Stand.
- **Transport: WebSocket-Server.** Kostenloser Tarif, z. B. PartyKit oder Cloudflare Durable Objects. Braucht ein Konto und gegebenenfalls einen Schlüssel. Die Auswahl des Anbieters steht noch aus.
- **Gemeinsame Spiellogik:** Die Regeln liegen als reine TypeScript-Module vor, die Server und Client gleich nutzen. Das macht sie testbar.
- **Tests:** Vitest für die Regeln. Playwright startet vier Browser-Kontexte als vier Handys und testet eine ganze Partie Ende zu Ende.

## Entscheidungen für den Prototyp (Stand 11.11.2026)

- **Genre:** Partyspiel-Sammlung mit Brettrahmen, Mario-Party-Stil.
- **Modus:** Online-Mehrspieler, 2 bis 6 Spieler. Standard ist 4.
- **Umfang:** Mittel. Zwei Bretter, sechs Minispiele, zwölf Runden.
- **Bots:** Füllen freie Plätze auf und übernehmen bei Verbindungsabbruch (60 Sekunden Timer, oder sofort über „Warten überspringen“).
- **Anzeige:** Nur Handys. Kein gemeinsamer Host-Bildschirm.
- **Transport:** WebSocket-Server.
- **Repo:** `dremsky84/Minigame-Clash` (bereits angelegt).
- **Sprache:** Deutsch.

## Offene Punkte

- Anbieter für den WebSocket-Server (PartyKit oder Cloudflare Durable Objects).
- Ist „Minigame-Clash“ auch der endgültige Titel?
- Minispiel-Liste bestätigen oder ändern.
- Anzahl Spieler: 2 bis 6 (Standard 4) so lassen?
