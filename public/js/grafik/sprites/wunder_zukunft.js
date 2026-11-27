// Sprites der Zeitalter 7 bis 10 (KI, Fusion, Weltraum, Sterne). Siehe PLAN-ZEITALTER-8-11.md.
// Weltwunder (64x64) wie in wunder.js: große, detaillierte Einzelbilder, Licht von oben links,
// Umriss wird automatisch ergänzt. Farbwelten wie in gebaeude_zukunft.js:
//   Weltgehirn (KI, #5b8cff), Künstliche Sonne (Fusion, #f2a33a),
//   Weltraumaufzug (Weltraum, #8e7cc3), Sternenarche (Sterne, #e6eef7).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische } from '../pixel.js';

const D = (c, t = 0.28) => dunkel(c, t);
const L = (c, t = 0.2) => hell(c, t);

const KI = {
  akzent: '#5b8cff', akzentH: '#9fbcff', akzentD: '#3a5fc0', glas: '#7fb2f0', glasD: '#4a78c8', glasH: '#c4e0ff',
  rahmen: '#e8eef5', rahmenD: '#b4c0cc', metall: '#c4ccd6', metallD: '#8a96a4', dunkel: '#28304a', dunkelH: '#3c4664',
  gruen: '#4fb84a', gruenH: '#7ad86a', gruenD: '#2f7f34',
};
const FU = {
  akzent: '#f2a33a', akzentH: '#ffd27a', akzentD: '#c07418', kern: '#fff4c8',
  weiss: '#f4f2ee', weissD: '#ccd0d8', weissDD: '#9aa0ac', dunkel: '#3c404c',
};
const WR = {
  akzent: '#8e7cc3', akzentH: '#c2b4f0', akzentD: '#5e4e94', glow: '#d8ccff',
  rumpf: '#e2e0ea', rumpfD: '#a8a4b8', dunkel: '#3a3450', dunkelH: '#5a5274', glas: '#9ab0e8', glasD: '#5a68a8',
};
const ST = {
  kristall: '#e6eef7', kristallM: '#b8d0ea', kristallD: '#7e9cc4', kristallDD: '#4e6890',
  glow: '#8ff0ff', glowH: '#e0fcff', glowD: '#3ab8d8', fuss: '#5a6a8a', fussD: '#3a4664', violett: '#b08aff',
};
const WEISS_TOENE = ['#ffffff', '#f4f2ee', '#dcdfe6', '#b4bac6'];

// ---------- Hilfen ----------
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
/** Glatt schattierte Kuppel/Halbellipse (Licht oben links) in vier Tönen: [glanz, hell, mittel, schatten]. */
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
/** Glatt schattierte Vollkugel/Ellipse in vier Tönen. */
function kugel(p, cx, cy, rx, ry, toene) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x - cx) / (rx + 0.5), v = (y - cy) / (ry + 0.5), q = u * u + v * v;
    if (q > 1) continue;
    const z = Math.sqrt(1 - q), i = -0.5 * u - 0.5 * v + 0.7 * z;
    p.px(x, y, i > 0.98 ? toene[0] : i > 0.62 ? toene[1] : i > 0.25 ? toene[2] : toene[3]);
  }
}
/** Glasfassade mit Geschossbändern, Pfosten und diagonalen Lichtreflexen. */
function glasfront(p, x, y, w, h, o = {}) {
  const c = o.glas || KI.glas, et = o.etage ?? 3, ps = o.pfosten ?? 4;
  p.rect(x, y, w, h, c);
  for (let j = et - 1; j < h; j += et) p.rect(x, y + j, w, 1, o.band || D(c, 0.3));
  if (ps) for (let i = ps - 1; i < w; i += ps) for (let j = 0; j < h; j++) if ((j + 1) % et) p.px(x + i, y + j, mische(c, KI.rahmen, 0.45));
  for (const s of o.reflex ?? [1, 4]) for (let j = 0; j < h; j++) {
    const xx = x + s + Math.floor((h - 1 - j) * 0.5);
    if (xx >= x && xx < x + w && (j + 1) % et) p.px(xx, y + j, L(c, 0.45));
  }
}
/** Dachgarten auf dem Deckel eines Quaders. */
function dachgarten(p, B, n = 3) {
  const { x, top, b, d } = B;
  for (let k = 1; k <= d; k++) p.rect(x + k, top - k, b - 1, 1, k % 2 ? KI.gruen : KI.gruenD);
  p.rect(x, top - 1, b + 1, 1, KI.rahmen);
  for (let i = 0; i < n; i++) {
    const bx = x + 2 + Math.round(i * (b - 3) / Math.max(1, n - 1)), by = top - 2 - (i % 2);
    p.rect(bx, by - 1, 1, 2, PAL.holzD); p.kreis(bx, by - 3, 1.6, KI.gruen); p.px(bx - 1, by - 4, KI.gruenH);
  }
}
/** Kleine Quadrokopter-Drohne (5x3). */
function drohne(p, x, y, c = KI.akzent) { p.karte(x, y, ['hh.hh', '.kck.', '..g..'], { h: '#dfe6ee', k: '#3a4458', c, g: '#ff4a4a' }); }
/** Glühende Kugel: außen c, innen heller bis kern. */
function gluehkugel(p, cx, cy, r, c, kern = '#ffffff') {
  p.kreis(cx, cy, r, c);
  p.kreis(cx, cy, r * 0.65, mische(c, kern, 0.5));
  p.kreis(cx - r * 0.15, cy - r * 0.15, Math.max(0.6, r * 0.3), kern);
}
/** Ellipsenring (Kontur) mit Drehung um den Winkel w; o.haelfte: nur vordere (true) oder hintere (false) Hälfte; o.links: nur linke (true) oder rechte (false) Hälfte; o.waagerecht: Dicke nach rechts statt nach unten. */
function ring(p, cx, cy, rx, ry, w, dicke, farbe, o = {}) {
  const n = Math.round((rx + ry) * 6), cw = Math.cos(w), sw = Math.sin(w);
  for (let k = 0; k < n; k++) {
    const a = Math.PI * 2 * k / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    if (o.haelfte !== undefined && (Math.sin(a) > 0) !== o.haelfte) continue;
    if (o.links !== undefined && (Math.cos(a) < 0) !== o.links) continue;
    const x = cx + ex * cw - ey * sw, y = cy + ex * sw + ey * cw;
    for (let d = 0; d < dicke; d++) p.px(Math.round(x) + (o.waagerecht ? d : 0), Math.round(y) + (o.waagerecht ? 0 : d), typeof farbe === 'function' ? farbe(k, d, a) : farbe);
  }
}
/** Kristallspitze (Prisma mit Facetten). */
function kristall(p, cx, yb, b, h, o = {}) {
  const c = o.c || ST.kristall, m = o.m || ST.kristallM, d = o.d || ST.kristallD;
  const hb = b / 2, spitze = yb - h, schulter = yb - h + Math.round(b * 0.8);
  p.poly([[cx - hb, yb], [cx - hb, schulter], [cx, spitze], [cx, yb]], c);
  p.poly([[cx, yb], [cx, spitze], [cx + hb, schulter], [cx + hb, yb]], d);
  p.linie(cx, spitze, cx, yb, m);
  if (b >= 4) p.linie(Math.round(cx - hb + 1), schulter + 1, Math.round(cx - hb + 1), yb - 1, L(c, 0.5));
  if (o.glow) for (let y = schulter + 2; y < yb - 1; y += 3) p.px(cx, y, o.glow);
}
/** Sternfunkeln (kleines Plus). */
function funkeln(p, x, y, c = '#ffffff') { p.px(x, y, c).px(x - 1, y, L(c, 0.2)).px(x + 1, y, L(c, 0.2)).px(x, y - 1, L(c, 0.2)).px(x, y + 1, L(c, 0.2)); }
/** Wolke aus drei Kreisen. */
function wolke(p, x, y, s = 1) { p.kreis(x, y, 2.5 * s, '#eef4f8'); p.kreis(x + 3 * s, y - 1, 3 * s, '#f6fafc'); p.kreis(x + 6 * s, y, 2.2 * s, '#e4ecf2'); p.rect(Math.round(x - 2 * s), Math.round(y + 2 * s), Math.round(10 * s), 1, '#c8d4de'); }

function w(id, zeichne) { definiere('wunder', id, { w: 64, h: 64, zeichne }); }

// ---------- Weltgehirn (KI) ----------
w('weltgehirn', (p) => {
  // Platz mit leuchtenden Datenleitungen
  p.rect(1, 57, 62, 5, KI.dunkel); p.rect(1, 57, 62, 1, KI.dunkelH); p.rect(1, 61, 62, 1, D(KI.dunkel, 0.3));
  for (let x = 2; x < 62; x += 2) p.px(x, 59, x % 6 === 0 ? KI.akzentH : KI.akzentD);
  // Flankierende Glastürme mit Dachgärten
  const T1 = box(p, 2, 56, 10, 30, 3, KI.glas, { seite: KI.glasD });
  glasfront(p, 2, T1.top, 10, 30, { reflex: [1, 6] }); p.rect(2, T1.top, 1, 30, KI.rahmen);
  dachgarten(p, T1, 3);
  const T2 = box(p, 49, 56, 10, 24, 3, KI.glas, { seite: KI.glasD });
  glasfront(p, 49, T2.top, 10, 24, { reflex: [2, 7] }); p.rect(49, T2.top, 1, 24, KI.rahmen);
  dachgarten(p, T2, 3);
  // Rechenzentrum als Sockel
  const B = box(p, 12, 56, 38, 13, 5, KI.dunkelH, { seite: KI.dunkel, deckel: KI.metallD });
  p.rect(12, B.top, 38, 1, KI.akzent);
  for (let i = 0; i < 6; i++) {
    const x = 14 + i * 6; p.rect(x, B.top + 3, 4, 9, '#161a28');
    for (let y = B.top + 4; y < B.top + 12; y += 2) { p.px(x + 1, y, ['#30e060', KI.akzentH, '#ffb020', KI.akzent][(i + y) % 4]); p.rect(x + 2, y, 2, 1, '#2a3040'); }
  }
  p.rect(28, 50, 6, 6, KI.glasD); p.rect(28, 50, 6, 1, KI.akzentH); p.rect(31, 50, 1, 6, KI.glas);
  // Sockelring der Kuppel
  p.ellipse(31, 42, 19, 3, KI.metallD); p.ellipse(31, 41.5, 18, 2.4, KI.metall);
  for (let k = 0; k < 18; k++) p.px(14 + k * 2, 42 + (k % 2), k % 3 ? KI.akzent : KI.akzentH);
  // Gehirnkuppel aus Glas: zwei Hälften, Windungen, Spalt
  kugel(p, 31, 28, 18, 13, ['#e4f0ff', KI.glasH, KI.glas, KI.glasD]);
  for (let r = 0; r < 6; r++) {
    const y0 = 19 + r * 4;
    for (let x = 14; x <= 48; x++) {
      const y = Math.round(y0 + Math.sin((x + r * 3) * 0.55) * 1.4);
      const u = (x - 31) / 18.5, v = (y - 28) / 13.5;
      if (u * u + v * v < 0.86 && Math.abs(x - 31) > 1) p.px(x, y, (x + r) % 7 ? KI.akzentD : KI.akzent);
    }
  }
  for (let y = 15; y <= 40; y++) p.px(31 + Math.round(Math.sin(y * 0.7) * 0.6), y, '#2a3a7a');
  p.rect(30, 15, 3, 2, 'leer'); p.px(31, 17, 'leer'); p.px(30, 17, '#2a3a7a'); p.px(32, 17, '#2a3a7a');
  // Neuronen: helle Knoten mit Verbindungen
  const knoten = [[21, 21], [26, 25], [22, 31], [36, 20], [41, 26], [38, 33], [27, 35], [45, 30], [18, 27]];
  for (let i = 0; i < knoten.length - 1; i += 2) p.linie(knoten[i][0], knoten[i][1], knoten[i + 1][0], knoten[i + 1][1], KI.akzentH);
  for (const [x, y] of knoten) { p.px(x, y, '#ffffff'); p.px(x + 1, y, KI.akzentH); p.px(x, y + 1, KI.akzentH); }
  // Glanzlicht
  for (const [x, y] of [[20, 18], [21, 17], [22, 16], [18, 20]]) p.px(x, y, '#ffffff');
  // Antennen mit Signallichtern
  p.rect(31, 9, 1, 6, KI.metall); p.px(31, 8, '#ff4a4a'); p.rect(29, 11, 5, 1, KI.metall);
  for (const s of [-1, 1]) { const x = 31 + s * 4; p.px(x, 6, KI.akzentH).px(x + s, 7, KI.akzentH).px(x + s, 8, KI.akzentH).px(x, 9, KI.akzentH); }
  // Datenleitungen vom Gehirn zu den Türmen
  p.linie(13, 32, 9, 26, KI.akzent); p.linie(49, 32, 53, 32, KI.akzent);
  for (const [x, y] of [[11, 29], [51, 32]]) p.px(x, y, '#ffffff');
  // Drohnen
  drohne(p, 3, 6); drohne(p, 52, 10); drohne(p, 44, 2);
});

// ---------- Künstliche Sonne (Fusion) ----------
w('kuenstliche_sonne', (p) => {
  const cx = 32, cy = 25;
  // Strahlenkranz hinter allem
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8 + 0.2, r0 = 15, r1 = k % 2 ? 22 : 27;
    p.linie(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, k % 2 ? FU.akzentH : '#fff0b0');
  }
  // Hintere Ringhälften des Gerüsts
  const ringFarbe = (k, d) => d === 0 ? FU.weiss : d === 1 ? (k % 6 ? FU.akzent : FU.kern) : FU.weissDD;
  ring(p, cx, cy, 20, 6, 0, 3, (k, d) => d === 1 ? FU.akzentD : FU.weissDD, { haelfte: false });
  ring(p, cx, cy, 19, 7, -0.65, 2, FU.weissDD, { haelfte: false });
  // Sockel: weiße Fusionsanlage mit Kuppeln und Lichtbändern
  p.rect(1, 57, 62, 5, FU.weissDD); p.rect(1, 57, 62, 1, FU.weissD);
  for (let x = 3; x < 62; x += 4) p.px(x, 59, FU.akzent);
  const B = box(p, 8, 56, 46, 8, 4, FU.weiss, { seite: FU.weissD });
  for (let x = 8; x < 54; x++) p.px(x, 52, x % 2 ? FU.akzent : FU.akzentH);
  for (let x = 12; x < 52; x += 6) { p.rect(x, 54, 3, 2, FU.dunkel); p.px(x, 54, '#5a8ab0'); }
  void B;
  for (const [x, r] of [[6, 6], [57, 6]]) { glattkuppel(p, x, 56, r, r + 1, WEISS_TOENE); p.rect(x - r, 53, 2 * r + 1, 1, FU.akzent); }
  // Stützpfeiler zum Ringgerüst
  for (const [x0, x1] of [[16, 22], [47, 42]]) { p.linie(x0, 48, x1, 32, FU.weissD); p.linie(x0 + 1, 48, x1 + 1, 32, FU.weiss); p.linie(x0 + 2, 48, x1 + 2, 32, FU.weissDD); }
  p.rect(26, 40, 13, 8, FU.weissD); p.rect(26, 40, 13, 1, FU.weiss); p.rect(30, 42, 5, 6, FU.dunkel); p.rect(31, 43, 3, 5, FU.akzentD);
  // Die Sonne: strahlende Plasmakugel
  p.kreis(cx, cy, 13, '#f27a1a');
  p.kreis(cx, cy, 12, FU.akzent);
  p.kreis(cx - 1, cy - 1, 10, '#ffc04a');
  p.kreis(cx - 2, cy - 2, 7.5, FU.akzentH);
  p.kreis(cx - 3, cy - 3, 5, '#fff0b0');
  p.kreis(cx - 4, cy - 4, 2.5, '#ffffff');
  for (const [x, y] of [[40, 30], [38, 34], [24, 32], [42, 22], [27, 17]]) p.px(x, y, '#ffe0a0');
  p.px(25, 30, '#f27a1a').px(39, 20, '#f27a1a');
  // Vordere Ringhälften (davor)
  ring(p, cx, cy, 20, 6, 0, 3, ringFarbe, { haelfte: true });
  ring(p, cx, cy, 19, 7, -0.65, 2, (k, d) => d ? FU.weissD : (k % 5 ? FU.weiss : FU.akzentH), { haelfte: true });
  // Senkrechter Hauptring (Vollkreis mit Lichtband)
  ring(p, cx, cy, 16, 16, 0, 1, (k) => k % 4 ? FU.weiss : FU.akzentH);
  ring(p, cx, cy, 17, 17, 0, 1, (k) => k % 3 ? FU.weissD : FU.akzent);
  // Lichtpunkte an den Ringknoten
  for (const [x, y] of [[12, 25], [52, 25], [32, 9], [32, 41]]) { p.rect(x - 1, y - 1, 3, 3, FU.weiss); p.px(x, y, FU.akzent); }
});

// ---------- Weltraumaufzug (Weltraum) ----------
w('weltraumaufzug', (p) => {
  // Sterne oben, Wolken auf halber Höhe
  for (const [x, y] of [[6, 4], [14, 10], [50, 3], [58, 12], [42, 8], [22, 2], [8, 18], [55, 22]]) p.px(x, y, y % 3 ? WR.glow : '#ffffff');
  // Seil (schmales Leuchtband) bis aus dem Bild
  for (let y = 0; y < 40; y++) { p.px(31, y, y % 2 ? WR.akzent : WR.akzentD); p.px(32, y, y % 5 ? WR.glow : '#ffffff'); }
  wolke(p, 4, 32, 1.1); wolke(p, 44, 27, 1.2); wolke(p, 20, 38, 0.7);
  // Kletterkabine: Kasten im Rahmen, mit Greifrädern am Seil
  const ky = 13;
  p.rect(25, ky - 1, 15, 11, WR.dunkel);
  p.rect(26, ky, 13, 9, WR.rumpf); p.rect(26, ky, 13, 1, '#ffffff'); p.rect(26, ky, 1, 9, '#ffffff'); p.rect(37, ky + 1, 2, 8, WR.rumpfD);
  for (let x = 28; x < 37; x += 3) { p.rect(x, ky + 2, 2, 3, WR.glasD); p.px(x, ky + 2, WR.glow); }
  p.rect(26, ky + 6, 13, 1, WR.akzent); p.rect(26, ky + 7, 13, 1, WR.akzentD);
  for (const yy of [ky - 3, ky + 11]) { p.rect(29, yy, 7, 2, WR.dunkelH); p.kreis(30, yy + 1, 1, WR.dunkel); p.kreis(34, yy + 1, 1, WR.dunkel); }
  p.rect(22, ky + 2, 3, 5, '#2a3a7a'); p.rect(40, ky + 2, 3, 5, '#2a3a7a'); p.px(22, ky + 2, '#5a7ad8'); p.px(40, ky + 2, '#5a7ad8');
  p.px(24, ky - 1, '#ff4a4a').px(40, ky - 1, '#30ff80');
  // Zweite, kleine Kabine weit oben (Perspektive)
  p.rect(29, 3, 6, 4, WR.dunkel); p.rect(30, 4, 4, 2, WR.rumpf); p.px(30, 4, '#ffffff'); p.px(32, 5, WR.glow);
  // Bodenplattform
  p.ellipse(32, 58, 30, 4, WR.dunkel); p.rect(2, 57, 60, 5, WR.dunkel);
  p.ellipse(32, 56.5, 29, 3.5, WR.dunkelH);
  for (let k = 0; k < 24; k++) { const a = Math.PI * 2 * k / 24; p.px(Math.round(32 + Math.cos(a) * 26), Math.round(56.5 + Math.sin(a) * 2.8), k % 2 ? WR.glow : WR.akzent); }
  // Nebengebäude mit Habitat-Kuppeln
  box(p, 4, 55, 12, 7, 2, WR.rumpf, { seite: WR.rumpfD }); p.rect(4, 51, 12, 1, WR.akzent);
  glattkuppel(p, 10, 47, 5, 5, ['#ffffff', WR.rumpf, '#c8c4d6', WR.rumpfD]); p.rect(5, 45, 11, 1, WR.akzentH);
  box(p, 47, 55, 12, 9, 2, WR.rumpf, { seite: WR.rumpfD }); p.rect(47, 50, 12, 1, WR.akzent);
  for (let x = 49; x < 58; x += 3) { p.rect(x, 52, 2, 2, WR.glasD); p.px(x, 52, WR.glow); }
  p.rect(53, 38, 1, 8, WR.rumpfD); p.ellipse(53, 38, 3, 1.5, WR.rumpf); p.px(53, 36, WR.glow);
  // Ankerturm: verjüngter Mast mit Streben
  p.poly([[18, 56], [46, 56], [38, 40], [26, 40]], WR.dunkel);
  p.poly([[32, 56], [46, 56], [38, 40], [32, 40]], D(WR.dunkel, 0.2));
  for (let y = 44; y < 56; y += 4) { const w0 = 6 + (y - 40) * 0.5; p.linie(Math.round(32 - w0), y, 32, y + 3, WR.dunkelH); p.linie(Math.round(32 + w0), y, 32, y + 3, WR.dunkelH); }
  p.linie(26, 40, 18, 56, WR.akzentH); p.linie(38, 40, 46, 56, WR.akzentD);
  p.rect(23, 37, 19, 4, WR.rumpf); p.rect(23, 37, 19, 1, '#ffffff'); p.rect(38, 38, 4, 3, WR.rumpfD);
  for (let x = 24; x < 41; x += 2) p.px(x, 40, WR.akzent);
  glattkuppel(p, 32, 36, 5, 3, ['#ffffff', WR.rumpf, '#c8c4d6', WR.rumpfD]);
  // Seil im Ankerkopf, Tor unten
  for (let y = 26; y < 34; y++) { p.px(31, y, WR.akzent); p.px(32, y, WR.glow); }
  p.rect(29, 48, 7, 8, WR.dunkelH); p.rect(30, 49, 5, 7, WR.glasD); p.rect(32, 49, 1, 7, WR.glow);
  p.rect(28, 46, 9, 1, WR.akzent);
});

// ---------- Sternenarche (Sterne) ----------
w('sternenarche', (p) => {
  // Sternenhimmel
  for (const [x, y] of [[5, 5], [18, 3], [44, 4], [58, 9], [3, 22], [61, 28], [30, 2]]) funkeln(p, x, y, x % 2 ? ST.glowH : '#ffffff');
  // Startplattform: Kristallsockel mit Stützarmen und Schwebeglühen
  p.poly([[4, 56], [60, 56], [56, 61], [8, 61]], ST.fuss); p.rect(4, 56, 57, 1, ST.kristallM); p.rect(8, 61, 49, 1, ST.fussD);
  for (let x = 7; x < 58; x += 5) p.px(x, 58, ST.glow);
  for (const x of [8, 56]) { kristall(p, x, 56, 5, 16, { glow: ST.glow }); }
  // Startwiege: gestufter Block unter dem Rumpf
  p.poly([[14, 56], [50, 56], [46, 46], [18, 46]], ST.fuss);
  p.poly([[32, 56], [50, 56], [46, 46], [32, 46]], ST.fussD);
  p.rect(18, 46, 29, 1, ST.kristallM); p.linie(14, 56, 18, 46, ST.kristallM);
  for (let x = 20; x < 46; x += 4) p.px(x, 51, ST.glow);
  for (const x of [20, 40]) { p.poly([[x, 46], [x + 5, 46], [x + 4, 41], [x + 1, 41]], ST.kristallD); p.linie(x, 46, x + 1, 41, ST.kristall); }
  // Schwebeglühen unter der Wiege
  p.rect(22, 57, 20, 1, ST.glow);
  // Habitat-Ring, hintere Hälfte (liegt hinter dem Rumpf)
  ring(p, 36, 32, 6, 15, 0, 3, (k, d) => d === 3 ? ST.kristallDD : d === 0 ? ST.kristallM : ST.kristallD, { links: false, waagerecht: true });
  // Rumpf des Generationenschiffs: langer Keil mit Bug nach rechts
  const H = [[5, 26], [11, 22], [46, 22], [62, 31], [46, 41], [11, 42], [5, 38]];
  p.poly(H, ST.kristallM);
  p.poly([[5, 26], [11, 22], [46, 22], [62, 31], [5, 31]], ST.kristall);
  p.poly([[5, 35], [62, 31], [46, 41], [11, 42], [5, 38]], ST.kristallD);
  p.poly([[11, 39], [48, 39], [46, 41], [11, 42]], ST.kristallDD);
  p.linie(11, 22, 46, 22, '#ffffff'); p.linie(5, 26, 11, 22, '#ffffff'); p.linie(46, 22, 62, 31, ST.glowH);
  // Plattenfugen und Fensterband
  for (let x = 12; x < 46; x += 6) { p.rect(x, 23, 1, 8, ST.kristallM); p.rect(x, 35, 1, 5, ST.kristallDD); }
  p.rect(6, 32, 50, 1, ST.fuss);
  for (let x = 8; x < 54; x += 2) p.px(x, 32, (x % 6) ? ST.glow : '#ffffff');
  for (let x = 13; x < 46; x += 4) p.px(x, 27, ST.glowD);
  // Bugkristall
  p.poly([[50, 25], [62, 31], [50, 31]], ST.glowH); p.poly([[50, 31], [62, 31], [50, 36]], ST.glowD); p.px(61, 31, '#ffffff');
  // Kristall-Antennen auf dem Rücken
  kristall(p, 14, 22, 3, 9, { glow: ST.glow }); kristall(p, 43, 22, 3, 7);
  // Biosphärenkuppel auf dem Rücken
  glattkuppel(p, 26, 22, 8, 7, ['#e8fff0', '#b8e8f8', '#8acce8', '#6aa8cc']);
  for (const [x, y, r, c] of [[23, 19, 2.5, '#3d9a3a'], [28, 18, 3, '#4fb84a'], [31, 20, 2, '#5ac85a']]) { p.kreis(x, y, r, c); p.px(x - 1, y - 1, L(c, 0.35)); }
  for (let k = 0; k < 20; k++) { const a = Math.PI * k / 19; p.px(Math.round(26 - Math.cos(a) * 8), Math.round(22 - Math.sin(a) * 7), ST.kristallM); }
  p.px(21, 17, '#ffffff').px(22, 16, '#ffffff');
  // Rotierender Habitat-Ring um die Schiffsmitte (vordere Hälfte)
  ring(p, 36, 32, 6, 15, 0, 3, (k, d) => d === 0 ? '#ffffff' : d === 1 ? ST.kristall : d === 2 ? (k % 6 ? ST.kristallM : ST.glow) : ST.kristallD, { links: true, waagerecht: true });
  // Triebwerke hinten mit Leuchten
  for (const y of [27, 32, 37]) { p.rect(2, y - 2, 4, 5, ST.fussD); gluehkugel(p, 2, y, 2, ST.glowD, ST.glowH); }
  // Wappenstreifen in Volksfarbe
  p.rect(44, 26, 6, 1, 'S'); p.rect(45, 27, 5, 1, 'S-');
});
