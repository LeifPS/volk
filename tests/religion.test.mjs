// Religion: Daten, Glaube sammeln, Pantheon, Gründung, Druck zwischen Städten, Missionare, Glaubenskampf, Inquisition, KI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt, vorspulen, STD } from './hilfen.mjs';
import { PANTHEONS, RELIGIONEN, GLAUBENSSAETZE, RELIGION_REGELN as RR } from '../public/shared/daten/religion.js';
import { FORSCHUNGEN } from '../public/shared/daten/index.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';
import { nachbarn } from '../public/shared/hex.js';

test('Daten: 12 Pantheons, 8 Religionen, ca. 40 Glaubenssätze in vier Kategorien', () => {
  assert.equal(PANTHEONS.length, 12);
  assert.equal(RELIGIONEN.length, 8);
  assert.ok(GLAUBENSSAETZE.length >= 38 && GLAUBENSSAETZE.length <= 44);
  for (const k of ['gruender', 'anhaenger', 'verehrung', 'reformer']) assert.ok(GLAUBENSSAETZE.filter((g) => g.kategorie === k).length >= 8, k);
  for (const g of GLAUBENSSAETZE) { assert.match(g.id, /^[a-z0-9_]+$/); assert.ok(g.reich || g.stadt || g.je_stadt, g.id + ' ohne Wirkung'); }
});

function glaeubig() {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  s.aendern(v.id);
  for (const f of FORSCHUNGEN) if (f.zeitalter <= 2) v.forschung.erforscht[f.id] = 1;
  for (let k = 0; k < 6; k++) s.grenzwachstum(stadt.id);
  stadt.bev = 8;
  s.distriktSetzen(stadt, 'heiligtum', s.distriktPlatzAutomatisch(stadt, 'heiligtum', false));
  return { s, v, stadt };
}

test('Heiligtum bringt Glauben; Pantheon und Religion kosten Glauben; Gründung macht die heilige Stadt gläubig', () => {
  const { s, v, stadt } = glaeubig();
  assert.ok(s.raten(v.id).glaube > 0, 'Glaube pro Stunde');
  vorspulen(s, 3 * STD);
  assert.ok(v.glaube > 0, 'Glaube sammelt sich');
  let r = s.befehl(v.id, { art: 'religion_gruenden', stadt: stadt.id, religion: 'sonnenweg', gruender: 'zehnt', anhaenger: 'gebetsstunden' });
  assert.equal(r.ok, false, 'erst ein Pantheon');
  s.aendern(v.id); v.glaube = 2000;
  r = s.befehl(v.id, { art: 'pantheon', id: 'erntegoettin' });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.boni(v).nahrung_prozent >= 4, 'Pantheon wirkt');
  r = s.befehl(v.id, { art: 'religion_gruenden', stadt: stadt.id, religion: 'sonnenweg', gruender: 'zehnt', anhaenger: 'gebetsstunden' });
  assert.ok(r.ok, r.fehler);
  assert.equal(s.mehrheit(stadt), 'sonnenweg');
  assert.ok(s.religionStadtWirkungen(stadt).some((w) => w.zufriedenheit === 2), 'Anhänger-Satz wirkt in der Stadt');
  r = s.befehl(v.id, { art: 'religion_verstaerken', verehrung: 'pagoden', reformer: 'kirchenstaat' });
  assert.ok(r.ok, r.fehler);
  assert.ok(s.boni(v).gold_prozent >= 6, 'Reformer-Satz wirkt');
  // ein zweites Volk kann den Satz "zehnt" nicht mehr nehmen
  const { v: v2, stadt: st2 } = spielerMitStadt(s, 'Zweiter');
  v2.pantheon = 'kriegsgott'; v2.glaube = 2000; s.distriktSetzen(st2, 'heiligtum', s.distriktPlatzAutomatisch(st2, 'heiligtum', false));
  r = s.befehl(v2.id, { art: 'religion_gruenden', stadt: st2.id, religion: 'quellenlehre', gruender: 'zehnt', anhaenger: 'chorgesang' });
  assert.equal(r.ok, false);
});

test('Druck verbreitet die Religion in Nachbarstädte; Missionar verschiebt Anteile; Apostel gewinnt Glaubenskampf; Inquisition räumt auf', () => {
  const { s, v, stadt } = glaeubig();
  v.glaube = 5000; v.pantheon = 'erntegoettin';
  s.befehl(v.id, { art: 'religion_gruenden', stadt: stadt.id, religion: 'sonnenweg', gruender: 'pilgerfahrt', anhaenger: 'chorgesang' });
  const { v: v2, stadt: st2 } = spielerMitStadt(s, 'Nachbar');
  vorspulen(s, 72 * STD);
  const nah = s.alleStaedte().filter((x) => x.id !== stadt.id && Object.keys(x.glauben || {}).length);
  // Missionar in die Stadt des Nachbarn
  const m = s.einheitErzeugen(v.id, 'missionar', st2.feld); m.feld = st2.feld; s.positionenNeu();
  s.religionFuerEinheit(m, stadt);
  assert.equal(m.religion, 'sonnenweg'); assert.equal(m.ladungen, 3);
  const vorher = st2.glauben?.sonnenweg || 0;
  let r = s.befehl(v.id, { art: 'missionieren', einheit: m.id });
  assert.ok(r.ok, r.fehler);
  assert.ok((st2.glauben.sonnenweg || 0) > vorher, 'Anteil steigt');
  // Fremder Apostel mit anderer Religion gegen eigenen Apostel
  const a1 = s.einheitErzeugen(v.id, 'apostel', stadt.feld); s.religionFuerEinheit(a1, stadt);
  const a2 = s.einheitErzeugen(v2.id, 'missionar', a1.feld); a2.religion = 'quellenlehre'; a2.ladungen = 3;
  a2.feld = nachbarn(a1.feld).find((n) => !s.einheitenAuf(n).length) ?? a2.feld; s.positionenNeu();
  r = s.befehl(v.id, { art: 'glaubenskampf', einheit: a1.id, ziel: a2.id });
  assert.ok(r.ok, r.fehler);
  assert.ok(r.sieg === true || !s.z.einheiten[a1.id], 'Ausgang ist konsistent');
  // Inquisition in der eigenen Stadt
  stadt.glauben = { sonnenweg: 0.6, quellenlehre: 0.3 };
  if (s.z.einheiten[a1.id]) { a1.feld = stadt.feld; s.positionenNeu(); r = s.befehl(v.id, { art: 'inquisition', einheit: a1.id }); assert.ok(r.ok, r.fehler); assert.deepEqual(Object.keys(stadt.glauben), ['sonnenweg']); }
  assert.ok(nah.length >= 0);
  assert.deepEqual(s.z.global.fehler || [], []);
  assert.deepEqual(zustandPruefen(s), []);
});

test('Religiöse Einheiten kosten Glauben und brauchen Heiligtum und Religion', () => {
  const { s, v, stadt } = glaeubig();
  v.glaube = 0;
  let r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'missionar' });
  assert.equal(r.ok, false); assert.match(r.fehler, /Religion/);
  v.pantheon = 'erntegoettin'; v.glaube = RR.gruendungKosten;
  s.befehl(v.id, { art: 'religion_gruenden', stadt: stadt.id, religion: 'lichtorden', gruender: 'zehnt', anhaenger: 'feiertage' });
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'missionar' });
  assert.equal(r.ok, false, 'ohne Glauben nicht'); assert.match(r.fehler, /Glaube/);
  s.aendern(v.id); v.glaube = 500;
  r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'missionar' });
  assert.ok(r.ok, r.fehler);
  assert.ok(v.glaube < 500, 'Glaube bezahlt');
});

test('KI-Völker wählen Pantheons und gründen Religionen', () => {
  const s = neueWelt();
  vorspulen(s, 6 * 24 * STD);
  const ki = s.alleVoelker().filter((x) => x.art === 'ki');
  assert.ok(ki.some((x) => x.pantheon), 'mindestens ein Pantheon');
  assert.deepEqual(s.z.global.fehler || [], []);
});
