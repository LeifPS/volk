// Kolonie-Stadt im All (Mond, Mars, Eismond): Kuppelstadt auf dunklem Metallfundament.
// Gleiches Format wie die normale Stadt (64x56, Feldmitte bei (32, 45), Fundament-Ellipse um (32, 45.5)).
// Glaskuppeln mit Grün und warmen Lichtern, Röhrengänge, Landeplatz mit Shuttle, Antennen, Solarpaneele, Lagertanks.
// Größe 2 und 3: mehr und größere Kuppeln, zentraler Turm. Ab Zeitalter 10 kristallin mit Schutzfeld-Schimmer.
// Spielerfarbe: Sockelbänder der Kuppeln, Turmband, Shuttle-Streifen, Fahne, Landelichter.
import { definiere } from '../sprites.js';
import { mische, Pinsel, UMRISS } from '../pixel.js';

// ---------- Farben ----------
const M = ['#dfe3ec', '#aab0c2', '#7a8094', '#4e5366']; // Metall hell .. sehr dunkel
const MK = ['#f4f8ff', '#c6d6ee', '#8ea8d8', '#5a6cb0']; // Metall kristallin (Zeitalter 10)
const GLAS = ['#eef9ff', '#b6dcec', '#80b6ce', '#4f87a2'];
const GLASK = ['#ffffff', '#d8f6ff', '#9cdcf0', '#5aa8cc'];
const WARM = '#ffd27a', WARMH = '#fff0b8', WARMD = '#e8a040';
const GRUEN = ['#86cc5c', '#5aa84f', '#3d7f38', '#2c5a28'];
const VIO = '#8e7cc3', VIOH = '#d6caff';
const GLUT = '#9ff0ff', GLUTH = '#e4fcff', GLUTD = '#4ab8d8';
const ROT = '#ff5a4a';

// ---------- Hilfen ----------
/** Zeichnet ein Teil auf eigenem Pinsel mit Umriss und kopiert es darüber (wie in staedte.js). */
function teil(p, fn, rand = UMRISS) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
/** Stehender Zylinder mit Spaltenschattierung (F = [hell, grund, dunkel, sehr dunkel]). */
function zylinder(p, x, yb, b, h, F, deckel = true) {
  for (let i = 0; i < b; i++) {
    const t = b > 1 ? i / (b - 1) : 0.5;
    p.rect(x + i, yb - h + 1, 1, h, t < 0.2 ? F[0] : t < 0.62 ? F[1] : t < 0.86 ? F[2] : F[3]);
  }
  if (deckel) { p.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, F[0]); p.px(x + b - 1, yb - h + 1, F[1]); }
}
/** Färbt eine Zeile über einer runden Form: links Grundton, rechts dunkler. */
function band(p, x0, x1, y, c, cd) {
  for (let x = x0; x <= x1; x++) if (p.hole(x, y)) p.px(x, y, (x - x0) / Math.max(1, x1 - x0) > 0.7 ? cd : c);
}

// ---------- Bauteile ----------
/** Habitatkuppel: Metallsockel mit Spielerband, Glaskuppel mit Bäumen und warmen Lichtern.
 *  cx = Mitte, by = Unterkante des Glases, rx/ry = Halbachsen, k = kristallin (Zeitalter 10). */
function habitat(q, cx, by, rx, ry, k) {
  const Me = k ? MK : M, G = k ? GLASK : GLAS;
  // Sockelring (kurzer Zylinder)
  const x0 = Math.round(cx - rx), x1 = Math.round(cx + rx);
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    q.px(x, by + 1, t < 0.75 ? Me[1] : Me[2]);
    q.px(x, by + 2, t < 0.72 ? 'S' : 'S-');
    q.px(x, by + 3, t < 0.75 ? Me[2] : Me[3]);
    if ((x - x0) % 3 === 1 && t < 0.9) q.px(x, by + 1, k ? GLUT : WARM);
  }
  q.px(x0, by + 1, Me[0]).px(x0, by + 2, 'S+');
  // Glas, facettiert (Zeitalter 10) oder rund
  const innen = (dx, dy) => (k ? Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) / 1.32) : Math.sqrt(dx * dx + dy * dy));
  const imGlas = (x, y) => { const dx = (x - cx) / (rx + 0.5), dy = (y - by) / (ry + 0.5); return dy <= 0 && innen(dx, dy) <= 0.84; };
  for (let y = Math.floor(by - ry); y <= by; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x - cx) / (rx + 0.5), dy = (y - by) / (ry + 0.5);
    if (innen(dx, dy) > 1) continue;
    const v = -dx * 0.9 - dy * 0.5;
    q.px(x, y, v > 0.65 ? G[0] : v > -0.1 ? G[1] : v > -0.6 ? G[2] : G[3]);
  }
  // Innenleben: Rasenstreifen, einzelne runde Baumkronen, warme Lampen
  const schatten = (x) => (x - cx) / rx > 0.3;
  for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) for (const y of [by, by - 1]) if (imGlas(x, y)) q.px(x, y, y === by ? (schatten(x) ? GRUEN[3] : GRUEN[2]) : (schatten(x) ? GRUEN[2] : GRUEN[1]));
  const baeume = rx >= 7 ? [-0.55, -0.22, 0.3, 0.6] : rx >= 5 ? [-0.4, 0.35] : [0];
  const kr = rx >= 7 ? 1.8 : 1.3;
  baeume.forEach((f, i) => {
    const bx = cx + f * rx, hoch = kr + 1.5 + (i % 2) * 1;
    const ky = by - hoch;
    if (imGlas(Math.round(bx), Math.round(by - 1))) q.px(bx, by - 1, '#6a4a2a');
    for (let y = Math.floor(ky - kr); y <= Math.ceil(ky + kr); y++) for (let x = Math.floor(bx - kr); x <= Math.ceil(bx + kr); x++) {
      const ddx = x - bx, ddy = y - ky;
      if (ddx * ddx + ddy * ddy > (kr + 0.4) * (kr + 0.4) || !imGlas(x, y)) continue;
      const v = -ddx - ddy;
      q.px(x, y, schatten(x) ? (v > 0.5 ? GRUEN[1] : GRUEN[2]) : (v > 1.2 ? GRUEN[0] : v > -0.8 ? GRUEN[1] : GRUEN[2]));
    }
  });
  // kleines Innengebäude mit warmen Fenstern (größere Kuppeln), sonst Lampen
  if (rx >= 7) {
    const gx = Math.round(cx + rx * 0.05) - 1, gy = by;
    q.rect(gx, gy - 3, 3, 4, '#ece8e0').rect(gx + 2, gy - 3, 1, 4, '#b8b4ac').rect(gx, gy - 4, 3, 1, k ? GLUTD : VIO);
    q.px(gx, gy - 2, WARMH).px(gx + 1, gy - 2, WARM).px(gx + 2, gy - 2, WARMD).px(gx + 1, gy, '#5a3a1a');
  }
  for (let x = Math.ceil(cx - rx) + 1; x <= cx + rx; x += 3) if (imGlas(x, by) && q.hole(x, by) !== '#ece8e0') q.px(x, by, WARM);
  // Rippen bzw. leuchtende Facettenkanten
  if (k) {
    for (const f of [-0.45, 0.45]) q.linie(cx + f * rx * 1.05, by - 1, cx + f * rx * 0.35, by - ry * 0.98, f < 0 ? GLUTH : GLUTD);
    for (let x = Math.round(cx - rx * 0.55); x <= cx + rx * 0.55; x++) { const y = Math.round(by - ry * 0.62); if (q.hole(x, y) && !GRUEN.includes(q.hole(x, y))) q.px(x, y, x % 2 ? GLUT : GLUTD); }
  } else {
    for (const f of [-0.5, 0.5]) for (let y = Math.ceil(by - ry); y <= by; y++) {
      const t = (by - y) / (ry + 0.5), x = Math.round(cx + f * rx * Math.sqrt(Math.max(0, 1 - t * t)));
      const alt = q.hole(x, y);
      if (alt && G.includes(alt)) q.px(x, y, f < 0 ? M[0] : M[1]);
    }
    for (let x = Math.round(cx - rx * 0.7); x <= cx + rx * 0.7; x++) { const y = Math.round(by - ry * 0.7), alt = q.hole(x, y); if (alt && G.includes(alt)) q.px(x, y, M[1]); }
  }
  // Glanzlicht oben links
  const gx = Math.round(cx - rx * 0.45), gy = Math.round(by - ry * 0.72);
  q.px(gx, gy, '#ffffff').px(gx + 1, gy - 1, '#ffffff');
  if (rx >= 6) q.px(gx - 1, gy + 1, '#ffffff').px(gx + 2, gy - 1, G[0]).px(gx, gy - 1, G[0]);
  // Scheitel mit Leuchtpunkt
  const top = Math.round(by - ry) - 1;
  q.px(Math.round(cx), top, Me[2]).px(Math.round(cx), top - 1, k ? GLUTH : VIOH);
}

/** Röhrengang zwischen zwei Punkten (Mittellinie), 3 px stark, mit Ringsegmenten und Bullaugen. */
function roehre(q, xa, ya, xb, yb, k) {
  const Me = k ? MK : M;
  if (xa > xb) [xa, ya, xb, yb] = [xb, yb, xa, ya];
  for (let x = Math.round(xa); x <= Math.round(xb); x++) {
    const y = Math.round(ya + (yb - ya) * ((x - xa) / Math.max(1, xb - xa)));
    const fuge = (x - Math.round(xa)) % 4 === 0;
    q.px(x, y - 1, fuge ? Me[1] : Me[0]).px(x, y, fuge ? Me[2] : Me[1]).px(x, y + 1, fuge ? Me[3] : Me[2]);
    if ((x - Math.round(xa)) % 4 === 2) q.px(x, y, k ? GLUT : WARM);
  }
}

/** Landeplatz (flache Scheibe) mit Markierungsring und Randlichtern in Spielerfarbe. */
function landeplatz(q, cx, cy, rx, k) {
  const ry = Math.max(2, rx * 0.36);
  q.ellipse(cx, cy + 1, rx, ry, k ? '#2a3050' : '#2c2f3a');
  q.ellipse(cx, cy, rx, ry, k ? '#4a5680' : '#565b6c');
  q.ellipse(cx - 0.5, cy - 0.3, rx - 1.5, ry - 0.8, k ? '#3c4670' : '#464a5a');
  // Markierungsring
  const n = Math.ceil(rx * 5);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * (rx - 2.5), y = cy + Math.sin(a) * (ry - 1);
    if (i % 3 !== 2) q.px(x, y, k ? GLUTD : '#e8c040');
  }
  // Randlichter: Spielerfarbe und Weiß im Wechsel
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    q.px(x, y, i % 2 ? 'S+' : '#fff4d0');
  }
}

/** Kleines Shuttle (Seitenansicht, Nase nach rechts) mit Streifen in Spielerfarbe; x/y = Mitte unten. */
function shuttle(q, x, y, k) {
  const w = k ? '#f4f8ff' : '#eef0f4', ws = k ? '#b4c6e6' : '#b8bcc8';
  const pal = { t: ws, w, v: ws, g: k ? GLUT : '#5ab0e0', n: '#3a3e52', s: 'S', d: 'S-', b: '#4e5366', f: '#ff9a3a' };
  q.karte(x - 6, y - 6, [
    '.t..........',
    '.tt.........',
    '.twwwwwwgg..',
    'fwwwwwwwwwgn',
    '.vssssvvvvv.',
    '..vdddv.....',
    '..b.....b...',
  ], pal);
}
/** Shuttle im Flug (schräg aufsteigend) mit Triebwerksglut. */
function shuttleFlug(q, x, y, k) {
  shuttle(q, x, y, k);
  q.px(x - 7, y - 3, '#ffd27a').px(x - 8, y - 3, '#ff9a3a').px(x - 9, y - 2, '#e8603a');
}

/** Antennenmast mit Parabolschüssel und rotem Warnlicht. */
function antenne(q, x, yb, h, k) {
  const Me = k ? MK : M;
  q.rect(x - 1, yb - 1, 3, 2, Me[2]).px(x - 1, yb - 1, Me[1]);
  for (let y = yb - h; y < yb - 1; y++) q.px(x, y, y % 3 === 0 ? Me[2] : Me[1]);
  for (let y = yb - h + 3; y < yb - 2; y += 4) q.px(x - 1, y, Me[2]).px(x + 1, y, Me[3]);
  // Schüssel auf halber Höhe
  const sy = yb - Math.round(h * 0.6);
  q.ellipse(x + 2, sy, 1.4, 2.4, Me[0]); q.px(x + 3, sy, Me[2]).px(x + 3, sy + 1, Me[2]).px(x + 3, sy - 1, Me[1]);
  q.linie(x + 2, sy, x + 5, sy - 1, Me[2]); q.px(x + 5, sy - 1, k ? GLUT : VIOH);
  q.px(x, yb - h - 1, ROT).px(x, yb - h - 2, '#ffb0a0');
}

/** Solarfeld: n schräg gestellte Paneele nebeneinander auf Stelzen. */
function solarfeld(q, x, yb, n) {
  for (let k = 0; k < n; k++) {
    const px = x + k * 7;
    q.px(px + 3, yb, M[3]).px(px + 3, yb - 1, M[2]);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
      const xx = px + i + Math.round((3 - j) * 0.5), yy = yb - 2 - j;
      let c = i % 2 ? '#1f2f6a' : '#2a3f9a';
      if (j === 3) c = i < 2 ? '#a8c0ff' : '#6a8ae8';
      else if (j === 1) c = '#4c6ad6';
      q.px(xx, yy, c);
    }
  }
}

/** Zwei Lagertanks (Kugeln auf Stelzen) mit Rohr; kristallin mit leuchtendem Band. */
function tanks(q, x, yb, k) {
  const F = k ? ['#ffffff', '#d8e6f6', '#9cb4dc', '#6a7cbc'] : ['#f6f2ea', '#dcd6ca', '#a8a296', '#7a756c'];
  const kugel = (cx, cy, r) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
      const dx = (xx - cx) / (r + 0.5), dy = (y - cy) / (r + 0.5);
      if (dx * dx + dy * dy > 1) continue;
      const v = -dx * 0.8 - dy * 0.6;
      q.px(xx, y, v > 0.5 ? F[0] : v > -0.15 ? F[1] : v > -0.6 ? F[2] : F[3]);
    }
  };
  q.px(x - 1, yb, M[3]).px(x + 2, yb, M[3]).px(x + 5, yb, M[3]).px(x + 8, yb, M[3]);
  kugel(x + 6.5, yb - 3, 2.6);
  kugel(x + 0.5, yb - 3.5, 3);
  q.rect(x + 3, yb - 2, 2, 1, M[2]);
  band(q, x - 3, x + 4, yb - 3, k ? GLUT : '#e08a3a', k ? GLUTD : '#b0602a');
  band(q, x + 3, x + 10, yb - 3, k ? GLUT : '#e08a3a', k ? GLUTD : '#b0602a');
}

/** Fahne in Spielerfarbe an Metallmast. */
function fahne(q, x, y, h, lang = 4) {
  q.rect(x, y - h, 1, h + 1, M[2]); q.px(x, y - h - 1, ROT);
  for (let i = 0; i < lang; i++) { q.px(x + 1 + i, y - h + (i % 3 === 2 ? 1 : 0), 'S'); q.px(x + 1 + i, y - h + 1 + (i % 3 === 2 ? 1 : 0), i < lang - 1 ? 'S-' : 'S'); }
  q.px(x + 1, y - h, 'S+');
}

/** Zentraler Turm: Zeitalter 9 gestapelte Module mit verglaster Kanzel, Zeitalter 10 Kristallnadel. */
function turm(q, cx, yb, h, k) {
  if (!k) {
    const b1 = 7, h1 = Math.round(h * 0.45), b2 = 5, h2 = Math.round(h * 0.3);
    zylinder(q, cx - 3, yb, b1, h1, M);
    zylinder(q, cx - 2, yb - h1, b2, h2, M);
    band(q, cx - 3, cx + 3, yb - 2, 'S', 'S-');
    band(q, cx - 3, cx + 3, yb - 3, 'S', 'S-');
    for (let y = yb - h1 + 3; y < yb - 4; y += 3) q.px(cx - 1, y, WARM).px(cx + 1, y, WARMD);
    for (let y = yb - h1 - h2 + 3; y < yb - h1 - 1; y += 3) q.px(cx, y, VIOH);
    // Kanzel
    const ky = yb - h1 - h2;
    q.rect(cx - 4, ky - 3, 9, 3, GLAS[1]); q.rect(cx - 4, ky - 3, 2, 3, GLAS[0]); q.rect(cx + 3, ky - 3, 2, 3, GLAS[2]);
    q.rect(cx - 4, ky - 2, 9, 1, WARM); q.px(cx + 3, ky - 2, WARMD).px(cx + 4, ky - 2, WARMD).px(cx - 2, ky - 2, WARMH);
    q.rect(cx - 4, ky, 9, 1, M[2]); q.rect(cx - 4, ky - 4, 9, 1, M[1]);
    q.rect(cx - 3, ky - 5, 7, 1, 'S'); q.px(cx + 3, ky - 5, 'S-');
    // Mast
    const rest = h - h1 - h2 - 5;
    for (let y = ky - 5 - rest; y < ky - 5; y++) q.px(cx, y, y % 3 ? M[1] : M[2]);
    q.px(cx, ky - 6 - rest, ROT).px(cx - 1, ky - 3 - rest, M[2]).px(cx + 1, ky - 3 - rest, M[2]);
  } else {
    // Kristallnadel mit Nebensplittern, leuchtender Naht und Spielerbändern
    h = Math.min(h, yb - 10);
    const splitter = (sx, sb, sh, l, r) => {
      const st = yb - sh, sp = st - Math.max(3, Math.round(sb * 2.4));
      q.poly([[sx - sb, yb], [sx, yb], [sx, sp], [sx - sb, st]], l);
      q.poly([[sx + 1, yb], [sx + sb + 1, yb], [sx + sb + 1, st + Math.round(sb)], [sx + 1, sp]], r);
      q.linie(sx, yb, sx, sp, '#ffffff');
      return sp;
    };
    splitter(cx - 5, 1.5, Math.round(h * 0.42), '#ece6fa', '#a496dc');
    splitter(cx + 6, 1.5, Math.round(h * 0.55), '#ece6fa', '#a496dc');
    const b = 2, top = yb - h;
    const spitze = splitter(cx, b, h, '#e6eef7', '#94ace0');
    for (let y = top + 3; y < yb - 1; y += 4) { for (let x = cx - b + 1; x < cx; x++) q.px(x, y, '#c4d6f0'); for (let x = cx + 2; x <= cx + b + 1; x++) q.px(x, y + 1, '#6f86c8'); }
    q.linie(cx + 1, yb - 1, cx + 1, spitze + 2, GLUT);
    for (let y = top + 1; y < yb - 1; y += 4) q.px(cx + 1, y, GLUTH);
    q.rect(cx - b, yb - 3, b + 1, 2, 'S').rect(cx + 1, yb - 3, b + 1, 2, 'S-');
    q.rect(cx - b, top + 3, b + 1, 1, 'S').rect(cx + 1, top + 3, b + 1, 1, 'S-');
    // schwebender Lichtring um die Nadel
    const ry0 = yb - Math.round(h * 0.62);
    for (let x = -5; x <= 6; x++) { const y = ry0 + (Math.abs(x - 0.5) > 4 ? 0 : 1); if (!q.hole(cx + x, y) || Math.abs(x - 0.5) > 2.5) q.px(cx + x, y, x % 2 ? GLUT : GLUTH); }
    q.px(cx, spitze - 1, GLUTH).px(cx, spitze - 2, GLUT);
  }
}

/** Halbdurchsichtiges Schutzfeld (Zeitalter 10): über Bauten wird aufgehellt, im Freien eine Lichtlinie gezogen. */
function schutzfeld(p, gr) {
  const rx = Math.min(31, 21 + gr * 4), ry = 30 + gr * 5, cx = 32, cy = 46;
  const setze = (x, y, c, t) => { x = Math.round(x); y = Math.round(y); const alt = p.hole(x, y); if (alt && alt[0] === '#') p.px(x, y, mische(alt, '#c8f8ff', t)); else if (!alt) p.px(x, y, c); };
  let vx = null, vy = null;
  for (let x = cx - rx; x <= cx + rx; x += 0.25) {
    const t = (x - cx) / rx, yy = cy - ry * Math.sqrt(Math.max(0, 1 - t * t));
    const rxy = [Math.round(x), Math.round(yy)];
    if (vx === rxy[0] && vy === rxy[1]) continue; vx = rxy[0]; vy = rxy[1];
    const oben = t < -0.15 && t > -0.75;
    // gestrichelt, damit es als Feld und nicht als Wand wirkt
    if ((rxy[0] + rxy[1]) % 5 === 4) continue;
    setze(rxy[0], rxy[1], oben ? '#e8fdff' : GLUT, 0.55);
    if ((rxy[0] + rxy[1]) % 2 === 0) setze(rxy[0] + (t < 0 ? 1 : -1), rxy[1] + 1, GLUTD, 0.25);
  }
  // Wabenschimmer auf der Feldfläche
  for (let k = 0; k < 11; k++) {
    const a = -Math.PI * (0.15 + 0.7 * ((k * 0.37) % 1)), rr = 0.7 + 0.22 * ((k * 0.61) % 1);
    setze(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, '#bff6ff', 0.3);
  }
}

// ---------- Anordnung je Größe ----------
// Bauteile mit y = Fußlinie; gezeichnet wird von hinten (kleines y) nach vorne.
const PLAN = {
  1: {
    roehren: [[32, 46, 44, 47]],
    teile: [
      { art: 'solar', x: 40, y: 40, n: 2 },
      { art: 'kuppel', x: 27, y: 45, rx: 10, ry: 10 },
      { art: 'kuppel', x: 44, y: 46, rx: 5, ry: 5 },
      { art: 'antenne', x: 52, y: 48, h: 15 },
      { art: 'platz', x: 15, y: 51, rx: 6.5, shuttle: true },
      { art: 'tanks', x: 35, y: 53 },
      { art: 'fahne', x: 8, y: 51, h: 12 },
    ],
  },
  2: {
    roehren: [[22, 45, 32, 41], [32, 41, 42, 45], [24, 47, 31, 49], [40, 47, 33, 49]],
    teile: [
      { art: 'antenne', x: 54, y: 41, h: 15 },
      { art: 'turm', x: 32, y: 40, h: 28 },
      { art: 'kuppel', x: 19, y: 43, rx: 9, ry: 9 },
      { art: 'kuppel', x: 45, y: 43, rx: 8, ry: 8 },
      { art: 'kuppel', x: 32, y: 48, rx: 6, ry: 5.5 },
      { art: 'platz', x: 13, y: 51, rx: 6.5, shuttle: true },
      { art: 'solar', x: 41, y: 54, n: 2 },
      { art: 'tanks', x: 24, y: 55 },
    ],
  },
  3: {
    roehren: [[17, 42, 32, 40], [32, 40, 47, 42], [8, 49, 32, 46], [56, 49, 32, 46]],
    teile: [
      { art: 'antenne', x: 25, y: 35, h: 13 },
      { art: 'turm', x: 32, y: 38, h: 34 },
      { art: 'kuppel', x: 16, y: 40, rx: 9, ry: 9 },
      { art: 'kuppel', x: 48, y: 40, rx: 9, ry: 9 },
      { art: 'kuppel', x: 32, y: 47, rx: 10.5, ry: 10 },
      { art: 'kuppel', x: 7, y: 48, rx: 4.5, ry: 4.5 },
      { art: 'kuppel', x: 57, y: 48, rx: 4.5, ry: 4.5 },
      { art: 'solar', x: 2, y: 41, n: 1 },
      { art: 'solar', x: 56, y: 41, n: 1 },
      { art: 'tanks', x: 15, y: 55 },
      { art: 'platz', x: 47, y: 53, rx: 7, shuttle: true },
    ],
    flug: [12, 16],
  },
};

definiere('stadt', 'kolonie', {
  w: 64, h: 56, zeitalterVarianten: true, groessen: 3, umriss: false,
  zeichne(p, o) {
    const z = Math.max(0, Math.min(10, o.zeitalter)), gr = Math.max(1, Math.min(3, o.groesse));
    const k = z >= 10;
    // Fundament: neutrale dunkle Metallplatte mit sichtbarer Kante
    const B = k ? ['#3a4466', '#48547a', '#262c46', '#1c2136'] : ['#474b58', '#555a68', '#33363f', '#24262e'];
    const rx = 14 + gr * 4, ry = 5 + gr * 1.7;
    p.ellipse(32, 47, rx + 1, ry + 1, B[3]);
    p.ellipse(32, 46, rx + 1, ry + 1, B[2]);
    p.ellipse(32, 45.5, rx, ry, B[0]);
    p.ellipse(31, 45, rx - 3, ry - 2, B[1]);
    // Plattenfugen
    for (let yy = Math.ceil(45.5 - ry + 1); yy < 45.5 + ry; yy += 3) for (let xx = 32 - rx; xx <= 32 + rx; xx++) if ((p.hole(xx, yy) === B[1] || p.hole(xx, yy) === B[0]) && xx % 7 !== 0) p.px(xx, yy, B[2]);
    for (let xx = 32 - rx; xx <= 32 + rx; xx += 7) for (let yy = Math.ceil(45.5 - ry); yy < 45.5 + ry; yy++) if (p.hole(xx, yy) === B[1] || p.hole(xx, yy) === B[0]) if (yy % 3 !== 0) p.px(xx, yy, B[2]);
    // Randlichter: warm/violett bzw. cyan, dazwischen Spielerfarbe
    const nL = 10 + gr * 2;
    for (let i = 0; i < nL; i++) {
      const a = i / nL * Math.PI * 2;
      p.px(32 + Math.cos(a) * (rx - 0.5), 45.5 + Math.sin(a) * (ry - 0.3), i % 3 === 0 ? 'S+' : k ? (i % 2 ? GLUT : GLUTH) : (i % 2 ? VIOH : WARM));
    }
    if (k) { // Lichtadern im Fundament
      const n = Math.ceil((rx + ry) * 3);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (Math.sin(a) > 0.1 && i % 2) p.px(32 + Math.cos(a) * (rx - 3), 45.5 + Math.sin(a) * (ry - 1.6), GLUTD); }
    }
    const plan = PLAN[gr];
    // Röhrengänge liegen hinter den Kuppeln
    teil(p, (q) => { for (const [xa, ya, xb, yb] of plan.roehren) roehre(q, xa, ya, xb, yb, k); });
    const teile = plan.teile.slice().sort((a, b) => a.y - b.y);
    for (const t of teile) {
      teil(p, (q) => {
        if (t.art === 'kuppel') habitat(q, t.x, t.y, t.rx, t.ry, k);
        else if (t.art === 'turm') turm(q, t.x, t.y, t.h, k);
        else if (t.art === 'antenne') antenne(q, t.x, t.y, t.h, k);
        else if (t.art === 'solar') solarfeld(q, t.x, t.y, t.n);
        else if (t.art === 'tanks') tanks(q, t.x, t.y, k);
        else if (t.art === 'fahne') fahne(q, t.x, t.y, t.h, 5);
        else if (t.art === 'platz') landeplatz(q, t.x, t.y, t.rx, k);
      });
      if (t.art === 'platz' && t.shuttle) teil(p, (q) => shuttle(q, t.x, t.y, k));
    }
    if (plan.flug) teil(p, (q) => shuttleFlug(q, plan.flug[0] + (k ? 2 : 0), plan.flug[1] + (k ? 8 : 0), k));
    if (k) schutzfeld(p, gr);
  },
});
