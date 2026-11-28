// Religion: Einheiten (Missionar, Apostel) und UI-Symbole (Glaube, Religion).
// Einheiten 32x32, Blick nach rechts, Füße bei y≈30, Licht von oben links. Spielerfarbe über 'S', 'S-', 'S+'.
// Symbole 16x16 im Stil von ui.js (Umriss automatisch, Rand frei).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, Pinsel } from '../pixel.js';
import { rand } from './rohstoffe.js';

const S = 'S', SD = 'S-', SH = 'S+', SDD = 'S--';
/** Dunkler/heller Ton, funktioniert auch mit Spielerfarben-Platzhaltern. */
const dk = (c, t = 0.25) => (c === S ? SD : c === SH ? S : c === SD ? SDD : c === SDD ? SDD : dunkel(c, t));
const hl = (c, t = 0.25) => (c === S ? SH : c === SD ? S : c === SDD ? SD : c === SH ? SH : hell(c, t));

// Zusatzfarben
const C = {
  gold: '#e8b830', goldH: '#fbe58a', goldD: '#a8801c',
  licht: '#fff6c8', lichtH: '#ffffff', schein: '#f6e7a0',
  pergament: '#efe2bc', pergamentD: '#c4b088', buch: '#7a3a22', buchD: '#55261a',
  tasche: '#8a6440', tascheD: '#634528', strick: '#c9b27c',
  grauHaar: '#c8c4bc', grauHaarD: '#9c9890', weiss: '#f4f1ea',
};

// ---------------------------------------------------------------- Grundwerkzeuge (aus einheiten_land.js übernommen)

/** Zeichnet fn auf ein eigenes Blatt, schattiert es und überträgt es. */
function lage(p, fn, o = {}) {
  const t = new Pinsel(p.w, p.h); fn(t);
  if (o.schatten !== 0) t.schattieren(o.schatten ?? 0.18);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
/** Linie mit Dicke (zusätzliche Linien nach rechts versetzt). */
function strich(p, x0, y0, x1, y1, c, d = 2) {
  for (let i = 0; i < d; i++) p.linie(x0 + i, y0, x1 + i, y1, c);
}
/** Kopf in Seitenansicht (Blick rechts). (x,y) = links oben eines 6x5-Kastens. */
function kopf(p, x, y, o = {}) {
  const haut = o.haut || PAL.haut, haar = o.haar || PAL.haar;
  p.rect(x + 1, y, 3, 1, haar); p.rect(x, y + 1, 5, 1, haar);
  p.rect(x, y + 2, 2, 1, haar); p.px(x + 2, y + 2, haut); p.px(x + 3, y + 2, '#1e1814'); p.px(x + 4, y + 2, haut);
  p.px(x, y + 3, haar); p.rect(x + 1, y + 3, 5, 1, haut); p.px(x + 1, y + 3, PAL.hautD);
  p.rect(x + 1, y + 4, 4, 1, haut); p.px(x + 1, y + 4, PAL.hautD);
  if (o.bart) { p.rect(x + 2, y + 4, 4, 2, o.bart); p.px(x + 4, y + 3, o.bart); p.px(x + 2, y + 3, o.bart); p.px(x + 3, y + 6, o.bartD || o.bart); }
}
/** Arm als 2 px breiter Strich mit Hand am Ende. */
function arm(p, x0, y0, x1, y1, c) {
  strich(p, x0, y0, x1 - 1, y1, c, 2);
  p.px(x0, y0, hl(c));
  p.px(x1, y1, PAL.haut).px(x1, y1 + 1, PAL.hautD);
}

/**
 * Figur im langen Gewand (Blick rechts), Füße bei y=30.
 * o: gewand, saum (Farbe der Saumkante), breit (Gewand weiter ausgestellt), haar, bart, handHinten ([x,y]).
 */
function gewandFigur(p, o = {}) {
  const g = o.gewand || S, gd = dk(g);
  const unten = o.breit ? 8 : 10, rechts = o.breit ? 22 : 21;
  lage(p, (q) => {
    // hinterer Arm (hängt neben dem Körper)
    const hh = o.handHinten || [11, 22];
    strich(q, 12, 18, hh[0], hh[1], gd, 2);
    q.px(hh[0], hh[1] + 1, PAL.hautD).px(hh[0] + 1, hh[1] + 1, PAL.hautD);
    // Füße (Sandalen) schauen unten heraus
    q.rect(12, 29, 3, 2, PAL.lederD); q.rect(17, 29, 4, 2, PAL.lederD); q.px(19, 29, PAL.haut);
    // Gewand: oben schmal, unten ausgestellt, hinten etwas länger
    q.poly([[12, 17], [18, 17], [19, 21], [rechts, 29], [unten, 29], [unten + 1, 25], [11, 21]], g);
    q.rect(unten, 29, 2, 1, gd);
    // Falten
    q.linie(15, 22, 14, 28, gd); q.linie(18, 23, 19, 28, gd);
    q.px(13, 18, hl(g)).px(14, 18, hl(g)).px(12, 19, hl(g));
  }, { schatten: 0.15 });
  if (o.saum) {
    // verzierter Saum unten und Mittelkante vorne
    const sy = 29;
    for (let x = unten; x <= rechts; x++) p.px(x, sy - 1, o.saum);
    for (let x = unten + 1; x <= rechts; x += 2) p.px(x, sy - 2, dunkel(o.saum, 0.2));
    p.linie(18, 19, 20, 27, o.saum);
  }
  kopf(p, 13, 11, { haar: o.haar, bart: o.bart, bartD: o.bartD });
}

// ---------------------------------------------------------------- Einheiten

definiere('einheit', 'missionar', {
  w: 32, h: 32,
  zeichne(p) {
    // Umhängetasche hinten an der Hüfte
    lage(p, (q) => { q.rect(8, 21, 5, 5, C.tasche); q.rect(8, 21, 5, 2, C.tascheD); q.px(10, 23, C.gold); }, { schatten: 0.2 });
    gewandFigur(p, { gewand: S, handHinten: [10, 22] });
    // Strickgürtel
    p.rect(12, 22, 7, 1, C.strick).px(14, 23, C.strick).px(14, 24, C.strick).px(14, 25, dunkel(C.strick, 0.2));
    // Taschenriemen von der Schulter nach hinten
    p.linie(16, 17, 13, 20, C.tascheD);
    // Kapuze (bedeckt Haare, fällt in den Nacken)
    const x = 13, y = 11;
    p.rect(x - 1, y - 1, 6, 3, S).rect(x - 1, y + 2, 2, 4, S).rect(x - 2, y + 1, 1, 4, SD).rect(x, y + 5, 3, 1, SD);
    p.px(x + 5, y, S).px(x + 5, y + 1, SD);
    p.rect(x, y - 1, 3, 1, SH).px(x - 1, y, SH);
    p.px(x + 2, y + 2, PAL.hautD);
    // Wanderstab (Krummstab oben) in der vorderen Hand
    p.linie(23, 7, 23, 30, PAL.holz).px(23, 30, PAL.holzD);
    p.px(23, 6, PAL.holzH).px(24, 5, PAL.holzH).px(25, 5, PAL.holz).px(26, 6, PAL.holz).px(26, 7, PAL.holzD).px(25, 8, PAL.holzD);
    p.linie(24, 9, 24, 29, PAL.holzD);
    arm(p, 17, 18, 22, 18, S);
    p.px(22, 17, PAL.haut);
    // Buch in der hinteren Hand, vor den Körper gehalten
    p.rect(17, 20, 5, 4, C.buch).rect(17, 20, 5, 1, C.pergament).rect(21, 21, 1, 3, C.buchD).px(19, 21, C.gold).px(18, 22, C.gold).px(19, 22, C.gold).px(20, 22, C.gold).px(19, 23, C.gold);
    p.px(16, 21, PAL.haut).px(16, 22, PAL.hautD);
  },
});

definiere('einheit', 'apostel', {
  w: 32, h: 32,
  zeichne(p) {
    // Lichtschein hinter dem Kopf
    for (const [x, y] of [[12, 8], [13, 7], [14, 7], [15, 7], [16, 7], [17, 8], [11, 9], [18, 9], [11, 10], [19, 10]]) p.px(x, y, C.schein);
    gewandFigur(p, { gewand: S, saum: C.gold, breit: true, haar: C.grauHaar, bart: C.grauHaar, bartD: C.grauHaarD, handHinten: [10, 23] });
    // Stola in Weiß mit Goldkreuzchen
    p.linie(17, 17, 17, 27, C.weiss).linie(16, 17, 16, 21, hell(C.weiss, 0.2));
    p.px(17, 25, C.gold).px(17, 23, C.gold);
    // Gürtel mit Goldschnalle
    p.rect(12, 22, 7, 1, SDD).px(16, 22, C.gold);
    // Schultermantel (Pelerine) mit Goldrand
    p.poly([[11, 17], [18, 17], [19, 19], [11, 20]], SD);
    p.rect(11, 20, 8, 1, C.gold).px(19, 19, C.goldD).px(12, 17, S).px(13, 17, S);
    // Gelehrtenkappe
    p.rect(13, 10, 5, 2, SD).rect(14, 9, 3, 1, SD).px(14, 9, S).px(13, 11, C.gold).px(17, 11, C.gold).px(15, 8, C.gold);
    // Hoher Stab mit leuchtendem Sonnensymbol
    p.linie(23, 7, 23, 30, C.goldD).linie(22, 8, 22, 29, C.gold).px(22, 30, C.goldD);
    p.rect(21, 7, 4, 1, C.goldD);
    // Strahlen und Lichtkranz um das Symbol
    for (const [x, y] of [[22, 0], [18, 3], [27, 3], [19, 0], [26, 0], [18, 6], [27, 6]]) p.px(x, y, C.schein);
    p.kreis(22.5, 3.5, 2.6, C.gold);
    p.kreis(22.5, 3.5, 1.6, C.licht);
    p.px(22, 3, C.lichtH).px(23, 3, C.lichtH).px(22, 4, C.lichtH).px(23, 4, C.lichtH);
    p.px(21, 2, C.goldH);
    // vordere Hand am Stab
    arm(p, 17, 18, 21, 17, SD);
    p.px(22, 17, PAL.haut).px(22, 18, PAL.hautD);
  },
});

// ---------------------------------------------------------------- UI-Symbole

function ico(id, zeichne) { definiere('ui', id, { w: 16, h: 16, zeichne: (p, o) => { zeichne(p, o); rand(p); } }); }

// Glaube: leuchtende Flamme über einer goldenen Schale
ico('glaube', (p) => {
  // Flamme (außen gold, innen hellgelb, Kern weiß)
  p.karte(0, 0, [
    '................',
    '.......o........',
    '.......oo.......',
    '......ooo.......',
    '......oyoo......',
    '.....ooyyo......',
    '.....oyyyoo.....',
    '....ooywyyo.....',
    '....oywwwyo.....',
    '....oywwwyo.....',
    '.....oywyo......',
  ], { o: '#f0a818', y: '#ffe36a', w: '#ffffff' });
  // Funken
  p.px(11, 2, '#ffe36a').px(3, 4, '#fff0a0');
  // Schale
  p.rect(2, 10, 12, 1, '#fbe58a');
  p.poly([[2, 11], [13, 11], [11, 13], [4, 13]], '#d9a80c');
  p.rect(3, 11, 10, 1, '#f1c40f').px(3, 11, '#fff0a0').px(4, 11, '#fff0a0');
  p.rect(5, 13, 6, 1, '#a8801c');
  // Fuß
  p.rect(7, 14, 2, 1, '#b8930a'); p.rect(5, 15, 6, 1, '#c8930a');
});

// Religion: Tempelfront mit Strahlen dahinter
ico('religion', (p) => {
  // Strahlen hinter dem Giebel
  const st = '#f5c518', stH = '#fff0a0';
  p.px(8, 0, stH).px(8, 1, st);
  p.linie(2, 1, 4, 3, st).px(2, 1, stH); p.linie(14, 1, 12, 3, st).px(14, 1, stH);
  const w = '#f4ecd8', wd = '#c8b894', wdd = '#8c7c5c';
  // Giebel
  p.poly([[8, 2], [14, 6], [2, 6]], w);
  p.linie(8, 2, 2, 6, '#ffffff');
  p.rect(2, 6, 13, 1, wd);
  p.px(8, 4, '#e8a818').px(8, 5, '#e8a818').px(7, 5, '#f1c40f').px(9, 5, '#f1c40f');
  // Gebälk
  p.rect(3, 7, 11, 1, w);
  // Säulen
  for (const x of [3, 5, 11, 13]) { p.rect(x, 8, 1, 4, x < 8 ? w : wd); }
  // Eingang mit Licht
  p.rect(7, 8, 3, 4, '#ffe36a'); p.rect(7, 8, 3, 1, '#fff6c8');
  // Stufen
  p.rect(2, 12, 13, 1, w); p.rect(1, 13, 15, 1, wd); p.rect(1, 14, 15, 1, wdd);
  p.px(2, 12, '#ffffff').px(1, 13, w);
});
