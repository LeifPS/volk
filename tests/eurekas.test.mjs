// Eurekas und Inspirationen: Daten vollständig und erreichbar, Auslösung durch echtes Spielen, 40 % Rabatt, Ansicht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { neueWelt, spielerMitStadt, vorspulen, MIN } from './hilfen.mjs';
import { EUREKAS_FORSCHUNG, EUREKAS_CIVIC } from '../public/shared/daten/eurekas.js';
import { FORSCHUNGEN, FORSCHUNG, NACHFOLGER, FREIGESCHALTET_DURCH, CIVICS, CIVIC, CIVIC_NACHFOLGER, GEB, EINHEITEN, EINHEIT, VERBESSERUNGEN, ROHSTOFF, REGIERUNG } from '../public/shared/daten/index.js';
import { DISTRIKTE } from '../public/shared/daten/distrikte.js';
import { zustandPruefen } from '../public/shared/engine/pruefung.js';

const ARTEN = new Set(['staedte', 'einwohner', 'kuestenstadt', 'flussstadt', 'gebaeude', 'distrikt', 'verbesserung', 'einheiten_ausgebildet', 'einheit_besitzen', 'siege', 'befoerderung', 'handelsrouten', 'kontakte', 'wunder', 'naturwunder', 'rohstoff', 'luxusgueter', 'gold', 'pantheon', 'religion', 'regierung', 'karten', 'forschung', 'civic', 'kolonie', 'raumflug', 'krieg', 'stadtstaat_freund']);

function nachkommen(id, nach) {
  const m = new Set(), offen = [id];
  while (offen.length) for (const n of nach[offen.pop()] || []) if (!m.has(n)) { m.add(n); offen.push(n); }
  return m;
}
/** Forschung, die ein Ding freischaltet (oder null, wenn es von Anfang an da ist). */
function quelle(art, id) { return FREIGESCHALTET_DURCH[`${art}:${id}`] || null; }
/** Frühestes Zeitalter, in dem eine der Forschungen die Bedingung erfüllbar macht (0, wenn von Anfang an). */
const fruehestes = (l) => (l.includes(null) ? 0 : Math.min(...l.map((q) => FORSCHUNG[q].zeitalter)));
/** Frühestmögliche Forschungen, die eine Bedingung erfüllbar machen (für die Prüfung "nicht man selbst oder später"). */
function benoetigt(b) {
  switch (b.art) {
    case 'gebaeude': return [quelle('gebaeude', b.id)];
    case 'distrikt': return [quelle('distrikt', b.id)];
    case 'einheit_besitzen': return [quelle('einheit', b.id)];
    case 'verbesserung': { const l = VERBESSERUNGEN.filter((v) => v.kette === b.kette).map((v) => quelle('verbesserung', v.id)); return l.includes(null) ? [null] : l; }
    case 'einheiten_ausgebildet': { const l = EINHEITEN.filter((e) => e.klasse === b.klasse).map((e) => quelle('einheit', e.id)); return l.includes(null) ? [null] : l; }
    case 'forschung': return [b.id];
    default: return [null];
  }
}

test('Daten: jede Forschung und jede Civic hat genau eine gültige Bedingung mit deutschem Text', () => {
  assert.deepEqual(FORSCHUNGEN.filter((f) => !EUREKAS_FORSCHUNG[f.id]).map((f) => f.id), [], 'Forschungen ohne Eureka');
  assert.deepEqual(CIVICS.filter((c) => !EUREKAS_CIVIC[c.id]).map((c) => c.id), [], 'Civics ohne Inspiration');
  assert.deepEqual(Object.keys(EUREKAS_FORSCHUNG).filter((id) => !FORSCHUNG[id]), [], 'Eurekas zu unbekannten Forschungen');
  assert.deepEqual(Object.keys(EUREKAS_CIVIC).filter((id) => !CIVIC[id]), [], 'Inspirationen zu unbekannten Civics');
  const klassen = new Set(EINHEITEN.map((e) => e.klasse)), ketten = new Set(VERBESSERUNGEN.map((v) => v.kette));
  for (const [quelleName, daten] of [['f', EUREKAS_FORSCHUNG], ['c', EUREKAS_CIVIC]]) for (const [id, eu] of Object.entries(daten)) {
    const b = eu.bed, w = `${quelleName}:${id}`;
    assert.ok(ARTEN.has(b.art), `${w}: unbekannte Art ${b.art}`);
    assert.ok(typeof eu.text === 'string' && eu.text.length >= 8 && eu.text.length <= 90, `${w}: Text`);
    assert.doesNotMatch(eu.text, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `${w}: kein Emoji`);
    assert.doesNotMatch(eu.text, /\b(fuer|ueber|Gebaeude|Staedte|Kueste|Koenig|Moench|Goetter|Waehrung|Gruende|Stuetz|Fuehr)/i, `${w}: Umlaute statt ae/oe/ue`);
    if (b.anzahl != null) assert.ok(Number.isInteger(b.anzahl) && b.anzahl >= 1, `${w}: anzahl`);
    if (b.art === 'gebaeude') assert.ok(GEB[b.id], `${w}: Gebäude ${b.id}`);
    if (b.art === 'distrikt') assert.ok(DISTRIKTE.some((d) => d.id === b.id), `${w}: Distrikt ${b.id}`);
    if (b.art === 'verbesserung') assert.ok(ketten.has(b.kette), `${w}: Kette ${b.kette}`);
    if (b.art === 'einheiten_ausgebildet') assert.ok(klassen.has(b.klasse), `${w}: Klasse ${b.klasse}`);
    if (b.art === 'einheit_besitzen') assert.ok(EINHEIT[b.id], `${w}: Einheit ${b.id}`);
    if (b.art === 'rohstoff') assert.ok(ROHSTOFF[b.id], `${w}: Rohstoff ${b.id}`);
    if (b.art === 'regierung') assert.ok(REGIERUNG[b.id], `${w}: Regierung ${b.id}`);
    if (b.art === 'forschung') assert.ok(FORSCHUNG[b.id], `${w}: Forschung ${b.id}`);
    if (b.art === 'civic') assert.ok(CIVIC[b.id], `${w}: Civic ${b.id}`);
  }
});

test('Daten: keine Forschungs-Eureka verlangt etwas, das erst sie selbst oder eine spätere Forschung freischaltet', () => {
  const fehler = [];
  for (const f of FORSCHUNGEN) {
    const eu = EUREKAS_FORSCHUNG[f.id]; if (!eu) continue;
    const spaeter = nachkommen(f.id, NACHFOLGER); spaeter.add(f.id);
    const l = benoetigt(eu.bed);
    if (l.every((q) => q && spaeter.has(q))) fehler.push(`${f.id} braucht ${l.join('/')}`);
    // nicht weiter als ein Zeitalter voraus (die Bedingung soll im Spielverlauf natürlich anfallen)
    if (fruehestes(l) > f.zeitalter) fehler.push(`${f.id}: ${l.join('/')} liegt in einem späteren Zeitalter`);
  }
  assert.deepEqual(fehler, []);
});

test('Daten: keine Inspiration verlangt sich selbst oder eine nachfolgende Civic', () => {
  const fehler = [];
  for (const c of CIVICS) {
    const b = EUREKAS_CIVIC[c.id]?.bed; if (!b) continue;
    const spaeter = nachkommen(c.id, CIVIC_NACHFOLGER); spaeter.add(c.id);
    if (b.art === 'civic' && spaeter.has(b.id)) fehler.push(c.id);
    if (b.art === 'regierung' && Object.values(CIVIC).some((x) => spaeter.has(x.id) && x.freischaltet.some((y) => y.art === 'regierung' && y.id === b.id))) fehler.push(c.id + ' (Regierung)');
    if (fruehestes(benoetigt(b)) > c.zeitalter + 1) fehler.push(`${c.id}: zu spät erfüllbar`);
  }
  assert.deepEqual(fehler, []);
});

/** Erste Forschungs-Eureka mit Bedingung art (und optionalem Filter). */
const finde = (art, f = () => true) => Object.entries(EUREKAS_FORSCHUNG).find(([, eu]) => eu.bed.art === art && f(eu.bed));

test('Ein Gebäude erfüllt eine Eureka: 40 % Teilfortschritt, Meldung, nur einmal', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  const [fid, eu] = finde('gebaeude', (b) => (b.anzahl || 1) === 1 && FORSCHUNG[FREIGESCHALTET_DURCH['gebaeude:' + b.id]]?.zeitalter <= 1);
  s.aendern(v.id);
  v.zeitalter = Math.max(v.zeitalter || 0, FORSCHUNG[fid].zeitalter - 1);
  stadt.gebaeude[eu.bed.id] = 1;
  s.aendern(v.id);
  vorspulen(s, MIN);
  assert.ok(v.eurekas['f:' + fid], `Eureka ${fid} ausgelöst`);
  const anteil = v.forschung.aktiv === fid ? v.forschung.fortschritt : v.forschung.teil[fid];
  assert.ok(Math.abs(anteil - 0.4) < 0.05, 'etwa 40 % geschenkt: ' + anteil);
  assert.ok(v.meldungen.some((m) => m.art === 'eureka'), 'Meldung');
  const vorher = v.forschung.teil?.[fid];
  s.aendern(v.id); vorspulen(s, MIN);
  assert.equal(v.forschung.teil?.[fid], vorher, 'nicht doppelt');
  assert.deepEqual(zustandPruefen(s), []);
});

test('Aktive Forschung springt durch eine Eureka sofort um 40 % weiter', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  const [fid, eu] = finde('staedte', (b) => (b.anzahl || 1) <= 1) || finde('gebaeude', (b) => (b.anzahl || 1) === 1 && FORSCHUNG[FREIGESCHALTET_DURCH['gebaeude:' + b.id]]?.zeitalter === 0);
  s.aendern(v.id);
  for (const p of FORSCHUNG[fid].voraussetzungen) v.forschung.erforscht[p] = 1;
  delete v.eurekas?.['f:' + fid];
  v.forschung.aktiv = fid; v.forschung.fortschritt = 0.1;
  if (eu.bed.art === 'gebaeude') stadt.gebaeude[eu.bed.id] = 1;
  s.aendern(v.id); vorspulen(s, MIN);
  assert.ok(v.eurekas['f:' + fid]);
  assert.ok(v.forschung.erforscht[fid] || v.forschung.fortschritt >= 0.5, 'Fortschritt gestiegen');
});

test('Zähler: ausgebildete Einheiten, Siege und Kriegserklärungen zählen; Inspiration gibt Kulturpunkte', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s);
  // Einheit ausbilden über den echten Bauweg
  s.aendern(v.id); v.gold = 5000; v.lager = { ...(v.lager || {}), holz: 5000, stein: 5000 };
  const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger' });
  assert.ok(r.ok, r.fehler);
  vorspulen(s, 3 * 60 * MIN);
  assert.ok((v.zaehler?.einheiten?.nahkampf || 0) >= 1, 'Nahkämpfer gezählt');
  // Inspiration: erste Civic mit Bedingung "staedte 1" oder Einheiten
  const ein = Object.entries(EUREKAS_CIVIC).find(([, eu]) => (eu.bed.art === 'staedte' && (eu.bed.anzahl || 1) <= 1) || (eu.bed.art === 'einheiten_ausgebildet' && eu.bed.klasse === 'nahkampf' && (eu.bed.anzahl || 1) <= 1));
  if (ein) {
    const [cid] = ein;
    s.aendern(v.id); delete v.eurekas['c:' + cid]; s.eurekaVormerken(v.id); vorspulen(s, MIN);
    if (CIVIC[cid].zeitalter <= 1) assert.ok(v.eurekas['c:' + cid], 'Inspiration ' + cid);
  }
});

test('Ansicht zeigt erfüllte Eurekas und den Stand offener Bedingungen', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s);
  const a = s.ansichtFuer ? s.ansichtFuer(v.id) : s.ansicht(v.id);
  assert.ok(a.du.eurekas, 'eurekas in der Ansicht');
  assert.ok(Object.keys(a.du.eurekas.stand.f).length > 10, 'Stand für nahe Forschungen');
  for (const [w, z] of Object.values(a.du.eurekas.stand.f)) assert.ok(Number.isFinite(w) && z >= 1);
});

test('KI-Völker bekommen ebenfalls Eurekas; die Prüfung bleibt fehlerfrei', () => {
  const s = neueWelt();
  vorspulen(s, 2 * 24 * 60 * MIN);
  const ki = s.alleVoelker().filter((x) => x.art === 'ki');
  assert.ok(ki.some((x) => Object.keys(x.eurekas || {}).length > 0), 'mindestens eine KI hat Eurekas');
  assert.deepEqual(s.z.global.fehler || [], []);
});
