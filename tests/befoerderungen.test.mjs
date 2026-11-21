import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, neueWelt, spielerMitStadt, Spiel, leererZustand } from './hilfen.mjs';
import { EP, kampfEp, epFuerBefoerderung, MAX_BEFOERDERUNGEN } from '../public/shared/regeln.js';
import { BEFOERDERUNGEN, BEFOERDERUNG, befoerderungenVon, baumVon } from '../public/shared/daten/index.js';
import { EINHEIT } from '../public/shared/daten/index.js';

function einheit() {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Alpha');
  const e = s.einheitErzeugen(A.v.id, 'krieger', s.z.staedte[A.stadt.id].feld);
  return { s, A, e };
}

test('EP-Formel wie Civ 6: Verhältnis, Sieg x2, Nah +2, Fern +1, Angriff +1, Deckel 8', () => {
  assert.equal(kampfEp(20, 20, 'nah', false, false), 1 + 2);
  assert.equal(kampfEp(20, 20, 'nah', true, false), 1 + 2 + 1);
  assert.equal(kampfEp(20, 20, 'fern', true, false), 1 + 1 + 1);
  assert.equal(kampfEp(20, 20, 'nah', true, true), 2 + 2 + 1);
  assert.equal(kampfEp(10, 40, 'nah', true, true), 8);     // Deckel
  assert.equal(kampfEp(40, 20, 'nah', false, false), 0.5 + 2);
  assert.equal(epFuerBefoerderung(1), 15); assert.equal(epFuerBefoerderung(4), 60);
  assert.equal(MAX_BEFOERDERUNGEN, 5);
});

test('Beförderung: Balken, Wahl, Heilung 50, Reset, Voraussetzungen, höchstens 5', () => {
  const { s, A, e } = einheit();
  const baum = baumVon(EINHEIT.krieger);
  assert.ok(baum);
  const stufe1 = befoerderungenVon(baum).filter((b) => b.stufe === 1);
  assert.ok(stufe1.length >= 1);
  assert.equal(s.befoerderungMoeglich(e), false);
  // EP über den Balken hinaus verfallen
  s.epGeben(e, 100, null);
  assert.equal(e.ep, 15);
  assert.equal(s.befoerderungMoeglich(e), true);
  // Stufe II nicht ohne Stufe I
  const hoch = befoerderungenVon(baum).find((b) => b.stufe === 2);
  assert.equal(s.befehl(A.v.id, { art: 'befoerdern', einheit: e.id, befoerderung: hoch.id }).ok, false);
  e.hp = 30; e.hp_um = s.t;
  const r = s.befehl(A.v.id, { art: 'befoerdern', einheit: e.id, befoerderung: stufe1[0].id });
  assert.equal(r.ok, true, r.fehler);
  assert.deepEqual(e.befoerderungen, [stufe1[0].id]);
  assert.equal(e.ep, 0);
  assert.ok(e.hp >= 80, 'Beförderung heilt 50 LP');
  // Doppelt geht nicht
  s.epGeben(e, 100, null);
  assert.equal(e.ep, 30);
  assert.equal(s.befehl(A.v.id, { art: 'befoerdern', einheit: e.id, befoerderung: stufe1[0].id }).ok, false);
  // bis zur Höchstgrenze (5) befördern
  let guard = 0;
  while ((e.befoerderungen || []).length < MAX_BEFOERDERUNGEN && guard++ < 10) {
    e.ep = s.epBenoetigt(e);
    const w = s.befoerderungenVerfuegbar(e);
    assert.ok(w.length > 0, 'es muss immer etwas wählbar sein');
    e.abkling_bis = 0; e.erholung_bis = 0;
    const rr = s.befehl(A.v.id, { art: 'befoerdern', einheit: e.id, befoerderung: w[0].id });
    assert.equal(rr.ok, true, rr.fehler);
  }
  assert.equal(e.befoerderungen.length, MAX_BEFOERDERUNGEN);
  assert.equal(s.epBenoetigt(e), null);
  s.epGeben(e, 50, null);
  assert.equal(s.befoerderungMoeglich(e), false);
});

test('Kampf bringt EP; gegen Barbaren nach der ersten Beförderung nur 1', () => {
  const { s, A, e } = einheit();
  s.epGeben(e, 3, null);
  assert.equal(e.ep, 3);
  const bar = Object.values(s.z.voelker).find((v) => v.art === 'barbar');
  s.epGeben(e, 3, bar.id);
  assert.equal(e.ep, 6);
  e.befoerderungen = [befoerderungenVon(baumVon(EINHEIT.krieger)).find((b) => b.stufe === 1).id];
  e.ep = 0;
  s.epGeben(e, 8, bar.id);
  assert.equal(e.ep, EP.nach_beforderung_barbar);
});

test('Kampfmodifikator aus Beförderung greift nur unter seiner Bedingung', () => {
  const { s, A, e } = einheit();
  const b = BEFOERDERUNGEN.find((x) => x.wirkung.mods && x.wirkung.mods.some((m) => m.gegen && m.rolle === 'angriff' && m.w > 0));
  assert.ok(b);
  const mo = b.wirkung.mods.find((m) => m.gegen && m.rolle === 'angriff');
  const g = { id: 'ebene' };
  const gegen = Array.isArray(mo.gegen) ? mo.gegen[0] : mo.gegen;
  const treffer = Object.values(EINHEIT).find((d) => s.passtGegen(gegen, { einheit: { typ: d.id } }));
  const nicht = Object.values(EINHEIT).find((d) => !s.passtGegen(gegen, { einheit: { typ: d.id } }));
  if (treffer) assert.equal(s.befModPasst({ w: 1, gegen, rolle: 'angriff' }, 'angriff', 'nah', { einheit: { typ: treffer.id, hp: 100 } }, e.feld, g), true);
  if (nicht) assert.equal(s.befModPasst({ w: 1, gegen, rolle: 'angriff' }, 'angriff', 'nah', { einheit: { typ: nicht.id, hp: 100 } }, e.feld, g), false);
  assert.equal(s.befModPasst({ w: 1, rolle: 'verteidigung' }, 'angriff', 'nah', null, e.feld, g), false);
});

test('Altspielstand: alte Beförderungen werden entfernt, EP begrenzt', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Alpha');
  const e = s.einheitErzeugen(A.v.id, 'krieger', s.z.staedte[A.stadt.id].feld);
  e.befoerderungen = ['kampf_1_alt', 'alte_sache']; e.ep = 90;
  s.befoerderungenMigrieren();
  assert.equal(e.befoerderungen, undefined);
  assert.equal(e.ep, 15);
  const echte = befoerderungenVon(baumVon(EINHEIT.krieger)).find((b) => b.stufe === 1).id;
  e.befoerderungen = [echte, 'alt']; e.ep = 500;
  s.befoerderungenMigrieren();
  assert.deepEqual(e.befoerderungen, [echte]);
  assert.equal(e.ep, 30);
});

test('Zivile Einheiten und Flak haben keinen Baum und sammeln keine EP', () => {
  const { s, A } = einheit();
  const sied = s.einheitErzeugen(A.v.id, 'siedler', s.z.staedte[A.stadt.id].feld);
  assert.equal(baumVon(EINHEIT.siedler), null);
  assert.equal(s.epGeben(sied, 10, null), 0);
  assert.equal(s.befoerderungMoeglich(sied), false);
});

test('Beförderung klappt auch, wenn der Einheit das Feld "befoerderungen" fehlt (gespeicherte Spielstände)', () => {
  const { s, A, e } = einheit();
  delete e.befoerderungen;        // die Migration löscht leere Listen
  delete e.ep;
  s.epGeben(e, 100, null);
  const w = s.befoerderungenVerfuegbar(e);
  assert.ok(w.length > 0);
  const r = s.befehl(A.v.id, { art: 'befoerdern', einheit: e.id, befoerderung: w[0].id });
  assert.equal(r.ok, true, r.fehler);
  assert.deepEqual(e.befoerderungen, [w[0].id]);
});

test('Aufrüsten dauert länger als der Neubau, Einheit ist solange gebunden, behält Erfahrung', async () => {
  const { vorspulen } = await import('./hilfen.mjs');
  const { FORSCHUNGEN } = await import('../public/shared/daten/index.js');
  const { s, A, e } = einheit();
  s.aendern(A.v.id);
  for (const f of FORSCHUNGEN) A.v.forschung.erforscht[f.id] = 1;
  const alt = EINHEIT[e.typ];
  const neu = EINHEIT[alt.upgrade];
  assert.ok(neu, 'Krieger hat einen Nachfolger');
  A.v.gold = 100000; for (const g of ['eisen', 'holz', 'stein', 'kohle', 'oel', 'aluminium']) A.v.lager[g] = 1000;
  e.ep = 7;
  const stadt = s.z.staedte[A.stadt.id];
  const direkt = s.bauDauerMs(stadt, 'einheit', neu.id);
  const r = s.befehl(A.v.id, { art: 'aufruesten', einheit: e.id });
  assert.equal(r.ok, true, r.fehler);
  assert.equal(e.typ, alt.id, 'Typ ändert sich erst am Ende');
  const dauer = e.umruestung.fertig_um - s.t;
  assert.ok(dauer > direkt, `Aufrüsten (${dauer}) muss länger dauern als Neubau (${direkt})`);
  // währenddessen gesperrt, außer Auflösen
  assert.equal(s.befehl(A.v.id, { art: 'modus', einheit: e.id, modus: 'befestigt' }).ok, false);
  assert.equal(s.befehl(A.v.id, { art: 'aufruesten', einheit: e.id }).ok, false);
  vorspulen(s, dauer - 5000);
  assert.equal(e.typ, alt.id);
  vorspulen(s, 10000);
  assert.equal(e.typ, neu.id);
  assert.equal(e.umruestung, undefined);
  assert.equal(e.ep, 7);
});

test('Aufrüsten-Angebot erscheint erst, wenn die nächste Einheit erforscht ist', async () => {
  const { FORSCHUNGEN } = await import('../public/shared/daten/index.js');
  const { s, A, e } = einheit();
  assert.equal(s.einheitAnsicht(e, true).aufruesten, undefined);
  s.aendern(A.v.id);
  for (const f of FORSCHUNGEN) A.v.forschung.erforscht[f.id] = 1;
  assert.ok(s.einheitAnsicht(e, true).aufruesten);
});

test('Händler ignorieren Grenzen, andere Einheiten nicht; Straßen der Route entstehen auch in fremdem Land', async () => {
  const { umkreis } = await import('../public/shared/hex.js');
  const { karte } = await import('../public/shared/karte.js');
  const { GELAENDE, FREIGESCHALTET_DURCH } = await import('../public/shared/daten/index.js');
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Alpha'), B = spielerMitStadt(s, 'Bruno');
  const k = karte();
  const fremd = umkreis(B.stadt.feld, 3).find((i) => s.besitzer(i) === B.v.id && !s.stadtAuf(i) && !GELAENDE[k.gelaende[i]].wasser);
  assert.ok(fremd != null, 'fremdes Gebiet vorhanden');
  const hand = EINHEIT.karawane, krieger = EINHEIT.krieger;
  assert.equal(s.ignoriertGrenzen(hand), true);
  assert.equal(s.ignoriertGrenzen(krieger), false);
  assert.ok(s.bewegungsKostenRoh(A.v.id, hand, fremd, fremd, true) < Infinity, 'Karawane darf hinein');
  assert.equal(s.bewegungsKostenRoh(A.v.id, krieger, fremd, fremd, true), Infinity, 'Krieger nicht ohne offene Grenzen');
  // Straße in fremdem Land
  const noetig = FREIGESCHALTET_DURCH['verbesserung:pfad'];
  if (noetig) A.v.forschung.erforscht[noetig] = 1;
  const e = s.einheitErzeugen(A.v.id, 'karawane', A.stadt.feld);
  s.routeWegeBauen(e, { von: A.stadt.id, nach: B.stadt.id, aktiv: true, richtung: 'hin', felder: [fremd] });
  assert.ok(s.z.felder[fremd]?.w, 'Pfad auch im fremden Gebiet');
});
