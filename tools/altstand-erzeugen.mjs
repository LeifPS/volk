// Erzeugt einen echten Spielstand (Speicherzeilen wie im Durable Object) mit dem aktuellen Code.
// Zweck: Migrationstests. Der Altstand tests/daten/altstand-v1.json wurde mit dem Code von main (fedd000) vor dem Ausbau erzeugt.
// Aufruf: node tools/altstand-erzeugen.mjs <aus.json> [tage=6]
import fs from 'node:fs';
import { uhr, STD, speicherAttrappe, socketAttrappe, Spiel } from '../tests/hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { botMachen, botErweitern } from './bot.mjs';
botErweitern(Spiel);
const [aus = 'altstand.json', tageText = '6'] = process.argv.slice(2);
const tage = +tageText;
const sp = speicherAttrappe();
const so = socketAttrappe();
const srv = new WeltServer(sp, { __eigeneUhr: true }, so);
const sockets = [];
for (const [i, name] of ['anna', 'bert', 'carla', 'dieter'].entries()) {
  const r = await srv.http('/api/registrieren', 'POST', { name, passwort: 'passwort1' }, 'ip' + i);
  const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
  await srv.nachricht(ws, JSON.stringify({ t: 'volk_gruenden', id: 1, name: name + 'volk', farbe: ['#1010f0', '#ffffff', '#d010f0', '#10b0f0'][i] }));
  const v = srv.spiel.z.voelker[ws.info.volk];
  const sied = srv.spiel.einheitenVon(v.id).find((e) => e.typ === 'siedler');
  await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 2, b: { art: 'stadt_gruenden', einheit: sied.id } }));
  botMachen(srv.spiel, v, ['forscher', 'bauer', 'krieger', 'forscher'][i]);
  sockets.push(ws);
}
for (let h = 0; h < tage * 24; h++) {
  const ende = uhr.jetzt() + STD;
  for (;;) { const n = srv.spiel.naechsteZeit(); if (n == null || n > ende) break; uhr.setze(Math.max(uhr.jetzt(), n)); srv.alarm(); }
  uhr.setze(ende);
}
// zwei Spieler offline, damit auch dieser Zustand drin ist
for (const ws of sockets.slice(2)) { so.weg(ws); srv.getrennt(ws); }
srv.speichern();
const zeilen = Object.fromEntries([...sp.m.entries()].sort());
fs.writeFileSync(aus, JSON.stringify({ erzeugt_mit: 'main fedd000', spielzeit: uhr.jetzt(), zeilen }));
const s = srv.spiel;
console.log('Zeilen', sp.m.size, 'Städte', s.alleStaedte().length, 'Einheiten', s.alleEinheiten().length, 'Zeitalter', s.alleVoelker().filter((v) => v.art === 'spieler').map((v) => v.zeitalter));
console.log('Gebäude', [...new Set(s.alleStaedte().flatMap((x) => Object.keys(x.gebaeude)))].join(','));
console.log('Fehler', JSON.stringify(s.z.global.fehler || []).slice(0, 500));
