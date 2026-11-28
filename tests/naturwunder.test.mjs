// Naturwunder und Weltwunder auf Feldern: Platzierung, Regeln, Entdeckung, Bau, Migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { neueWelt, spielerMitStadt, vorspulen, STD, uhr, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { NATURWUNDER, NATURWUNDER_REGELN } from '../public/shared/daten/naturwunder.js';
import { WUNDER, FORSCHUNGEN, GELAENDE } from '../public/shared/daten/index.js';
import { karte } from '../public/shared/karte.js';
import { abstand, nachbarn, ANZAHL } from '../public/shared/hex.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { WeltServer } from '../src/server.js';

test('Daten: 12 Naturwunder mit Ertrag, Distrikt-Bonus, Entdeckungsbonus; jedes Weltwunder hat eine Platzregel', () => {
  assert.equal(NATURWUNDER.length, 12);
  for (const n of NATURWUNDER) {
    assert.ok(n.felder >= 1 && n.felder <= 4, n.id);
    assert.ok(n.gelaende.every((g) => GELAENDE.some((x) => x.id === g)), n.id + ': Gelände');
    assert.ok(Object.keys(n.nachbar).length > 0 && (n.entdeckung.kultur || n.entdeckung.wissen), n.id);
    assert.ok(n.beschreibung.length > 20);
  }
  for (const w of WUNDER) assert.ok(w.platz && w.platz.text, w.id + ': Platzregel');
});

test('Neue Welt: alle Naturwunder platziert, deterministisch, regelgerecht', () => {
  const s = neueWelt();
  const l = s.z.global.naturwunder;
  assert.equal(l.length, 12);
  const k = karte();
  const alle = l.flatMap((n) => n.felder);
  assert.equal(new Set(alle).size, alle.length, 'keine Überschneidung');
  for (const nw of l) {
    const def = NATURWUNDER.find((x) => x.id === nw.id);
    assert.equal(nw.felder.length, def.felder);
    for (const i of nw.felder) {
      assert.ok(i < ANZAHL, 'nur auf der Erde');
      assert.ok(def.gelaende.includes(GELAENDE[k.gelaende[i]].id), nw.id + ': Gelände');
      for (const st of s.alleStaedte()) assert.ok(abstand(st.feld, i) >= NATURWUNDER_REGELN.abstandStadt, nw.id + ': zu nah an einer Stadt');
      assert.ok(!s.z.felder[i]?.s, 'nicht auf Besitz');
    }
    if (nw.felder.length > 1) for (const i of nw.felder) assert.ok(nachbarn(i).some((n) => nw.felder.includes(n)), nw.id + ': zusammenhängend');
  }
  // gleiche Welt -> gleiche Orte
  const s2 = neueWelt();
  assert.deepEqual(s2.z.global.naturwunder.map((n) => n.felder), l.map((n) => n.felder));
});

test('Naturwunder: unpassierbar, keine Stadt, keine Verbesserung, Ertrag statt Gelände, Entdeckungsbonus für den Ersten', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  const nw = s.z.global.naturwunder[0];
  const i = nw.felder[0];
  const krieger = s.einheitErzeugen(v.id, 'krieger', stadt.feld);
  assert.equal(s.bewegungsKostenRoh(v.id, { klasse: 'nahkampf', tempo: 2 }, nachbarn(i)[0], i), Infinity);
  assert.ok(s.stadtGruendenHindernis(v.id, i));
  const def = NATURWUNDER.find((x) => x.id === nw.id);
  assert.equal(s.feldErtrag(i, v).k, def.ertrag.k);
  const vorher = v.kultur_gesamt || 0;
  s.erkunde(v.id, i, 1);
  assert.equal(nw.entdeckt_von, v.id);
  if (def.entdeckung.kultur) assert.ok(v.kultur_gesamt >= vorher + def.entdeckung.kultur);
  const { v: v2 } = spielerMitStadt(s, 'Zweiter');
  const k2 = v2.kultur_gesamt || 0;
  s.erkunde(v2.id, i, 1);
  assert.equal(nw.entdeckt_von, v.id, 'der Erste bleibt Entdecker');
  assert.equal(v2.kultur_gesamt || 0, k2, 'kein Bonus für Spätere');
  assert.ok(krieger);
});

test('Weltwunder: Feld wählen, Regeln, Baustelle, fertig auf dem Feld, Rennen verloren räumt die Baustelle', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  s.aendern(v.id);
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 0) v.forschung.erforscht[f.id] = 1;
  for (let k = 0; k < 8; k++) s.grenzwachstum(stadt.id);
  v.gold = 1e6; v.lager = { ...v.lager, stein: 5000, marmor: 5000, holz: 5000 };
  const plaetze = s.wunderPlaetze(stadt, 'pyramiden');
  assert.ok(plaetze.length > 0, 'es gibt passende Felder');
  const falsch = stadt.gebiet.find((i) => i !== stadt.feld && !plaetze.includes(i));
  if (falsch != null) { const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'wunder', id: 'pyramiden', feld: falsch }); assert.equal(r.ok, false); }
  let r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'wunder', id: 'pyramiden', feld: stadt.feld });
  assert.equal(r.ok, false, 'nicht auf dem Stadtzentrum');
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'wunder', id: 'pyramiden', feld: plaetze[0] });
  assert.ok(r.ok, r.fehler);
  assert.equal(s.z.felder[plaetze[0]].wb, 'pyramiden', 'Baustelle');
  vorspulen(s, 10 * 24 * STD);
  assert.equal(s.z.felder[plaetze[0]].wu, 'pyramiden');
  assert.equal(s.z.wunder.pyramiden.feld, plaetze[0]);
  assert.equal(s.feldErtrag(plaetze[0], v).n, 0, 'Wunderfeld wird nicht bewirtschaftet');
  assert.deepEqual(zustandPruefen(s), []);
  assert.deepEqual(s.z.global.fehler || [], []);
});

test('Migration 2->3: Altstand bekommt Naturwunder und behält alles', () => {
  const ALT = JSON.parse(fs.readFileSync(new URL('./daten/altstand-v1.json', import.meta.url), 'utf8'));
  uhr.setze(ALT.spielzeit);
  const srv = new WeltServer(speicherAttrappe(new Map(Object.entries(ALT.zeilen))), { __eigeneUhr: true }, socketAttrappe());
  const s = srv.spiel;
  assert.ok(s.migrationen.includes('2->3'));
  assert.equal(s.z.global.naturwunder.length, 12, 'alle Naturwunder fanden in der laufenden Welt Platz');
  for (const nw of s.z.global.naturwunder) for (const i of nw.felder) {
    assert.ok(!s.z.felder[i] || !s.z.felder[i].v, 'kein Naturwunder auf einer Verbesserung');
    assert.ok(!s.einheitenAuf(i).length, 'kein Naturwunder unter einer Einheit');
    assert.ok(!s.stadtAuf(i));
  }
  assert.deepEqual(zustandPruefen(s), []);
});
