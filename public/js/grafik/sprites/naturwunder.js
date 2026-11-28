// Naturwunder: große Landschaftsobjekte, die 1 bis 3 Hexfelder überdecken.
// Größen: 1 Feld 64x56 (Boden bei y≈45), 2 Felder 96x64 (Boden bei y≈51), 3 Felder 112x72 (Boden bei y≈58).
// Jedes Motiv liegt auf einem ausgefransten Bodenfleck (kein Rechteck, keine Hexkanten). Licht von oben links.
// o.variante 0..3 zeichnet kleine Animationsphasen (Rauch, Glitzern, Fontäne, Gischt); das Motiv bleibt gleich.
import { definiere } from '../sprites.js';
import { hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

// ---------- Hilfen ----------
function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function saat(s, v = 0) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return zufall(h + v * 7919); }
/** Fester Pixel-Hash 0..1 (deterministisches Rauschen). */
function hs(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Weiche Randwelle in Abhängigkeit vom Winkel. */
function welle(seed) {
  const r = zufall(seed * 31 + 7), ph = [r(), r(), r(), r(), r()].map((v) => v * Math.PI * 2);
  return (a) => 0.45 * Math.sin(a * 3 + ph[0]) + 0.3 * Math.sin(a * 5 + ph[1]) + 0.18 * Math.sin(a * 8 + ph[2]) + 0.12 * Math.sin(a * 13 + ph[3]) + 0.08 * Math.sin(a * 19 + ph[4]);
}
/** Zeichnet fn auf ein eigenes Blatt, umrandet es und überträgt es auf p. */
function teil(p, fn, rand = UMRISS, ohneUnten = false) {
  const t = new Pinsel(p.w, p.h); fn(t);
  const vorher = ohneUnten ? t.feld.slice() : null;
  if (rand) t.umriss(rand);
  // Untere Umrisskante weglassen, damit Hänge weich in den Boden übergehen
  if (vorher) for (let y = 1; y < t.h; y++) for (let x = 0; x < t.w; x++) { const i = y * t.w + x; if (!vorher[i] && vorher[i - t.w]) t.feld[i] = null; }
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
  return t;
}
/** Mischt eine Farbe in vorhandene Pixel (für Nebel, Glühen, Schimmer). */
function toenen(p, x, y, c, t) { const a = p.hole(x, y); if (a && a[0] === '#') p.px(x, y, mische(a, c, t)); }
function nw(id, w, h, zeichne) { definiere('naturwunder', id, { w, h, varianten: 4, umriss: false, zeichne }); }

/**
 * Ausgefranster Bodenfleck. T = { r: Rand, d, b, h, hh }. Lichtverlauf von oben links, natürliches Rauschen.
 * Liefert eine Maske (Funktion x,y -> bool), die den Fleck beschreibt.
 */
function fleck(p, cx, cy, rx, ry, T, seed, amp = 0.13) {
  const n = welle(seed), t = new Pinsel(p.w, p.h);
  const g = (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return [Math.hypot(dx, dy), 1 + amp * n(Math.atan2(dy, dx)), dx, dy]; };
  for (let y = Math.floor(cy - ry * 1.4); y <= Math.ceil(cy + ry * 1.4); y++)
    for (let x = Math.floor(cx - rx * 1.4); x <= Math.ceil(cx + rx * 1.4); x++) {
      const [d, lim, dx, dy] = g(x, y);
      if (d > lim + 0.05) continue;
      if (d > lim) { if (hs(x, y, seed) < 0.22) t.px(x, y, T.b); continue; }
      if (lim - d < 0.07 && hs(x, y, seed + 3) < 0.35) continue;
      const v = -dx * 0.32 - dy * 0.5 + (hs(x, y, seed + 1) - 0.5) * 0.55 + (hs(x >> 2, y >> 1, seed + 2) - 0.5) * 0.35;
      t.px(x, y, v > 0.5 ? T.hh : v > 0.08 ? T.h : v > -0.38 ? T.b : T.d);
    }
  // Rand dunkel abschließen
  const f = t.feld.slice(), W = t.w;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < W; x++) {
    if (!f[y * W + x]) continue;
    const leer = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= t.h || !f[yy * W + xx];
    if (leer(x, y + 1) || leer(x + 1, y) || (leer(x - 1, y) && hs(x, y, seed + 5) < 0.6) || (leer(x, y - 1) && hs(x, y, seed + 6) < 0.4)) t.feld[y * W + x] = T.r;
  }
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
  return (x, y) => { const [d, lim] = g(x, y); return d <= lim - 0.04; };
}
/** Funkelstern: Kern + vier Strahlen. */
function funkel(p, x, y, c, s = 1, kern = '#ffffff') {
  for (let i = 1; i <= s; i++) { p.px(x - i, y, c).px(x + i, y, c).px(x, y - i, c).px(x, y + i, c); }
  p.px(x, y, kern);
}
/** Rasternebel: tönt vorhandene Pixel in einer Ellipse jeden zweiten Pixel auf, leere Pixel werden locker gefüllt. */
function dunst(p, cx, cy, rx, ry, c, phase = 0, dicht = 0.5, leerAuch = true) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d > 1) continue;
      const kern = d < 0.35;
      const a = p.hole(x, y);
      const st = dicht * Math.min(1, (1 - d) * 1.6) * (((x + y + phase) & 1) ? 0.8 : 1);
      if (a && a[0] === '#') p.px(x, y, mische(a, c, st));
      else if (!a && leerAuch && ((x + y + phase) & 1) === 0 && d < 0.7) p.px(x, y, c);
    }
}
/** Gras-Büschel. */
function gras(p, x, y, c1, c2) { p.px(x, y, c2).px(x, y - 1, c1).px(x - 1, y - 1, c2).px(x - 1, y - 2, c1).px(x + 1, y - 1, c1).px(x + 2, y - 2, c1); }
/** Kleiner Felsbrocken. T = { hh, h, b, d }. */
function fels(p, x, y, s, T) {
  const w = 1.5 + s * 1.4, h = 1 + s * 1.2;
  p.poly([[x - w, y], [x - w + 0.5, y - h * 0.6], [x - w * 0.4, y - h], [x + w * 0.4, y - h], [x + w, y - h * 0.4], [x + w, y]], T.d);
  p.poly([[x - w, y - 1], [x - w + 0.5, y - h * 0.6], [x - w * 0.4, y - h], [x + w * 0.3, y - h], [x + w * 0.1, y - 1]], T.b);
  p.linie(x - w * 0.4, y - h, x + w * 0.3, y - h, T.h);
  p.px(x - w * 0.4, y - h, T.hh);
}
/** Busch/Laubballen. T = { d, b, h }. */
function busch(p, x, y, rr, T) {
  p.ellipse(x + 0.3, y - rr * 0.7, rr, rr * 0.75, T.d);
  p.ellipse(x - 0.3, y - rr * 0.85, rr - 0.6, rr * 0.55, T.b);
  p.px(x - Math.round(rr * 0.5), y - Math.round(rr * 1.1), T.h);
  if (rr > 2) p.px(x - Math.round(rr * 0.5) + 1, y - Math.round(rr * 1.1), T.h);
}
/** Palme mit Neigung. */
const PALM = { st: '#8a6a3e', stD: '#5e4424', b: '#2f9a44', d: '#1b6a2e', h: '#62c86a', n: '#6b4a2a' };
function palme(p, x, y, h, lean, T = PALM, gross = 1) {
  let tx = x, ty = y - h;
  for (let t = 0; t <= h; t++) {
    const xx = x + Math.round(lean * (t / h) * (t / h));
    p.px(xx, y - t, t % 3 === 0 ? T.stD : T.st); p.px(xx + 1, y - t, T.stD);
    tx = xx; ty = y - t;
  }
  const L = Math.round(7 * gross), wedel = [[-1, -0.35, L + 1], [1, -0.35, L + 1], [-0.75, -1.0, L - 1], [0.75, -1.0, L - 1], [-0.6, 0.2, L - 1], [0.65, 0.2, L - 1], [0.1, -1.2, L - 3]];
  const vx = tx + 0.5, vy = ty;
  for (const [dx, up, l] of wedel) {
    let a = vx, b = vy;
    for (let i = 1; i <= l; i++) {
      const fx = vx + dx * i, fy = vy + up * i + 0.1 * i * i;
      p.linie(a, b, fx, fy, up < -0.5 || (dx < 0 && i < 4) ? T.h : T.b);
      if (i < l * 0.8) p.linie(a, b + 1, fx, fy + 1, T.d);
      a = fx; b = fy;
    }
  }
  p.rect(tx - 1, ty - 1, 3, 2, T.b); p.px(tx - 1, ty - 1, T.h);
  p.px(tx, ty + 1, T.n).px(tx + 1, ty + 1, '#4a3018').px(tx - 1, ty + 1, '#4a3018');
}
/** Kristall als Prisma von (x,y) in Richtung Winkel a (0 = nach oben), Länge l, halbe Breite w. */
function kristall(p, x, y, l, a, w, T) {
  const ux = Math.sin(a), uy = -Math.cos(a), vx = -uy, vy = ux; // u: Achse, v: quer (nach rechts)
  const r = l + w + 2;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      const dx = xx - x, dy = yy - y, t = dx * ux + dy * uy, s = dx * vx + dy * vy;
      if (t < -0.5 || t > l) continue;
      const kopf = l * 0.72, hw = t < kopf ? w : w * (l - t) / (l - kopf);
      if (Math.abs(s) > hw + 0.3) continue;
      let c = s < -w * 0.3 ? T.h : s < w * 0.3 ? T.b : T.d;
      if (t >= kopf && s < 0.3) c = T.hh;
      if (t >= kopf && s >= 0.3) c = T.b;
      if (t < kopf && Math.abs(s + w * 0.62) < 0.55) c = T.hh;
      if (t < kopf && t < 2) c = s < 0 ? T.b : T.dd;
      p.px(xx, yy, c);
    }
}
/** Rauchwolke aus mehreren Ballen. */
function rauchballen(p, x, y, rr, T) {
  p.ellipse(x + 0.6, y + 0.6, rr, rr * 0.85, T.d);
  p.ellipse(x, y, rr - 0.3, rr * 0.85 - 0.3, T.b);
  p.ellipse(x - rr * 0.3, y - rr * 0.3, rr * 0.55, rr * 0.45, T.h);
  if (rr > 2) p.px(x - rr * 0.5, y - rr * 0.55, T.hh);
}

// ==================== 1 Feld (64x56) ====================

// ---------- Feuerberg: rauchender Vulkankegel mit Glutrinne und Lava am Fuß ----------
const VULKAN = { hh: '#a08a7c', h: '#7c665c', b: '#5e4c46', d: '#443638', dd: '#2c2226' };
const GLUT = { k: '#fff0a0', h: '#ffc040', b: '#ff7a20', d: '#d0401a', dd: '#7a2210', kruste: '#3a1c14' };
nw('feuerberg', 64, 56, (p, o) => {
  const v = o.variante | 0, r = saat('feuerberg');
  // Fruchtbarer Aschering: grüner Rand, dunkler Aschegrund
  fleck(p, 32, 45, 28.5, 9, { r: '#3a5a26', d: '#4a7030', b: '#5a8a38', h: '#72a246', hh: '#8cba58' }, 11);
  fleck(p, 32, 45, 24, 7.5, { r: '#2e2622', d: '#3a302c', b: '#4a3e38', h: '#5c4e46', hh: '#6e5e52' }, 12, 0.16);
  for (const [x, y] of [[5, 44], [9, 49], [55, 43], [58, 47], [14, 52], [50, 52], [33, 54]]) gras(p, x, y, '#8cc45a', '#4a7a30');
  // Vulkankegel
  const cx = 32, by = 45, top = 13, kr = 5, W = 26;
  const tops = {};
  teil(p, (q) => {
    for (let x = cx - W; x <= cx + W; x++) {
      const ad = Math.abs(x - cx), t = Math.max(0, (ad - kr) / (W - kr));
      const y0 = Math.round(by - (by - top) * Math.pow(1 - t, 1.7) + (ad > kr ? (hs(x, 0, 4) - 0.5) * 1.6 * t : 0) + (ad <= kr ? 1 : 0));
      tops[x] = y0;
      for (let y = y0; y <= by; y++) {
        const phi = Math.atan2(x - cx, y - top + 6), rinne = Math.sin(phi * 15 + Math.sin(y * 0.3) * 0.6);
        const nx = (x - cx) / W, ny = (y - top) / (by - top);
        let l = -nx * 1.3 + (1 - ny) * 0.25 + (rinne > 0.7 ? -0.35 : rinne < -0.85 ? 0.3 : 0) + (hs(x, y, 9) - 0.5) * 0.25;
        if (y === y0) l += 0.4;
        const c = l > 0.55 ? VULKAN.hh : l > 0.12 ? VULKAN.h : l > -0.35 ? VULKAN.b : l > -0.85 ? VULKAN.d : VULKAN.dd;
        q.px(x, y, c);
      }
    }
    // Erstarrte Lavabänke am Fuß
    for (const [x, y, w] of [[12, 42, 6], [44, 41, 7], [20, 44, 5]]) { q.ellipse(x, y, w, 1.4, VULKAN.d); q.ellipse(x - 1, y - 0.5, w - 2, 0.7, VULKAN.b); }
    // Krater
    q.ellipse(cx, top + 1, 5.5, 1.8, '#1e1210');
    q.ellipse(cx, top + 1.3, 4.4, 1.1, GLUT.d);
    q.ellipse(cx - 0.4, top + 1.2, 3, 0.6, GLUT.b);
    q.px(cx - 1, top + 1, GLUT.k).px(cx, top + 1, GLUT.h);
    q.px(cx - 6, top + 1, VULKAN.hh).px(cx - 5, top, VULKAN.hh).px(cx + 5, top + 1, VULKAN.d);
  });
  // Glutrinne von der Kraterkante bis zum Fuß (Hauptstrom) und ein schwacher Nebenstrom
  const strom = (pts, breit) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n), heiss = y < 30;
        p.px(x - 1, y, GLUT.dd);
        p.px(x, y, heiss ? GLUT.h : GLUT.b);
        if (breit) { p.px(x + 1, y, heiss ? GLUT.b : GLUT.d); p.px(x + 2, y, GLUT.dd); }
        else p.px(x + 1, y, GLUT.dd);
        if ((x + y) % 7 === 0) p.px(x, y, GLUT.k);
        if ((x * 3 + y) % 11 === 0) p.px(x + (breit ? 1 : 0), y, GLUT.kruste);
      }
    }
  };
  strom([[30, 15], [29, 19], [31, 23], [30, 27], [27, 32], [28, 36], [25, 41], [26, 45]], true);
  strom([[35, 15], [37, 20], [36, 24], [39, 29], [38, 33]], false);
  // Glühender Schein auf dem Hang neben der Rinne
  for (let y = 16; y < 45; y++) for (let x = 20; x < 40; x++) {
    const a = p.hole(x, y); if (!a || a === GLUT.h || a === GLUT.b || a === GLUT.k || a === GLUT.dd || a === GLUT.d) continue;
    const nah = [p.hole(x - 2, y), p.hole(x + 2, y), p.hole(x - 1, y), p.hole(x + 1, y)].some((c) => c === GLUT.dd);
    if (nah && (x + y) & 1) toenen(p, x, y, GLUT.d, 0.35);
  }
  // Lavasee am Fuß
  teil(p, (q) => {
    q.ellipse(26, 47.5, 10, 2.6, GLUT.kruste);
    q.ellipse(25.5, 47.2, 8.5, 1.8, GLUT.d);
    q.ellipse(25, 47, 6.5, 1.2, GLUT.b);
    q.ellipse(24, 46.8, 3.5, 0.6, GLUT.h);
    for (const [x, y] of [[18, 47], [31, 48], [22, 48], [29, 46]]) q.px(x, y, GLUT.kruste).px(x + 1, y, GLUT.kruste);
    // Glutpunkte je Phase
    const gp = [[[21, 47], [27, 46]], [[23, 48], [30, 47]], [[19, 47], [26, 48]], [[24, 46], [28, 48]]][v];
    for (const [x, y] of gp) q.px(x, y, GLUT.k);
  }, '#1e1210');
  // Rauchfahne: Ballen steigen auf und treiben nach rechts; die Phase verschiebt sie entlang der Bahn
  const RAUCH = { hh: '#c8c0bc', h: '#a49a96', b: '#7e7470', d: '#544a48' };
  teil(p, (q) => {
    for (let i = 0; i < 6; i++) {
      const k = i + v * 0.25;
      const x = 33 + k * 2.6 + Math.sin(k * 1.3) * 1.2, y = 10.5 - k * 2.0, rr = 2.2 + k * 0.55;
      if (y < -1) continue;
      rauchballen(q, x, y, rr, k < 1 ? { hh: '#ffb070', h: '#c8786a', b: '#8a5a52', d: '#5a3a36' } : RAUCH);
    }
  }, '#2e2624');
  // Glutbrocken in der Luft
  const brocken = [[[27, 9], [38, 8], [24, 12]], [[29, 6], [36, 10], [40, 13]], [[26, 11], [33, 5], [39, 9]], [[28, 8], [25, 5], [37, 12]]][v];
  for (const [x, y] of brocken) p.px(x, y, GLUT.h).px(x, y + 1, GLUT.d);
  // Lichtreflex am Kraterrand
  p.px(28, 13, GLUT.b).px(36, 13, GLUT.d);
  void r;
});

// ---------- Regenbogenberg: Berg in Streifen aus Rot, Gelb, Grün und Violett ----------
const STREIFEN = ['#c8443a', '#e2763a', '#eeb84a', '#efdca0', '#6aaa4e', '#3c8a6e', '#8a5ab0', '#b84a78'];
nw('regenbogenberg', 64, 56, (p, o) => {
  const v = o.variante | 0;
  fleck(p, 32, 45, 28.5, 9, { r: '#6a5a32', d: '#7e6c3c', b: '#9a8448', h: '#b49c58', hh: '#c8b46c' }, 21);
  for (const [x, y] of [[5, 45], [10, 51], [54, 51], [59, 45], [22, 54], [44, 54]]) gras(p, x, y, '#a8b85a', '#6a7a32');
  // Höhenprofil: Hauptgipfel, Nebenkuppe rechts, kleiner Vorhügel links; runde Rücken
  const gipfel = [[27, 21, 34], [46, 13, 22], [12, 8, 12]];
  const hoehe = (x) => Math.max(...gipfel.map(([gx, w, h]) => h * Math.pow(Math.max(0, 1 - ((x - gx) / w) ** 2), 0.85))) + (hs(x, 1, 7) - 0.5) * 0.9;
  const naechster = (x) => gipfel.reduce((a, g) => (g[2] * Math.max(0, 1 - ((x - g[0]) / g[1]) ** 2) > a[2] * Math.max(0, 1 - ((x - a[0]) / a[1]) ** 2) ? g : a));
  // Unterkante folgt der Bodenellipse (kein gerader Strich)
  const unten = (x) => Math.round(44 + 3.2 * Math.sqrt(Math.max(0, 1 - ((x - 32) / 31) ** 2)) + (hs(x, 3, 7) < 0.3 ? -1 : 0));
  teil(p, (q) => {
    for (let x = 2; x <= 61; x++) {
      const by = unten(x), t0 = Math.round(46 - hoehe(x)); if (t0 >= by - 1) continue;
      const g = naechster(x), lichtSeite = x < g[0] - 1 ? 1 : x > g[0] + 1 ? -1 : 0;
      for (let y = t0; y <= by; y++) {
        const tiefe = y - t0;
        const s = y * 0.5 + tiefe * 0.3 - x * 0.12 + Math.sin(x * 0.2) * 1.2 + Math.sin(x * 0.06 + y * 0.08) * 1.6;
        let c = STREIFEN[((Math.floor(s / 2.3) % 8) + 8) % 8];
        let l = lichtSeite * 0.2 - (lichtSeite < 0 ? 0.08 : 0) + (tiefe < 1 ? 0.2 : 0) - (y > by - 3 ? 0.18 : 0);
        // Erosionsrinnen
        if (((x * 5 + Math.floor(y / 3)) % 17 === 0) && tiefe > 3) l -= 0.22;
        c = l > 0 ? hell(c, l) : dunkel(c, -l);
        q.px(x, y, c);
      }
    }
  });
  // Geröll am Fuß
  const GR = { hh: '#e8d4a6', h: '#c8ac7a', b: '#a08458', d: '#76603e' };
  for (const [x, y, s] of [[8, 49, 1], [55, 49, 1], [36, 50, 0], [19, 50, 0]]) teil(p, (q) => fels(q, x, y, s, GR));
  // Kleiner Steinmann der Pilger auf dem Grat
  teil(p, (q) => { q.rect(26, 9, 3, 2, '#9a948a'); q.rect(27, 7, 2, 2, '#b8b2a6'); q.px(27, 6, '#d4cec2'); q.px(28, 10, '#6e6a62'); });
  // Wolkenschleier am Gipfel (wandert je Phase)
  const wx = [40, 43, 46, 37][v];
  teil(p, (q) => { q.ellipse(wx, 8, 5, 1.6, '#e4ecf4'); q.ellipse(wx + 3, 7, 3, 1.2, '#ffffff'); q.ellipse(wx - 4, 9, 2.5, 1, '#d4dee8'); }, '#8a98aa');
  // Glimmen: helle Lichtpunkte, die über die Streifen wandern
  const glanz = [[[20, 20], [35, 26], [46, 30]], [[23, 17], [31, 30], [49, 27]], [[17, 25], [38, 22], [44, 34]], [[25, 14], [33, 33], [51, 31]]][v];
  for (const [x, y] of glanz) { const a = p.hole(x, y); if (a) funkel(p, x, y, hell(a, 0.45), 1, '#fff8e0'); }
});

// ---------- Kristallhöhle: Hügel mit Höhlenmund, aus dem große leuchtende Kristalle wachsen ----------
const KR_C = { hh: '#f0ffff', h: '#a8f0fa', b: '#56c8e4', d: '#2c88b8', dd: '#1a5482' };
const KR_V = { hh: '#fae8ff', h: '#d8a8fa', b: '#a868e4', d: '#6e3cae', dd: '#43227a' };
const FELS = { hh: '#b4aca0', h: '#948c80', b: '#766e64', d: '#58524c', dd: '#3c3834' };
nw('kristallhoehle', 64, 56, (p, o) => {
  const v = o.variante | 0;
  fleck(p, 32, 45, 28.5, 9, { r: '#3e5a2c', d: '#4c6c34', b: '#5e823e', h: '#76984c', hh: '#8eae5e' }, 31);
  // Felsiger Hügel mit Grasnarbe
  const by = 46, cx = 31;
  const top = (x) => Math.round(by - 27 * Math.pow(Math.max(0, 1 - ((x - cx) / 26) ** 2), 0.7) + (hs(x, 2, 5) - 0.5) * 2);
  teil(p, (q) => {
    for (let x = 5; x <= 57; x++) {
      const t0 = top(x); if (t0 >= by) continue;
      for (let y = t0; y <= by; y++) {
        const nx = (x - cx) / 26, tief = y - t0;
        let l = -nx * 1.1 + (1 - (y - 19) / 27) * 0.35 + (hs(x >> 1, y >> 1, 8) - 0.5) * 0.5;
        // Gesteinsschichten
        if ((y + Math.round(Math.sin(x * 0.3) * 1.5)) % 5 === 0) l -= 0.3;
        let c = l > 0.55 ? FELS.hh : l > 0.15 ? FELS.h : l > -0.3 ? FELS.b : l > -0.8 ? FELS.d : FELS.dd;
        if (tief < 3 - (hs(x, 0, 2) < 0.5 ? 1 : 0)) c = tief === 0 ? '#8eba5a' : l > 0 ? '#6a9a44' : '#4c7a34';
        q.px(x, y, c);
      }
    }
  });
  // Höhlenmund (dunkel, innen violetter Schein)
  p.ellipse(31, 42, 10, 9, '#2a2036');
  p.rect(21, 42, 21, 5, '#2a2036');
  p.ellipse(31, 43, 8.5, 7.5, '#1a1424');
  p.rect(23, 43, 17, 4, '#1a1424');
  dunst(p, 31, 42, 7, 5, '#7a4ab8', 0, 0.45, false);
  // Bogenstein über dem Eingang
  for (let a = Math.PI * 1.05; a <= Math.PI * 1.95; a += 0.12) {
    const x = 31 + Math.cos(a) * 10.5, y = 42 + Math.sin(a) * 9.5;
    p.px(x, y, a < Math.PI * 1.5 ? FELS.hh : FELS.h);
  }
  // Leuchten rund um die Kristalle
  const glow = (x, y, rr, c) => {
    for (let yy = y - rr; yy <= y + rr; yy++) for (let xx = x - rr; xx <= x + rr; xx++) {
      const d = Math.hypot(xx - x, (yy - y) * 1.3); if (d > rr) continue;
      if (((xx + yy + v) & 1) === 0 || d < rr * 0.5) toenen(p, xx, yy, c, 0.3 * (1 - d / rr) + 0.12);
    }
  };
  glow(31, 40, 11, '#c890ff'); glow(26, 16, 9, '#a0f0ff'); glow(46, 28, 6, '#a0f0ff');
  // Kristalle: Gipfelgruppe, Hangkristall und Gruppe aus dem Höhlenmund
  const K = (x, y, l, a, w, T) => teil(p, (q) => kristall(q, x, y, l, a, w, T));
  K(30, 23, 13, 0.32, 2.6, KR_C);
  K(19, 25, 9, -0.55, 2.2, KR_V);
  K(26, 24, 20, -0.08, 3.4, KR_C);
  K(23, 24, 12, -0.4, 2.4, KR_C);
  K(47, 31, 9, 0.5, 2, KR_C);
  K(44, 32, 6, 0.05, 1.6, KR_V);
  K(12, 38, 6, -0.6, 1.6, KR_V);
  K(36, 47, 10, 0.55, 2.3, KR_V);
  K(25, 47, 11, -0.45, 2.5, KR_V);
  K(31, 48, 15, 0.05, 3.2, KR_C);
  K(28, 48, 7, -0.2, 1.8, KR_V);
  // Splitter auf dem Boden
  for (const [x, y, c] of [[16, 50, KR_V], [46, 49, KR_C], [40, 52, KR_V], [21, 52, KR_C]]) teil(p, (q) => kristall(q, x, y, 3, x < 32 ? -0.4 : 0.4, 1, c));
  // Funkeln an wechselnden Kristallspitzen
  const sp = [[[23, 5], [36, 34], [48, 23]], [[34, 12], [26, 38], [16, 18]], [[21, 13], [39, 38], [45, 26]], [[27, 8], [32, 34], [51, 24]]][v];
  for (const [x, y] of sp) funkel(p, x, y, '#d8f8ff', 2);
});

// ---------- Smaragdoase: grüner See mit Palmen in Sanddünen ----------
nw('smaragdoase', 64, 56, (p, o) => {
  const v = o.variante | 0;
  const SAND = { r: '#a88a4c', d: '#c8a45c', b: '#dcbc72', h: '#ecd08a', hh: '#f6e2a8' };
  fleck(p, 32, 45, 28.5, 9, SAND, 41);
  // Dünenkämme (Licht oben links, Schattenkante darunter)
  const duene = (x0, y0, w, h) => {
    for (let i = -w; i <= w; i++) {
      const y = Math.round(y0 - h * (1 - (i / w) ** 2));
      if (!p.hole(x0 + i, y)) continue;
      p.px(x0 + i, y, SAND.hh);
      if (i > -w * 0.4) { p.px(x0 + i, y + 1, SAND.d); if (i > 0) p.px(x0 + i, y + 2, SAND.d); }
    }
  };
  duene(8, 43, 6, 3); duene(56, 42, 6, 3); duene(12, 52, 8, 2); duene(52, 53, 8, 2); duene(31, 37, 8, 2);
  // Grüngürtel um den See
  fleck(p, 32, 46, 21, 7.5, { r: '#2e6a2a', d: '#3a7a30', b: '#4a943a', h: '#62ae4a', hh: '#7cc45a' }, 42, 0.16);
  // Smaragdsee
  fleck(p, 32, 46.5, 17, 5.4, { r: '#0c5a46', d: '#107052', b: '#159068', h: '#24b080', hh: '#3cc898' }, 43, 0.1);
  p.ellipse(32, 46.5, 11, 3, '#139070'); p.ellipse(33, 47, 7, 1.8, '#0e7a5e'); p.ellipse(33.5, 47.2, 3.5, 0.8, '#0a6450');
  p.linie(19, 44, 27, 43, '#5ad8a8'); p.linie(21, 45, 24, 45, '#40c090');
  // Lichtreflexe auf dem Wasser (wandern je Phase)
  const gl = [[[24, 46], [38, 48], [31, 44]], [[26, 47], [40, 47], [33, 45]], [[22, 47], [35, 49], [37, 45]], [[28, 45], [42, 47], [25, 48]]][v];
  for (const [x, y] of gl) p.px(x, y, '#c8fae6').px(x + 1, y, '#78e0b8');
  // Wellenring, der sich je Phase ausbreitet
  const wr = 2 + v * 2.2;
  for (let w = 0; w < Math.PI * 2; w += 0.08) { const x = Math.round(34 + Math.cos(w) * wr * 1.8), y = Math.round(47 + Math.sin(w) * wr * 0.55); const c = p.hole(x, y); if (c && c !== '#c8fae6') toenen(p, x, y, '#b8f4dc', 0.45 - v * 0.08); }
  // Schilf am Ufer
  for (const [x, y] of [[16, 48], [46, 44], [45, 51]]) for (let i = 0; i < 3; i++) p.linie(x + i, y, x + i + (i - 1), y - 3 - (i & 1), i & 1 ? '#5a8a2a' : '#8aac48');
  // Palmen am hinteren Ufer und an den Seiten (der See bleibt frei)
  const palmen = [[21, 41, 18, -3, 1.1], [43, 40, 20, 3, 1.15], [32, 39, 14, 1, 0.9], [11, 47, 15, -2, 0.9], [53, 48, 16, 2, 0.9]];
  for (const [x, y, h, l, g] of palmen) {
    teil(p, (q) => q.ellipse(x + 3, y, 3, 0.8, '#3a7a30'), null);
    teil(p, (q) => palme(q, x, y, h, l, PALM, g));
  }
  for (const [x, y] of [[15, 43], [49, 42], [40, 53], [22, 53]]) teil(p, (q) => busch(q, x, y, 2, { d: '#2e6a2a', b: '#4a943a', h: '#7cc45a' }));
});

// ---------- Schwarzer Monolith: glatter, sehr hoher Stein auf einer Wiese ----------
nw('monolith', 64, 56, (p, o) => {
  const v = o.variante | 0;
  fleck(p, 32, 45, 28.5, 9, { r: '#3a6a2a', d: '#467a32', b: '#58923c', h: '#6eaa48', hh: '#88c05a' }, 51);
  // Langer Schatten nach rechts unten
  p.poly([[37, 45], [41, 44], [58, 49], [54, 50]], '#3a6a2a');
  // Heller Schimmerring im Gras um den Fuß
  for (let a = 0; a < Math.PI * 2; a += 0.09) {
    const x = Math.round(32 + Math.cos(a) * 13), y = Math.round(45.5 + Math.sin(a) * 4.2);
    if (hs(x, y, 2) < 0.75) toenen(p, x, y, '#d0f0c0', 0.35);
  }
  // Blumen und Halme
  const bl = ['#f4f1ea', '#f4d040', '#e890c0', '#a8c0f8'];
  for (let i = 0; i < 26; i++) {
    const a = hs(i, 1, 9) * Math.PI * 2, d = 0.35 + hs(i, 2, 9) * 0.6;
    const x = Math.round(32 + Math.cos(a) * 26 * d), y = Math.round(45 + Math.sin(a) * 8 * d);
    if (Math.abs(x - 32) < 7 && y < 47) continue;
    if (i % 3 === 0) gras(p, x, y, '#9ad070', '#4a7a30'); else p.px(x, y, bl[i % 4]).px(x, y + 1, '#3a6a2a');
  }
  // Kleine Steine im Kreis
  const ST = { hh: '#c8c4bc', h: '#a8a49a', b: '#86827a', d: '#5e5a54' };
  for (const [x, y] of [[17, 43], [47, 43], [20, 49], [45, 49], [32, 51]]) teil(p, (q) => fels(q, x, y, 1, ST));
  // Monolith: Vorderseite, schmale rechte Seite, Deckfläche
  const x0 = 27, w = 9, d = 3, oben = 3, fuss = 46;
  teil(p, (q) => {
    q.rect(x0, oben, w, fuss - oben + 1, '#1e1c26');
    for (let i = 0; i < d; i++) q.rect(x0 + w + i, oben - 1 - Math.floor(i / 2), 1, fuss - oben + 1, '#121118');
    q.rect(x0 + 1, oben - 1, w, 1, '#4a4862'); q.rect(x0 + 2, oben - 2, w, 1, '#3c3a52');
    q.px(x0, oben - 1, '#5a5874');
    // Kantenlicht links und feine Spiegelung
    q.rect(x0, oben, 1, fuss - oben, '#3c3a50');
    q.rect(x0 + 1, oben + 1, 1, fuss - oben - 2, '#2a2836');
    q.rect(x0 + w - 1, oben, 1, fuss - oben + 1, '#18161e');
    q.rect(x0 + w, oben - 1, 1, fuss - oben + 2, '#0a0a0e');
    // Wandernder Schimmer (Phase bestimmt die Höhe)
    const sy = [9, 18, 27, 36][v];
    for (let j = -3; j <= 3; j++) {
      const c = Math.abs(j) === 3 ? '#2c2a3e' : Math.abs(j) === 2 ? '#3e3c5a' : Math.abs(j) === 1 ? '#56547a' : '#7472a0';
      for (let i = 0; i < w - 1; i++) if (i - j * 0.6 > 0 && i - j * 0.6 < w - 1) q.px(x0 + i, sy + j + Math.round(i * 0.4), c);
    }
    // Sockel im Gras
    q.rect(x0 - 1, fuss, w + 2, 1, '#2a3a22');
  });
  // Schwacher Schimmer: Lichtpunkte in der Luft um den Stein
  const aura = [[[23, 12], [41, 20], [24, 30], [40, 36]], [[24, 18], [40, 10], [22, 38], [42, 30]], [[25, 8], [41, 26], [23, 24], [39, 40]], [[22, 22], [42, 14], [25, 36], [40, 4]]][v];
  for (const [x, y] of aura) p.px(x, y, '#b8b0f0');
  funkel(p, aura[0][0], aura[0][1], '#8a84c8', 1, '#e8e4ff');
  // Fußschimmer
  for (let i = -6; i <= 6; i++) if ((i + v) % 3 === 0) toenen(p, 31 + i, 47, '#c8f0b0', 0.5);
});

// ==================== 2 Felder (96x64) ====================

// ---------- Sternenkrater: großer Einschlagkrater mit glitzernden fremden Steinen ----------
nw('sternenkrater', 96, 64, (p, o) => {
  const v = o.variante | 0;
  const BODEN = { r: '#7a5e3e', d: '#957650', b: '#ae8e60', h: '#c4a472', hh: '#d6b886' };
  fleck(p, 48, 49.5, 43, 12.3, BODEN, 61);
  const cx = 48, cy = 47, RX = 28, RY = 10.5; // Innenkante des Walls
  // Auswurfstrahlen
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8 + hs(k, 0, 3) * 0.3, len = 1.25 + hs(k, 1, 3) * 0.35;
    for (let t = 1.15; t < len; t += 0.015) {
      const x = Math.round(cx + Math.cos(a) * RX * t), y = Math.round(cy + Math.sin(a) * RY * t);
      if (hs(x, y, k) < 0.7) toenen(p, x, y, '#f2e2b8', 0.4);
    }
  }
  // Wall: aufgeworfener Ring; außen oben links beleuchtet
  teil(p, (q) => {
    for (let y = cy - 18; y <= cy + 16; y++) for (let x = cx - 40; x <= cx + 40; x++) {
      const dx = (x - cx) / (RX + 7), dy = (y - cy + 1) / (RY + 4.5), d = Math.hypot(dx, dy);
      const lim = 1 + 0.05 * Math.sin(Math.atan2(dy, dx) * 7) + (hs(x >> 1, y, 4) - 0.5) * 0.06;
      if (d > lim || Math.hypot((x - cx) / RX, (y - cy) / RY) <= 1) continue;
      let l = -dx * 0.55 - dy * 0.75 + (d > lim - 0.12 ? -0.3 : 0.15) + (hs(x, y, 6) - 0.5) * 0.25;
      q.px(x, y, l > 0.55 ? '#ecdab0' : l > 0.15 ? '#d0b482' : l > -0.3 ? '#ae8e60' : l > -0.7 ? '#8a6c4c' : '#6a5038');
    }
    // Kammlinie
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const x = Math.round(cx + Math.cos(a) * (RX + 0.8)), y = Math.round(cy + Math.sin(a) * (RY + 0.8));
      q.px(x, y, Math.sin(a) < 0 ? (Math.cos(a) < 0.3 ? '#f6e8c4' : '#e0c894') : '#b8986a');
    }
  }, '#4a3626');
  // Innenraum: sichtbare hintere Innenwand (Schichten), tiefer dunkler Boden, vorne schmale Schattenkante
  for (let y = cy - RY; y <= cy + RY; y++) for (let x = cx - RX; x <= cx + RX; x++) {
    const dx = (x - cx) / RX, dy = (y - cy) / RY;
    if (dx * dx + dy * dy > 1) continue;
    const s = Math.sqrt(1 - dx * dx), oben = cy - RY * s, wandH = 9 * s, unten = cy + RY * s;
    let c;
    if (y < oben + wandH) {
      const f = (y - oben) / Math.max(1, wandH);
      const band = Math.floor((y - oben + Math.sin(x * 0.4) * 0.8) / 2) % 3;
      const l = dx * 0.55 - f * 0.55 + (band === 1 ? -0.15 : 0) + (hs(x, y, 7) - 0.5) * 0.2;
      c = l > 0.35 ? '#c8a070' : l > 0 ? '#a07c56' : l > -0.35 ? '#7a5c44' : '#58423a';
    } else if (y > unten - 2) c = '#3a2a2c';
    else c = hs(x >> 1, y, 8) < 0.5 ? '#3e3040' : '#4a3a48';
    p.px(x, y, c);
  }
  // Violettes Leuchten aus dem Kraterboden
  for (let y = cy - 8; y <= cy + 10; y++) for (let x = cx - 24; x <= cx + 24; x++) {
    const d = Math.hypot((x - cx) / 20, (y - cy - 3) / 7);
    if (d < 1 && (((x + y + v) & 1) === 0 || d < 0.5)) toenen(p, x, y, '#a070e0', 0.32 * (1 - d) + 0.06);
  }
  // Fremde Steine im Kraterboden (dunkles Glas, violett und türkis)
  const STV = { hh: '#f0d8ff', h: '#b07ae8', b: '#6a40a0', d: '#2e1e4a' };
  const STT = { hh: '#d8fff8', h: '#5ad8cc', b: '#2a8a96', d: '#163a4a' };
  const steine = [[33, 51, STT, 1], [40, 55, STV, 1], [59, 55, STT, 1], [64, 50, STV, 1], [36, 47, STV, 0], [58, 48, STT, 0], [48, 56, STT, 0], [70, 53, STV, 0], [27, 53, STV, 0]];
  for (const [x, y, T, s] of steine) teil(p, (q) => {
    if (s) { kristall(q, x, y, 6, x < cx ? -0.25 : 0.3, 1.8, T); kristall(q, x + (x < cx ? 2 : -2), y + 1, 4, x < cx ? 0.4 : -0.4, 1.3, T); }
    else { q.rect(x - 1, y - 1, 3, 2, T.b); q.px(x - 1, y - 1, T.h); q.px(x + 1, y, T.d); }
  }, '#1a1220');
  // Der Sternenstein in der Mitte: dunkles Metall mit leuchtenden Adern
  teil(p, (q) => {
    q.poly([[40, 53], [41, 46], [46, 42], [53, 43], [57, 48], [56, 53]], '#3a3448');
    q.poly([[41, 52], [41, 46], [46, 42], [49, 43], [47, 48], [44, 52]], '#5a5270');
    q.poly([[51, 44], [53, 43], [57, 48], [56, 53], [52, 53]], '#2a2436');
    q.px(44, 44, '#8a82a8').px(45, 43, '#a49ac4').px(42, 47, '#7a7298').px(43, 49, '#6a6288');
    q.linie(45, 47, 49, 51, '#c070ff').linie(49, 51, 53, 49, '#c070ff').linie(48, 45, 51, 47, '#e0a8ff').linie(51, 47, 53, 46, '#c070ff');
    q.px(49, 51, '#ffffff').px(48, 45, '#ffffff');
  }, '#120e18');
  // Felsbrocken auf dem Wall
  const BR = { hh: '#ecdab0', h: '#d0b482', b: '#ae8e60', d: '#7a5e42' };
  for (const [x, y, s] of [[17, 44, 1], [78, 41, 2], [26, 60, 1], [72, 60, 1], [10, 51, 0], [86, 51, 1], [31, 33, 0], [62, 33, 1]]) teil(p, (q) => fels(q, x, y, s, BR));
  // Glitzern (wechselt je Phase den Stein)
  const gl = [[[33, 45, 2], [64, 45, 1], [40, 50, 1]], [[59, 50, 2], [36, 46, 1], [48, 55, 1]], [[40, 50, 2], [58, 47, 1], [27, 52, 1]], [[64, 45, 2], [33, 45, 1], [70, 52, 1]]][v];
  for (const [x, y, s] of gl) funkel(p, x, y, s > 1 ? '#e8d8ff' : '#b8f8f0', s);
  // Funken, die aus dem Krater aufsteigen
  const st = [[[44, 36], [54, 30]], [[46, 32], [52, 37]], [[43, 29], [55, 34]], [[47, 35], [51, 28]]][v];
  for (const [x, y] of st) p.px(x, y, '#e8d0ff').px(x, y + 1, '#9a6ad0');
});

// ---------- Perlenriff: buntes Riff im türkisen Flachwasser ----------
nw('perlenriff', 96, 64, (p, o) => {
  const v = o.variante | 0;
  // Wasserfläche: außen tiefer, innen flach und hell
  fleck(p, 48, 47, 43, 14, { r: '#18708e', d: '#1e86a2', b: '#2aa0b6', h: '#36b4c2', hh: '#44c0c8' }, 71, 0.1);
  fleck(p, 48, 46, 34, 10, { r: '#3ab8c0', d: '#48c4c4', b: '#5ad0c8', h: '#6edccc', hh: '#84e4d4' }, 72, 0.16);
  // Sandbänke
  fleck(p, 30, 50, 9, 2.6, { r: '#b8d8b0', d: '#c8dcae', b: '#dce4b4', h: '#ece8be', hh: '#f6f0cc' }, 73, 0.2);
  fleck(p, 66, 43, 7, 2, { r: '#b8d8b0', d: '#c8dcae', b: '#dce4b4', h: '#ece8be', hh: '#f6f0cc' }, 74, 0.2);
  // Wellenlinien (verschoben je Phase)
  for (let j = 0; j < 9; j++) {
    const y = 36 + j * 3, x0 = 10 + ((j * 13 + v * 3) % 20);
    for (let x = x0; x < 88; x += 22) { if (p.hole(x, y) && p.hole(x + 4, y)) { p.px(x, y, '#a8f0e8').px(x + 1, y, '#a8f0e8').px(x + 2, y, '#d8fff8'); } }
  }
  // Schaumsaum am Rand
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = Math.round(48 + Math.cos(a) * 41), y = Math.round(47 + Math.sin(a) * 13);
    if (p.hole(x, y) && hs(x, y, v + 1) < 0.5) p.px(x, y, '#c8f4f0');
  }
  // Korallen
  const koralle = (q, x, y, art, c) => {
    const d = dunkel(c, 0.35), h = hell(c, 0.35), hh = hell(c, 0.6);
    if (art === 0) { // Geweihkoralle
      q.linie(x, y, x, y - 6, d).linie(x + 1, y, x + 1, y - 4, d);
      q.linie(x, y - 2, x - 3, y - 6, c).linie(x - 3, y - 6, x - 3, y - 8, h);
      q.linie(x + 1, y - 3, x + 4, y - 7, c).linie(x + 4, y - 7, x + 4, y - 9, h);
      q.linie(x, y - 6, x - 1, y - 9, h).px(x - 1, y - 10, hh).px(x + 4, y - 10, hh).px(x - 3, y - 9, hh);
    } else if (art === 1) { // Hirnkoralle
      q.ellipse(x, y - 2.5, 4.5, 3, d); q.ellipse(x - 0.5, y - 3.2, 3.6, 2.2, c);
      q.linie(x - 3, y - 3, x + 1, y - 4, d).linie(x - 2, y - 2, x + 3, y - 3, d);
      q.px(x - 2, y - 5, h).px(x - 1, y - 5, h).px(x - 3, y - 4, h);
    } else if (art === 2) { // Fächerkoralle
      for (let i = -5; i <= 5; i++) q.linie(x, y, x + i, y - 8 + Math.abs(i) * 0.6, i < -1 ? h : (i > 1 ? d : c));
      for (let i = -4; i <= 4; i += 2) q.px(x + i, y - 6 + Math.abs(i) * 0.4, hh);
    } else { // Röhrenkoralle
      for (const [dx, hh2] of [[-2, 5], [0, 7], [2, 6], [1, 4], [-1, 3]]) { q.rect(x + dx, y - hh2, 1, hh2 + 1, dx > 0 ? d : c); q.px(x + dx, y - hh2, h); q.px(x + dx, y - hh2 - 1, '#ffe8a0'); }
    }
  };
  // Riffsockel (helle Kalkfelsen, die aus dem Wasser ragen)
  const KALK = { hh: '#f4ecd8', h: '#dccdb0', b: '#bca88a', d: '#8a7a66' };
  for (const [x, y, s] of [[44, 45, 3], [58, 48, 2], [26, 45, 2]]) teil(p, (q) => fels(q, x, y, s, KALK), '#3a6a6a');
  const kor = [
    [40, 42, 0, '#f06a8a'], [48, 41, 2, '#b06ae0'], [55, 45, 3, '#f8d040'], [62, 46, 0, '#ff8a5a'],
    [22, 42, 2, '#ff7aa8'], [29, 43, 3, '#f8a040'], [70, 49, 2, '#40d0a0'], [76, 45, 0, '#f06aa0'],
    [44, 50, 3, '#ff6a6a'], [33, 51, 1, '#b07ae8'], [17, 48, 0, '#f4a040'], [53, 53, 1, '#f8a0c0'],
  ];
  for (const [x, y, art, c] of kor) teil(p, (q) => koralle(q, x, y, art, c), '#2a3038');
  // Perlmuscheln mit Perlen
  const muschel = (x, y) => teil(p, (q) => {
    q.ellipse(x, y, 3, 1.2, '#7a5a90'); q.ellipse(x, y - 0.3, 2, 0.6, '#e8d8f0');
    q.poly([[x - 3, y - 1], [x - 2, y - 4], [x + 2, y - 4], [x + 3, y - 1]], '#9a7ab4');
    q.linie(x - 2, y - 3, x + 1, y - 3, '#c8b0dc'); q.px(x - 2, y - 4, '#d8c4e8');
    q.px(x, y - 1, '#ffffff').px(x + 1, y - 1, '#e0d8f0').px(x, y, '#c8c0e0');
  }, '#3a2a48');
  muschel(62, 54); muschel(35, 55); muschel(82, 49);
  // Fische (schwimmen je Phase weiter)
  const fisch = (x, y, c, rechts) => {
    const s = rechts ? 1 : -1;
    p.px(x, y, c).px(x + s, y, c).px(x + 2 * s, y, hell(c, 0.3)).px(x - s, y, dunkel(c, 0.2));
    p.px(x - 2 * s, y - 1, dunkel(c, 0.2)).px(x - 2 * s, y + 1, dunkel(c, 0.2));
    p.px(x + s, y - 1, hell(c, 0.2)).px(x + 2 * s, y, '#1a2a30');
  };
  const fi = [[[14, 52], [60, 38], [80, 41], [40, 57]], [[17, 52], [57, 38], [83, 42], [43, 57]], [[20, 51], [54, 39], [86, 42], [46, 56]], [[23, 51], [51, 39], [84, 44], [49, 56]]][v];
  const fc = ['#f8d040', '#ff7a3a', '#5ab0ff', '#ff9ac0'];
  fi.forEach(([x, y], i) => fisch(x, y, fc[i], i % 2 === 0));
  // Glitzern auf den Perlen
  const pg = [[62, 55], [35, 56], [82, 50], [62, 55]][v];
  funkel(p, pg[0], pg[1] - 1, '#fff8ff', 1);
});

// ---------- Geysirtal: Tal mit heißen Becken und einer Wasserfontäne ----------
const DAMPF = { hh: '#ffffff', h: '#f4f8fc', b: '#dfe8f0', d: '#b8c8d8' };
nw('geysirtal', 96, 64, (p, o) => {
  const v = o.variante | 0;
  fleck(p, 48, 49.5, 43, 12.3, { r: '#5a4c3e', d: '#6e5e4a', b: '#86745a', h: '#9e8a6a', hh: '#b49e7c' }, 81);
  // Talflanken: flache, felsige Hänge links und rechts hinten
  const HG = { d: '#4e5a38', b: '#66724a', h: '#7e8a58', hh: '#98a26c' };
  const flanke = (cx, by, rw, hh, s) => teil(p, (q) => {
    for (let x = Math.round(cx - rw); x <= cx + rw; x++) {
      const dx = (x - cx) / rw, t0 = Math.round(by - hh * Math.pow(Math.max(0, 1 - dx * dx), 0.75) + (hs(x, 0, s) - 0.5) * 1.6);
      for (let y = t0; y <= by; y++) {
        const l = -dx * 0.9 + (1 - (y - t0) / hh) * 0.4 + (hs(x, y, s) - 0.5) * 0.4;
        let c = l > 0.55 ? HG.hh : l > 0.1 ? HG.h : l > -0.4 ? HG.b : HG.d;
        if ((y - t0) > 2 && ((x * 7 + y * 3) % 19 === 0)) c = '#8a8070';
        q.px(x, y, c);
      }
    }
  }, UMRISS, true);
  flanke(17, 45, 13, 9, 1); flanke(80, 44, 13, 11, 2);
  // Mineralkrusten (orange, gelb) und weißer Sinter
  fleck(p, 42, 52, 30, 8, { r: '#b86a2a', d: '#cc7e34', b: '#dc9a44', h: '#e8b45a', hh: '#f0c878' }, 82, 0.2);
  fleck(p, 52, 49, 22, 6, { r: '#c8bca8', d: '#d8ccb6', b: '#e6dcc8', h: '#f0e8d8', hh: '#faf6ec' }, 83, 0.2);
  // Großes Prismabecken (Ringe: orange, gelb, grün, türkis, tiefblau)
  const becken = (x, y, rx, ry, ringe) => ringe.forEach((c, i) => { const f = 1 - i / ringe.length; p.ellipse(x - i * 0.15, y, rx * f + 0.3, ry * f + 0.2, c); });
  becken(36, 53, 14, 4.6, ['#c8601e', '#e89a30', '#e8c84a', '#9ac868', '#4ac8c0', '#2aa0c8', '#1a6ab0']);
  p.linie(28, 52, 33, 51, '#a0e8f0'); p.px(41, 54, '#8ad8e8');
  // Kleines Becken und Sinterterrassen
  becken(68, 56, 7, 2.4, ['#d8782a', '#e8b448', '#48c0c8', '#2a8ac0']);
  for (let i = 0; i < 4; i++) { const x = 60 + i * 4, y = 46 + i * 1.8; p.ellipse(x, y, 3, 1, '#f4f0e4'); p.ellipse(x, y - 0.3, 2, 0.5, '#6ad0d8'); p.linie(x - 3, y + 1, x + 3, y + 1, '#c8bca8'); }
  // Geysirkegel
  const gx = 54, gy = 45;
  teil(p, (q) => {
    q.ellipse(gx, gy + 1, 6.5, 2.8, '#c8bca8'); q.ellipse(gx - 1, gy, 5, 2, '#e6dcc8'); q.ellipse(gx - 2, gy - 0.5, 2.5, 0.8, '#faf6ec');
    q.ellipse(gx, gy, 1.8, 0.8, '#2a7a9a');
  }, '#6a5a48');
  // Fontäne: Höhe je Phase (Grundzustand hoch, dann noch höher, sinkend, nur Blubbern)
  const H = [32, 38, 21, 6][v];
  teil(p, (q) => {
    const oben = gy - H;
    for (let y = gy - 1; y >= oben; y--) {
      const t = (gy - y) / H, bw = 1.2 + t * 2.2 + Math.sin(y * 0.9 + v) * 0.5;
      for (let x = Math.floor(gx - bw); x <= Math.ceil(gx + bw); x++) {
        const s = (x - gx) / bw;
        let c = s < -0.45 ? '#ffffff' : s < 0.35 ? (((y + v + x) % 5) ? '#e8f8ff' : '#ffffff') : '#a8d8f0';
        if (Math.abs(s) > 0.85 && ((x + y) & 1)) c = '#c8ecff';
        q.px(x, y, c);
      }
    }
    if (H > 10) {
      // Krone: auseinanderspritzendes Wasser, Tropfen fallen seitlich herab
      q.ellipse(gx, oben, 5, 2.6, '#d8f0ff'); q.ellipse(gx - 1, oben - 1, 3.4, 1.8, '#ffffff'); q.px(gx + 4, oben + 1, '#a8d8f0');
      for (const [dx, dy] of [[-6, 2], [6, 2], [-7, 5], [8, 4], [-8, 9], [8, 10], [-9, 14], [9, 15], [-7, 19], [7, 21]]) if (dy < H - 4) { q.px(gx + dx, oben + dy, '#ffffff'); q.px(gx + dx, oben + dy + 1, '#a8d8f0'); }
    } else {
      q.ellipse(gx, oben, 2.6, 1.6, '#e8f8ff'); q.px(gx - 3, oben + 1, '#ffffff'); q.px(gx + 3, oben, '#c8ecff');
    }
  }, '#4a7a9a');
  // Dampfwolken (feste Ballen, Phase verschiebt sie)
  const dv = [0, 2, 4, 1][v];
  teil(p, (q) => {
    rauchballen(q, 34 + dv, 45 - dv * 0.5, 3, DAMPF); rauchballen(q, 39 + dv, 44 - dv * 0.5, 2.2, DAMPF);
    rauchballen(q, 70 + dv * 0.5, 51 - dv * 0.5, 2, DAMPF);
    if (H > 10) { rauchballen(q, gx + 5 + dv, gy - H + 1 - dv * 0.5, 3.4, DAMPF); rauchballen(q, gx + 9 + dv, gy - H - 1 - dv * 0.5, 2.4, DAMPF); }
    rauchballen(q, gx + 4, gy - 3, 2.4, DAMPF);
  }, '#8a9aaa');
  dunst(p, 36, 50, 10, 2.2, '#ffffff', v, 0.35, false);
  // Kleine Blubberblasen im Becken
  const bb = [[[33, 53], [38, 52]], [[35, 54], [40, 53]], [[31, 53], [37, 54]], [[34, 52], [39, 54]]][v];
  for (const [x, y] of bb) p.px(x, y, '#d8f8ff');
});

// ---------- Donnerfall: breiter Wasserfall über Felsstufen mit Gischt und kleinem Regenbogen ----------
nw('donnerfall', 96, 64, (p, o) => {
  const v = o.variante | 0;
  const GRUEN = { r: '#2e5a26', d: '#3a6e2e', b: '#4a8838', h: '#5ea046', hh: '#78b858' };
  fleck(p, 48, 49.5, 43, 12.3, GRUEN, 91);
  const FW = { hh: '#aaa49a', h: '#8c867c', b: '#706a62', d: '#56524c', dd: '#3c3834' };
  // Felsmassiv: natürlicher, abgerundeter Umriss
  const n = welle(93);
  const massiv = (x, y) => { const dx = (x - 48) / 39, dy = (y - 33) / 21; return Math.hypot(dx, dy) <= 1 + 0.1 * n(Math.atan2(dy, dx)) && y < 50; };
  const kanteO = (x) => 23 + Math.round(Math.sin(x * 0.21) * 1.2 + (hs(x, 0, 2) - 0.5));
  const kanteM = (x) => 37 + Math.round(Math.sin(x * 0.17 + 1) * 1.2 + (hs(x, 1, 2) - 0.5));
  const fussU = (x) => 48 + Math.round(Math.sin(x * 0.13) * 1.0);
  teil(p, (q) => {
    const qp = (x, y, c) => { if (massiv(x, y)) q.px(x, y, c); };
    for (let x = 6; x <= 90; x++) {
      // Plateau oben mit Grasnarbe
      for (let y = 8; y < kanteO(x); y++) qp(x, y, massiv(x, y - 1) ? (hs(x, y, 3) < 0.5 ? GRUEN.h : GRUEN.b) : GRUEN.hh);
      // Obere Wand
      for (let y = kanteO(x); y < kanteM(x) - 2; y++) {
        const l = (x < 48 ? 0.15 : -0.2) + ((y + Math.round(Math.sin(x * 0.4) * 1.5)) % 4 === 0 ? -0.35 : 0) + (hs(x >> 1, y, 4) - 0.5) * 0.4;
        qp(x, y, l > 0.3 ? FW.hh : l > -0.05 ? FW.h : l > -0.4 ? FW.b : FW.d);
      }
      // Absatz mit Grasnarbe
      for (let y = kanteM(x) - 2; y < kanteM(x); y++) qp(x, y, y === kanteM(x) - 2 ? GRUEN.h : GRUEN.b);
      // Untere Wand
      for (let y = kanteM(x); y < fussU(x); y++) {
        const l = (x < 48 ? 0.05 : -0.3) + ((y + Math.round(Math.sin(x * 0.5) * 1.5)) % 4 === 1 ? -0.35 : 0) + (hs(x >> 1, y, 5) - 0.5) * 0.4;
        qp(x, y, l > 0.3 ? FW.h : l > -0.05 ? FW.b : l > -0.45 ? FW.d : FW.dd);
      }
    }
  });
  // Fluss auf dem Plateau, oberer Fall, Absatzbecken, unterer Fall
  const W = { hh: '#ffffff', h: '#d8f0ff', b: '#8ac8f0', d: '#4a8ed0', dd: '#2a64a8' };
  for (let y = 12; y < 24; y++) {
    const a = 37 - (23 - y) * 0.7, b = 59 + (23 - y) * 0.5;
    for (let x = Math.round(a); x <= Math.round(b); x++) if (p.hole(x, y) && massiv(x, y)) p.px(x, y, ((x + y * 3 + v * 2) % 9 === 0) ? W.h : (x - a < 1.5 || b - x < 1 ? W.d : W.b));
  }
  const fall = (x0, x1, y0, y1) => {
    for (let x = x0; x <= x1; x++) {
      const yo = y0(x), yu = y1(x);
      for (let y = yo; y < yu; y++) {
        const st = (x * 7 + 3) % 5, band = ((y - v * 3 + st * 2) % 6 + 6) % 6;
        let c = band < 2 ? W.hh : band < 4 ? W.h : W.b;
        if (x === x0 || x === x1) c = W.d;
        if ((x - x0) % 5 === 4) c = band < 3 ? W.b : W.d;
        if (y === yo) c = W.hh;
        p.px(x, y, c);
      }
    }
  };
  fall(33, 62, (x) => kanteO(x) - 1, (x) => kanteM(x) - 1);
  // Absatzbecken (Schaum)
  for (let x = 30; x <= 65; x++) { const y = kanteM(x) - 2; p.px(x, y, (x + v) % 3 ? '#ffffff' : W.h); p.px(x, y + 1, (x + v) % 2 ? W.h : '#ffffff'); }
  fall(30, 66, (x) => kanteM(x), (x) => fussU(x) + 1);
  // Becken unten mit Abfluss nach vorne
  fleck(p, 48, 52, 22, 4.6, { r: '#2a5a9a', d: '#2e6aac', b: '#3a7ec0', h: '#4a90cc', hh: '#5aa0d8' }, 92, 0.12);
  for (let y = 54; y < 64; y++) { const hw = 5 - (y - 54) * 0.3; for (let x = Math.round(46 - hw); x <= Math.round(50 + hw); x++) if (p.hole(x, y)) p.px(x, y, ((x + y + v) % 5 === 0) ? W.h : W.d); }
  // Felsbrocken an den Seiten des Falls
  const FB = { hh: FW.hh, h: FW.h, b: FW.b, d: FW.d };
  for (const [x, y, s] of [[28, 50, 2], [69, 50, 2], [26, 37, 1], [70, 37, 1], [42, 57, 0], [58, 56, 1]]) teil(p, (q) => fels(q, x, y, s, FB));
  // Bäume auf Plateau und Talgrund
  const LB = { d: '#2a5a26', b: '#3d7f38', h: '#5aa84f' };
  const baum = (x, y, s) => teil(p, (q) => { q.rect(x, y - 2, 2, 3, '#5a3a1a'); busch(q, x + 1, y - 2, s, LB); });
  for (const [x, y, s] of [[18, 20, 3], [24, 16, 3.5], [30, 14, 3], [65, 14, 3], [71, 16, 3.5], [77, 20, 3], [8, 49, 3], [16, 55, 3.5], [79, 55, 3.5], [87, 49, 3], [12, 37, 2.5], [84, 35, 2.5], [10, 28, 2.5], [86, 27, 2.5]]) baum(x, y, s);
  // Gischt: Nebel am Fuß des Falls (Phase verschiebt die Ballen)
  const gv = [[0, 0], [2, -1], [-2, -1], [1, 1]][v];
  dunst(p, 48 + gv[0], 47 + gv[1], 20, 4.5, '#ffffff', v, 0.7, false);
  dunst(p, 48 - gv[0], 35, 18, 2, '#ffffff', v + 1, 0.5, false);
  teil(p, (q) => {
    for (const [x, y, r] of [[37, 45, 2.2], [59, 46, 2]]) rauchballen(q, x + gv[0], y + gv[1], r, DAMPF);
  }, '#9ab0c4');
  // Kleiner Regenbogen in der Gischt
  const rb = ['#e84a4a', '#f4a03a', '#f4e04a', '#5ac85a', '#4a8ae8', '#8a5ad8'];
  rb.forEach((c, i) => {
    const rr = 12 - i;
    for (let a = Math.PI * 1.08; a <= Math.PI * 1.55; a += 0.03) {
      const x = Math.round(73 + Math.cos(a) * rr), y = Math.round(49 + Math.sin(a) * rr * 0.9);
      toenen(p, x, y, c, 0.75);
    }
  });
  // Tropfen
  const tr = [[[34, 41], [62, 43], [52, 42]], [[36, 43], [60, 41], [44, 42]], [[33, 44], [64, 42], [49, 41]], [[38, 42], [58, 44], [55, 40]]][v];
  for (const [x, y] of tr) p.px(x, y, '#ffffff');
});

// ---------- Eisfjord: blaue Gletscherzunge, die in dunkles Wasser bricht ----------
nw('eisfjord', 96, 64, (p, o) => {
  const v = o.variante | 0;
  const SN = { r: '#8aa4c0', d: '#b4c8dc', b: '#cddbea', h: '#e2ecf6', hh: '#f2f7fc' };
  fleck(p, 48, 49.5, 43, 12.3, SN, 101, 0.11);
  const B = { hh: '#ffffff', h: '#eef4fa', b: '#c8d8ea', d: '#9cb2cc', dd: '#7890b0', fels: '#6a7282', felsD: '#4a5266', felsH: '#8a92a2' };
  // Schneeberge mit gezacktem Grat und Felsrippen
  const berg = (cx, by, rw, hh, s) => teil(p, (q) => {
    const r = saat('eisfjord', s);
    const gx = cx + (r() - 0.5) * rw * 0.2;
    let nz = 0;
    for (let x = Math.round(cx - rw); x <= cx + rw; x++) {
      const dx = (x - gx) / (x < gx ? gx - (cx - rw) : cx + rw - gx);
      if (x % 2 === 0) nz = Math.max(-1.6, Math.min(1.6, nz + (r() - 0.5) * 1.8));
      const t0 = Math.round(by - hh * Math.pow(1 - Math.abs(dx), 1.25) + nz * Math.min(1, Math.abs(dx) * 4));
      const byx = by + Math.round(3 * Math.max(0, 1 - dx * dx));
      for (let y = t0; y <= byx; y++) {
        const f = (y - (by - hh)) / hh, grat = gx + Math.sin(y * 0.5 + s) * 0.8 + f * 2;
        const links = x < grat;
        let c = links ? B.h : B.d;
        if (links && y - t0 < 1) c = B.hh;
        if (!links && x - grat < 1.2) c = B.dd;
        // Felsrippen, die aus dem Schnee schauen
        const rippe = Math.sin((x - gx) * 0.9 + (y - by) * (x < gx ? -0.55 : 0.55) + s);
        if (f > 0.3 && rippe > 0.86 && hs(x, y >> 1, s) < 0.85) c = links ? B.felsH : B.felsD;
        if (f > 0.3 && rippe > 0.86 && links && x - 1 >= 0 && (x + y) % 3 === 0) c = B.fels;
        if (f > 0.85) c = links ? B.b : B.d;
        if (y > byx - 2) c = links ? '#e2ecf6' : '#cddbea';
        q.px(x, y, c);
      }
    }
  }, UMRISS, true);
  berg(21, 42, 17, 27, 1); berg(76, 41, 16, 33, 2); berg(36, 33, 11, 13, 3); berg(62, 31, 10, 12, 4);
  // Gletscherzunge: geschwungen von hinten zur Wasserkante, mit Bogenspalten und Seitenmoränen
  const mitteZ = (y) => 48 + Math.sin((y - 22) / 23 * Math.PI) * -3;
  const breiteZ = (y) => 3 + (y - 22) * 0.72;
  teil(p, (q) => {
    for (let y = 22; y <= 45; y++) {
      const m = mitteZ(y), w = breiteZ(y);
      for (let x = Math.round(m - w); x <= Math.round(m + w); x++) {
        const u = (x - m) / w; // -1..1
        let c = u < -0.45 ? '#eaf6ff' : u < 0.3 ? '#c4e2f6' : '#94c4e8';
        // Bogenförmige Spalten (nach vorne gewölbt)
        const bogen = y - (1 - u * u) * w * 0.35;
        if (((Math.round(bogen) % 4) + 4) % 4 === 0 && Math.abs(u) < 0.85) c = u < 0 ? '#7ab8e4' : '#4a92cc';
        if (Math.abs(u) > 0.82) c = (x + y) % 3 ? '#8a8a92' : '#6a6a74'; // Seitenmoräne
        q.px(x, y, c);
      }
    }
    // Abbruchkante: hohe blaue Eiswand zum Wasser
    const m = mitteZ(45), w = breiteZ(45);
    for (let x = Math.round(m - w); x <= Math.round(m + w); x++) {
      const ob = 45 + Math.round((hs(x, 0, 7) - 0.5) * 1.6), un = 52;
      for (let y = ob; y <= un; y++) {
        const st = (x * 5 + (y > 49 ? 2 : 0)) % 7;
        let c = st < 2 ? '#8ad4f6' : st < 5 ? '#4aa8e0' : '#2a7ab8';
        if (y === ob) c = '#ffffff';
        if (y === ob + 1) c = '#c8ecff';
        if (y >= un - 1) c = '#1e5a94';
        q.px(x, y, c);
      }
    }
  }, '#3a5a7a');
  // Dunkles Fjordwasser vorne
  teil(p, (q) => {
    for (let y = 52; y <= 63; y++) {
      const a = 30 - (y - 52) * 0.9 + Math.sin(y * 1.1) * 0.8, b = 66 + (y - 52) * 1.7 + Math.sin(y * 1.3) * 0.8;
      for (let x = Math.round(a); x <= Math.round(b); x++) {
        if (!p.hole(x, y)) continue;
        let c = y < 55 ? '#1e3450' : '#18283e';
        if (((x * 3 + y * 7 + v * 5) % 17) === 0) c = '#3a6290';
        q.px(x, y, c);
      }
    }
  }, null);
  // Spiegelung der Eiswand
  for (let x = 34; x <= 60; x += 2) p.px(x, 54 + (x % 3), '#2e5a8a');
  // Eisberge
  const eisberg = (x, y, w, h) => teil(p, (q) => {
    q.poly([[x - w, y], [x - w + 1, y - h * 0.6], [x - w * 0.3, y - h], [x + w * 0.4, y - h * 0.8], [x + w, y - h * 0.2], [x + w, y]], '#8ac8ee');
    q.poly([[x - w, y - 1], [x - w + 1, y - h * 0.6], [x - w * 0.3, y - h], [x, y - h * 0.9], [x - 1, y - 1]], '#f4faff');
    q.linie(x + w * 0.4, y - h * 0.8, x + w * 0.2, y, '#5aa4dc');
    q.rect(x - w, y + 1, w * 2 + 1, 1, '#3a78b0');
  }, '#122a44');
  eisberg(46, 59, 5, 6); eisberg(63, 61, 4, 4); eisberg(36, 62, 3, 3); eisberg(74, 57, 3, 4);
  // Schollen
  for (const [x, y] of [[54, 57], [69, 63], [42, 63], [78, 61]]) p.rect(x, y, 3, 1, '#d8ecf8').px(x + 1, y + 1, '#3a78b0');
  // Funkeln auf Eis und Schnee (wechselt je Phase)
  const fk = [[[18, 20], [46, 30], [44, 46]], [[79, 12], [42, 37], [61, 58]], [[30, 26], [52, 24], [73, 54]], [[12, 28], [48, 40], [45, 56]]][v];
  for (const [x, y] of fk) funkel(p, x, y, '#dff4ff', 2);
  // Schneefahne vom Gipfel
  const sf = [0, 2, 4, 1][v];
  for (let i = 0; i < 4; i++) p.px(78 + i * 2 + sf, 9 - (i & 1), '#ffffff');
});

// ==================== 3 Felder (112x72) ====================

// ---------- Tiefe Schlucht: Schlucht mit Wolkenmeer und Felswänden ----------
nw('schluchtmeer', 112, 72, (p, o) => {
  const v = o.variante | 0;
  const ROT = { r: '#7a3a22', d: '#94482a', b: '#b05a34', h: '#c87244', hh: '#dc8c58' };
  const maske = fleck(p, 56, 54, 51, 15.5, ROT, 111, 0.09);
  // Steppenbüschel auf dem Plateau
  for (let i = 0; i < 26; i++) {
    const x = Math.round(8 + hs(i, 0, 5) * 96), y = Math.round(40 + hs(i, 1, 5) * 30);
    if (maske(x, y) && p.hole(x, y)) p.px(x, y, '#8a8a3a').px(x + 1, y, '#6a6a2a').px(x, y - 1, '#a8a44a');
  }
  // Verlauf der Schlucht: hinterer Rand, Wolkenoberfläche, vordere Kante
  const xa = 4, xb = 108;
  const t = (x) => (x - xa) / (xb - xa);
  const breit = (x) => Math.pow(Math.max(0, Math.sin(Math.PI * t(x))), 0.4);
  const mitte = (x) => 57 + Math.sin(x * 0.07) * 2.2 + Math.sin(x * 0.19 + 1) * 0.9;
  const randH = (x) => Math.round(mitte(x) - 17 * breit(x));
  const wolke = (x) => Math.round(mitte(x) - 1 * breit(x));
  const randV = (x) => Math.round(mitte(x) + 7 * breit(x));
  const WAND = ['#d89060', '#b4663c', '#904a2c', '#c47c4a', '#763c24', '#a85a34', '#d08a58'];
  for (let x = xa; x <= xb; x++) {
    if (breit(x) < 0.2) continue;
    const a = randH(x), w = wolke(x), b = randV(x);
    // Hintere Felswand (sichtbare Fläche) mit Schichtbändern, nach unten im Dunst
    for (let y = a; y < w; y++) {
      const band = WAND[((Math.floor((y - a + Math.sin(x * 0.3) * 1.2) / 2)) % 7 + 7) % 7];
      let c = band;
      const rinne = Math.sin(x * 0.55 + Math.sin(y * 0.3) * 0.8);
      if (rinne > 0.8) c = dunkel(band, 0.3); else if (rinne < -0.9) c = hell(band, 0.15);
      if (y === a) c = '#f4d4a0';
      if (y === a + 1) c = mische(c, '#f4d4a0', 0.4);
      c = mische(c, '#6a4a7a', Math.min(0.55, Math.max(0, (y - a) / (w - a + 0.1) - 0.3) * 0.9));
      if (x > 56 + Math.sin(y) * 2 && hs(x, y, 13) < 0.5) c = dunkel(c, 0.08);
      p.px(x, y, c);
    }
    // Wolkenmeer zwischen Wand und vorderer Kante
    for (let y = w; y <= b; y++) p.px(x, y, y > b - 2 ? '#c4bce0' : '#dcd8f0');
    // Vordere Kante (Lippe mit Schattenkante)
    p.px(x, b + 1, '#5a2818'); p.px(x, b + 2, '#7a3a22'); if (hs(x, 0, 12) < 0.5) p.px(x, b + 3, ROT.d);
  }
  // Wolkenballen (treiben je Phase nach rechts)
  const WK = { hh: '#ffffff', h: '#f4f2fc', b: '#e2def4', d: '#bcb4da' };
  for (let i = 0; i < 12; i++) {
    const x = 9 + i * 8.6 + v * 2.2 + (i % 2) * 1.5, xx = Math.round(x);
    if (breit(xx) < 0.45) continue;
    const y = wolke(xx) + 2 + (i % 3 === 0 ? 1 : 0), rr = 2.4 + (i % 3) * 0.8;
    p.ellipse(x + 0.5, y + 0.5, rr + 1, rr * 0.7, WK.d);
    p.ellipse(x, y, rr, rr * 0.65, WK.b);
    p.ellipse(x - rr * 0.3, y - rr * 0.25, rr * 0.6, rr * 0.4, WK.h);
    p.px(x - rr * 0.4, y - rr * 0.5, WK.hh);
  }
  // Felsnadeln, die aus den Wolken ragen
  const nadel = (x, yb, h, w) => teil(p, (q) => {
    for (let y = yb - h; y <= yb; y++) {
      const hw = w * (0.55 + 0.45 * (y - yb + h) / h);
      for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) {
        const band = WAND[((Math.floor((y - yb + h) / 2)) % 7 + 7) % 7];
        let c = xx < x - hw * 0.2 ? hell(band, 0.15) : xx > x + hw * 0.4 ? dunkel(band, 0.3) : band;
        c = mische(c, '#b8a8d8', Math.max(0, (y - yb + h) / h - 0.5) * 0.8);
        q.px(xx, y, c);
      }
    }
    q.rect(Math.round(x - w * 0.55), yb - h, Math.round(w * 1.1) + 1, 1, '#f4d4a0');
  }, '#4a2216');
  nadel(40, Math.round(mitte(40)), 15, 2.6); nadel(74, Math.round(mitte(74)), 11, 2.2); nadel(57, Math.round(mitte(57)) + 1, 7, 1.6);
  // Wolken vor den Füßen der Nadeln
  for (const x of [40, 74, 57]) { const y = mitte(x) + 1; p.ellipse(x - 1, y, 5, 1.6, WK.b); p.ellipse(x - 2, y - 0.5, 3, 0.8, WK.h); }
  // Tafelberge auf dem hinteren Plateau
  const tafel = (x0, x1, yb, h) => teil(p, (q) => {
    for (let x = x0; x <= x1; x++) {
      const rd = Math.min(x - x0, x1 - x);
      const ob = yb - h + (rd < 2 ? 2 - rd : 0) + (hs(x, 0, 9) < 0.2 ? 1 : 0);
      for (let y = ob; y <= yb; y++) {
        const band = WAND[((Math.floor((y - ob) / 2)) % 7 + 7) % 7];
        let c = x < x0 + (x1 - x0) * 0.6 ? band : dunkel(band, 0.32);
        if (y === ob) c = '#f4d4a0';
        if (y > yb - 3) c = mische(c, '#7a3a22', 0.3);
        q.px(x, y, c);
      }
    }
    // Schuttkegel
    for (let x = x0 - 3; x <= x1 + 3; x++) { const hh = Math.round(3 - Math.abs(x - (x0 + x1) / 2) / ((x1 - x0) / 2 + 3) * 3 + hs(x, 1, 9) * 1.5); for (let y = yb - hh; y <= yb; y++) q.px(x, y, x < (x0 + x1) / 2 ? ROT.h : ROT.b); }
  }, '#4a2216');
  tafel(14, 25, 44, 16); tafel(80, 93, 42, 21); tafel(50, 56, 40, 9);
  // Nebelschleier über der Schlucht (je Phase verschoben)
  const nv = [0, 3, 6, 9][v];
  dunst(p, 30 + nv, 54, 12, 2.2, '#f0ecff', v, 0.45, false);
  dunst(p, 82 - nv * 0.5, 55, 10, 2, '#f0ecff', v + 1, 0.45, false);
  // Kleine Vögel über der Schlucht
  const vg = [[[46, 28], [53, 25]], [[48, 27], [55, 26]], [[50, 26], [57, 25]], [[52, 27], [59, 24]]][v];
  for (const [x, y] of vg) p.px(x - 1, y - 1, '#3a2a22').px(x, y, '#3a2a22').px(x + 1, y - 1, '#3a2a22');
});

// ---------- Flüsterwald: uralte, riesige verdrehte Bäume mit Nebel und Lichtpunkten ----------
nw('fluesterwald', 112, 72, (p, o) => {
  const v = o.variante | 0;
  fleck(p, 56, 56.5, 51, 13.5, { r: '#1a3424', d: '#22422a', b: '#2a5232', h: '#36623a', hh: '#467646' }, 121);
  // Farn und Pilze am Boden
  for (let i = 0; i < 34; i++) {
    const x = Math.round(8 + hs(i, 0, 3) * 96), y = Math.round(46 + hs(i, 1, 3) * 22);
    if (!p.hole(x, y) || p.hole(x, y) === '#1a3424') continue;
    if (i % 4 === 0) p.px(x, y, '#f0e0c0').px(x, y - 1, '#e0f080').px(x + 1, y - 1, '#a8d060');
    else gras(p, x, y, '#5a9a4e', '#2a5232');
  }
  const RINDE = { hh: '#b4a888', h: '#8e8266', b: '#6c604c', d: '#4e4436', dd: '#30291f', moos: '#6a9a4a' };
  const KRONE = { d: '#10302c', b: '#1a463c', h: '#265e4a', hh: '#3e7e5a', glanz: '#7ab478' };
  /** Riesenbaum: gedrehter, krummer Stamm mit Brettwurzeln, knorrigen Ästen und großer, buckeliger Krone. */
  const riese = (x, y, h, breite, s, neig) => {
    const r = saat('fluesterwald', s);
    const stammTop = y - h * 0.6;
    const mx = (yy) => { const f = (y - yy) / (y - stammTop); return x + Math.sin(f * 3.6 + s) * 2.6 + neig * f * f * 5; };
    teil(p, (q) => {
      // Brettwurzeln: breite Keile, die in den Boden laufen
      for (const [dx, l] of [[-1, -1], [1, 1], [-0.4, -0.6], [0.5, 0.7]]) {
        const x0 = x + dx * breite * 0.6, x1 = x0 + l * breite * 1.6;
        q.poly([[x0 - 1, y - breite * 1.4], [x0 + 1.5, y - breite * 1.2], [x1 + (l > 0 ? 1 : 0), y + 1], [x1 - (l > 0 ? 2 : -2), y + 1]], l < 0 ? RINDE.h : RINDE.d);
        q.linie(x0, y - breite * 1.2, x1, y + 1, l < 0 ? RINDE.hh : RINDE.dd);
      }
      // Stamm: dick, unten breiter, gedreht (Spiralfurchen)
      for (let yy = Math.round(stammTop); yy <= y; yy++) {
        const f = (y - yy) / (y - stammTop), hw = breite * (0.55 + 0.6 * (1 - f) ** 2.2) + 1;
        const m = mx(yy);
        for (let xx = Math.round(m - hw); xx <= Math.round(m + hw); xx++) {
          const u = (xx - m) / hw, spir = Math.sin(u * 2.6 + yy * 0.38 + s);
          let c = u < -0.45 ? RINDE.h : u < 0.25 ? RINDE.b : u < 0.7 ? RINDE.d : RINDE.dd;
          if (spir > 0.78) c = u < 0 ? RINDE.d : RINDE.dd; else if (spir < -0.8 && u < 0.35) c = RINDE.hh;
          if (u < -0.55 && hs(xx, yy, s) < 0.35) c = RINDE.moos;
          q.px(xx, yy, c);
        }
      }
      // Astloch
      q.ellipse(mx(y - h * 0.3) + 1, y - h * 0.3, 1.3, 2, '#1a140e'); q.px(mx(y - h * 0.3), y - h * 0.3 - 2, RINDE.hh);
      // Knorrige Äste
      const ax = mx(stammTop), ay = stammTop;
      for (const [dx, dy, k] of [[-breite * 2, -h * 0.1, 1], [breite * 2.1, -h * 0.08, -1], [-breite * 0.6, -h * 0.26, 1], [breite * 0.8, -h * 0.22, -1]]) {
        const kx = ax + dx * 0.5, ky = ay + dy * 0.3 + 2 * k;
        for (const [a, b, c, d] of [[ax, ay + 3, kx, ky], [kx, ky, ax + dx, ay + dy]]) { q.linie(a, b, c, d, RINDE.b); q.linie(a + 1, b, c + 1, d, RINDE.d); q.linie(a, b + 1, c, d + 1, RINDE.dd); }
      }
      // Krone aus vielen Ballen, breit und schwer
      const cy = y - h * 0.8, rw = breite * 2.6 + 5;
      const ballen = [];
      for (let i = 0; i < 11; i++) ballen.push([ax + (r() - 0.5) * rw * 1.7, cy + (r() - 0.55) * h * 0.26, 3.6 + r() * 3.4]);
      ballen.sort((a, b) => a[1] - b[1]);
      for (const [bx, by, br] of ballen) q.ellipse(bx + 0.8, by + 0.8, br, br * 0.78, KRONE.d);
      for (const [bx, by, br] of ballen) q.ellipse(bx, by, br - 0.6, br * 0.78 - 0.6, KRONE.b);
      for (const [bx, by, br] of ballen) q.ellipse(bx - br * 0.3, by - br * 0.3, br * 0.5, br * 0.36, KRONE.h);
      for (const [bx, by, br] of ballen) { q.px(bx - br * 0.45, by - br * 0.5, KRONE.hh); q.px(bx - br * 0.45 + 1, by - br * 0.5, KRONE.hh); }
      // Hängende Moosbärte
      for (let i = 0; i < 7; i++) {
        const hx = Math.round(ax + (r() - 0.5) * rw * 1.5), hy = Math.round(cy + h * 0.06 + r() * 3), l = 3 + Math.floor(r() * 5);
        if (!q.hole(hx, hy - 1)) continue;
        for (let j = 0; j < l; j++) q.px(hx, hy + j, j === l - 1 ? '#a8c890' : '#6a9a5a');
      }
    });
  };
  riese(24, 56, 38, 3.6, 1, -0.6);
  riese(85, 55, 42, 4, 2, 0.6);
  riese(53, 50, 50, 5.5, 3, 0.4);
  riese(34, 67, 34, 4, 4, -0.6);
  riese(72, 68, 36, 4.2, 5, 0.8);
  // Nebelbänder zwischen den Stämmen (verschieben sich je Phase)
  const nv = [0, 2, 4, 6][v];
  dunst(p, 30 + nv, 58, 22, 2.8, '#c8e0d0', v, 0.5, false);
  dunst(p, 80 - nv, 60, 22, 2.8, '#c8e0d0', v + 1, 0.5, false);
  dunst(p, 54 + nv * 0.5, 65, 28, 2.4, '#d8ece0', v, 0.45, false);
  // Lichtpunkte (Glühwürmchen) je Phase an anderen Stellen
  const lp = [
    [[28, 44], [44, 38], [62, 30], [76, 46], [92, 34], [16, 30], [58, 58], [40, 58], [100, 48]],
    [[30, 41], [46, 34], [60, 33], [78, 43], [90, 37], [18, 34], [55, 55], [42, 61], [98, 45]],
    [[26, 40], [42, 35], [65, 29], [73, 44], [94, 31], [14, 32], [60, 61], [37, 55], [101, 44]],
    [[31, 46], [48, 37], [63, 26], [80, 48], [88, 33], [19, 28], [57, 52], [44, 57], [97, 49]],
  ][v];
  lp.forEach(([x, y], i) => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { if (p.hole(x + dx, y + dy)) toenen(p, x + dx, y + dy, '#d8f090', 0.5); else p.px(x + dx, y + dy, '#8aa848'); }
    p.px(x, y, i % 3 === 0 ? '#fffad0' : '#eaffa0');
  });
});
