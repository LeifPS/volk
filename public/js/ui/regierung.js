// Regierungsfenster (Civ-6-artig, in Pixelart und Echtzeit): drei Reiter "Meine Regierung", "Politik ändern", "Regierung wechseln".
// Links die Regierungskarte (Grundbonus, Spezialeffekt, Plätze), in der Mitte die Kartenplätze nach Kategorie
// (Militär rot, Wirtschaft gold, Diplomatie grün, Joker violett), rechts der Kartenpool mit Filter und "Alle zuweisen".
// Bedienung ohne Ziehen: Karte antippen, dann einen Platz antippen (oder umgekehrt). Auf dem Handy stehen die Teile untereinander.
import { el as basisEl, symbol, fenster, toast, fehler, frageJaNein, dauerText } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, serverJetzt } from '../kern/zustand.js';
import { befehl } from '../kern/netz.js';
import { REGIERUNGEN, REGIERUNG, POLITIKKARTEN, POLITIKKARTE, CIVICS } from '../../shared/daten/index.js';
import { ton } from '../audio.js';

const RT = () => T.regierung;
const KAT = ['militaer', 'wirtschaft', 'diplomatie', 'joker'];
const KAT_FARBE = { militaer: '#a8402e', wirtschaft: '#b8901e', diplomatie: '#2f8a52', joker: '#7b4fb0' };

function el(tag, attr, ...kinder) {
  if (attr && (attr instanceof Node || typeof attr === 'string' || Array.isArray(attr))) { kinder.unshift(attr); attr = {}; }
  return basisEl(tag, attr || {}, ...kinder.flat().filter((k) => k != null && k !== false));
}

let cssDa = false;
function css() {
  if (cssDa) return; cssDa = true;
  document.head.append(el('style', { text: `
.rg-raster { display: grid; grid-template-columns: 240px minmax(240px, 1fr) minmax(260px, 1.3fr); gap: 10px; align-items: start; }
@media (max-width: 900px) { .rg-raster { grid-template-columns: 1fr; } }
.rg-regierung { background: #23283a; border: 2px solid #c8a84a; padding: 8px; }
.rg-regierung h2 { margin: 0 0 6px; color: #f1d27a; font-size: 15px; }
.rg-kat { border: 2px solid; padding: 6px; margin-bottom: 8px; background: #1d2130; }
.rg-kat h3 { margin: 0 0 6px; font-size: 13px; display: flex; gap: 6px; align-items: center; }
.rg-plaetze { display: flex; flex-wrap: wrap; gap: 6px; }
.rg-platz { min-width: 120px; min-height: 64px; flex: 1 1 120px; border: 2px dashed #556; padding: 4px; cursor: pointer; background: #262b3d; }
.rg-platz.ziel { border-color: #ffe066; background: #3a3524; }
.rg-karte { border: 2px solid; padding: 5px 6px; background: #2b3044; cursor: pointer; min-height: 60px; }
.rg-karte b { display: block; font-size: 12px; margin-bottom: 3px; }
.rg-karte .klein { font-size: 11px; line-height: 1.25; }
.rg-karte.gewaehlt { outline: 3px solid #ffe066; }
.rg-karte.belegt { opacity: 0.45; }
.rg-pool { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; max-height: 60vh; overflow: auto; }
.rg-filter { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.rg-regliste { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
.rg-regliste .rg-regierung.aus { opacity: 0.5; border-color: #556; }
` }));
}

function kartenEl(c, o = {}) {
  return el('div.rg-karte' + (o.gewaehlt ? '.gewaehlt' : '') + (o.belegt ? '.belegt' : ''), { style: { borderColor: KAT_FARBE[c.kategorie] }, onclick: o.onclick, tip: c.text, role: 'button' },
    el('b', { text: c.name }), el('div.klein', { text: c.text }));
}

function regierungEl(r, o = {}) {
  const p = r.plaetze || {};
  return el('div.rg-regierung' + (o.aus ? '.aus' : ''), { onclick: o.onclick || null, role: o.onclick ? 'button' : null },
    el('h2', symbol('ui', 'krone', { px: 18 }), ' ', r.name),
    el('div.klein', { text: r.beschreibung }),
    el('div', { style: { margin: '6px 0' } }, KAT.map((k) => (p[k] ? el('span.klein', { style: { color: KAT_FARBE[k], marginRight: '8px' }, text: `${p[k]} × ${RT().kat[k]}` }) : null))),
    el('div.gruen-t.klein', { text: RT().grundbonus + ': ' + wirkungText(r.bonus) }),
    r.spezial ? el('div.gold-t.klein', { text: RT().spezial + ': ' + (r.spezial.text || wirkungText(r.spezial.wirkung)) }) : null,
  );
}
function wirkungText(w = {}) { const t = T.baum?.bonus || {}; return Object.entries(w).map(([k, x]) => (t[k] ? t[k](x) : `${k} ${x > 0 ? '+' : ''}${x}`)).join(', ') || '–'; }

const freiKarten = () => { const e = du()?.civics?.erforscht || {}; const ids = new Set(); for (const c of CIVICS) if (e[c.id]) for (const x of c.freischaltet) if (x.art === 'politikkarte') ids.add(x.id); return POLITIKKARTEN.filter((k) => ids.has(k.id)); };
const freiRegierungen = () => { const e = du()?.civics?.erforscht || {}; const ids = new Set(); for (const c of CIVICS) if (e[c.id]) for (const x of c.freischaltet) if (x.art === 'regierung') ids.add(x.id); return ids; };

let offen = null;
export function oeffneRegierung(reiter = 'meine') {
  css();
  if (offen) { offen.reiter = reiter; offen.zeichne(); return; }
  const z = { reiter, filter: 'alle', auswahl: null, entwurf: null };
  const f = fenster(RT().titel, (i) => { z.inhalt = i; }, { breite: 'voll', fuss: true, beiSchliessen: () => { offen = null; } });
  offen = z;
  z.zeichne = () => zeichne(z, f);
  const ab = an('aenderung', () => { if (offen === z && !z.entwurf) z.zeichne(); });
  f.o.beiSchliessen = () => { offen = null; ab?.(); };
  z.zeichne();
}

function zeichne(z, f) {
  const d = du(); if (!d) return;
  const reg = REGIERUNG[d.regierung?.id];
  const reiter = el('div.reiter', ['meine', 'politik', 'wechseln'].map((r) => el('button.knopf' + (z.reiter === r ? '.gold' : ''), { onclick: () => { z.reiter = r; z.zeichne(); } }, RT().reiter[r])));
  const teile = [reiter];
  const jetzt = serverJetzt();
  if (d.regierung?.uebergang_bis > jetzt) teile.push(el('div.st-hinweis', symbol('ui', 'uhr', { px: 20 }), el('span', { text: RT().uebergang(dauerText(d.regierung.uebergang_bis - jetzt)) })));
  if (!reg) { teile.push(el('p', { text: RT().keine })); z.reiter = 'wechseln'; }
  if (z.reiter === 'wechseln') teile.push(wechseln(z, d));
  else if (reg) teile.push(politik(z, d, reg, z.reiter === 'meine'));
  z.inhalt.replaceChildren(...teile);
  f.fuss.replaceChildren(...[
    el('span.klein', { style: { flex: 1 }, text: d.freier_tausch ? RT().tauschFrei : RT().tauschKosten }),
    z.entwurf ? el('button.knopf', { onclick: () => { z.entwurf = null; z.auswahl = null; z.zeichne(); } }, RT().verwerfen) : null,
    z.entwurf ? el('button.knopf.gold', { onclick: () => uebernehmen(z) }, symbol('ui', 'haken'), RT().uebernehmen) : null,
  ].filter(Boolean));
}

function politik(z, d, reg, nurAnsicht) {
  const belegt = z.entwurf || d.karten || {};
  const p = reg.plaetze || {};
  const alle = KAT.flatMap((k) => belegt[k] || []);
  const plaetzeEl = el('div', KAT.filter((k) => p[k]).map((k) => el('div.rg-kat', { style: { borderColor: KAT_FARBE[k] } },
    el('h3', { style: { color: KAT_FARBE[k] } }, RT().kat[k], el('span.klein', { text: ` (${(belegt[k] || []).length}/${p[k]})` })),
    el('div.rg-plaetze', Array.from({ length: p[k] }, (_, n) => {
      const id = (belegt[k] || [])[n];
      const c = POLITIKKARTE[id];
      const istZiel = z.auswahl && (k === 'joker' || POLITIKKARTE[z.auswahl]?.kategorie === k);
      return el('div.rg-platz' + (istZiel && !nurAnsicht ? '.ziel' : ''), { onclick: nurAnsicht ? null : () => platzTippen(z, d, k, n) },
        c ? kartenEl(c) : el('div.klein', { text: RT().leer }));
    })))));
  const links = regierungEl(reg);
  if (nurAnsicht) return el('div.rg-raster', links, plaetzeEl, el('div', el('p.klein', { text: RT().anleitung }), el('button.knopf.gold', { onclick: () => { z.reiter = 'politik'; z.zeichne(); } }, symbol('ui', 'bau'), RT().reiter.politik)));
  const pool = freiKarten().filter((c) => z.filter === 'alle' || c.kategorie === z.filter);
  const rechts = el('div',
    el('div.rg-filter', ['alle', ...KAT].map((k) => el('button.knopf.klein' + (z.filter === k ? '.gold' : ''), { onclick: () => { z.filter = k; z.zeichne(); } }, k === 'alle' ? RT().alle : RT().kat[k]))),
    pool.length ? el('div.rg-pool', pool.map((c) => kartenEl(c, { gewaehlt: z.auswahl === c.id, belegt: alle.includes(c.id), onclick: () => { z.auswahl = z.auswahl === c.id ? null : c.id; z.zeichne(); } }))) : el('p.klein', { text: RT().keineKarten }),
    el('button.knopf.gold', { style: { marginTop: '8px' }, onclick: () => alleZuweisen(z, d, reg) }, symbol('ui', 'stern_voll'), RT().alleZuweisen),
  );
  return el('div.rg-raster', links, plaetzeEl, rechts);
}

function entwurf(z, d) { if (!z.entwurf) z.entwurf = Object.fromEntries(KAT.map((k) => [k, [...(d.karten?.[k] || [])]])); return z.entwurf; }
function platzTippen(z, d, k, n) {
  const e = entwurf(z, d);
  const p = REGIERUNG[d.regierung.id].plaetze;
  e[k] = e[k] || [];
  if (!z.auswahl) { if (e[k][n]) { e[k].splice(n, 1); z.zeichne(); } return; } // ohne Auswahl: Karte vom Platz nehmen
  const c = POLITIKKARTE[z.auswahl];
  if (k !== 'joker' && c.kategorie !== k) { fehler(RT().passtNicht(c.name, RT().kat[k])); return; }
  for (const kk of KAT) e[kk] = (e[kk] || []).filter((x) => x !== c.id); // eine Karte nur einmal
  if (n < e[k].length) e[k][n] = c.id; else if (e[k].length < p[k]) e[k].push(c.id);
  z.auswahl = null; ton('klick'); z.zeichne();
}
function alleZuweisen(z, d, reg) {
  const p = reg.plaetze, frei = freiKarten();
  const wert = (c) => Object.values(c.wirkung || {}).reduce((a, x) => a + Math.abs(x), 0);
  frei.sort((a, b) => wert(b) - wert(a));
  const e = { militaer: [], wirtschaft: [], diplomatie: [], joker: [] }, genutzt = new Set();
  for (const k of ['militaer', 'wirtschaft', 'diplomatie']) for (const c of frei) { if (e[k].length >= (p[k] || 0)) break; if (c.kategorie === k && !genutzt.has(c.id)) { e[k].push(c.id); genutzt.add(c.id); } }
  for (const c of frei) { if (e.joker.length >= (p.joker || 0)) break; if (!genutzt.has(c.id)) { e.joker.push(c.id); genutzt.add(c.id); } }
  z.entwurf = e; z.zeichne();
}
async function uebernehmen(z) {
  const r = await befehl({ art: 'karten', karten: z.entwurf });
  if (!r.ok) { fehler(r.fehler); ton('fehler'); return; }
  toast(r.gold ? RT().gesetztGold(r.gold) : RT().gesetzt, 'erfolg'); ton('bau');
  z.entwurf = null; z.auswahl = null; z.zeichne();
}

function wechseln(z, d) {
  const frei = freiRegierungen();
  return el('div',
    el('p.klein', { text: RT().wechselText }),
    el('div.rg-regliste', REGIERUNGEN.map((r) => regierungEl(r, {
      aus: !frei.has(r.id),
      onclick: async () => {
        if (!frei.has(r.id)) { fehler(RT().nochNicht); return; }
        if (d.regierung?.id === r.id) return;
        if (d.regierung && !(await frageJaNein(RT().wechselTitel, RT().wechselFrage(r.name), RT().wechseln))) return;
        const x = await befehl({ art: 'regierung', id: r.id });
        if (!x.ok) { fehler(x.fehler); return; }
        ton('zeitalter'); toast(RT().gewechselt(r.name), 'erfolg'); z.reiter = 'politik'; z.zeichne();
      },
    }))),
  );
}
