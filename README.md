# Volk

Echtzeit-Multiplayer-Aufbaustrategie im Pixelart-Stil, für ein paar Freunde und die Familie. Vorbild ist Civilization, aber ohne Runden: Alles läuft in Echtzeit mit Wartezeiten, die Welt läuft weiter, auch wenn niemand online ist.

- Live: https://volk.leifps.workers.dev (ein Push auf `main` deployt per Cloudflare Workers Builds)
- Demo ohne Server und ohne Konto: https://volk.leifps.workers.dev/?demo=1 (Zeitalter wählbar: `?demo=1&zeitalter=5`)

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/` | Worker (`worker.js`), Durable Object `Welt` (`welt.js`), testbare Server-Logik (`server.js`), Konten (`konten.js`) |
| `public/` | Statische Dateien: `index.html`, `style.css`, Client in `js/`, Schriften |
| `public/shared/` | Gemeinsamer Code für Client und Server: Hex-Geometrie, Zufall, Karte, Regeln/Formeln, Wegsuche, Uhr `jetzt()` |
| `public/shared/daten/` | Alle Spielinhalte als Daten (siehe "Wo liegt was"). Format: `DATENFORMAT.md` |
| `public/shared/engine/` | Die Spiel-Engine (läuft im Durable Object, in den Tests und im Demo-Modus) |
| `public/js/grafik/` | Pixel-Sprites, alle im Code gezeichnet |
| `tests/` | `npm test` (Node-Test-Runner) |
| `tools/` | Balance-Simulation, Admin-Skript, Sprite-Galerie, Screenshots, Hub-Bilder, Browser-Tests |
| `hub-eintrag/` | Fertiges Paket für den Leif Game Hub (siehe `hub-eintrag/ANLEITUNG.md`) |

## Wo liegt was

Alles ist im Code gezeichnet bzw. als Daten beschrieben; IDs sind überall die Schlüssel.

**Spielinhalte (Daten)** in `public/shared/daten/`:

| Datei | Inhalt |
|---|---|
| `zeitalter.js` | 11 Zeitalter mit Name, Farbe, Stil-Schlüssel und Satz für die Zeitalter-Meldung |
| `forschung.js` | 331 Forschungen (Spalte, Voraussetzungen, Freischaltungen als Kurzform `e:`/`g:`/`w:`/`v:`/`d:`/`r:`/`o:`/`b:`) |
| `civics.js` | 120 Civics, 8 Regierungen, 60 Politikkarten, Kosten je Spalte |
| `eurekas.js` | eine Eureka-Bedingung je Forschung und Civic (in `index.js` als Feld `eureka` angehängt) |
| `einheiten.js`, `gebaeude.js`, `wunder.js`, `verbesserungen.js`, `rohstoffe.js`, `gelaende.js`, `befoerderungen.js` | Einheiten, Gebäude, Weltwunder (mit Bauplatz-Regeln), Geländeverbesserungen, Rohstoffe, Gelände, Beförderungen |
| `distrikte.js` | Distrikte, Nachbarschaft, Gebäude je Distrikt, Traditionen mit einzigartigen Distrikten |
| `naturwunder.js`, `religion.js`, `diplomatie.js`, `akteure.js` | Naturwunder; Pantheons, Religionen, Glaubenssätze; Beziehungswerte, Handelsabkommen, Embargo, Gesandter; KI-Völker, Stadtstaaten, Barbaren |
| `index.js` | sammelt alles und baut Nachschlage-Tabellen (`EINHEIT`, `FORSCHUNG`, `FREIGESCHALTET_DURCH` …) |

Karte: `public/shared/karte.js` (Erde, deterministisch, Hash festgeschrieben) und `public/shared/weltraumkarte.js` (Weltraum-Ebene); Ebenen-Geometrie in `public/shared/hex.js`.

**Engine** in `public/shared/engine/` (ein Mixin je Bereich): `spiel.js` (Ereignisschleife, Befehle), `wirtschaft.js`, `bau.js`, `forschung.js`, `civics.js`, `eurekas.js`, `einheiten.js`, `kampf.js`, `diplomatie.js`, `beziehungen.js`, `religion.js`, `distrikte.js`, `naturwunder.js`, `wunderplatz.js`, `weltraum.js`, `akteure.js` (KI, Barbaren, Tiere), `ansicht.js` (was ein Spieler sieht), `migration.js` (Versionsschritte für die Live-Welt), `pruefung.js` (Konsistenzprüfung).

**Grafik** in `public/js/grafik/`:

| Datei | Inhalt |
|---|---|
| `sprites.js`, `pixel.js` | Register, Cache, Pinsel (Rechtecke, Linien, Umriss, Spielerfarbe) |
| `sprites/einheiten_land.js`, `einheiten_see_luft.js`, `einheiten_zukunft_land.js`, `einheiten_zukunft_luft_see.js` | Einheiten (eine Zeichenfunktion je ID) |
| `sprites/gebaeude.js`, `gebaeude_zukunft.js`, `wunder.js`, `wunder_zukunft.js`, `distrikte.js`, `naturwunder.js` | Gebäude-Symbole, Weltwunder, Distrikte, Naturwunder |
| `sprites/staedte.js`, `kolonie.js` | Städte je Zeitalter-Stil (holz … stern) und Größe, Kolonien im All |
| `sprites/verbesserungen.js`, `rohstoffe.js`, `deko.js`, `tiere.js`, `religion.js`, `ui.js`, `forschung.js` | Verbesserungen, Rohstoffe, Gelände-Deko, Tiere, Missionar/Apostel/Gesandter, UI-Symbole, Zweig-Symbole |
| `einheiten_symbole.js` | Bannersymbole: ein 13×13-Pixelmuster je Einheit |

**Karte zeichnen** in `public/js/karte/`: `render.js` (Hauptschleife, Einheiten-Banner, Kampf-Effekte), `gelaende.js` (Gelände-Chunks, Sterne, Planet), `wege.js` (Straßen bis Magnetbahn), `animation.js` (alle Animationen auf einem Takt, Einstellung Effekte), `nachbearbeitung.js` (optionaler WebGL-Shader: Farbwelt je Zeitalter, Leuchten, Vignette), `ebene.js` (Erde/All).

**Zeitalter-Stile:** Städte über den Stil-Schlüssel aus `zeitalter.js` in `sprites/staedte.js`; Farbwelten je Zeitalter in `karte/nachbearbeitung.js` (`FARBWELTEN`); Musik je Zeitalter in `public/js/audio.js`.

**Oberfläche** in `public/js/ui/`: `hud.js` (Leiste, Einheiten-Aktionen, Minikarte), `stadt.js`, `forschungsbaum.js` (Forschungs- und Kulturbaum), `regierung.js`, `religion.js`, `diplomatie.js`, `reich.js`, `lexikon.js`, `hilfe.js`, `einstellungen.js`; alle Texte in `public/js/texte.js`.

Wichtige Dokumente: `ENTSCHEIDUNGEN.md` (alle Entscheidungen und die Lastabschätzung), `ABNAHME.md` (was wie getestet ist), `FORTSCHRITT.md`.

## Lokal starten

```
npm install
npm run dev          # wrangler dev auf http://localhost:8787, mit Test-Zeitregler
npm test             # alle Tests (Karte, Daten, Kampf, Zeit, Server, Balance, Mehrspieler)
npm run balance      # Balance-Simulation (druckt Tabellen)
npm run browsertest  # Browser-Läufe mit Playwright gegen wrangler dev
```

Sprite-Galerie: einen statischen Server im Repo-Ordner starten (z. B. `python3 -m http.server 8000`) und `http://localhost:8000/tools/sprite-galerie.html` öffnen, oder `node tools/galerie-foto.mjs einheit galerie.png 3`.

## Zeit und der Test-Zeitregler

Jede Zeitabfrage läuft über `jetzt()` in `public/shared/uhr.js`. Tests setzen eine simulierte Uhr (`simulierteUhr()`), damit Stunden und Tage in Sekunden durchlaufen.

Für Browser-Tests gibt es einen **Test-Zeitregler**, der **nur lokal** funktioniert: `npm run dev` startet `wrangler dev --var ZEITFAKTOR_ERLAUBT:1`. Dann gilt:

```
curl -X POST localhost:8787/api/dev/zeit -d '{"faktor":60}'          # Spielzeit läuft 60-mal schneller
curl -X POST localhost:8787/api/dev/zeit -d '{"sprung_ms":3600000}'  # eine Stunde vorspringen
```

Im Deployment existiert die Variable nicht; der Endpunkt antwortet dann mit 404, und niemand kann die Zeit beeinflussen.

## Admin (Passwort zurücksetzen, sperren, löschen, Statistik)

Nur aktiv, wenn das Secret gesetzt ist:

```
npx wrangler secret put ADMIN_TOKEN       # ein langes, zufälliges Passwort (mind. 16 Zeichen)
ADMIN_TOKEN=... node tools/admin.mjs statistik
ADMIN_TOKEN=... node tools/admin.mjs passwort <benutzername> <neues-passwort>
ADMIN_TOKEN=... node tools/admin.mjs sperren <benutzername>
ADMIN_TOKEN=... node tools/admin.mjs entsperren <benutzername>
ADMIN_TOKEN=... node tools/admin.mjs loeschen <benutzername>
```

## Veröffentlichen

1. `git push origin main` (Cloudflare baut und deployt automatisch mit `wrangler deploy`).
2. Optional: `npx wrangler secret put ADMIN_TOKEN`.
3. Hub-Eintrag: siehe `hub-eintrag/ANLEITUNG.md`.

Spätere Änderungen an der Durable-Object-Klasse brauchen neue Migrations-Tags in `wrangler.jsonc`; die Klasse `Welt` nie umbenennen. Der Spielzustand hat ein Feld `version`: Jede Änderung am Format bekommt einen Schritt in `public/shared/engine/migration.js` und einen Test mit dem echten Altstand (`tests/daten/altstand-v1.json`). Die Live-Welt wird beim ersten Laden nach dem Deploy migriert.
