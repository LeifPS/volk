// Städte (11 Zeitalter x 3 Größen), Stadtmauern (4 Stufen), Stadtstaat und Hauptstadt-Markierung.
// Stadt 64x56: Unterkante ca. 10 px unter der Feldmitte; Feldmitte also bei (32, 45). Gebäude stehen auf einer
// elliptischen Fläche um (32, 45). Häuser in Schrägansicht: Vorderseite + rechte Seite (nach hinten oben versetzt).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, mische, Pinsel, UMRISS } from '../pixel.js';

// ---------- Hilfen ----------
function teil(p, fn, rand = UMRISS) {
  const t = new Pinsel(p.w, p.h); fn(t); if (rand) t.umriss(rand);
  for (let i = 0; i < t.feld.length; i++) if (t.feld[i]) p.feld[i] = t.feld[i];
}
const s2 = (i) => Math.floor((i + 1) / 2);
/** Farbreihe [hell, grund, dunkel, sehr dunkel]; 'S' ergibt die Spielerfarbe. */
const toene = (c) => (c === 'S' ? ['S+', 'S', 'S-', 'S--'] : [hell(c, 0.22), c, dunkel(c, 0.22), dunkel(c, 0.45)]);

/** Quader: Vorderseite x..x+w-1, Zeilen y-h+1..y; rechte Seite d Spalten breit, nach oben versetzt. */
function quader(p, x, y, w, h, d, front, seite) {
  p.rect(x, y - h + 1, w, h, front);
  for (let i = 0; i < d; i++) p.rect(x + w + i, y - h + 1 - s2(i), 1, h, seite);
}
function flachdach(p, x, y, w, h, d, c, rand) {
  const t = y - h;
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.rect(x + k * 2 - 1 + 1, t - k, w, 1, c);
  for (let k = 0; k <= Math.ceil(d / 2); k++) p.px(x + w - 1 + k * 2, t - k, c).px(x + w + k * 2, t - k, c);
  if (rand) { p.rect(x, t, w, 1, rand); for (let i = 0; i < d; i++) p.px(x + w + i, t - s2(i), dunkel(rand, 0.2)); }
}
/** Satteldach, First parallel zur Vorderseite. F = toene(). */
function satteldach(p, x, y, w, h, d, rh, F, seite) {
  const yE = y - h, sx = Math.max(1, Math.round(d / 2));
  // Giebeldreieck rechts
  p.poly([[x + w, yE + 1], [x + w + d - 1, yE + 1 - s2(d - 1)], [x + w + sx, yE - rh + 1]], seite);
  p.linie(x + w + sx, yE - rh + 1, x + w + d, yE + 1 - s2(d - 1), F[2]);
  for (let k = 0; k < rh; k++) {
    const o = Math.round(k * sx / rh), xs = x - 1 + o, xe = x + w + o;
    let c = k === 0 ? F[3] : (k === rh - 1 ? F[0] : F[1]);
    p.rect(xs, yE - k, xe - xs + 1, 1, c);
    if (k > 0 && k < rh - 1) for (let i = xs + ((k * 2) % 3); i <= xe; i += 3) p.px(i, yE - k, F[2]);
  }
}
/** Giebel zur Vorderseite (Tempel, Kirche, Fachwerk). */
function giebeldach(p, x, y, w, h, d, F, wand, seite, gh) {
  const yE = y - h, ax = x + (w - 1) / 2;
  gh = gh ?? Math.ceil(w / 2);
  p.poly([[x, yE], [x + w - 1, yE], [ax, yE - gh + 1]], wand);
  // rechte Dachfläche nach hinten
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
function fahne(p, x, y, h, lang = 4) {
  p.rect(x, y - h, 1, h + 1, '#4a3a2a'); p.px(x, y - h - 1, PAL.gold);
  for (let i = 0; i < lang; i++) { p.px(x + 1 + i, y - h + (i % 3 === 2 ? 1 : 0), 'S'); p.px(x + 1 + i, y - h + 1 + (i % 3 === 2 ? 1 : 0), i < lang - 1 ? 'S-' : 'S'); }
  p.px(x + 1, y - h, 'S+');
}
function rauch(p, x, y, n, seed = 0) {
  teil(p, (q) => {
    for (let i = 0; i < n; i++) {
      const xx = x + i * 1.5 + ((i + seed) % 2), yy = y - i * 2.6, r = 1.3 + i * 0.45;
      q.ellipse(xx, yy, r, r * 0.8, '#7c7874'); q.ellipse(xx - 0.4, yy - 0.4, r - 0.5, r * 0.8 - 0.5, '#a49e98'); q.px(xx - r * 0.4, yy - r * 0.4, '#c8c2bc');
    }
  }, '#5a5450');
}

// ---------- Gebäude je Zeitalter ----------
const ZA = [
  { boden: ['#8a7050', '#9a8260', '#7a6244'], wand: '#b88a58', seite: '#8a643c', dach: '#d2ae5a' },          // Antike
  { boden: ['#b8aa88', '#c8bc9c', '#a49676'], wand: '#ece4d2', seite: '#c4b8a0', dach: '#b5523b' },          // Klassik
  { boden: ['#8a8474', '#9a9484', '#767060'], wand: '#e6d8b8', seite: '#bcae90', dach: '#7a4a3a' },          // Mittelalter
  { boden: ['#b0a080', '#c0b292', '#9a8a6c'], wand: '#e4c88e', seite: '#bea06a', dach: '#c0603a' },          // Renaissance
  { boden: ['#76706a', '#86807a', '#625c56'], wand: '#9c4a32', seite: '#6e3122', dach: '#565a66' },          // Industrie
  { boden: ['#868a8c', '#969a9c', '#727678'], wand: '#b4b8ba', seite: '#868a8c', dach: '#6a6e70' },          // Moderne
  { boden: ['#727a84', '#828a94', '#5e666e'], wand: '#a8b4c0', seite: '#76828e', dach: '#5a6470' },          // Atomzeit
  { boden: ['#7a8a84', '#8c9c94', '#65736c'], wand: '#7ec4f0', seite: '#4a86c8', dach: '#4fa046' },          // KI-Zeitalter (smart)
  { boden: ['#cdc6b6', '#ddd7c9', '#aaa292'], wand: '#f1efe8', seite: '#d3cfc6', dach: '#f2a33a' },          // Fusionszeitalter (fusion)
  { boden: ['#5c6072', '#6c7084', '#474b5b'], wand: '#a8aec0', seite: '#7c8298', dach: '#8e7cc3' },          // Weltraumzeitalter (orbital)
  { boden: ['#3c4466', '#4a5478', '#2c3250'], wand: '#e6eef7', seite: '#8aa8dc', dach: '#9ff0ff' },          // Sternenzeitalter (stern)
];

function huette(p, cx, y, r, h, sdach) {
  const L = '#b88a58', Ld = '#8a643c';
  for (let x = cx - r; x <= cx + r; x++) p.rect(x, y - h + 1, 1, h, x < cx - r / 3 ? hell(L, 0.12) : x > cx + r / 3 ? Ld : L);
  tuer(p, cx - 1, y, '#3a2414', 3);
  const F = sdach ? toene('S') : ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'];
  const rh = r + 3, ty = y - h;
  for (let k = 0; k <= rh; k++) {
    const hw = Math.round((r + 2) * (1 - k / (rh + 1)));
    for (let i = -hw; i <= hw; i++) p.px(cx + i, ty - k + 1, i < -hw / 3 ? F[0] : i > hw / 3 ? F[2] : F[1]);
  }
  for (let i = -r - 2; i <= r + 2; i += 2) p.px(cx + i, ty + 2, F[3]);
  for (let k = 2; k < rh; k += 2) p.px(cx + ((k * 3) % 5) - 2, ty - k + 1, F[3]);
  p.linie(cx, ty - rh, cx - 1, ty - rh - 2, '#5a3a1a').linie(cx, ty - rh, cx + 1, ty - rh - 2, '#5a3a1a');
}

function haus(p, s, z, i, gr, sp) {
  if (z >= 7) { HAUS_ZUKUNFT[z](p, s, i, gr, sp); return; }
  const st = ZA[z], { x, y, w } = s;
  const d = s.d ?? 4;
  const hoch = s.h ?? 0;
  if (z === 0) {
    if (s.rund) { huette(p, x + Math.floor(w / 2), y, Math.floor(w / 2) - 1, 4 + hoch, sp); return; }
    const h = 4 + hoch; quader(p, x, y, w, h, d, st.wand, st.seite);
    for (let k = x + 1; k < x + w; k += 3) p.rect(k, y - h + 1, 1, h, dunkel(st.wand, 0.12));
    tuer(p, x + Math.floor(w / 2), y, '#3a2414', 3);
    satteldach(p, x, y, w, h, d, 4, sp ? toene('S') : ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'], st.seite);
    return;
  }
  if (z === 1) {
    const h = 5 + hoch + (gr > 2 ? 2 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    fenster(p, x, y, w, h, d, '#5a4a3a', '#4a3a2a', { dx: 3, oben: 1 });
    tuer(p, x + 1, y, '#6a4a2a');
    satteldach(p, x, y, w, h, d, 3, toene(sp ? 'S' : st.dach), st.seite);
    if (i % 3 === 1) { p.rect(x + w - 3, y - 2, 2, 1, '#5a8a3a'); p.px(x + w - 3, y - 3, '#7aaa4a'); }
    return;
  }
  if (z === 2) {
    const h = 6 + hoch + (gr > 2 ? 2 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    const b = '#4a3020';
    p.rect(x, y - h + 1, 1, h, b).rect(x + w - 1, y - h + 1, 1, h, b).rect(x, y - Math.floor(h / 2), w, 1, b).rect(x, y - h + 1, w, 1, b);
    for (let k = x + 2; k < x + w - 1; k += 3) p.rect(k, y - h + 1, 1, h, b);
    p.linie(x + 1, y - 1, x + 2, y - Math.floor(h / 2) + 1, b);
    for (let k = 0; k < d; k += 2) p.rect(x + w + k, y - h + 1 - s2(k), 1, h, dunkel(b, 0.2));
    p.px(x + 4, y - h + 2, '#e8d070').px(x + 4, y - h + 3, '#c8a040');
    tuer(p, x + 1, y, '#3a2414');
    if (i % 2 === 0) giebeldach(p, x, y, w, h, d, toene(sp ? 'S' : st.dach), st.wand, st.seite, Math.ceil(w / 2) + 1);
    else satteldach(p, x, y, w, h, d, 5, toene(sp ? 'S' : st.dach), st.seite);
    return;
  }
  if (z === 3) {
    const wand = ['#e4c88e', '#e0b4a0', '#d4d8b4', '#ead8b0'][i % 4];
    const h = 7 + hoch + (gr > 2 ? 3 : 0);
    quader(p, x, y, w, h, d, wand, dunkel(wand, 0.22));
    for (let yy = y - h + 2; yy <= y - 2; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) { p.rect(xx, yy, 1, 2, '#4a3a3a'); p.px(xx, yy - 1, hell(wand, 0.3)); }
    p.rect(x, y - h + 1, w, 1, hell(wand, 0.3));
    tuer(p, x + Math.floor(w / 2), y, '#5a3a2a');
    if (sp) { p.rect(x, y - 2, w, 1, 'S'); for (let k = x; k < x + w; k += 2) p.px(k, y - 1, 'S+'); }
    satteldach(p, x, y, w, h, d, 3, toene(i % 3 === 0 ? '#a85a3a' : st.dach), dunkel(wand, 0.22));
    return;
  }
  if (z === 4) {
    const h = 7 + hoch + (gr > 2 ? 4 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + w; xx += 3) p.px(xx, yy, '#86402a');
    fenster(p, x, y, w, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
    if (sp) { p.rect(x, y - 3, w, 1, 'S'); p.rect(x, y - 2, w, 1, 'S-'); }
    satteldach(p, x, y, w, h, d, 3, toene(st.dach), st.seite);
    p.rect(x + 1, y - h - 4, 2, 3, '#6e3122'); p.px(x + 1, y - h - 5, '#3a3a3a');
    return;
  }
  if (z === 5) {
    const h = 9 + hoch + (gr > 2 ? 5 : 0);
    quader(p, x, y, w, h, d, st.wand, st.seite);
    if (i % 2) fenster(p, x, y, w, h, d, PAL.glasD, '#4a7090', { dx: 2, dy: 2, oben: 1, unten: 1 });
    else for (let yy = y - h + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, w - 2, 1, PAL.glas); for (let k = 0; k < d - 1; k++) p.px(x + w + k, yy - s2(k), PAL.glasD); }
    if (sp) { p.rect(x, y - 2, w, 1, 'S'); for (let k = x; k < x + w; k += 2) p.px(k, y - 1, 'S-'); }
    flachdach(p, x, y, w, h, d, st.dach, '#c8cccc');
    return;
  }
  // Atomzeit
  const h = 12 + hoch + (gr > 2 ? 3 : 0);
  quader(p, x, y, w, h, d, i % 2 ? '#8fb8d8' : st.wand, i % 2 ? '#5a84a8' : st.seite);
  if (i % 2) { for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, w, 1, '#6a98c0'); p.linie(x + 1, y - h + 3, x + 3, y - h + 1, '#d8f0ff'); p.linie(x + 1, y - h + 7, x + 4, y - h + 4, '#c0e4f8'); }
  else fenster(p, x, y, w, h, d, '#4a6a88', '#3a5470', { dx: 2, dy: 2, oben: 1, unten: 1, licht: '#f0e080' });
  if (sp) { p.rect(x, y - h + 1, w, 2, 'S'); for (let k = 0; k < d; k++) p.rect(x + w + k, y - h + 1 - s2(k), 1, 2, 'S-'); }
  flachdach(p, x, y, w, h, d, st.dach, '#b0bcc8');
}

// ---------- Wahrzeichen ----------
function wahrzeichen(p, s, z, gr) {
  if (z >= 7) { WZ_ZUKUNFT[z](p, s, gr); return; }
  const { x, y, w } = s, d = 5;
  if (z === 0) { // Häuptlingshalle mit Banner und Totempfahl
    const h = 5 + gr;
    quader(p, x, y, w, h, d, '#a87a4c', '#7a5634');
    for (let k = x + 1; k < x + w; k += 2) p.rect(k, y - h + 1, 1, h, '#946a40');
    p.rect(x + Math.floor(w / 2) - 1, y - 3, 3, 4, '#2a1a10');
    satteldach(p, x, y, w, h, d, 6, ['#ecd27a', '#d2ae5a', '#a8843a', '#7a5e28'], '#7a5634');
    p.linie(x - 1, y - h - 1, x - 2, y - h - 3, '#5a3a1a').linie(x + w + 2, y - h - 6, x + w + 3, y - h - 8, '#5a3a1a');
    // Banner
    p.rect(x + w + d, y - h - 9, 1, h + 9, '#5a3a1a');
    p.rect(x + w + d + 1, y - h - 9, 3, 5, 'S'); p.rect(x + w + d + 1, y - h - 9, 1, 5, 'S+'); p.px(x + w + d + 2, y - h - 4, 'S-').px(x + w + d + 1, y - h - 5, 'S-');
    // Totem
    p.rect(x - 3, y - 11, 2, 12, '#8a5a2b'); p.px(x - 3, y - 10, '#2a1a10').px(x - 2, y - 10, PAL.gold).rect(x - 4, y - 8, 4, 1, '#c0392b').px(x - 3, y - 6, '#2a1a10').px(x - 2, y - 5, '#f4f1ea');
    return;
  }
  if (z === 1) { // Säulentempel
    const h = 7 + gr;
    p.rect(x - 2, y - 1, w + 4, 2, '#d8d0bc'); p.rect(x - 1, y - 2, w + 2, 1, '#ece4d2');
    for (let i = 0; i < d + 2; i++) p.rect(x + w + 2 + i - 0, y - s2(i) - 1, 1, 2, '#b4a890');
    quader(p, x, y - 2, w, h, d, '#7a6e5c', '#c4b8a0');
    for (let k = x; k < x + w; k += 2) { p.rect(k, y - 1 - h, 1, h, '#f8f4ea'); p.px(k, y - 2, '#d8d0bc'); }
    p.rect(x - 1, y - 2 - h, w + 2, 2, '#ece4d2'); p.rect(x - 1, y - 1 - h, w + 2, 1, '#c8bca4');
    giebeldach(p, x - 1, y - 3, w + 2, h, d, toene(ZA[1].dach), '#f4ecdc', '#c4b8a0', Math.ceil(w / 3) + 1);
    p.px(x + Math.floor(w / 2), y - 3 - h - 2, 'S').px(x + Math.floor(w / 2), y - 3 - h - 1, 'S-');
    fahne(p, x + w + d + 1, y - 3, h + 8, 4);
    return;
  }
  if (z === 2) { // Kirche mit Turm + Burgturm
    const h = 8 + gr;
    quader(p, x, y, w, h, d, '#c8c0b0', '#9a9284');
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 2 ? 0 : 1); xx < x + w; xx += 3) p.px(xx, yy, '#b4ac9c');
    p.rect(x + 2, y - h + 3, 1, 3, '#3a3a5a').rect(x + w - 3, y - h + 3, 1, 3, '#3a3a5a');
    satteldach(p, x, y, w, h, d, 6, toene('#4e5260'), '#9a9284');
    // Kirchturm vorne links
    const tx = x - 1, th = h + 6 + gr * 2;
    quader(p, tx, y, 5, th, 3, '#d4ccbc', '#a49c8c');
    p.rect(tx + 2, y - th + 3, 1, 2, '#2a2a3a').rect(tx + 2, y - 3, 1, 3, '#3a2414');
    zeltdach(p, tx, y, 5, th, 3, 8, toene('S'));
    p.px(tx + 3, y - th - 10, PAL.gold).px(tx + 3, y - th - 11, PAL.gold).px(tx + 2, y - th - 10, PAL.gold).px(tx + 4, y - th - 10, PAL.gold);
    // Burgturm hinten rechts
    const bx = x + w + 3, bh = h + 6 + gr * 2, by = y - 3;
    quader(p, bx, by, 6, bh, 3, '#aaa498', '#7e786e');
    for (let yy = by - bh + 3; yy <= by; yy += 3) for (let xx = bx + (yy % 2); xx < bx + 6; xx += 3) p.px(xx, yy, '#928c80');
    for (let k = 0; k < 6; k += 2) p.px(bx + k, by - bh, '#aaa498');
    p.px(bx + 6, by - bh - 1, '#7e786e').px(bx + 8, by - bh - 2, '#7e786e');
    p.rect(bx + 2, by - bh + 3, 1, 2, '#2a2a3a');
    fahne(p, bx + 3, by - bh, 6, 4);
    return;
  }
  if (z === 3) { // Kuppelbau
    const h = 8 + gr;
    quader(p, x, y, w, h, d, '#ecdcb8', '#c4b088');
    for (let k = x + 1; k < x + w; k += 3) { p.rect(k, y - h + 3, 1, h - 3, '#f8f0dc'); }
    for (let k = x + 2; k < x + w; k += 3) { p.rect(k, y - h + 4, 1, 3, '#5a4a3a'); p.px(k, y - h + 3, '#f8f0dc'); }
    p.rect(x + Math.floor(w / 2) - 1, y - 3, 3, 4, '#5a3a2a');
    flachdach(p, x, y, w, h, d, '#c8b088', '#f4e8cc');
    // Tambour + Kuppel
    const cx = x + (w + d) / 2 - 0.5, ty = y - h - 2;
    p.rect(Math.round(cx - 4), ty - 4, 9, 5, '#ecdcb8'); p.rect(Math.round(cx + 2), ty - 4, 3, 5, '#c4b088');
    for (let k = -3; k <= 3; k += 2) p.rect(Math.round(cx + k), ty - 3, 1, 2, '#5a4a3a');
    kuppel(p, cx + 0.5, ty - 5, 5, 6, toene('#5aa088'));
    p.linie(Math.round(cx - 2), ty - 9, Math.round(cx - 2), ty - 6, '#8ad0b8');
    p.rect(Math.round(cx), ty - 13, 2, 2, '#ecdcb8'); p.px(Math.round(cx), ty - 14, PAL.gold);
    fahne(p, Math.round(cx) + 1, ty - 13, 5, 4);
    return;
  }
  if (z === 4) { // Fabrik mit Sheddach und Schornsteinen
    const h = 7 + gr, ww = w + 2;
    quader(p, x, y, ww, h, d, '#9c4a32', '#6e3122');
    for (let yy = y - h + 2; yy <= y; yy += 2) for (let xx = x + (yy & 1); xx < x + ww; xx += 3) p.px(xx, yy, '#86402a');
    fenster(p, x, y, ww, h, d, '#2a2a34', '#1e1e26', { dx: 2, dy: 3, fh: 2, licht: '#e8c860' });
    p.rect(x + 2, y - 3, 3, 4, '#3a3a40');
    for (let k = 0; k < ww; k += 4) { p.poly([[x + k, y - h], [x + k + 3, y - h - 3], [x + k + 3, y - h]], '#5a5e6a'); p.linie(x + k + 3, y - h - 3, x + k + 3, y - h, '#a8c8e0'); }
    p.rect(x, y - h, ww, 1, '#3e424c');
    const sch = gr > 1 ? [x + 3, x + ww - 1] : [x + ww - 2];
    sch.forEach((sx, j) => { const sh = 12 + gr * 2 + j * 2; p.rect(sx, y - h - sh, 2, sh, '#7a3626'); p.rect(sx, y - h - sh, 1, sh, '#9c4a32'); p.rect(sx - 1, y - h - sh, 4, 1, '#5a2a1e'); for (let yy = y - h - sh + 3; yy < y - h; yy += 4) p.rect(sx, yy, 2, 1, '#5a2a1e'); });
    p.rect(x, y - 5, ww, 1, 'S'); p.rect(x, y - 4, ww, 1, 'S-');
    return;
  }
  if (z === 5) { // Bürohochhaus
    const h = 16 + gr * 3, ww = w - 1;
    quader(p, x, y, ww, h, d, '#c4c8ca', '#8e9294');
    for (let yy = y - h + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, ww - 2, 1, PAL.glas); for (let k = 0; k < d - 1; k++) p.px(x + ww + k, yy - s2(k), PAL.glasD); }
    p.linie(x + 1, y - h + 6, x + 3, y - h + 4, '#e0f4ff');
    flachdach(p, x, y, ww, h, d, '#6a6e70', '#d8dcdc');
    p.rect(x, y - h + 1, ww, 2, 'S'); for (let k = 0; k < d; k++) p.rect(x + ww + k, y - h + 1 - s2(k), 1, 2, 'S-');
    p.rect(x + 2, y - h - 4, 1, 3, '#5a5e60'); p.px(x + 2, y - h - 5, '#e83a2a');
    return;
  }
  // Atomzeit: Wolkenkratzer mit Antenne
  const h = Math.min(26 + gr * 5, s.y - 12), ww = w - 2;
  quader(p, x, y, ww, h, d, '#8fb8d8', '#5a84a8');
  for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, ww, 1, '#6a98c0');
  for (let yy = y - h + 2; yy < y; yy += 3) for (let k = 1; k < d - 1; k += 2) p.px(x + ww + k, yy - s2(k), '#3e6488');
  for (let k = 0; k < 4; k++) p.linie(x + 1, y - h + 4 + k * 9, x + 4, y - h + 1 + k * 9, '#d8f0ff');
  // Stufe oben
  quader(p, x + 2, y - h, ww - 4, 4, 3, '#a8c8e0', '#6a94b8');
  flachdach(p, x + 2, y - h, ww - 4, 4, 3, '#5a6470', '#c8d8e8');
  p.rect(x + 3, y - h - 9, 1, 4, '#7a828c'); p.px(x + 3, y - h - 10, '#ff4a3a');
  p.rect(x, y - h + 3, ww, 1, 'S'); p.rect(x, y - h + 4, ww, 1, 'S-');
}

// ---------- Zukunfts-Zeitalter (7 KI, 8 Fusion, 9 Weltraum, 10 Sterne) ----------
// Jede Epoche hat eine eigene Leitfarbe und Silhouette, damit sie auch klein auf dem Handy erkennbar bleibt:
// KI = Glas + Grün (Dachgärten, Solarfassaden, Drohnen), Fusion = Weiß + Orange (Kuppeln mit Lichtbändern),
// Weltraum = Stahl + Violett (Aufzugsmast, Habitatkuppeln, Raketen, Satelliten), Sterne = Kristall + Cyan (Schutzfeld).

/** Stehender Zylinder mit Spaltenschattierung (F = [hell, grund, dunkel, sehr dunkel]); Deckel als flache Ellipse. */
function zylinder(p, x, yb, b, h, F, deckel = true) {
  for (let i = 0; i < b; i++) {
    const t = b > 1 ? i / (b - 1) : 0.5;
    p.rect(x + i, yb - h + 1, 1, h, t < 0.2 ? F[0] : t < 0.62 ? F[1] : t < 0.86 ? F[2] : F[3]);
  }
  if (deckel) { p.ellipse(x + (b - 1) / 2, yb - h + 1, (b - 1) / 2, 1, F[0]); p.px(x + b - 1, yb - h + 1, F[1]); }
}
/** Färbt nur bereits gesetzte Pixel einer Zeile (für Bänder auf runden Formen); rechts dunkler. */
function band(p, x0, x1, y, c, cd, glanzC) {
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (!p.hole(x, y)) continue;
    const t = (x - x0) / Math.max(1, x1 - x0);
    p.px(x, y, glanzC && (x % 4 === 1) && t < 0.7 ? glanzC : t > 0.72 ? cd : c);
  }
}
/** Ellipsenring (Umrisslinie); teil = 'vorne' (untere Hälfte), 'hinten' (obere Hälfte) oder 'ganz'. */
function ring(p, cx, cy, rx, ry, c, teilR = 'ganz', c2) {
  const n = Math.ceil((rx + ry) * 4);
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (teilR === 'vorne' && y < cy) continue;
    if (teilR === 'hinten' && y >= cy) continue;
    p.px(x, y, c2 && Math.cos(a) > 0.35 ? c2 : c);
  }
}

// --- KI-Zeitalter: Glastürme mit begrünten Terrassen und Solarfassaden ---
const KI = {
  glas: '#7ec4f0', glasS: '#4a86c8', glasL: '#d4f0ff', glasZ: '#62a6e0', rahmen: '#e8f0f2', akzent: '#5b8cff',
  gruen: '#4fa046', gruenH: '#86cc5c', gruenD: '#2f6e34', solar: '#1f2f6a', solarL: '#4c6ad6', solarG: '#8aa6ff', weiss: '#eef2f4', weissS: '#c2ccd4',
};
function busch(p, x, y) { p.px(x, y, KI.gruen).px(x + 1, y, KI.gruenD).px(x, y - 1, KI.gruenH).px(x + 1, y - 1, KI.gruen); }
function dachgarten(p, x, y, w, h, d) {
  flachdach(p, x, y, w, h, d, KI.gruen, KI.rahmen);
  const t = y - h;
  for (let k = 1; k <= Math.ceil(d / 2); k++) for (let i = 0; i < w; i += 3) p.px(x + k * 2 + i, t - k, KI.gruenH);
  busch(p, x + 2, t - 1);
  if (w > 6) busch(p, x + w - 1, t - 2);
}
function hausSmart(p, s, i, gr, sp) {
  const { x, y, w } = s, d = s.d ?? 4, hoch = s.h ?? 0, v = i % 3;
  if (v === 0) { // Glasturm mit begrünten Balkonen
    const h = 15 + hoch + (gr > 2 ? 4 : 0);
    quader(p, x, y, w, h, d, KI.glas, KI.glasS);
    for (let k = 1; k < d; k += 2) p.rect(x + w + k, y - h + 1 - s2(k), 1, h, '#3f76b4');
    for (let yy = y - h + 4; yy < y - 1; yy += 4) {
      p.rect(x, yy, w, 1, KI.rahmen);
      for (let xx = x; xx < x + w; xx++) if ((xx * 3 + yy) % 4 !== 0) p.px(xx, yy - 1, (xx + yy) % 3 === 0 ? KI.gruenH : KI.gruen);
      p.px(x + ((yy * 5) % Math.max(1, w - 1)), yy + 1, KI.gruenD);
      for (let k = 0; k < d; k++) p.px(x + w + k, yy - 1 - s2(k), k % 2 ? KI.gruenD : KI.gruen);
    }
    p.linie(x + 1, y - h + 4, x + 3, y - h + 2, KI.glasL).linie(x + 1, y - h + 11, x + 2, y - h + 10, KI.glasL);
    p.rect(x, y - 1, w, 2, KI.rahmen); p.rect(x + 2, y - 1, 2, 2, '#24405e');
    if (sp) { p.rect(x, y - h + 1, w, 1, 'S'); for (let k = 0; k < d; k++) p.px(x + w + k, y - h + 1 - s2(k), 'S-'); }
    dachgarten(p, x, y, w, h, d);
    return;
  }
  if (v === 1) { // Block mit Solarfassade (Vorderseite) und weißer Seite
    const h = 11 + hoch + (gr > 2 ? 4 : 0);
    quader(p, x, y, w, h, d, KI.solar, KI.weissS);
    for (let yy = y - h + 1; yy <= y - 3; yy++) for (let xx = x; xx < x + w; xx++) {
      const gx = (xx - x) % 3, gy = (yy - y + h - 1) % 3;
      p.px(xx, yy, gx === 2 || gy === 2 ? KI.solarL : gx === 0 && gy === 0 ? KI.solarG : KI.solar);
    }
    for (let yy = y - h + 3; yy < y - 1; yy += 3) for (let k = 0; k < d - 1; k++) p.px(x + w + k, yy - s2(k), KI.glasS);
    p.rect(x, y - 2, w, 3, KI.weiss); tuer(p, x + Math.floor(w / 2) - 1, y, '#24405e');
    if (sp) p.rect(x, y - 2, w, 1, 'S');
    dachgarten(p, x, y, w, h, d);
    return;
  }
  // Terrassenhaus: unten weiß mit Glasbändern, oben zurückgesetzter Glaskubus
  const h1 = 6 + hoch, h2 = 5 + (gr > 2 ? 3 : 0);
  quader(p, x, y, w, h1, d, KI.weiss, KI.weissS);
  for (let yy = y - h1 + 2; yy < y - 1; yy += 2) { p.rect(x + 1, yy, w - 2, 1, KI.glas); for (let k = 0; k < d - 1; k++) p.px(x + w + k, yy - s2(k), KI.glasS); }
  flachdach(p, x, y, w, h1, d, KI.gruen, KI.rahmen);
  const yo = y - h1 - 1;
  quader(p, x + 3, yo, w - 3, h2, d - 1, KI.glas, KI.glasS);
  for (let yy = yo - h2 + 2; yy <= yo; yy += 2) p.rect(x + 3, yy, w - 3, 1, KI.glasZ);
  p.px(x + 4, yo - h2 + 2, KI.glasL);
  dachgarten(p, x + 3, yo, w - 3, h2, d - 1);
  busch(p, x, y - h1); p.px(x, y - h1 + 1, KI.gruenD).px(x + 1, y - h1 + 2, KI.gruenD);
  tuer(p, x + 1, y, '#24405e');
  if (sp) { p.rect(x, y - h1 + 1, w, 1, 'S'); for (let k = 0; k < d; k++) p.px(x + w + k, y - h1 + 1 - s2(k), 'S-'); }
}
function wzSmart(p, s, gr) {
  const { x, y, w } = s, d = 5, ww = w - 2;
  const h = Math.min(27 + gr * 4, y - 14);
  quader(p, x, y, ww, h, d, KI.glas, KI.glasS);
  for (let yy = y - h + 2; yy < y; yy += 2) p.rect(x, yy, ww, 1, KI.glasZ);
  for (let yy = y - h + 2; yy < y; yy += 3) for (let k = 1; k < d - 1; k += 2) p.px(x + ww + k, yy - s2(k), '#3a6aa8');
  // spiralförmig um den Turm laufende Grünterrassen
  for (let k = 0; k * 8 < h - 6; k++) {
    const yy = y - 3 - k * 8;
    p.linie(x, yy, x + ww - 1, yy - 3, KI.gruen).linie(x, yy - 1, x + ww - 1, yy - 4, KI.gruenH);
    p.px(x + 1, yy + 1, KI.gruenD).px(x + ww - 2, yy - 1, KI.gruenD);
    for (let j = 0; j < d; j++) p.px(x + ww + j, yy - 4 - s2(j), j % 2 ? KI.gruenD : KI.gruen);
  }
  for (let k = 0; k < 3; k++) p.linie(x + 1, y - h + 6 + k * 10, x + 3, y - h + 4 + k * 10, KI.glasL);
  p.rect(x, y - h + 1, ww, 2, 'S'); for (let k = 0; k < d; k++) p.rect(x + ww + k, y - h + 1 - s2(k), 1, 2, 'S-');
  flachdach(p, x, y, ww, h, d, '#5a6a78', KI.rahmen);
  // KI-Kern: leuchtende Kugel mit Ring über dem Dach
  const cx = x + Math.round((ww + d) / 2) - 1, cy = y - h - 7;
  p.rect(cx, cy + 3, 1, 4, '#c8d4e0').rect(cx + 1, cy + 3, 1, 4, '#8a98a8');
  ring(p, cx + 0.5, cy, 6, 1.6, '#c8d8ff', 'hinten');
  p.kreis(cx + 0.5, cy, 3.2, '#3552c8');
  p.kreis(cx, cy - 0.5, 2.4, KI.akzent);
  p.px(cx - 1, cy - 2, '#e0e8ff').px(cx - 2, cy - 1, '#b0c4ff').px(cx - 1, cy - 1, '#a8bcff').px(cx + 1, cy + 1, '#2a3fa0');
  ring(p, cx + 0.5, cy, 6, 1.6, '#e8eeff', 'vorne', '#9ab0f0');
  p.rect(cx, cy - 7, 1, 3, '#a8b4c4'); p.px(cx, cy - 8, KI.akzent);
}

// --- Fusionszeitalter: weiße Kuppeln mit leuchtenden Lichtbändern ---
const FU = { w0: '#ffffff', w1: '#f1efe8', w2: '#d3cfc6', w3: '#a8a49c', band: '#f2a33a', glut: '#ffe2a0', bandD: '#c8741a', fenster: '#6a7890' };
const FUF = [FU.w0, FU.w1, FU.w2, FU.w3];
function hausFusion(p, s, i, gr, sp) {
  const { x, y, w } = s, d = s.d ?? 4, hoch = s.h ?? 0, v = i % 3;
  if (v === 1) { // Kapselturm mit umlaufenden Lichtbändern
    const b = w + 2, h = 15 + hoch + (gr > 2 ? 4 : 0), r = (b - 1) / 2, cx = x + r;
    zylinder(p, x, y, b, h - Math.ceil(r), FUF, false);
    kuppel(p, cx, y - h + Math.ceil(r) + 1, r + 0.4, r, FUF);
    for (let yy = y - h + Math.ceil(r) + 2; yy < y - 1; yy += 4) {
      band(p, x, x + b - 1, yy, FU.band, FU.bandD, FU.glut);
      for (let xx = x + 1; xx < x + b - 1; xx += 2) if (yy + 2 < y) p.px(xx, yy + 2, xx > cx + 1 ? '#4a5568' : FU.fenster);
    }
    p.rect(cx, y - h - 1, 1, 2, FU.w2); p.px(cx, y - h - 2, FU.band);
    tuer(p, Math.round(cx) - 1, y, '#5a4a3a');
    if (sp) band(p, x, x + b - 1, y - 2, 'S', 'S-');
    return;
  }
  if (v === 2) { // Doppelkuppel auf flachem Sockel
    const hb = 3 + Math.min(hoch, 1);
    quader(p, x, y, w, hb, d, FU.w1, FU.w2);
    p.rect(x, y - hb + 1, w, 1, FU.band); for (let k = 0; k < d; k++) p.px(x + w + k, y - hb + 1 - s2(k), FU.bandD);
    for (let xx = x + 1; xx < x + w; xx += 2) p.px(xx, y - 1, FU.fenster);
    const r2 = 3.2 + (gr > 2 ? 0.8 : 0);
    kuppel(p, x + w + d / 2 - 2, y - hb - s2(d) + 1, r2 + 0.5, r2 + 1, FUF);
    kuppel(p, x + 3, y - hb, 3.2, 3.6, FUF);
    band(p, x - 1, x + 7, y - hb - 2, FU.band, FU.bandD, FU.glut);
    band(p, x + w + d / 2 - 2 - r2 - 1, x + w + d / 2 - 2 + r2 + 1, y - hb - s2(d) - 1, FU.band, FU.bandD, FU.glut);
    if (sp) p.rect(x, y, w, 1, 'S');
    return;
  }
  // Kuppelhalle mit Lichtband
  const hb = 4 + hoch + (gr > 2 ? 2 : 0);
  quader(p, x, y, w, hb, d, FU.w1, FU.w2);
  for (let xx = x + 1; xx < x + w - 1; xx += 2) p.rect(xx, y - hb + 3, 1, 2, FU.fenster);
  p.rect(x, y - hb + 1, w, 1, FU.band); for (let k = 0; k < d; k++) p.px(x + w + k, y - hb + 1 - s2(k), FU.bandD);
  for (let xx = x; xx < x + w; xx += 3) p.px(xx, y - hb + 1, FU.glut);
  const cx = x + (w + d) / 2 - 0.5, rx = (w + d) / 2, ry = rx * 0.85 + (gr > 2 ? 1 : 0), by = y - hb - 1;
  kuppel(p, cx, by, rx, ry, FUF);
  band(p, cx - rx - 1, cx + rx + 1, Math.round(by - ry * 0.45), FU.band, FU.bandD, FU.glut);
  p.px(Math.round(cx), Math.round(by - ry) - 1, FU.w2).px(Math.round(cx), Math.round(by - ry) - 2, FU.band);
  tuer(p, x + Math.floor(w / 2), y, '#5a4a3a');
  if (sp) { p.rect(x, y - hb + 2, w, 1, 'S'); for (let k = 0; k < d; k++) p.px(x + w + k, y - hb + 2 - s2(k), 'S-'); }
}
function wzFusion(p, s, gr) {
  const { x, y, w } = s, d = 5;
  const cx = x + (w + d) / 2, rx = (w + d) / 2 + 1.5, ry = 9 + gr * 2;
  // Sockelring
  for (let xx = Math.floor(cx - rx - 1); xx <= Math.ceil(cx + rx + 1); xx++) {
    const t = (xx - cx + rx + 1) / (2 * rx + 2);
    p.rect(xx, y - 3, 1, 4, t < 0.2 ? FU.w0 : t < 0.6 ? FU.w1 : t < 0.85 ? FU.w2 : FU.w3);
  }
  band(p, cx - rx - 1, cx + rx + 1, y - 2, 'S', 'S-');
  for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx += 3) p.px(xx, y, FU.fenster);
  // große Reaktorkuppel mit Meridianen und Äquatorband
  const by = y - 4;
  kuppel(p, cx, by, rx, ry, FUF);
  for (let yy = Math.ceil(by - ry); yy <= by; yy++) {
    const t = (by - yy) / (ry + 0.5), hw = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (const f of [-0.45, 0.45]) { const xx = Math.round(cx + f * hw); if (p.hole(xx, yy)) p.px(xx, yy, f < 0 ? FU.band : FU.bandD); }
  }
  for (const k of [0.3, 0.62]) band(p, cx - rx - 1, cx + rx + 1, Math.round(by - ry * k), FU.band, FU.bandD, FU.glut);
  p.px(Math.round(cx - rx * 0.5), Math.round(by - ry * 0.75), FU.w0).px(Math.round(cx - rx * 0.5) + 1, Math.round(by - ry * 0.8), FU.w0);
  // Spitze mit schwebendem Plasmaring
  const top = Math.round(by - ry), sx = Math.round(cx);
  p.rect(sx, top - 9, 1, 9, FU.w1).rect(sx + 1, top - 9, 1, 9, FU.w3);
  ring(p, sx + 0.5, top - 6, 5, 1.5, FU.bandD, 'hinten');
  p.rect(sx, top - 9, 2, 2, FU.w0);
  ring(p, sx + 0.5, top - 6, 5, 1.5, FU.band, 'vorne', FU.bandD);
  p.px(sx - 4, top - 5, FU.glut).px(sx + 2, top - 4, FU.glut);
  p.rect(sx, top - 12, 1, 3, FU.glut); p.px(sx, top - 13, FU.w0);
}

// --- Weltraumzeitalter: Habitatkuppeln, Raumhafen, Aufzugsmast ---
const OR = {
  m0: '#e0e4ee', m1: '#aab0c2', m2: '#7e8498', m3: '#575c72', m4: '#3a3e52', l: '#8e7cc3', lH: '#d6caff', lD: '#5a4a92',
  g0: '#f0fbff', g1: '#c4e8f4', g2: '#8ec8de', g3: '#5e98b2',
};
const ORF = [OR.m0, OR.m1, OR.m2, OR.m3];
const GLASF = [OR.g0, OR.g1, OR.g2, OR.g3];
function hausOrbital(p, s, i, gr, sp) {
  const { x, y, w } = s, d = s.d ?? 4, hoch = s.h ?? 0, v = i % 3;
  if (v === 0) { // Habitatkuppel mit Grün im Inneren
    const hb = 3 + Math.min(hoch, 2);
    quader(p, x, y, w, hb, d, OR.m1, OR.m2);
    p.rect(x, y - hb + 1, w, 1, OR.m0);
    for (let xx = x + 1; xx < x + w; xx += 2) p.px(xx, y - 1, OR.lH);
    for (let k = 1; k < d; k += 2) p.px(x + w + k, y - 1 - s2(k), OR.l);
    const cx = x + (w + d) / 2 - 0.5, by = y - hb - 1, rx = (w + d) / 2, ry = rx * 0.9 + (gr > 2 ? 1 : 0);
    kuppel(p, cx, by, rx, ry, GLASF);
    const glas = new Set(GLASF);
    for (let yy = Math.round(by - 2); yy <= by; yy++) for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) if (glas.has(p.hole(xx, yy))) p.px(xx, yy, (xx + yy) % 3 ? '#4f9a44' : '#2f6e34');
    p.px(Math.round(cx) - 1, Math.round(by - 3), '#6fbf5a').px(Math.round(cx), Math.round(by - 3), '#4f9a44').px(Math.round(cx) - 1, Math.round(by - 4), '#86cc5c');
    for (const f of [-0.5, 0.5]) for (let yy = Math.ceil(by - ry); yy < by - 2; yy++) {
      const t = (by - yy) / (ry + 0.5), xx = Math.round(cx + f * rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (glas.has(p.hole(xx, yy))) p.px(xx, yy, OR.m1);
    }
    p.px(Math.round(cx), Math.round(by - ry) - 1, OR.m2).px(Math.round(cx), Math.round(by - ry) - 2, OR.lH);
    if (sp) { p.rect(x, y - hb + 2, w, 1, 'S'); for (let k = 0; k < d; k++) p.px(x + w + k, y - hb + 2 - s2(k), 'S-'); }
    return;
  }
  if (v === 1) { // Modulturm aus gestapelten Trommeln mit Antennenschüssel
    const h1 = 6 + hoch, h2 = 5 + (gr > 2 ? 3 : 0), h3 = 4, b = w + 2;
    zylinder(p, x, y, b, h1, ORF);
    zylinder(p, x + 1, y - h1, b - 2, h2, ORF);
    zylinder(p, x + 2, y - h1 - h2, b - 4, h3, GLASF);
    for (const yy of [y - h1 + 1, y - h1 - h2 + 1]) band(p, x, x + b - 1, yy, OR.m3, OR.m4);
    for (let xx = x + 1; xx < x + b - 1; xx += 2) { p.px(xx, y - 3, xx < x + b - 3 ? OR.lH : OR.l); p.px(xx + (xx % 2), y - h1 - 2, OR.l); }
    if (sp) band(p, x, x + b - 1, y - 1, 'S', 'S-');
    // Antennenschüssel
    const ax = x + Math.floor(b / 2), ay = y - h1 - h2 - h3 - 1;
    p.rect(ax, ay - 2, 1, 3, OR.m2);
    p.ellipse(ax + 1, ay - 4, 2.5, 1.2, OR.m0); p.px(ax + 3, ay - 4, OR.m2).px(ax + 2, ay - 3, OR.m2);
    p.linie(ax + 1, ay - 4, ax - 1, ay - 7, OR.m2); p.px(ax - 1, ay - 8, OR.lH);
    return;
  }
  // Startplatz mit Rakete und Startturm
  const hr = 13 + hoch + (gr > 2 ? 3 : 0);
  quader(p, x - 1, y, w + 1, 2, d, OR.m3, OR.m4);
  p.rect(x - 1, y - 1, w + 1, 1, OR.m2);
  for (let xx = x - 1; xx < x + w; xx += 2) p.px(xx, y, '#e8c040');
  // Startturm (Gitter)
  const gx = x;
  p.rect(gx, y - hr - 1, 2, hr, OR.m2);
  for (let yy = y - hr; yy < y - 1; yy += 2) p.px(gx + ((yy >> 1) & 1), yy, OR.m4);
  p.rect(gx - 1, y - hr - 2, 4, 1, OR.m3); p.px(gx + 1, y - hr - 3, '#ff5a4a');
  // Rakete
  const rx = x + 4, rb = 3, top = y - hr;
  for (let yy = top + 2; yy < y - 1; yy++) { p.px(rx, yy, OR.m0).px(rx + 1, yy, '#d8dce6').px(rx + 2, yy, OR.m2); }
  p.px(rx, top + 1, OR.m0).px(rx + 1, top + 1, '#d8dce6').px(rx + 2, top + 1, OR.m2).px(rx + 1, top, OR.m0).px(rx + 1, top - 1, OR.m1);
  p.rect(rx, top + 4, rb, 1, OR.l).px(rx + 2, top + 4, OR.lD);
  p.px(rx + 1, top + 6, '#3a3e52');
  if (sp) { p.rect(rx, top + 8, rb, 2, 'S'); p.px(rx + 2, top + 8, 'S-').px(rx + 2, top + 9, 'S-'); }
  p.px(rx - 1, y - 3, OR.l).px(rx - 1, y - 2, OR.lD).px(rx + 3, y - 3, OR.l).px(rx + 3, y - 2, OR.lD);
  p.linie(gx + 2, top + 5, rx - 1, top + 5, OR.m3).linie(gx + 2, top + 10, rx - 1, top + 10, OR.m3);
  // kleines Kontrollgebäude
  quader(p, x + w - 2, y, 3, 4, 2, OR.m1, OR.m2); p.px(x + w - 1, y - 2, OR.lH);
}
function wzOrbital(p, s, gr) {
  const { x, y, w } = s, d = 5, hb = 6 + gr;
  // Basisstation
  quader(p, x - 1, y, w + 2, hb, d, OR.m1, OR.m2);
  p.rect(x - 1, y - hb + 3, w + 2, 2, OR.lD);
  for (let xx = x; xx < x + w + 1; xx += 2) p.rect(xx, y - hb + 3, 1, 2, xx < x + w - 2 ? OR.lH : OR.l);
  for (let k = 0; k < d; k++) p.rect(x + w + 1 + k, y - hb + 3 - s2(k), 1, 2, k % 2 ? OR.l : OR.lD);
  p.rect(x - 1, y - 1, w + 2, 1, OR.m3); p.rect(x + Math.floor(w / 2) - 1, y - 2, 3, 3, OR.m4);
  p.rect(x - 1, y - hb + 1, w + 2, 1, 'S'); for (let k = 0; k < d; k++) p.px(x + w + 1 + k, y - hb + 1 - s2(k), 'S-');
  flachdach(p, x - 1, y, w + 2, hb, d, OR.m2, OR.m0);
  // Aufzugsmast bis an den oberen Rand (Weg ins All)
  const mx = x + Math.round((w + d) / 2), fuss = y - hb - 2;
  for (let yy = 0; yy <= fuss; yy++) {
    p.px(mx - 1, yy, OR.m0).px(mx, yy, yy % 3 === 0 ? OR.m3 : OR.m1).px(mx + 1, yy, OR.m3);
    if (yy % 7 === 3) p.px(mx, yy, OR.lH);
  }
  // Stützstreben am Fuß
  p.linie(mx - 1, fuss - 7, mx - 5, fuss + 1, OR.m1).linie(mx + 1, fuss - 7, mx + 5, fuss, OR.m3);
  p.rect(mx - 2, fuss - 1, 5, 2, OR.m2);
  // Kletterkapsel
  const ky = Math.round(fuss * 0.42);
  p.rect(mx - 3, ky, 7, 5, OR.m1).rect(mx - 3, ky, 2, 5, OR.m0).rect(mx + 2, ky, 2, 5, OR.m2);
  p.rect(mx - 2, ky - 1, 5, 1, OR.m1).rect(mx - 2, ky + 5, 5, 1, OR.m2);
  p.rect(mx - 2, ky + 2, 5, 1, OR.l).px(mx - 2, ky + 2, OR.lH).px(mx, ky + 2, OR.lH).px(mx + 2, ky + 2, OR.lD);
  p.px(mx, ky - 2, OR.m2);
}

// --- Sternenzeitalter: kristalline Türme, Schwebeplattformen, Schutzfeld ---
const ST = { k0: '#ffffff', k1: '#e6eef7', k2: '#c0d4ee', k3: '#8eaadc', k4: '#5c6eb4', glut: '#9ff0ff', glutH: '#e4fcff', glutD: '#4ab8d8', v: '#c6b4ff' };
/** Kristallsäule mit zwei Facetten und Spitze; cx = Mittelkante, yb = Fuß, b = halbe Breite, h = Schafthöhe.
 *  ton 0 = eisblau, 1 = violett. Leuchtende Mittelnaht und Stockwerkfugen machen sie als Turm lesbar. */
const KRISTALL_TON = [
  { l: '#e6eef7', r: '#94ace0', fl: '#c4d6f0', fr: '#6f86c8', naht: '#9ff0ff' },
  { l: '#ece6fa', r: '#a496dc', fl: '#d2c8f2', fr: '#7c6cbc', naht: '#e0c8ff' },
];
function kristall(p, cx, yb, b, h, sp, ton = 0) {
  const T = KRISTALL_TON[ton];
  const top = yb - h, spitze = top - Math.max(2, Math.round(b * 2.2));
  p.poly([[cx - b, yb], [cx, yb], [cx, spitze], [cx - b, top]], T.l);
  p.poly([[cx + 1, yb], [cx + b + 1, yb], [cx + b + 1, top + Math.round(b)], [cx + 1, spitze]], T.r);
  p.linie(cx, yb, cx, spitze, ST.k0);
  if (b >= 1.5) {
    // Stockwerkfugen
    for (let yy = top + 3; yy < yb - 1; yy += 4) {
      for (let xx = Math.round(cx - b) + 1; xx < cx; xx++) p.px(xx, yy, T.fl);
      for (let xx = cx + 2; xx <= cx + b + 1; xx++) p.px(xx, yy + 1, T.fr);
    }
    // leuchtende Naht auf der Schattenseite
    p.linie(cx + 1, yb - 1, cx + 1, spitze + 2, T.naht);
    for (let yy = top + 1; yy < yb - 1; yy += 4) p.px(cx + 1, yy, ST.glutH);
  } else p.linie(cx + 1, yb - 1, cx + 1, spitze + 2, T.fl);
  p.px(cx, spitze, ST.glutH);
  if (sp) { p.rect(Math.round(cx - b), yb - 2, Math.round(b) + 1, 2, 'S'); p.rect(cx + 1, yb - 2, Math.round(b) + 1, 2, 'S-'); }
}
function funkeln(p, x, y, c = ST.k0) { p.px(x, y, c).px(x - 1, y, ST.glut).px(x + 1, y, ST.glut).px(x, y - 1, ST.glut).px(x, y + 1, ST.glut); }
/** Schwebeplattform (flache Scheibe mit dunkler Unterseite, Leuchtkante und Antriebslicht). */
function scheibe(p, cx, cy, rx) {
  p.ellipse(cx, cy + 1, rx - 1, 1.4, '#3a4888');
  p.ellipse(cx, cy, rx, 1.2, ST.k2);
  p.rect(Math.round(cx - rx) + 1, Math.round(cy) - 1, Math.round(rx * 2) - 1, 1, ST.k1);
  for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) if (p.hole(x, Math.round(cy) + 1)) p.px(x, Math.round(cy) + 1, x % 2 ? ST.glut : ST.glutD);
  p.px(Math.round(cx - rx) + 1, Math.round(cy) - 1, ST.k0);
  p.px(Math.round(cx), Math.round(cy) + 2, ST.glutH).px(Math.round(cx) - 1, Math.round(cy) + 2, '#2a3670').px(Math.round(cx) + 1, Math.round(cy) + 2, '#2a3670');
  p.px(Math.round(cx), Math.round(cy) + 3, ST.glut);
}
function hausStern(p, s, i, gr, sp) {
  const { x, y, w } = s, hoch = s.h ?? 0, v = i % 3, cx = x + Math.floor(w / 2);
  if (v === 0) { // schlanker Kristallturm mit Nebensplitter
    const h = 13 + hoch + (gr > 2 ? 5 : 0);
    kristall(p, cx + 4, y - 1, 1, Math.round(h * 0.45), false, 1);
    kristall(p, cx, y, 2, h, sp);
    return;
  }
  if (v === 1) { // Schwebeplattform mit kleinem Turm und Kuppel
    const cy = y - 6 - Math.min(hoch, 2), r = w / 2 + 1.5;
    kristall(p, cx + 1, cy - 1, 1.5, 7 + (gr > 2 ? 3 : 0), sp, 1);
    kuppel(p, cx - 3, cy - 1, 2.5, 2.5, [ST.k0, ST.k1, ST.k3, ST.k4]);
    p.px(cx - 4, cy - 3, ST.glutH);
    scheibe(p, cx, cy, r);
    return;
  }
  // zwei Kristalle auf facettiertem Sockel
  p.poly([[x - 1, y], [x + w + 1, y], [x + w, y - 2], [x, y - 2]], ST.k4);
  p.rect(x, y - 2, w + 1, 1, ST.k2); for (let xx = x + 1; xx < x + w; xx += 2) p.px(xx, y - 1, ST.glut);
  kristall(p, x + 2, y - 2, 1.5, 6 + hoch, false, 1);
  kristall(p, cx + 1, y - 2, 2, 9 + hoch + (gr > 2 ? 3 : 0), sp);
}
function wzStern(p, s, gr) {
  const { x, y, w } = s, cx = x + Math.floor(w / 2) + 1;
  const sch = schild(gr), dachY = 46 - sch.ry;
  const h = Math.min(28 + gr * 4, y - dachY - 12);
  // Seitentürme
  kristall(p, cx - 5, y - 1, 2, Math.round(h * 0.5), false, 1);
  kristall(p, cx + 6, y, 2, Math.round(h * 0.62), false, 1);
  // schwebender Lichtring (hinten), Hauptturm, Ring (vorne)
  const ry0 = y - Math.round(h * 0.55);
  ring(p, cx + 0.5, ry0, 7, 2, ST.glutD, 'hinten');
  kristall(p, cx, y, 3, h, false);
  p.rect(cx - 3, y - 3, 4, 1, 'S').rect(cx + 1, y - 3, 4, 1, 'S-');
  p.rect(cx - 3, y - h + 3, 4, 1, 'S').rect(cx + 1, y - h + 3, 4, 1, 'S-');
  ring(p, cx + 0.5, ry0, 7, 2, ST.glutH, 'vorne', ST.glut);
  p.px(cx - 7, ry0, ST.glutH);
  // Sockel
  p.poly([[cx - 6, y + 1], [cx + 8, y + 1], [cx + 7, y - 1], [cx - 5, y - 1]], ST.k3);
  p.rect(cx - 5, y - 1, 12, 1, ST.k1);
  funkeln(p, cx, y - h - 8);
}
/** Maße des Schutzfelds über der Sternenstadt. */
function schild(gr) { return { rx: Math.min(31, 20 + gr * 4), ry: 32 + gr * 4 }; }
/** Halbdurchsichtige Kuppel: über Bauten wird nur aufgehellt, im Freien eine leuchtende Linie gezogen. */
function schutzfeld(p, gr) {
  const { rx, ry } = schild(gr), cx = 32, cy = 46;
  const setze = (x, y, c, t) => { x = Math.round(x); y = Math.round(y); const alt = p.hole(x, y); if (alt && alt[0] === '#') p.px(x, y, mische(alt, '#c8f8ff', t)); else if (!alt) p.px(x, y, c); };
  let vx = null, vy = null;
  for (let x = cx - rx; x <= cx + rx; x += 0.25) {
    const t = (x - cx) / rx, yy = cy - ry * Math.sqrt(Math.max(0, 1 - t * t));
    const rxy = [Math.round(x), Math.round(yy)];
    if (vx === rxy[0] && vy === rxy[1]) continue; vx = rxy[0]; vy = rxy[1];
    const oben = t < -0.15 && t > -0.75;
    setze(rxy[0], rxy[1], oben ? '#e8fdff' : '#9ff0ff', 0.55);
    if ((rxy[0] + rxy[1]) % 2 === 0) setze(rxy[0] + (t < 0 ? 1 : -1), rxy[1] + 1, '#4ab8d8', 0.25);
  }
  // Wabenschimmer: wenige helle Punkte auf der Kuppelfläche
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI * (0.18 + 0.64 * ((k * 0.37) % 1)), rr = 0.72 + 0.2 * ((k * 0.61) % 1);
    setze(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, '#bff6ff', 0.3);
  }
  // Emitterring am Boden (vorne)
  const gry = 5 + gr * 1.7 + 3, grx = 14 + gr * 4 + 3;
  for (let x = -grx; x <= grx; x++) { const y = cy + gry * Math.sqrt(Math.max(0, 1 - (x / grx) ** 2)); if (Math.abs(x) % 3 !== 2) setze(cx + x, y, Math.abs(x) % 3 === 0 ? '#e4fcff' : '#6ad8f0', 0.4); }
}

const HAUS_ZUKUNFT = { 7: hausSmart, 8: hausFusion, 9: hausOrbital, 10: hausStern };
const WZ_ZUKUNFT = { 7: wzSmart, 8: wzFusion, 9: wzOrbital, 10: wzStern };

/** Bodengestaltung der Zukunftsstädte (vor den Gebäuden). */
function bodenZukunft(p, z, gr, rx, ry) {
  const B = ZA[z].boden;
  if (z === 7) { // Grünflächen zwischen den Plätzen
    for (let k = 0; k < 4 + gr * 2; k++) {
      const a = k * 2.4 + 0.5, xx = 32 + Math.cos(a) * rx * 0.62, yy = 45.5 + Math.sin(a) * ry * 0.6;
      p.ellipse(xx, yy, 3, 1.4, '#4f9a44'); p.px(xx - 1, yy - 1, '#7cc05a').px(xx + 2, yy, '#3a7a36');
    }
    p.linie(32 - rx + 3, 47, 32 + rx - 3, 45, '#b8c4c0');
  } else if (z === 8) { // leuchtender Ring und Lichtwege
    ring(p, 32, 45.5, rx - 3, ry - 1.8, '#f2a33a', 'ganz', '#d0801e');
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; p.px(32 + Math.cos(a) * (rx - 3), 45.5 + Math.sin(a) * (ry - 1.8), '#ffe2a0'); }
    p.linie(32 - rx + 2, 46, 32 + rx - 2, 45, B[0]);
  } else if (z === 9) { // Stahlplatten mit Landelichtern
    for (let yy = Math.ceil(45.5 - ry + 1); yy < 45.5 + ry; yy += 3) for (let xx = 32 - rx; xx <= 32 + rx; xx++) if (p.hole(xx, yy) === B[1] || p.hole(xx, yy) === B[0]) p.px(xx, yy, B[2]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; p.px(32 + Math.cos(a) * (rx - 1), 45.5 + Math.sin(a) * (ry - 0.6), k % 2 ? '#d6caff' : '#8e7cc3'); }
  } else { // polierter Nachtboden mit Lichtadern
    ring(p, 32, 45.5, rx - 4, ry - 2.2, '#4ab8d8');
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; p.linie(32 + Math.cos(a) * 4, 45.5 + Math.sin(a) * 1.5, 32 + Math.cos(a) * (rx - 2), 45.5 + Math.sin(a) * (ry - 1), '#3e7aa8'); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; p.px(32 + Math.cos(a) * (rx - 4), 45.5 + Math.sin(a) * (ry - 2.2), '#9ff0ff'); }
  }
}
/** Drohne (7x3) mit Rotoren und blauem Licht. */
function drohne(q, x, y) {
  q.px(x - 3, y, '#dfe8f0').px(x - 2, y, '#dfe8f0').px(x + 2, y, '#dfe8f0').px(x + 3, y, '#dfe8f0');
  q.rect(x - 2, y + 1, 5, 1, '#3a4458'); q.px(x, y + 1, '#5a6a80').px(x - 1, y, '#3a4458').px(x + 1, y, '#3a4458').px(x, y, '#3a4458');
  q.px(x, y + 2, KI.akzent);
}
/** Satellit mit Solarflügeln. */
function satellit(q, x, y) {
  q.rect(x - 4, y - 1, 3, 3, '#2a3f9a').rect(x + 2, y - 1, 3, 3, '#2a3f9a');
  q.px(x - 4, y - 1, '#6a8ae8').px(x - 3, y - 1, '#4c6ad6').px(x + 2, y - 1, '#6a8ae8').px(x + 3, y - 1, '#4c6ad6').px(x - 3, y, '#4c6ad6').px(x + 3, y, '#4c6ad6');
  q.px(x - 1, y, '#9aa0b0').px(x + 1, y, '#9aa0b0');
  q.rect(x, y - 1, 1, 3, '#e0b040'); q.px(x, y - 1, '#ffe080');
  q.px(x, y - 2, OR.m1).px(x, y - 3, OR.lH);
}
/** Zusätze über den Gebäuden: Drohnen, Satelliten, Schwebeplattform, Schutzfeld. */
function himmelZukunft(p, z, gr) {
  if (z === 7) {
    const pos = [[10, 16], [52, 12], [44, 26], [18, 6]].slice(0, gr + 1);
    for (const [x, y] of pos) teil(p, (q) => drohne(q, x, y));
  } else if (z === 9) {
    const pos = [[9, 8], [52, 15], [48, 4]].slice(0, gr);
    for (const [x, y] of pos) teil(p, (q) => satellit(q, x, y));
  } else if (z === 10) {
    if (gr >= 2) teil(p, (q) => { scheibe(q, 50, 20 - gr, 5); kristall(q, 50, 19 - gr, 1, 4, false, 1); kuppel(q, 47, 19 - gr, 1.5, 1.5, [ST.k0, ST.k1, ST.k3, ST.k4]); });
    if (gr >= 3) teil(p, (q) => { scheibe(q, 11, 24, 4); kristall(q, 12, 23, 1, 3); });
    schutzfeld(p, gr);
  }
}

function kuehlturm(p, x, y, h) {
  for (let j = 0; j < h; j++) {
    const t = j / h, hw = Math.round(4.5 - Math.sin(t * Math.PI * 0.85) * 1.6 + t * 0.6);
    for (let i = -hw; i <= hw; i++) p.px(x + i, y - j, i < -hw / 3 ? '#d4d8da' : i > hw / 3 ? '#8e9294' : '#b4b8ba');
  }
  p.rect(x - 3, y - h, 7, 1, '#6a6e70');
  p.rect(x - 4, y - 2, 9, 1, 'S');
}

// Plätze je Größe (von hinten nach vorne). lm = Wahrzeichen.
const PLAETZE = {
  1: [{ x: 21, y: 44, w: 9, lm: true }, { x: 36, y: 46, w: 8, rund: true }, { x: 13, y: 50, w: 8, rund: true, sp: true }, { x: 28, y: 52, w: 8 }],
  2: [{ x: 13, y: 41, w: 8, h: 1 }, { x: 25, y: 40, w: 11, lm: true }, { x: 43, y: 42, w: 7, rund: true }, { x: 8, y: 47, w: 8, rund: true, sp: true }, { x: 38, y: 48, w: 9, h: 1 }, { x: 18, y: 51, w: 8, sp: true }, { x: 29, y: 53, w: 8 }],
  3: [{ x: 17, y: 37, w: 7, h: 3 }, { x: 26, y: 37, w: 11, lm: true }, { x: 41, y: 38, w: 7, h: 4 }, { x: 8, y: 43, w: 8, h: 2, rund: true }, { x: 18, y: 44, w: 8, h: 4 }, { x: 39, y: 44, w: 8, h: 2, sp: true }, { x: 49, y: 46, w: 7, rund: true }, { x: 10, y: 50, w: 8, h: 1, sp: true }, { x: 23, y: 52, w: 9, h: 2 }, { x: 36, y: 51, w: 8, h: 1, rund: true }],
};

definiere('stadt', 'stadt', {
  w: 64, h: 56, zeitalterVarianten: true, groessen: 3, umriss: false,
  zeichne(p, o) {
    const z = Math.max(0, Math.min(10, o.zeitalter)), gr = Math.max(1, Math.min(3, o.groesse));
    const B = ZA[z].boden;
    // Boden
    const rx = 14 + gr * 4, ry = 5 + gr * 1.7;
    p.ellipse(32, 46, rx + 1, ry + 1, B[2]);
    p.ellipse(32, 45.5, rx, ry, B[0]);
    p.ellipse(31, 45, rx - 3, ry - 2, B[1]);
    for (let i = 0; i < 30; i++) { const xx = 32 + Math.round(Math.sin(i * 2.3) * rx * 0.8), yy = 45 + Math.round(Math.cos(i * 1.7) * ry * 0.7); p.px(xx, yy, B[2]); }
    if (z >= 4 && z <= 6) { p.linie(32 - rx + 3, 47, 32 + rx - 3, 45, B[2]); p.linie(31, 45 - ry + 2, 34, 45 + ry - 1, B[2]); }
    if (z >= 7) bodenZukunft(p, z, gr, rx, ry);
    const plaetze = PLAETZE[gr].slice();
    let n = 0;
    for (const s of plaetze) {
      const pl = { ...s };
      if (z === 6 && gr === 3 && !s.lm && n === 6) { teil(p, (q) => kuehlturm(q, s.x + 4, s.y, 13)); rauch(p, s.x + 4, s.y - 15, 3); n++; continue; }
      if (z === 6 && gr === 2 && n === 2) { teil(p, (q) => kuehlturm(q, s.x + 4, s.y, 11)); rauch(p, s.x + 4, s.y - 13, 2); n++; continue; }
      if (z >= 1 && pl.rund) pl.rund = false;
      if (z === 10 && !s.lm && n % 3 === 1) { p.ellipse(s.x + Math.floor(s.w / 2), s.y, s.w / 2, 1, B[2]); p.px(s.x + Math.floor(s.w / 2), s.y - 1, '#4ab8d8'); }
      teil(p, (q) => (s.lm ? wahrzeichen(q, pl, z, gr) : haus(q, pl, z, n, gr, !!s.sp)));
      if (z === 4 && s.lm) { const top = s.y - 7 - gr - 12 - gr * 2; const nr = gr > 2 ? 2 : 3; if (gr > 1) { rauch(p, s.x + 4, top - 2, nr, 1); rauch(p, s.x + s.w + 1, top - 4, nr); } else rauch(p, s.x + s.w, top - 2, nr); }
      if (z === 0 && s.lm) teil(p, (q) => { const fx = s.x + s.w + 3, fy = s.y + 4; q.px(fx - 1, fy, '#7a756c').px(fx + 2, fy, '#7a756c'); q.px(fx, fy, '#f39c12').px(fx + 1, fy, '#e8501a').px(fx, fy - 1, '#ffd040').px(fx + 1, fy - 2, '#f39c12'); });
      n++;
    }
    if (gr === 1 && z >= 1) teil(p, (q) => fahne(q, 46, 50, 12, 5));
    if (z >= 7) himmelZukunft(p, z, gr);
  },
});

// ---------- Stadtmauer (Überlagerung vorne) ----------
const MR = { cx: 32, cy: 45, rx: 26, ry: 9.5 };
const basisY = (x) => { const t = (x - MR.cx) / MR.rx; return MR.cy + MR.ry * Math.sqrt(Math.max(0, 1 - t * t)); };
function turm(p, x, y, w, h, T, zinnen = true) {
  const hw = Math.floor(w / 2);
  for (let i = -hw; i <= hw; i++) p.rect(x + i, y - h + 1, 1, h, i < -hw / 3 ? T[0] : i > hw / 3 ? T[2] : T[1]);
  p.rect(x - hw, y - h, w, 1, T[0]);
  if (zinnen) for (let i = -hw; i <= hw; i += 2) p.px(x + i, y - h - 1, i > 0 ? T[1] : T[0]);
}
const x0Mauer = () => MR.cx - MR.rx + 1, x1Mauer = () => MR.cx + MR.rx - 1;
/** Stufe 5 (für spätere Schutzwälle): Emittermasten mit leuchtendem Energiezaun dazwischen. */
function energiemauer(p, x0, x1) {
  // Sockelband
  teil(p, (q) => {
    for (let x = x0; x <= x1; x++) { const yb = Math.round(basisY(x)); q.rect(x, yb - 1, 1, 2, x < MR.cx ? '#8a94b0' : '#6a7290'); q.px(x, yb - 2, '#c8d0e4'); }
  });
  // Energiefeld (ohne Umriss, damit es leicht wirkt): zwei Leuchtlinien mit Flimmern dazwischen
  for (let x = x0 + 1; x < x1; x++) {
    const yb = Math.round(basisY(x));
    p.px(x, yb - 6, x % 4 === 0 ? '#e4fcff' : '#9ff0ff');
    p.px(x, yb - 3, '#6ad8f0');
    if (x % 3 === 0) p.px(x, yb - 4 - (x % 2), '#bff6ff');
  }
  // Emittermasten
  for (const mx of [x0 + 2, MR.cx - 9, MR.cx + 9, x1 - 2]) teil(p, (q) => {
    const yb = Math.round(basisY(mx));
    q.rect(mx - 1, yb - 7, 3, 8, '#c8d0e4').rect(mx + 1, yb - 7, 1, 8, '#7a84a4').rect(mx - 1, yb - 7, 1, 8, '#eef2fa');
    q.rect(mx - 1, yb - 3, 3, 1, 'S');
    q.rect(mx - 1, yb - 9, 3, 2, '#9ff0ff').px(mx, yb - 10, '#e4fcff').px(mx - 1, yb - 9, '#e4fcff');
  });
}
definiere('stadt', 'mauer', {
  w: 64, h: 56, zeitalterVarianten: true, umriss: false,
  zeichne(p, o) {
    const st = Math.max(0, Math.min(4, o.zeitalter));
    if (st === 4) { energiemauer(p, x0Mauer(), x1Mauer()); return; }
    const x0 = MR.cx - MR.rx + 1, x1 = MR.cx + MR.rx - 1;
    if (st === 0) { // Holzpalisade
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 7 + ((x * 5) % 3 === 0 ? 1 : 0);
          const links = x < MR.cx;
          const c = x % 2 ? (links ? '#a8743c' : '#8a5a2b') : (links ? '#8a5a2b' : '#6a4420');
          q.rect(x, yb - h + 1, 1, h, c);
          q.px(x, yb - h, x % 2 ? '#c8a070' : '#6a4420');
          q.px(x, yb - 3, '#4a3018');
        }
        // Tor
        q.rect(MR.cx - 3, 47, 7, 8, '#3a2414'); q.rect(MR.cx - 3, 47, 7, 1, '#6a4420');
        for (let k = -3; k <= 3; k += 2) q.rect(MR.cx + k, 48, 1, 7, '#5a3a1e');
        // Wachtürme
        for (const tx of [x0 + 1, x1 - 1, MR.cx - 5, MR.cx + 5]) {
          const yb = Math.round(basisY(tx));
          q.rect(tx - 1, yb - 12, 3, 13, '#6a4420'); q.rect(tx - 1, yb - 12, 1, 13, '#8a5a2b');
          q.rect(tx - 3, yb - 13, 7, 2, '#a8743c'); q.rect(tx - 3, yb - 12, 7, 1, '#6a4420');
          q.poly([[tx - 4, yb - 14], [tx, yb - 18], [tx + 4, yb - 14]], '#d2ae5a'); q.linie(tx, yb - 18, tx + 4, yb - 14, '#a8843a');
        }
      });
      return;
    }
    if (st === 1) { // Steinmauer mit Zinnen
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 7, links = x < MR.cx - 6;
          const base = links ? '#b4ac9c' : x > MR.cx + 6 ? '#8a8476' : '#a09a8c';
          q.rect(x, yb - h + 1, 1, h, base);
          for (let yy = yb - h + 2; yy <= yb; yy += 2) if ((x + (yy >> 1)) % 3 === 0) q.px(x, yy, dunkel(base, 0.15));
          q.px(x, yb - h, hell(base, 0.25));
          if (x % 2 === 0) q.px(x, yb - h - 1, hell(base, 0.1));
        }
        for (const tx of [x0 + 2, MR.cx - 6, MR.cx + 6, x1 - 2]) { const yb = Math.round(basisY(tx)); turm(q, tx, yb, 7, 13, ['#c4bcac', '#a8a092', '#7e786c']); q.rect(tx, yb - 9, 1, 2, '#2a2a30'); }
        q.rect(MR.cx - 2, 49, 5, 6, '#2a2018'); q.px(MR.cx - 2, 49, '#a09a8c').px(MR.cx + 2, 49, '#a09a8c');
        q.rect(MR.cx - 2, 50, 5, 1, '#5a5048');
        fahne(q, MR.cx - 6, Math.round(basisY(MR.cx - 6)) - 14, 4, 4);
      });
      return;
    }
    if (st === 2) { // Festungsmauer mit Bastionen
      teil(p, (q) => {
        for (let x = x0; x <= x1; x++) {
          const yb = Math.round(basisY(x)), h = 6;
          const base = x < MR.cx ? '#9a8e78' : '#766c5c';
          for (let j = 0; j < h; j++) q.px(x, yb - j, j < 2 ? dunkel(base, 0.1) : base);
          q.px(x, yb - h + 1, hell(base, 0.2)); q.px(x, yb - h, '#6a8a40'); q.px(x, yb - h - 1, (x % 4 === 0) ? '#5a7a34' : null);
          if (x % 6 === 0) q.px(x, yb - 4, '#3a3630');
        }
      });
      for (const bx of [x0 + 5, MR.cx, x1 - 5]) teil(p, (q) => {
        {
          const yb = Math.round(basisY(bx)) + 1;
          q.poly([[bx - 6, yb - 7], [bx, yb - 4], [bx, yb + 1], [bx - 6, yb - 2]], '#aaa290');
          q.poly([[bx, yb - 4], [bx + 6, yb - 7], [bx + 6, yb - 2], [bx, yb + 1]], '#82796a');
          q.poly([[bx - 6, yb - 7], [bx, yb - 4], [bx + 6, yb - 7], [bx, yb - 10]], '#c4bca8');
          q.linie(bx - 6, yb - 7, bx, yb - 10, '#d8d0bc').linie(bx, yb - 4, bx, yb + 1, '#948c7c');
          q.rect(bx - 1, yb - 8, 3, 1, '#2a2a2a').px(bx + 2, yb - 7, '#4a4a4a').px(bx - 1, yb - 7, '#4a4a4a');
          q.px(bx - 3, yb - 3, '#3a3630').px(bx + 3, yb - 3, '#3a3630');
        }
      });
      teil(p, (q) => {
        fahne(q, MR.cx + 4, Math.round(basisY(MR.cx)) - 7, 7, 5);
      });
      return;
    }
    // Betonbunker mit Stacheldraht
    teil(p, (q) => {
      for (let x = x0; x <= x1; x++) {
        const yb = Math.round(basisY(x)), h = 5, base = x < MR.cx ? '#a8acae' : '#86898c';
        q.rect(x, yb - h + 1, 1, h, base); q.px(x, yb - h, hell(base, 0.25));
        if (x % 8 === 0) q.rect(x, yb - h + 1, 1, h, dunkel(base, 0.2));
      }
    });
    for (const bx of [x0 + 6, MR.cx, x1 - 6]) teil(p, (q) => {
      {
        const yb = Math.round(basisY(bx)) + 1;
        kuppel(q, bx, yb, 5, 5, ['#c4c8ca', '#a8acae', '#86898c', '#6a6e70']);
        q.rect(bx - 3, yb - 3, 6, 1, '#1e2022'); q.px(bx + 3, yb - 3, '#3a3e40');
        q.rect(bx - 5, yb - 1, 11, 2, '#7d8183');
      }
    });
    teil(p, (q) => {
      for (const sx of [x0 + 12, x1 - 12]) { const yb = Math.round(basisY(sx)); for (let k = 0; k < 5; k++) { q.rect(sx - 3 + k * 1.5, yb + 1 - (k % 2), 2, 1, k % 2 ? '#a89a6a' : '#8a7c52'); } }
    });
    // Stacheldraht (ohne Umriss)
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      const yb = Math.round(basisY(x)) - 6;
      if (p.hole(x, yb + 1) && !['#c4c8ca', '#a8acae'].includes(p.hole(x, yb))) {
        p.px(x, yb - (x % 3 === 0 ? 1 : 0), '#4a4e52');
        if (x % 3 === 0) p.px(x, yb - 2, '#6a6e72').px(x - 1, yb - 1, '#6a6e72');
      }
      if (x % 7 === 0) p.rect(x, yb - 1, 1, 2, '#3a3e42');
    }
  },
});

// ---------- Stadtstaat ----------
definiere('stadt', 'stadtstaat', {
  w: 64, h: 56, umriss: false,
  zeichne(p) {
    const B = ['#a89a7a', '#b8aa8a', '#948668'];
    p.ellipse(32, 46, 19, 8, B[2]); p.ellipse(32, 45.5, 18, 7, B[0]); p.ellipse(31, 45, 15, 5, B[1]);
    // Turm hinten Mitte
    teil(p, (q) => {
      const tx = 28, ty = 42, th = 19;
      quader(q, tx, ty, 7, th, 3, '#e8e2d4', '#b8b0a0');
      for (let yy = ty - th + 3; yy <= ty; yy += 3) q.rect(tx, yy, 7, 1, '#d4ccbc');
      q.rect(tx + 3, ty - th + 4, 1, 3, '#2a2a3a').rect(tx + 3, ty - th + 12, 1, 3, '#2a2a3a').rect(tx + 3, ty - 3, 1, 3, '#3a2414');
      q.rect(tx - 1, ty - th - 1, 9, 2, '#d4ccbc');
      for (let k = -1; k < 8; k += 2) q.px(tx + k, ty - th - 2, '#e8e2d4');
      q.rect(tx, ty - th - 4, 1, 2, '#e8e2d4').rect(tx + 6, ty - th - 4, 1, 2, '#e8e2d4');
      zeltdach(q, tx, ty - th - 2, 7, 3, 3, 8, toene('#c8a040'));
      // große Fahne
      const fx = tx + 4, fy = ty - th - 12;
      q.rect(fx, fy - 9, 1, 10, '#4a3a2a'); q.px(fx, fy - 10, PAL.gold);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) { const wy = fy - 9 + j + (i % 4 >= 2 ? 1 : 0); q.px(fx + 1 + i, wy, j === 0 ? 'S+' : j === 5 ? 'S-' : 'S'); }
      for (let i = 0; i < 10; i += 2) q.px(fx + 1 + i, fy - 9 + 3 + (i % 4 >= 2 ? 1 : 0), 'S-');
      q.px(fx + 5, fy - 6, PAL.gold).px(fx + 4, fy - 5, PAL.gold).px(fx + 6, fy - 5, PAL.gold).px(fx + 5, fy - 4, PAL.gold);
    });
    const H = [{ x: 15, y: 44, w: 8 }, { x: 40, y: 45, w: 8 }, { x: 21, y: 51, w: 8 }, { x: 34, y: 52, w: 7 }];
    H.forEach((s, i) => teil(p, (q) => {
      const h = 6, d = 4, wand = ['#e8dcc0', '#e4ccb0', '#dcd8c0', '#ece0c4'][i];
      quader(q, s.x, s.y, s.w, h, d, wand, dunkel(wand, 0.22));
      fenster(q, s.x, s.y, s.w, h, d, '#4a3a3a', '#3a2a2a', { dx: 2, oben: 1 });
      tuer(q, s.x + 1, s.y, '#5a3a2a');
      satteldach(q, s.x, s.y, s.w, h, d, 3, toene(i === 1 ? 'S' : '#b5523b'), dunkel(wand, 0.22));
    }));
  },
});

// ---------- Hauptstadt-Markierung ----------
definiere('stadt', 'kapitol', {
  w: 16, h: 16,
  zeichne(p) {
    p.karte(1, 2, [
      '......w.......',
      '.....wGw......',
      '......G.......',
      '.g...gGg...g..',
      '.Gg..GGG..gG..',
      '.GGg.GGG.gGG..',
      '.GGGgGRGgGGG..',
      '.GGGGGGGGGGd..',
      '.GGGGGGGGGGd..',
      '.hhhhhhhhhhd..',
      '.GbGGRGGbGGd..',
      '.ddddddddddd..',
    ], { w: '#ffffff', G: '#f1c40f', g: '#ffe680', d: '#b8930a', h: '#ffe680', R: '#e0302a', b: '#3a7ad8' });
    p.schiebe(1, 0);
  },
});
