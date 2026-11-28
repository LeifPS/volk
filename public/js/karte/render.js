// Kartenrenderer: Canvas 2D, nur sichtbare Felder (Culling), vorgerenderte Gelände-Chunks, Sprites, Nebel, Grenzen,
// Einheiten mit Interpolation, Städte, Effekte, Tag/Nacht und Wetter. Gezeichnet wird nur bei Änderung oder für Animationen.
import { karte } from '../../shared/karte.js';
import { idxE, ebeneVon, nachbar, feldMitte, umkreis, abstand, STAUCHUNG } from '../../shared/hex.js';
import { EB, aktiveEbene, setzeEbene, beiEbenenwechsel } from './ebene.js';
import { GELAENDE } from '../../shared/daten/gelaende.js';
import { ROHSTOFFE } from '../../shared/daten/rohstoffe.js';
import { EINHEIT, VERBESSERUNG, RELIGION, RELIGION_REGELN } from '../../shared/daten/index.js';
import { hash01 } from '../../shared/zufall.js';
import { sprite, hatSprite } from '../grafik/sprites.js';
import { EINHEIT_SYMBOL, SYMBOL_GROESSE } from '../grafik/einheiten_symbole.js';
import * as AN from './animation.js';
import { setzeNachbearbeitung, nachbearbeiten } from './nachbearbeitung.js';
import { WUNDER_NACH_ID } from '../../shared/daten/index.js';
import { zeichneWege } from './wege.js';
import { R, FELD_B, ZEILE_H, WELT_B, WELT_H, weltB, weltH, chunkCanvas, CHUNK_GROESSE, feldUnter } from './gelaende.js';
import { Z, erkundet, aktuellesFeld, aktuelleHp, serverJetzt, volk, stadt, feldInfo, an, melde } from '../kern/zustand.js';

export const kamera = { x: WELT_B / 2, y: WELT_H / 2, zoom: 1.5 };
export const ZOOMSTUFEN = [0.5, 0.75, 1, 1.5, 2, 3, 4];
let cv, ctx, dpr = 1, schmutzig = true, letzterFrame = 0;
let sichtbar = new Set();
let sichtVersion = -1;
const effekte = [];            // Kampf-Effekte
const tote = [];               // gefallene Einheiten (Tod-Animation)
const zuletzt = new Map();     // Einheit -> letzter gezeichneter Stand (für Tod und Blickrichtung)
export const overlay = { pfad: null, ziele: null, reichweite: null, gueltig: null, beschriftung: null, hover: -1, markierung: null, linse: null };
export const optionen = { tagnacht: true, wetter: true };
/** Gleitender Mittelwert der Zeichenzeit je Bild (ms) und Bildzähler, für Messung und Schutz der Nachbearbeitung. */
export const leistung = { ms: 0, bilder: 0 };

export function init(canvas) {
  cv = canvas;
  ctx = cv.getContext('2d', { alpha: false });
  groesse();
  addEventListener('resize', groesse);
  an('aenderung', () => { sichtVersion = -1; neuZeichnen(); });
  an('kampf', (l) => { for (const k of l) effekte.push({ ...k, start: performance.now() }); neuZeichnen(); });
  requestAnimationFrame(schleife);
}
function groesse() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  schmutzig = true;
}
export function neuZeichnen() { schmutzig = true; }
/** Shader-Nachbearbeitung an/aus (Einstellung); liefert, ob sie wirklich läuft. */
export function shaderSetzen(an) { const ok = setzeNachbearbeitung(an, cv); schmutzig = true; return ok; }
export const skala = () => kamera.zoom * dpr;

export function weltZuSchirm(wx, wy) { const s = skala(); return [(wx - kamera.x) * s + cv.width / 2, (wy - kamera.y) * s + cv.height / 2]; }
export function schirmZuWelt(sx, sy) { const s = skala(); return [(sx * dpr - cv.width / 2) / s + kamera.x, (sy * dpr - cv.height / 2) / s + kamera.y]; }
export function feldBeiSchirm(sx, sy) { const [wx, wy] = schirmZuWelt(sx, sy); return feldUnter(wx, wy); }
export function zentriereAuf(i, sanft = false) {
  if (i == null || i < 0) return;
  if (ebeneVon(i) !== aktiveEbene()) { setzeEbene(ebeneVon(i)); sanft = false; }
  const [x, y] = feldMitte(i, R);
  if (sanft) { kameraZiel = { x, y, start: performance.now(), vx: kamera.x, vy: kamera.y }; } else { kamera.x = x; kamera.y = y; begrenzen(); }
  schmutzig = true;
}
let kameraZiel = null;
export function begrenzen() {
  kamera.x = Math.max(0, Math.min(weltB(), kamera.x));
  kamera.y = Math.max(0, Math.min(weltH(), kamera.y));
}
// Jede Ebene merkt sich ihre eigene Kameraposition; das All startet auf dem Mond.
const kameraJeEbene = [null, null];
beiEbenenwechsel((neu) => {
  kameraJeEbene[1 - neu] = { x: kamera.x, y: kamera.y };
  const k = kameraJeEbene[neu];
  if (k) { kamera.x = k.x; kamera.y = k.y; } else { kamera.x = weltB() * 0.25; kamera.y = weltH() * 0.5; }
  kameraZiel = null; sichtVersion = -1; begrenzen(); schmutzig = true;
});
export function zoomen(richtung, sx = innerWidth / 2, sy = innerHeight / 2) {
  const i = ZOOMSTUFEN.indexOf(kamera.zoom);
  const ni = Math.max(0, Math.min(ZOOMSTUFEN.length - 1, (i < 0 ? 3 : i) + richtung));
  zoomAuf(ZOOMSTUFEN[ni], sx, sy);
}
export function zoomAuf(z, sx, sy) {
  const [wx, wy] = schirmZuWelt(sx, sy);
  kamera.zoom = Math.max(0.5, Math.min(4, z));
  const [nx, ny] = schirmZuWelt(sx, sy);
  kamera.x += wx - nx; kamera.y += wy - ny;
  begrenzen(); schmutzig = true;
}
export function verschieben(dx, dy) { const s = kamera.zoom; kamera.x -= dx / s; kamera.y -= dy / s; begrenzen(); schmutzig = true; }

// ---------- Sicht (nur Darstellung; was gesendet wird, entscheidet der Server) ----------
function sichtBerechnen() {
  const s = new Set();
  const a = Z.ansicht; if (!a) return s;
  for (const e of Object.values(a.einheiten)) {
    if (e.volk !== Z.volk || e.in) continue;
    for (const i of umkreis(aktuellesFeld(e), e.sicht || 2)) s.add(i);
  }
  for (const st of Object.values(a.staedte)) {
    if (st.volk !== Z.volk) continue;
    for (const i of umkreis(st.feld, 2)) s.add(i);
    for (const i of st.gebiet || []) s.add(i);
  }
  for (const [i, f] of Object.entries(a.felder)) {
    if (!f.v || !VERBESSERUNG[f.v]?.sicht) continue;
    const st = stadt(f.s); if (!st || st.volk !== Z.volk) continue;
    for (const j of umkreis(+i, VERBESSERUNG[f.v].sicht)) s.add(j);
  }
  // fremde Einheiten, die der Server schickt, sind sichtbar; Verbündete sehen wir mit
  for (const e of Object.values(a.einheiten)) if (e.volk !== Z.volk && a.diplomatie[e.volk]?.buendnis) for (const i of umkreis(aktuellesFeld(e), 2)) s.add(i);
  return s;
}
export function istSichtbar(i) { return sichtbar.has(i); }

// ---------- Hauptschleife ----------
function schleife(t) {
  requestAnimationFrame(schleife);
  if (document.hidden) return;
  if (kameraZiel) {
    const p = Math.min(1, (t - kameraZiel.start) / 350), e = 1 - Math.pow(1 - p, 3);
    kamera.x = kameraZiel.vx + (kameraZiel.x - kameraZiel.vx) * e; kamera.y = kameraZiel.vy + (kameraZiel.y - kameraZiel.vy) * e;
    if (p >= 1) kameraZiel = null;
    schmutzig = true;
  }
  const bewegt = Z.ansicht && Object.values(Z.ansicht.einheiten).some((e) => e.pfad && e.pfad.length);
  const intervall = schmutzig || effekte.length || tote.length || kameraZiel ? 0 : AN.ruheIntervall(bewegt);
  if (t - letzterFrame < intervall) return;
  letzterFrame = t;
  schmutzig = false;
  if (bewegt || sichtVersion < 0 || t - sichtVersion > 1000) { sichtbar = sichtBerechnen(); sichtVersion = t; }
  const t0 = performance.now();
  zeichne(t);
  const dauer = performance.now() - t0;
  leistung.ms = leistung.ms ? leistung.ms * 0.95 + dauer * 0.05 : dauer; leistung.bilder++;
  if (Z.ansicht) nachbearbeiten(cv, { zeitalter: Z.ansicht.du?.zeitalter || 0, ebene: aktiveEbene(), nacht: optionen.tagnacht && aktiveEbene() === 0 ? nachtAnteil() : 0, msBild: leistung.ms, beiAbschaltung: () => melde('shader_aus') });
}

function sichtbereich() {
  const [wx0, wy0] = schirmZuWelt(0, 0), [wx1, wy1] = schirmZuWelt(innerWidth, innerHeight);
  const E = EB();
  const z0 = Math.max(0, Math.floor(wy0 / ZEILE_H) - 2), z1 = Math.min(E.hoehe - 1, Math.ceil(wy1 / ZEILE_H) + 2);
  const s0 = Math.max(0, Math.floor(wx0 / FELD_B) - 2), s1 = Math.min(E.breite - 1, Math.ceil(wx1 / FELD_B) + 1);
  return { wx0, wy0, wx1, wy1, z0, z1, s0, s1 };
}

function zeichne(t) {
  const s = skala();
  AN.kontext(ctx);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0d14'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!Z.ansicht) return;
  const b = sichtbereich();
  // 1) Gelände-Chunks
  const rand = aktiveEbene() === 1 ? -3 : 0; // im All auch links und oben vom Kartenrand zeichnen (Erde, Sterne)
  const c0 = Math.max(rand, Math.floor(b.wx0 / CHUNK_GROESSE)), c1 = Math.floor(b.wx1 / CHUNK_GROESSE);
  const r0 = Math.max(rand, Math.floor(b.wy0 / CHUNK_GROESSE)), r1 = Math.floor(b.wy1 / CHUNK_GROESSE);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    if (cx * CHUNK_GROESSE > weltB() || cy * CHUNK_GROESSE > weltH()) continue;
    if (aktiveEbene() === 0 && !chunkHatErkundetes(cx, cy)) continue;
    const [x0, y0] = weltZuSchirm(cx * CHUNK_GROESSE, cy * CHUNK_GROESSE);
    const [x1, y1] = weltZuSchirm((cx + 1) * CHUNK_GROESSE, (cy + 1) * CHUNK_GROESSE);
    ctx.drawImage(chunkCanvas(cx, cy), Math.round(x0), Math.round(y0), Math.round(x1) - Math.round(x0), Math.round(y1) - Math.round(y0));
  }
  const k = karte();
  const a = Z.ansicht;
  // Positionen der Einheiten je Feld
  const proFeld = new Map();
  for (const e of Object.values(a.einheiten)) {
    if (e.in) continue;
    const f = aktuellesFeld(e);
    if (!erkundet(f)) continue;
    if (!proFeld.has(f)) proFeld.set(f, []);
    proFeld.get(f).push(e);
  }
  const staedteAuf = new Map(); for (const st of Object.values(a.staedte)) staedteAuf.set(st.feld, st);
  const lagerAuf = new Map(); for (const l of Object.values(a.lager || {})) lagerAuf.set(l.feld, l);
  const forscht = a.du?.forschung?.erforscht || {};
  const za = a.du?.zeitalter || 0;
  const anim = Math.floor(t / 600);
  // Naturwunder: Feld -> Naturwunder; gezeichnet wird beim untersten Feld (richtige Überdeckung)
  const nwAuf = new Map();
  for (const nw of a.welt?.naturwunder || []) for (const i of nw.felder) nwAuf.set(i, nw);
  // 2) Wege (unter allem), pixelgenau mit Kurven
  zeichneWege(ctx, b, weltZuSchirm);
  // 3) Grenzen (und Kartenansicht "Religion")
  if (overlay.linse === 'religion') zeichneReligionsLinse(b, s);
  zeichneGrenzen(b, s);
  // 4) zeilenweise: Verbesserungen, Deko, Rohstoffe, Städte, Einheiten
  for (let z = b.z0; z <= b.z1; z++) {
    for (let sp = b.s0; sp <= b.s1; sp++) {
      const i = idxE(aktiveEbene(), sp, z);
      if (!erkundet(i)) continue;
      const [mx, my] = feldMitte(i, R);
      const [x, y] = weltZuSchirm(mx, my);
      const g = GELAENDE[k.gelaende[i]];
      const f = a.felder[i];
      const st = staedteAuf.get(i);
      const nw = nwAuf.get(i);
      if (nw) {
        if (i === nw.felder[nw.felder.length - 1]) zeichneNaturwunder(nw, s, t);
        const es0 = proFeld.get(i); if (es0) zeichneEinheiten(es0, i, s, t);
        continue;
      }
      if (f && (f.d || f.db) && !st) { // Distrikt bzw. Distrikt-Baustelle
        const besitzer = stadt(f.s)?.volk;
        const ds = f.d ? sprite('distrikt', f.d, { zeitalter: volk(besitzer)?.zeitalter ?? 0, farbe: volkFarbe(besitzer) }) : sprite('distrikt', 'baustelle', {});
        if (ds) male(ds, x - 32 * s, y - 44 * s, s, f.pl ? 0.55 : 1);
        if (f.pl && f.d) { const rs = sprite('deko', 'ruine', { variante: 0 }); if (rs) male(rs, x - 24 * s, y - 24 * s, s, 0.8); }
        const es2 = proFeld.get(i); if (es2 && (sichtbar.has(i) || es2.some((e) => e.volk === Z.volk))) zeichneEinheiten(es2, i, s, t);
        continue;
      }
      if (f && (f.wu || f.wb) && !st) { zeichneWunderFeld(f, x, y, s, t); const es1 = proFeld.get(i); if (es1 && (sichtbar.has(i) || es1.some((e) => e.volk === Z.volk))) zeichneEinheiten(es1, i, s, t); continue; }
      if (f && f.v && !st) {
        const sp2 = sprite('verbesserung', f.v, { farbe: volkFarbe(stadt(f.s)?.volk) });
        if (sp2) male(sp2, x - 24 * s, y - 20 * s, s, f.pl ? 0.5 : 1);
        if (sp2 && !f.pl) AN.zeichneVerbesserungAnim(VERBESSERUNG[f.v]?.kette, x - 24 * s, y - 20 * s, s, t, i);
      }
      if (!st && hatSprite('deko', g.id) && !(f && f.v && ((DEKO_WEG.has(f.v) && g.hoehe < 3) || VERBESSERUNG[f.v]?.raum))) {
        const d = sprite('deko', g.id, { variante: k.variante[i] });
        if (d) male(d, x - 24 * s, y - 26 * s, s);
      }
      // Rohstoff (strategische erst mit Forschung)
      const rn = k.rohstoff[i];
      if (rn && !st) {
        const r = ROHSTOFFE[rn - 1];
        if (!r.sichtbar_durch || forscht[r.sichtbar_durch]) {
          if (r.tier && kamera.zoom >= 1) {
            const ts = sprite('tier', r.tier);
            if (ts) { const wipp = (hash01(i, anim) > 0.85 ? 1 : 0); male(ts, x - 4 * s - (ts.width / 2) * s + wipp * s, y - ts.height * s + 4 * s, s); }
          }
          const rs = sprite('rohstoff', r.id);
          if (rs) male(rs, x + 7 * s, y + 1 * s, s);
        }
      }
      if (f && f.fo > serverJetzt()) { const fo = sprite('deko', 'fallout', { variante: anim % 2 }); if (fo) male(fo, x - 24 * s, y - 26 * s, s, 0.8); }
      const lg = lagerAuf.get(i);
      if (lg) { const ls = sprite('deko', 'barbarenlager', { variante: anim % 2 }); if (ls) male(ls, x - 24 * s, y - 28 * s, s); }
      if (st) zeichneStadt(st, x, y, s, t);
      const es = proFeld.get(i);
      if (es && (sichtbar.has(i) || es.some((e) => e.volk === Z.volk))) zeichneEinheiten(es, i, s, t);
    }
  }
  // 5) Nebel
  zeichneNebel(b, s);
  // 6) Hervorhebungen und Pfade
  zeichneOverlay(s, t);
  // 7) Effekte
  zeichneEffekte(s, t);
  // 8) Namen der Städte oben drauf
  for (const st of Object.values(a.staedte)) {
    if (!erkundet(st.feld) || ebeneVon(st.feld) !== aktiveEbene()) continue;
    const [mx, my] = feldMitte(st.feld, R);
    if (mx < b.wx0 - 100 || mx > b.wx1 + 100 || my < b.wy0 - 60 || my > b.wy1 + 60) continue;
    const [x, y] = weltZuSchirm(mx, my);
    stadtBanner(st, x, y - 40 * s, s);
  }
  // 9) Tag/Nacht und Wetter
  if (aktiveEbene() === 0) { // im All gibt es weder Tageszeit noch Wetter
    if (optionen.tagnacht) zeichneTageszeit(t);
    if (optionen.wetter) zeichneWetter(t);
  }
}

/** Verbesserungen, unter denen keine Gelände-Deko gezeichnet wird (sonst verdeckt die Deko sie). Weltraum-Verbesserungen immer. */
const DEKO_WEG = new Set(['farm', 'bewaesserte_farm', 'windrad_farm', 'mechanisierte_farm', 'holzfaellerlager', 'saegewerk', 'mine', 'tiefe_mine', 'industriemine', 'robotermine', 'steinbruch', 'grosser_steinbruch']);

/** Naturwunder über seinen Feldern (Schwerpunkt), mit Animationsphase aus dem gemeinsamen Takt. */
function zeichneNaturwunder(nw, s, t) {
  let sx = 0, sy = 0, maxY = -Infinity;
  for (const i of nw.felder) { const [mx, my] = feldMitte(i, R); sx += mx; sy += my; maxY = Math.max(maxY, my); }
  sx /= nw.felder.length; sy /= nw.felder.length;
  const bild = sprite('naturwunder', nw.id, { variante: Math.floor(t / 450) % 4 });
  if (!bild) return;
  const [x, y] = weltZuSchirm(sx, (sy + maxY) / 2);
  male(bild, x - (bild.width / 2) * s, y - bild.height * 0.8 * s, s); // animiert über den gemeinsamen Takt der Hauptschleife
  AN.zeichneNaturwunderAnim(x - (bild.width / 2) * s, y - bild.height * 0.8 * s, bild.width * s, bild.height * s, s, t, nw.id);
}

/** Weltwunder auf seinem Feld; während des Baus ein Gerüst um ein halb durchsichtiges Modell. */
function zeichneWunderFeld(f, x, y, s, t) {
  const id = f.wu || f.wb;
  const bild = sprite('wunder', id);
  if (!bild) return;
  const breite = 56 * s, hoehe = bild.height / bild.width * breite;
  const x0 = x - breite / 2, y0 = y + 10 * s - hoehe;
  if (f.wu) { ctx.drawImage(bild, Math.round(x0), Math.round(y0), Math.round(breite), Math.round(hoehe)); AN.zeichneWunderAnim(id, x0, y0, breite, hoehe, s, t, WUNDER_NACH_ID[id]?.zeitalter || 0); return; }
  ctx.globalAlpha = 0.45; ctx.drawImage(bild, Math.round(x0), Math.round(y0), Math.round(breite), Math.round(hoehe)); ctx.globalAlpha = 1;
  // Baugerüst: senkrechte Stangen und Querbalken in Holzfarben, ein Kran mit pendelndem Haken
  const p = Math.max(1, Math.round(s));
  ctx.fillStyle = '#8a6a3c';
  for (let k = 0; k <= 4; k++) ctx.fillRect(Math.round(x0 + k * breite / 4), Math.round(y0 + hoehe * 0.35), p, Math.round(hoehe * 0.65));
  for (let k = 1; k <= 3; k++) ctx.fillRect(Math.round(x0), Math.round(y0 + hoehe * (0.35 + k * 0.16)), Math.round(breite), p);
  ctx.fillStyle = '#c9a24a';
  const kx = Math.round(x0 + breite * 0.85), ky = Math.round(y0 + hoehe * 0.05);
  ctx.fillRect(kx, ky, p, Math.round(hoehe * 0.95)); ctx.fillRect(Math.round(x0 + breite * 0.35), ky, Math.round(breite * 0.55), p);
  const pendel = Math.round(Math.sin(t / 700) * 3 * s);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(Math.round(x0 + breite * 0.5) + pendel, ky, p, Math.round(hoehe * 0.25));
}

function chunkHatErkundetes(cx, cy) {
  // grobe Prüfung über Stichproben der Felder im Chunk
  const x0 = cx * CHUNK_GROESSE, y0 = cy * CHUNK_GROESSE;
  for (let yy = 0; yy <= CHUNK_GROESSE; yy += 24) for (let xx = 0; xx <= CHUNK_GROESSE; xx += 24) { const i = feldUnter(x0 + xx, y0 + yy); if (i >= 0 && erkundet(i)) return true; }
  return false;
}

function male(bild, x, y, s, alpha = 1) {
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(bild, Math.round(x), Math.round(y), Math.round(bild.width * s), Math.round(bild.height * s));
  if (alpha !== 1) ctx.globalAlpha = 1;
}

export function volkFarbe(vid) { return volk(vid)?.farbe || '#888888'; }

// ---------- Wege ----------
function dickeLinie(x0, y0, x1, y1, w, farbe) { ctx.strokeStyle = farbe; ctx.lineWidth = w; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(Math.round(x0), Math.round(y0)); ctx.lineTo(Math.round(x1), Math.round(y1)); ctx.stroke(); }

// ---------- Grenzen ----------
const ECKEN = [];
for (let r = 0; r < 6; r++) {
  // Kante zum Nachbarn in Richtung r liegt zwischen den Ecken bei Winkel 30°-60r ± 30°
  const w = -r * 60;
  const a1 = (w - 30) * Math.PI / 180, a2 = (w + 30) * Math.PI / 180;
  ECKEN.push([[Math.cos(a1) * R, Math.sin(a1) * R * STAUCHUNG], [Math.cos(a2) * R, Math.sin(a2) * R * STAUCHUNG]]);
}
function eckenRichtig() {
  // Richtungen: 0 O, 1 NO, 2 NW, 3 W, 4 SW, 5 SO  (Spitze oben: Kanten bei 0°, 60°, 120°, ...)
}
/** Kartenansicht Religion: jedes Stadtgebiet in der Farbe seiner Mehrheitsreligion (ohne Mehrheit grau gerastert). */
function zeichneReligionsLinse(b, s) {
  const a = Z.ansicht;
  const farbeVon = new Map();
  for (const st of Object.values(a.staedte)) {
    let best = null, ba = 0;
    for (const [rid, x] of Object.entries(st.glauben || {})) if (x > ba) { ba = x; best = rid; }
    farbeVon.set(st.id, ba >= RELIGION_REGELN.mehrheit ? RELIGION[best]?.farbe : null);
  }
  for (let z = b.z0; z <= b.z1; z++) for (let sp = b.s0; sp <= b.s1; sp++) {
    const i = idxE(aktiveEbene(), sp, z);
    const f = a.felder[i];
    if (!f || !f.s || !erkundet(i)) continue;
    const farbe = farbeVon.get(f.s);
    const [mx, my] = feldMitte(i, R);
    ctx.fillStyle = farbe || 'rgba(120,120,140,0.25)';
    ctx.globalAlpha = farbe ? 0.42 : 1;
    hexPfad(mx, my, s, 0.98); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function zeichneGrenzen(b, s) {
  const a = Z.ansicht;
  for (let z = b.z0; z <= b.z1; z++) for (let sp = b.s0; sp <= b.s1; sp++) {
    const i = idxE(aktiveEbene(), sp, z);
    const f = a.felder[i];
    if (!f || !f.s || !erkundet(i)) continue;
    const st = a.staedte[f.s]; if (!st) continue;
    const besitzer = st.volk;
    const farbe = volkFarbe(besitzer);
    const [mx, my] = feldMitte(i, R);
    for (let r = 0; r < 6; r++) {
      const n = nachbar(i, r);
      const fn = n >= 0 ? a.felder[n] : null;
      const bn = fn && fn.s ? a.staedte[fn.s]?.volk : null;
      if (bn === besitzer) continue;
      const [e1, e2] = kantenEcken(r);
      const ein = 0.86;
      const [x1, y1] = weltZuSchirm(mx + e1[0] * ein, my + e1[1] * ein), [x2, y2] = weltZuSchirm(mx + e2[0] * ein, my + e2[1] * ein);
      dickeLinie(x1, y1, x2, y2, Math.max(2, Math.round(2.5 * s)), farbe);
      const [x3, y3] = weltZuSchirm(mx + e1[0] * 0.74, my + e1[1] * 0.74), [x4, y4] = weltZuSchirm(mx + e2[0] * 0.74, my + e2[1] * 0.74);
      ctx.globalAlpha = 0.35; dickeLinie(x3, y3, x4, y4, Math.max(1, Math.round(2 * s)), farbe); ctx.globalAlpha = 1;
    }
  }
}
/** Die beiden Ecken der Kante in Richtung r (Spitze oben, Richtungen O, NO, NW, W, SW, SO). */
function kantenEcken(r) {
  // Ecken eines Hexagons mit Spitze oben liegen bei 30°, 90°, 150°, ... (mathematisch, y nach oben)
  const winkel = [[-30, 30], [30, 90], [90, 150], [150, 210], [210, 270], [270, 330]][r];
  return winkel.map((w) => { const a = w * Math.PI / 180; return [Math.cos(a) * R, -Math.sin(a) * R * STAUCHUNG]; });
}

// ---------- Nebel ----------
function hexPfad(mx, my, s, f = 1) {
  ctx.beginPath();
  for (let r = 0; r < 6; r++) {
    const a = (30 + r * 60) * Math.PI / 180;
    const [x, y] = weltZuSchirm(mx + Math.cos(a) * R * f, my - Math.sin(a) * R * STAUCHUNG * f);
    if (r === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function zeichneNebel(b, s) {
  for (let z = b.z0; z <= b.z1; z++) for (let sp = b.s0; sp <= b.s1; sp++) {
    const i = idxE(aktiveEbene(), sp, z);
    const [mx, my] = feldMitte(i, R);
    if (!erkundet(i)) {
      // weicher Rand: Felder neben Erkundetem bekommen einen gerasterten Übergang
      let rand = false;
      for (let r = 0; r < 6; r++) { const n = nachbar(i, r); if (n >= 0 && erkundet(n)) { rand = true; break; } }
      ctx.fillStyle = '#0b0d14';
      hexPfad(mx, my, s, 1.04); ctx.fill();
      if (rand) {
        ctx.fillStyle = 'rgba(11,13,20,0.55)';
        hexPfad(mx, my, s, 1.25); ctx.fill();
      }
    } else if (!sichtbar.has(i)) {
      ctx.fillStyle = 'rgba(14,18,32,0.42)';
      hexPfad(mx, my, s, 1.01); ctx.fill();
    }
  }
}

// ---------- Städte ----------
function groesseStufe(bev) { return bev >= 10 ? 3 : bev >= 4 ? 2 : 1; }
function zeichneStadt(st, x, y, s, t) {
  const v = volk(st.volk);
  const farbe = volkFarbe(st.volk);
  const za = st.zeitalter || 0;
  const kolonie = ebeneVon(st.feld) === 1 && hatSprite('stadt', 'kolonie'); // Kolonien im All: Kuppelstädte
  const sp = v?.art === 'stadtstaat' ? sprite('stadt', 'stadtstaat', { farbe }) : kolonie ? sprite('stadt', 'kolonie', { farbe, zeitalter: za, groesse: groesseStufe(st.bev) }) : sprite('stadt', 'stadt', { farbe, zeitalter: za, groesse: groesseStufe(st.bev) });
  if (st.zerstoert_bis && st.zerstoert_bis > serverJetzt()) { const r = sprite('deko', 'ruine', { variante: 0 }); if (r) male(r, x - 24 * s, y - 24 * s, s); }
  if (sp) male(sp, x - 32 * s, y - 44 * s, s);
  if (st.mauer) { const m = sprite('stadt', 'mauer', { farbe, zeitalter: st.mauer - 1 }); if (m) male(m, x - 32 * s, y - 44 * s, s); }
  // Leben in der Stadt: Rauch, Lichter bei Nacht, Leute, Fahne, Hafen
  if (sp && v?.art !== 'stadtstaat' && !kolonie) AN.zeichneStadtAnim(st, x - 32 * s, y - 44 * s, s, t, { farbe, wetter: optionen.wetter && ebeneVon(st.feld) === 0, nacht: optionen.tagnacht && ebeneVon(st.feld) === 0 ? nachtAnteil() : 0, hafen: !!st.distrikte?.hafen });
  else if (za >= 4 && optionen.wetter && ebeneVon(st.feld) === 0 && AN.bewegung()) {
    const p = (t / 1400) % 1;
    ctx.fillStyle = `rgba(140,140,140,${0.5 * (1 - p)})`;
    ctx.fillRect(Math.round(x + 8 * s), Math.round(y - (40 + p * 14) * s), Math.round(3 * s), Math.round(3 * s));
  }
}
function stadtBanner(st, x, y, s) {
  const v = volk(st.volk);
  const farbe = volkFarbe(st.volk);
  const gr = Math.max(1, Math.round(Math.min(s, 3 * (window.devicePixelRatio || 1))));
  const schrift = Math.round(8 * gr);
  ctx.font = `700 ${schrift}px Zahlen, Silkscreen, monospace`;
  const name = st.name + (st.hauptstadt ? ' ★' : '');
  const w = Math.ceil(ctx.measureText(name).width) + 22 * gr;
  const h = 12 * gr;
  const bx = Math.round(x - w / 2), by = Math.round(y - h);
  ctx.fillStyle = 'rgba(11,13,20,0.85)'; ctx.fillRect(bx - gr, by - gr, w + 2 * gr, h + 2 * gr);
  ctx.fillStyle = farbe; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx, by + h - 2 * gr, w, 2 * gr);
  // Einwohner-Kästchen
  ctx.fillStyle = '#0b0d14'; ctx.fillRect(bx, by, 16 * gr, h);
  ctx.fillStyle = '#f0ead6'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(String(st.bev), bx + 8 * gr, by + h / 2 + gr * 0.5);
  ctx.fillStyle = hellGenug(farbe) ? '#11131a' : '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(name, bx + 19 * gr, by + h / 2 + gr * 0.5);
  // Lebenspunkte bei Schaden
  if (st.hp != null && st.maxhp && st.hp < st.maxhp) {
    const bw = w, anteil = Math.max(0, st.hp / st.maxhp);
    ctx.fillStyle = '#0b0d14'; ctx.fillRect(bx, by + h + gr, bw, 3 * gr);
    ctx.fillStyle = anteil > 0.5 ? '#5fbf4a' : anteil > 0.25 ? '#f0c040' : '#e0533d'; ctx.fillRect(bx, by + h + gr, Math.round(bw * anteil), 3 * gr);
  }
  if (v?.art === 'stadtstaat') {
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(bx + w - 5 * gr, by + gr, 3 * gr, 3 * gr);
  }
}
function hellGenug(h) { const n = parseInt(h.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return r * 0.299 + g * 0.587 + b * 0.114 > 150; }

// ---------- Einheiten ----------
function einheitPosition(e, t) {
  // Welt-Position interpoliert entlang des Pfades
  if (!e.pfad || !e.pfad.length) return feldMitte(e.feld, R);
  const jetzt = serverJetzt();
  let von = e.feld, vonT = null;
  for (let k = 0; k < e.pfad.length; k++) {
    const p = e.pfad[k];
    if (p.t <= jetzt) { von = p.f; vonT = p.t; continue; }
    const startT = vonT ?? (k === 0 ? p.t - (e.pfad[1] ? e.pfad[1].t - p.t : 300000) : e.pfad[k - 1].t);
    const anteil = Math.max(0, Math.min(1, (jetzt - startT) / Math.max(1, p.t - startT)));
    const [ax, ay] = feldMitte(von, R), [bx, by] = feldMitte(p.f, R);
    return [ax + (bx - ax) * anteil, ay + (by - ay) * anteil];
  }
  return feldMitte(von, R);
}

// ---------- Einheiten-Banner (wie in Civilization: Schild in Volksfarbe mit eigenem Symbol je Einheit) ----------
// Das Symbol kommt aus grafik/einheiten_symbole.js (13×13 von Hand); auf hellen Volksfarben wird es dunkel gezeichnet.
// Am Banner: Lebenspunkte als Leiste unter der Spitze, Beförderungsstufe als Sterne links, Zustand als Symbol rechts.
const BANNER_IKON = 15;
const BANNER_BREITE = (() => { const w = []; for (let r = 0; r < 19; r++) w.push(r < 13 ? 17 : 17 - 2 * (r - 12)); return w; })();
const BANNER_CACHE = new Map();
function helligkeit(farbe) {
  const m = /^#?([0-9a-f]{6})$/i.exec(farbe || ''); if (!m) return 0.5;
  const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
/** Symbol einer Einheit als Canvas (SYMBOL_GROESSE²), Farben passend zur Volksfarbe. */
function bannerIkon(typ, farbe) {
  const hellesBanner = helligkeit(farbe) > 0.62;
  const k = typ + (hellesBanner ? ':d' : ':h');
  if (BANNER_CACHE.has(k)) return BANNER_CACHE.get(k);
  let out = null;
  const muster = EINHEIT_SYMBOL[typ];
  if (muster) {
    const F = hellesBanner ? { '#': '#1c1f2b', '+': '#454b63', '-': '#f2efe6' } : { '#': '#f2efe6', '+': '#ffffff', '-': '#1c1f2b' };
    const G = SYMBOL_GROESSE;
    out = document.createElement('canvas'); out.width = G + 2; out.height = G + 2;
    const oc = out.getContext('2d');
    // weicher Schlagschatten (1 px nach rechts unten) für Lesbarkeit auf jeder Volksfarbe
    oc.fillStyle = hellesBanner ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.45)';
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const c = muster[y][x]; if (c === '#' || c === '+') oc.fillRect(x + 2, y + 2, 1, 1); }
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const c = muster[y][x]; if (c !== '.' && F[c]) { oc.fillStyle = F[c]; oc.fillRect(x + 1, y + 1, 1, 1); } }
  } else {
    // Rückfall: Sprite zugeschnitten und verkleinert
    const bild = sprite('einheit', typ, { farbe: '#8a8f9c' });
    if (bild) {
      const q = document.createElement('canvas'); q.width = bild.width; q.height = bild.height;
      const qc = q.getContext('2d'); qc.drawImage(bild, 0, 0);
      const dat = qc.getImageData(0, 0, q.width, q.height).data;
      let x0 = q.width, y0 = q.height, x1 = -1, y1 = -1;
      for (let y = 0; y < q.height; y++) for (let x = 0; x < q.width; x++) if (dat[(y * q.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= x0) {
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1, f = Math.min(BANNER_IKON / bw, BANNER_IKON / bh, 1);
        const w = Math.max(1, Math.round(bw * f)), h = Math.max(1, Math.round(bh * f));
        out = document.createElement('canvas'); out.width = BANNER_IKON; out.height = BANNER_IKON;
        const oc = out.getContext('2d'); oc.imageSmoothingEnabled = true;
        oc.drawImage(q, x0, y0, bw, bh, Math.floor((BANNER_IKON - w) / 2), Math.floor((BANNER_IKON - h) / 2), w, h);
      }
    }
  }
  BANNER_CACHE.set(k, out);
  return out;
}
/**
 * Banner zeichnen; gibt die Oberkante zurück. o: { hp (0..100), stufe (Beförderungsstufe, 1 = keine), ausgewaehlt }.
 */
function zeichneBanner(x, yUnten, s, farbe, typ, o = {}) {
  const p = Math.max(1, Math.round(s * 0.75)); // Pixelgröße des Banners
  const h = BANNER_BREITE.length;
  const x0 = Math.round(x), y0 = Math.round(yUnten) - (h + 1) * p;
  const rand = o.ausgewaehlt ? '#ffe066' : '#0b0d14';
  ctx.fillStyle = rand;
  ctx.fillRect(x0 - Math.floor((BANNER_BREITE[0] + 2) / 2) * p, y0 - p, (BANNER_BREITE[0] + 2) * p, p);
  for (let r = 0; r < h; r++) { const w = BANNER_BREITE[r] + 2; ctx.fillRect(x0 - Math.floor(w / 2) * p, y0 + r * p, w * p, p); }
  ctx.fillRect(x0 - p, y0 + h * p, 3 * p, p);
  ctx.fillStyle = farbe;
  for (let r = 0; r < h; r++) { const w = BANNER_BREITE[r]; ctx.fillRect(x0 - Math.floor(w / 2) * p, y0 + r * p, w * p, p); }
  // Licht oben, Schatten unten (Pixelstil)
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(x0 - Math.floor(BANNER_BREITE[0] / 2) * p, y0, BANNER_BREITE[0] * p, p);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let r = 13; r < h; r++) { const w = BANNER_BREITE[r]; ctx.fillRect(x0 - Math.floor(w / 2) * p, y0 + r * p, w * p, p); }
  const ik = bannerIkon(typ, farbe);
  if (ik) {
    const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const off = Math.floor(ik.width / 2);
    ctx.drawImage(ik, x0 - off * p, y0 + (ik.width === BANNER_IKON ? 2 : 1) * p, ik.width * p, ik.height * p);
    ctx.imageSmoothingEnabled = was;
  }
  // Lebenspunkte: Leiste unter der Spitze (nur wenn verletzt)
  if (o.hp != null && o.hp < 99.5) {
    const bw = 17 * p, bh = Math.max(2, 2 * p), bx = x0 - Math.floor(17 / 2) * p, by = y0 + (h + 2) * p;
    ctx.fillStyle = '#0b0d14'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#3a2024'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = o.hp > 60 ? '#5fbf4a' : o.hp > 30 ? '#f0c040' : '#e0533d'; ctx.fillRect(bx, by, Math.max(p, Math.round(bw * o.hp / 100)), bh);
  }
  // Beförderungen: kleine Sterne links am Banner, von oben nach unten
  const sterne = Math.min(5, Math.max(0, (o.stufe || 1) - 1));
  for (let i = 0; i < sterne; i++) {
    const sx = x0 - (Math.floor(BANNER_BREITE[0] / 2) + 4) * p, sy = y0 + i * 4 * p;
    ctx.fillStyle = '#0b0d14'; ctx.fillRect(sx - p, sy - p, 5 * p, 5 * p);
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(sx + p, sy, p, 3 * p); ctx.fillRect(sx, sy + p, 3 * p, p);
    ctx.fillStyle = '#fff3a0'; ctx.fillRect(sx + p, sy + p, p, p);
  }
  return y0;
}
function zeichneEinheiten(liste, feld, s, t) {
  const sortiert = liste.slice().sort((a, b) => (EINHEIT[a.typ]?.klasse === 'zivil' ? -1 : 0) - (EINHEIT[b.typ]?.klasse === 'zivil' ? -1 : 0));
  sortiert.forEach((e, n) => {
    const d = EINHEIT[e.typ];
    const [wx, wy] = einheitPosition(e, t);
    let [x, y] = weltZuSchirm(wx, wy);
    if (sortiert.length > 1) x += (n === 0 ? -9 : 7) * s;
    // Kampf: Ausfall des Angreifers (Nahkampf), Rütteln und Aufblitzen beim Getroffenen
    const ka = kampfZustand(e, aktuellesFeld(e));
    x += ka.dx * s; y += ka.dy * s;
    const farbe = volkFarbe(e.volk);
    const ausgewaehlt = Z.auswahl?.art === 'einheit' && Z.auswahl.id === e.id;
    // Fußkreis in Volksfarbe
    // Landeinheit auf einem Wasserfeld = eingeschifft: sie sitzt in einem kleinen Ruderboot
    const imBoot = !e.tier && !!d && !['see_zivil', 'see_nah', 'see_fern', 'u_boot', 'traeger', 'transport', 'jaeger', 'bomber', 'rakete', 'atom'].includes(d.klasse) && !!GELAENDE[karte().gelaende[aktuellesFeld(e)]]?.wasser;
    if (!imBoot) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y + 7 * s), 11 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = ausgewaehlt ? '#ffe066' : farbe; ctx.lineWidth = Math.max(1, Math.round((ausgewaehlt ? 2 : 1.5) * s));
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y + 7 * s), 11 * s, 4 * s, 0, 0, Math.PI * 2); ctx.stroke();
    let bild;
    if (e.tier) bild = sprite('tier', e.tier);
    else bild = sprite('einheit', e.typ, { farbe });
    const bereich = d && ['see_zivil', 'see_nah', 'see_fern', 'u_boot', 'traeger', 'transport'].includes(d.klasse) ? 'see' : d && ['jaeger', 'bomber', 'rakete', 'atom'].includes(d.klasse) ? 'luft' : 'land';
    const laeuft = !!(e.pfad && e.pfad.length);
    const bart = e.tier ? 'fuss' : AN.bewegungsArt(e.typ, imBoot ? 'see' : bereich, ebeneVon(aktuellesFeld(e)) === 1);
    const wipp = AN.einheitVersatz(bart, laeuft, t, e.id).dy;
    // Blickrichtung folgt der Bewegung und bleibt nach dem Anhalten erhalten
    const alt = zuletzt.get(e.id);
    let gehtLinks = alt?.links || false;
    if (laeuft) { const zx = feldMitte(e.pfad[e.pfad.length - 1].f, R)[0]; if (Math.abs(zx - wx) > 1) gehtLinks = zx < wx; }
    else if (ka.blick != null) gehtLinks = ka.blick;
    zuletzt.set(e.id, { links: gehtLinks, typ: e.typ, tier: e.tier, volk: e.volk, feld: aktuellesFeld(e), wx, wy, gesehen: t });
    if (!e.tier) AN.zeichneLaufZusatz(bart, laeuft, x, y, s, t, gehtLinks, e.id);
    if (bild) {
      const bx = x - (bild.width / 2) * s, by = y + 9 * s - bild.height * s + wipp * s;
      const schnitt = imBoot ? 7 : 0;   // im Boot sind die Beine verdeckt
      const hoehe = bild.height - schnitt;
      const malen = () => {
        if (gehtLinks) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(bild, 0, 0, bild.width, hoehe, Math.round(-(bild.width / 2) * s), Math.round(by), Math.round(bild.width * s), Math.round(hoehe * s)); ctx.restore(); }
        else ctx.drawImage(bild, 0, 0, bild.width, hoehe, Math.round(bx), Math.round(by), Math.round(bild.width * s), Math.round(hoehe * s));
      };
      malen();
      if (ka.blitz > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ka.blitz; malen(); ctx.restore(); }
    }
    if (imBoot) {
      const boot = sprite('deko', 'ruderboot', { farbe });
      if (boot) {
        const by2 = y + wipp * s;
        if (gehtLinks) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(boot, Math.round(-(boot.width / 2) * s), Math.round(by2), Math.round(boot.width * s), Math.round(boot.height * s)); ctx.restore(); }
        else male(boot, x - (boot.width / 2) * s, by2, s);
      }
    }
    // Lebensbalken
    const hp = aktuelleHp(e);
    if (hp < 99.5 && (e.tier || !d)) {
      const bw = 18 * s, bh = Math.max(2, 2 * s);
      const bx = Math.round(x - bw / 2), by = Math.round(y + 12 * s);
      ctx.fillStyle = '#0b0d14'; ctx.fillRect(bx - 1, by - 1, Math.round(bw) + 2, Math.round(bh) + 2);
      ctx.fillStyle = hp > 60 ? '#5fbf4a' : hp > 30 ? '#f0c040' : '#e0533d'; ctx.fillRect(bx, by, Math.round(bw * hp / 100), Math.round(bh));
    }
    // Banner über dem Kopf (nicht für Tiere)
    let bannerOben = y - 24 * s;
    if (!e.tier && d) {
      const kopf = bild ? y + 9 * s - bild.height * s + wipp * s : y - 8 * s;
      bannerOben = zeichneBanner(x, kopf - 1 * s, s, farbe, e.typ, { ausgewaehlt, hp, stufe: 1 + (e.bef?.length || 0) });
    }
    // Status-Symbole
    if (e.volk === Z.volk) {
      let sym = null;
      if (e.modus === 'befestigt') sym = 'befestigen'; else if (e.modus === 'schlafen') sym = 'schlafen'; else if (e.modus === 'erkunden') sym = 'erkunden'; else if (e.arbeit || e.modus === 'auto_arbeit') sym = 'arbeiten'; else if (e.route) sym = 'handel'; else if (e.befoerderbar) sym = 'befoerderung';
      if (sym) { const ic = sprite('ui', sym); if (ic) male(ic, x + 8 * s, bannerOben, Math.max(1, s * 0.75)); }
    }
  });
}

// ---------- Overlay ----------
/**
 * Laufweg im Pixelstil: Punkte-Kette aus 2×2-Weltpixel-Quadraten im festen Abstand (mit dunklem Schatten) auf dem Pixelraster,
 * die Kurven laufen weich durch die Feldmitten. Am Ziel steht ein Zielkreuz aus vier Eckwinkeln.
 */
function pixelWeg(punkte, farbe, puls, mitZiel) {
  if (punkte.length < 2) return;
  const s = skala();
  // Kurve durch die Feldmitten: zwischen den Mittelpunkten der Teilstücke, Feldmitte als Kontrollpunkt (wie bei den Straßen)
  const pfad = [];
  const mitte = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let start = punkte[0];
  for (let k = 1; k < punkte.length; k++) {
    const ende = k === punkte.length - 1 ? punkte[k] : mitte(punkte[k], punkte[k + 1]);
    const kontroll = punkte[k];
    const len = Math.hypot(kontroll[0] - start[0], kontroll[1] - start[1]) + Math.hypot(ende[0] - kontroll[0], ende[1] - kontroll[1]);
    const n = Math.max(1, Math.ceil(len));
    for (let q = (k === 1 ? 0 : 1); q <= n; q++) { const u = q / n, v = 1 - u; pfad.push([v * v * start[0] + 2 * v * u * kontroll[0] + u * u * ende[0], v * v * start[1] + 2 * v * u * kontroll[1] + u * u * ende[1]]); }
    start = ende;
  }
  const quad = (wx, wy, c, dx = 0, dy = 0, g = 2) => { const [x, y] = weltZuSchirm(Math.floor(wx) + dx, Math.floor(wy) + dy); ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(g * s)), Math.max(1, Math.round(g * s))); };
  let letzter = -99, lauf = 0, vor = pfad[0];
  const punktListe = [];
  for (const p of pfad) {
    lauf += Math.hypot(p[0] - vor[0], p[1] - vor[1]); vor = p;
    if (lauf - letzter >= 5) { letzter = lauf; punktListe.push(p); }
  }
  ctx.save();
  for (const p of punktListe) quad(p[0], p[1], 'rgba(0,0,0,0.55)', 1, 1);
  for (const p of punktListe) quad(p[0], p[1], farbe);
  for (const p of punktListe) quad(p[0], p[1], 'rgba(255,255,255,0.55)', 0, 0, 1);
  if (mitZiel) {
    const [zx, zy] = punkte[punkte.length - 1];
    const off = 7 + Math.round(puls * 1.5);
    ctx.globalAlpha = 0.7 + 0.3 * puls;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (let q = 0; q < 4; q++) { quad(zx + sx * off - (sx > 0 ? q : -q), zy * 1 + sy * off, 'rgba(0,0,0,0.55)', 1, 1, 1); quad(zx + sx * off, zy + sy * off - (sy > 0 ? q : -q) * 1, 'rgba(0,0,0,0.55)', 1, 1, 1); }
      for (let q = 0; q < 4; q++) { quad(zx + sx * off - (sx > 0 ? q : -q), zy + sy * off, farbe, 0, 0, 1); quad(zx + sx * off, zy + sy * off - (sy > 0 ? q : -q), farbe, 0, 0, 1); }
    }
  }
  ctx.restore();
}

function zeichneOverlay(s, t) {
  const puls = 0.55 + 0.45 * Math.sin(t / 250);
  if (overlay.reichweite) {
    ctx.fillStyle = 'rgba(224,83,61,0.16)';
    for (const i of overlay.reichweite) { const [mx, my] = feldMitte(i, R); hexPfad(mx, my, s, 0.96); ctx.fill(); }
  }
  if (overlay.gueltig) { // z. B. mögliche Bauplätze für ein Weltwunder
    ctx.fillStyle = `rgba(90,220,120,${0.18 + 0.12 * puls})`; ctx.strokeStyle = 'rgba(120,255,150,0.85)'; ctx.lineWidth = Math.max(1, 1.5 * s);
    for (const i of overlay.gueltig) { if (ebeneVon(i) !== aktiveEbene()) continue; const [mx, my] = feldMitte(i, R); hexPfad(mx, my, s, 0.92); ctx.fill(); ctx.stroke(); }
    if (overlay.beschriftung) {
      ctx.font = `700 ${Math.round(11 * Math.min(s, 3))}px Zahlen, Silkscreen, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [i, text] of overlay.beschriftung) { if (ebeneVon(i) !== aktiveEbene()) continue; const [mx, my] = feldMitte(i, R); const [x, y] = weltZuSchirm(mx, my); ctx.fillStyle = '#000'; ctx.fillText(text, x + 1, y + 1); ctx.fillStyle = '#ffe066'; ctx.fillText(text, x, y); }
    }
  }
  if (overlay.ziele) {
    for (const i of overlay.ziele) { const [mx, my] = feldMitte(i, R); ctx.strokeStyle = `rgba(255,80,60,${puls})`; ctx.lineWidth = Math.max(2, 2 * s); hexPfad(mx, my, s, 0.9); ctx.stroke(); }
  }
  if (overlay.pfad && overlay.pfad.felder) {
    const pf = overlay.pfad;
    const aus0 = Z.auswahl?.art === 'einheit' ? Z.ansicht.einheiten[Z.auswahl.id] : null;
    const punkte = [];
    if (aus0 && pf.ok !== false) punkte.push(einheitPosition(aus0, t));
    for (const i of pf.felder) punkte.push(feldMitte(i, R));
    pixelWeg(punkte, pf.ok === false ? '#e0533d' : '#ffe066', puls, pf.ok !== false);
  }
  // Verbleibender Weg der ausgewählten, laufenden Einheit
  const sel = Z.auswahl?.art === 'einheit' ? Z.ansicht.einheiten[Z.auswahl.id] : null;
  if (sel && sel.pfad && sel.pfad.length && ebeneVon(sel.feld) === aktiveEbene() && !(overlay.pfad && overlay.pfad.felder)) {
    const jetzt = serverJetzt();
    const rest = sel.pfad.filter((p) => p.t > jetzt);
    if (rest.length) { pixelWeg([einheitPosition(sel, t), ...rest.map((p) => feldMitte(p.f, R))], '#ffe066', puls, true); schmutzig = true; }
  }
  if (overlay.hover >= 0) {
    const [mx, my] = feldMitte(overlay.hover, R);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(1, s); hexPfad(mx, my, s, 0.97); ctx.stroke();
  }
  const aus = Z.auswahl;
  let feld = null;
  if (aus?.art === 'einheit' && Z.ansicht.einheiten[aus.id]) feld = aktuellesFeld(Z.ansicht.einheiten[aus.id]);
  else if (aus?.art === 'stadt' && Z.ansicht.staedte[aus.id]) feld = Z.ansicht.staedte[aus.id].feld;
  else if (aus?.art === 'feld') feld = aus.id;
  if (feld != null && ebeneVon(feld) === aktiveEbene()) {
    const [mx, my] = feldMitte(feld, R);
    ctx.strokeStyle = `rgba(255,224,102,${puls})`; ctx.lineWidth = Math.max(2, 2 * s); hexPfad(mx, my, s, 0.95); ctx.stroke();
  }
  if (overlay.markierung != null && overlay.markierung.bis > performance.now()) {
    const [mx, my] = feldMitte(overlay.markierung.feld, R);
    ctx.strokeStyle = `rgba(120,200,255,${puls})`; ctx.lineWidth = Math.max(2, 3 * s); hexPfad(mx, my, s, 1.05); ctx.stroke();
    schmutzig = true;
  }
}

// ---------- Effekte ----------
const KAMPF_MS = 1400;
/** Wirkung laufender Kampf-Effekte auf eine Einheit: Ausfall (Nahkampf-Angreifer), Rütteln und Blitz (Getroffener), Blickrichtung. */
function kampfZustand(e, feld) {
  const z = { dx: 0, dy: 0, blitz: 0, blick: null };
  if (!effekte.length) return z;
  const jetzt = performance.now();
  for (const ef of effekte) {
    if (ef.art !== 'kampf') continue;
    const p = (jetzt - ef.start) / KAMPF_MS;
    if (p < 0 || p >= 1) continue;
    const [ax, ay] = feldMitte(ef.von, R), [bx, by] = feldMitte(ef.nach, R);
    const angreifer = ef.ae != null ? ef.ae === e.id : feld === ef.von;
    if (angreifer && !ef.fern) {
      z.blick = bx < ax;
      if (AN.bewegung() && p < 0.35) { const q = Math.sin(p / 0.35 * Math.PI) * 0.45; z.dx += (bx - ax) * q; z.dy += (by - ay) * q; }
    } else if (angreifer) z.blick = bx < ax;
    else if (feld === ef.nach && ef.schadenV > 0) {
      const treffer = ef.fern ? 0.4 : 0.22;
      const q = (p - treffer) / 0.25;
      if (q >= 0 && q < 1) { z.blitz = Math.max(z.blitz, (1 - q) * 0.75); if (AN.bewegung()) z.dx += Math.round(Math.sin(q * 40) * 2 * (1 - q)); }
      z.blick = ax < bx;
    }
  }
  return z;
}
/** Einheiten, die seit dem letzten Bild verschwunden sind und auf einem Kampffeld standen, fallen sichtbar. */
function toteErkennen(t) {
  const a = Z.ansicht; if (!a) return;
  const jetzt = performance.now();
  const felder = new Set();
  for (const ef of effekte) if (ef.art === 'kampf' && jetzt - ef.start < 3000) { felder.add(ef.nach); felder.add(ef.von); }
  for (const [id, l] of zuletzt) {
    if (a.einheiten[id] && !a.einheiten[id].in) continue;
    zuletzt.delete(id);
    if (!felder.has(l.feld) || !AN.bewegung() || a.einheiten[id]?.in) continue;
    const bild = l.tier ? sprite('tier', l.tier) : sprite('einheit', l.typ, { farbe: volkFarbe(l.volk) });
    tote.push({ bild, wx: l.wx, wy: l.wy, links: l.links, feld: l.feld, start: jetzt + 350 });
  }
  // nicht mehr gezeichnete (z. B. aus dem Bild gelaufene) Einträge aufräumen
  if (zuletzt.size > 3000) for (const [id, l] of zuletzt) if (t - l.gesehen > 60000) zuletzt.delete(id);
}
function zeichneEffekte(s, t) {
  const jetzt = performance.now();
  toteErkennen(t);
  for (let k = tote.length - 1; k >= 0; k--) {
    const d = tote[k], p = (jetzt - d.start) / 1100;
    if (p >= 1) { tote.splice(k, 1); continue; }
    if (p < 0 || ebeneVon(d.feld) !== aktiveEbene()) continue;
    const [x, y] = weltZuSchirm(d.wx, d.wy);
    AN.zeichneTod(d.bild, x, y, s, p, d.links);
  }
  for (let k = effekte.length - 1; k >= 0; k--) {
    const ef = effekte[k];
    const p = (jetzt - ef.start) / KAMPF_MS;
    if (p >= 1) { effekte.splice(k, 1); continue; }
    if (ebeneVon(ef.nach) !== aktiveEbene()) continue;
    if (ef.art === 'atom') {
      const [mx, my] = feldMitte(ef.nach, R); const [x, y] = weltZuSchirm(mx, my);
      ctx.fillStyle = `rgba(255,240,180,${1 - p})`; ctx.beginPath(); ctx.arc(x, y, (20 + p * 160) * s, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const [ax, ay] = feldMitte(ef.von, R), [bx, by] = feldMitte(ef.nach, R);
    const [sax, say] = weltZuSchirm(ax, ay - 10), [sbx, sby] = weltZuSchirm(bx, by - 8);
    const voll = AN.voll();
    if (ef.fern) {
      const art = AN.geschossArt(ef.typ) || 'kugel';
      if (p < 0.4) { if (voll) AN.zeichneGeschoss(art, sax, say, sbx, sby, p / 0.4, s); else { const q = p / 0.4; ctx.fillStyle = '#ffe066'; ctx.fillRect(Math.round(sax + (sbx - sax) * q - 2 * s), Math.round(say + (sby - say) * q - 2 * s), Math.round(4 * s), Math.round(4 * s)); } }
      else if (p < 0.75) AN.zeichneEinschlag(voll ? art : 'kugel', sbx, sby, (p - 0.4) / 0.35, s);
    } else if (p > 0.15 && p < 0.55) AN.zeichneEinschlag(voll ? 'nah' : 'kugel', sbx, sby, (p - 0.15) / 0.4, s);
    const textAuf = (wx, wy, text, farbe) => {
      const [x, y] = weltZuSchirm(wx, wy - 24 - p * 26);
      ctx.font = `700 ${Math.round(10 * Math.min(s, 3))}px Zahlen, Silkscreen, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, 2 - p * 2);
      ctx.fillStyle = '#000'; ctx.fillText(text, x + 1, y + 1); ctx.fillStyle = farbe; ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
    };
    if (ef.schadenV) textAuf(bx, by, '-' + ef.schadenV, '#ff6a50');
    if (ef.schadenA) textAuf(ax, ay, '-' + ef.schadenA, '#ffb050');
  }
}

// ---------- Tageszeit und Wetter (nur Optik) ----------
export function tageszeit(t = serverJetzt()) { return (t / (2 * 3600 * 1000)) % 1; } // ein Tag = 2 Stunden
/** 0 am Tag, 1 in tiefer Nacht (für Lichter in Städten), passend zu zeichneTageszeit. */
function nachtAnteil() { const p = tageszeit(); if (p > 0.62 && p < 0.72) return (p - 0.62) / 0.1; if (p >= 0.72 && p < 0.92) return 1; if (p >= 0.92) return (1 - p) / 0.08; return 0; }
function zeichneTageszeit() {
  const p = tageszeit();
  // 0..0.62 Tag, 0.62..0.72 Abend, 0.72..0.92 Nacht, 0.92..1 Morgen
  let a = 0, farbe = '20,30,80';
  if (p > 0.62 && p < 0.72) { a = (p - 0.62) / 0.1 * 0.32; farbe = '80,40,60'; }
  else if (p >= 0.72 && p < 0.92) a = 0.34;
  else if (p >= 0.92) { a = (1 - p) / 0.08 * 0.34; farbe = '60,50,90'; }
  if (a > 0.01) { ctx.fillStyle = `rgba(${farbe},${a})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  const jz = Z.ansicht?.welt?.jahreszeit;
  if (jz === 3) { ctx.fillStyle = 'rgba(220,235,255,0.07)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  else if (jz === 2) { ctx.fillStyle = 'rgba(200,120,40,0.05)'; ctx.fillRect(0, 0, cv.width, cv.height); }
}
export function wetterJetzt(t = serverJetzt()) {
  const block = Math.floor(t / (40 * 60 * 1000));
  const h = hash01(block, 99);
  const jz = Z.ansicht?.welt?.jahreszeit || 0;
  if (h < (jz === 3 ? 0.25 : 0.04)) return 'schnee';
  if (h < 0.22) return 'regen';
  if (h < 0.3) return 'nebel';
  return 'klar';
}
function zeichneWetter(t) {
  const w = wetterJetzt();
  if (w === 'klar') return;
  if (w === 'nebel') { ctx.fillStyle = 'rgba(200,210,220,0.13)'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  const n = 140, px = Math.max(1, Math.round(dpr * 2));
  ctx.fillStyle = w === 'regen' ? 'rgba(170,200,255,0.55)' : 'rgba(255,255,255,0.85)';
  for (let k = 0; k < n; k++) {
    const sx = (hash01(k, 1) * cv.width + (w === 'regen' ? t * 0.05 : t * 0.02) * (0.5 + hash01(k, 3))) % cv.width;
    const sy = (hash01(k, 2) * cv.height + t * (w === 'regen' ? 0.6 : 0.08) * (0.6 + hash01(k, 4))) % cv.height;
    if (w === 'regen') ctx.fillRect(Math.round(sx), Math.round(sy), px, px * 4); else ctx.fillRect(Math.round(sx), Math.round(sy), px * 1.5, px * 1.5);
  }
}

/** Sprite-Treffer: Welches eigene Objekt liegt unter einem Schirmpunkt (Einheiten über ihrem Feld anklickbar)? */
export function objektBei(sx, sy) {
  const [wx, wy] = schirmZuWelt(sx, sy);
  let best = null, bestD = Infinity;
  for (const e of Object.values(Z.ansicht?.einheiten || {})) {
    if (e.in || ebeneVon(e.feld) !== aktiveEbene()) continue;
    const [ex, ey] = einheitPosition(e, performance.now());
    const dx = wx - ex, dy = wy - (ey - 6);
    if (Math.abs(dx) < 12 && dy > -24 && dy < 12) { const d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = { art: 'einheit', id: e.id, feld: aktuellesFeld(e) }; } }
  }
  return best;
}

// Ziffern-Schrift (Zahlen) wird im Canvas erst nach dem Laden benutzt: danach einmal neu zeichnen.
document.fonts?.load?.('700 12px Zahlen', '0123456789').then(() => neuZeichnen()).catch(() => {});
