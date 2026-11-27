// Die Live-Welt muss jedes Update überstehen: Ein echter Altstand (erzeugt mit dem Code von main vor dem Ausbau)
// wird geladen, migriert, einen Tag weitergespielt und neu gestartet. Nichts darf verloren gehen oder kaputt sein.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { uhr, STD, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { ZUSTAND_VERSION, migriere } from '../public/shared/engine/migration.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { karte } from '../public/shared/karte.js';

const ALT = JSON.parse(fs.readFileSync(new URL('./daten/altstand-v1.json', import.meta.url), 'utf8'));
const KARTEN_HASH_ALT = 'cf1bae76'; // Hash der Erdkarte vor dem Ausbau: darf sich nie ändern (Städte stehen darauf)

function altServer() {
  uhr.setze(ALT.spielzeit);
  const sp = speicherAttrappe(new Map(Object.entries(ALT.zeilen)));
  const so = socketAttrappe();
  const srv = new WeltServer(sp, { __eigeneUhr: true }, so);
  return { sp, so, srv };
}
const altKern = JSON.parse(ALT.zeilen.kern);
const altVoelker = Object.entries(ALT.zeilen).filter(([k]) => k.startsWith('v:')).map(([, v]) => JSON.parse(v));
const altStaedte = Object.entries(ALT.zeilen).filter(([k]) => k.startsWith('s:')).flatMap(([, v]) => Object.values(JSON.parse(v)));
const altEinheiten = Object.entries(ALT.zeilen).filter(([k]) => k.startsWith('e:')).flatMap(([, v]) => Object.values(JSON.parse(v)));

test('Erdkarte ist bitgleich mit der Karte der Live-Welt', () => {
  assert.equal(karte().hash, KARTEN_HASH_ALT);
});

test('Altstand: wird geladen und auf die aktuelle Version migriert, ohne Inhalte zu verlieren', () => {
  const { srv } = altServer();
  const s = srv.spiel;
  assert.equal(altKern.version || 1, 1);
  assert.equal(s.z.version, ZUSTAND_VERSION);
  assert.deepEqual(zustandPruefen(s), []);
  // Völker, Städte, Einheiten bleiben vollständig erhalten
  for (const v of altVoelker) {
    const n = s.z.voelker[v.id];
    assert.ok(n, 'Volk fehlt: ' + v.name);
    assert.equal(n.name, v.name);
    assert.equal(n.farbe, v.farbe);
    assert.ok(n.zeitalter >= (v.zeitalter || 0), 'Zeitalter darf nicht sinken: ' + v.name);
    for (const id of Object.keys(v.forschung?.erforscht || {})) assert.ok(n.forschung.erforscht[id], `${v.name}: Forschung ${id} verloren`);
  }
  for (const st of altStaedte) {
    const n = s.z.staedte[st.id];
    assert.ok(n, 'Stadt fehlt: ' + st.name);
    assert.equal(n.feld, st.feld); assert.equal(n.volk, st.volk); assert.equal(n.bev, st.bev);
    assert.deepEqual([...n.gebiet].sort(), [...st.gebiet].sort(), st.name + ': Gebiet verändert');
  }
  assert.equal(Object.keys(s.z.einheiten).length, altEinheiten.length);
  // Konten bleiben
  assert.equal(Object.keys(srv.konten.konten).length, 4);
});

test('Altstand: läuft nach der Migration einen Tag fehlerfrei weiter und übersteht einen Neustart', async () => {
  const { sp, so, srv } = altServer();
  const r = await srv.http('/api/anmelden', 'POST', { name: 'anna', passwort: 'passwort1' }, 'ip-test');
  assert.ok(r.ok, 'Anmeldung mit altem Konto: ' + r.fehler);
  const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
  const voll = ws.empfangen.find((m) => m.t === 'voll');
  assert.ok(voll && Object.keys(voll.ansicht.staedte).length > 0, 'Ansicht nach Migration');
  const ende = uhr.jetzt() + 24 * STD;
  for (;;) { const n = srv.spiel.naechsteZeit(); if (n == null || n > ende) break; uhr.setze(Math.max(uhr.jetzt(), n)); srv.alarm(); }
  uhr.setze(ende);
  assert.deepEqual(srv.spiel.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(srv.spiel), []);
  // Neustart aus dem Speicher: gleicher Zustand, keine zweite Migration
  so.weg(ws); srv.getrennt(ws);
  srv.speichern();
  const srv2 = new WeltServer(speicherAttrappe(sp.m), { __eigeneUhr: true }, socketAttrappe());
  assert.deepEqual(srv2.spiel.migrationen, []);
  const ohne = (z) => JSON.stringify({ ...z, nebel: undefined });
  assert.equal(ohne(srv2.spiel.z), ohne(srv.spiel.z));
});

test('Migration: ein zu neuer Spielstand wird nicht angefasst', () => {
  assert.throws(() => migriere({ version: ZUSTAND_VERSION + 1 }), /neuer als der Code/);
});

