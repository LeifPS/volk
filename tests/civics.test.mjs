// Kulturbaum (Civics), Regierungen und Politikkarten: Daten, Fortschritt durch Kultur, Regierungswechsel mit Übergang,
// Kartenregeln und Gebühr, Wirkung über die Bonus-Pfade, KI, Migration des Altstands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { neueWelt, spielerMitStadt, vorspulen, STD, uhr, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { CIVICS, CIVIC, REGIERUNGEN, POLITIKKARTEN, START_CIVICS, CIVIC_KOSTEN_JE_SPALTE } from '../public/shared/daten/civics.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { WeltServer } from '../src/server.js';

test('Daten: ca. 120 Civics über alle Zeitalter, 8 Regierungen, ca. 60 Karten; alles genau einmal freigeschaltet, jede Civic wirkt', () => {
  assert.ok(CIVICS.length >= 110 && CIVICS.length <= 130, 'Civics: ' + CIVICS.length);
  for (let z = 0; z < 11; z++) assert.ok(CIVICS.some((c) => c.zeitalter === z), 'Zeitalter ' + z);
  assert.equal(REGIERUNGEN.length, 8);
  assert.ok(POLITIKKARTEN.length >= 55 && POLITIKKARTEN.length <= 70);
  for (const c of CIVICS) {
    assert.ok(c.freischaltet.length > 0, c.id + ' ohne Wirkung');
    for (const v of c.voraussetzungen) assert.ok(CIVIC[v] && CIVIC[v].spalte < c.spalte, c.id + ': Voraussetzung ' + v);
    assert.ok(c.beschreibung.length > 15 && !/TODO|xxx/i.test(c.beschreibung));
  }
  const zaehle = (art, id) => CIVICS.reduce((a, c) => a + c.freischaltet.filter((x) => x.art === art && x.id === id).length, 0);
  for (const r of REGIERUNGEN) assert.equal(zaehle('regierung', r.id), 1, r.id);
  for (const k of POLITIKKARTEN) { assert.equal(zaehle('politikkarte', k.id), 1, k.id); assert.ok(['militaer', 'wirtschaft', 'diplomatie', 'joker'].includes(k.kategorie)); assert.ok(Object.keys(k.wirkung).length); }
  for (let i = 1; i < CIVIC_KOSTEN_JE_SPALTE.length; i++) assert.ok(CIVIC_KOSTEN_JE_SPALTE[i] >= CIVIC_KOSTEN_JE_SPALTE[i - 1]);
  assert.ok(START_CIVICS.includes('stammesgesetze'));
});

test('Neues Volk startet mit Stammesordnung; Kultur treibt die Civic voran; Abschluss schaltet frei und macht den Tausch kostenlos', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  assert.equal(v.regierung?.id, 'stammesordnung');
  const ziel = CIVICS.find((c) => s.civicMoeglich(v, c.id) && c.freischaltet.some((x) => x.art === 'politikkarte'));
  const r = s.befehl(v.id, { art: 'civic', id: ziel.id });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.civicZeit(v) > s.t, 'Fertigzeit aus der Kultur');
  vorspulen(s, 2 * 24 * STD);
  assert.ok(v.civics.erforscht[ziel.id], 'Civic abgeschlossen');
  assert.equal(v.freier_tausch, true);
  const karte = ziel.freischaltet.find((x) => x.art === 'politikkarte').id;
  assert.ok(s.karteFrei(v, karte));
});

test('Karten: Plätze, Kategorien, Joker, keine Doppelten, Gebühr ohne freien Tausch; Wirkung landet in den Boni', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  for (const c of CIVICS) if (c.zeitalter <= 3) v.civics.erforscht[c.id] = 1;
  s.aendern(v.id);
  let r = s.befehl(v.id, { art: 'regierung', id: 'republik' });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.imUebergang(v), 'Übergang nach dem Wechsel');
  const p = s.plaetze(v);
  const wirt = POLITIKKARTEN.filter((k) => k.kategorie === 'wirtschaft' && s.karteFrei(v, k.id));
  const mil = POLITIKKARTEN.filter((k) => k.kategorie === 'militaer' && s.karteFrei(v, k.id));
  r = s.befehl(v.id, { art: 'karten', karten: { militaer: [wirt[0].id] } });
  assert.equal(r.ok, false, 'Wirtschaftskarte passt nicht in Militär');
  r = s.befehl(v.id, { art: 'karten', karten: { wirtschaft: wirt.slice(0, p.wirtschaft + 1).map((k) => k.id) } });
  assert.equal(r.ok, false, 'zu viele Karten');
  const belegung = { militaer: mil.slice(0, p.militaer).map((k) => k.id), wirtschaft: wirt.slice(0, p.wirtschaft).map((k) => k.id), diplomatie: [], joker: [] };
  v.freier_tausch = true;
  r = s.befehl(v.id, { art: 'karten', karten: belegung });
  assert.ok(r.ok, r.fehler); assert.equal(r.gold, 0, 'freier Tausch');
  const key = Object.keys(wirt[0].wirkung)[0];
  const ohne = (() => { const k = v.karten; v.karten = {}; delete s._raten[v.id]; const x = s.boni(v)[key] || 0; v.karten = k; delete s._raten[v.id]; return x; })();
  assert.ok((s.boni(v)[key] || 0) > ohne, 'Kartenwirkung in den Boni: ' + key);
  // Gebühr beim nächsten Tausch
  const anders = { ...belegung, wirtschaft: [wirt[p.wirtschaft]?.id || wirt[0].id] };
  v.gold = 1e5; const g0 = v.gold;
  r = s.befehl(v.id, { art: 'karten', karten: anders });
  if (wirt[p.wirtschaft]) { assert.ok(r.ok, r.fehler); assert.ok(r.gold > 0 && v.gold < g0, 'Gebühr bezahlt'); }
  // Joker nimmt jede Kategorie
  r = s.befehl(v.id, { art: 'regierung', id: 'demokratie' });
  if (r.ok && s.plaetze(v).joker) { v.freier_tausch = true; r = s.befehl(v.id, { art: 'karten', karten: { joker: [mil[0].id] } }); assert.ok(r.ok, r.fehler); }
  assert.deepEqual(s.z.global.fehler || [], []);
});

test('Nicht freigeschaltete Regierung und Karten werden abgelehnt', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  let r = s.befehl(v.id, { art: 'regierung', id: 'technokratie' });
  assert.equal(r.ok, false);
  r = s.befehl(v.id, { art: 'karten', karten: { militaer: [POLITIKKARTEN.find((k) => k.kategorie === 'militaer' && !s.karteFrei(v, k.id)).id] } });
  assert.equal(r.ok, false);
});

test('KI-Völker forschen im Kulturbaum und nutzen Regierung und Karten', () => {
  const s = neueWelt();
  vorspulen(s, 3 * 24 * STD);
  for (const ki of s.alleVoelker().filter((x) => x.art === 'ki')) {
    assert.ok(Object.keys(ki.civics?.erforscht || {}).length > START_CIVICS.length, ki.name + ' kommt im Kulturbaum voran');
    assert.ok(ki.regierung, ki.name + ' hat eine Regierung');
  }
  assert.deepEqual(zustandPruefen(s), []);
});

test('Migration 4->5: Altstand bekommt Kulturbaum, vergangene Zeitalter gelten als gemeistert, Regierung und Karten gesetzt', () => {
  const ALT = JSON.parse(fs.readFileSync(new URL('./daten/altstand-v1.json', import.meta.url), 'utf8'));
  uhr.setze(ALT.spielzeit);
  const srv = new WeltServer(speicherAttrappe(new Map(Object.entries(ALT.zeilen))), { __eigeneUhr: true }, socketAttrappe());
  const s = srv.spiel;
  assert.ok(s.migrationen.includes('4->5'));
  for (const v of s.alleVoelker().filter((x) => x.art === 'spieler')) {
    for (const c of CIVICS.filter((x) => x.zeitalter < v.zeitalter)) assert.ok(v.civics.erforscht[c.id], v.name + ': ' + c.id);
    assert.ok(v.regierung && v.regierung.id !== 'stammesordnung', v.name + ' hat eine passende Regierung');
    assert.ok(Object.values(v.karten).flat().length > 0, v.name + ' hat Karten');
    assert.ok(v.freier_tausch);
  }
  assert.deepEqual(zustandPruefen(s), []);
});
