// Distrikte: Daten, Bau auf Feldern, Gebäude brauchen ihren Distrikt, Nachbarschaftsboni mit Quellen, Stufen,
// Spezialisierung, Plünderung, KI baut Distrikte, Migration des Altstands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { neueWelt, spielerMitStadt, vorspulen, STD, uhr, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { DISTRIKTE, DISTRIKT, GEBAEUDE_DISTRIKT, DISTRIKT_VON_GEBAEUDE, DISTRIKT_REGELN } from '../public/shared/daten/distrikte.js';
import { GEB, FORSCHUNGEN, FORSCHUNG, FREIGESCHALTET_DURCH, GELAENDE } from '../public/shared/daten/index.js';
import { karte } from '../public/shared/karte.js';
import { nachbarn } from '../public/shared/hex.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { WeltServer } from '../src/server.js';

test('Daten: 8 Erd- und 3 Weltraum-Distrikte, jede genau einmal freigeschaltet, Gebäudeketten stimmen', () => {
  assert.equal(DISTRIKTE.filter((d) => !d.ebene).length, 8);
  assert.equal(DISTRIKTE.filter((d) => d.ebene === 1).length, 3);
  for (const d of DISTRIKTE) {
    const n = FORSCHUNGEN.reduce((a, f) => a + f.freischaltet.filter((x) => x.art === 'distrikt' && x.id === d.id).length, 0);
    assert.equal(n, 1, d.id + ': genau eine Freischaltung');
    assert.ok(d.spez.length === 2, d.id + ': zwei Ausrichtungen');
    assert.ok(d.nachbar.length > 0 && ['w', 'g', 'p', 'k', 'n', 'glaube'].includes(d.ertrag));
    for (const g of d.stufen) { assert.ok(GEB[g], d.id + ': Stufe ' + g); assert.equal(DISTRIKT_VON_GEBAEUDE[g], d.id, g + ' gehört zum Distrikt'); }
    // Distrikt nie später freigeschaltet als sein erstes Gebäude
    if (d.stufen.length) {
      const fd = FORSCHUNG[FREIGESCHALTET_DURCH['distrikt:' + d.id]], fg = FORSCHUNG[FREIGESCHALTET_DURCH['gebaeude:' + d.stufen[0]]];
      assert.ok(fd.spalte <= fg.spalte, d.id + ' kommt nicht nach ' + d.stufen[0]);
    }
  }
  for (const [d, l] of Object.entries(GEBAEUDE_DISTRIKT)) { assert.ok(DISTRIKT[d]); for (const g of l) assert.ok(GEB[g], g); }
  const doppelt = Object.values(GEBAEUDE_DISTRIKT).flat();
  assert.equal(new Set(doppelt).size, doppelt.length, 'jedes Gebäude in höchstens einem Distrikt');
});

function aufbau() {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  s.aendern(v.id);
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 2) v.forschung.erforscht[f.id] = 1;
  for (let k = 0; k < 10; k++) s.grenzwachstum(stadt.id);
  stadt.bev = 9;
  v.gold = 1e6; v.lager = { ...v.lager, holz: 5000, stein: 5000, marmor: 500, eisen: 50 };
  return { s, v, stadt };
}

test('Bibliothek braucht den Campus; Campus auf gewähltem Feld bauen, dann die Bibliothek', () => {
  const { s, v, stadt } = aufbau();
  let r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'bibliothek' });
  assert.equal(r.ok, false); assert.match(r.fehler, /Campus/);
  const plaetze = s.distriktPlaetze(stadt, 'campus');
  assert.ok(plaetze.length);
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'distrikt', id: 'campus', feld: stadt.feld });
  assert.equal(r.ok, false, 'nicht auf dem Stadtzentrum');
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'distrikt', id: 'campus', feld: plaetze[0] });
  assert.ok(r.ok, r.fehler);
  assert.equal(s.z.felder[plaetze[0]].db, 'campus', 'Baustelle sichtbar');
  vorspulen(s, 2 * 24 * STD);
  assert.ok(stadt.distrikte?.campus, 'Campus steht');
  assert.equal(s.z.felder[plaetze[0]].d, 'campus');
  assert.ok(!stadt.arbeit.includes(plaetze[0]), 'Distriktfeld wird nicht bewirtschaftet');
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'gebaeude', id: 'bibliothek' });
  assert.ok(r.ok, r.fehler);
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'distrikt', id: 'campus' });
  assert.equal(r.ok, false, 'zweiter Campus nicht möglich');
  vorspulen(s, 2 * 24 * STD);
  assert.equal(s.distriktStufe(stadt, 'campus'), 1);
  assert.ok(s.raten(v.id).staedte[stadt.id].distrikte.campus > 0, 'Campus bringt Wissen');
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});

test('Nachbarschaftsbonus: Gebirge und andere Distrikte zählen, Quellen werden genannt; Stufe 3 verdoppelt', () => {
  const { s, stadt } = aufbau();
  const k = karte();
  const feld = stadt.gebiet.find((i) => i !== stadt.feld && !s.distriktPlatzHindernis(stadt, 'campus', i));
  const geb = GELAENDE.findIndex((g) => g.id === 'gebirge');
  const n = nachbarn(feld).find((x) => !stadt.gebiet.includes(x) || x !== stadt.feld);
  const alt = k.gelaende[n]; k.gelaende[n] = geb;
  try {
    const nb = s.distriktNachbarschaft(stadt, 'campus', feld);
    assert.ok(nb.quellen.some((q) => q.text === 'Gebirge' && q.wert === 1), JSON.stringify(nb.quellen));
    s.distriktSetzen(stadt, 'campus', feld);
    const e1 = s.distriktErtrag(stadt, 'campus');
    stadt.gebaeude.bibliothek = 1; stadt.gebaeude.universitaet = 1; stadt.gebaeude.forschungslabor = 1;
    const e3 = s.distriktErtrag(stadt, 'campus');
    assert.equal(e3.stufe, 3);
    assert.ok(Math.abs((e3.wert - 1 - (s.z.voelker[stadt.volk].zeitalter || 0) * DISTRIKT_REGELN.grundJeZeitalter) - 2 * (e1.wert - 1 - (s.z.voelker[stadt.volk].zeitalter || 0) * DISTRIKT_REGELN.grundJeZeitalter)) < 0.11, 'Stufe 3 doppelt');
  } finally { k.gelaende[n] = alt; }
});

test('Spezialisierung umstellen halbiert kurz den Ertrag; Plündern legt Distrikt und Gebäude lahm, Reparatur gegen Gold', () => {
  const { s, v, stadt } = aufbau();
  const feld = s.distriktPlatzAutomatisch(stadt, 'handelsplatz');
  s.distriktSetzen(stadt, 'handelsplatz', feld);
  stadt.gebaeude.markt = 1; s.aendern(v.id);
  const g0 = s.raten(v.id).staedte[stadt.id].g;
  let r = s.befehl(v.id, { art: 'distrikt_spez', stadt: stadt.id, distrikt: 'handelsplatz', spez: 'kontor' });
  assert.ok(r.ok, r.fehler);
  assert.equal(stadt.distrikte.handelsplatz.spez, 'kontor');
  vorspulen(s, 7 * STD);
  // Plündern durch einen Feind
  const { v: feind } = spielerMitStadt(s, 'Feind');
  assert.ok(s.distriktPluendern(feld, feind.id));
  s.aendern(v.id);
  assert.ok(s.raten(v.id).staedte[stadt.id].g < g0, 'Gold sinkt, solange geplündert');
  r = s.befehl(v.id, { art: 'distrikt_reparieren', stadt: stadt.id, distrikt: 'handelsplatz' });
  assert.ok(r.ok, r.fehler);
  assert.ok(!s.distriktGepluendert(stadt, 'handelsplatz'));
});

test('Höchstzahl Distrikte hängt an den Einwohnern', () => {
  const { s, v, stadt } = aufbau();
  stadt.bev = 1;
  assert.equal(s.distriktMax(stadt), 1);
  s.distriktSetzen(stadt, 'campus', s.distriktPlatzAutomatisch(stadt, 'campus'));
  const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'distrikt', id: 'heiligtum' });
  assert.equal(r.ok, false); assert.match(r.fehler, /Einwohnern/);
});

test('KI-Völker bauen Distrikte, um ihre Gebäude bauen zu können', () => {
  const s = neueWelt();
  vorspulen(s, 6 * 24 * STD);
  const ki = s.alleVoelker().filter((x) => x.art === 'ki');
  const mitDistrikt = ki.filter((x) => s.staedteVon(x.id).some((st) => Object.keys(st.distrikte || {}).length));
  assert.ok(mitDistrikt.length >= 3, 'KI baut Distrikte: ' + mitDistrikt.length);
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});

test('Migration 3->4: Altstand bekommt Distrikte für seine Gebäude, Gebäude und Erträge bleiben', () => {
  const ALT = JSON.parse(fs.readFileSync(new URL('./daten/altstand-v1.json', import.meta.url), 'utf8'));
  uhr.setze(ALT.spielzeit);
  const srv = new WeltServer(speicherAttrappe(new Map(Object.entries(ALT.zeilen))), { __eigeneUhr: true }, socketAttrappe());
  const s = srv.spiel;
  assert.ok(s.migrationen.includes('3->4'));
  let n = 0;
  for (const st of s.alleStaedte()) for (const g of Object.keys(st.gebaeude)) {
    const d = DISTRIKT_VON_GEBAEUDE[g];
    if (!d) continue;
    n++;
    assert.ok(st.distrikte?.[d], `${st.name}: Distrikt ${d} für ${g}`);
    const x = st.distrikte[d];
    if (x.feld != null) { assert.equal(s.z.felder[x.feld].d, d); assert.ok(st.gebiet.includes(x.feld)); }
  }
  assert.ok(n > 50, 'der Altstand hat viele Spezialgebäude: ' + n);
  assert.deepEqual(zustandPruefen(s), []);
});

test('Tradition: einmalig wählbar, einzigartiger Distrikt billiger und mit Zusatzbonus; KI bekommt ihre Tradition', async () => {
  const { TRADITIONEN } = await import('../public/shared/daten/distrikte.js');
  assert.ok(TRADITIONEN.length >= 4, 'mindestens 4 einzigartige Distrikte');
  const { s, v, stadt } = aufbau();
  const normal = s.bauKosten(stadt, 'distrikt', 'campus').gold;
  let r = s.befehl(v.id, { art: 'tradition_waehlen', id: 'gelehrte' });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.bauKosten(stadt, 'distrikt', 'campus').gold < normal, 'einzigartiger Distrikt ist billiger');
  r = s.befehl(v.id, { art: 'tradition_waehlen', id: 'krieger' });
  assert.equal(r.ok, false, 'nur einmal');
  s.distriktSetzen(stadt, 'campus', s.distriktPlatzAutomatisch(stadt, 'campus'));
  assert.ok(s.distriktWirkungen(stadt).some((w) => w.kultur === 2), 'Zusatzbonus wirkt');
  vorspulen(s, 2 * STD);
  for (const ki of s.alleVoelker().filter((x) => x.art === 'ki')) assert.ok(ki.tradition, ki.name + ' hat eine Tradition');
});
