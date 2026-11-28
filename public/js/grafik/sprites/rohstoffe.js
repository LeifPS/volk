// Rohstoff-Symbole (16x16). Auf der Karte und in der Oberfläche. Licht von oben links.
// Die Zeichenfunktionen werden auch von ui.js (Lagergüter) wiederverwendet.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische } from '../pixel.js';

// ---------- Hilfen ----------
/** Spiegelt die linke Hälfte (x < w/2) auf die rechte. */
export function sym(p) {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w / 2; x++) p.feld[y * p.w + (p.w - 1 - x)] = p.feld[y * p.w + x];
  return p;
}
/** Dicke quadratische Bézierkurve, Radius läuft von r0 nach r1. */
export function bez(p, a, b, c, r0, r1, col) {
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], y = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1];
    const r = r0 + (r1 - r0) * t;
    if (r < 0.3) p.px(x, y, col); else p.kreis(x, y, r, col);
  }
  return p;
}
/** Färbt deckende Pixel einer Farbe um (z. B. für Glanzlichter). */
export function ersetze(p, alt, neu) { for (let i = 0; i < p.feld.length; i++) if (p.feld[i] === alt) p.feld[i] = neu; return p; }
/** Glanzlicht oben links: Pixel mit leerem Nachbarn oben oder links werden heller (nur Farbe f). */
export function glanz(p, f, t = 0.35) {
  const g = p.feld.slice();
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (g[y * p.w + x] !== f) continue;
    const o = y > 0 ? g[(y - 1) * p.w + x] : null, l = x > 0 ? g[y * p.w + x - 1] : null;
    const u = y < p.h - 1 ? g[(y + 1) * p.w + x] : null, r = x < p.w - 1 ? g[y * p.w + x + 1] : null;
    if (o !== f || l !== f) p.feld[y * p.w + x] = hell(f, t);
    else if (u !== f || r !== f) p.feld[y * p.w + x] = dunkel(f, t * 0.8);
  }
  return p;
}

/** Leert den äußersten Pixelrand (Platz für den Umriss); Umriss-Pixel bleiben auf Wunsch stehen. */
export function rand(p, ausser) {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (x > 0 && y > 0 && x < p.w - 1 && y < p.h - 1) continue;
    const i = y * p.w + x; if (p.feld[i] && p.feld[i] !== ausser) p.feld[i] = null;
  }
  return p;
}

// ---------- Gemeinsame Formen (auch für ui.js) ----------
export const FORM = {};

FORM.weizen = (p) => p.karte(0, 0, [
  '................',
  '....Y...Y...Y...',
  '...YyY.YyY.YyY..',
  '...yYy.yYy.yYy..',
  '...YyY.YyY.YyY..',
  '...yYy.yYy.yYy..',
  '....yy.YyY.yy...',
  '.....g.yYy.g....',
  '......g.g.g.....',
  '.......ggg......',
  '......bBBBb.....',
  '.......ggg......',
  '......g.g.g.....',
  '.....g..g..g....',
  '....g...g...g...',
  '................',
], { Y: '#ffd95a', y: '#d9a21b', g: '#b59a2a', b: '#8a5a2b', B: '#c0392b' });

FORM.reis = (p) => p.karte(0, 0, [
  '................',
  '................',
  '......w..w......',
  '....wWwWwwWw....',
  '...WwwWwwWwwW...',
  '..wWwWwwwWwWww..',
  '..WwwwWwWwwwWw..',
  '.RRRRRRRRRRRRRR.',
  '.rHHRRRRRRRRRRr.',
  '..rRRRgRRgRRRr..',
  '...rRRRRRRRRr...',
  '....rrrrrrrr....',
  '......dddd......',
  '.....dddddd.....',
  '................',
  '................',
], { w: '#f4f1ea', W: '#d8d2c2', R: '#c0392b', r: '#86392a', H: '#e8705a', g: '#f1c40f', d: '#5a3a1a' });

FORM.mais = (p) => p.karte(0, 0, [
  '................',
  '.......YY.......',
  '......YyYY......',
  '......yYyY......',
  '.....gYyYyg.....',
  '.....gyYyYg.....',
  '....gGYyYyGg....',
  '....gGyYyYGg....',
  '...gGgYyYyGgg...',
  '...gG.yYyY.Gg...',
  '..gG..GyYG..Gg..',
  '..g...GGGG...g..',
  '.......GG.......',
  '.......gg.......',
  '.......gg.......',
  '................',
], { Y: '#ffd23a', y: '#e09a12', g: '#3d7f38', G: '#6cbf4a' });

FORM.fisch = (p) => p.karte(0, 0, [
  '................',
  '................',
  '................',
  '......fff.......',
  '.....ffffff.....',
  '...BBBBBBBBB..f.',
  '..BBwBBsBsBBBff.',
  '.BBkkBBsBsBBBff.',
  '.BBBBBBsBsBBffF.',
  '..LLLLLLLLLLLFF.',
  '...LLLLLLLLL.FF.',
  '.....LLLFF....F.',
  '.......FF.......',
  '................',
  '................',
  '................',
], { B: '#3a8fd0', s: '#2c6ea8', w: '#ffffff', k: '#1a1a1a', L: '#c8e6f5', f: '#2c6ea8', F: '#1f4f80' });

FORM.wild = (p) => {
  p.karte(0, 0, [
    '........',
    '.a..a...',
    '.a..a...',
    '.aa.a...',
    '..aaa...',
    '...aaa..',
    '....aa..',
    '.....a..',
    '..EEhhhh',
    '...Eehhh',
    '....hhkh',
    '.....hhh',
    '.....nhh',
    '......nn',
    '......nk',
    '........',
  ], { a: '#e8d3a8', h: '#a0662f', e: '#e7a98a', E: '#7a4a20', k: '#22201e', n: '#d9b48a' });
  sym(p);
  p.px(1, 1, '#fff2d0').px(4, 1, '#fff2d0');
};

FORM.rinder = (p) => {
  p.karte(0, 0, [
    '........',
    '........',
    '.H......',
    '.Hh.....',
    '..hhBBBB',
    '.EEBBBWW',
    'EEEBBBWW',
    '..BBkBWW',
    '...BBBWW',
    '...BBBBW',
    '...BpppP',
    '..pppppp',
    '..ppnppp',
    '...ppppp',
    '....pppp',
    '........',
  ], { H: '#f4f1ea', h: '#d6cdb8', B: '#7a4524', W: '#f4f1ea', E: '#5a3018', k: '#1a1a1a', p: '#f0a3a0', P: '#f0a3a0', n: '#a24e52' });
  sym(p);
  p.px(4, 5, '#9a5c34').px(4, 4, '#9a5c34');
};

FORM.schafe = (p) => p.karte(0, 0, [
  '................',
  '................',
  '................',
  '....W.WW.W......',
  '...WwWwwWwW.....',
  '..WwwwwwwwwW.E..',
  '.Wwwwwwwwwwkkkk.',
  '..wwwwwwwwwkekE.',
  '.wwwwwwwwwwkkkk.',
  '..wwwwwwwwwwkkk.',
  '...dwdwwdwd.....',
  '...k.k..k.k.....',
  '...k.k..k.k.....',
  '...k.k..k.k.....',
  '................',
  '................',
], { W: '#ffffff', w: '#e9e2d0', d: '#bfb59c', k: '#5a4a40', E: '#3e322b', e: '#1a1a1a' });

FORM.bananen = (p) => {
  const Y = '#ffd83a', y = '#d9a017';
  bez(p, [12, 3], [12, 13], [3, 12], 1.3, 0.5, y);
  bez(p, [12, 3], [10, 11], [2, 8], 1.3, 0.5, Y);
  bez(p, [12, 3], [7, 8], [3, 4], 1.2, 0.5, Y);
  bez(p, [12, 3], [7, 8], [3, 4], 0.3, 0, '#fff0a0');
  p.linie(4, 9, 9, 9, y);
  p.px(3, 12, '#5a3a1a').px(2, 8, '#5a3a1a').px(3, 4, '#5a3a1a');
  p.rect(12, 1, 2, 3, '#6b8a2a').px(12, 1, '#8ab03a');
};

FORM.wale = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '.TT.........TT..',
    '.TTTt.....tTTT..',
    '..TTTTt.tTTTT...',
    '...tTTTTTTTt....',
    '.....tTTTt......',
    '......TTT.......',
    '......TTT.......',
    '......tTT.......',
    '......tTT.......',
    '..ww.wwwwww.ww..',
    '.wWWwWWwwWWwWWw.',
    '.WWWWWWWWWWWWWW.',
    '..WWWWWWWWWWWW..',
    '................',
  ], { T: '#34507a', t: '#22385a', w: '#ffffff', W: '#3d7fc4' });
  p.px(2, 2, '#5a78a8').px(1, 2, '#5a78a8').px(12, 2, '#5a78a8');
  p.px(3, 13, '#8fc0ee').px(9, 13, '#8fc0ee');
};

FORM.muscheln = (p) => {
  const O = '#f39260', H = '#ffd0a8', D = '#c8603a';
  p.ellipse(8, 7.5, 6.5, 5.5, O);
  p.rect(1, 11, 14, 3, 'leer');
  p.poly([[2, 9], [14, 9], [11, 12], [5, 12]], O);
  for (const x of [2, 5, 8, 11, 14]) p.linie(8, 13, x * 1 + (x < 8 ? 0 : 0), 3 + Math.abs(x - 8) * 0.6, D);
  for (const x of [3.5, 6.5, 9.5, 12.5]) p.linie(8, 12, x, 3 + Math.abs(x - 8) * 0.6, H);
  p.rect(5, 12, 6, 2, '#d06a40').rect(6, 12, 4, 1, '#e88a5a').px(4, 13, '#d06a40').px(11, 13, '#d06a40');
  p.px(4, 4, '#fff0e0').px(5, 3, '#fff0e0');
};
FORM.muscheln_alt = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '.......oo.......',
    '.....oOoOoo.....',
    '....oOoOoOoo....',
    '...oOoOoOoOoo...',
    '..oOoOoOoOoOoo..',
    '..OoOoOoOoOoOo..',
    '..oOoOoOoOoOoo..',
    '...oOoOoOoOoo...',
    '....ooOoOoOo....',
    '.....rrrrrr.....',
    '....rr....rr....',
    '................',
    '................',
  ], { o: '#f39260', O: '#ffd0a8', r: '#d06a40' });
};

FORM.datteln = (p) => {
  // Palmwedel
  bez(p, [8, 4], [3, 1], [1, 5], 0.6, 0, '#3d8f3a');
  bez(p, [8, 4], [13, 1], [14, 5], 0.6, 0, '#3d8f3a');
  bez(p, [8, 4], [8, 1], [9, 1], 0.5, 0, '#5ab04a');
  p.linie(8, 4, 8, 7, '#8a5a2b');
  // Dattelrispe
  const D = '#9a4a1e';
  for (const [x, y] of [[5, 8], [7, 8], [9, 8], [11, 8], [4, 10], [6, 10], [8, 10], [10, 10], [12, 10], [5, 12], [7, 12], [9, 12], [11, 12], [8, 14]]) p.ellipse(x, y, 0.6, 1, D);
  for (const [x, y] of [[5, 8], [7, 8], [9, 8], [11, 8], [4, 10], [6, 10], [8, 10], [10, 10], [12, 10], [5, 12], [7, 12], [9, 12], [11, 12], [8, 14]]) p.px(x, y - 1, '#d07a3a');
  p.linie(8, 7, 5, 8, '#c8a050').linie(8, 7, 11, 8, '#c8a050');
};

FORM.hirse = (p) => {
  bez(p, [4, 15], [5, 7], [9, 3], 0.4, 0.3, '#9a8a3a');
  bez(p, [11, 14], [11, 8], [13, 5], 0.4, 0.3, '#9a8a3a');
  const H = '#d9732a';
  for (const [x, y, r] of [[10, 3, 1.4], [11, 5, 1.6], [12, 7, 1.5], [12.5, 9, 1.2], [13, 10.5, 0.8]]) p.kreis(x, y, r, H);
  for (const [x, y, r] of [[13, 5, 1.2], [13.5, 7, 1.0]]) p.kreis(x, y, r, H);
  glanz(p, H, 0.35);
  p.px(10, 2, '#ffd08a').px(11, 4, '#ffd08a').px(12, 6, '#ffd08a');
  p.ellipse(3, 9, 0.6, 2, '#6aa83a').ellipse(6, 11, 0.6, 2, '#6aa83a');
  p.px(13, 12, '#a04818').px(12, 11, '#a04818');
};

FORM.elefanten = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '..EEE...........',
    '.EeeEE..GGGG....',
    '.EeeeEGGgGGGG...',
    '.EeeeEGGGGGGG...',
    '.EeeeEGGkGGGG...',
    '.EeeEEGGGGGGG...',
    '..EEEE.GGGGG....',
    '.......wGGGw....',
    '......w.GGG.w...',
    '.........GG.....',
    '.........GG.....',
    '..........GG....',
    '...........g....',
    '................',
  ], { E: '#7d8790', e: '#c5a0a0', G: '#9aa3ab', g: '#6b737a', k: '#1a1a1a', w: '#f6f0dc' });
  sym(p);
  // Rüssel mittig neu
  p.rect(6, 9, 4, 1, '#9aa3ab').rect(7, 10, 2, 4, '#9aa3ab').rect(6, 13, 1, 1, '#9aa3ab').px(9, 10, '#7d8790').px(9, 11, '#7d8790').px(9, 12, '#7d8790');
  p.px(5, 9, '#f6f0dc').px(4, 10, '#f6f0dc').px(10, 9, '#f6f0dc').px(11, 10, '#f6f0dc');
  p.rect(6, 3, 2, 1, '#b8c0c7');
};

FORM.pilze = (p) => {
  // Lichtschein
  for (const [x, y] of [[2, 2], [13, 3], [1, 8], [14, 9], [4, 0], [11, 1]]) p.px(x, y, '#b6fff0');
  p.karte(0, 0, [
    '................',
    '................',
    '.....CCCCC......',
    '...CCcCCCcCC....',
    '..CcCCCCCCCCC...',
    '..CCCCcCCCcCC...',
    '..dddddddddd....',
    '......SS...cCCc.',
    '......SS..CCcCCC',
    '......Ss..dddddd',
    '.....SSS....SS..',
    '.....SSs....Ss..',
    '....SSSSs..SSSs.',
    '................',
    '................',
    '................',
  ], { C: '#36d6c4', c: '#e9fffa', d: '#1f7f86', S: '#e4dcc8', s: '#a89f88' });
  p.px(15, 8, 'leer');
  p.feld[8 * 16 + 15] = null; p.feld[9 * 16 + 15] = null;
  p.px(14, 8, '#36d6c4').px(14, 9, '#1f7f86');
};

FORM.holz = (p) => {
  // liegender Stamm, Schnittfläche vorn links
  p.rect(5, 5, 9, 7, '#8a5a2b');
  p.rect(5, 5, 9, 1, '#a8733c').rect(5, 11, 9, 1, '#5a3a1a');
  for (const x of [7, 10, 12]) p.px(x, 7, '#6b4420').px(x + 1, 9, '#6b4420');
  p.ellipse(5, 8, 3, 3.5, '#5a3a1a');
  p.ellipse(5, 8, 2.4, 3, '#e2b878');
  p.ellipse(5, 8, 1.4, 2, '#c8955a');
  p.ellipse(5, 8, 0.6, 1, '#e2b878');
  p.px(5, 8, '#8a5a2b');
  // Ast
  p.rect(9, 3, 1, 2, '#8a5a2b').rect(10, 2, 2, 1, '#3d7f38').rect(9, 1, 1, 1, '#5aa84f');
  p.rect(3, 12, 11, 1, 'leer');
};

FORM.stein = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '......LLLLLL....',
    '....LLLLLLLLLl..',
    '...LLLLLLLLLlS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSS..',
    '..TTTTDTTTTSSS..',
    '..TTTDTTTTTSSS..',
    '..TTTTTTTDTSSS..',
    '..TTTTTTTTTSSs..',
    '..TTTTTTTTTSs...',
    '..TTTTTTTTTs....',
    '................',
    '................',
    '................',
  ], { L: '#d6d2c8', l: '#b8b3a8', T: '#a9a49a', D: '#7a756c', S: '#7a756c', s: '#655f57' });
  p.px(6, 3, '#ecebe4').px(9, 2, '#ecebe4');
};

FORM.marmor = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '......LLLLLL....',
    '....LLLLLLLLLl..',
    '...LLLLLLLLLlS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSS..',
    '..TTTTTTTTTSSs..',
    '..TTTTTTTTTSs...',
    '..TTTTTTTTTs....',
    '................',
    '................',
    '................',
  ], { L: '#ffffff', l: '#e9eef3', T: '#f2f2ee', S: '#c9d0d8', s: '#aab3bd' });
  const A = '#8d9aaa';
  p.linie(3, 6, 6, 9, A).linie(6, 9, 7, 12, A).linie(6, 9, 9, 7, A).linie(9, 7, 11, 8, A).linie(5, 3, 8, 4, '#b8c2cc').linie(11, 6, 13, 9, '#9aa6b3');
};

FORM.salz = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '.......WW.......',
    '......WWWw......',
    '.....WWWWww.....',
    '....WWWWWwwr....',
    '....WWWpWwwr....',
    '...WWWWWWwwrr...',
    '...WWWWWWWwwr...',
    '..WWWpWWWWwwrr..',
    '..WWWWWWWWWwwr..',
    '.WWWWWWWpWWWwrr.',
    '.rrrrrrrrrrrrrr.',
    '................',
    '................',
  ], { W: '#ffffff', w: '#e6e3ea', r: '#c3bccb', p: '#f2c8cc' });
  p.px(5, 8, '#dfe8ff').px(9, 5, '#dfe8ff');
  for (const [x, y] of [[2, 4], [13, 3], [12, 7]]) { p.px(x, y, '#ffffff'); }
  p.px(2, 3, '#bfe4ff').px(2, 5, '#bfe4ff').px(1, 4, '#bfe4ff').px(3, 4, '#bfe4ff');
};

FORM.lehm = (p) => {
  const Z = '#c87443', z = '#9a5230', h = '#e39a64';
  const ziegel = (x, y) => { p.rect(x, y, 6, 3, Z).rect(x, y, 6, 1, h).rect(x, y + 2, 6, 1, z).px(x + 5, y + 1, z); };
  ziegel(1, 10); ziegel(8, 10); ziegel(4, 6); ziegel(11, 6);
  ziegel(7, 2);
  p.rect(13, 6, 4, 3, 'leer');
  p.rect(11, 6, 3, 3, Z).rect(11, 6, 3, 1, h).rect(11, 8, 3, 1, z);
  p.rect(1, 13, 14, 1, '#7a4426');
  p.px(3, 11, '#b06038').px(10, 11, '#b06038').px(6, 7, '#b06038');
};

function erz(p, farbe, hoch, tief, stein = '#6f6a62') {
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '.....SSSSS......',
    '...SSSSSSSSS....',
    '..SSSSSSSSSSSS..',
    '..SSSSSSSSSSSSs.',
    '.SSSSSSSSSSSSSs.',
    '.SSSSSSSSSSSSss.',
    '.SSSSSSSSSSSSss.',
    '..SSSSSSSSSSss..',
    '...ssSSSSSsss...',
    '.....ssssss.....',
    '................',
    '................',
    '................',
  ], { S: stein, s: dunkel(stein, 0.3) });
  p.rect(4, 4, 4, 1, hell(stein, 0.25)).rect(3, 5, 2, 1, hell(stein, 0.25));
  const brocken = [[4, 6, 1.6], [9, 5, 1.4], [11, 9, 1.5], [6, 10, 1.2], [8, 8, 0.9]];
  for (const [x, y, r] of brocken) p.kreis(x, y, r, farbe);
  for (const [x, y, r] of brocken) { p.px(x - 1, y - 1, hoch); if (r > 1.3) p.px(x - 1, y - 1 + 1, hoch).px(x, y - 1, hoch); p.px(x + 1, y + 1, tief); }
}
FORM.kupfer = (p) => { erz(p, '#e07a2e', '#ffc07a', '#9a4a14'); p.px(12, 6, '#3fbf8f').px(3, 9, '#3fbf8f').px(7, 4, '#3fbf8f'); };
FORM.zinn = (p) => { erz(p, '#b8c4d0', '#ffffff', '#7a8896', '#5a5048'); };

function barren(p, x, y, oben, seite, front, glanzF) {
  // trapezförmiger Barren, 10 breit
  p.poly([[x + 2, y], [x + 9, y], [x + 11, y + 4], [x, y + 4]], front);
  p.rect(x + 2, y, 8, 1, oben).rect(x + 1, y + 1, 10, 1, oben);
  p.rect(x + 2, y + 2, 7, 1, front);
  p.rect(x + 9, y + 2, 2, 3, seite).px(x + 9, y + 1, seite);
  p.rect(x, y + 4, 12, 1, dunkel(front, 0.3));
  if (glanzF) p.rect(x + 3, y, 3, 1, glanzF);
}
FORM.eisen = (p) => {
  barren(p, 1, 8, '#9aa3ad', '#4c535c', '#6e7781', '#c8d0d8');
  barren(p, 3, 3, '#9aa3ad', '#4c535c', '#6e7781', '#c8d0d8');
  p.px(13, 4, '#ffffff');
};
FORM.silber = (p) => {
  barren(p, 2, 6, '#ffffff', '#9aa6b4', '#d4dce6', '#ffffff');
  barren(p, 2, 10, '#eef2f7', '#8a96a4', '#c2ccd8', null);
  p.px(13, 2, '#ffffff').px(12, 3, '#ffffff').px(14, 3, '#ffffff').px(13, 4, '#ffffff').px(13, 3, '#e8f4ff');
  p.px(3, 3, '#ffffff');
};
FORM.aluminium = (p) => {
  // Profil-Stangen, hellblau-silbern
  const st = (y) => { p.rect(2, y, 12, 3, '#bcd6ea').rect(2, y, 12, 1, '#eaf6ff').rect(2, y + 2, 12, 1, '#86a8c4'); p.ellipse(13, y + 1, 1, 1, '#9cc0dc'); p.px(13, y + 1, '#5f86a8'); };
  st(10); st(6); st(2);
  p.rect(3, 13, 10, 1, 'leer');
};

FORM.pferde = (p) => p.karte(0, 0, [
  '................',
  '.......Ee.......',
  '.....MMEEe......',
  '....MMHHHHH.....',
  '...MMHHHHHHH....',
  '...MMHHkHHHHH...',
  '..MMMHHHHHHHHH..',
  '..MMHHHHH.HHHHh.',
  '..MMHHHH...HHHn.',
  '.MMHHHHH....hnn.',
  '.MMHHHHH........',
  '.MHHHHHH........',
  '.MHHHHHHH.......',
  '..HHHHHHH.......',
  '................',
  '................',
], { M: '#3a2416', H: '#9a5e2e', h: '#7a4520', E: '#9a5e2e', e: '#7a4520', k: '#1a1a1a', n: '#3a2416' });

FORM.salpeter = (p) => {
  p.ellipse(8, 12, 6, 2, '#6b5a48');
  p.rect(3, 11, 10, 1, '#857260');
  const K = '#f3eedc', k = '#cfc6a6', w = '#ffffff';
  const nadel = (x, y, h, l) => { p.rect(x, y, 2, h, K); p.rect(x + 1, y, 1, h, k); p.px(x, y, w); if (l) p.px(x + l, y - 1, K); };
  nadel(4, 6, 6); nadel(7, 3, 9); nadel(10, 5, 7); nadel(2, 9, 3); nadel(12, 8, 4);
  p.px(7, 2, w).px(8, 2, K).px(10, 4, K).px(4, 5, K);
  p.px(13, 4, '#ffffff').px(1, 6, '#ffffff');
};

FORM.kohle = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '......KKK.......',
    '....KKKKKKk.....',
    '...KkKKKKKKK....',
    '..KKKKKKKKKKKk..',
    '..KKKKgKKKKKKK..',
    '.KKKKKKKKKgKKKK.',
    '.KKKgKKKKKKKKKk.',
    '.kKKKKKKKKKKKkk.',
    '..kkKKKKKKKkkk..',
    '....kkkkkkk.....',
    '................',
    '................',
    '................',
  ], { K: '#2a2a30', k: '#141418', g: '#5a6a80' });
  p.px(6, 4, '#7d8aa0').px(5, 5, '#7d8aa0').px(4, 6, '#5a6a80').px(11, 7, '#7d8aa0').px(3, 8, '#4a5466');
};

FORM.oel = (p) => {
  // Fass
  p.rect(7, 6, 7, 8, '#3a5a7a').rect(7, 6, 1, 8, '#5a7a9a').rect(13, 6, 1, 8, '#24405a');
  p.rect(7, 8, 7, 1, '#24405a').rect(7, 11, 7, 1, '#24405a');
  p.ellipse(10, 5, 3, 1, '#5a7a9a').px(11, 5, '#24405a');
  // Tropfen
  p.karte(0, 0, [
    '................',
    '................',
    '....d...........',
    '....d...........',
    '...ddd..........',
    '...ddd..........',
    '..ddddd.........',
    '..dwdddd........',
    '.ddwdddd........',
    '.ddddddd........',
    '.dddddddd.......',
    '..ddddddd.......',
    '...ddddd........',
    '................',
    '................',
    '................',
  ], { d: '#15131c', w: '#8a8aa8' });
  p.px(4, 2, '#15131c');
  p.px(3, 10, '#4a4a68');
};

FORM.uran = (p) => {
  for (const [x, y] of [[1, 3], [14, 4], [2, 13], [13, 13], [8, 1], [1, 8], [14, 8]]) p.px(x, y, '#c8ff7a');
  p.karte(0, 0, [
    '................',
    '................',
    '.......G........',
    '......GgG.......',
    '.....GgGGG......',
    '....GgGGGGg.....',
    '...GgGGGGGGg....',
    '...GGGLGGGGg....',
    '..GGGGGLGGGGg...',
    '..GGGLLLLGGGg...',
    '..gGGGGGGGGgg...',
    '...gGGGGGGgg....',
    '....gggggg......',
    '................',
    '................',
    '................',
  ], { G: '#5ee03a', g: '#2f8f22', L: '#e8ff9a' });
  p.px(6, 4, '#e8ff9a').px(5, 5, '#e8ff9a');
};

FORM.wein = (p) => {
  // Blatt
  p.karte(0, 0, [
    '................',
    '.....gg.........',
    '...gGGgg.b......',
    '..gGGggg.b......',
    '...gggg.b.......',
    '.......bb.......',
  ], { g: '#3d7f38', G: '#6cbf4a', b: '#6b4420' });
  const T = '#7a2a8a';
  for (const [x, y] of [[6, 7], [9, 7], [12, 7], [5, 9], [8, 9], [11, 9], [6, 11], [9, 11], [8, 13], [7, 15 - 1]]) p.kreis(x, y, 1.2, T);
  for (const [x, y] of [[6, 7], [9, 7], [12, 7], [5, 9], [8, 9], [11, 9], [6, 11], [9, 11], [8, 13]]) { p.px(x - 1, y - 1, '#c27ad0'); p.px(x + 1, y + 1, '#4e1a5c'); }
  p.feld[14 * 16 + 7] = p.feld[14 * 16 + 7];
};

FORM.gewuerze = (p) => {
  // Jutesack mit Gewürzhaufen
  p.karte(0, 0, [
    '................',
    '................',
    '.....rORrO......',
    '....ROrOrROr....',
    '...rROrOrRrOr...',
    '..JjRrOrROrRjJ..',
    '..JJjjjjjjjjJJ..',
    '..JJJJJJJJJJJj..',
    '.JJJJJJJJJJJJjj.',
    '.JJJJJbJJJJJJjj.',
    '.JJJJJJJbJJJJjj.',
    '.JJJJJJJJJJJjjj.',
    '..JJJJJJJJJjjj..',
    '...jjjjjjjjjj...',
    '................',
    '................',
  ], { J: '#c9a46a', j: '#9a7a48', R: '#d83a1a', r: '#a82a14', O: '#f39c12', b: '#7a5a30' });
  p.rect(2, 7, 1, 2, '#e3c48c').rect(3, 8, 1, 2, '#e3c48c');
  p.px(13, 3, '#8a3a12').px(2, 3, '#f39c12');
};

FORM.seide = (p) => {
  // Stoffrolle mit wehendem Ende
  p.karte(0, 0, [
    '................',
    '................',
    '..PPPPPPPPP.....',
    '.PppppppppPP....',
    '.PpppppppppPo...',
    '.PpppppppppPo...',
    '.PpppppppppPo...',
    '.PPpppppppPPo...',
    '..PPPPPPPPPoQQ..',
    '.......QQqQQQQq.',
    '.....QQQqQQQq...',
    '...QQQqQQQq.....',
    '..QQqQQQq.......',
    '..qQQq..........',
    '................',
    '................',
  ], { P: '#d14a8a', p: '#e87ab0', o: '#a02a64', Q: '#f08ac0', q: '#c04a86' });
  p.ellipse(12, 5, 1, 3, '#a02a64').px(12, 5, '#f5c0d8');
  p.rect(2, 3, 6, 1, '#fbd0e4');
  p.rect(3, 4, 1, 3, '#fbd0e4');
};

FORM.weihrauch = (p) => {
  // Rauch
  bez(p, [8, 7], [5, 4], [8, 2], 0.5, 0.4, '#d9d2e8');
  bez(p, [8, 2], [10, 1], [9, 0], 0.4, 0, '#d9d2e8');
  bez(p, [9, 7], [12, 5], [11, 3], 0.3, 0, '#bfb6d6');
  // Gefäß
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....ggGGGGgg....',
    '...gGGGGGGGGg...',
    '..gGhGGGGGGGgd..',
    '..GGhGrGGrGGGd..',
    '..gGGGGGGGGGgd..',
    '...gGGGGGGGgd...',
    '.....dGGGd......',
    '....gGGGGGd.....',
    '....dddddddd....',
    '................',
  ], { g: '#c8930a', G: '#f1c40f', h: '#fff2a8', d: '#8a6a0a', r: '#c0392b' });
  p.rect(5, 6, 6, 1, '#f39c12').px(6, 6, '#ffde7a').px(8, 6, '#ff6a1a');
};

FORM.edelsteine = (p) => p.karte(0, 0, [
  '................',
  '................',
  '................',
  '....RRRRRRRR....',
  '...RwWRRRrRRR...',
  '..RWwRRRrRRRRr..',
  '.RRRRRRRRRRRRrr.',
  '.rrrrrrrrrrrrrr.',
  '..rRRRrrrrRRrr..',
  '...rRRRrrRRrr...',
  '....rRRRrRrr....',
  '.....rRRRrr.....',
  '......rRrr......',
  '.......rr.......',
  '................',
  '................',
], { R: '#e8344a', r: '#a01428', W: '#ffd0d8', w: '#ffffff' });

FORM.gold_erz = (p) => {
  const G = '#f1c40f';
  for (const [x, y, rx, ry] of [[5, 10, 3, 2.4], [10, 11, 3, 2], [8, 7, 2.6, 2.2], [12, 7, 1.6, 1.4], [3, 6, 1.4, 1.2]]) p.ellipse(x, y, rx, ry, G);
  glanz(p, G, 0.4);
  for (const [x, y] of [[4, 9], [7, 6], [9, 10], [11, 6]]) p.px(x, y, '#ffffff');
  p.px(13, 3, '#fff6c0').px(12, 3, '#fff6c0').px(13, 2, '#fff6c0').px(14, 3, '#fff6c0').px(13, 4, '#fff6c0');
};

FORM.zucker = (p) => {
  const st = (x, y0, c, d) => {
    p.rect(x, y0, 2, 14 - y0, c);
    p.rect(x + 1, y0, 1, 14 - y0, d);
    for (let y = y0 + 3; y < 14; y += 3) p.rect(x, y, 2, 1, '#e0d080');
  };
  st(4, 3, '#8ac04a', '#5a9030'); st(7, 1, '#9ad050', '#5a9030'); st(10, 4, '#8ac04a', '#5a9030');
  bez(p, [8, 2], [11, 0], [14, 2], 0.4, 0, '#3d8f3a');
  bez(p, [5, 4], [2, 2], [1, 4], 0.4, 0, '#3d8f3a');
  bez(p, [11, 5], [14, 6], [14, 8], 0.4, 0, '#3d8f3a');
  // Zuckerwürfel
  p.rect(11, 11, 3, 3, '#ffffff').rect(13, 11, 1, 3, '#d8d8e0').rect(11, 13, 3, 1, '#d8d8e0');
};

FORM.elfenbein = (p) => {
  const W = '#f4ecd2';
  bez(p, [3, 13], [2, 4], [12, 2], 1.6, 0.2, W);
  glanz(p, W, 0.25);
  p.rect(2, 12, 4, 2, '#c8a878').rect(2, 13, 4, 1, '#a08050');
  p.px(13, 2, 'leer');
};

FORM.pelze = (p) => p.karte(0, 0, [
  '................',
  '..F..........F..',
  '..FF..FFFF..FF..',
  '...FFFFFFFFFF...',
  '....FFfFFfFF....',
  '...FFFwwwwFFF...',
  '..FFFFwwwwFFFF..',
  '.FF.FFwwwwFF.FF.',
  '.F..FFFwwFFF..F.',
  '....FFFwwFFF....',
  '....FFFFFFFF....',
  '...FF.FFFF.FF...',
  '...F...FF...F...',
  '.......Ff.......',
  '........f.......',
  '................',
], { F: '#d9772a', f: '#8a4214', w: '#f6e6c8' });

FORM.perlen = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '...ssssssssss...',
    '..sSsSsSsSsSss..',
    '..SsSsSsSsSsSs..',
    '...sSsSsSsSss...',
    '....iiiiiiii....',
    '...iiiiiiiiii...',
    '..iiiiiiiiiiii..',
    '.SSiiiiiiiiiiSS.',
    '.sSsSsSsSsSsSss.',
    '..sSsSsSsSsSss..',
    '...ssssssssss...',
    '................',
    '................',
    '................',
  ], { s: '#5a6e8a', S: '#8aa0bc', i: '#e8b8c8' });
  p.kreis(8, 8, 2, '#f8f6f0');
  p.px(7, 7, '#ffffff').px(9, 9, '#c8c0d0').px(10, 8, '#d8d0e0').px(8, 10, '#d8d0e0');
};

FORM.kakao = (p) => {
  p.karte(0, 0, [
    '................',
    '..........bb....',
    '.........bb.....',
    '......OOOO......',
    '.....OoOOOOo....',
    '....OoOOrOOOo...',
    '....OoOOrOOOo...',
    '...OoOOOrOOOOo..',
    '...OoOOOrOOOOo..',
    '...OOOOOrOOOOo..',
    '....OOOOrOOOo...',
    '....oOOOrOOOo...',
    '.....ooOOOoo....',
    '.......ooo......',
    '................',
    '................',
  ], { O: '#c8641e', o: '#8a3a12', r: '#a04a14', b: '#5a3a1a' });
  p.rect(5, 4, 1, 4, '#f0a050');
  // Bohne
  p.ellipse(2, 13, 1.5, 1, '#5a2a10').px(2, 13, '#8a4a20');
};

FORM.baumwolle = (p) => {
  p.linie(8, 15, 8, 10, '#6b4420').linie(8, 12, 4, 11, '#6b4420');
  const W = '#ffffff', w = '#cfd5e0';
  for (const [x, y, r] of [[5, 5, 2.6], [11, 5, 2.6], [8, 3, 2.4], [8, 8, 2.6]]) p.kreis(x, y, r, W);
  p.linie(5, 7, 8, 5, w).linie(11, 7, 8, 5, w).linie(8, 5, 8, 6, w).linie(6, 3, 6, 4, w).linie(10, 3, 10, 4, w);
  p.px(12, 7, w).px(13, 6, w).px(10, 10, w).px(9, 10, w).px(3, 6, w);
  // Kelchblätter
  p.px(3, 7, '#7a4a20').px(13, 7, '#7a4a20').px(5, 11, '#7a4a20').px(11, 11, '#7a4a20');
  p.ellipse(3, 11, 1, 0.6, '#5a9030');
};

FORM.farbstoffe = (p) => {
  const topf = (x, y, f) => {
    p.rect(x, y, 5, 5, '#a86a3a').rect(x, y + 4, 5, 1, '#6b4420').rect(x + 4, y, 1, 5, '#7a4a20').rect(x, y, 1, 5, '#c88a52');
    p.rect(x, y - 1, 5, 1, '#c88a52');
    p.rect(x + 1, y - 1, 3, 1, f).px(x + 1, y - 1, hell(f, 0.4));
  };
  // Farbkleckse oben
  p.ellipse(4, 4, 2, 1.5, '#e02a2a').ellipse(11, 4, 2, 1.5, '#2a5ae0').ellipse(8, 2, 1.6, 1, '#f1c40f');
  p.px(3, 3, '#ff8a8a').px(10, 3, '#8aaaff').px(7, 1, '#fff08a');
  topf(1, 9, '#e02a2a'); topf(6, 10, '#f1c40f'); topf(10, 9, '#2a5ae0');
  p.rect(4, 6, 1, 3, '#e02a2a').rect(11, 6, 1, 3, '#2a5ae0').rect(8, 4, 1, 5, '#f1c40f');
};

FORM.tee = (p) => {
  p.linie(3, 14, 9, 6, '#6b4420');
  const blatt = (cx, cy, rx, ry, c, d) => { p.ellipse(cx, cy, rx, ry, c); };
  // drei Blätter
  p.poly([[8, 7], [4, 3], [6, 1], [9, 4]], '#3d9f3a');
  p.poly([[9, 6], [14, 3], [14, 7], [11, 9]], '#2f8a2c');
  p.poly([[6, 10], [2, 8], [2, 5], [6, 7]], '#4caf40');
  p.linie(8, 7, 5, 2, '#a8e070').linie(9, 6, 14, 4, '#8ad060').linie(6, 10, 2, 6, '#a8e070');
  p.px(9, 5, '#cfe8a0');
  p.ellipse(10, 12, 3, 1.5, '#4caf40');
  p.linie(8, 12, 12, 12, '#a8e070');
};

FORM.bernstein = (p) => {
  p.karte(0, 0, [
    '................',
    '................',
    '......AAAA......',
    '....AAaaAAAA....',
    '...AaaAAAAAAA...',
    '..AaaAAAAAAAAd..',
    '..AaAAAAAAAAAd..',
    '..AAAAAkkAAAAd..',
    '.AAAAAkAAkAAAdd.',
    '.AAAAAAkkAAAAdd.',
    '.AAAAAAAAAAAddd.',
    '..AAAAAAAAAddd..',
    '...dAAAAAAddd...',
    '.....ddddd......',
    '................',
    '................',
  ], { A: '#f0920e', a: '#ffd27a', d: '#a85a08', k: '#5a2a08' });
  p.px(5, 3, '#ffffff').px(4, 4, '#fff0c8');
};

FORM.kristalle = (p) => {
  for (const [x, y] of [[1, 2], [14, 1], [1, 9], [14, 6], [3, 1]]) p.px(x, y, '#d8b8ff');
  const K = '#4ad8ff', k = '#1a7ac8', h = '#d8f8ff';
  p.poly([[7, 1], [9, 3], [9, 13], [6, 13], [6, 3]], K); p.rect(8, 3, 2, 10, k); p.rect(6, 3, 1, 9, h);
  p.poly([[3, 5], [5, 7], [5, 13], [2, 13], [2, 7]], '#c070ff'); p.rect(4, 7, 1, 6, '#7a2ac0'); p.rect(2, 7, 1, 5, '#f0d0ff');
  p.poly([[12, 4], [14, 6], [14, 13], [11, 13], [11, 6]], K); p.rect(13, 6, 1, 7, k); p.rect(11, 6, 1, 6, h);
  p.rect(1, 13, 14, 1, '#4a4060');
  p.px(7, 2, '#ffffff').px(3, 6, '#ffffff').px(12, 5, '#ffffff');
};

FORM.irrlichter = (p) => {
  // Schweif
  bez(p, [8, 7], [5, 12], [2, 14], 1.6, 0, '#4ad8b0');
  bez(p, [8, 7], [11, 11], [12, 14], 1.0, 0, '#2a9a90');
  p.kreis(8, 6, 4, '#4ad8b0');
  p.kreis(8, 6, 2.8, '#a8ffe0');
  p.kreis(8, 6, 1.4, '#ffffff');
  for (const [x, y] of [[2, 3], [14, 2], [13, 9], [1, 8], [10, 1]]) p.px(x, y, '#c8fff0');
};

// ---------- Zukunfts-Rohstoffe und -Lagergüter ----------
/** Facettierter Erzbrocken (3x3 bis 4x3) mit Licht oben links. */
function nugget(p, x, y, F, gross) {
  p.rect(x, y, 3, 2, F[1]).rect(x + 1, y + 2, 2, 1, F[2]);
  if (gross) p.rect(x + 3, y + 1, 1, 2, F[2]).px(x + 3, y, F[1]);
  p.px(x, y, F[0]).px(x + 1, y, F[0]).px(x, y + 1, mische(F[0], F[1], 0.5));
  p.px(x + 2, y + 1, F[2]);
}
FORM.seltene_erden = (p) => {
  // dunkles Muttergestein mit schillernden, bunten Erzbrocken
  p.karte(0, 0, [
    '................',
    '................',
    '................',
    '................',
    '.....SSSSS......',
    '...SSSSSSSSSS...',
    '..SSSSSSSSSSSs..',
    '.SSSSSSSSSSSSs..',
    '.SSSSSSSSSSSSss.',
    '.SSSSSSSSSSSSss.',
    '..SSSSSSSSSSss..',
    '...ssSSSSSsss...',
    '.....ssssss.....',
    '................',
    '................',
    '................',
  ], { S: '#5c5668', s: '#3c3848' });
  p.rect(4, 5, 4, 1, '#7a748a').rect(3, 6, 2, 1, '#7a748a');
  nugget(p, 3, 7, ['#ffb0f0', '#e050c8', '#9a2a8a'], true);
  nugget(p, 8, 4, ['#b0fff0', '#36cdb8', '#1a7a7a'], true);
  nugget(p, 10, 8, ['#fff0a0', '#f0b828', '#a8700a']);
  nugget(p, 6, 10, ['#c8d0ff', '#6a7cff', '#3a3ab0']);
  nugget(p, 7, 2, ['#d8ffb0', '#8ade3a', '#4a8a1a']);
  for (const [x, y, c] of [[2, 3, '#ffb0f0'], [13, 3, '#b0fff0'], [14, 7, '#fff0a0'], [1, 11, '#c8d0ff']]) p.px(x, y, c);
};
FORM.deuterium = (p) => {
  // hellblauer Tropfen mit Atom (Kern aus Proton und Neutron, Elektronenbahn)
  p.karte(0, 0, [
    '................',
    '.......B........',
    '.......B........',
    '......BbB.......',
    '......BbB.......',
    '.....BbbbB......',
    '....BbbbbbB.....',
    '...BbbbbbbbB....',
    '...BbbbbbbbBd...',
    '..BbbbbbbbbbBd..',
    '..BbbbbbbbbbBd..',
    '..BbbbbbbbbbBd..',
    '...BbbbbbbbBd...',
    '....BBbbbBBd....',
    '......dddd......',
    '................',
  ], { B: '#3a8fe0', b: '#8fd0ff', d: '#1f5aa8' });
  p.px(6, 6, '#ffffff').px(5, 7, '#e4f6ff').px(7, 4, '#e4f6ff');
  // Elektronenbahn (geneigte Ellipse) und Kern aus zwei Teilchen
  for (let i = 0; i < 48; i++) {
    const t = i / 48 * Math.PI * 2, x = Math.cos(t) * 4.6, y = Math.sin(t) * 1.6, w = -0.45;
    p.px(8 + x * Math.cos(w) - y * Math.sin(w), 10 + x * Math.sin(w) + y * Math.cos(w), '#1f5aa8');
  }
  p.rect(6, 9, 2, 2, '#ffffff').px(7, 10, '#c8ecff');
  p.rect(8, 9, 2, 2, '#2a6ad0').px(8, 9, '#5aa8f0');
  p.px(12, 7, '#ffffff');
};
FORM.titan = (p) => {
  // zwei gebürstete Titanplatten mit leicht violettem Anlaufschimmer
  const platte = (x, y, b) => {
    p.poly([[x + 2, y], [x + b + 2, y], [x + b, y + 3], [x, y + 3]], '#c6cad4');
    p.rect(x, y + 4, b + 1, 2, '#80869a').rect(x + b, y + 3, 1, 3, '#5c6274');
    p.px(x + b + 1, y + 2, '#5c6274').px(x + b + 1, y + 3, '#5c6274').px(x + b + 2, y + 1, '#5c6274');
    p.rect(x, y + 3, b, 1, '#a4a9b8');
    for (let i = 0; i < b - 2; i += 3) p.px(x + 3 + i, y + 1, '#e6e9f0').px(x + 2 + i, y + 2, '#b0b5c4');
    p.px(x + 2, y, '#f4f6fa').px(x + 3, y, '#f4f6fa');
    // Anlauffarben an der Schnittkante (typisch für Titan)
    const an = ['#7a8ae0', '#8a7ad8', '#a87ac8', '#c890a8', '#d8b070'];
    for (let i = 0; i <= b; i++) p.px(x + i, y + 5, an[Math.min(an.length - 1, Math.floor(i / (b + 1) * an.length))]);
  };
  platte(1, 8, 11);
  platte(3, 3, 9);
};
FORM.helium3 = (p) => {
  // gelbliche Gaskugel mit Ventil und einer "3" auf dem Bauch
  p.rect(7, 1, 2, 2, '#9aa5b1').rect(6, 1, 4, 1, '#c8d0d8').px(9, 2, '#6b7682');
  p.kreis(8, 9, 5.6, '#b8900a');
  p.kreis(7.7, 8.7, 5, '#f2d34a');
  p.ellipse(6.5, 7, 2.5, 2, '#ffe98a');
  p.px(5, 5, '#ffffff').px(4, 6, '#fff6c8').px(6, 5, '#fff6c8');
  p.rect(3, 9, 10, 1, '#d8b020');
  p.karte(7, 7, ['333', '..3', '.33', '..3', '333'], { 3: '#7a5408' });
  p.px(13, 10, '#9a7408').px(12, 12, '#9a7408');
};
FORM.antimaterie = (p) => {
  // violett leuchtende Kugel zwischen zwei Magnetspulen
  for (const [x, y] of [[1, 6], [14, 9], [2, 10], [13, 5]]) p.px(x, y, '#e8c8ff');
  const spule = (y) => {
    p.ellipse(8, y, 6, 1.2, '#7a8494'); p.ellipse(8, y - 0.5, 6, 0.7, '#c8d0d8');
    for (let x = 3; x <= 13; x += 2) p.px(x, y + 1, '#c87a3a');
    p.px(2, y, '#9aa5b1').px(14, y, '#5a6472');
  };
  spule(2);
  p.rect(3, 3, 1, 10, '#7a8494').rect(12, 3, 1, 10, '#5a6472');
  p.kreis(8, 8, 3.6, '#8a3ae0');
  p.kreis(8, 8, 2.6, '#c060ff');
  p.kreis(7.6, 7.6, 1.4, '#f0d0ff');
  p.px(7, 7, '#ffffff');
  for (const [x, y] of [[4, 8], [11, 7], [8, 4], [8, 12]]) p.px(x, y, '#d8a8ff');
  spule(13);
};

FORM.wassereis = (p) => {
  // blau-weißer, facettierter Eisbrocken mit Glanzlicht, daneben ein kleiner Splitter
  const E = { w: '#ffffff', h: '#e4f6fe', m: '#b0dcf2', b: '#78bce2', d: '#3f86bc', dd: '#2a5f92' };
  p.poly([[2, 10], [4, 5], [8, 2], [12, 4], [13, 9], [11, 13], [5, 13]], E.m);
  p.poly([[4, 5], [8, 2], [12, 4], [8, 7]], E.h);                 // Deckfläche
  p.poly([[8, 7], [12, 4], [13, 9], [11, 13], [9, 12]], E.b);     // Schattenseite rechts
  p.poly([[5, 13], [9, 12], [11, 13]], E.d);                      // Unterkante
  p.linie(11, 13, 13, 9, E.d).linie(12, 12, 13, 10, E.dd);
  p.linie(8, 7, 9, 12, E.m);                                      // Facettenkante
  p.linie(4, 5, 8, 2, E.w).linie(2, 10, 4, 5, E.h);               // Lichtkanten oben links
  p.px(5, 5, E.w).px(6, 4, E.w).px(4, 7, E.w).px(5, 6, E.h);
  p.px(4, 10, '#d4eefa').px(5, 9, '#d4eefa').px(10, 8, '#a4d4f0').px(11, 6, '#a4d4f0');
  // Splitter rechts unten
  p.poly([[12, 13], [13, 11], [15, 12], [14, 14]], E.b).px(13, 11, E.w).px(13, 12, E.h).px(14, 14, E.d);
  for (const [x, y] of [[2, 3], [14, 5], [1, 13]]) p.px(x, y, '#d8f6ff');
};

const IDS = ['weizen', 'reis', 'mais', 'fisch', 'wild', 'rinder', 'schafe', 'bananen', 'wale', 'muscheln', 'datteln', 'hirse', 'elefanten', 'pilze',
  'holz', 'stein', 'marmor', 'salz', 'lehm', 'kupfer', 'zinn', 'eisen', 'pferde', 'salpeter', 'kohle', 'oel', 'aluminium', 'uran',
  'wein', 'gewuerze', 'seide', 'weihrauch', 'edelsteine', 'gold_erz', 'silber', 'zucker', 'elfenbein', 'pelze', 'perlen', 'kakao', 'baumwolle', 'farbstoffe', 'tee', 'bernstein', 'kristalle', 'irrlichter',
  'seltene_erden', 'deuterium', 'helium3', 'titan', 'wassereis'];

for (const id of IDS) definiere('rohstoff', id, { w: 16, h: 16, zeichne: (p) => { FORM[id](p); rand(p); } });
