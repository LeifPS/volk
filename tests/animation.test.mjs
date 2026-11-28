// Animationen: jede Verbesserungskette (außer Wegen) hat einen Betrieb, jede Einheit eine Bewegungsart, jedes Geschoss ist definiert.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VERBESSERUNGEN, EINHEITEN } from '../public/shared/daten/index.js';
import { hatVerbesserungAnim, bewegungsArt, geschossArt, einheitVersatz, setzeEffekte, ruheIntervall } from '../public/js/karte/animation.js';

const OHNE = new Set(['strasse', 'bruecke', 'kanal']);
test('Jede Verbesserungskette außer Wegen ist animiert', () => {
  const ketten = [...new Set(VERBESSERUNGEN.map((v) => v.kette))].filter((k) => !OHNE.has(k));
  assert.deepEqual(ketten.filter((k) => !hatVerbesserungAnim(k)), []);
});
test('Jede Einheit hat eine Bewegungsart und Fernkämpfer ein Geschoss', () => {
  const arten = new Set(['fuss', 'reiter', 'fahrzeug', 'schiff', 'flug', 'raum']);
  for (const e of EINHEITEN) {
    assert.ok(arten.has(bewegungsArt(e.id, 'land', false)), e.id);
    if ((e.fern || 0) > 0) assert.ok(['pfeil', 'stein', 'granate', 'kugel', 'bombe', 'rakete', 'laser'].includes(geschossArt(e.id)), e.id);
  }
});
test('Effekte-Stufen: aus bewegt nichts, voll zeichnet öfter', () => {
  setzeEffekte('aus');
  assert.equal(einheitVersatz('fuss', true, 1234, 5).dy, 0);
  const aus = ruheIntervall(false);
  setzeEffekte('voll');
  assert.ok(ruheIntervall(false) < aus);
  setzeEffekte('quatsch'); assert.ok(ruheIntervall(false) === 50, 'unbekannt = voll');
});
