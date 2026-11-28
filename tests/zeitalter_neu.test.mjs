// Die Endgame-Zeitalter (ab KI-Zeitalter) im echten Spielablauf: Aufstieg, Bauen, Ausbilden, Rohstoffe, Grenzen für KI-Völker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt, vorspulen, STD } from './hilfen.mjs';
import { FORSCHUNGEN, FORSCHUNG, ZEITALTER, ROHSTOFFE } from '../public/shared/daten/index.js';
import { karte } from '../public/shared/karte.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';

function bisZeitalter(s, v, z) {
  s.aendern(v.id);
  for (const f of FORSCHUNGEN) if (f.zeitalter < z && !f.wiederholbar) v.forschung.erforscht[f.id] = 1;
  s.zeitalterPruefen(v);
}

test('Aufstieg ins KI-Zeitalter braucht 60 % der Atomzeit und Lernende Maschinen', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  bisZeitalter(s, v, 7);
  assert.equal(v.zeitalter, 6, 'ohne Schlüsselforschung bleibt das Volk in der Atomzeit');
  const r = s.befehl(v.id, { art: 'forschen', id: 'lernende_maschinen' });
  assert.ok(r.ok, r.fehler);
  vorspulen(s, 30 * 24 * STD);
  assert.ok(v.forschung.erforscht.lernende_maschinen);
  assert.ok(v.zeitalter >= 7, 'KI-Zeitalter erreicht');
});

test('Seltene Erden: erst mit Lernenden Maschinen sichtbar, liegen nur auf Feldern ohne alten Rohstoff', () => {
  const k = karte();
  const nr = ROHSTOFFE.findIndex((r) => r.id === 'seltene_erden') + 1;
  const felder = [];
  for (let i = 0; i < k.rohstoff.length; i++) if (k.rohstoff[i] === nr) felder.push(i);
  assert.ok(felder.length >= 20, 'genug Vorkommen: ' + felder.length);
  assert.equal(k.hash, 'cf1bae76', 'Grundkarte unverändert');
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  assert.equal(s.siehtRohstoff(v, ROHSTOFFE[nr - 1]), false);
  v.forschung.erforscht.lernende_maschinen = 1;
  assert.equal(s.siehtRohstoff(v, ROHSTOFFE[nr - 1]), true);
});

test('KI-Labor bauen und Kampfroboter ausbilden kostet Seltene Erden', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  bisZeitalter(s, v, 8);
  for (const id of ['lernende_maschinen', 'sprachverstehen', 'kampfroboter_technik']) v.forschung.erforscht[id] = 1;
  stadt.gebaeude.rechenzentrum = 1; stadt.gebaeude.forschungslabor = 1;
  for (let k = 0; k < 4; k++) s.grenzwachstum(stadt.id);
  s.distriktSetzen(stadt, 'campus', s.distriktPlatzAutomatisch(stadt, 'campus', false)); // Wissensgebäude stehen im Campus
  v.gold = 1e6; v.lager = { ...v.lager, stein: 1000, seltene_erden: 0, aluminium: 10 };
  let r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'ki_labor' });
  assert.equal(r.ok, false, 'ohne Seltene Erden geht es nicht');
  assert.match(r.fehler, /Seltene Erden/);
  s.aendern(v.id); v.lager.seltene_erden = 10;
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'ki_labor' });
  assert.ok(r.ok, r.fehler);
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'kampfroboter' });
  assert.ok(r.ok, r.fehler);
  vorspulen(s, 20 * 24 * STD);
  assert.ok(stadt.gebaeude.ki_labor && !stadt.gebaeude.rechenzentrum, 'KI-Labor ersetzt das Rechenzentrum');
  assert.ok(s.einheitenVon(v.id).some((e) => e.typ === 'kampfroboter'));
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});

test('KI-Völker forschen nie über die Moderne hinaus', () => {
  const s = neueWelt();
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 6) ki.forschung.erforscht[f.id] = 1;
  ki.forschung.aktiv = null;
  s.kiForschung(ki);
  assert.ok(!ki.forschung.aktiv || FORSCHUNG[ki.forschung.aktiv].zeitalter <= 5);
  assert.ok(ZEITALTER.length >= 9);
});
