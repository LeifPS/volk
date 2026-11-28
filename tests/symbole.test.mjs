// Bannersymbole: jede Einheit hat ein eigenes, gültiges 13×13-Symbol; keine zwei gleich (auch nicht gespiegelt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EINHEITEN } from '../public/shared/daten/index.js';
import { EINHEIT_SYMBOL, SYMBOL_GROESSE } from '../public/js/grafik/einheiten_symbole.js';

test('Jede Einheit hat ein Bannersymbol im richtigen Format', () => {
  assert.deepEqual(EINHEITEN.filter((e) => !EINHEIT_SYMBOL[e.id]).map((e) => e.id), [], 'ohne Symbol');
  const ids = new Set(EINHEITEN.map((e) => e.id));
  assert.deepEqual(Object.keys(EINHEIT_SYMBOL).filter((k) => !ids.has(k)), [], 'Symbole ohne Einheit');
  for (const [id, m] of Object.entries(EINHEIT_SYMBOL)) {
    assert.equal(m.length, SYMBOL_GROESSE, id);
    for (const z of m) assert.match(z, new RegExp(`^[.#+-]{${SYMBOL_GROESSE}}$`), id);
    const n = m.join('').replace(/\./g, '').length;
    assert.ok(n >= 14 && n <= 120, `${id}: ${n} Pixel`);
  }
});

test('Keine zwei Einheiten teilen sich ein Symbol (auch nicht gespiegelt)', () => {
  const norm = (m) => m.join('/');
  const spiegelH = (m) => m.map((z) => [...z].reverse().join(''));
  const spiegelV = (m) => [...m].reverse();
  const gesehen = new Map();
  for (const [id, m] of Object.entries(EINHEIT_SYMBOL)) {
    for (const v of [m, spiegelH(m), spiegelV(m), spiegelV(spiegelH(m))]) {
      const k = norm(v);
      assert.ok(!gesehen.has(k) || gesehen.get(k) === id, `${id} gleicht ${gesehen.get(k)}`);
    }
    gesehen.set(norm(m), id);
  }
});
