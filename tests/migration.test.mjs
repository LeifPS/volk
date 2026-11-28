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

test('Migration 1->2: laufende Zukunftstechnologie ohne neue Voraussetzungen wird geparkt, nichts geht verloren', async () => {
  const { FORSCHUNGEN } = await import('../public/shared/daten/index.js');
  const zeilen = { ...ALT.zeilen };
  const schluessel = Object.keys(zeilen).find((k) => k.startsWith('v:') && JSON.parse(zeilen[k]).art === 'spieler');
  const v = JSON.parse(zeilen[schluessel]);
  // Ein Spieler in der Atomzeit, der schon zweimal Zukunft: Wissen erforscht hat und gerade die dritte Stufe erforscht
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 6 && !f.wiederholbar) v.forschung.erforscht[f.id] = 1;
  v.forschung.erforscht.zukunft_wissen = 2;
  v.zeitalter = 6;
  v.forschung.aktiv = 'zukunft_wissen'; v.forschung.fortschritt = 0.5;
  v.forschung.schlange = ['gibt_es_nicht', 'zukunft_kultur', 'lernende_maschinen'];
  zeilen[schluessel] = JSON.stringify(v);
  uhr.setze(ALT.spielzeit);
  const srv = new WeltServer(speicherAttrappe(new Map(Object.entries(zeilen))), { __eigeneUhr: true }, socketAttrappe());
  const n = srv.spiel.z.voelker[v.id];
  assert.ok(srv.spiel.migrationen.includes('1->2'));
  assert.equal(n.forschung.erforscht.zukunft_wissen, 2, 'erforschte Stufen bleiben');
  assert.equal(n.forschung.teil.zukunft_wissen, 0.5, 'Fortschritt bleibt als Teilfortschritt');
  assert.equal(n.forschung.aktiv, 'lernende_maschinen', 'die nächste mögliche Forschung läuft');
  assert.ok(!n.forschung.schlange.includes('gibt_es_nicht'));
  assert.ok(srv.spiel.boni(n).wissenschaft_prozent >= 4, 'Boni der erforschten Zukunftsstufen wirken weiter');
  assert.deepEqual(zustandPruefen(srv.spiel), []);
});

test('Migration 5->6: Beziehungswerte passen zum bisherigen Verhältnis, nichts sonst ändert sich', async () => {
  const { SCHRITTE } = await import('../public/shared/engine/migration.js');
  const z = {
    voelker: { 1: { id: 1, art: 'spieler' }, 2: { id: 2, art: 'ki' }, 3: { id: 3, art: 'spieler' }, 4: { id: 4, art: 'stadtstaat' } },
    staedte: { 10: { id: 10, volk: 2 }, 11: { id: 11, volk: 3 } },
    einheiten: { 5: { id: 5, volk: 1, route: { aktiv: true, nach: 11 } }, 6: { id: 6, volk: 1, route: { aktiv: true, nach: 11 } } },
    diplomatie: { '1|2': { krieg: true }, '2|3': { krieg: false, buendnis: true, offene_grenzen: true }, '1|4': { krieg: false } },
  };
  SCHRITTE[5](z);
  assert.equal(z.diplomatie['1|2'].beziehung, -50);
  assert.equal(z.diplomatie['2|3'].beziehung, 55);
  assert.equal(z.diplomatie['1|3'].beziehung, 16, 'zwei Routen ohne bisherigen Eintrag');
  assert.equal(z.diplomatie['1|4'].beziehung, undefined, 'Stadtstaaten haben Einfluss statt Beziehung');
  assert.equal(z.diplomatie['2|3'].buendnis, true);
});

test('Migration bis 6 mit dem echten Altstand: Diplomatie-Einträge haben Beziehungswerte', () => {
  uhr.setze(ALT.spielzeit);
  const srv = new WeltServer(speicherAttrappe(new Map(Object.entries(ALT.zeilen))), { __eigeneUhr: true }, socketAttrappe());
  assert.ok(srv.spiel.migrationen.includes('5->6'));
  for (const [k, d] of Object.entries(srv.spiel.z.diplomatie)) {
    const [a, b] = k.split('|').map(Number);
    const gross = (x) => ['spieler', 'ki'].includes(srv.spiel.z.voelker[x]?.art);
    if (gross(a) && gross(b)) assert.ok(Number.isFinite(d.beziehung), k);
  }
  assert.deepEqual(zustandPruefen(srv.spiel), []);
});

test('Last sparen: Alarme sichern gebündelt; ein Neustart aus dem letzten gesicherten Stand rechnet dasselbe nach', async () => {
  const { sp, so, srv } = altServer();
  const r = await srv.http('/api/anmelden', 'POST', { name: 'anna', passwort: 'passwort1' }, 'ip-test');
  const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
  let schreib = 0; const alt = sp.schreibe; sp.schreibe = (z) => { schreib++; alt(z); };
  const ende = uhr.jetzt() + 2 * STD;
  let alarme = 0;
  for (;;) { const n = srv.naechsterAlarmSpielzeit(); if (n == null || n > ende) break; uhr.setze(Math.max(uhr.jetzt(), n)); srv.alarm(); alarme++; }
  assert.ok(alarme > 20, 'genug Alarme: ' + alarme);
  assert.ok(schreib <= 2 * 60 / 5 + 2, `höchstens alle 5 Minuten gesichert (${schreib} Schreibvorgänge bei ${alarme} Alarmen)`);
  // Neustart aus dem Speicher (ohne letzte Sicherung) und bis zur selben Zeit nachrechnen
  const zeit = srv.spiel.t;
  const srv2 = new WeltServer(speicherAttrappe(sp.m), { __eigeneUhr: true }, socketAttrappe());
  srv2.spiel.verarbeite(zeit);
  const kern = (s) => ({
    einheiten: Object.values(s.z.einheiten).map((e) => [e.id, e.typ, e.feld]).sort((a, b) => a[0] - b[0]),
    staedte: Object.values(s.z.staedte).map((x) => [x.id, x.bev, Object.keys(x.gebaeude || {}).length, (x.bau || []).map((b) => b.id).join()]).sort((a, b) => a[0] - b[0]),
    forschung: Object.values(s.z.voelker).map((v) => [v.id, v.forschung?.aktiv, Object.keys(v.forschung?.erforscht || {}).length]),
  });
  assert.deepEqual(kern(srv2.spiel), kern(srv.spiel));
  // Ohne Verbindung kommt der Alarm frühestens nach 30 Minuten
  so.weg(ws); srv.getrennt(ws);
  assert.ok(srv.naechsterAlarmSpielzeit() >= uhr.jetzt() + 30 * 60e3 - 1);
});
