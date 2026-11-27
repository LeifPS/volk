// Sprites der Zeitalter 7 bis 10 (KI, Fusion, Weltraum, Sterne). Siehe PLAN-ZEITALTER-8-11.md.
// Stadtgebäude (32x32) wie in gebaeude.js: leichte Schrägansicht (Front + rechte Seite + Deckel),
// Licht von oben links, Bodenlinie bei y = 29/30, Umriss wird automatisch ergänzt.
// Jedes Zeitalter hat eine eigene Farbwelt:
//   KI       (#5b8cff): Glastürme mit Dachgärten, Solarfassaden, Drohnen
//   Fusion   (#f2a33a): weiße Kuppeln mit Lichtbändern, Magnetbahnen
//   Weltraum (#8e7cc3): Raumhäfen, Masten, Habitat-Kuppeln, violettes Metall
//   Sterne   (#e6eef7): kristalline Türme, Schwebeplattformen, leuchtende Schutzfelder
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische } from '../pixel.js';

const D = (c, t = 0.28) => dunkel(c, t);
const L = (c, t = 0.2) => hell(c, t);

// ---------- Farbwelten ----------
/** KI-Zeitalter: kühles Blau, silberne Rahmen, Grün der Dachgärten. */
const KI = {
  akzent: '#5b8cff', akzentH: '#9fbcff', akzentD: '#3a5fc0',
  glas: '#7fb2f0', glasD: '#4a78c8', glasH: '#c4e0ff', rahmen: '#e8eef5', rahmenD: '#b4c0cc',
  metall: '#c4ccd6', metallD: '#8a96a4', dunkel: '#28304a', solar: '#22346a', solarH: '#4a6ac8',
  gruen: '#4fb84a', gruenH: '#7ad86a', gruenD: '#2f7f34', led: '#e05ae0', ledH: '#ff9af0',
};
/** Fusionszeitalter: weiße Kuppeln, orange Lichtbänder, Plasmaglühen. */
const FU = {
  akzent: '#f2a33a', akzentH: '#ffd27a', akzentD: '#c07418', kern: '#fff4c8',
  weiss: '#f4f2ee', weissD: '#ccd0d8', weissDD: '#9aa0ac', dunkel: '#3c404c', glas: '#9ad0e8', glasD: '#5a8ab0',
};
/** Weltraumzeitalter: helles Rumpfmetall, violette Bänder, dunkle Technik. */
const WR = {
  akzent: '#8e7cc3', akzentH: '#c2b4f0', akzentD: '#5e4e94', glow: '#d8ccff',
  rumpf: '#e2e0ea', rumpfD: '#a8a4b8', dunkel: '#3a3450', dunkelH: '#5a5274', glas: '#9ab0e8', glasD: '#5a68a8',
};
/** Sternenzeitalter: Kristall in Weiß- und Eisblau, Leuchtcyan, Schwebeglühen. */
const ST = {
  kristall: '#e6eef7', kristallM: '#b8d0ea', kristallD: '#7e9cc4', kristallDD: '#4e6890',
  glow: '#8ff0ff', glowH: '#e0fcff', glowD: '#3ab8d8', fuss: '#5a6a8a', fussD: '#3a4664', violett: '#b08aff',
};
const WASSER = '#3d7fc4', WASSER_H = '#8fc0ee';

// ---------- Allgemeine Hilfen (aus gebaeude.js übernommen) ----------
/** Quader: Front (x..x+b-1, unten yb, Höhe h), rechte Seite mit Tiefe d (45°), Deckel. */
function box(p, x, yb, b, h, d, c, o = {}) {
  const top = yb - h + 1;
  p.rect(x, top, b, h, c);
  const sc = o.seite || D(c), dc = o.deckel || L(c, 0.22);
  for (let i = 1; i <= d; i++) p.rect(x + b - 1 + i, top - i, 1, h, sc);
  if (!o.ohneDeckel) for (let k = 1; k <= d; k++) p.rect(x + k, top - k, b - 1, 1, dc);
  if (!o.ohneKante) p.rect(x, top, 1, h, L(c, 0.12));
  return { x, top, b, h, d, yb, r: x + b - 1, c };
}
/** Kuppel (Halbkugel) mit Basis bei yb. */
function kuppel(p, cx, yb, r, c, ry = r) {
  for (let y = Math.round(yb - ry); y <= yb; y++) {
    const t = (yb - y) / (ry + 0.4), hw = Math.sqrt(Math.max(0, 1 - t * t)) * (r + 0.4);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / (r + 0.5);
      p.px(x, y, u < -0.35 && t > 0.25 ? L(c, 0.3) : u > 0.4 ? D(c, 0.25) : c);
    }
  }
}
/** Runder Turm (Zylinder). */
function zylinder(p, x, yb, b, h, c) {
  p.rect(x, yb - h + 1, b, h, c);
  p.rect(x, yb - h + 1, 1, h, L(c, 0.25)).rect(x + 1, yb - h + 1, 1, h, L(c, 0.1));
  p.rect(x + b - 2, yb - h + 1, 2, h, D(c, 0.25));
  p.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, L(c, 0.2));
}
function tuer(p, x, yb, w = 2, h = 4, c = KI.dunkel) { p.rect(x, yb - h + 1, w, h, c); p.rect(x, yb - h + 1, w, 1, D(c, 0.3)); }
function wasser(p, x, y, w, h) { p.rect(x, y, w, h, WASSER); for (let i = 0; i < w - 5; i += 5) p.rect(x + i + Math.round((y / 2) % 3), y, 3, 1, WASSER_H); if (h > 2) for (let i = 2; i < w; i += 6) p.rect(x + i, y + 2, 2, 1, '#6aa6e0'); }
/** Spielerfahne an Metallmast; (x,yb) = Fuß der Stange. */
function fahne(p, x, yb, h = 9, w = 5) {
  p.rect(x, yb - h, 1, h + 1, PAL.stahlH);
  p.rect(x + 1, yb - h, w, 1, 'S+').rect(x + 1, yb - h + 1, w, 1, 'S').rect(x + 1, yb - h + 2, w - 1, 1, 'S-');
  p.px(x, yb - h - 1, '#ffffff');
}
/** Bodenplatte (Plaza) über die ganze Breite. */
function boden(p, x, y, w, c, h = 2) { p.rect(x, y, w, h, c); p.rect(x, y, w, 1, L(c, 0.18)); }

// ---------- Neue Hilfen für die Zukunftsgebäude ----------
/** Glasfassade mit Geschossbändern, Pfosten und diagonalen Lichtreflexen. */
function glasfront(p, x, y, w, h, o = {}) {
  const c = o.glas || KI.glas, et = o.etage ?? 3, ps = o.pfosten ?? 4;
  p.rect(x, y, w, h, c);
  for (let j = et - 1; j < h; j += et) p.rect(x, y + j, w, 1, o.band || D(c, 0.3));
  if (ps) for (let i = ps - 1; i < w; i += ps) for (let j = 0; j < h; j++) if ((j + 1) % et) p.px(x + i, y + j, mische(c, o.rahmen || KI.rahmen, 0.45));
  for (const s of o.reflex ?? [1, 4]) for (let j = 0; j < h; j++) {
    const xx = x + s + Math.floor((h - 1 - j) * 0.5);
    if (xx >= x && xx < x + w && (j + 1) % et) p.px(xx, y + j, L(c, 0.45));
  }
}
/** Seitenwand (rechts, schräg) eines Quaders neu füllen, z. B. als dunkles Glas mit Geschossbändern. */
function seite(p, B, c, band) {
  for (let i = 1; i <= B.d; i++) for (let j = 0; j < B.h; j++) p.px(B.r + i, B.top - i + j, band && (j % 3 === 2) ? band : c);
}
/** Dachgarten auf dem Deckel eines Quaders: Rasen, Büsche, kleine Bäume. */
function dachgarten(p, B, o = {}) {
  const { x, top, b, d } = B;
  for (let k = 1; k <= d; k++) p.rect(x + k, top - k, b - 1, 1, k % 2 ? KI.gruen : KI.gruenD);
  p.rect(x, top - 1, b + 1, 1, KI.rahmen);
  const n = o.n ?? Math.max(2, Math.floor(b / 4));
  for (let i = 0; i < n; i++) {
    const bx = x + 2 + Math.round(i * (b - 3) / Math.max(1, n - 1)), by = top - 2 - (i % 2);
    if (i % 2 === 0) { p.rect(bx, by - 1, 1, 2, PAL.holzD); p.kreis(bx, by - 3, 1.6, KI.gruen); p.px(bx - 1, by - 4, KI.gruenH); }
    else { p.ellipse(bx, by, 1.5, 1, KI.gruenD); p.px(bx - 1, by - 1, KI.gruenH); }
  }
}
/** Kleine Quadrokopter-Drohne (5x3). c = Akzentfarbe des Rumpfs, last = Farbe eines Pakets darunter. */
function drohne(p, x, y, c = KI.akzent, last) {
  p.karte(x, y, ['hh.hh', '.kck.', '..g..'], { h: '#dfe6ee', k: '#3a4458', c, g: '#ff4a4a' });
  if (last) { p.rect(x + 2, y + 3, 1, 1, PAL.stahlD); p.rect(x + 1, y + 4, 3, 2, last); p.px(x + 1, y + 4, L(last, 0.3)); }
}
/** Glatt schattierte Kuppel (Licht oben links) in vier Tönen: [glanz, hell, mittel, schatten]. */
function glattkuppel(p, cx, yb, r, ry, toene) {
  for (let y = Math.round(yb - ry); y <= yb; y++) {
    const t = (yb - y) / (ry + 0.4), hw = Math.sqrt(Math.max(0, 1 - t * t)) * (r + 0.4);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / (r + 0.5), z = Math.sqrt(Math.max(0, 1 - u * u - t * t));
      const i = -0.55 * u + 0.45 * t + 0.7 * z;
      p.px(x, y, i > 0.98 ? toene[0] : i > 0.62 ? toene[1] : i > 0.3 ? toene[2] : toene[3]);
    }
  }
}
const WEISS_TOENE = ['#ffffff', '#f4f2ee', '#dcdfe6', '#b4bac6'];
/** Weiße Fusionskuppel mit orangem Lichtband; gibt die Spitzen-y zurück. */
function fusionskuppel(p, cx, yb, r, ry = r, band = 0.45) {
  glattkuppel(p, cx, yb, r, ry, WEISS_TOENE);
  const yband = Math.round(yb - ry * band);
  for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) if (p.hole(x, yband)) p.px(x, yband, (x - cx) > r * 0.4 ? FU.akzentD : x % 2 ? FU.akzent : FU.akzentH);
  return Math.round(yb - ry);
}
/** Glühende Kugel (Plasma, Antimaterie ...): außen c, innen heller bis kern. */
function gluehkugel(p, cx, cy, r, c, kern = '#ffffff') {
  p.kreis(cx, cy, r, c);
  p.kreis(cx, cy, r * 0.65, mische(c, kern, 0.5));
  p.kreis(cx - r * 0.15, cy - r * 0.15, Math.max(0.6, r * 0.3), kern);
}
/** Kristallspitze (Prisma mit Facetten): Fuß bei yb, Breite b, Höhe h. */
function kristall(p, cx, yb, b, h, o = {}) {
  const c = o.c || ST.kristall, m = o.m || ST.kristallM, d = o.d || ST.kristallD;
  const hb = b / 2, spitze = yb - h, schulter = yb - h + Math.round(b * 0.8);
  p.poly([[cx - hb, yb], [cx - hb, schulter], [cx, spitze], [cx, yb]], c);
  p.poly([[cx, yb], [cx, spitze], [cx + hb, schulter], [cx + hb, yb]], d);
  p.linie(cx, spitze, cx, yb, m);
  if (b >= 4) p.linie(Math.round(cx - hb + 1), schulter + 1, Math.round(cx - hb + 1), yb - 1, L(c, 0.5));
  if (o.glow) for (let y = schulter + 2; y < yb - 1; y += 3) p.px(cx, y, o.glow);
}
/** Schwebeplattform: Scheibe mit Unterseite und Leuchtschein darunter. */
function schwebe(p, cx, y, rx, o = {}) {
  const c = o.c || ST.kristallM;
  p.ellipse(cx, y + 1, rx, 1.5, o.unten || ST.fussD);
  p.ellipse(cx, y, rx, 1.2, c);
  p.rect(Math.round(cx - rx) + 1, y - 1, Math.round(rx * 2) - 1, 1, L(c, 0.3));
  const gl = o.glow || ST.glow;
  p.rect(Math.round(cx - rx * 0.5), y + 3, Math.round(rx), 1, gl);
  p.rect(Math.round(cx - rx * 0.3), y + 4, Math.max(1, Math.round(rx * 0.6)), 1, L(gl, 0.5));
}
/** Leuchtendes Schutzfeld (Halbellipse aus Lichtpunkten), nur die Kontur. */
function schutzfeld(p, cx, yb, rx, ry, c, c2) {
  const n = Math.round((rx + ry) * 3.2);
  for (let k = 0; k <= n; k++) {
    const a = Math.PI * k / n, x = Math.round(cx - Math.cos(a) * rx), y = Math.round(yb - Math.sin(a) * ry);
    p.px(x, y, k % 3 ? c : (c2 || L(c, 0.5)));
  }
}
/** Waagerechte Röhre (Hyperloop, Rohrleitung) mit optionalem Lichtband. */
function roehre(p, x, y, w, h, c, band) {
  p.rect(x, y, w, h, c); p.rect(x, y, w, 1, L(c, 0.35)); p.rect(x, y + h - 1, w, 1, D(c, 0.3));
  if (band) p.rect(x, y + Math.floor(h / 2), w, 1, band);
}
/** Sternfunkeln (kleines Plus). */
function funkeln(p, x, y, c = '#ffffff') { p.px(x, y, c).px(x - 1, y, L(c, 0.2)).px(x + 1, y, L(c, 0.2)).px(x, y - 1, L(c, 0.2)).px(x, y + 1, L(c, 0.2)); }

function g(id, zeichne) { definiere('gebaeude', id, { w: 32, h: 32, zeichne }); }

// ===================== KI-Zeitalter =====================
g('ki_labor', (p) => {
  boden(p, 1, 28, 30, KI.metallD);
  // Glasturm mit Dachgarten
  const B = box(p, 3, 29, 14, 22, 4, KI.glas, { seite: KI.glasD });
  glasfront(p, 3, B.top, 14, 22, { reflex: [2, 7] });
  seite(p, B, KI.glasD, D(KI.glasD, 0.25));
  p.rect(3, B.top, 14, 1, KI.rahmen); p.rect(3, B.top, 1, 22, KI.rahmen);
  dachgarten(p, B, { n: 4 });
  tuer(p, 8, 29, 4, 3, KI.dunkel); p.rect(8, 26, 4, 1, KI.akzentH);
  // Flacher Laborflügel
  box(p, 18, 29, 11, 8, 2, KI.rahmen, { seite: KI.rahmenD });
  glasfront(p, 19, 24, 9, 4, { etage: 5, pfosten: 3, reflex: [1] });
  // KI-Chip als Leuchtzeichen mit Anschlüssen
  const cx = 24, cy = 14;
  for (let i = -3; i <= 3; i += 2) { p.rect(cx + i, cy - 6, 1, 2, KI.metall); p.rect(cx + i, cy + 5, 1, 2, KI.metall); p.rect(cx - 6, cy + i, 2, 1, KI.metall); p.rect(cx + 5, cy + i, 2, 1, KI.metall); }
  p.rect(cx - 4, cy - 4, 9, 9, KI.dunkel); p.rahmen(cx - 4, cy - 4, 9, 9, KI.akzentD);
  p.rect(cx - 2, cy - 2, 5, 5, KI.akzent); p.rect(cx - 2, cy - 2, 5, 1, KI.akzentH);
  p.px(cx, cy, '#ffffff').px(cx - 1, cy + 1, KI.akzentH).px(cx + 1, cy - 1, KI.akzentH);
  p.rect(cx, cy + 7, 1, 1, KI.metallD);
  // Antenne mit Signallicht
  p.rect(7, B.top - 9, 1, 6, KI.metall); p.px(7, B.top - 10, '#ff4a4a');
});

g('autonome_fabrik', (p) => {
  boden(p, 1, 28, 30, KI.metallD);
  // Lange Halle mit Sheddach aus Solarpaneelen
  const B = box(p, 1, 29, 23, 11, 4, KI.rahmen, { seite: KI.rahmenD, ohneDeckel: true });
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 8;
    p.poly([[x, B.top - 1], [x + 7, B.top - 6], [x + 7, B.top - 1]], KI.solar);
    for (let k = 1; k < 7; k += 2) p.linie(x + k, B.top - 1, x + 7, B.top - 1 - Math.round((7 - k) * 5 / 7), KI.solarH);
    p.linie(x, B.top - 1, x + 7, B.top - 6, L(KI.solarH, 0.4));
    p.rect(x + 7, B.top - 6, 1, 6, KI.glasH);
  }
  p.rect(1, B.top, 23, 1, KI.metall);
  // Offenes Tor mit Fließband und blauem Greifarm
  p.rect(3, 22, 19, 7, KI.dunkel);
  p.rect(3, 27, 19, 1, KI.metallD); for (let x = 4; x < 22; x += 2) p.px(x, 28, KI.metall);
  for (const x of [5, 15]) { p.rect(x, 24, 3, 3, '#d8a040'); p.px(x, 24, L('#d8a040', 0.3)); p.px(x + 2, 26, D('#d8a040', 0.3)); }
  p.rect(10, 26, 2, 1, KI.metall); p.linie(11, 25, 9, 22, KI.akzent); p.linie(9, 22, 13, 23, KI.akzent);
  p.rect(13, 23, 1, 2, KI.akzentH); p.px(9, 22, KI.akzentH);
  p.rect(1, 20, 23, 1, KI.akzent);
  for (let x = 4; x < 22; x += 4) p.px(x, 21, x % 8 ? '#30e060' : KI.akzentH);
  // Lieferdrohnen mit Paketen
  drohne(p, 24, 6, KI.akzent, '#d8a040');
  drohne(p, 15, 2, KI.akzent);
  // Ladeturm für Drohnen
  p.rect(27, 15, 2, 14, KI.metall); p.rect(27, 15, 1, 14, KI.rahmen);
  p.rect(25, 14, 6, 1, KI.akzent); p.rect(25, 13, 6, 1, KI.rahmen);
});

g('intelligentes_stromnetz', (p) => {
  boden(p, 1, 28, 30, '#6a7480');
  // Gittermast (weiß) mit zwei Traversen und leuchtenden Isolatoren
  const mx = 23;
  for (let y = 6; y <= 28; y++) { const w = 1 + (y - 6) * 0.2; p.px(Math.round(mx - w), y, KI.rahmen); p.px(Math.round(mx + w), y, KI.rahmenD); }
  for (let y = 8; y < 28; y += 4) { const w0 = 1 + (y - 6) * 0.2, w1 = 1 + (y - 2) * 0.2; p.linie(Math.round(mx - w0), y, Math.round(mx + w1), y + 4, KI.metall); p.linie(Math.round(mx + w0), y, Math.round(mx - w1), y + 4, KI.metallD); }
  p.poly([[mx - 1, 3], [mx + 1, 3], [mx + 1, 6], [mx - 1, 6]], KI.rahmen); p.px(mx, 2, '#ff4a4a');
  for (const [y, w] of [[7, 7], [13, 6]]) {
    p.rect(mx - w, y, 2 * w + 1, 1, KI.rahmen); p.linie(mx - w, y + 1, mx - 1, y + 3, KI.metallD); p.linie(mx + w, y + 1, mx + 1, y + 3, KI.metallD);
    for (const s of [-w, w]) { p.rect(mx + s, y + 1, 1, 2, KI.akzent); p.px(mx + s, y + 3, KI.akzentH); }
  }
  // Durchhängende Leitungen zum Speicher, mit Lichtpulsen
  for (const [y0, x1, y1] of [[10, 3, 15], [16, 9, 20]]) {
    const x0 = y0 === 10 ? mx - 7 : mx - 6;
    for (let x = x1; x <= x0; x++) { const t = (x - x1) / (x0 - x1), y = Math.round(y1 + (y0 - y1) * t + Math.sin(t * Math.PI) * 2); p.px(x, y, (x % 4) ? KI.akzentD : KI.akzentH); }
  }
  p.linie(mx + 7, 10, 30, 11, KI.akzentD); p.linie(mx + 6, 16, 30, 17, KI.akzentD);
  // Batteriespeicher (drei Blöcke mit Ladeanzeige)
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 6;
    box(p, x, 29, 5, 8, 1, KI.rahmen, { seite: KI.rahmenD });
    p.rect(x + 1, 23, 3, 5, KI.dunkel);
    for (let j = 0; j < 4 - i; j++) p.rect(x + 1, 27 - j, 3, 1, j < 2 ? '#30e060' : KI.akzent);
    p.px(x + 2, 22, KI.akzentH);
  }
  // Schwebendes Hologramm-Blitzzeichen über dem Speicher
  p.karte(6, 1, ['...yy', '..yy.', '.yyyy', 'yyyy.', '..yy.', '.yy..', 'yy...'], { y: '#ffd84a' });
  p.px(9, 1, '#fff6c0').px(8, 3, '#fff6c0');
  // Steuerknoten
  kuppel(p, 28, 29, 2, KI.metall, 2); p.px(28, 28, KI.akzentH);
});

g('vertikalfarm', (p) => {
  boden(p, 1, 28, 30, KI.metallD);
  // Hoher Glasturm mit Pflanzenetagen und rosa Wachstumslicht
  const B = box(p, 6, 29, 15, 25, 4, KI.rahmen, { seite: KI.rahmenD, ohneDeckel: true });
  for (let k = 0; k < 8; k++) {
    const y = 6 + k * 3;
    p.rect(7, y, 13, 2, KI.glasH);
    p.rect(7, y, 13, 1, KI.led);
    for (let x = 7; x < 20; x++) p.px(x, y + 1, (x + k) % 3 ? KI.gruen : KI.gruenH);
    p.rect(7, y + 2, 13, 1, KI.rahmen);
    for (let i = 1; i <= 4; i++) { p.px(20 + i, y - i, KI.gruenD); p.px(20 + i, y + 1 - i, mische(KI.led, KI.rahmenD, 0.5)); }
  }
  p.rect(6, 5, 1, 25, KI.metall);
  dachgarten(p, B, { n: 3 });
  // Kleines Windrad
  p.rect(16, 0, 1, 4, KI.metall); p.linie(16, 1, 13, 0, KI.rahmen); p.linie(16, 1, 19, 2, KI.rahmen); p.px(16, 1, KI.akzent);
  // Eingang und Erntekisten
  tuer(p, 11, 29, 5, 3, KI.dunkel); p.rect(11, 26, 5, 1, KI.akzent);
  for (const [x, c] of [[1, '#e04a3a'], [24, '#f0c040'], [27, '#7ad86a']]) { p.rect(x, 26, 4, 3, KI.rahmenD); p.rect(x, 25, 4, 1, c); p.px(x + 1, 25, L(c, 0.4)); p.rect(x, 27, 4, 1, KI.metallD); }
});

g('genlabor', (p) => {
  boden(p, 1, 28, 30, KI.metallD);
  // Weißes Laborgebäude mit Glasband
  const B = box(p, 1, 29, 18, 12, 4, KI.rahmen, { seite: KI.rahmenD });
  glasfront(p, 2, 20, 16, 4, { etage: 5, pfosten: 3, reflex: [2] });
  p.rect(1, 25, 18, 1, KI.akzent);
  tuer(p, 7, 29, 4, 3, KI.dunkel);
  // Heilkreuz (blau-weiß) auf der Fassade
  p.rect(14, 26, 3, 3, KI.rahmen); p.rect(15, 26, 1, 3, KI.akzent); p.rect(14, 27, 3, 1, KI.akzent);
  // Glaskuppel auf dem Dach
  kuppel(p, 8, B.top - 2, 4, KI.glasH, 3); p.px(8, B.top - 6, KI.akzent);
  // Große DNA-Doppelhelix als Skulptur
  for (let y = 2; y <= 28; y++) {
    const a = (y - 2) * 0.42, x1 = 25 + Math.sin(a) * 3.5, x2 = 25 - Math.sin(a) * 3.5, vorn = Math.cos(a) > 0;
    if (y % 3 === 0) p.linie(Math.round(x1), y, Math.round(x2), y, (y % 6) ? '#f05a7a' : KI.akzentH);
    p.px(Math.round(vorn ? x2 : x1), y, vorn ? KI.akzentD : '#c03a5a');
    p.px(Math.round(vorn ? x1 : x2), y, vorn ? '#ff7a9a' : KI.akzent);
  }
  p.rect(22, 28, 7, 2, KI.metall); p.rect(22, 28, 7, 1, KI.rahmen);
});

g('virtuelles_forum', (p) => {
  // Rundes Forum: Stufenring mit Hologramm-Weltkugel
  p.ellipse(15.5, 26, 14, 4, KI.metallD);
  p.ellipse(15.5, 25, 13, 3.5, KI.rahmenD);
  p.ellipse(15.5, 24, 12, 3, KI.rahmen);
  for (let x = 5; x < 27; x += 3) p.px(x, 26 + (x % 2), 'S');
  p.ellipse(15.5, 23.5, 7, 1.8, KI.dunkel);
  p.ellipse(15.5, 23.5, 5, 1.2, KI.akzent); p.ellipse(15.5, 23.5, 3, 0.6, KI.akzentH);
  // Lichtkegel nach oben
  for (let y = 12; y < 23; y++) { const w = 2 + (y - 12) * 0.25; if (y % 2) { p.px(Math.round(15.5 - w), y, KI.akzentH); p.px(Math.round(15.5 + w), y, KI.akzentH); } }
  // Holografischer Globus (Drahtgitter)
  const gx = 15.5, gy = 10;
  p.kreis(gx, gy, 7, KI.akzentD);
  p.kreis(gx, gy, 6, mische(KI.akzentD, KI.akzent, 0.5));
  for (const ry of [-4, 0, 4]) { const w = Math.sqrt(49 - ry * ry); p.linie(Math.round(gx - w), gy + ry, Math.round(gx + w), gy + ry, KI.akzentH); }
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; for (const rx of [2.5, 5.5]) p.px(Math.round(gx + Math.cos(t) * rx), Math.round(gy + Math.sin(t) * 6.5), KI.akzentH); }
  p.rect(Math.round(gx), gy - 7, 1, 15, KI.akzentH);
  p.px(13, 7, '#ffffff').px(12, 8, '#ffffff');
  // Seitliche Bildschirmsäulen
  for (const x of [2, 27]) { p.rect(x, 13, 3, 10, KI.dunkel); p.rect(x, 13, 3, 1, KI.metall); p.rect(x, 15, 3, 2, KI.akzent); p.rect(x, 18, 3, 2, KI.led); p.px(x, 15, KI.akzentH); p.rect(x + 1, 23, 1, 3, KI.metallD); }
});

g('laserturm', (p) => {
  // Befestigter Sockel
  box(p, 3, 29, 20, 5, 3, KI.metall, { seite: KI.metallD });
  p.rect(3, 26, 20, 1, KI.akzent);
  for (let x = 5; x < 22; x += 4) p.rect(x, 27, 2, 1, KI.dunkel);
  // Schlanker weißer Turm mit Lichtringen
  p.poly([[9, 24], [11, 13], [15, 13], [17, 24]], KI.rahmen);
  p.poly([[13, 24], [13, 13], [15, 13], [17, 24]], KI.rahmenD);
  for (let y = 15; y < 24; y += 3) p.rect(11, y, 4, 1, KI.akzent);
  // Geschützkuppel mit Laserrohr
  p.rect(7, 12, 13, 2, KI.metallD); p.rect(7, 12, 13, 1, KI.metall);
  kuppel(p, 13, 11, 6, KI.rahmen, 5);
  p.rect(9, 9, 8, 1, KI.akzent); p.px(10, 8, KI.dunkel).px(12, 8, KI.dunkel);
  for (let i = 0; i < 7; i++) { p.rect(16 + i, 7 - Math.round(i * 0.6), 2, 2, i < 2 ? KI.metallD : KI.metall); p.px(16 + i, 7 - Math.round(i * 0.6), KI.rahmen); }
  p.kreis(23.5, 2.5, 1.5, KI.akzentH); p.px(24, 2, '#ffffff');
  // Laserstrahl
  p.linie(25, 2, 30, -1, '#ffffff'); p.linie(25, 3, 30, 0, KI.akzent);
  // Radarschüssel rechts auf dem Sockel
  p.ellipse(25, 19, 2.5, 3, KI.rahmen); p.ellipse(25.5, 19, 1.5, 2, KI.metall); p.px(24, 18, '#ffffff');
  p.rect(25, 22, 1, 3, KI.metallD);
  fahne(p, 5, 23, 8, 4);
});

g('drohnenhafen', (p) => {
  wasser(p, 1, 26, 30, 4);
  // Kai mit Leuchtkante
  p.rect(1, 22, 30, 4, KI.metallD); p.rect(1, 22, 30, 1, KI.metall); p.rect(1, 25, 30, 1, KI.akzent);
  // Gestapelter Drohnen-Hangar
  box(p, 2, 22, 12, 16, 3, KI.rahmen, { seite: KI.rahmenD });
  glasfront(p, 3, 9, 10, 12, { etage: 4, pfosten: 0, reflex: [3] });
  for (const y of [12, 16, 20]) p.rect(1, y, 13, 1, KI.metall);
  // Landefeld auf dem Dach
  p.ellipse(9, 5, 5, 1.5, KI.dunkel); p.ellipse(9, 5, 3.5, 1, KI.akzent); p.rect(8, 5, 3, 1, KI.rahmen);
  // Drohnen mit Containern
  drohne(p, 19, 2, KI.akzent, '#e05a3a');
  drohne(p, 25, 9, KI.akzent, '#3a9a5a');
  drohne(p, 14, 0, KI.akzent);
  // Automatisches Containerschiff
  p.poly([[16, 26], [31, 26], [29, 30], [18, 30]], '#2a3450');
  p.rect(16, 26, 15, 1, KI.akzent);
  for (let i = 0; i < 3; i++) { const c = ['#e05a3a', '#f0b030', '#3a9a5a'][i]; p.rect(18 + i * 4, 22, 4, 4, c); p.rect(18 + i * 4, 22, 4, 1, L(c, 0.3)); p.px(19 + i * 4, 24, D(c, 0.3)); }
  p.rect(29, 21, 2, 5, KI.rahmen); p.px(29, 21, KI.akzentH);
});

// ===================== Fusionszeitalter =====================
g('fusionsreaktor', (p) => {
  boden(p, 1, 28, 30, FU.weissDD);
  // Nebengebäude mit Lichtband
  box(p, 1, 27, 6, 7, 2, FU.weissD, { seite: FU.weissDD }); p.rect(1, 23, 6, 1, FU.akzent);
  box(p, 24, 27, 5, 10, 2, FU.weissD, { seite: FU.weissDD }); p.rect(24, 20, 5, 1, FU.akzent);
  for (const y of [23, 25]) p.rect(25, y, 3, 1, FU.glasD);
  // Magnetring (Torus) um die Kuppel: erst die hintere Hälfte
  const cx = 15.5, cy = 23.5, rx = 14, ry = 3.5;
  const ring = (vorn) => {
    for (let k = 0; k <= 120; k++) {
      const a = Math.PI * 2 * k / 120; if ((Math.sin(a) > 0) !== vorn) continue;
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
      p.rect(x, y - 1, 1, 3, vorn ? FU.weiss : FU.weissDD);
      p.px(x, y + 1, vorn ? FU.weissD : D(FU.weissDD, 0.2));
    }
    for (let k = 0; k <= 120; k++) {
      const a = Math.PI * 2 * k / 120; if ((Math.sin(a) > 0) !== vorn) continue;
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
      p.px(x, y, k % 4 ? FU.akzent : FU.kern); if (vorn) p.px(x, y - 1, FU.akzentH);
    }
  };
  ring(false);
  // Große weiße Reaktorkuppel mit Lichtbändern
  glattkuppel(p, cx, 25, 11, 15, WEISS_TOENE);
  for (const y of [14, 20]) for (let x = 3; x <= 28; x++) { const c = p.hole(x, y); if (WEISS_TOENE.includes(c)) p.px(x, y, x > 22 ? FU.akzentD : x % 2 ? FU.akzent : FU.akzentH); }
  // Bullauge mit Plasmasonne
  p.kreis(cx, 17, 3.4, FU.weissDD); gluehkugel(p, cx, 17, 2.6, FU.akzent, FU.kern);
  // Kuppelspitze
  p.rect(15, 7, 2, 4, FU.weissD); p.rect(15, 7, 1, 4, FU.weiss); p.px(15, 6, FU.akzentH); p.px(15, 5, FU.kern);
  ring(true);
});

g('quantenrechner', (p) => {
  boden(p, 1, 28, 30, FU.weissDD);
  // Weißes Gebäude mit großem Schaufenster
  const B = box(p, 2, 29, 23, 23, 4, FU.weiss, { seite: FU.weissD });
  p.rect(2, B.top + 1, 23, 1, FU.akzent); for (let x = 3; x < 25; x += 2) p.px(x, B.top + 1, FU.akzentH);
  p.rect(4, 10, 19, 17, '#18223a');
  // Kälteschein
  p.ellipse(13, 17, 8, 7, '#22355a'); p.ellipse(13, 17, 5, 5, '#2c4672');
  // Goldener Kryostat-Kronleuchter (Stufen mit Leitungen)
  const gold = '#e8b84a', goldH = '#fff0a0', goldD = '#a87a20';
  const stufe = (y, w) => { p.rect(13 - w, y, 2 * w + 1, 2, gold); p.rect(13 - w, y, 2 * w + 1, 1, goldH); p.px(13 + w, y + 1, goldD); };
  p.rect(13, 10, 1, 2, gold);
  stufe(12, 6); stufe(16, 5); stufe(20, 3);
  for (const x of [8, 10, 12, 14, 16, 18]) p.rect(x, 14, 1, 2, x % 4 ? goldD : goldH);
  for (const x of [10, 12, 14, 16]) p.rect(x, 18, 1, 2, x % 4 ? goldD : goldH);
  p.rect(12, 22, 3, 2, '#9ad0ff'); p.px(13, 24, '#ffffff'); p.px(13, 22, '#ffffff');
  // Kühlnebel unten
  for (const [x, y] of [[6, 25], [9, 26], [17, 25], [20, 26]]) p.ellipse(x, y, 1.5, 0.6, '#5a7ab0');
  p.rahmen(4, 10, 19, 17, FU.weissD);
  // Kleine Kuppel auf dem Dach
  fusionskuppel(p, 8, B.top - 2, 3, 3, 0.4);
  p.rect(18, B.top - 5, 1, 4, FU.weissDD); p.px(18, B.top - 6, FU.akzent);
  tuer(p, 25, 29, 2, 3, FU.dunkel);
});

g('molekularfabrik', (p) => {
  boden(p, 1, 28, 30, FU.weissDD);
  // Halle mit zwei Kuppeln
  const B = box(p, 1, 29, 20, 12, 4, FU.weiss, { seite: FU.weissD });
  fusionskuppel(p, 6, B.top - 2, 4, 5); fusionskuppel(p, 15, B.top - 2, 4, 5);
  p.rect(1, 21, 20, 1, FU.akzent); for (let x = 2; x < 21; x += 2) p.px(x, 21, FU.akzentH);
  // Montagetor mit Lichtstrahl
  p.rect(4, 23, 14, 6, FU.dunkel);
  p.rect(10, 23, 2, 5, FU.akzentH); p.rect(10, 23, 1, 5, FU.kern);
  p.rect(8, 28, 6, 1, FU.weissDD);
  p.rect(9, 27, 4, 1, FU.akzent); p.px(10, 26, FU.kern);
  for (let x = 5; x < 17; x += 2) p.px(x, 28, FU.akzentD);
  p.rect(5, 26, 3, 2, '#9ad0e8'); p.rect(14, 26, 3, 2, '#c8a0ff'); p.px(5, 26, '#ffffff'); p.px(14, 26, '#ffffff');
  // Großes Molekülmodell (Kugeln und Stäbe)
  const atome = [[25, 7, 3, FU.akzent], [20, 3, 2, FU.weiss], [29, 2, 2, FU.weiss], [29, 13, 2, '#5aa8e8'], [21, 12, 2, FU.weiss]];
  for (const [x, y] of atome.slice(1)) { p.linie(25, 7, x, y, FU.weissDD); p.linie(26, 8, x + 1, y + 1, FU.weissD); }
  for (const [x, y, r, c] of atome) { p.kreis(x, y, r, c); p.px(x - Math.ceil(r / 2), y - Math.ceil(r / 2), L(c, 0.6)); p.px(x + Math.floor(r / 2), y + Math.floor(r / 2), D(c, 0.25)); }
  p.rect(25, 15, 1, 14, FU.weissDD); p.rect(23, 28, 5, 1, FU.weissD);
});

g('hyperloop_station', (p) => {
  boden(p, 1, 28, 30, '#8a8e98');
  // Bahnhofshalle mit geschwungenem Dach
  box(p, 4, 29, 21, 8, 3, FU.weiss, { seite: FU.weissD });
  glasfront(p, 5, 23, 19, 5, { glas: FU.glas, etage: 6, pfosten: 3, reflex: [2, 9] });
  tuer(p, 12, 29, 5, 3, FU.dunkel); p.rect(12, 26, 5, 1, FU.akzent);
  // Stützpfeiler
  for (const x of [2, 28]) { p.rect(x, 17, 2, 12, FU.weissD); p.rect(x, 17, 1, 12, FU.weiss); }
  // Röhre quer durchs Bild mit Lichtband, in der Mitte gläsern
  roehre(p, 0, 11, 32, 6, FU.weiss, FU.akzent);
  p.rect(9, 11, 14, 6, '#bfe4f4'); p.rect(9, 11, 14, 1, '#ffffff'); p.rect(9, 16, 14, 1, FU.glasD);
  p.rect(8, 11, 1, 6, FU.weissD); p.rect(23, 11, 1, 6, FU.weissD);
  // Kapsel in der Glasröhre
  p.poly([[11, 13], [19, 13], [22, 14], [19, 15], [11, 15]], FU.weiss);
  p.rect(12, 13, 7, 1, '#ffffff'); p.rect(19, 14, 3, 1, FU.akzent); p.px(22, 14, FU.akzentH);
  for (let x = 13; x < 19; x += 2) p.px(x, 14, FU.glasD);
  // Fahrtlinien hinter der Kapsel
  // Stationsschild mit Doppelpfeil
  p.rect(12, 2, 9, 6, FU.akzent); p.rect(12, 2, 9, 1, FU.akzentH); p.rect(12, 7, 9, 1, FU.akzentD);
  p.karte(13, 3, ['xx.xxx.', '...xxxx', 'xx.xxx.'], { x: '#ffffff' });
  p.rect(16, 8, 1, 3, FU.weissDD);
});

g('energieschild', (p) => {
  boden(p, 1, 28, 30, FU.weissDD);
  // Schild: doppelte Leuchtkontur mit wenigen Wabenpunkten
  schutzfeld(p, 15.5, 28, 14.5, 25, FU.akzent, FU.kern);
  schutzfeld(p, 15.5, 28, 13.5, 24, FU.akzentD);
  for (const [x, y] of [[6, 12], [10, 8], [21, 8], [25, 12], [4, 19], [27, 19], [8, 16], [23, 16]]) { p.px(x, y, FU.akzent); p.px(x + 1, y, FU.akzentD); p.px(x, y + 1, FU.akzentD); }
  // Generatorkuppel mit Lichtband
  box(p, 6, 28, 19, 4, 2, FU.weissD, { seite: FU.weissDD });
  fusionskuppel(p, 15.5, 24, 7, 6, 0.4);
  // Emitter-Mast mit Plasmakugel
  p.rect(15, 11, 2, 8, FU.weissD); p.rect(15, 11, 1, 8, FU.weiss);
  p.rect(13, 14, 6, 1, FU.weissDD);
  gluehkugel(p, 15.5, 8, 2.5, FU.akzent, FU.kern);
  p.px(15, 4, FU.akzentH).px(12, 7, FU.akzentH).px(19, 7, FU.akzentH);
  fahne(p, 3, 27, 8, 4);
});

g('co2_waescher', (p) => {
  boden(p, 1, 28, 30, '#7a8a70');
  // Hoher weißer Filterturm mit großen Ventilatoren
  const B = box(p, 5, 29, 16, 24, 4, FU.weiss, { seite: FU.weissD });
  p.rect(5, 7, 16, 1, FU.akzent); for (let x = 6; x < 21; x += 2) p.px(x, 7, FU.akzentH);
  for (const [cx, cy] of [[9, 12], [16, 12], [9, 19], [16, 19]]) {
    p.kreis(cx, cy, 3, FU.weissDD); p.kreis(cx, cy, 2.4, FU.dunkel);
    p.px(cx - 1, cy - 2, '#c4ccd6').px(cx - 2, cy - 1, '#c4ccd6').px(cx + 1, cy + 2, '#c4ccd6').px(cx + 2, cy + 1, '#c4ccd6').px(cx + 2, cy - 2, '#8a96a4').px(cx - 2, cy + 2, '#8a96a4');
    p.px(cx, cy, FU.akzent).px(cx - 1, cy, FU.weissDD).px(cx + 1, cy, FU.weissDD);
  }
  tuer(p, 11, 29, 4, 4, FU.dunkel); p.rect(11, 25, 4, 1, FU.akzent);
  // Saubere Luft strömt oben aus (hellblaue Schwaden) und Blätter auf dem Dach
  for (let i = 0; i < 3; i++) { const x = 8 + i * 5; p.ellipse(x, B.top - 3 - i, 2, 1, '#c8ecff'); p.px(x - 1, B.top - 4 - i, '#ffffff'); }
  p.linie(22, 2, 26, 0, '#c8ecff'); p.linie(24, 4, 29, 2, '#c8ecff');
  // Grüner Saum und Bäume
  for (const x of [2, 26, 29]) { p.rect(x, 26, 1, 3, PAL.holzD); p.kreis(x, 24, 2, '#4fb84a'); p.px(x - 1, 23, '#7ad86a'); }
  p.rect(22, 21, 6, 8, FU.weissD); p.rect(22, 21, 6, 1, FU.weiss); p.rect(23, 23, 4, 2, '#5aa84f'); p.px(23, 23, '#8ad87a');
});

g('plasmaschmiede', (p) => {
  boden(p, 1, 28, 30, FU.weissDD);
  // Schmiedehalle mit Bogentor
  const B = box(p, 1, 29, 22, 14, 4, FU.weiss, { seite: FU.weissD });
  p.rect(1, B.top + 1, 22, 1, FU.akzent); for (let x = 2; x < 23; x += 2) p.px(x, B.top + 1, FU.akzentH);
  p.rect(5, 19, 14, 10, FU.dunkel); p.ellipse(12, 19, 7, 3, FU.dunkel);
  // Elektroden mit Plasmabogen
  p.rect(6, 19, 2, 8, '#8a96a4'); p.rect(17, 19, 2, 8, '#8a96a4'); p.px(6, 19, '#c4ccd6').px(17, 19, '#c4ccd6');
  for (let x = 8; x <= 16; x++) { const y = 20 + Math.round(Math.sin((x - 8) * 1.3) * 1.2); p.px(x, y, FU.kern); p.px(x, y + 1, x % 2 ? FU.akzent : '#c890ff'); }
  // Glühender Werkblock auf dem Amboss
  p.rect(9, 26, 7, 2, '#5a606c'); p.rect(10, 25, 5, 1, '#ff7a2a'); p.rect(11, 24, 3, 1, '#ffd27a');
  p.px(12, 23, '#ffffff');
  // Funken
  for (const [x, y] of [[8, 23], [16, 22], [14, 18], [10, 17]]) p.px(x, y, FU.akzentH);
  // Abluftkamin mit Glühring
  zylinder(p, 25, 29, 5, 22, FU.weissD);
  for (const y of [11, 17, 23]) { p.rect(25, y, 5, 1, FU.akzent); p.px(26, y, FU.akzentH); }
  p.ellipse(27, 4, 1.5, 1, '#c8c8c8'); p.ellipse(28, 2, 1.2, 0.8, '#e0e0e0');
  fahne(p, 3, B.top - 2, 8, 4);
});

// ===================== Weltraumzeitalter =====================
g('raumhafen', (p) => {
  // Landefeld mit violetten Positionslichtern
  p.ellipse(16, 27, 15, 3, WR.dunkel); p.ellipse(16, 26.5, 14, 2.4, WR.dunkelH);
  p.ellipse(19, 26.5, 6, 1.2, WR.akzentD);
  for (let k = 0; k < 14; k++) { const a = Math.PI * 2 * k / 14; p.px(Math.round(16 + Math.cos(a) * 13), Math.round(26.5 + Math.sin(a) * 2.2), k % 2 ? WR.glow : WR.akzent); }
  // Terminal mit violettem Glas und geschwungenem Dach
  box(p, 1, 25, 10, 7, 2, WR.rumpf, { seite: WR.rumpfD });
  glasfront(p, 2, 21, 8, 3, { glas: WR.glas, etage: 4, pfosten: 3, reflex: [1] });
  p.rect(1, 18, 11, 1, WR.akzent); p.ellipse(6, 18, 6, 1.5, WR.rumpf); p.rect(1, 18, 12, 1, WR.akzent);
  p.ellipse(5, 13, 2.5, 1.5, WR.rumpf); p.rect(5, 14, 1, 3, WR.rumpfD); p.px(7, 12, WR.akzent);
  // Gitterturm
  p.rect(25, 4, 3, 22, WR.dunkel); for (let y = 5; y < 26; y += 3) { p.linie(25, y, 27, y + 2, WR.dunkelH); p.px(25, y, WR.akzent); }
  p.rect(22, 9, 3, 1, WR.dunkelH); p.rect(22, 16, 3, 1, WR.dunkelH); p.px(26, 3, '#ff4a4a');
  // Wiederverwendbare Rakete mit Landebeinen
  p.rect(16, 7, 6, 17, WR.rumpf); p.rect(16, 7, 1, 17, '#ffffff'); p.rect(20, 7, 2, 17, WR.rumpfD);
  p.poly([[16, 7], [21, 7], [18.5, 1]], WR.rumpf); p.linie(18, 2, 16, 7, '#ffffff'); p.poly([[19, 2], [21, 7], [19, 7]], WR.rumpfD);
  for (const y of [11, 19]) { p.rect(16, y, 6, 1, WR.akzent); p.px(16, y, WR.akzentH); p.px(21, y, WR.akzentD); }
  p.rect(17, 13, 2, 2, WR.glasD); p.px(17, 13, WR.glow);
  p.rect(16, 15, 6, 1, 'S');
  p.linie(16, 22, 13, 26, WR.dunkelH); p.linie(21, 22, 24, 26, WR.dunkelH); p.rect(17, 24, 4, 1, WR.dunkel);
  p.px(18, 25, WR.glow).px(19, 25, WR.glow);
});

g('orbitalkraftwerk', (p) => {
  boden(p, 1, 28, 30, WR.dunkelH);
  // Satellit im Orbit mit Solarflügeln
  for (const x of [1, 14]) { p.rect(x, 1, 7, 4, '#2a3a7a'); p.rect(x, 1, 7, 1, '#5a7ad8'); for (let i = 1; i < 7; i += 2) p.rect(x + i, 2, 1, 3, '#3a5ab8'); }
  p.rect(8, 2, 6, 2, WR.rumpfD); p.rect(9, 0, 4, 6, WR.rumpf); p.rect(9, 0, 1, 6, '#ffffff'); p.rect(9, 5, 4, 1, WR.akzent);
  // Violetter Energiestrahl zur Schüssel
  for (let y = 6; y < 17; y++) { p.rect(9, y, 4, 1, y % 2 ? WR.akzent : WR.akzentH); p.rect(10, y, 2, 1, y % 3 ? WR.glow : '#ffffff'); }
  for (const [x, y] of [[7, 9], [14, 12], [6, 14], [15, 8]]) p.px(x, y, WR.glow);
  // Große Empfangsschüssel (Schale nach oben)
  p.ellipse(11, 19, 9, 4.5, WR.rumpfD);
  p.ellipse(11, 18.5, 9, 4, WR.rumpf);
  p.ellipse(11, 17.5, 8, 2.5, WR.dunkelH); p.ellipse(11, 17.5, 6, 1.6, WR.akzentD); p.ellipse(11, 17.5, 3, 0.8, WR.glow);
  p.rect(3, 17, 2, 1, '#ffffff'); p.rect(2, 18, 1, 1, '#ffffff');
  p.poly([[8, 22], [14, 22], [13, 27], [9, 27]], WR.dunkel); p.rect(8, 22, 6, 1, WR.dunkelH);
  for (let y = 23; y < 27; y += 2) p.px(11, y, WR.akzent);
  // Umspannblock mit Speichersäulen
  box(p, 19, 27, 8, 9, 2, WR.rumpf, { seite: WR.rumpfD }); p.rect(19, 21, 8, 1, WR.akzent);
  for (const x of [20, 22, 24]) { p.rect(x, 23, 1, 4, WR.dunkel); p.px(x, 23, WR.glow); }
  for (const x of [20, 25]) { p.rect(x, 12, 2, 6, WR.rumpfD); p.rect(x, 12, 1, 6, WR.rumpf); p.px(x, 11, WR.glow); p.rect(x - 1, 14, 4, 1, WR.akzent); }
  p.linie(14, 24, 18, 24, WR.akzentH);
});

g('orbitalwerft', (p) => {
  boden(p, 1, 28, 30, WR.dunkelH);
  // Zwei Montagetürme mit Brücke
  for (const x of [2, 26]) { p.rect(x, 6, 4, 22, WR.dunkel); for (let y = 7; y < 27; y += 3) p.linie(x, y, x + 3, y + 2, WR.dunkelH); p.rect(x, 6, 1, 22, WR.dunkelH); }
  p.rect(1, 4, 30, 3, WR.dunkelH); p.rect(1, 4, 30, 1, WR.akzentH); for (let x = 3; x < 30; x += 3) p.px(x, 5, WR.dunkel);
  // Laufkatze mit Haken und Bauteil
  p.rect(18, 7, 4, 2, WR.akzent); p.rect(20, 9, 1, 3, WR.rumpfD); p.rect(18, 12, 5, 2, WR.rumpf); p.px(18, 12, '#ffffff');
  // Raumschiff im Bau: vorne verkleidet, hinten offenes Gerippe
  const y0 = 17;
  p.poly([[7, y0 + 2], [11, y0 - 2], [24, y0 - 2], [24, y0 + 6], [11, y0 + 6]], WR.dunkel);
  p.poly([[7, y0 + 2], [11, y0 - 2], [17, y0 - 2], [17, y0 + 6], [11, y0 + 6]], WR.rumpf);
  p.linie(8, y0 + 1, 11, y0 - 2, '#ffffff'); p.rect(11, y0 - 2, 6, 1, '#ffffff'); p.rect(11, y0 + 5, 6, 1, WR.rumpfD);
  p.rect(9, y0 + 1, 3, 1, WR.glasD); p.px(9, y0 + 1, WR.glow);
  p.rect(12, y0 + 2, 5, 1, WR.akzent);
  for (let x = 18; x <= 24; x += 2) { p.rect(x, y0 - 2, 1, 9, WR.rumpfD); }
  p.rect(17, y0 - 2, 8, 1, WR.rumpfD); p.rect(17, y0 + 6, 8, 1, WR.rumpfD); p.rect(17, y0 + 2, 8, 1, WR.akzentD);
  // Triebwerke hinten
  p.rect(24, y0, 2, 4, WR.dunkelH);
  // Schweißfunken
  for (const [x, y] of [[19, 13], [21, 15], [23, 14], [20, 23]]) p.px(x, y, '#fff2a0');
  p.px(22, 13, '#ffffff');
  // Stützböcke
  for (const x of [11, 20]) p.rect(x, y0 + 7, 2, 4, WR.rumpfD);
  fahne(p, 8, 3, 3, 4);
});

g('orbitalabwehr', (p) => {
  // Bunkersockel mit violetter Lichtleiste
  box(p, 2, 29, 24, 5, 3, WR.dunkelH, { seite: WR.dunkel, deckel: WR.rumpfD });
  p.rect(2, 27, 24, 1, WR.akzent); for (let x = 4; x < 25; x += 4) p.px(x, 27, WR.glow);
  // Radarkuppel links
  glattkuppel(p, 6, 23, 3, 4, ['#ffffff', WR.rumpf, '#c8c4d6', WR.rumpfD]); p.px(6, 18, '#ff4a4a');
  // Drehturm
  p.rect(10, 18, 12, 6, WR.rumpf); p.rect(10, 18, 12, 1, '#ffffff'); p.rect(10, 18, 1, 6, '#ffffff'); p.rect(19, 19, 3, 5, WR.rumpfD);
  p.rect(11, 21, 8, 1, WR.akzent); p.px(12, 21, WR.glow);
  p.rect(12, 15, 7, 3, WR.dunkelH); p.rect(12, 15, 7, 1, WR.akzentD);
  // Doppelte Schienenkanone mit Spulenringen
  for (let i = 0; i <= 14; i++) {
    const x = 15 + i, y = 15 - Math.round(i * 0.9);
    p.px(x, y, WR.rumpf); p.px(x, y + 2, WR.rumpfD); p.px(x, y + 1, i % 2 ? WR.glow : WR.akzentH);
    if (i > 1 && i % 3 === 0) { p.rect(x, y - 1, 2, 5, WR.akzent); p.px(x, y - 1, WR.akzentH); p.px(x + 1, y + 3, WR.akzentD); }
  }
  gluehkugel(p, 30, 1.5, 1.4, WR.akzentH);
  fahne(p, 25, 22, 8, 4);
});

g('biokuppel', (p) => {
  boden(p, 1, 28, 30, WR.dunkelH);
  // Glaskuppel mit Pflanzen dahinter (erst Inhalt, dann Glas und Gitter)
  const cx = 15.5, yb = 27, r = 14, ry = 20;
  glattkuppel(p, cx, yb, r, ry, ['#e4f4ff', '#a8d8f0', '#8ac4e4', '#6aa0cc']);
  // Bäume und Beete innen
  for (const [x, y, rr, c] of [[9, 19, 4, '#3d9a3a'], [16, 15, 5, '#4fb84a'], [23, 19, 4, '#3d8f3a'], [12, 22, 3, '#5ac85a'], [20, 22, 3, '#4aa848']]) { p.rect(x, y + rr - 1, 1, 26 - y - rr + 2, PAL.holzD); p.kreis(x, y, rr, c); p.px(x - 1, y - rr + 1, L(c, 0.35)); p.px(x + rr - 1, y + 1, D(c, 0.25)); }
  for (const [x, y] of [[8, 25], [14, 24], [22, 25], [18, 18]]) p.px(x, y, '#ff8ac8');
  p.px(25, 23, '#ffd84a').px(6, 22, '#ffd84a');
  // Geodätisches Gitter (violett)
  for (let k = 1; k < 6; k++) { const yy = yb - Math.round(ry * k / 6); const t = (yb - yy) / (ry + 0.4), hw = Math.sqrt(1 - t * t) * (r + 0.4); for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) p.px(x, yy, WR.akzentH); }
  for (let k = -3; k <= 3; k++) { for (let j = 0; j <= 40; j++) { const t = j / 40, y = yb - t * ry, hw = Math.sqrt(Math.max(0, 1 - t * t)) * (r + 0.2); p.px(Math.round(cx + hw * k / 3.6), Math.round(y), WR.akzent); } }
  // Glanzlichter
  for (const [x, y] of [[8, 13], [9, 12], [10, 11], [7, 15]]) p.px(x, y, '#ffffff');
  // Ringfundament und Schleuse
  p.rect(1, 26, 30, 2, WR.akzentD); p.rect(1, 26, 30, 1, WR.akzent);
  p.rect(13, 23, 5, 5, WR.rumpf); p.rect(14, 24, 3, 4, WR.dunkel); p.px(15, 24, WR.glow);
});

// ===================== Sternenzeitalter =====================
/** Kristallsockel (Plattform mit Leuchtkante) als Bodenlinie der Sternengebäude. */
function kristallsockel(p, x, w, y = 27) {
  p.rect(x, y, w, 3, ST.fuss); p.rect(x, y, w, 1, ST.kristallM); p.rect(x, y + 2, w, 1, ST.fussD);
  for (let i = x + 2; i < x + w - 1; i += 4) p.px(i, y + 1, ST.glow);
}

g('antimateriefabrik', (p) => {
  kristallsockel(p, 1, 30);
  // Speicherkapseln links
  for (const x of [2, 6]) { p.rect(x, 20, 3, 7, ST.kristallD); p.rect(x, 20, 1, 7, ST.kristall); p.rect(x + 1, 22, 1, 3, '#d05aff'); p.px(x + 1, 22, '#ffc8ff'); p.rect(x, 19, 3, 1, ST.kristallM); }
  // Drei Kristallpfeiler als Magnetfalle
  kristall(p, 12, 27, 3, 18, { glow: ST.glow });
  kristall(p, 27, 27, 3, 18, { glow: ST.glow });
  kristall(p, 19.5, 27, 4, 8);
  // Eindämmungsringe
  p.ellipse(19.5, 13, 9, 2.5, null);
  for (let k = 0; k < 60; k++) { const a = Math.PI * 2 * k / 60; p.px(Math.round(19.5 + Math.cos(a) * 9), Math.round(13 + Math.sin(a) * 2.5), k % 3 ? ST.glow : ST.glowH); }
  // Antimaterie-Kern: dunkler Kern mit magenta Hof
  p.kreis(19.5, 12, 5, '#7a2aa8'); p.kreis(19.5, 12, 4, '#c04ae8'); p.kreis(19.5, 12, 2.6, '#2a0a3a'); p.kreis(19.5, 12, 1.4, '#140420');
  p.px(17, 10, '#ffc8ff').px(18, 9, '#ffffff');
  // Vorderer Ringbogen über dem Kern
  for (let k = 0; k < 30; k++) { const a = Math.PI * k / 30; p.px(Math.round(19.5 + Math.cos(a) * 9), Math.round(13 + Math.sin(a) * 2.5), k % 3 ? ST.glow : '#ffffff'); }
  // Energieblitze zu den Pfeilern
  p.linie(13, 8, 15, 10, '#e8a0ff'); p.linie(26, 8, 24, 10, '#e8a0ff');
  p.px(19, 4, '#e8a0ff').px(20, 3, '#ffffff');
});

g('sternenhafen', (p) => {
  kristallsockel(p, 1, 30);
  // Leuchtturm-Kristall links
  kristall(p, 4, 27, 4, 22, { glow: ST.glow }); funkeln(p, 4, 2, ST.glowH);
  // Schwebende Landeplattform
  schwebe(p, 18, 20, 12);
  p.px(8, 20, ST.glow).px(28, 20, ST.glow).px(18, 21, ST.glow);
  // Lichtsäule von der Plattform zum Boden
  for (let y = 24; y < 27; y++) p.rect(16, y, 4, 1, y % 2 ? ST.glowD : ST.glow);
  // Elegantes Sternenschiff (Pfeilform, Kristallflügel)
  p.poly([[9, 16], [24, 13], [30, 15], [24, 18], [9, 17]], ST.kristall);
  p.poly([[9, 17], [24, 18], [30, 15], [24, 16]], ST.kristallD);
  p.poly([[13, 15], [20, 7], [22, 7], [19, 15]], ST.kristallM); p.linie(13, 15, 20, 7, ST.kristall);
  p.poly([[14, 17], [21, 19], [17, 19]], ST.kristallDD);
  p.rect(24, 14, 3, 1, ST.glow); p.px(27, 14, '#ffffff');
  for (let x = 13; x < 23; x += 3) p.px(x, 15, ST.glowD);
  p.rect(7, 16, 2, 1, ST.glowH); p.px(6, 16, ST.glow);
  p.px(16, 15, 'S').px(17, 15, 'S').px(18, 14, 'S');
});

g('sternenwerft', (p) => {
  kristallsockel(p, 1, 30);
  // Zwei Kristallpfeiler mit Lichtbogen darüber
  kristall(p, 4, 27, 5, 24, { glow: ST.glow }); kristall(p, 27, 27, 5, 24, { glow: ST.glow });
  for (let k = 0; k <= 40; k++) { const a = Math.PI * k / 40, x = Math.round(15.5 - Math.cos(a) * 11.5), y = Math.round(9 - Math.sin(a) * 6); p.px(x, y, k % 2 ? ST.glow : ST.glowH); p.px(x, y + 1, ST.glowD); }
  // Schwebendes Schiff im Bau (Gerippe + Kristallplatten)
  const y0 = 15;
  p.poly([[7, y0 + 3], [12, y0 - 1], [24, y0 - 1], [24, y0 + 7], [12, y0 + 7]], ST.fussD);
  p.poly([[7, y0 + 3], [12, y0 - 1], [17, y0 - 1], [17, y0 + 7], [12, y0 + 7]], ST.kristall);
  p.linie(8, y0 + 2, 12, y0 - 1, '#ffffff'); p.rect(12, y0 + 6, 5, 1, ST.kristallD); p.rect(12, y0 + 3, 5, 1, ST.glow);
  for (let x = 18; x <= 24; x += 2) p.rect(x, y0 - 1, 1, 9, ST.kristallM);
  p.rect(17, y0 - 1, 8, 1, ST.kristallM); p.rect(17, y0 + 7, 8, 1, ST.kristallM); p.rect(17, y0 + 3, 8, 1, ST.glowD);
  // Traktorstrahlen der Pfeiler
  p.linie(7, 13, 11, 15, ST.glow); p.linie(24, 13, 21, 15, ST.glow);
  // Baudrohnen (kleine Kristallsplitter) mit Schweißlicht
  for (const [x, y] of [[20, 11], [14, 24], [22, 24]]) { p.poly([[x, y], [x + 1, y - 2], [x + 2, y]], ST.kristallM); p.px(x + 1, y + 1, '#fff2a0'); }
  p.px(19, 23, '#ffffff').px(23, 12, '#ffffff');
  fahne(p, 9, 26, 6, 4);
});

g('sternenobservatorium', (p) => {
  kristallsockel(p, 1, 30);
  // Sternenhimmel-Funkeln
  for (const [x, y] of [[4, 4], [27, 3], [29, 10], [3, 12]]) funkeln(p, x, y, ST.glowH);
  // Stufensockel und hoher Kristallturm
  box(p, 7, 26, 18, 3, 2, ST.kristallM, { seite: ST.kristallD });
  kristall(p, 13, 23, 4, 10); kristall(p, 19, 23, 4, 10);
  kristall(p, 16, 23, 6, 18, { glow: ST.glow });
  // Schwebende Linsenringe über dem Turm
  for (const [y, rx] of [[9, 7], [5, 5]]) { p.ellipse(16, y, rx, 1.5, ST.kristallD); p.ellipse(16, y - 0.5, rx - 1, 0.8, ST.glow); p.px(16 - rx + 1, y - 1, '#ffffff'); }
  // Sehstrahl ins All
  for (let y = 0; y < 4; y++) p.px(16, y, y % 2 ? ST.glow : '#ffffff');
  // Kleine Planeten-Holos
  p.kreis(5, 19, 2, '#e8a060'); p.rect(2, 19, 7, 1, '#ffe0a0'); p.kreis(27, 18, 1.6, ST.violett); p.px(26, 17, '#e0d0ff');
});

g('materiewandler', (p) => {
  kristallsockel(p, 1, 30);
  // Eingang: Gesteinshaufen links
  for (const [x, y, r, c] of [[4, 24, 3, '#8a8478'], [8, 25, 2.5, '#a49e92'], [5, 21, 2, '#6e695f']]) { p.kreis(x, y, r, c); p.px(x - 1, y - 1, L(c, 0.3)); }
  // Ausgang: Barren und Blöcke rechts
  for (const [x, y, c] of [[22, 24, '#b8c0c8'], [26, 24, '#b8c0c8'], [24, 21, '#e8b84a'], [27, 21, '#a9a49a']]) { p.rect(x, y, 4, 3, c); p.rect(x, y, 4, 1, L(c, 0.35)); p.px(x + 3, y + 2, D(c, 0.3)); }
  // Sockel mit schwebendem Prisma
  p.poly([[12, 27], [20, 27], [19, 23], [13, 23]], ST.fuss); p.rect(13, 23, 7, 1, ST.kristallM);
  schwebe(p, 16, 21, 5);
  p.poly([[16, 2], [23, 14], [16, 18], [9, 14]], ST.kristall);
  p.poly([[16, 2], [23, 14], [16, 18]], ST.kristallD);
  p.linie(16, 2, 16, 18, ST.kristallM); p.linie(9, 14, 16, 18, ST.kristallDD);
  p.linie(15, 4, 10, 13, '#ffffff');
  p.kreis(16, 12, 1.6, ST.glowH);
  // Strahlen: grau hinein, regenbogenfarben heraus
  p.linie(6, 19, 11, 13, '#c8c4ba');
  const regen = ['#ff6a6a', '#ffd84a', '#6ae86a', '#6ab8ff', '#c08aff'];
  regen.forEach((c, k) => p.linie(21, 12 + k, 27, 15 + k * 1.2, c));
});

g('planetarer_schild', (p) => {
  kristallsockel(p, 1, 30);
  // Kleine Kristallbauten unter dem Schild
  kristall(p, 6, 27, 4, 8); kristall(p, 25, 27, 4, 9); kristall(p, 9, 27, 3, 5); kristall(p, 22, 27, 3, 5);
  // Großes leuchtendes Schutzfeld über das ganze Bild
  schutzfeld(p, 15.5, 27, 14.5, 26, ST.glow, '#ffffff');
  schutzfeld(p, 15.5, 27, 13.5, 25, ST.glowD);
  for (const [y, w] of [[8, 9], [16, 12.5]]) for (let x = Math.round(15.5 - w); x <= Math.round(15.5 + w); x += 2) p.px(x, y + ((x >> 1) % 2), ST.glowD);
  // Zentrale Emitter-Spitze mit Strahl zum Scheitel
  kristall(p, 15.5, 27, 6, 19, { glow: ST.glowH });
  p.rect(15, 2, 2, 5, ST.glow); p.px(15, 2, '#ffffff');
  gluehkugel(p, 15.5, 7, 1.6, ST.glow);
  fahne(p, 2, 26, 6, 3);
});

g('terraformer', (p) => {
  // Grüner Boden mit See
  p.rect(1, 25, 30, 5, '#4fb84a'); p.rect(1, 25, 30, 1, '#7ad86a'); p.rect(1, 29, 30, 1, '#2f7f34');
  p.ellipse(8, 27, 5, 1.5, WASSER); p.rect(6, 27, 3, 1, WASSER_H);
  for (const [x, r] of [[15, 2], [28, 2.5], [2, 1.5]]) { p.rect(x, 22, 1, 3, PAL.holzD); p.kreis(x, 21 - r, r, '#3d9a3a'); p.px(x - 1, 20 - r, '#7ad86a'); }
  // Atmosphärenprozessor: Kristallturm auf Sockel
  box(p, 18, 26, 9, 4, 2, ST.kristallM, { seite: ST.kristallD });
  kristall(p, 22.5, 23, 7, 19, { glow: ST.glow });
  p.rect(18, 15, 10, 2, ST.fuss); p.rect(18, 15, 10, 1, ST.kristallM); p.px(20, 16, ST.glow).px(25, 16, ST.glow);
  // Austretende Wolken und Regen
  for (const [x, y, r] of [[10, 6, 3], [6, 7, 2.5], [14, 5, 2.5], [28, 3, 2]]) { p.kreis(x, y, r, '#eef4f8'); p.px(x - 1, y - 1, '#ffffff'); p.rect(Math.round(x - r), y + 1, Math.round(2 * r), 1, '#c8d4de'); }
  for (const [x, y] of [[5, 11], [8, 13], [11, 11], [14, 13], [7, 16], [12, 16]]) { p.px(x, y, '#8fc0ee'); p.px(x, y + 1, '#6aa6e0'); }
  p.linie(20, 6, 16, 5, '#eef4f8'); p.linie(25, 5, 27, 4, '#eef4f8');
});

g('weltarchiv', (p) => {
  kristallsockel(p, 1, 30);
  // Gestufter Sockel
  box(p, 4, 26, 22, 3, 2, ST.kristallM, { seite: ST.kristallD });
  box(p, 8, 23, 14, 3, 2, ST.kristall, { seite: ST.kristallM });
  // Monolith mit leuchtenden Schriftzeilen
  p.rect(12, 6, 7, 15, ST.kristallD); p.rect(12, 6, 3, 15, ST.kristall); p.rect(15, 6, 1, 15, ST.kristallM);
  p.poly([[12, 6], [15, 2], [19, 6]], ST.kristallM); p.linie(12, 6, 15, 2, '#ffffff');
  for (let y = 8; y < 20; y += 2) { p.rect(13, y, 2, 1, (y % 4) ? ST.violett : ST.glowD); p.rect(16, y, 2, 1, (y % 4) ? ST.glow : '#d8c0ff'); }
  // Schwebende Datenkristalle im Orbit
  for (const [x, y, c] of [[5, 11, ST.violett], [25, 9, ST.glow], [7, 18, ST.glow], [24, 17, ST.violett], [20, 3, '#ffd84a']]) {
    p.poly([[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], c); p.px(x - 1, y - 1, '#ffffff'); p.px(x + 1, y + 1, D(c, 0.3));
  }
  // Umlaufbahn angedeutet
  for (let k = 0; k < 36; k++) { const a = Math.PI * 2 * k / 36; if (k % 2) p.px(Math.round(15.5 + Math.cos(a) * 12), Math.round(13 + Math.sin(a) * 4), ST.kristallM); }
});
