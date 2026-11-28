// Distrikte (wie in Civ 6): eigene Gebäudegruppe auf einem Nachbarfeld der Stadt.
// Format wie die Städte: 64x56, Feldmitte bei (32, 45), flache Bodenellipse um (32, 45.5) als Fundament.
// Distrikte sind etwas kleiner und flacher als eine Stadt gleicher Epoche, damit die Stadtmitte dominant bleibt.
// Jeder Distrikt zeigt seine Erkennungsfarbe (Dächer, Markisen, Lichtbänder) und die Spielerfarbe an einer Fahne.
// Optik nach Zeitalter in vier Stufen: 0-1 Holz/Lehm, 2-3 Stein/Fachwerk, 4-6 Backstein/Beton/Glas,
// 7-10 Zukunft (Glas, weiße Kuppeln, Lichtbänder). Innerhalb der Stufen wechseln Material und Details je Zeitalter.
// Weltraum-Distrikte (Kuppelviertel, Forschungskuppel, Bergbaudistrikt) stehen auf Mond-/Marsboden; ab Zeitalter 10 kristallin.
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

// Erkennungsfarben (gleich wie `farbe` in public/shared/daten/distrikte.js).
const FARBE = {
  campus: '#4f8fe6', heiligtum: '#e8dca8', handelsplatz: '#e8c23a', industriezone: '#9a9a9a',
  theaterplatz: '#e0703a', hafen: '#3cc4c4', militaerlager: '#b0503a', stadtviertel: '#7fbf5a',
  kuppelviertel: '#a6d0ff', forschungskuppel: '#7b8cff', bergbaudistrikt: '#c08a5a',
};

// ---------- Hilfen (wie in staedte.js) ----------
/** Zeichnet ein Teil auf eigenem Pinsel mit Umriss und kopiert es darüber. */
function teil(p, fn, rand = UMRISS) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
const s2 = (i) => Math.floor((i + 1) / 2);
/** Farbreihe [hell, grund, dunkel, sehr dunkel]; 'S' ergibt die Spielerfarbe. */
const toene = (c) => (c === 'S' ? ['S+', 'S', 'S-', 'S--'] : [hell(c, 0.22), c, dunkel(c, 0.22), dunkel(c, 0.45)]);
/** Stufe der Optik: 0 = Holz/Lehm, 1 = Stein/Fachwerk, 2 = Backstein/Beton/Glas, 3 = Zukunft. */
const stufe = (z) => (z <= 1 ? 0 : z <= 3 ? 1 : z <= 6 ? 2 : 3);

/** Quader: Vorderseite x..x+w-1, Zeilen y-h+1..y; rechte Seite d Spalten breit, nach oben versetzt. */
function quader(p, x, y, w, h, d, front, seite) {
  p.rect(x, y - h + 1, w, h, front);
  for (let i = 0; i < d; i++) p.rect(x + w + i, y - h + 1 - s2(i), 1, h, seite);
}
function flachdach(p, x, y, w, h, d, c, rand) {
  const t = y - h;
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.rect(x + k * 2, t - k, w, 1, c);
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.px(x + w - 1 + k * 2, t - k, c).px(x + w + k * 2, t - k, c);
  if (rand) { p.rect(x, t, w, 1, rand); for (let i = 0; i < d; i++) p.px(x + w + i, t - s2(i), dunkel(rand, 0.2)); }
}
/** Satteldach, First parallel zur Vorderseite. F = toene(). */
function satteldach(p, x, y, w, h, d, rh, F, seite) {
  const yE = y - h, sx = Math.max(1, Math.round(d / 2));
  p.poly([[x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [x + w + sx, yE - rh + 1]], seite);
  p.linie(x + w + sx, yE - rh + 1, x + w + d, yE + 1 - s2(d - 1), F[2]);
  for (let k = 0; k < rh; k++) {
    const o = Math.round(k * sx / rh), xs = x - 1 + o, xe = x + w + o;
    const c = k === 0 ? F[3] : (k === rh - 1 ? F[0] : F[1]);
    p.rect(xs, yE - k, xe - xs + 1, 1, c);
    if (k > 0 && k < rh - 1) for (let i = xs + ((k * 2) % 3); i <= xe; i += 3) p.px(i, yE - k, F[2]);
  }
}
/** Giebel zur Vorderseite (Tempel, Kirche, Fachwerk). */
function giebeldach(p, x, y, w, h, d, F, wand, seite, gh) {
  const yE = y - h, ax = x + (w - 1) / 2;
  gh = gh ?? Math.ceil(w / 2);
  p.poly([[x, yE], [x + w - 1, yE], [ax, yE - gh + 1]], wand);
  p.poly([[ax, yE - gh], [x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [ax + d - 1, yE - gh - s2(d - 1)]], F[1]);
  for (let i = 1; i < d; i += 2) p.linie(ax + i, yE - gh - s2(i - 1), x + w + i, yE + 1 - s2(i), F[2]);
  p.linie(x - 1, yE + 1, ax, yE - gh, F[0]).linie(ax, yE - gh, x + w, yE + 1, F[2]);
  p.linie(x, yE + 1, ax, yE - gh + 1, F[0]);
  p.linie(ax, yE - gh, ax + d - 1, yE - gh - s2(d - 1), F[0]);
}
function zeltdach(p, x, y, w, h, d, rh, F) {
  const yE = y - h, ax = Math.round(x + (w + d) / 2) - 1, ay = yE - rh;
  p.poly([[x - 1, yE + 1], [x + w, yE + 1], [ax, ay]], F[1]);
  p.poly([[x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [ax, ay]], F[2]);
  p.linie(x - 1, yE + 1, ax, ay, F[0]).px(ax, ay, F[0]);
  p.rect(x - 1, yE + 1, w + 1, 1, F[3]);
}
/** Halbkuppel (Licht oben links); by = Unterkante. */
function kuppel(p, cx, by, rx, ry, F) {
  for (let y = Math.floor(by - ry); y <= by; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / (rx + 0.5), dy = (y - by) / (ry + 0.5);
    if (dx * dx + dy * dy > 1) continue;
    const v = -dx * 0.9 - dy * 0.5;
    p.px(x, y, v > 0.6 ? F[0] : v > -0.1 ? F[1] : v > -0.6 ? F[2] : F[3]);
  }
}
/** Fensterraster auf Vorder- und Seitenfläche. */
function fenster(p, x, y, w, h, d, c, cs, opt = {}) {
  const dx = opt.dx ?? 2, dy = opt.dy ?? 3, fh = opt.fh ?? 1, oben = opt.oben ?? 2, unten = opt.unten ?? 2;
  for (let yy = y - h + 1 + oben; yy + fh - 1 <= y - unten; yy += dy)
    for (let xx = x + 1; xx < x + w - 1; xx += dx) { p.rect(xx, yy, 1, fh, c); if (opt.licht && ((xx * 7 + yy * 3) % 5 === 0)) p.px(xx, yy, opt.licht); }
  if (cs) for (let yy = y - h + 1 + oben; yy + fh - 1 <= y - unten; yy += dy) for (let i = 1; i < d - 1; i += 2) p.rect(x + w + i, yy - s2(i), 1, fh, cs);
}
function tuer(p, x, y, c = '#3a2414', h = 2) { p.rect(x, y - h + 1, 1, h, c); p.rect(x + 1, y - h + 1, 1, h, dunkel(c, 0.3)); }
/** Fahne in Spielerfarbe; mast = Farbe des Mastes. */
function fahne(p, x, y, h, lang = 4, mast = '#4a3a2a') {
  p.rect(x, y - h, 1, h + 1, mast); p.px(x, y - h - 1, PAL.gold);
  for (let i = 0; i < lang; i++) { p.px(x + 1 + i, y - h + (i % 3 === 2 ? 1 : 0), 'S'); p.px(x + 1 + i, y - h + 1 + (i % 3 === 2 ? 1 : 0), i < lang - 1 ? 'S-' : 'S'); }
  p.px(x + 1, y - h, 'S+');
}
/** Senkrechtes Banner (Stoffbahn am Querholz), c = Farbe ('S' für Spielerfarbe). */
function banner(p, x, y, h, c, lang = 5, mast = '#4a3a2a') {
  const F = toene(c);
  p.rect(x, y - h, 1, h + 1, mast); p.px(x, y - h - 1, PAL.gold);
  p.rect(x - 1, y - h + 1, 5, 1, mast);
  for (let j = 0; j < lang; j++) { p.px(x, y - h + 2 + j, F[0]); p.px(x + 1, y - h + 2 + j, F[1]); p.px(x + 2, y - h + 2 + j, F[2]); }
  p.px(x, y - h + 2 + lang, F[1]).px(x + 2, y - h + 2 + lang, F[2]);
}
function rauch(p, x, y, n, seed = 0, hellRauch = false) {
  const c = hellRauch ? ['#c8ccd0', '#e8ecf0', '#ffffff', '#a0a6ac'] : ['#7c7874', '#a49e98', '#c8c2bc', '#5a5450'];
  teil(p, (q) => {
    for (let i = 0; i < n; i++) {
      const xx = x + i * 1.5 + ((i + seed) % 2), yy = y - i * 2.6, r = 1.2 + i * 0.4;
      q.ellipse(xx, yy, r, r * 0.8, c[0]); q.ellipse(xx - 0.4, yy - 0.4, r - 0.5, r * 0.8 - 0.5, c[1]); q.px(xx - r * 0.4, yy - r * 0.4, c[2]);
    }
  }, c[3]);
}
/** Stehender Zylinder mit Spaltenschattierung; Deckel als flache Ellipse. */
function zylinder(p, x, yb, b, h, F, deckel = true) {
  for (let i = 0; i < b; i++) {
    const t = b > 1 ? i / (b - 1) : 0.5;
    p.rect(x + i, yb - h + 1, 1, h, t < 0.2 ? F[0] : t < 0.62 ? F[1] : t < 0.86 ? F[2] : F[3]);
  }
  if (deckel) { p.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, F[0]); p.px(x + b - 1, yb - h + 1, F[1]); }
}
/** Färbt nur bereits gesetzte Pixel einer Zeile (Bänder auf runden Formen); rechts dunkler. */
function band(p, x0, x1, y, c, cd, glanzC) {
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (!p.hole(x, y)) continue;
    const t = (x - x0) / Math.max(1, x1 - x0);
    p.px(x, y, glanzC && (x % 4 === 1) && t < 0.7 ? glanzC : t > 0.72 ? cd : c);
  }
}
/** Ellipsenring; teilR = 'vorne', 'hinten' oder 'ganz'. */
function ring(p, cx, cy, rx, ry, c, teilR = 'ganz', c2) {
  const n = Math.ceil((rx + ry) * 4);
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (teilR === 'vorne' && y < cy) continue;
    if (teilR === 'hinten' && y >= cy) continue;
    p.px(x, y, c2 && Math.cos(a) > 0.35 ? c2 : c);
  }
}
/** Kegeldach über einem Rundturm (cx Mitte, yE Traufe, r Halbbreite, rh Höhe). */
function kegel(p, cx, yE, r, rh, F) {
  for (let k = 0; k <= rh; k++) {
    const hw = Math.round(r * (1 - k / (rh + 1)));
    for (let i = -hw; i <= hw; i++) p.px(cx + i, yE - k, i < -hw / 3 ? F[0] : i > hw / 3 ? F[2] : F[1]);
  }
  p.rect(cx - r, yE + 1, 2 * r + 1, 1, F[3]);
}
const GRUEN = ['#86cc5c', '#5aa84f', '#3d7f38', '#2c5a28'];
/** Laubbaum: runde, schattierte Krone auf kurzem Stamm (x/y = Fuß). */
function baum(p, x, y, r = 2, F = GRUEN) {
  p.rect(x, y - 2, 1, 3, '#6a4a2a');
  const cy = y - 2 - r;
  for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
    const dx = xx - x, dy = yy - cy;
    if (dx * dx + dy * dy > (r + 0.5) * (r + 0.5)) continue;
    const v = -dx - dy;
    p.px(xx, yy, v > r * 0.8 ? F[0] : v > -r * 0.4 ? F[1] : F[2]);
  }
  p.px(x + 1, cy + 1, F[3]);
}
/** Zypresse (schlanker Nadelbaum). */
function zypresse(p, x, y, h) {
  for (let j = 0; j < h; j++) { const hw = j < 1 ? 0 : j > h - 3 ? 0 : 1; for (let i = -hw; i <= hw; i++) p.px(x + i, y - j - 1, i < 0 ? GRUEN[1] : i > 0 ? GRUEN[3] : GRUEN[2]); }
  p.px(x, y, '#5a3a1a');
}
/** Busch (2x2). */
function busch(p, x, y) { p.px(x, y, GRUEN[1]).px(x + 1, y, GRUEN[2]).px(x, y - 1, GRUEN[0]).px(x + 1, y - 1, GRUEN[1]); }
/** Lichtband über Vorder- und Seitenfläche eines Quaders (Zukunft). */
function lichtband(p, x, y, w, d, c, glanz) {
  p.rect(x, y, w, 1, c);
  for (let k = 0; k < d; k++) p.px(x + w + k, y - s2(k), dunkel(c, 0.25));
  if (glanz) for (let xx = x + 1; xx < x + w; xx += 3) p.px(xx, y, glanz);
}

// ---------- Materialien ----------
// Boden je Zeitalter (wie Tabelle ZA in staedte.js): [Rand, Fläche, dunkel].
const BODEN = [
  ['#8a7050', '#9a8260', '#7a6244'], ['#b8aa88', '#c8bc9c', '#a49676'], ['#8a8474', '#9a9484', '#767060'],
  ['#b0a080', '#c0b292', '#9a8a6c'], ['#76706a', '#86807a', '#625c56'], ['#868a8c', '#969a9c', '#727678'],
  ['#727a84', '#828a94', '#5e666e'], ['#7a8a84', '#8c9c94', '#65736c'], ['#cdc6b6', '#ddd7c9', '#aaa292'],
  ['#5c6072', '#6c7084', '#474b5b'], ['#3c4466', '#4a5478', '#2c3250'],
];
// Zukunftsmaterial je Zeitalter 7..10: Wand, Seite, Fenster, Fenster Seite, Dachrand, Leuchtpunkt.
const ZMAT = {
  7: { wand: '#7ec4f0', seite: '#4a86c8', fe: '#62a6e0', feS: '#3f76b4', rand: '#e8f0f2', glanz: '#d4f0ff' },
  8: { wand: '#f1efe8', seite: '#d3cfc6', fe: '#6a7890', feS: '#4a5568', rand: '#ffffff', glanz: '#ffe2a0' },
  9: { wand: '#aab0c2', seite: '#7e8498', fe: '#d6caff', feS: '#8e7cc3', rand: '#e0e4ee', glanz: '#d6caff' },
  10: { wand: '#e6eef7', seite: '#94ace0', fe: '#9ff0ff', feS: '#4ab8d8', rand: '#ffffff', glanz: '#e4fcff' },
};
// Weiße Kuppeltöne (Fusion) und Glas.
const WEISS = ['#ffffff', '#f1efe8', '#d3cfc6', '#a8a49c'];
const GLAS = ['#eef9ff', '#b6dcec', '#80b6ce', '#4f87a2'];
const STEIN = ['#d4cec2', '#b4aea2', '#8a8478', '#625c52'];
const STAHL = ['#c8d0d8', '#9aa5b1', '#6b7682', '#4a525c'];
const BETON = ['#c4c8ca', '#a8acae', '#86898c', '#6a6e70'];
/** Dachfarbe: in der Frühzeit mit Stroh/Lehm gemischt, später rein. */
const dachTon = (c, z) => (z <= 0 ? mische(c, '#d2ae5a', 0.15) : z === 1 ? mische(c, '#b5523b', 0.12) : c);

/**
 * Wohn-/Nutzgebäude im Stil des Zeitalters mit Dach in der Distriktfarbe.
 * o.d = Tiefe, o.giebel = Giebel nach vorn (ab Zeitalter 2), o.rh = Dachhöhe, o.licht = Leuchtfarbe der Zukunftsbänder.
 */
function haus(p, x, y, w, h, z, dach, o = {}) {
  const d = o.d ?? 4, F = toene(dachTon(dach, z));
  if (z <= 0) {
    const W = '#b88a58', S = '#8a643c';
    quader(p, x, y, w, h, d, W, S);
    for (let k = x + 1; k < x + w; k += 3) p.rect(k, y - h + 1, 1, h, dunkel(W, 0.12));
    tuer(p, x + Math.floor(w / 2), y, '#3a2414', Math.min(3, h - 1));
    satteldach(p, x, y, w, h, d, o.rh ?? 4, F, S);
    return;
  }
  if (z === 1) {
    const W = '#ece4d2', S = '#c4b8a0';
    quader(p, x, y, w, h, d, W, S);
    fenster(p, x, y, w, h, d, '#5a4a3a', '#4a3a2a', { dx: 3, oben: 1 });
    tuer(p, x + 1, y, '#6a4a2a');
    satteldach(p, x, y, w, h, d, o.rh ?? 3, F, S);
    return;
  }
  if (z === 2) {
    const W = '#e6d8b8', S = '#bcae90', b = '#4a3020';
    quader(p, x, y, w, h, d, W, S);
    p.rect(x, y - h + 1, 1, h, b).rect(x + w - 1, y - h + 1, 1, h, b).rect(x, y - Math.floor(h / 2), w, 1, b).rect(x, y - h + 1, w, 1, b);
    for (let k = x + 2; k < x + w - 1; k += 3) p.rect(k, y - h + 1, 1, h, b);
    p.linie(x + 1, y - 1, x + 2, y - Math.floor(h / 2) + 1, b);
    for (let k = 0; k < d; k += 2) p.rect(x + w + k, y - h + 1 - s2(k), 1, h, dunkel(b, 0.2));
    tuer(p, x + 1, y, '#3a2414');
    if (o.giebel) giebeldach(p, x, y, w, h, d, F, W, S, Math.ceil(w / 2) + 1);
    else satteldach(p, x, y, w, h, d, o.rh ?? 4, F, S);
    return;
  }
  if (z === 3) {
    const W = o.wand ?? '#e4c88e', S = dunkel(W, 0.22);
    quader(p, x, y, w, h, d, W, S);
    for (let yy = y - h + 2; yy <= y - 2; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) { p.rect(xx, yy, 1, 2, '#4a3a3a'); p.px(xx, yy - 1, hell(W, 0.3)); }
    p.rect(x, y - h + 1, w, 1, hell(W, 0.3));
    tuer(p, x + Math.floor(w / 2), y, '#5a3a2a');
    if (o.giebel) giebeldach(p, x, y, w, h, d, F, W, S, Math.ceil(w / 2));
    else satteldach(p, x, y, w, h, d, o.rh ?? 3, F, S);
    return;
  }
  if (z === 4) {
    const W = '#9c4a32', S = '#6e3122';
    quader(p, x, y, w, h, d, W, S);
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + w; xx += 3) p.px(xx, yy, '#86402a');
    fenster(p, x, y, w, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
    satteldach(p, x, y, w, h, d, o.rh ?? 3, F, S);
    return;
  }
  if (z === 5) {
    quader(p, x, y, w, h, d, '#b4b8ba', '#868a8c');
    for (let yy = y - h + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, w - 2, 1, PAL.glas); for (let k = 0; k < d - 1; k++) p.px(x + w + k, yy - s2(k), PAL.glasD); }
    tuer(p, x + 1, y, '#3a4a5a');
    lichtband(p, x, y - h + 1, w, d, F[1]);
    flachdach(p, x, y, w, h, d, F[1], '#d8dcdc');
    return;
  }
  if (z === 6) {
    quader(p, x, y, w, h, d, '#8fb8d8', '#5a84a8');
    for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, w, 1, '#6a98c0');
    for (let yy = y - h + 2; yy < y; yy += 3) for (let k = 1; k < d - 1; k += 2) p.px(x + w + k, yy - s2(k), '#3e6488');
    p.linie(x + 1, y - h + 4, x + 3, y - h + 2, '#d8f0ff');
    lichtband(p, x, y - h + 1, w, d, F[1]);
    flachdach(p, x, y, w, h, d, F[1], '#c8d8e8');
    return;
  }
  // Zukunft (7..10)
  const M = ZMAT[z], L = o.licht ?? dach;
  quader(p, x, y, w, h, d, M.wand, M.seite);
  for (let yy = y - h + 3; yy < y - 1; yy += 2) { p.rect(x + 1, yy, w - 2, 1, M.fe); for (let k = 1; k < d - 1; k++) p.px(x + w + k, yy - s2(k), M.feS); }
  if (z === 7) p.linie(x + 1, y - h + 4, x + 2, y - h + 3, M.glanz);
  lichtband(p, x, y - h + 1, w, d, L, z >= 8 ? hell(L, 0.5) : null);
  p.rect(x + Math.floor(w / 2), y - 1, 2, 2, z === 8 ? '#5a4a3a' : '#24405e');
  flachdach(p, x, y, w, h, d, z === 7 ? GRUEN[1] : M.seite, M.rand);
  if (z === 7) { busch(p, x + 2, y - h - 1); if (w > 6) busch(p, x + w - 1, y - h - 2); }
  if (z === 8) { const cx = x + (w + d) / 2 - 1; kuppel(p, cx, y - h - 2, Math.min(3, w / 2 - 1), 2.5, WEISS); band(p, cx - 4, cx + 4, y - h - 3, L, dunkel(L, 0.25)); }
  if (z === 9) { const ax = x + w - 1; p.rect(ax, y - h - 5, 1, 4, M.seite); p.px(ax, y - h - 6, M.glanz); }
  if (z === 10) { p.px(x, y - h + 1, M.glanz).px(x + w - 1, y - h + 1, M.fe); }
}

// ---------- Boden ----------
const BX = 32, BY = 45.5, BRX = 16, BRY = 6;
/** y-Koordinate der Vorderkante der Bodenellipse. */
const randY = (x, rx = BRX, ry = BRY) => { const t = (x - BX) / rx; return BY + ry * Math.sqrt(Math.max(0, 1 - t * t)); };
/** Fundament: flacher Platz in Zeitalterfarbe, leicht in Distriktfarbe getönt, mit Wegen und Randsteinen in der Distriktfarbe. */
function bodenLand(p, z, farbe) {
  const B = BODEN[z], s = stufe(z);
  p.ellipse(BX, BY + 0.5, BRX + 1, BRY + 1, B[2]);
  p.ellipse(BX, BY, BRX, BRY, B[0]);
  p.ellipse(BX - 1, BY - 0.5, BRX - 3, BRY - 2, mische(B[1], farbe, 0.12));
  for (let i = 0; i < 22; i++) { const xx = BX + Math.round(Math.sin(i * 2.3) * BRX * 0.8), yy = BY + Math.round(Math.cos(i * 1.7) * BRY * 0.65); p.px(xx, yy, B[2]); }
  // kleine Wege (Kreuzung), je Stufe anders belegt
  const weg = s === 0 ? dunkel(B[1], 0.12) : s === 1 ? hell(B[1], 0.25) : s === 2 ? '#5a5e62' : hell(B[1], 0.3);
  p.linie(BX - BRX + 3, BY + 2, BX + BRX - 3, BY - 1, weg).linie(BX - BRX + 4, BY + 2, BX + BRX - 2, BY - 1, weg);
  p.linie(BX - 2, BY - BRY + 1, BX + 1, BY + BRY - 1, weg);
  if (s === 2) for (let x = BX - BRX + 5; x < BX + BRX - 3; x += 3) p.px(x, Math.round(BY + 2 - (x - BX + BRX - 3) * 3 / (2 * BRX - 6)), '#c8c4a0');
  if (s === 3) for (let x = BX - BRX + 4; x < BX + BRX - 3; x += 2) p.px(x, Math.round(BY + 2 - (x - BX + BRX - 3) * 3 / (2 * BRX - 6)), hell(farbe, 0.4));
  // Randmarken in der Distriktfarbe (vorne)
  for (let x = BX - BRX + 2; x <= BX + BRX - 2; x += 3) {
    const y = Math.round(randY(x)) + 1;
    p.px(x, y, farbe).px(x + 1, y, dunkel(farbe, 0.3));
  }
}

// ======================================================================
// Campus (blau): Hörsäle, Sternwarte mit Kuppel, später Radioteleskop und Glaslabor.
// ======================================================================
function sternwarte(p, cx, by, r, F, spalt = '#2a3040') {
  kuppel(p, cx, by, r, r * 0.95, F);
  for (let yy = Math.round(by - r) + 1; yy <= by - 1; yy++) if (p.hole(cx + 1, yy)) p.px(cx + 1, yy, spalt);
  p.linie(cx + 1, Math.round(by - r) + 2, cx + 4, Math.round(by - r) - 2, '#4a4e5a');
  p.px(cx + 4, Math.round(by - r) - 2, '#8a8e9a');
}
/** Radioteleskop: Schüssel nach links oben gekippt auf Gittermast (x/y = Fuß). */
function schuessel(p, x, y, gr = 1, F = ['#ffffff', '#e4e8ee', '#b4bcc8', '#7a8494']) {
  const r = 3 + gr;
  p.linie(x - 2, y, x, y - 3, STAHL[2]).linie(x + 2, y, x, y - 3, STAHL[3]);
  p.rect(x, y - 4, 1, 4, STAHL[1]);
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const u = (xx + yy) / 1.41, v = (xx - yy) / 1.41;
    if ((u * u) / (r * r) + (v * v) / ((r * 0.45) ** 2) > 1) continue;
    p.px(x + xx, y - 4 - r + yy, v < -0.3 ? F[0] : v < 0.6 ? F[1] : F[2]);
  }
  p.linie(x, y - 4 - r, x - 2 - gr, y - 6 - r - gr, F[3]); p.px(x - 2 - gr, y - 6 - r - gr, '#e83a2a');
}
function campus(p, z) {
  const s = stufe(z), C = FARBE.campus, CF = toene(C);
  if (s === 0) {
    // Steinkreis zur Sternbeobachtung hinten rechts
    teil(p, (q) => {
      for (const [x, y, h] of [[35, 42, 4], [38, 41, 5], [41, 41, 5], [44, 43, 4]]) { q.rect(x, y - h + 1, 2, h, STEIN[1]); q.rect(x + 1, y - h + 1, 1, h, STEIN[2]); q.px(x, y - h + 1, STEIN[0]); }
      q.rect(38, 37, 5, 1, STEIN[1]); q.px(42, 37, STEIN[2]);
    });
    teil(p, (q) => haus(q, 17, 46, 10, 5, z, C));
    if (z === 1) teil(p, (q) => { zylinder(q, 30, 45, 5, 9, STEIN, false); q.rect(32, 40, 1, 2, '#3a3040'); kegel(q, 32, 36, 3, 4, CF); q.px(32, 31, PAL.gold); });
    // Schreibtafeln / Pult vorne
    teil(p, (q) => haus(q, 27, 51, 7, 4, z, C, { rh: 3 }));
    teil(p, (q) => { q.rect(38, 47, 4, 3, '#3a4a3a'); q.rect(38, 47, 4, 1, '#8a5a2b'); q.px(39, 48, '#e8e8d8').px(40, 49, '#e8e8d8'); q.rect(38, 50, 1, 1, '#5a3a1a').rect(41, 50, 1, 1, '#5a3a1a'); });
    teil(p, (q) => fahne(q, 45, 50, 13, 4));
    return;
  }
  if (s === 1) {
    // Sternwarte: Rundturm mit blauer Kuppel hinten rechts
    teil(p, (q) => {
      zylinder(q, 34, 44, 8, 9, STEIN, false);
      for (let yy = 37; yy < 44; yy += 3) q.px(36, yy, '#3a3040').px(39, yy + 1, '#3a3040');
      q.rect(33, 35, 10, 1, STEIN[0]); q.px(42, 35, STEIN[2]);
      sternwarte(q, 37.5, 34, 4.5, CF);
    });
    // Hörsaal mit Säulenfront und blauem Giebeldach
    teil(p, (q) => {
      const x = 16, y = 47, w = 12, h = 7;
      q.rect(x - 1, y - 1, w + 2, 2, '#d8d0bc');
      quader(q, x, y - 1, w, h, 4, '#7a6e5c', '#c4b8a0');
      for (let k = x; k < x + w; k += 2) q.rect(k, y - h, 1, h - 1, '#f8f4ea');
      q.rect(x, y - h - 1, w, 1, '#ece4d2');
      giebeldach(q, x, y - 1, w, h, 4, CF, '#f4ecdc', '#c4b8a0', 4);
    });
    teil(p, (q) => haus(q, 27, 51, 7, 5, z, C, { giebel: true }));
    teil(p, (q) => { baum(q, 15, 50, 2); baum(q, 41, 51, 1.5); });
    teil(p, (q) => fahne(q, 46, 48, 12, 4));
    return;
  }
  if (s === 2) {
    // Universität: breiter Bau mit Mittelturm
    teil(p, (q) => {
      haus(q, 15, 46, 13, z === 4 ? 7 : 8, z, C);
      if (z === 4) { q.rect(20, 33, 3, 6, '#9c4a32'); q.rect(22, 33, 1, 6, '#6e3122'); q.px(21, 35, '#e8c860'); zeltdach(q, 20, 33, 3, 0, 1, 4, CF); }
    });
    // Sternwarte: weiße Kuppel auf hellem Sockel
    teil(p, (q) => {
      const W = z === 4 ? STEIN : BETON;
      zylinder(q, 33, 44, 9, 5, W, false);
      q.rect(33, 41, 9, 1, CF[1]); q.px(41, 41, CF[2]).px(40, 41, CF[2]);
      sternwarte(q, 37, 39, 5, z === 6 ? WEISS : ['#e4e8ec', '#c4c8cc', '#94989c', '#6a6e72']);
    });
    if (z >= 5) teil(p, (q) => schuessel(q, 43, 50, z === 6 ? 1 : 0));
    else teil(p, (q) => { baum(q, 42, 50, 2); });
    teil(p, (q) => haus(q, 24, 51, 8, 5, z, C));
    teil(p, (q) => fahne(q, 15, 50, 12, 4, '#5a5e60'));
    return;
  }
  // Zukunft: Glaslaborturm mit blauen Lichtbändern, große Kuppel, Schüssel
  const M = ZMAT[z];
  teil(p, (q) => {
    const x = 17, y = 46, w = 7, h = 15;
    quader(q, x, y, w, h, 4, M.wand, M.seite);
    for (let yy = y - h + 2; yy < y; yy += 3) lichtband(q, x, yy, w, 4, C, hell(C, 0.5));
    q.linie(x + 1, y - h + 4, x + 3, y - h + 2, M.glanz);
    flachdach(q, x, y, w, h, 4, M.seite, M.rand);
    if (z === 10) { q.poly([[x + 2, y - h - 1], [x + 6, y - h - 3], [x + 4, y - h - 8]], '#e6eef7'); q.linie(x + 4, y - h - 8, x + 6, y - h - 3, '#94ace0'); q.px(x + 4, y - h - 9, '#9ff0ff'); }
  });
  teil(p, (q) => {
    const cx = 37, by = 44;
    q.rect(31, by - 1, 13, 3, M.seite); q.rect(31, by - 1, 13, 1, M.rand);
    kuppel(q, cx, by - 2, 6.5, 6, z === 9 ? ['#e0e4ee', '#aab0c2', '#7e8498', '#575c72'] : WEISS);
    band(q, cx - 7, cx + 7, by - 4, C, dunkel(C, 0.3), hell(C, 0.5));
    for (let yy = by - 8; yy <= by - 5; yy++) if (q.hole(cx + 1, yy)) q.px(cx + 1, yy, '#2a3040');
    q.linie(cx + 1, by - 7, cx + 5, by - 12, '#5a6070'); q.px(cx + 5, by - 12, M.glanz);
  });
  teil(p, (q) => haus(q, 23, 51, 7, 5, z, C));
  teil(p, (q) => schuessel(q, 44, 51, 0));
  teil(p, (q) => fahne(q, 14, 50, 12, 4, '#7a828c'));
}

// ======================================================================
// Heiligtum (weiß/gold): Schrein im Hain, Säulentempel, Kathedrale, Lichtkuppel.
// ======================================================================
const GOLD = ['#ffe680', '#f1c40f', '#b8930a', '#7a6206'];
function heiligtum(p, z) {
  const s = stufe(z), C = FARBE.heiligtum;
  if (s === 0) {
    teil(p, (q) => { baum(q, 20, 43, 3.5); baum(q, 42, 42, 3); });
    // Steinkreis mit Altar
    teil(p, (q) => {
      for (const [x, y, h] of [[25, 44, 5], [36, 44, 5], [23, 48, 4], [39, 48, 4]]) { q.rect(x, y - h + 1, 2, h, STEIN[1]); q.rect(x + 1, y - h + 1, 1, h, STEIN[2]); q.px(x, y - h + 1, STEIN[0]); }
    });
    // Schrein: kleines Lehmhaus mit goldenem Dach
    teil(p, (q) => {
      const x = 28, y = 45, w = 7, h = 5;
      quader(q, x, y, w, h, 3, z === 0 ? '#c8a070' : '#ece4d2', z === 0 ? '#9a7448' : '#c4b8a0');
      q.rect(x + 2, y - 3, 3, 4, '#3a2414'); q.px(x + 3, y - 2, '#ffd27a');
      zeltdach(q, x, y, w, h, 3, 6, GOLD); q.px(x + 4, y - h - 7, '#ffffff').px(x + 4, y - h - 8, GOLD[0]);
    });
    // Opferfeuer
    teil(p, (q) => { q.rect(30, 49, 4, 1, STEIN[2]); q.px(31, 48, '#f39c12').px(32, 48, '#e8501a').px(31, 47, '#ffd040').px(32, 46, '#f39c12'); });
    teil(p, (q) => banner(q, 45, 50, 12, C, 4));
    teil(p, (q) => fahne(q, 16, 50, 11, 4));
    return;
  }
  if (s === 1) {
    teil(p, (q) => { zypresse(q, 17, 44, 9); zypresse(q, 46, 44, 8); });
    // Säulentempel: weiß mit goldenem Giebel
    teil(p, (q) => {
      const x = 23, y = 46, w = 13, h = 8, d = 4;
      q.rect(x - 2, y - 1, w + 4, 2, '#d8d0bc'); q.rect(x - 1, y - 2, w + 2, 1, '#f4ecdc');
      for (let i = 0; i < d + 2; i++) q.rect(x + w + 2 + i, y - s2(i) - 1, 1, 2, '#b4a890');
      quader(q, x, y - 2, w, h, d, '#7a6e5c', '#d4c8b0');
      for (let k = x; k < x + w; k += 2) { q.rect(k, y - 1 - h, 1, h, '#ffffff'); q.px(k, y - 2, '#d8d0bc'); }
      q.rect(x - 1, y - 2 - h, w + 2, 2, '#f4ecdc'); q.rect(x - 1, y - 1 - h, w + 2, 1, GOLD[1]);
      giebeldach(q, x - 1, y - 3, w + 2, h, d, z === 3 ? GOLD : toene(C), '#ffffff', '#d4c8b0', 5);
      q.px(x + 6, y - h - 6, GOLD[1]).px(x + 6, y - h - 5, GOLD[2]);
    });
    teil(p, (q) => { baum(q, 20, 51, 2.5); baum(q, 42, 51, 2); busch(q, 26, 51); busch(q, 37, 51); });
    teil(p, (q) => fahne(q, 47, 49, 11, 4));
    return;
  }
  if (s === 2) {
    // Kathedrale: weißes Schiff, Westturm mit goldener Spitze, Rosette
    teil(p, (q) => { baum(q, 16, 46, 3); baum(q, 46, 45, 2.5); });
    teil(p, (q) => {
      const x = 27, y = 45, w = 10, h = 9;
      quader(q, x, y, w, h, 5, '#f0ece0', '#c8c0ac');
      for (let k = x + 1; k < x + w; k += 3) q.rect(k, y - h + 3, 1, 4, z >= 6 ? '#6a98c0' : '#4a5a8a');
      satteldach(q, x, y, w, h, 5, 6, z >= 5 ? toene('#c8ccd0') : toene(C), '#c8c0ac');
    });
    teil(p, (q) => {
      const tx = 21, y = 47, th = 17;
      quader(q, tx, y, 6, th, 3, '#f8f4ea', '#d0c8b4');
      q.kreis(tx + 2.5, y - th + 6, 1.5, '#4a5a8a'); q.px(tx + 2, y - th + 5, GOLD[0]).px(tx + 3, y - th + 7, '#c0392b');
      q.rect(tx + 2, y - 3, 2, 4, '#5a3a2a');
      q.rect(tx, y - th + 1, 6, 1, GOLD[1]);
      zeltdach(q, tx, y, 6, th, 3, 9, GOLD);
      q.px(tx + 4, y - th - 11, GOLD[1]).px(tx + 4, y - th - 12, GOLD[1]).px(tx + 3, y - th - 11, GOLD[1]).px(tx + 5, y - th - 11, GOLD[1]);
    });
    teil(p, (q) => { busch(q, 33, 50); baum(q, 39, 51, 2); busch(q, 18, 51); });
    teil(p, (q) => fahne(q, 44, 50, 13, 4, '#5a5e60'));
    return;
  }
  // Zukunft: weißer Rundtempel mit goldener Kuppel und Lichtsäule
  teil(p, (q) => { baum(q, 17, 45, 3, z === 10 ? ['#c4f4ff', '#86d8ee', '#4ab8d8', '#2a7898'] : GRUEN); baum(q, 47, 45, 2.5, z === 10 ? ['#c4f4ff', '#86d8ee', '#4ab8d8', '#2a7898'] : GRUEN); });
  // Lichtsäule (ohne Umriss, leicht)
  for (let yy = 4; yy < 30; yy++) { p.px(32, yy, yy % 3 ? '#fff6c8' : '#ffffff'); if (yy > 12) p.px(33, yy, '#ffe680'); }
  teil(p, (q) => {
    const x0 = 24, y = 47, w = 17;
    q.ellipse(32, y, 9, 2, '#d3cfc6'); q.ellipse(32, y - 1, 9, 2, '#ffffff');
    for (let k = 0; k < 7; k++) { const xx = x0 + 1 + k * 2.4; q.rect(Math.round(xx), y - 9, 1, 8, k > 4 ? '#d3cfc6' : '#ffffff'); }
    q.rect(x0 + 1, y - 10, w - 2, 2, '#f1efe8'); q.rect(x0 + 1, y - 9, w - 2, 1, z >= 8 ? '#ffd27a' : GOLD[1]);
    kuppel(q, 32, y - 11, 7, 6.5, GOLD);
    band(q, 24, 40, y - 14, '#ffffff', '#d3cfc6');
    q.px(32, y - 19, '#ffffff').px(32, y - 20, GOLD[0]);
  });
  if (z >= 9) teil(p, (q) => { ring(q, 32, 18, 6, 1.5, '#ffe680', 'ganz', '#e8c23a'); });
  teil(p, (q) => { busch(q, 22, 51); busch(q, 41, 51); });
  teil(p, (q) => fahne(q, 46, 51, 12, 4, '#a8a49c'));
}

// ======================================================================
// Handelsplatz (gelb): Marktstände mit Markisen, Bank mit Säulen, später Börse und Handelsturm.
// ======================================================================
/** Marktstand mit gestreifter Markise (x/y = vorne links unten). */
function stand(p, x, y, w, c, c2 = '#f4f1ea', ware = ['#c0392b', '#e8a020', '#5aa84f']) {
  p.rect(x, y - 2, w, 2, '#8a5a2b'); p.rect(x, y - 2, w, 1, '#b07a42');
  for (let i = 1; i < w - 1; i++) p.px(x + i, y - 3, ware[i % ware.length]);
  p.rect(x, y - 6, 1, 4, '#5a3a1a'); p.rect(x + w - 1, y - 6, 1, 4, '#5a3a1a');
  for (let j = 0; j < 3; j++) for (let i = -1; i <= w; i++) p.px(x + i + (2 - j), y - 7 - j, ((i + 6) >> 1) % 2 ? c2 : c);
  for (let i = -1; i <= w; i++) if (i % 2 === 0) p.px(x + i, y - 6, ((i + 6) >> 1) % 2 ? dunkel(c2, 0.15) : dunkel(c, 0.2));
}
function fass(p, x, y) { p.rect(x, y - 2, 2, 3, '#8a5a2b'); p.px(x + 1, y - 2, '#5a3a1a').px(x + 1, y, '#5a3a1a'); p.rect(x, y - 1, 2, 1, '#4a3a2a'); }
function kiste(p, x, y) { p.rect(x, y - 1, 3, 2, '#b07a42'); p.px(x + 2, y - 1, '#8a5a2b').px(x + 2, y, '#8a5a2b'); p.px(x + 1, y, '#5a3a1a'); }
function handelsplatz(p, z) {
  const s = stufe(z), C = FARBE.handelsplatz, CF = toene(C);
  if (s === 0) {
    teil(p, (q) => haus(q, 30, 44, 10, 5, z, C)); // Lagerhaus hinten
    teil(p, (q) => stand(q, 18, 46, 6, C));
    teil(p, (q) => stand(q, 25, 50, 6, z === 0 ? '#c0603a' : C, '#f4f1ea', ['#f1c40f', '#8a5a2b', '#e8dcc0']));
    teil(p, (q) => stand(q, 35, 51, 5, C, z === 0 ? '#d8b070' : '#f4f1ea', ['#c0392b', '#8fc3e0']));
    teil(p, (q) => { fass(q, 15, 50); kiste(q, 43, 47); fass(q, 44, 50); });
    teil(p, (q) => fahne(q, 46, 46, 11, 4));
    return;
  }
  if (s === 1) {
    // Bank mit Säulen hinten
    teil(p, (q) => {
      const x = 27, y = 44, w = 12, h = 7;
      q.rect(x - 1, y - 1, w + 2, 2, '#d8d0bc');
      quader(q, x, y - 1, w, h, 4, '#6a5e4c', '#d0c4a8');
      for (let k = x + 1; k < x + w; k += 2) q.rect(k, y - h, 1, h - 1, '#fffaf0');
      q.rect(x, y - h - 1, w, 1, '#ece4d2');
      giebeldach(q, x, y - 1, w, h, 4, CF, '#fff6e0', '#d0c4a8', 4);
      q.px(x + 6, y - h - 3, GOLD[2]).px(x + 5, y - h - 2, GOLD[0]);
    });
    teil(p, (q) => haus(q, 15, 47, 8, 6, z, C, { giebel: z === 2 }));
    teil(p, (q) => stand(q, 22, 51, 6, C));
    teil(p, (q) => stand(q, 32, 51, 6, C, '#c0603a', ['#f1c40f', '#e8dcc0']));
    teil(p, (q) => { fass(q, 41, 50); kiste(q, 43, 48); });
    teil(p, (q) => fahne(q, 46, 46, 12, 4));
    return;
  }
  if (s === 2) {
    // Börse/Bank: Säulenfront vor Backstein- bzw. Betonbau, gelbes Dach
    teil(p, (q) => haus(q, 33, 43, 9, z === 4 ? 8 : 12, z, C));
    teil(p, (q) => {
      const x = 17, y = 47, w = 13, h = 8;
      q.rect(x - 1, y - 1, w + 2, 2, '#d8d4c8');
      quader(q, x, y - 1, w, h, 4, '#5a5448', z === 4 ? '#b8b0a0' : '#a8acae');
      for (let k = x + 1; k < x + w; k += 2) q.rect(k, y - h, 1, h - 1, '#f8f6f0');
      q.rect(x, y - h - 1, w, 2, '#e8e4dc');
      giebeldach(q, x, y - 1, w, h + 1, 4, CF, '#f8f4e8', '#b8b0a0', 4);
      q.kreis(x + 6, y - h - 3, 1, GOLD[1]);
    });
    if (z === 4) teil(p, (q) => { stand(q, 31, 51, 6, C); });
    else teil(p, (q) => { // Kiosk mit gelber Markise und Anzeigetafel
      quader(q, 31, 51, 7, 4, 3, '#e8e8e8', '#b8b8b8'); q.rect(32, 49, 5, 1, '#2a3040'); q.px(33, 49, '#4ae04a').px(35, 49, '#e84a3a');
      for (let i = 0; i < 8; i++) q.px(30 + i, 47, i % 2 ? '#f4f1ea' : C); q.rect(30, 46, 8, 1, C);
    });
    teil(p, (q) => { kiste(q, 41, 50); kiste(q, 43, 48); });
    teil(p, (q) => fahne(q, 14, 50, 12, 4, '#5a5e60'));
    return;
  }
  // Zukunft: Handelsturm mit gelben Lichtbändern, schwebendes Goldsymbol, Holo-Stände
  const M = ZMAT[z];
  teil(p, (q) => {
    const x = 27, y = 45, w = 8, h = 17;
    quader(q, x, y, w, h, 4, M.wand, M.seite);
    for (let yy = y - h + 2; yy < y - 1; yy += 2) { q.rect(x + 1, yy, w - 2, 1, M.fe); for (let k = 1; k < 3; k++) q.px(x + w + k, yy - s2(k), M.feS); }
    for (let yy = y - h + 1; yy < y; yy += 5) lichtband(q, x, yy, w, 4, C, hell(C, 0.5));
    flachdach(q, x, y, w, h, 4, M.seite, M.rand);
  });
  // schwebende Goldmünze über dem Turm
  teil(p, (q) => { q.ellipse(33, 20, 2.5, 3, GOLD[1]); q.rect(33, 18, 1, 5, GOLD[2]); q.px(32, 18, GOLD[0]).px(31, 19, GOLD[0]); q.px(34, 22, GOLD[3]); });
  p.px(33, 25, hell(C, 0.5)).px(33, 26, C);
  teil(p, (q) => haus(q, 16, 47, 8, 7, z, C));
  teil(p, (q) => { // Holo-Stände
    for (const x of [21, 32]) {
      q.rect(x, 48, 7, 3, M.wand); q.rect(x, 48, 7, 1, M.rand); q.rect(x + 5, 48, 2, 3, M.seite);
      q.rect(x + 1, 44, 1, 4, M.seite); q.rect(x + 5, 44, 1, 4, M.seite);
      q.rect(x + 2, 45, 3, 3, hell(C, 0.55)); q.px(x + 3, 46, '#ffffff'); // Hologramm
      q.rect(x - 1, 42, 9, 2, C); q.rect(x - 1, 42, 9, 1, hell(C, 0.35)); for (let i = 0; i < 9; i += 2) q.px(x - 1 + i, 44, dunkel(C, 0.2));
    }
  });
  teil(p, (q) => fahne(q, 46, 48, 12, 4, '#7a828c'));
}

// ======================================================================
// Industriezone (grau): Werkstatt mit Esse, Mühle, Werkhallen mit Schornsteinen, saubere Zukunftsfabrik.
// ======================================================================
/** Material der Militärbauten in der Zukunft: im KI-Zeitalter panzergrau statt Glas. */
const milMat = (z) => (z === 7 ? { wand: '#8a909a', seite: '#5c626c', fe: '#3a3e48', feS: '#2a2e36', rand: '#b4bac4', glanz: '#ff8a6a' } : ZMAT[z]);
const SCHIEFER = (z) => toene(z <= 1 ? '#8a8a8a' : FARBE.industriezone);
function schornstein(p, x, y, h, c = '#7a3626', ch = '#9c4a32') {
  p.rect(x, y - h, 2, h, c); p.rect(x, y - h, 1, h, ch); p.rect(x - 1, y - h, 4, 1, dunkel(c, 0.3));
  for (let yy = y - h + 3; yy < y; yy += 4) p.rect(x, yy, 2, 1, dunkel(c, 0.3));
}
/** Werkhalle mit Sheddach (Sägezahn) in Grau. */
function werkhalle(p, x, y, w, h, z, wand, seite) {
  const d = 4;
  quader(p, x, y, w, h, d, wand, seite);
  if (z === 4) for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + w; xx += 3) p.px(xx, yy, dunkel(wand, 0.12));
  fenster(p, x, y, w, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
  p.rect(x + 2, y - 3, 3, 4, '#3a3a40');
  const F = SCHIEFER(z);
  for (let k = 0; k < w; k += 4) { p.poly([[x + k, y - h], [x + k + 3, y - h - 3], [x + k + 3, y - h]], F[1]); p.linie(x + k + 3, y - h - 3, x + k + 3, y - h, '#a8c8e0'); p.px(x + k, y - h, F[0]); }
  for (let i = 0; i < d; i++) p.px(x + w + i, y - h - s2(i), F[2]);
  p.rect(x, y - h, w, 1, F[3]);
}
function industriezone(p, z) {
  const s = stufe(z), C = FARBE.industriezone, CF = SCHIEFER(z);
  if (s === 0) {
    // Holzstapel und Steinhaufen hinten
    teil(p, (q) => { for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) { q.kreis(37 + i * 2 + j, 42 - j * 2, 1, '#8a5a2b'); q.px(37 + i * 2 + j, 42 - j * 2, '#c8a070'); } });
    // Werkstatt mit Esse
    teil(p, (q) => {
      const x = 18, y = 46, w = 11, h = 5;
      quader(q, x, y, w, h, 4, z === 0 ? '#9a7a5a' : '#b4aea2', z === 0 ? '#6a5038' : '#8a8478');
      q.rect(x + 2, y - 3, 3, 4, '#2a1a10'); q.px(x + 3, y - 1, '#f39c12').px(x + 2, y - 1, '#e8501a');
      satteldach(q, x, y, w, h, 4, 4, CF, z === 0 ? '#6a5038' : '#8a8478');
      schornstein(q, x + 8, y - h - 1, 5, '#6a645c', '#8a847a');
    });
    rauch(p, 27, 33, 3);
    // Amboss und Steinblöcke vorne
    teil(p, (q) => { q.rect(31, 49, 4, 1, '#3a3a40'); q.rect(32, 50, 2, 1, '#3a3a40'); q.rect(31, 51, 4, 1, '#5a3a1a'); q.px(30, 49, '#5a5a62'); });
    teil(p, (q) => { q.rect(37, 49, 3, 2, STEIN[1]); q.rect(40, 50, 3, 2, STEIN[2]); q.px(37, 49, STEIN[0]); });
    teil(p, (q) => haus(q, 22, 51, 6, 4, z, C, { rh: 3 }));
    teil(p, (q) => fahne(q, 45, 49, 12, 4));
    return;
  }
  if (s === 1) {
    // Wassermühle/Hammerwerk: Steinhaus mit großem Wasserrad
    teil(p, (q) => {
      const x = 17, y = 46, w = 11, h = 8;
      quader(q, x, y, w, h, 4, z === 2 ? '#a8a296' : '#d4c4a0', z === 2 ? '#7e786e' : '#a8987a');
      for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 2 ? 0 : 1); xx < x + w; xx += 3) q.px(xx, yy, z === 2 ? '#928c80' : '#bcae90');
      q.rect(x + 2, y - h + 3, 1, 2, '#3a3a40').rect(x + 6, y - h + 3, 1, 2, '#3a3a40');
      q.rect(x + 4, y - 3, 2, 4, '#3a2414');
      satteldach(q, x, y, w, h, 4, 5, CF, z === 2 ? '#7e786e' : '#a8987a');
    });
    teil(p, (q) => { // Wasserrad links
      q.kreis(15, 45, 4, '#6a4420'); q.kreis(15, 45, 2.5, '#3a2414'); q.kreis(15, 45, 1, '#8a5a2b');
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; q.px(15 + Math.cos(a) * 4, 45 + Math.sin(a) * 4, '#b07a42'); }
      q.rect(11, 49, 9, 1, '#3d7fc4'); q.px(12, 49, '#8fc0ee').px(16, 49, '#8fc0ee');
    });
    teil(p, (q) => { // Schmiede mit Schlot hinten rechts
      quader(q, 33, 44, 8, 6, 4, '#8a8478', '#625c52');
      q.rect(35, 41, 3, 3, '#2a1a10'); q.px(36, 43, '#f39c12');
      satteldach(q, 33, 44, 8, 6, 4, 3, CF, '#625c52');
      schornstein(q, 39, 35, 9, '#6a645c', '#8a847a');
    });
    rauch(p, 40, 24, 3, 1);
    teil(p, (q) => haus(q, 26, 51, 7, 5, z, C));
    teil(p, (q) => { kiste(q, 36, 50); fass(q, 40, 50); });
    teil(p, (q) => fahne(q, 46, 49, 12, 4));
    return;
  }
  if (s === 2) {
    const W = z === 4 ? ['#9c4a32', '#6e3122'] : z === 5 ? ['#b4b8ba', '#868a8c'] : ['#a8b4c0', '#76828e'];
    teil(p, (q) => werkhalle(q, 16, 46, 13, 7, z, W[0], W[1]));
    if (z === 6) { // Kühlturm
      teil(p, (q) => {
        const x = 38, y = 44, h = 12;
        for (let j = 0; j < h; j++) { const t = j / h, hw = Math.round(4.5 - Math.sin(t * Math.PI * 0.85) * 1.6 + t * 0.6); for (let i = -hw; i <= hw; i++) q.px(x + i, y - j, i < -hw / 3 ? '#d4d8da' : i > hw / 3 ? '#8e9294' : '#b4b8ba'); }
        q.rect(x - 3, y - h, 7, 1, '#6a6e70'); q.rect(x - 4, y - 3, 9, 1, CF[1]);
      });
      rauch(p, 38, 29, 3, 0, true);
    } else { // Silos
      teil(p, (q) => { zylinder(q, 34, 44, 5, 11, z === 4 ? STEIN : BETON); zylinder(q, 39, 44, 5, 9, z === 4 ? STEIN : BETON); q.rect(34, 37, 5, 1, CF[2]); q.rect(39, 39, 5, 1, CF[2]); q.linie(38, 33, 41, 35, STAHL[2]); });
    }
    teil(p, (q) => { schornstein(q, 30, 46, 22, z === 4 ? '#7a3626' : '#8a8e90', z === 4 ? '#9c4a32' : '#b4b8ba'); q.rect(30, 30, 2, 1, z === 4 ? '#e8e0d0' : '#e83a2a'); q.rect(30, 34, 2, 1, z === 4 ? '#e8e0d0' : '#f4f1ea'); });
    rauch(p, 31, 21, z === 4 ? 4 : 3, 1, z >= 5);
    teil(p, (q) => haus(q, 20, 51, 8, 4, z, C));
    teil(p, (q) => { kiste(q, 33, 50); kiste(q, 35, 48); q.rect(38, 49, 5, 2, '#4a525c'); q.rect(38, 49, 5, 1, '#e8c040'); });
    teil(p, (q) => fahne(q, 46, 49, 12, 4, '#5a5e60'));
    return;
  }
  // Zukunft: saubere Fabrik mit Roboterarm, Energieturm, weißer Dampf
  const M = ZMAT[z];
  teil(p, (q) => {
    const x = 15, y = 46, w = 14, h = 7;
    quader(q, x, y, w, h, 4, M.wand, M.seite);
    for (let yy = y - h + 3; yy < y - 1; yy += 2) q.rect(x + 1, yy, w - 2, 1, M.fe);
    lichtband(q, x, y - h + 1, w, 4, '#c8ccd0', M.glanz);
    q.rect(x + 3, y - 2, 4, 3, '#3a4458');
    // gewölbtes Dach in Grau
    for (let k = 0; k < 3; k++) q.rect(x + k, y - h - k, w + 2, 1, k === 2 ? '#c8ccd0' : k === 1 ? '#a8acae' : '#86898c');
    for (let i = 0; i < 4; i++) q.px(x + w + i + 1, y - h - 2 - s2(i), '#86898c');
  });
  teil(p, (q) => { // Energieturm
    const x = 36, y = 44;
    zylinder(q, x, y, 6, 14, z === 8 ? WEISS : z === 9 ? ['#e0e4ee', '#aab0c2', '#7e8498', '#575c72'] : BETON);
    for (let yy = y - 11; yy < y; yy += 3) band(q, x, x + 5, yy, M.fe, M.feS);
    q.kreis(x + 2.5, y - 16, 2.5, M.glanz); q.kreis(x + 2.5, y - 16, 1.5, '#ffffff');
    ring(q, x + 2.5, y - 16, 5, 1.3, '#c8ccd0', 'vorne');
  });
  rauch(p, 25, 34, 3, 0, true);
  teil(p, (q) => { // Roboterarm
    q.rect(31, 49, 4, 2, '#5a6070'); q.rect(32, 46, 2, 3, '#e8c040'); q.linie(33, 46, 36, 43, '#e8c040'); q.linie(36, 43, 38, 45, '#e8c040'); q.px(38, 46, '#3a3e52').px(39, 46, '#3a3e52');
  });
  teil(p, (q) => haus(q, 21, 51, 7, 4, z, C, { licht: '#c8ccd0' }));
  teil(p, (q) => fahne(q, 46, 49, 12, 4, '#7a828c'));
}

// ======================================================================
// Theaterplatz (rot/orange): Bühne mit Sitzrängen, Amphitheater, Oper/Museum, Konzertmuschel.
// ======================================================================
/** Sitzränge im Halbrund hinter der Bühne (cx, cy = Mitte, n = Reihen). */
function raenge(p, cx, cy, rx, n, c, cd) {
  for (let r = 0; r < n; r++) {
    const rr = rx - r * 1.6, yy = cy - r * 1.4;
    for (let x = -rr; x <= rr; x += 0.5) {
      const t = x / rr, y = yy - Math.sqrt(Math.max(0, 1 - t * t)) * (rr * 0.42);
      p.px(cx + x, y, r % 2 ? c : cd); p.px(cx + x, y + 1, dunkel(cd, 0.2));
    }
  }
}
function theaterplatz(p, z) {
  const s = stufe(z), C = FARBE.theaterplatz, CF = toene(C);
  if (s === 0) {
    // Holzbühne mit orangem Vorhang, Zuschauerbänke im Halbrund
    teil(p, (q) => {
      const x = 23, y = 44, w = 14;
      q.rect(x, y - 3, w, 4, '#8a5a2b'); q.rect(x, y - 3, w, 1, '#b07a42');
      for (let k = x; k < x + w; k += 3) q.px(k, y - 1, '#5a3a1a');
      q.rect(x, y - 12, 1, 9, '#5a3a1a'); q.rect(x + w - 1, y - 12, 1, 9, '#5a3a1a');
      q.rect(x - 1, y - 13, w + 2, 2, CF[1]); q.rect(x - 1, y - 13, w + 2, 1, CF[0]);
      for (let k = x + 1; k < x + w - 1; k++) { if (k < x + 4 || k > x + w - 5) q.rect(k, y - 11, 1, 7, (k % 2) ? CF[1] : CF[2]); }
      q.px(x + 7, y - 5, '#e8b58a').px(x + 7, y - 4, CF[2]).px(x + 6, y - 6, '#4a3020');
      // Masken über der Bühne
      q.px(x + 6, y - 15, '#f4f1ea').px(x + 7, y - 15, '#f4f1ea').px(x + 8, y - 15, '#f1c40f');
    });
    teil(p, (q) => { for (const [x, y, w] of [[17, 48, 6], [25, 50, 10], [37, 48, 6]]) { q.rect(x, y, w, 1, '#a8743c'); q.px(x, y + 1, '#5a3a1a').px(x + w - 1, y + 1, '#5a3a1a'); } });
    teil(p, (q) => { banner(q, 16, 46, 10, C, 4); banner(q, 44, 46, 10, C, 4); });
    teil(p, (q) => fahne(q, 46, 51, 12, 4));
    return;
  }
  if (s === 1) {
    // Amphitheater aus Stein (Halbrund) mit Bühnenhaus in Orange
    teil(p, (q) => {
      const cx = 32, cy = 46, W = z === 2 ? STEIN : ['#ece0c4', '#d4c4a0', '#a8987a', '#7a6c52'];
      // Außenwand mit Arkaden (hintere Halbellipse, 5 px hoch)
      for (let x = -15; x <= 15; x++) {
        const t = x / 15.5, yo = Math.round(cy - 1 - Math.sqrt(Math.max(0, 1 - t * t)) * 6);
        for (let j = 0; j < 5; j++) q.px(cx + x, yo - j, j === 4 ? W[0] : x > 8 ? W[2] : W[1]);
        if ((x + 15) % 3 === 1 && Math.abs(x) < 14) q.px(cx + x, yo - 2, W[3]).px(cx + x, yo - 1, W[3]);
      }
      // Sitzränge nach innen absteigend
      for (let r = 0; r < 4; r++) {
        const rx = 14 - r * 2.2, ry = 6 - r * 1.1, yy = cy - 1 + r * 0.6;
        for (let y = Math.floor(yy - ry - 4); y <= yy; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x - cx) / (rx + 0.5), dy = (y - yy + 4 - r) / (ry + 0.5);
          if (y > yy || dx * dx + dy * dy > 1 || y < yy - ry - 4 + r) continue;
          q.px(x, y, r % 2 ? W[0] : W[1]);
        }
      }
      for (let r = 1; r < 4; r++) ring(q, cx, cy - 1 + r * 0.6 - 4 + r, 14 - r * 2.2 + 1, 6 - r * 1.1 + 0.6, W[2], 'hinten');
      q.ellipse(cx, cy, 5, 1.6, '#d8c08a'); q.ellipse(cx - 1, cy - 0.4, 3, 0.8, '#e8d4a0');
      // Sonnensegel in Orange über der Rückwand
      for (const x of [-12, -6, 0, 6, 12]) {
        const t = x / 15.5, yo = Math.round(cy - 6 - Math.sqrt(Math.max(0, 1 - t * t)) * 6);
        q.rect(cx + x, yo - 4, 1, 4, '#6a4a2a'); q.poly([[cx + x + 1, yo - 4], [cx + x + 4, yo - 3], [cx + x + 1, yo - 1]], CF[1]); q.px(cx + x + 1, yo - 4, CF[0]);
      }
    });
    teil(p, (q) => { // Bühnenhaus vorne (scaenae frons)
      const x = 25, y = 50, w = 13, h = 6;
      quader(q, x, y, w, h, 3, z === 2 ? '#d8d0c0' : '#f0e4c8', z === 2 ? '#a8a092' : '#c4b48f');
      for (let k = x + 1; k < x + w; k += 3) q.rect(k, y - h + 2, 1, h - 2, '#ffffff');
      q.rect(x + 5, y - 3, 3, 4, '#3a2414');
      q.rect(x, y - h + 1, w, 1, CF[1]);
      satteldach(q, x, y, w, h, 3, 3, CF, z === 2 ? '#a8a092' : '#c4b48f');
    });
    teil(p, (q) => { // Statue
      q.rect(17, 48, 3, 2, STEIN[1]); q.rect(18, 44, 1, 4, '#f4f1ea'); q.px(18, 43, '#f4f1ea').px(17, 45, '#f4f1ea').px(19, 46, '#d8d0c0');
    });
    teil(p, (q) => { banner(q, 43, 49, 11, C, 4, '#6a645c'); });
    teil(p, (q) => fahne(q, 47, 47, 12, 4));
    return;
  }
  if (s === 2) {
    if (z === 4) { // Opernhaus mit Kuppel
      teil(p, (q) => {
        const x = 21, y = 46, w = 15, h = 8;
        quader(q, x, y, w, h, 5, '#ecdcb8', '#c4b088');
        for (let k = x + 1; k < x + w; k += 2) q.rect(k, y - h + 2, 1, h - 3, '#fff8e8');
        q.rect(x + 6, y - 3, 3, 4, '#5a2a1a');
        q.rect(x, y - h + 1, w, 1, CF[1]);
        flachdach(q, x, y, w, h, 5, '#c8b088', '#f4e8cc');
        kuppel(q, x + 9.5, y - h - 2, 5, 5, CF);
        q.px(x + 9, y - h - 8, GOLD[1]).px(x + 9, y - h - 9, GOLD[0]);
        q.rect(x + 1, y - h - 2, 1, 2, CF[1]).rect(x + w - 1, y - h - 3, 1, 2, CF[1]);
      });
    } else { // Museum: Kubus mit orangem Band, großer Glasfront
      teil(p, (q) => {
        const x = 19, y = 46, w = 16, h = z === 6 ? 10 : 8;
        quader(q, x, y, w, h, 5, z === 6 ? '#f0f0ec' : '#d8d8d4', z === 6 ? '#b8bcc0' : '#a8a8a4');
        q.rect(x + 2, y - 5, w - 4, 5, PAL.glas); q.linie(x + 3, y - 1, x + 6, y - 4, '#d8f0ff');
        q.rect(x, y - h + 1, w, 3, CF[1]); q.rect(x, y - h + 1, w, 1, CF[0]); for (let k = 0; k < 5; k++) q.rect(x + w + k, y - h + 1 - s2(k), 1, 3, CF[2]);
        flachdach(q, x, y, w, h, 5, '#8a8e90', '#e8e8e8');
        if (z === 6) { q.poly([[x + 9, y - h - 1], [x + 15, y - h - 1], [x + 12, y - h - 6]], PAL.glas); q.linie(x + 12, y - h - 6, x + 15, y - h - 1, PAL.glasD); }
      });
    }
    teil(p, (q) => { // Litfaßsäule
      zylinder(q, 39, 50, 3, 6, ['#e8e0d0', '#d8ccb0', '#a8987a', '#7a6c52']); q.rect(39, 47, 3, 2, CF[1]); q.px(40, 46, '#c0392b'); q.rect(39, 44, 3, 1, '#4a4e52');
    });
    teil(p, (q) => { banner(q, 15, 49, 12, C, 5, '#5a5e60'); banner(q, 44, 47, 11, C, 4, '#5a5e60'); });
    teil(p, (q) => haus(q, 25, 52, 7, 4, z, C));
    teil(p, (q) => fahne(q, 47, 50, 11, 4, '#5a5e60'));
    return;
  }
  // Zukunft: Konzertmuschel aus weißen Segeln mit orangen Lichtbändern
  const M = ZMAT[z], SW = z === 9 ? M.wand : z === 10 ? '#e6eef7' : '#f4f2ec', SS = z === 9 ? M.seite : z === 10 ? '#94ace0' : '#cfcac0';
  teil(p, (q) => {
    for (const [x, b, h] of [[18, 9, 13], [25, 10, 16], [33, 9, 12]]) {
      q.poly([[x, 46], [x + b, 46], [x + b - 1, 46 - h * 0.5], [x + 2, 46 - h]], SW);
      q.linie(x + 2, 46 - h, x + b - 1, 46 - h * 0.5, '#ffffff');
      q.poly([[x + b - 2, 46], [x + b, 46], [x + b - 1, 46 - h * 0.5]], SS);
      if (z === 7) q.px(x + 4, 45, GRUEN[1]).px(x + 5, 45, GRUEN[0]);
      q.linie(x + 1, 45, x + 3, 46 - h + 2, C);
    }
    q.rect(17, 45, 26, 2, M.seite); q.rect(17, 45, 26, 1, C); for (let x = 18; x < 42; x += 3) q.px(x, 45, hell(C, 0.5));
  });
  teil(p, (q) => { q.ellipse(32, 50, 8, 1.8, '#3a3e52'); for (let x = 25; x < 40; x += 2) q.px(x, 50, x % 4 ? C : hell(C, 0.5)); q.px(32, 49, M.glanz); });
  teil(p, (q) => { banner(q, 14, 50, 12, C, 5, '#7a828c'); });
  teil(p, (q) => fahne(q, 47, 49, 12, 4, '#7a828c'));
}

// ======================================================================
// Hafen (türkis): auf Wasser. Steg/Kai, Kran, Lagerhaus, Boot.
// ======================================================================
const WASSER = ['#8fc0ee', '#3d7fc4', '#2e6aa8', '#1f4f84'];
function bodenWasser(p, z) {
  p.ellipse(BX, BY + 0.5, BRX + 2, BRY + 1.5, WASSER[3]);
  p.ellipse(BX, BY, BRX + 1, BRY + 1, WASSER[2]);
  p.ellipse(BX - 1, BY - 0.5, BRX - 2, BRY - 1, WASSER[1]);
  for (let i = 0; i < 14; i++) { const xx = BX + Math.round(Math.sin(i * 2.1) * BRX * 0.8), yy = BY + Math.round(Math.cos(i * 1.3) * BRY * 0.7); p.px(xx, yy, WASSER[0]).px(xx + 1, yy, WASSER[0]); }
  // Randmarken (Bojen) in der Distriktfarbe
  for (let x = BX - BRX + 2; x <= BX + BRX - 2; x += 5) { const y = Math.round(randY(x, BRX + 1, BRY + 1)); p.px(x, y, FARBE.hafen).px(x, y - 1, '#ffffff'); }
}
/** Schiff (Bug rechts), Rumpf auf Wasserlinie y. */
function schiff(p, x, y, z) {
  const s = stufe(z);
  if (s === 0) { // Ruderboot mit Segel
    p.poly([[x - 1, y - 3], [x + 11, y - 3], [x + 9, y], [x + 1, y]], '#8a5a2b'); p.rect(x, y - 3, 11, 1, '#b07a42'); p.rect(x + 1, y - 1, 8, 1, '#5a3a1a');
    p.rect(x + 5, y - 12, 1, 9, '#5a3a1a');
    p.poly([[x + 6, y - 12], [x + 6, y - 4], [x + 11, y - 4]], z === 0 ? '#e8dcc0' : '#f4f1ea'); p.linie(x + 6, y - 12, x + 11, y - 4, '#b8ac90');
    p.poly([[x + 4, y - 10], [x + 4, y - 4], [x + 1, y - 4]], z === 0 ? '#d9cfb4' : '#e8e4d8');
    p.px(x + 5, y - 13, 'S').px(x + 6, y - 13, 'S').px(x + 7, y - 13, 'S-');
    return;
  }
  if (s === 1) { // Kogge / Segelschiff
    p.poly([[x, y - 4], [x + 14, y - 4], [x + 12, y], [x + 2, y]], '#6a4420'); p.rect(x, y - 4, 15, 1, '#a8743c'); p.rect(x + 1, y - 2, 12, 1, '#4a3018');
    p.rect(x + 7, y - 15, 1, 11, '#4a3018'); p.rect(x + 3, y - 14, 9, 7, '#f4f1ea'); p.rect(x + 3, y - 11, 9, 1, 'S'); p.rect(x + 10, y - 14, 2, 7, '#d8d0bc');
    p.px(x + 8, y - 16, 'S').px(x + 9, y - 16, 'S-'); p.rect(x + 12, y - 6, 3, 2, '#8a5a2b');
    return;
  }
  if (s === 2) {
    if (z === 4) { // Dampfschiff
      p.poly([[x, y - 4], [x + 15, y - 4], [x + 13, y], [x + 1, y]], '#2a2a34'); p.rect(x + 1, y - 1, 12, 1, '#c0392b');
      p.rect(x + 3, y - 7, 9, 3, '#f4f1ea'); p.rect(x + 4, y - 6, 7, 1, '#3a4a5a'); p.rect(x + 7, y - 11, 2, 4, 'S'); p.rect(x + 7, y - 11, 2, 1, '#22201e');
      return;
    }
    // Frachter mit Containern
    p.poly([[x, y - 4], [x + 17, y - 4], [x + 15, y], [x + 1, y]], '#3a4a5a'); p.rect(x + 1, y - 1, 14, 1, '#c0392b');
    p.rect(x + 1, y - 9, 4, 5, '#f4f1ea'); p.rect(x + 2, y - 8, 2, 1, '#3a4a5a'); p.px(x + 3, y - 10, 'S');
    const cc = ['#c0392b', FARBE.hafen, '#e8a020', '#3a7ad8', '#5aa84f'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { p.rect(x + 6 + i * 3, y - 6 - j * 2, 3, 2, cc[(i + j * 2) % cc.length]); p.px(x + 8 + i * 3, y - 6 - j * 2, dunkel(cc[(i + j * 2) % cc.length], 0.3)); }
    return;
  }
  // Zukunft: Tragflügelschiff mit Lichtband
  const M = ZMAT[z];
  p.poly([[x, y - 3], [x + 14, y - 3], [x + 17, y - 1], [x + 2, y - 1]], M.wand); p.rect(x + 1, y - 1, 15, 1, M.seite);
  p.poly([[x + 4, y - 3], [x + 12, y - 3], [x + 10, y - 6], [x + 6, y - 6]], M.fe); p.rect(x + 6, y - 6, 4, 1, M.glanz);
  p.rect(x + 1, y - 2, 14, 1, FARBE.hafen); p.px(x + 3, y - 2, 'S').px(x + 4, y - 2, 'S');
  p.px(x + 4, y, M.seite).px(x + 12, y, M.seite).px(x + 3, y + 1, '#ffffff').px(x + 12, y + 1, '#ffffff');
}
/** Kran: Holzkran (Stufe 0-1), Portalkran in Distriktfarbe (2), Automatikkran (3). x/y = Fuß. */
function kran(p, x, y, z) {
  const s = stufe(z), C = FARBE.hafen, CF = toene(C);
  if (s <= 1) {
    p.rect(x, y - 13, 2, 13, '#6a4420'); p.rect(x, y - 13, 1, 13, '#8a5a2b');
    p.linie(x + 1, y - 12, x + 9, y - 16, '#8a5a2b'); p.linie(x + 1, y - 11, x + 9, y - 15, '#5a3a1a');
    p.linie(x + 9, y - 15, x + 9, y - 7, '#d8d0bc'); p.rect(x + 8, y - 7, 3, 2, '#b07a42');
    if (s === 1) { p.kreis(x - 1, y - 3, 2.5, '#6a4420'); p.kreis(x - 1, y - 3, 1.2, '#3a2414'); }
    p.rect(x - 1, y - 14, 4, 1, CF[1]);
    return;
  }
  const B = s === 3 ? [ZMAT[z].wand, ZMAT[z].seite] : [CF[1], CF[2]];
  // Portal mit zwei Beinen und Ausleger übers Wasser
  p.rect(x, y - 15, 2, 15, B[0]); p.rect(x + 6, y - 15, 2, 15, B[1]);
  for (let yy = y - 13; yy < y; yy += 4) { p.linie(x + 1, yy, x + 6, yy + 3, B[1]); }
  p.rect(x - 4, y - 17, 18, 2, B[0]); p.rect(x - 4, y - 16, 18, 1, B[1]);
  p.rect(x + 2, y - 20, 4, 3, s === 3 ? ZMAT[z].fe : '#f4f1ea'); p.px(x + 3, y - 19, '#3a4a5a');
  p.linie(x + 11, y - 15, x + 11, y - 9, '#3a3e42'); p.rect(x + 10, y - 9, 3, 2, s === 3 ? C : '#e8a020');
  if (s === 3) { p.px(x - 4, y - 17, ZMAT[z].glanz).px(x + 13, y - 17, ZMAT[z].glanz); }
}
function hafen(p, z) {
  const s = stufe(z), C = FARBE.hafen;
  bodenWasser(p, z);
  const deck = s === 0 ? ['#c8a070', '#b07a42', '#8a5a2b', '#5a3a1a'] : s === 1 ? STEIN : s === 2 ? BETON : [ZMAT[z].rand, ZMAT[z].wand, ZMAT[z].seite, dunkel(ZMAT[z].seite, 0.3)];
  // Kai: flacher Block entlang der Rückseite, Steg nach vorne ins Wasser
  teil(p, (q) => {
    quader(q, 14, 43, 28, 2, 6, deck[2], deck[3]);
    flachdach(q, 14, 43, 28, 2, 6, deck[1], deck[0]);
    if (s === 0) for (let x = 17; x < 44; x += 3) for (let k = 0; k < 4; k++) q.px(x + k * 2, 41 - k, deck[2]);
    if (s === 1) for (let x = 15; x < 44; x += 3) q.px(x, 43, deck[3]);
    for (let x = 16; x < 42; x += 5) q.rect(x, 44, 1, 2, s === 0 ? '#5a3a1a' : deck[3]);
    if (s === 3) for (let x = 14; x < 42; x += 2) q.px(x, 42, x % 4 ? C : hell(C, 0.5));
    // Steg
    q.rect(39, 43, 4, 6, deck[1]); q.rect(39, 43, 1, 6, deck[0]); q.rect(42, 43, 1, 6, deck[2]); q.rect(39, 49, 4, 1, deck[3]);
    if (s === 0) for (let y = 44; y < 49; y += 2) q.rect(40, y, 2, 1, deck[2]);
    q.px(39, 50, '#3a2414').px(42, 50, '#3a2414');
  });
  // Lagerhaus mit türkisem Dach hinten links
  teil(p, (q) => haus(q, 16, 41, 11, s === 0 ? 5 : s === 1 ? 6 : 7, z, C, { giebel: z === 2 || z === 3 }));
  if (s === 2 && z >= 5) teil(p, (q) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const c = [C, '#c0392b', '#e8a020'][(i + j) % 3]; q.rect(34 + i * 3, 40 - j * 2, 3, 2, c); q.px(36 + i * 3, 40 - j * 2, dunkel(c, 0.3)); } });
  else if (s >= 1) teil(p, (q) => { kiste(q, 35, 40); fass(q, 39, 40); kiste(q, 41, 38); });
  teil(p, (q) => kran(q, 29, 41, z));
  if (s === 1) teil(p, (q) => { // kleiner Leuchtturm am Kaiende
    zylinder(q, 44, 39, 3, 10, ['#ffffff', '#f4f1ea', '#c8c0b0', '#9a9284']); q.rect(44, 34, 3, 1, '#c0392b'); q.rect(44, 30, 3, 1, '#ffd27a'); q.px(45, 29, '#c0392b');
  });
  if (s >= 2) teil(p, (q) => { q.rect(47, 31, 1, 7, '#5a5e60'); q.rect(46, 30, 3, 1, C); q.px(47, 29, '#ffd27a').px(46, 29, '#fff0b8'); });
  teil(p, (q) => schiff(q, s === 0 ? 24 : 19, 52, z));
  teil(p, (q) => fahne(q, 42, 48, 10, 4, s >= 2 ? '#5a5e60' : '#4a3a2a'));
}

// ======================================================================
// Militärlager (rot/braun): Zelte, Wachturm, Palisade, Kasernen, Bunker, Hangar.
// ======================================================================
function zelt(p, x, y, w, h, F) {
  const ax = x + (w - 1) / 2;
  p.poly([[ax, y - h], [x + w - 1, y], [x + w + 2, y - 2], [ax + 3, y - h - 2]], F[2]);
  p.poly([[x, y], [x + w - 1, y], [ax, y - h]], F[1]);
  p.linie(x, y, ax, y - h, F[0]);
  p.poly([[ax - 1, y], [ax + 1, y], [ax, y - Math.round(h / 2)]], F[3]);
  p.linie(ax, y - h, ax + 3, y - h - 2, F[0]); p.px(ax, y - h - 1, '#5a3a1a');
}
function wachturm(p, x, y, h, z) {
  const s = stufe(z), C = toene(FARBE.militaerlager);
  if (s <= 1) {
    const c = s === 0 ? '#6a4420' : '#7a756c', ch = s === 0 ? '#8a5a2b' : '#a9a49a';
    p.rect(x, y - h, 1, h + 1, ch); p.rect(x + 4, y - h, 1, h + 1, c);
    p.linie(x, y - 2, x + 4, y - h + 3, c); p.linie(x + 4, y - 2, x, y - h + 3, c);
    p.rect(x - 1, y - h - 2, 7, 3, ch); p.rect(x - 1, y - h, 7, 1, c);
    p.poly([[x - 2, y - h - 3], [x + 2, y - h - 7], [x + 7, y - h - 3]], C[1]); p.linie(x + 2, y - h - 7, x + 7, y - h - 3, C[2]);
    return;
  }
  const M = s === 3 ? [milMat(z).wand, milMat(z).seite] : z === 4 ? ['#9c4a32', '#6e3122'] : [BETON[1], BETON[2]];
  p.rect(x, y - h, 4, h + 1, M[0]); p.rect(x + 3, y - h, 2, h + 1, M[1]);
  p.rect(x - 1, y - h - 3, 7, 3, M[0]); p.rect(x, y - h - 2, 5, 1, s === 3 ? FARBE.militaerlager : '#2a2a30');
  p.rect(x - 1, y - h - 4, 7, 1, C[1]);
  p.px(x + 5, y - h - 5, '#fff0b8').px(x + 6, y - h - 5, '#ffd27a'); // Suchscheinwerfer
}
function militaerlager(p, z) {
  const s = stufe(z), C = FARBE.militaerlager, CF = toene(C);
  const zaun = (q, art) => {
    for (let x = BX - BRX + 2; x <= BX + BRX - 2; x++) {
      if (x >= 30 && x <= 34) continue; // Tor
      const yb = Math.round(randY(x)) - 1;
      if (art === 0) { const h = 4 + ((x * 5) % 3 === 0 ? 1 : 0); q.rect(x, yb - h + 1, 1, h, x % 2 ? '#a8743c' : '#8a5a2b'); q.px(x, yb - h, '#c8a070'); }
      else if (art === 1) { q.rect(x, yb - 2, 1, 3, x < 32 ? '#b4ac9c' : '#8a8476'); if (x % 2 === 0) q.px(x, yb - 3, '#c4bcac'); }
      else if (art === 2) { if (x % 4 === 0) q.rect(x, yb - 4, 1, 5, '#4a4e52'); q.px(x, yb - 3, '#7a7e82').px(x, yb - 1, '#7a7e82'); if (x % 2) q.px(x, yb - 4, '#5a5e62'); }
      else { if (x % 5 === 0) q.rect(x, yb - 4, 1, 5, milMat(z).seite); q.px(x, yb - 3, x % 2 ? C : hell(C, 0.4)); }
    }
  };
  if (s === 0) {
    teil(p, (q) => wachturm(q, 15, 44, 11, z));
    teil(p, (q) => zelt(q, 21, 44, 9, 7, CF));
    teil(p, (q) => zelt(q, 33, 43, 9, 7, CF));
    teil(p, (q) => zelt(q, 26, 48, 9, 7, z === 0 ? toene('#c8a070') : CF));
    teil(p, (q) => { q.rect(39, 47, 1, 3, '#5a3a1a'); q.rect(38, 46, 3, 1, '#c8a070'); q.px(39, 45, '#c8a070'); // Übungspuppe
      q.linie(42, 48, 44, 44, '#8a8a90').linie(43, 48, 43, 44, '#8a8a90').linie(44, 48, 42, 44, '#8a8a90'); });
    teil(p, (q) => zaun(q, 0));
    teil(p, (q) => banner(q, 46, 44, 13, 'S', 5));
    return;
  }
  if (s === 1) {
    teil(p, (q) => wachturm(q, 41, 41, 13, z));
    teil(p, (q) => haus(q, 16, 45, 13, 6, z, C, { giebel: false }));
    teil(p, (q) => zelt(q, 33, 46, 8, 6, CF));
    teil(p, (q) => { // Waffenständer
      q.rect(24, 48, 6, 1, '#6a4420'); for (let k = 0; k < 3; k++) { q.rect(25 + k * 2, 44, 1, 4, '#9aa5b1'); q.px(25 + k * 2, 43, '#c8d0d8'); }
    });
    teil(p, (q) => zaun(q, 1));
    teil(p, (q) => banner(q, 30, 46, 14, 'S', 5));
    teil(p, (q) => banner(q, 14, 50, 9, C, 3, '#6a645c'));
    return;
  }
  if (s === 2) {
    if (z === 4) teil(p, (q) => haus(q, 16, 45, 14, 7, z, C));
    else teil(p, (q) => { // Hangar (Halbtonne)
      const x = 15, y = 45, w = 15, h = 9;
      for (let i = 0; i < w; i++) { const t = (i - (w - 1) / 2) / ((w - 1) / 2), hh = Math.round(Math.sqrt(1 - t * t) * h); q.rect(x + i, y - hh, 1, hh + 1, t < -0.4 ? CF[0] : t < 0.4 ? CF[1] : CF[2]); if (i % 3 === 1) q.px(x + i, y - hh, CF[3]); }
      for (let i = 0; i < w; i++) q.px(x + i, y - 2, i % 3 === 1 ? CF[3] : CF[2]);
      q.rect(x + 4, y - 5, 7, 6, '#3a3c34'); q.rect(x + 4, y - 6, 7, 1, '#e8c040'); for (let k = x + 4; k < x + 11; k += 2) q.px(k, y - 6, '#22201e');
      q.rect(x + 5, y - 4, 5, 1, '#4a4c3e');
    });
    teil(p, (q) => { // Bunker mit Kuppel
      kuppel(q, 38, 44, 5, 4, BETON); q.rect(35, 42, 6, 1, '#1e2022'); q.rect(33, 43, 11, 2, BETON[2]); q.rect(33, 43, 11, 1, CF[1]);
    });
    teil(p, (q) => wachturm(q, 44, 47, 12, z));
    if (z === 6) teil(p, (q) => schuessel(q, 22, 51, 0));
    else teil(p, (q) => { for (let k = 0; k < 4; k++) q.rect(19 + k * 2, 50 - (k % 2), 2, 1, k % 2 ? '#a89a6a' : '#8a7c52'); });
    teil(p, (q) => zaun(q, 2));
    teil(p, (q) => banner(q, 31, 49, 14, 'S', 5, '#5a5e60'));
    teil(p, (q) => banner(q, 14, 49, 10, C, 4, '#5a5e60'));
    return;
  }
  // Zukunft: gepanzerte Kuppeln mit roten Lichtbändern, Mech, Energiezaun
  const M = milMat(z);
  teil(p, (q) => {
    q.rect(15, 42, 14, 3, M.seite); kuppel(q, 22, 42, 7, 6, z === 8 ? WEISS : [M.rand, M.wand, M.seite, dunkel(M.seite, 0.3)]);
    band(q, 14, 30, 39, C, dunkel(C, 0.3), hell(C, 0.5)); q.rect(20, 41, 5, 3, '#2a2e3a'); q.rect(20, 41, 5, 1, C);
  });
  teil(p, (q) => wachturm(q, 40, 42, 12, z));
  teil(p, (q) => { // Mech
    const x = 33, y = 49;
    q.rect(x, y - 3, 1, 3, M.seite).rect(x + 4, y - 3, 1, 3, M.seite);
    q.rect(x - 1, y - 8, 7, 5, M.wand); q.rect(x + 4, y - 8, 2, 5, M.seite); q.rect(x, y - 7, 4, 1, C); q.px(x + 1, y - 7, hell(C, 0.6));
    q.rect(x - 2, y - 7, 1, 3, M.seite); q.rect(x + 6, y - 7, 2, 1, '#3a3e52');
  });
  teil(p, (q) => zaun(q, 3));
  teil(p, (q) => banner(q, 27, 50, 13, 'S', 5, '#7a828c'));
}

// ======================================================================
// Stadtviertel (grün): Wohnhäuser mit Gärten, Bäume, Hecken.
// ======================================================================
/** Gartenbeet (Reihen grün) mit Zaun. */
function garten(p, x, y, w, zaunC = '#8a5a2b') {
  for (let j = 0; j < 2; j++) for (let i = 0; i < w; i++) p.px(x + i + j, y - j * 2, i % 2 ? GRUEN[1] : GRUEN[0]);
  p.rect(x, y + 1, w + 1, 1, zaunC); for (let i = 0; i <= w; i += 2) p.px(x + i, y, zaunC);
}
function stadtviertel(p, z) {
  const s = stufe(z), C = FARBE.stadtviertel, D = mische(C, '#3d7f38', 0.25);
  if (s === 0) {
    teil(p, (q) => { baum(q, 16, 43, 3); baum(q, 44, 42, 2.5); });
    teil(p, (q) => haus(q, 20, 44, 8, 4, z, D));
    teil(p, (q) => haus(q, 33, 44, 7, 4, z, D));
    teil(p, (q) => haus(q, 25, 50, 8, 4, z, D));
    teil(p, (q) => { garten(q, 15, 49, 6); garten(q, 37, 49, 6); });
    teil(p, (q) => fahne(q, 46, 50, 11, 4));
    return;
  }
  if (s === 1) {
    teil(p, (q) => { baum(q, 15, 44, 3); baum(q, 46, 43, 2.5); });
    teil(p, (q) => haus(q, 19, 44, 8, 6, z, D, { giebel: true }));
    teil(p, (q) => haus(q, 31, 43, 8, 7, z, D, { wand: '#e0b4a0' }));
    // Brunnen
    teil(p, (q) => { q.ellipse(28, 48, 3, 1.2, STEIN[1]); q.ellipse(28, 47.6, 2, 0.6, '#3d7fc4'); q.rect(28, 44, 1, 3, STEIN[0]); q.px(28, 43, '#8fc0ee'); });
    teil(p, (q) => haus(q, 33, 51, 7, 5, z, D, { giebel: z === 2, wand: '#d4d8b4' }));
    teil(p, (q) => { garten(q, 16, 50, 7, z === 2 ? '#8a5a2b' : '#f4f1ea'); busch(q, 44, 50); });
    teil(p, (q) => fahne(q, 46, 49, 11, 4));
    return;
  }
  if (s === 2) {
    // Reihenhäuser bzw. Wohnblock mit grünen Balkonen, Park mit Bäumen
    teil(p, (q) => { baum(q, 16, 45, 3); baum(q, 45, 45, 3); });
    teil(p, (q) => {
      haus(q, 20, 44, 7, z === 4 ? 7 : 10, z, D, { d: 3 });
      haus(q, 28, 44, 7, z === 4 ? 8 : 12, z, D, { d: 3 });
      if (z >= 5) for (let yy = 37; yy < 44; yy += 3) { q.rect(20, yy, 7, 1, C); q.rect(28, yy - 2, 7, 1, C); q.px(21, yy - 1, GRUEN[0]).px(30, yy - 3, GRUEN[0]); }
    });
    teil(p, (q) => haus(q, 36, 48, 7, 5, z, D));
    teil(p, (q) => { q.ellipse(26, 50, 6, 1.6, GRUEN[1]); q.ellipse(25, 49.6, 4, 0.8, GRUEN[0]); baum(q, 22, 51, 2); baum(q, 29, 51, 1.5); q.rect(31, 50, 3, 1, '#8a5a2b'); });
    teil(p, (q) => fahne(q, 46, 51, 11, 4, '#5a5e60'));
    return;
  }
  // Zukunft: Terrassenhäuser mit Dachgärten
  const M = ZMAT[z];
  const terr = (q, x, y, w) => {
    quader(q, x, y, w, 5, 4, M.wand, M.seite); q.rect(x + 1, y - 3, w - 2, 1, M.fe); lichtband(q, x, y - 4, w, 4, C);
    flachdach(q, x, y, w, 5, 4, GRUEN[1], M.rand); busch(q, x + 1, y - 6);
    quader(q, x + 2, y - 6, w - 3, 4, 3, M.wand, M.seite); q.rect(x + 3, y - 8, w - 5, 1, M.fe);
    flachdach(q, x + 2, y - 6, w - 3, 4, 3, GRUEN[1], M.rand); busch(q, x + w - 2, y - 12); baum(q, x + 4, y - 11, 1.5);
  };
  teil(p, (q) => { baum(q, 15, 45, 3); baum(q, 46, 44, 2.5); });
  teil(p, (q) => terr(q, 19, 45, 10));
  teil(p, (q) => terr(q, 32, 44, 8));
  teil(p, (q) => { q.ellipse(28, 50, 7, 1.6, GRUEN[1]); q.ellipse(27, 49.6, 5, 0.8, GRUEN[0]); baum(q, 24, 51, 2); q.px(31, 49, M.glanz).px(34, 50, hell(C, 0.4)); });
  teil(p, (q) => fahne(q, 42, 51, 11, 4, '#7a828c'));
}

// ======================================================================
// Weltraum-Distrikte: Mond-/Marsboden, Kuppeln, Röhren, Lichter. Ab Zeitalter 10 kristallin und üppiger.
// ======================================================================
const RM = ['#dfe3ec', '#aab0c2', '#7a8094', '#4e5366']; // Metall
const RMK = ['#f4f8ff', '#c6d6ee', '#8ea8d8', '#5a6cb0']; // Metall kristallin
const RG = ['#eef9ff', '#b6dcec', '#80b6ce', '#4f87a2']; // Glas
const RGK = ['#ffffff', '#d8f6ff', '#9cdcf0', '#5aa8cc'];
const WARM = '#ffd27a', GLUT = '#9ff0ff', GLUTH = '#e4fcff';
function bodenAll(p, k, farbe) {
  // Regolith (rötlich-grau) mit Kratern, darauf eine Metallplatte
  p.ellipse(BX, BY + 0.5, BRX + 1, BRY + 1, '#6a5a50');
  p.ellipse(BX, BY, BRX, BRY, '#9a8474');
  p.ellipse(BX - 1, BY - 0.5, BRX - 3, BRY - 2, '#a8927e');
  for (const [x, y, r] of [[19, 47, 1.6], [44, 44, 1.3], [24, 42, 1]]) { p.ellipse(x, y, r + 0.6, r * 0.5 + 0.3, '#7a6658'); p.px(x - 1, y, '#c0aa94'); }
  const B = k ? ['#3a4466', '#48547a', '#262c46'] : ['#474b58', '#555a68', '#33363f'];
  p.ellipse(BX + 1, BY - 0.5, 11, 3.8, B[2]); p.ellipse(BX + 1, BY - 1, 10, 3.2, B[1]);
  for (let x = BX - 8; x <= BX + 10; x += 4) p.px(x, BY - 1, B[0]);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; p.px(BX + 1 + Math.cos(a) * 10.5, BY - 0.8 + Math.sin(a) * 3.5, i % 3 === 0 ? 'S+' : i % 2 ? (k ? GLUT : farbe) : (k ? GLUTH : hell(farbe, 0.4))); }
}
function habitat(q, cx, by, rx, ry, k, farbe) {
  const Me = k ? RMK : RM, G = k ? RGK : RG;
  const x0 = Math.round(cx - rx), x1 = Math.round(cx + rx);
  for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0); q.px(x, by + 1, t < 0.75 ? Me[1] : Me[2]); q.px(x, by + 2, t < 0.72 ? farbe : dunkel(farbe, 0.3)); if ((x - x0) % 3 === 1) q.px(x, by + 1, k ? GLUT : WARM); }
  kuppel(q, cx, by, rx, ry, G);
  for (let x = Math.ceil(cx - rx) + 1; x < cx + rx; x++) { q.px(x, by, (x % 3) ? GRUEN[2] : GRUEN[1]); if (Math.abs(x - cx) < rx - 1.5) q.px(x, by - 1, x % 2 ? GRUEN[1] : GRUEN[0]); }
  if (rx >= 4) { baum(q, Math.round(cx - rx * 0.35), by, 1.2); baum(q, Math.round(cx + rx * 0.3), by, 1); }
  q.px(Math.round(cx - rx * 0.45), Math.round(by - ry * 0.7), '#ffffff').px(Math.round(cx - rx * 0.45) + 1, Math.round(by - ry * 0.75) - 1, '#ffffff');
  if (k) q.linie(cx - rx * 0.4, by - 1, cx - rx * 0.1, by - ry * 0.95, GLUTH);
  q.px(Math.round(cx), Math.round(by - ry) - 1, Me[2]).px(Math.round(cx), Math.round(by - ry) - 2, k ? GLUTH : hell(farbe, 0.4));
}
function roehre(q, xa, ya, xb, yb, k) {
  const Me = k ? RMK : RM;
  for (let x = Math.round(xa); x <= Math.round(xb); x++) {
    const y = Math.round(ya + (yb - ya) * ((x - xa) / Math.max(1, xb - xa))), fuge = (x - Math.round(xa)) % 4 === 0;
    q.px(x, y - 1, fuge ? Me[1] : Me[0]).px(x, y, fuge ? Me[2] : Me[1]).px(x, y + 1, fuge ? Me[3] : Me[2]);
    if ((x - Math.round(xa)) % 4 === 2) q.px(x, y, k ? GLUT : WARM);
  }
}
/** Kristallnadel (Zeitalter 10): zwei Facetten, leuchtende Naht, Spielerband. */
function kristallnadel(q, cx, yb, h, b = 2) {
  const top = yb - h, sp = top - Math.round(b * 2.4);
  q.poly([[cx - b, yb], [cx, yb], [cx, sp], [cx - b, top]], '#e6eef7');
  q.poly([[cx + 1, yb], [cx + b + 1, yb], [cx + b + 1, top + b], [cx + 1, sp]], '#94ace0');
  q.linie(cx, yb, cx, sp, '#ffffff'); q.linie(cx + 1, yb - 1, cx + 1, sp + 2, GLUT);
  q.rect(cx - b, yb - 3, b + 1, 1, 'S').rect(cx + 1, yb - 3, b + 1, 1, 'S-');
  q.px(cx, sp - 1, GLUTH);
}
function kuppelviertel(p, z) {
  const k = z >= 10, C = FARBE.kuppelviertel;
  bodenAll(p, k, C);
  if (k) teil(p, (q) => kristallnadel(q, 31, 41, 16));
  teil(p, (q) => { roehre(q, 22, 44, 41, 43, k); roehre(q, 28, 48, 37, 48, k); });
  teil(p, (q) => habitat(q, 22, 43, 5, 5, k, C));
  teil(p, (q) => habitat(q, 40, 42, 5.5, 5.5, k, C));
  teil(p, (q) => habitat(q, 31, 48, 6.5, 6, k, C));
  teil(p, (q) => fahne(q, 46, 49, 12, 4, k ? RMK[2] : RM[2]));
  if (k) teil(p, (q) => habitat(q, 16, 49, 3, 3, k, C));
}
function forschungskuppel(p, z) {
  const k = z >= 10, C = FARBE.forschungskuppel, Me = k ? RMK : RM, CF = toene(C);
  bodenAll(p, k, C);
  teil(p, (q) => { // großes Radioteleskop hinten rechts
    schuessel(q, 42, 43, 2, k ? ['#ffffff', '#e4f4ff', '#a8c8f0', '#5a6cb0'] : ['#ffffff', '#e4e8ee', '#b4bcc8', '#7a8494']);
  });
  if (k) teil(p, (q) => kristallnadel(q, 20, 45, 14));
  teil(p, (q) => roehre(q, 22, 46, 36, 47, k));
  teil(p, (q) => { // Laborkuppel mit Spalt und Fernrohr
    const cx = 29, by = 45;
    q.rect(cx - 8, by - 1, 17, 3, Me[1]); q.rect(cx - 8, by + 1, 17, 1, Me[2]); q.rect(cx - 8, by - 1, 17, 1, C);
    for (let x = cx - 7; x < cx + 8; x += 3) q.px(x, by, k ? GLUT : WARM);
    kuppel(q, cx, by - 2, 7, 7, k ? RMK : WEISS);
    band(q, cx - 8, cx + 8, by - 5, C, CF[2], hell(C, 0.5));
    for (let yy = by - 9; yy <= by - 3; yy++) if (q.hole(cx + 1, yy) && yy !== by - 5) q.px(cx + 1, yy, '#1e2234');
    q.linie(cx + 1, by - 8, cx + 5, by - 13, Me[2]); q.rect(cx + 4, by - 14, 2, 2, Me[1]); q.px(cx + 6, by - 15, k ? GLUT : hell(C, 0.5));
  });
  teil(p, (q) => { quader(q, 17, 50, 6, 4, 3, Me[1], Me[2]); q.rect(18, 48, 4, 1, C); q.px(19, 48, hell(C, 0.5)); });
  teil(p, (q) => fahne(q, 40, 51, 10, 4, Me[2]));

}
function bergbaudistrikt(p, z) {
  const k = z >= 10, C = FARBE.bergbaudistrikt, Me = k ? RMK : RM, CF = toene(C);
  bodenAll(p, k, C);
  teil(p, (q) => { // Bohrturm hinten links (Gitter)
    const x = 19, y = 44, h = 20;
    q.linie(x - 3, y, x, y - h, Me[1]).linie(x + 3, y, x, y - h, Me[2]);
    for (let j = 3; j < h; j += 4) { const hw = Math.round(3 * (1 - j / h)); q.linie(x - hw, y - j, x + hw, y - j + 2, Me[2]); }
    q.rect(x - 1, y - h - 2, 3, 2, C); q.px(x, y - h - 3, '#ff5a4a');
  });
  teil(p, (q) => { // Erzhaufen
    for (let j = 0; j < 5; j++) q.rect(36 - j, 44 - j + 4, 2 * j + 2, 1, j % 2 ? '#8a5a3a' : '#a06a44');
    q.px(34, 46, '#d8a050').px(37, 47, '#e8c060');
  });
  teil(p, (q) => { // Förderband vom Haufen zur Schmelze
    q.linie(26, 46, 34, 40, Me[2]); q.linie(26, 45, 34, 39, Me[1]); for (let i = 0; i < 4; i++) q.px(27 + i * 2, 44 - i * 1.5, '#a06a44');
  });
  teil(p, (q) => { // Schmelzofen mit Glut, Dach in Distriktfarbe
    const x = 22, y = 50, w = 10, h = 7;
    quader(q, x, y, w, h, 4, Me[1], Me[2]);
    q.rect(x + 2, y - 4, 4, 3, '#3a1a10'); q.rect(x + 3, y - 3, 2, 2, '#ff9a3a'); q.px(x + 3, y - 3, '#ffe080');
    lichtband(q, x, y - h + 1, w, 4, C, hell(C, 0.4));
    flachdach(q, x, y, w, h, 4, CF[1], CF[0]);
    zylinder(q, x + 6, y - h - 1, 3, 6, Me); q.px(x + 7, y - h - 7, '#ff9a3a');
  });
  teil(p, (q) => { // Lagertanks
    zylinder(q, 39, 51, 4, 5, Me); zylinder(q, 43, 50, 4, 6, Me); band(q, 39, 42, 48, C, CF[2]); band(q, 43, 46, 46, C, CF[2]);
  });
  rauch(p, 30, 35, 2, 0, true);
  teil(p, (q) => fahne(q, 46, 44, 11, 4, Me[2]));
  if (k) teil(p, (q) => { // schwebender Erzfrachter
    q.rect(40, 23, 9, 3, RMK[1]); q.rect(40, 23, 9, 1, RMK[0]); q.rect(41, 26, 7, 1, GLUT); q.rect(42, 21, 3, 2, '#a06a44'); q.px(45, 22, '#e8c060');
  });
}

// ======================================================================
// Baustelle: Baugrube, Gerüst, Kran, Material, gelb-schwarze Absperrung.
// ======================================================================
function baustelle(p, z) {
  const s = stufe(z);
  const B = BODEN[Math.max(0, Math.min(10, z))];
  p.ellipse(BX, BY + 0.5, BRX + 1, BRY + 1, B[2]);
  p.ellipse(BX, BY, BRX, BRY, '#9a7a56');
  // Baugrube
  p.ellipse(30, 45, 8, 3, '#5a4030'); p.ellipse(30, 45.5, 7, 2.2, '#3a2a1e'); p.rect(25, 44, 10, 1, '#6a4a34');
  // Gerüst
  teil(p, (q) => {
    const c = s <= 1 ? '#8a5a2b' : '#7a828c', ch = s <= 1 ? '#b07a42' : '#aab4c0';
    for (const x of [22, 27, 32]) q.rect(x, 30, 1, 14, ch);
    for (const y of [33, 37, 41]) q.rect(21, y, 13, 1, c);
    q.linie(22, 41, 27, 37, c).linie(27, 37, 32, 33, c);
    q.rect(21, 37, 13, 1, s <= 1 ? '#c8a070' : '#e8c040');
    // halbfertige Mauer
    q.rect(23, 39, 9, 5, s <= 1 ? STEIN[1] : s === 2 ? '#9c4a32' : '#d8dce4'); for (let x = 23; x < 32; x += 2) q.px(x, 39, s <= 1 ? STEIN[0] : '#e8e8e8');
  });
  // Kran
  teil(p, (q) => {
    if (s <= 1) { // Tretradkran aus Holz
      q.rect(39, 28, 2, 15, '#6a4420'); q.linie(40, 29, 46, 25, '#8a5a2b'); q.linie(46, 25, 46, 33, '#d8d0bc'); q.rect(45, 33, 3, 2, STEIN[1]);
      q.kreis(38, 40, 3, '#8a5a2b'); q.kreis(38, 40, 1.8, '#3a2414');
    } else { // Turmdrehkran gelb
      const y = 44, x = 40;
      q.rect(x, y - 22, 2, 22, '#e8c040'); for (let yy = y - 21; yy < y; yy += 2) q.px(x + ((yy >> 1) & 1), yy, '#a88a20');
      q.rect(x - 10, y - 24, 18, 2, '#e8c040'); for (let xx = x - 9; xx < x + 8; xx += 2) q.px(xx, y - 23, '#a88a20');
      q.rect(x + 5, y - 23, 3, 3, '#5a5e60'); q.rect(x - 1, y - 22, 3, 2, '#3a4a5a');
      q.linie(x - 8, y - 22, x - 8, y - 14, '#3a3e42'); q.rect(x - 9, y - 14, 3, 2, s === 3 ? '#d8dce4' : '#9c4a32');
      q.px(x, y - 25, '#ff5a4a');
    }
  });
  // Material: Bretter / Ziegel / Rohre
  teil(p, (q) => { q.rect(16, 46, 6, 1, '#b07a42'); q.rect(17, 45, 6, 1, '#c8a070'); q.rect(36, 48, 4, 2, '#b5523b'); q.rect(36, 48, 4, 1, '#d06a4a'); });
  // Absperrung gelb-schwarz vorne
  teil(p, (q) => {
    for (let x = BX - BRX + 3; x <= BX + BRX - 3; x++) { const y = Math.round(randY(x)) - 2; q.px(x, y, ((x >> 1) & 1) ? '#f1c40f' : '#22201e'); }
    for (let x = BX - BRX + 3; x <= BX + BRX - 3; x += 6) { const y = Math.round(randY(x)) - 2; q.rect(x, y, 1, 3, '#5a5e60'); }
  });
  teil(p, (q) => fahne(q, 46, 46, 10, 4, s <= 1 ? '#4a3a2a' : '#5a5e60'));
}

// ---------- Anmeldung ----------
const ZEICHNER = { campus, heiligtum, handelsplatz, industriezone, theaterplatz, hafen, militaerlager, stadtviertel };
for (const [id, fn] of Object.entries(ZEICHNER)) {
  definiere('distrikt', id, {
    w: 64, h: 56, zeitalterVarianten: true, umriss: false,
    zeichne(p, o) {
      const z = Math.max(0, Math.min(10, o.zeitalter | 0));
      if (id !== 'hafen') bodenLand(p, z, FARBE[id]);
      fn(p, z);
    },
  });
}
for (const [id, fn] of Object.entries({ kuppelviertel, forschungskuppel, bergbaudistrikt })) {
  definiere('distrikt', id, {
    w: 64, h: 56, zeitalterVarianten: true, umriss: false,
    zeichne(p, o) { fn(p, Math.max(0, Math.min(10, o.zeitalter | 0))); },
  });
}
definiere('distrikt', 'baustelle', {
  w: 64, h: 56, zeitalterVarianten: true, umriss: false,
  zeichne(p, o) { baustelle(p, Math.max(0, Math.min(10, o.zeitalter | 0))); },
});
