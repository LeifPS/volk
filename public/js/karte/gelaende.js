// Vorgerenderte Gelände-Kacheln (Chunks): pixelgenau aus der Karte erzeugt, mit Rauschen, gerasterten Biom-Übergängen,
// Küsten-Seitenkanten (Perspektive B) und Flüssen. Gecacht mit LRU, damit auch Tablets genug Speicher haben.
import { karte } from '../../shared/karte.js';
import { BREITE, HOEHE, EBENEN, idxE, nachbar, feldMitte, STAUCHUNG, WURZEL3 } from '../../shared/hex.js';
import { EB } from './ebene.js';
import { GELAENDE } from '../../shared/daten/gelaende.js';
import { hash, fbm } from '../../shared/zufall.js';
import { hexZuRgb } from '../grafik/pixel.js';

export const R = 28;                       // Hex-Radius in Weltpixeln
export const FELD_B = WURZEL3 * R;         // ≈ 48.5
export const ZEILE_H = 1.5 * R * STAUCHUNG; // ≈ 30.2
export const KANTE = 5;                    // Höhe der Seitenkante an Küsten
export const WELT_B = Math.ceil(FELD_B * (BREITE + 0.5)) + 2;   // Erde
export const WELT_H = Math.ceil((R + HOEHE * 1.5 * R) * STAUCHUNG + R) + 2;
/** Weltgröße in Pixeln der aktiven Ebene. */
export const weltB = () => Math.ceil(FELD_B * (EB().breite + 0.5)) + 2;
export const weltH = () => Math.ceil((R + EB().hoehe * 1.5 * R) * STAUCHUNG + R) + 2;
const CHUNK = 256;                         // Chunkgröße in Weltpixeln
const MAX_CHUNKS = 36;

const FARBEN = GELAENDE.map((g) => g.farben.map(hexZuRgb));
const SEITE = GELAENDE.map((g) => hexZuRgb(g.seite));
const WASSER = GELAENDE.map((g) => !!g.wasser);
const LEER = GELAENDE.map((g) => !!g.leer);   // Orbit: Sternenhimmel statt Boden
const TIEF = GELAENDE.map((g) => !!(g.wasser || g.leer)); // unter der Kante liegende Flächen (Wasser, All)

/** Feld unter einem Weltpixel der aktiven Ebene (Ebene der Oberseite). */
export function feldUnter(px, py) {
  const E = EB();
  const x = px - FELD_B / 2;
  const y = py / STAUCHUNG - R;
  const q = (WURZEL3 / 3 * x - y / 3) / R;
  const r = (2 / 3 * y) / R;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy <= dz) rz = -rx - ry;
  const zeile = rz, spalte = rx + ((rz - (rz & 1)) >> 1);
  if (spalte < 0 || zeile < 0 || spalte >= E.breite || zeile >= E.hoehe) return -1;
  return idxE(E.nr, spalte, zeile);
}

/** Abstand eines Pixels zum Rand seines Hexfelds (grob, in Pixeln), und das nächste Nachbarfeld. */
function randInfo(px, py, i) {
  const [cx, cy] = feldMitte(i, R);
  const dx = px - cx, dy = (py - cy) / STAUCHUNG;
  // Richtung zum nächsten Nachbarn: Winkel in 6 Sektoren (O, NO, NW, W, SW, SO)
  const w = Math.atan2(-dy, dx);
  let s = Math.round(w / (Math.PI / 3));
  s = ((s % 6) + 6) % 6;
  const nach = nachbar(i, s);
  // Abstand zur Kante in Richtung s
  const ux = Math.cos(s * Math.PI / 3), uy = -Math.sin(s * Math.PI / 3);
  const proj = dx * ux + dy * uy;
  return { rand: (WURZEL3 / 2) * R - proj, nach };
}

const cache = new Map(); // "cx,cy" -> canvas

export function chunkCanvas(cx, cy) {
  const k = EB().nr + ':' + cx + ',' + cy;
  let c = cache.get(k);
  if (c) { cache.delete(k); cache.set(k, c); return c; }
  c = baueChunk(cx, cy);
  cache.set(k, c);
  if (cache.size > MAX_CHUNKS) cache.delete(cache.keys().next().value);
  return c;
}
export const CHUNK_GROESSE = CHUNK;
export function cacheLeeren() { cache.clear(); }

function baueChunk(cx, cy) {
  const k = karte();
  const E = EB();
  const cv = document.createElement('canvas');
  cv.width = CHUNK; cv.height = CHUNK;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(CHUNK, CHUNK);
  const d = img.data;
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  for (let py = 0; py < CHUNK; py++) {
    const wy = y0 + py;
    for (let px = 0; px < CHUNK; px++) {
      const wx = x0 + px;
      const o = (py * CHUNK + px) * 4;
      let i = feldUnter(wx + 0.5, wy + 0.5);
      if (i < 0) {
        // außerhalb der Karte: im All weiter Sternenhimmel und Erde, auf der Erde dunkler Rand
        const h0 = hash(wx, wy, 7), ep = E.nr === 1 ? erdePixel(wx, wy, h0) : null;
        const c = ep || (E.nr === 1 && (h0 & 4095) < 5 ? [235, 240, 255] : E.nr === 1 ? [11, 15, 30] : [11, 13, 20]);
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; continue;
      }
      let g = k.gelaende[i];
      let farbe;
      const h = hash(wx, wy, 7);
      const n = (h & 1023) / 1024;
      // Küstenkante: Wasserpixel, über dem (um KANTE versetzt) Land liegt -> Seitenwand
      if (TIEF[g]) {
        const oben = feldUnter(wx + 0.5, wy + 0.5 - KANTE);
        if (oben >= 0 && !TIEF[k.gelaende[oben]] && oben !== i) {
          const s = SEITE[k.gelaende[oben]];
          const t = (wy - 0) % 2 === 0 ? 1 : 0.9;
          d[o] = s[0] * t; d[o + 1] = s[1] * t; d[o + 2] = s[2] * t; d[o + 3] = 255;
          continue;
        }
      }
      // gerasterter Übergang zum Nachbarn nahe der Kante
      const ri = randInfo(wx + 0.5, wy + 0.5, i);
      if (ri.nach >= 0 && ri.rand < 5) {
        const gn = k.gelaende[ri.nach];
        if (gn !== g && TIEF[gn] === TIEF[g]) {
          const p = (5 - ri.rand) / 10; // bis 50 % an der Kante
          if (((h >>> 10) & 1023) / 1024 < p) g = gn;
        }
      }
      const pal = FARBEN[g];
      farbe = pal[n < 0.68 ? 0 : n < 0.86 ? 1 : 2];
      let r = farbe[0], gr = farbe[1], b = farbe[2];
      // All: Sternenhimmel mit feinem Nebelschleier; am linken Rand der Weltraumkarte die Erde als großer Planet
      if (LEER[g]) {
        const st = h & 4095;
        const erde = E.nr === 1 ? erdePixel(wx, wy, h) : null;
        if (erde) { r = erde[0]; gr = erde[1]; b = erde[2]; }
        else if (st < 5) { r = 235; gr = 240; b = 255; }
        else if (st < 14) { r = 120 + (st & 3) * 20; gr = 130; b = 170; }
        else { const n2 = (hash(wx >> 4, wy >> 4, 11) & 255) / 255; r += n2 * 10; gr += n2 * 6; b += n2 * 18; }
        if (ri.nach >= 0 && !LEER[k.gelaende[ri.nach]] && ri.rand < 3) { r = r * 0.6 + 60; gr = gr * 0.6 + 80; b = b * 0.6 + 120; } // Atmosphärenschimmer
      } else if (WASSER[g]) {
        if (ri.nach >= 0 && !WASSER[k.gelaende[ri.nach]] && ri.rand < 2.2) { r = 200; gr = 225; b = 240; }
        else if (((wx + wy * 3) % 13 === 0) && n > 0.5) { r += 40; gr += 40; b += 30; }
        if (GELAENDE[g].tief) { r *= 0.92; gr *= 0.92; b *= 0.95; }
      } else {
        // feine Kantenschattierung: oben-links heller, unten-rechts dunkler
        if (ri.rand < 1.4) { const s = ri.nach >= 0 && (nachbarRichtungUnten(i, ri.nach)) ? 0.86 : 1.08; r *= s; gr *= s; b *= s; }
      }
      d[o] = r; d[o + 1] = gr; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Flüsse
  zeichneFluesse(ctx, x0, y0);
  return cv;
}

function nachbarRichtungUnten(i, n) { return n > i; }

/** Die Erde, vom Orbit aus gesehen: Kreis links außerhalb der Weltraumkarte, nur der rechte Rand ragt ins Bild.
 *  Ozeane, Kontinente aus grobem Rauschen, Wolkenbänder, Tag-Nacht-Schatten und ein Atmosphärensaum. Pixelstil (gerastert). */
function erdePixel(wx, wy, h) {
  const cx = -FELD_B * 19, cy = weltH() / 2, rr = FELD_B * 21.8;
  const dx = wx - cx, dy = (wy - cy) * 1.05;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > rr + 9) return null;
  if (d > rr) { // Atmosphäre: blauer Saum, nach außen gerastert ausdünnend
    const t = (d - rr) / 9;
    if (((h >>> 3) & 15) / 16 < t) return null;
    return [70 + 40 * (1 - t), 120 + 50 * (1 - t), 220];
  }
  // Kontinente und Wolken aus weichem Rauschen (auf 3-Pixel-Raster für den Pixelstil)
  const px = Math.floor(wx / 3), py = Math.floor(wy / 3);
  const land = fbm(px, py * 1.3, 38, 4, 501);
  const wolke = fbm(px * 0.6, py * 2.2, 22, 3, 503);
  let c = land > 0.56 ? (land > 0.66 ? [176, 160, 108] : land > 0.62 ? [96, 150, 74] : [70, 128, 62]) : land > 0.53 ? [52, 120, 182] : [32, 82, 160];
  if (wolke > 0.62 || (wolke > 0.58 && (h & 1))) c = [232, 238, 245];
  // Licht von rechts oben (Sonne), Schatten zur Mitte hin, Glanz am Rand
  const licht = Math.max(0.35, Math.min(1.15, 0.45 + (dx / rr) * 0.75 - (dy / rr) * 0.15));
  const rand = d > rr - 4 ? 1.12 : 1;
  return [c[0] * licht * rand, c[1] * licht * rand, Math.min(255, c[2] * licht * rand + 10)];
}

function zeichneFluesse(ctx, x0, y0) {
  const k = karte();
  const E = EB();
  const sp0 = Math.max(0, Math.floor(x0 / FELD_B) - 2), sp1 = Math.min(E.breite - 1, Math.ceil((x0 + CHUNK) / FELD_B) + 2);
  const z0 = Math.max(0, Math.floor(y0 / ZEILE_H) - 2), z1 = Math.min(E.hoehe - 1, Math.ceil((y0 + CHUNK) / ZEILE_H) + 2);
  for (let z = z0; z <= z1; z++) for (let s = sp0; s <= sp1; s++) {
    const i = idxE(E.nr, s, z);
    const f = k.fluss[i];
    if (!f || f > 6) continue;
    if (GELAENDE[k.gelaende[i]].wasser) continue;
    const n = nachbar(i, f - 1);
    if (n < 0) continue;
    const [ax, ay] = feldMitte(i, R), [bx, by] = feldMitte(n, R);
    const ende = GELAENDE[k.gelaende[n]].wasser ? 0.75 : 1;
    pixelLinie(ctx, ax - x0, ay - y0, ax + (bx - ax) * ende - x0, ay + (by - ay) * ende - y0, i);
  }
}

function pixelLinie(ctx, x0, y0, x1, y1, saat) {
  const schritte = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
  for (let s = 0; s <= schritte; s++) {
    const t = s / schritte;
    // leichte Mäander
    const w = Math.sin(t * Math.PI * 2 + saat) * 2.2;
    const nx = -(y1 - y0), ny = (x1 - x0); const l = Math.hypot(nx, ny) || 1;
    const x = Math.round(x0 + (x1 - x0) * t + nx / l * w), y = Math.round(y0 + (y1 - y0) * t + ny / l * w);
    ctx.fillStyle = '#2f6aa8'; ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#4c8fd6'; ctx.fillRect(x, y - 1, 2, 2);
  }
}
