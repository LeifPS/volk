// Wege im Pixelstil: weiche Kurven durch die Felder, pixelgenau gezeichnet (1 Pixel = 1 Weltpixel, ohne Glättung).
// Jedes Feld mit Weg verbindet sich über die Kantenmitten mit seinen Nachbarn (Weg oder Stadt). Zwei Anschlüsse ergeben
// eine Kurve (quadratische Bézierkurve mit dem Feldmittelpunkt als Kontrollpunkt), mehr Anschlüsse eine Kreuzung.
// An den Kantenmitten stehen beide Hälften senkrecht auf der Kante, deshalb sind die Übergänge knickfrei.
// Gezeichnet wird je Gelände-Chunk in eine Offscreen-Ebene, die nur neu entsteht, wenn sich die Wege dort ändern.
import { BREITE, HOEHE, idx, nachbar, feldMitte } from '../../shared/hex.js';
import { hash01 } from '../../shared/zufall.js';
import { R, FELD_B, ZEILE_H, CHUNK_GROESSE } from './gelaende.js';
import { Z, erkundet, an } from '../kern/zustand.js';

const C = CHUNK_GROESSE;
const SCHRITT = 0.5;

// Aussehen je Wegart (Farben als [r, g, b]); breite = Gesamtbreite des Belags in Pixeln.
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const ART = {
  pfad: { breite: 3, rand: null, koerper: hex('#bf9f68'), dunkel: hex('#8f6c3c'), hell: hex('#d6bb84'), fleck: hex('#7d5f33') },
  strasse: { breite: 4, rand: hex('#5f594f'), koerper: hex('#a39b8c'), dunkel: hex('#8a8275'), hell: hex('#bdb5a5') },
  pflasterstrasse: { breite: 5, rand: hex('#4f4c47'), koerper: hex('#9b978e'), dunkel: hex('#76736c'), hell: hex('#aeaaa1') },
  eisenbahn: { breite: 6, rand: hex('#3c3128'), koerper: hex('#85796a'), dunkel: hex('#6d6256'), hell: hex('#9a8e7e'), schwelle: hex('#4a3a2a'), schiene: hex('#d2d8df') },
  autobahn: { breite: 8, rand: hex('#1d1f23'), koerper: hex('#3b3e44'), dunkel: hex('#32353a'), hell: hex('#464a51'), linie: hex('#dcdde2'), mitte: hex('#e8d36a') },
};

let version = 0;
const cache = new Map();   // "cx,cy" -> { version, sig, canvas, leer }
let startet = false;
function starten() {
  if (startet) return; startet = true;
  an('aenderung', (d) => { const g = d?.gruppen; if (!g || d.voll || g.has('felder') || g.has('nebel') || g.has('staedte')) version++; });
}

function staedtefelder() {
  const s = new Set();
  for (const st of Object.values(Z.ansicht?.staedte || {})) s.add(st.feld);
  return s;
}

/** Felder, deren Wege den Chunk berühren können (Rand um ein Feld erweitert). */
function felderImChunk(cx, cy) {
  const x0 = cx * C - FELD_B, x1 = (cx + 1) * C + FELD_B, y0 = cy * C - ZEILE_H * 1.5, y1 = (cy + 1) * C + ZEILE_H * 1.5;
  const z0 = Math.max(0, Math.floor(y0 / ZEILE_H) - 1), z1 = Math.min(HOEHE - 1, Math.ceil(y1 / ZEILE_H) + 1);
  const s0 = Math.max(0, Math.floor(x0 / FELD_B) - 1), s1 = Math.min(BREITE - 1, Math.ceil(x1 / FELD_B) + 1);
  const l = [];
  for (let z = z0; z <= z1; z++) for (let sp = s0; sp <= s1; sp++) {
    const i = idx(sp, z);
    const f = Z.ansicht.felder[i];
    if (f && f.w && erkundet(i)) l.push(i);
  }
  return l;
}

/** Anschlüsse eines Wegfeldes: nur die Richtungen, in denen der Weg wirklich weiterführt (Bitmaske wk vom Server). */
let wkVersion = -1, wkDa = false;
/** Kennt der Server die Verbindungsdaten (wk)? Sonst (älterer Serverstand) verbinden sich benachbarte Wege wie früher. */
function serverHatWk() {
  if (wkVersion !== version) { wkVersion = version; wkDa = Object.values(Z.ansicht?.felder || {}).some((f) => f.w && f.wk); }
  return wkDa;
}
function anschluesse(i, staedte) {
  const f = Z.ansicht.felder[i];
  const alle = !serverHatWk();
  const wk = f?.wk || 0;
  const l = [];
  for (let r = 0; r < 6; r++) {
    if (!alle && !((wk >> r) & 1)) continue;
    if (alle) { const n = nachbar(i, r); if (n < 0 || !(Z.ansicht.felder[n]?.w || staedte.has(n))) continue; }
    const n = nachbar(i, r); if (n < 0) continue;
    l.push({ n, r, stadt: staedte.has(n) });
  }
  return l;
}

const kreisAbstand = (a, b) => { const d = Math.abs(a - b) % 6; return Math.min(d, 6 - d); };

/**
 * Wegstücke eines Feldes: Liste von { art, pkte: [Anfang, Kontrollpunkt, Ende] } (quadratische Kurven).
 * Zwei Anschlüsse: Kurve durch das Feld. Gegenüberliegende Anschlüsse: gerade durchgehende Straße (Kreuz bleibt ein Kreuz).
 * Alle übrigen Anschlüsse (Abzweigungen) münden in einem weichen Bogen in den nächsten durchgehenden Arm.
 */
function stuecke(i, f, staedte) {
  const [mx, my] = feldMitte(i, R);
  const m = [mx, my];
  const an_ = anschluesse(i, staedte);
  const art = ART[f.w] ? f.w : 'pfad';
  const P = new Map();
  for (const a of an_) {
    const [nx, ny] = feldMitte(a.n, R);
    P.set(a.r, a.stadt ? [mx + (nx - mx) * 0.72, my + (ny - my) * 0.72] : [(mx + nx) / 2, (my + ny) / 2]);
  }
  const rs = [...P.keys()];
  if (rs.length === 0) return [{ art, pkte: [m, m, m] }];
  if (rs.length === 1) { const p = P.get(rs[0]); return [{ art, pkte: [p, [(p[0] + mx) / 2, (p[1] + my) / 2], m] }]; }
  if (rs.length === 2) return [{ art, pkte: [P.get(rs[0]), m, P.get(rs[1])] }];
  const out = [];
  const arme = new Set();
  for (let r = 0; r < 3; r++) if (P.has(r) && P.has(r + 3)) { out.push({ art, pkte: [P.get(r), m, P.get(r + 3)] }); arme.add(r); arme.add(r + 3); }
  if (!arme.size) {   // keine gerade Fortsetzung (z. B. Y): die beiden am weitesten auseinanderliegenden Anschlüsse bilden die Hauptkurve
    let best = [rs[0], rs[1]], bd = -1;
    for (let x = 0; x < rs.length; x++) for (let y = x + 1; y < rs.length; y++) { const d = kreisAbstand(rs[x], rs[y]); if (d > bd) { bd = d; best = [rs[x], rs[y]]; } }
    out.push({ art, pkte: [P.get(best[0]), m, P.get(best[1])] }); arme.add(best[0]); arme.add(best[1]);
  }
  for (const r of rs) {
    if (arme.has(r)) continue;
    let ziel = null, zd = 9;
    for (const a of arme) { const d = kreisAbstand(r, a); if (d < zd) { zd = d; ziel = a; } }
    const p = P.get(r), q = P.get(ziel);
    const t = 0.62;
    out.push({ art, pkte: [p, m, [mx + (q[0] - mx) * t, my + (q[1] - my) * t]] });   // Bogen, der tangential in den Arm einläuft
  }
  return out;
}

/** Abtastpunkte einer quadratischen Kurve: [x, y, Bogenlänge, Normale x, Normale y]. */
function abtasten(p) {
  const [a, b, c] = p;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]);
  const n = Math.max(1, Math.ceil(len / SCHRITT));
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], y = u * u * a[1] + 2 * u * t * b[1] + t * t * c[1];
    const dx = 2 * u * (b[0] - a[0]) + 2 * t * (c[0] - b[0]), dy = 2 * u * (b[1] - a[1]) + 2 * t * (c[1] - b[1]);
    const dl = Math.hypot(dx, dy) || 1;
    out.push([x, y, t * len, -dy / dl, dx / dl]);
  }
  return out;
}

function baueChunk(cx, cy, liste, staedte) {
  const canvas = document.createElement('canvas');
  canvas.width = C; canvas.height = C;
  const ctx = canvas.getContext('2d');
  const bild = ctx.createImageData(C, C);
  const d = bild.data;
  const ox = cx * C, oy = cy * C;
  let benutzt = false;
  const setze = (x, y, col) => {
    if (x < 0 || y < 0 || x >= C || y >= C) return;
    const o = (y * C + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; benutzt = true;
  };
  /** Gefüllter Kreis (Pixelmitte-Test) mit Farbfunktion: farbe(weltX, weltY) -> Farbe | null. */
  const stempel = (px, py, r, farbe) => {
    const lx = px - ox, ly = py - oy;
    for (let y = Math.floor(ly - r); y <= Math.ceil(ly + r); y++) for (let x = Math.floor(lx - r); x <= Math.ceil(lx + r); x++) {
      const dx = x + 0.5 - lx, dy = y + 0.5 - ly;
      if (dx * dx + dy * dy > r * r) continue;
      const col = typeof farbe === 'function' ? farbe(x + ox, y + oy, dx, dy) : farbe;
      if (col) setze(x, y, col);
    }
  };
  const alle = [];
  for (const i of liste) for (const st of stuecke(i, Z.ansicht.felder[i], staedte)) alle.push({ art: st.art, pts: abtasten(st.pkte), feld: i });
  const sauber = (x, y) => hash01(x, y, 7);

  // 1) Rand / Kontur
  for (const w of alle) { const A = ART[w.art]; if (!A.rand) continue; for (const p of w.pts) stempel(p[0], p[1], A.breite / 2 + 1, A.rand); }
  // 2) Belag mit Körnung
  for (const w of alle) {
    const A = ART[w.art], r = A.breite / 2;
    for (const p of w.pts) stempel(p[0], p[1], r, (x, y, dx, dy) => {
      const h = sauber(x, y);
      if (w.art === 'pfad') {
        const rand = dx * dx + dy * dy > (r - 0.9) * (r - 0.9);
        if (rand) return h < 0.5 ? A.dunkel : h > 0.9 ? null : A.koerper;     // ausgefranster Rand
        return h < 0.10 ? A.fleck : h > 0.9 ? A.hell : A.koerper;
      }
      if (w.art === 'pflasterstrasse') {
        const fuge = (y % 3 === 0) || (((x + (((y / 3) | 0) % 2) * 1) % 3) === 0);
        return fuge ? A.dunkel : h > 0.55 ? A.hell : A.koerper;
      }
      return h < 0.16 ? A.dunkel : h > 0.9 ? A.hell : A.koerper;
    });
  }
  // 3) Einzelheiten je Art
  for (const w of alle) {
    const A = ART[w.art];
    if (w.art === 'eisenbahn') {
      let letzte = -99;
      for (const p of w.pts) {
        if (p[2] - letzte >= 3.5) { letzte = p[2]; for (let o = -2.6; o <= 2.6; o += 0.5) stempel(p[0] + p[3] * o, p[1] + p[4] * o, 0.55, A.schwelle); }
      }
      for (const p of w.pts) for (const o of [-1.7, 1.7]) stempel(p[0] + p[3] * o, p[1] + p[4] * o, 0.55, A.schiene);
    } else if (w.art === 'autobahn') {
      for (const p of w.pts) {
        for (const o of [-3.1, 3.1]) stempel(p[0] + p[3] * o, p[1] + p[4] * o, 0.5, A.linie);
        if (Math.floor(p[2] / 4) % 2 === 0) stempel(p[0], p[1], 0.55, A.mitte);
      }
    }
  }
  ctx.putImageData(bild, 0, 0);
  return { canvas, leer: !benutzt };
}

/** Zeichnet alle Wege im sichtbaren Bereich (Welt → Bildschirm über weltZuSchirm). */
export function zeichneWege(ctx, b, weltZuSchirm) {
  if (!Z.ansicht) return;
  starten();
  const c0 = Math.max(0, Math.floor(b.wx0 / C)), c1 = Math.floor(b.wx1 / C);
  const r0 = Math.max(0, Math.floor(b.wy0 / C)), r1 = Math.floor(b.wy1 / C);
  let staedte = null;
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const k = cx + ',' + cy;
    let e = cache.get(k);
    if (!e || e.version !== version) {
      staedte = staedte || staedtefelder();
      const liste = felderImChunk(cx, cy);
      const sig = liste.map((i) => i + Z.ansicht.felder[i].w + anschluesse(i, staedte).map((a) => a.n + (a.stadt ? 's' : '')).join('.')).join('|');
      if (e && e.sig === sig) e.version = version;
      else {
        const neu = liste.length ? baueChunk(cx, cy, liste, staedte) : { canvas: null, leer: true };
        e = { version, sig, canvas: neu.canvas, leer: neu.leer };
        cache.set(k, e);
      }
    }
    if (!e.canvas || e.leer) continue;
    const [x0, y0] = weltZuSchirm(cx * C, cy * C), [x1, y1] = weltZuSchirm((cx + 1) * C, (cy + 1) * C);
    ctx.drawImage(e.canvas, Math.round(x0), Math.round(y0), Math.round(x1) - Math.round(x0), Math.round(y1) - Math.round(y0));
  }
  if (cache.size > 400) cache.delete(cache.keys().next().value);
}
