// Weltraum-Ebene: Karte, Geometrie, Start und Landung am Raumhafen, Kolonien, Weltraum-Verbesserungen und Lieferungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt, vorspulen, STD } from './hilfen.mjs';
import { FORSCHUNGEN, ROHSTOFFE, GELAENDE } from '../public/shared/daten/index.js';
import { karte } from '../public/shared/karte.js';
import { ANZAHL, RAUM_START, GESAMT, abstand, nachbarn, umkreis, ebeneVon, KEIN_WEG, idxE, feldBeiPixel, feldMitte } from '../public/shared/hex.js';
import { koerperMitte } from '../public/shared/weltraumkarte.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';

test('Weltraumkarte: deterministisch, eigener Hash, Erde unverändert, Körper in der geplanten Größe', () => {
  const k = karte();
  assert.equal(k.hash, 'cf1bae76', 'Erde unverändert');
  assert.equal(k.hashRaum, 'a1dc6a09', 'Weltraum-Hash festgeschrieben');
  assert.equal(k.gelaende.length, GESAMT);
  const zaehle = (ids) => { let n = 0; for (let i = RAUM_START; i < GESAMT; i++) if (ids.includes(GELAENDE[k.gelaende[i]].id)) n++; return n; };
  assert.ok(Math.abs(zaehle(['mondboden', 'mondkrater']) - 35) <= 8, 'Mond ~35');
  assert.ok(Math.abs(zaehle(['marsboden', 'marsgebirge']) - 90) <= 15, 'Mars ~90');
  assert.ok(Math.abs(zaehle(['eisboden']) - 30) <= 10, 'Eismond ~30');
  assert.ok(zaehle(['asteroiden']) >= 20, 'Asteroidenfelder');
  for (let i = 0; i < ANZAHL; i++) assert.ok(!GELAENDE[k.gelaende[i]].raum, 'Weltraum-Gelände auf der Erde');
  for (const id of ['helium3', 'titan', 'wassereis']) {
    const nr = ROHSTOFFE.findIndex((r) => r.id === id) + 1;
    let n = 0; for (let i = RAUM_START; i < GESAMT; i++) if (k.rohstoff[i] === nr) n++;
    assert.ok(n >= 5, id + ': ' + n);
    for (let i = 0; i < ANZAHL; i++) assert.notEqual(k.rohstoff[i], nr, id + ' auf der Erde');
  }
});

test('Hex-Geometrie: Ebenen sind getrennt, Pixel und Felder passen auf beiden Ebenen', () => {
  const a = idxE(1, 10, 10);
  assert.equal(ebeneVon(a), 1); assert.equal(ebeneVon(10), 0);
  assert.equal(abstand(5, a), KEIN_WEG);
  for (const n of nachbarn(a)) assert.equal(ebeneVon(n), 1);
  for (const n of umkreis(a, 3)) assert.equal(ebeneVon(n), 1);
  for (const n of nachbarn(ANZAHL - 1)) assert.ok(n < ANZAHL, 'letztes Erdfeld hat keinen Nachbarn im All');
  const [x, y] = feldMitte(a, 28);
  assert.equal(feldBeiPixel(x, y, 28, 1), a);
});

function raumfahrer(s) {
  const { v, stadt } = spielerMitStadt(s);
  s.aendern(v.id);
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 9 && !f.wiederholbar) v.forschung.erforscht[f.id] = 1;
  v.zeitalter = 9;
  stadt.gebaeude.raumhafen = 1;
  v.gold = 1e6;
  return { v, stadt };
}

test('Start, Kolonie auf dem Mond, Helium-3 nur mit Raumhafen, Landung', () => {
  const s = neueWelt();
  const { v, stadt } = raumfahrer(s);
  const kolonist = s.einheitErzeugen(v.id, 'kolonist', stadt.feld);
  // ohne Fähre kein Start
  let r = s.befehl(v.id, { art: 'ebene_wechseln', einheit: kolonist.id });
  assert.equal(r.ok, false); assert.match(r.fehler, /Orbitalfähre/);
  const faehre = s.einheitErzeugen(v.id, 'orbitalfaehre', stadt.feld);
  // Fähre und Kolonist müssen in der Stadt stehen
  kolonist.feld = stadt.feld; faehre.feld = stadt.feld; s.positionenNeu();
  r = s.befehl(v.id, { art: 'ebene_wechseln', einheit: kolonist.id });
  assert.ok(r.ok, r.fehler);
  assert.equal(ebeneVon(kolonist.feld), 1); assert.equal(ebeneVon(faehre.feld), 1);
  assert.equal(GELAENDE[karte().gelaende[kolonist.feld]].id, 'erdorbit');
  // während des Flugs keine Befehle
  r = s.befehl(v.id, { art: 'bewegen', einheit: kolonist.id, ziel: koerperMitte('mond') });
  assert.equal(r.ok, false); assert.match(r.fehler, /im Flug/);
  vorspulen(s, 3 * STD);
  // Bewegen auf die andere Ebene ist verboten
  r = s.befehl(v.id, { art: 'bewegen', einheit: kolonist.id, ziel: stadt.feld });
  assert.equal(r.ok, false);
  // zum Mond treiben (Raumkapsel im Orbit) und eine Kolonie gründen
  const mond = koerperMitte('mond');
  r = s.befehl(v.id, { art: 'bewegen', einheit: kolonist.id, ziel: mond });
  assert.ok(r.ok, r.fehler);
  vorspulen(s, 48 * STD);
  assert.equal(kolonist.feld, mond, 'Kolonist auf dem Mond');
  r = s.befehl(v.id, { art: 'stadt_gruenden', einheit: kolonist.id, name: 'Mondstadt' });
  assert.ok(r.ok, r.fehler);
  const kolonie = s.z.staedte[r.stadt];
  assert.equal(ebeneVon(kolonie.feld), 1);
  assert.ok(kolonie.gebiet.every((i) => ebeneVon(i) === 1), 'Gebiet der Kolonie liegt im All');
  // Helium-3-Extraktor auf einem Vorkommen im Gebiet bauen (direkt gesetzt) und Lieferung prüfen
  const k = karte(); const nr = ROHSTOFFE.findIndex((x) => x.id === 'helium3') + 1;
  let feld = kolonie.gebiet.find((i) => k.rohstoff[i] === nr);
  if (feld == null) { feld = kolonie.gebiet.find((i) => i !== kolonie.feld && GELAENDE[k.gelaende[i]].id.startsWith('mond')); k.rohstoff[feld] = nr; }
  s.setzeFeld(feld, { v: 'heliumextraktor' }); s.aendern(v.id);
  assert.ok(s.raten(v.id).material.helium3 > 0, 'Helium-3 wird geliefert');
  s.aendern(v.id); delete stadt.gebaeude.raumhafen; s.aendern(v.id);
  assert.ok(!(s.raten(v.id).material.helium3 > 0), 'ohne Raumhafen keine Lieferung aus dem All');
  stadt.gebaeude.raumhafen = 1; s.aendern(v.id);
  // Landung: Fähre zurück zur Erde
  vorspulen(s, STD);
  r = s.befehl(v.id, { art: 'ebene_wechseln', einheit: faehre.id });
  assert.ok(r.ok, r.fehler);
  assert.equal(ebeneVon(faehre.feld), 0);
  assert.ok(abstand(faehre.feld, stadt.feld) <= 6);
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});

test('Nicht raumtaugliche Einheiten und KI-Völker kommen nicht ins All', () => {
  const s = neueWelt();
  const { v, stadt } = raumfahrer(s);
  const krieger = s.einheitErzeugen(v.id, 'krieger', stadt.feld);
  let r = s.befehl(v.id, { art: 'ebene_wechseln', einheit: krieger.id });
  assert.equal(r.ok, false); assert.match(r.fehler, /nicht für das All/);
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  const sonde = s.einheitErzeugen(ki.id, 'raumsonde', s.staedteVon(ki.id)[0]?.feld ?? stadt.feld);
  if (sonde) { r = s.befehl(ki.id, { art: 'ebene_wechseln', einheit: sonde.id }); assert.equal(r.ok, false); }
  // Siedler gründen nicht im All, Kolonisten nicht auf der Erde
  const kol = s.einheitErzeugen(v.id, 'kolonist', stadt.feld);
  r = s.befehl(v.id, { art: 'stadt_gruenden', einheit: kol.id });
  assert.equal(r.ok, false);
});
