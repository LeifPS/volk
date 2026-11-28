// Handel und Diplomatie: Beziehungswert, Handelsabkommen, Embargo, Gesandte/Botschaften, KI-Reaktionen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt, vorspulen, STD } from './hilfen.mjs';
import { FORSCHUNGEN, CIVICS, EINHEIT } from '../public/shared/daten/index.js';
import { BEZIEHUNG, KI_SCHWELLEN, beziehungsStufe } from '../public/shared/daten/diplomatie.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { nachbarn } from '../public/shared/hex.js';

const alles = (s, v) => { s.aendern(v.id); for (const f of FORSCHUNGEN) if (f.zeitalter <= 3) v.forschung.erforscht[f.id] = 1; v.gold = 50000; };
function zwei() {
  const s = neueWelt();
  const { v: a, stadt: sa } = spielerMitStadt(s, 'Ahorn');
  const { v: b, stadt: sb } = spielerMitStadt(s, 'Birke');
  alles(s, a); alles(s, b);
  a.bekannt ||= {}; b.bekannt ||= {}; a.bekannt[b.id] = true; b.bekannt[a.id] = true;
  return { s, a, b, sa, sb };
}

test('Daten: Stufen aufsteigend, Gesandter und die neuen Optionen werden genau einmal freigeschaltet', () => {
  const ab = BEZIEHUNG.stufen.map((x) => x.ab);
  assert.deepEqual(ab, [...ab].sort((x, y) => x - y));
  assert.equal(beziehungsStufe(-100).id, 'feindselig'); assert.equal(beziehungsStufe(0).id, 'neutral'); assert.equal(beziehungsStufe(80).id, 'befreundet');
  const quellen = (art, id) => [...FORSCHUNGEN, ...CIVICS].filter((x) => x.freischaltet.some((f) => f.art === art && f.id === id)).length;
  assert.equal(quellen('einheit', 'gesandter'), 1);
  assert.equal(quellen('option', 'handelsabkommen'), 1);
  assert.equal(quellen('option', 'embargo'), 1);
  assert.ok(EINHEIT.gesandter.faehigkeiten.includes('gesandtschaft'));
  assert.ok(KI_SCHWELLEN.krieg < KI_SCHWELLEN.embargo && KI_SCHWELLEN.embargo < KI_SCHWELLEN.handelsabkommen);
});

test('Kriegserklärung senkt die Beziehung stark, Frieden hebt sie wieder, alles verblasst langsam', () => {
  const { s, a, b } = zwei();
  a.schutz_bis = b.schutz_bis = 0; b.verbunden = 1;
  const r = s.befehl(a.id, { art: 'krieg_erklaeren', volk: b.id, bestaetigt: true });
  assert.ok(r.ok, r.fehler);
  assert.equal(s.beziehung(a.id, b.id), BEZIEHUNG.ereignis.krieg_erklaert);
  vorspulen(s, 3 * STD);
  assert.ok(s.beziehung(a.id, b.id) < BEZIEHUNG.ereignis.krieg_erklaert, 'Krieg drückt weiter');
  s.friedenSchliessen(a.id, b.id);
  const nachFrieden = s.beziehung(a.id, b.id);
  vorspulen(s, 10 * STD);
  assert.ok(s.beziehung(a.id, b.id) > nachFrieden, 'verblasst zur Mitte');
  assert.ok(s.beziehung(a.id, b.id) <= 0);
});

test('Handelsabkommen: nur ohne Embargo, mehr Gold je Route, eine Route mehr, endet im Krieg', () => {
  const { s, a, b, sa, sb } = zwei();
  const kap = s.routenKapazitaet(a);
  let r = s.befehl(a.id, { art: 'diplomatie_angebot', an: b.id, typ: 'handelsabkommen' });
  assert.ok(r.ok, r.fehler);
  r = s.befehl(b.id, { art: 'angebot_antwort', id: r.angebot, annehmen: true });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.hatHandelsabkommen(a.id, b.id));
  assert.equal(s.routenKapazitaet(a), kap + 1);
  assert.ok(s.beziehung(a.id, b.id) >= BEZIEHUNG.ereignis.vertrag);
  const ohne = s.routenWert({ von: sa.id, nach: sb.id }) / s.routenFaktor(a.id, b.id);
  assert.ok(Math.abs(s.routenWert({ von: sa.id, nach: sb.id }) - ohne * 1.25) < 1e-6);
  a.schutz_bis = b.schutz_bis = 0; b.verbunden = 1;
  s.befehl(a.id, { art: 'krieg_erklaeren', volk: b.id, bestaetigt: true });
  assert.equal(s.hatHandelsabkommen(a.id, b.id), false);
});

test('Embargo: beendet Routen und Tausch, sperrt neue, gilt mindestens 6 Stunden', () => {
  const { s, a, b, sb } = zwei();
  const k = s.einheitErzeugen(a.id, 'karawane', s.staedteVon(a.id)[0].feld);
  let r = s.befehl(a.id, { art: 'handelsroute', einheit: k.id, stadt: sb.id });
  if (r.ok) { k.route.aktiv = true; }
  r = s.befehl(b.id, { art: 'embargo', an: a.id });
  assert.ok(r.ok, r.fehler);
  assert.ok(!k.route, 'Route beendet');
  assert.ok(s.beziehung(a.id, b.id) <= BEZIEHUNG.ereignis.embargo);
  r = s.befehl(a.id, { art: 'handelsroute', einheit: k.id, stadt: sb.id });
  assert.equal(r.ok, false); assert.match(r.fehler, /Embargo/);
  r = s.befehl(a.id, { art: 'tausch_angebot', an: b.id, gibt: { gold: 10 }, will: {} });
  assert.equal(r.ok, false);
  r = s.befehl(b.id, { art: 'embargo', an: a.id, aufheben: true });
  assert.equal(r.ok, false, 'zu früh');
  vorspulen(s, 6 * STD);
  r = s.befehl(b.id, { art: 'embargo', an: a.id, aufheben: true });
  assert.ok(r.ok, r.fehler);
  assert.equal(s.hatEmbargo(a.id, b.id), false);
});

test('Gesandter reist ohne offene Grenzen, richtet eine Botschaft ein und wird verbraucht', () => {
  const { s, a, b, sb } = zwei();
  const feld = nachbarn(sb.feld).find((n) => !s.einheitenAuf(n).length && s.feldBetretbar?.(n, EINHEIT.gesandter) !== false) ?? nachbarn(sb.feld)[0];
  const g = s.einheitErzeugen(a.id, 'gesandter', feld); g.feld = feld; s.positionenNeu();
  assert.ok(s.ignoriertGrenzen(EINHEIT.gesandter));
  const vorher = s.beziehung(a.id, b.id);
  const r = s.befehl(a.id, { art: 'gesandtschaft', einheit: g.id });
  assert.ok(r.ok, r.fehler);
  assert.ok(!s.z.einheiten[g.id], 'verbraucht');
  assert.equal(s.beziehung(a.id, b.id), vorher + BEZIEHUNG.ereignis.gesandtschaft);
  assert.ok(s.sichtbareFelder(a.id).has(sb.feld), 'Botschaft gibt Sicht');
  const a2 = s.ansichtFuer(a.id);
  assert.equal(a2.diplomatie[b.id].botschaft_bei_ihnen, true);
  const g2 = s.einheitErzeugen(a.id, 'gesandter', feld); g2.feld = feld; s.positionenNeu();
  assert.equal(s.befehl(a.id, { art: 'gesandtschaft', einheit: g2.id }).ok, false, 'nur eine Botschaft je Volk');
  assert.deepEqual(zustandPruefen(s), []);
});

test('Routen zwischen Völkern verbessern die Beziehung stündlich, aber nur bis zur Zustandsgrenze', () => {
  const { s, a, b } = zwei();
  const d = s.diplo(a.id, b.id); d.handelsabkommen = true; d.offene_grenzen = true; d.buendnis = true;
  for (let h = 0; h < 200; h++) s.beziehungTakt();
  assert.equal(s.beziehung(a.id, b.id), BEZIEHUNG.zustandMax);
});

test('KI reagiert: schlechte Beziehung bringt Embargo und Groll, gute Beziehung eigene Vorschläge', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  alles(s, v);
  const ki = s.alleVoelker().find((x) => x.art === 'ki');
  alles(s, ki);
  v.bekannt ||= {}; ki.bekannt ||= {}; v.bekannt[ki.id] = true; ki.bekannt[v.id] = true;
  s.diplo(v.id, ki.id).beziehung = -60;
  s.kiBeziehungen(ki);
  assert.ok(s.hatEmbargo(v.id, ki.id), 'Embargo');
  // Angebot bei schlechter Beziehung wird abgelehnt
  let r = s.befehl(v.id, { art: 'diplomatie_angebot', an: ki.id, typ: 'offene_grenzen' });
  assert.ok(r.ok, r.fehler);
  assert.ok(!s.z.diplomatie[s.diploSchluessel(v.id, ki.id)].offene_grenzen, 'abgelehnt');
  assert.ok(v.meldungen.some((m) => /Beziehung ist dafür zu schlecht|trauen/.test(m.text)));
  // Gute Beziehung: die KI schlägt selbst etwas vor
  const d = s.diplo(v.id, ki.id); d.embargo = {}; d.beziehung = 70; ki.ki.groll = {};
  s.kiBeziehungen(ki);
  assert.ok(Object.values(s.z.angebote).some((x) => x.von === ki.id && x.an === v.id), 'KI-Vorschlag');
  s.kiBeziehungen(ki);
  assert.equal(Object.values(s.z.angebote).filter((x) => x.von === ki.id && x.an === v.id).length, 1, 'nicht mehrfach');
});

test('Lange Simulation mit KI: Beziehungen bleiben im Bereich, keine Fehler', () => {
  const s = neueWelt();
  vorspulen(s, 3 * 24 * STD);
  for (const d of Object.values(s.z.diplomatie)) if (d.beziehung != null) assert.ok(d.beziehung >= -100 && d.beziehung <= 100);
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});
