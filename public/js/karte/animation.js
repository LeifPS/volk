// Animationen der Karte auf einem gemeinsamen Takt (die Zeit t der Hauptschleife, kein Timer pro Objekt).
// Stufen (Einstellung "Effekte"): 'voll' (alles), 'reduziert' (nur Laufen und Idle), 'aus' (nichts bewegt sich außer der Position).
// Alles wird mit Rechtecken im Pixelraster gezeichnet; Koordinaten der Effekte sind Sprite-Pixel (Verbesserung 48×40, Stadt 64×56),
// umgerechnet über den Ursprung, an dem render.js das Sprite malt.
import { EINHEIT } from '../../shared/daten/index.js';
import { hash01 } from '../../shared/zufall.js';

let stufe = 'voll';
export function setzeEffekte(w) { stufe = w === 'aus' || w === 'reduziert' ? w : 'voll'; }
export const effekteStufe = () => stufe;
export const voll = () => stufe === 'voll';
export const bewegung = () => stufe !== 'aus';

/** Wartezeit zwischen zwei Bildern ohne sonstige Änderungen (ms): voll flüssiger, aus sparsam. */
export function ruheIntervall(bewegt) {
  if (stufe === 'voll') return bewegt ? 33 : 50;
  if (stufe === 'reduziert') return bewegt ? 50 : 120;
  return bewegt ? 50 : 250;
}

// ---------- Hilfen ----------
let C = null; // Zeichenkontext, von render.js je Bild gesetzt
export function kontext(ctx) { C = ctx; }
/** Rechteck in Sprite-Pixeln: Ursprung (ox, oy) in Schirmpixeln, Skala s. */
function r(ox, oy, s, x, y, w, h, farbe) { C.fillStyle = farbe; C.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); }
const welle = (t, periode, phase = 0) => ((t / periode + phase) % 1 + 1) % 1;

// ---------- Einheiten ----------
const FAHRZEUG = new Set(['streitwagen', 'leichter_panzer', 'panzer', 'schwerer_panzer', 'flakpanzer', 'moderner_kampfpanzer', 'autonomer_panzer', 'schwebepanzer', 'mondpanzer', 'antimaterie_panzer', 'lastwagenkonvoi', 'raketenartillerie', 'raketenwerfer', 'flugabwehrraketen', 'haubitze', 'artillerie', 'feldgeschuetz', 'kanone', 'panzerabwehrtrupp', 'railgun_batterie', 'gravitationswerfer', 'schildgenerator', 'laserabwehr']);
const REITER = new Set(['reiter', 'ritter', 'kuerassier', 'kavallerie', 'berittener_bogenschuetze', 'kriegselefant', 'karawane']);
/** Bewegungsart einer Einheit für die Lauf-Animation. */
export function bewegungsArt(typ, bereich, imAll) {
  if (imAll) return 'raum';
  if (bereich === 'see') return 'schiff';
  if (bereich === 'luft') return 'flug';
  if (REITER.has(typ)) return 'reiter';
  if (FAHRZEUG.has(typ) || (EINHEIT[typ]?.zeitalter >= 7 && /drohne|roboter|panzer/.test(typ))) return 'fahrzeug';
  return 'fuss';
}

/**
 * Versatz (in Sprite-Pixeln) für Laufen und Idle: { dy, dx }. Fuß: Schrittwippen; Reiter: Galopp (schneller, höher);
 * Fahrzeug: leichtes Rütteln; Schiff: Schaukeln; Flug: Schweben; Raum: langsames Gleiten. Idle: Atmen (alle 1,6 s kurz 1 px).
 */
export function einheitVersatz(art, laeuft, t, id) {
  if (stufe === 'aus') return { dx: 0, dy: art === 'flug' ? -3 : 0 };
  const ph = hash01(id, 7);
  switch (art) {
    case 'schiff': return { dx: 0, dy: Math.round(Math.sin(t / 500 + id) * 1) };
    case 'flug': return { dx: 0, dy: Math.round(Math.sin(t / 400 + id) * 1.5) - 3 };
    case 'raum': return { dx: 0, dy: Math.round(Math.sin(t / 700 + id) * 1.5) - 2 };
    case 'reiter': return laeuft ? { dx: 0, dy: -[0, 1, 2, 1][Math.floor(t / 90 + ph * 4) % 4] } : { dx: 0, dy: welle(t, 2400, ph) < 0.12 ? -1 : 0 };
    case 'fahrzeug': return laeuft ? { dx: 0, dy: Math.floor(t / 70 + ph * 3) % 3 === 0 ? -1 : 0 } : { dx: 0, dy: 0 };
    default: return laeuft ? { dx: 0, dy: Math.floor(t / 180 + ph * 2) % 2 ? -1 : 0 } : { dx: 0, dy: welle(t, 1600, ph) < 0.18 ? -1 : 0 };
  }
}

/** Zusätze beim Laufen: Staub hinter Fahrzeugen und Reitern, Bugwelle bei Schiffen, Schatten unter Flugzeugen, Antriebsglühen im All. */
export function zeichneLaufZusatz(art, laeuft, x, y, s, t, links, id) {
  if (stufe === 'aus') return;
  const hinten = links ? 1 : -1;
  if (art === 'flug') { C.fillStyle = 'rgba(0,0,0,0.22)'; C.beginPath(); C.ellipse(Math.round(x), Math.round(y + 9 * s), 7 * s, 2.5 * s, 0, 0, Math.PI * 2); C.fill(); }
  if (art === 'raum') { const f = 0.5 + 0.5 * Math.sin(t / 90 + id); r(x, y, s, hinten * 11 - 1, -6, 2, 2, `rgba(120,220,255,${0.45 + 0.4 * f})`); r(x, y, s, hinten * 13 - 1, -6, 1, 2, `rgba(200,250,255,${0.3 * f})`); }
  if (!laeuft) return;
  if (art === 'fahrzeug' || art === 'reiter') {
    for (let k = 0; k < 3; k++) {
      const p = welle(t, 600, k / 3 + hash01(id, k));
      const a = 0.45 * (1 - p);
      r(x, y, s, hinten * (8 + p * 8) - 1, 6 - p * 4, 2 + p * 2, 2 + p * 1, `rgba(170,150,120,${a})`);
    }
  }
  if (art === 'schiff') {
    for (let k = 0; k < 3; k++) {
      const p = welle(t, 800, k / 3);
      r(x, y, s, hinten * (10 + p * 10), 8 + (k - 1) * 2 * p, 2, 1, `rgba(235,245,255,${0.6 * (1 - p)})`);
    }
  }
}

// ---------- Kampf: Geschosse nach Waffe ----------
/** Geschossart nach angreifender Einheit (oder 'stadt'). */
export function geschossArt(typ) {
  if (!typ || typ === 'stadt') return 'pfeil';
  if (typ === 'tier') return null;
  const d = EINHEIT[typ]; if (!d) return 'kugel';
  if (d.zeitalter >= 7) return /rakete|bomber/.test(typ) ? 'rakete' : 'laser';
  if (d.klasse === 'rakete' || /rakete|raketen/.test(typ)) return 'rakete';
  if (d.klasse === 'belagerung' || typ === 'feldgeschuetz') return d.zeitalter >= 3 ? 'granate' : 'stein';
  if (typ === 'schleuderer') return 'stein';
  if (d.zeitalter <= 2) return 'pfeil';
  if (d.klasse === 'bomber' || d.klasse === 'jaeger') return 'bombe';
  return 'kugel';
}
/** Zeichnet das Geschoss bei Fortschritt q (0..1) von (ax, ay) nach (bx, by) in Schirmpixeln. */
export function zeichneGeschoss(art, ax, ay, bx, by, q, s) {
  const bogen = art === 'pfeil' || art === 'stein' || art === 'granate' ? Math.sin(q * Math.PI) * 22 * s : 0;
  const x = ax + (bx - ax) * q, y = ay + (by - ay) * q - bogen;
  const w = Math.atan2((by - ay) - (art === 'pfeil' ? Math.cos(q * Math.PI) * 22 * s * Math.PI : 0), bx - ax);
  const p = Math.max(1, Math.round(s));
  switch (art) {
    case 'pfeil': {
      C.save(); C.translate(Math.round(x), Math.round(y)); C.rotate(w);
      C.fillStyle = '#6a4a2a'; C.fillRect(-5 * p, -Math.floor(p / 2), 9 * p, p);
      C.fillStyle = '#d8d8e0'; C.fillRect(4 * p, -p, 2 * p, 2 * p);
      C.fillStyle = '#e8e4d0'; C.fillRect(-6 * p, -p, p, 2 * p);
      C.restore(); break;
    }
    case 'stein': C.fillStyle = '#7a7268'; C.fillRect(Math.round(x - 2 * p), Math.round(y - 2 * p), 4 * p, 4 * p); C.fillStyle = '#a49c90'; C.fillRect(Math.round(x - 2 * p), Math.round(y - 2 * p), 2 * p, 2 * p); break;
    case 'granate': {
      C.fillStyle = '#26262c'; C.fillRect(Math.round(x - 2 * p), Math.round(y - 2 * p), 4 * p, 4 * p);
      for (let k = 1; k <= 3; k++) { const qq = Math.max(0, q - k * 0.05); const sx = ax + (bx - ax) * qq, sy = ay + (by - ay) * qq - Math.sin(qq * Math.PI) * 22 * s; C.fillStyle = `rgba(200,200,200,${0.35 - k * 0.09})`; C.fillRect(Math.round(sx - 2 * p), Math.round(sy - 2 * p), 3 * p, 3 * p); }
      break;
    }
    case 'kugel': C.fillStyle = '#ffe9a0'; C.fillRect(Math.round(x - p), Math.round(y - p), 2 * p, 2 * p); if (q < 0.15) { C.fillStyle = 'rgba(255,220,120,.8)'; C.fillRect(Math.round(ax - 2 * p), Math.round(ay - 2 * p), 4 * p, 4 * p); } break;
    case 'bombe': C.fillStyle = '#30343c'; C.fillRect(Math.round(x - p), Math.round(y - 2 * p), 3 * p, 4 * p); break;
    case 'rakete': {
      C.save(); C.translate(Math.round(x), Math.round(y)); C.rotate(w);
      C.fillStyle = '#d8dce4'; C.fillRect(-4 * p, -p, 7 * p, 2 * p); C.fillStyle = '#e04030'; C.fillRect(3 * p, -p, 2 * p, 2 * p);
      C.fillStyle = '#ffd060'; C.fillRect(-6 * p, -p, 2 * p, 2 * p);
      C.restore();
      for (let k = 1; k <= 5; k++) { const qq = Math.max(0, q - k * 0.035); C.fillStyle = `rgba(220,220,220,${0.4 - k * 0.07})`; C.fillRect(Math.round(ax + (bx - ax) * qq - 2 * p), Math.round(ay + (by - ay) * qq - 2 * p), 3 * p, 3 * p); }
      break;
    }
    case 'laser': {
      const a = 1 - Math.abs(q - 0.5) * 2;
      C.strokeStyle = `rgba(120,255,240,${0.35 + 0.5 * a})`; C.lineWidth = 3 * p; C.beginPath(); C.moveTo(ax, ay); C.lineTo(bx, by); C.stroke();
      C.strokeStyle = `rgba(255,255,255,${0.6 * a})`; C.lineWidth = p; C.beginPath(); C.moveTo(ax, ay); C.lineTo(bx, by); C.stroke();
      break;
    }
  }
}
/** Einschlag: Funken (Nahkampf), Staub/Explosion (Fernkampf) bei Fortschritt p (0..1). */
export function zeichneEinschlag(art, x, y, p, s) {
  const pp = Math.max(1, Math.round(s));
  if (art === 'nah') {
    for (let k = 0; k < 6; k++) { const w = k / 6 * Math.PI * 2 + 0.4, d = (2 + p * 9) * s; C.fillStyle = `rgba(255,${230 - k * 15},120,${1 - p})`; C.fillRect(Math.round(x + Math.cos(w) * d), Math.round(y + Math.sin(w) * d), pp, pp); }
    return;
  }
  const gross = art === 'granate' || art === 'rakete' || art === 'bombe';
  C.fillStyle = `rgba(255,${200 - p * 160},80,${(1 - p) * 0.9})`; C.beginPath(); C.arc(x, y, (gross ? 5 + p * 16 : 3 + p * 8) * s, 0, Math.PI * 2); C.fill();
  if (gross) for (let k = 0; k < 5; k++) { const w = k * 1.3, d = p * 14 * s; C.fillStyle = `rgba(90,85,80,${(1 - p) * 0.6})`; C.fillRect(Math.round(x + Math.cos(w) * d - 2 * pp), Math.round(y - p * 10 * s + Math.sin(w) * d * 0.5), 3 * pp, 3 * pp); }
}

// ---------- Verbesserungen ----------
// Je Kette: Betrieb (immer), dazu alle ~25 s ein "Ernte-Moment" mit goldenen Funken (Phase je Feld verschieden).
const ANIM_VERBESSERUNG = {
  farm(ox, oy, s, t, i) { for (let k = 0; k < 4; k++) { const p = welle(t, 2200, k / 4 + hash01(i, 1)); r(ox, oy, s, 6 + p * 30, 12 + k * 4, 3, 1, `rgba(255,246,190,${0.55 * Math.sin(p * Math.PI)})`); } },
  terrasse(ox, oy, s, t, i) { ANIM_VERBESSERUNG.farm(ox, oy, s, t, i); },
  kuppelfarm(ox, oy, s, t, i) { const a = 0.25 + 0.2 * Math.sin(t / 900 + i); r(ox, oy, s, 14, 10, 20, 2, `rgba(180,255,200,${a})`); },
  mine(ox, oy, s, t, i) {
    const p = welle(t, 3600, hash01(i, 2)), raus = p < 0.5 ? p * 2 : 2 - p * 2; // Förderkorb fährt hinaus und zurück
    const cx = 22 + raus * 12;
    r(ox, oy, s, cx, 25, 5, 3, '#4a3a2a'); r(ox, oy, s, cx + 1, 24, 3, 1, '#8a7a68'); r(ox, oy, s, cx, 28, 1, 1, '#22201e'); r(ox, oy, s, cx + 4, 28, 1, 1, '#22201e');
    if (raus > 0.92) for (let k = 0; k < 3; k++) r(ox, oy, s, cx + 2 + k * 2, 22 - k * 2 - (raus - 0.92) * 40, 2, 2, `rgba(180,170,150,${0.5})`);
  },
  mondmine(...a) { ANIM_VERBESSERUNG.mine(...a); }, marsmine(...a) { ANIM_VERBESSERUNG.mine(...a); },
  steinbruch(ox, oy, s, t, i) { const p = welle(t, 2600, hash01(i, 3)); if (p < 0.4) for (let k = 0; k < 4; k++) r(ox, oy, s, 28 + k * 3 - p * 6, 24 - p * 20 - k, 2, 2, `rgba(200,190,170,${0.6 * (1 - p / 0.4)})`); },
  lehmgrube(...a) { ANIM_VERBESSERUNG.steinbruch(...a); },
  holzfaeller(ox, oy, s, t, i) {
    const p = welle(t, 900, hash01(i, 4));
    r(ox, oy, s, 20 + (p < 0.5 ? 0 : 1), 20, 2, 2, p < 0.5 ? '#e8e8f0' : '#9a9aa8'); // Sägeblatt blitzt
    if (p > 0.6) r(ox, oy, s, 24 + (p - 0.6) * 15, 22 - (p - 0.6) * 18, 1, 1, '#e0c080'); // Späne
  },
  plantage(ox, oy, s, t, i) { for (let k = 0; k < 5; k++) { const on = Math.floor(t / 400 + k * 1.7 + i) % 3 === 0; if (on) r(ox, oy, s, 10 + k * 6, 11 + (k % 2) * 6, 1, 1, '#a8f080'); } },
  weide(ox, oy, s, t, i) { const p = welle(t, 7000, hash01(i, 5)); const x = 8 + Math.abs(p * 2 - 1) * 26; r(ox, oy, s, x, 30, 3, 2, '#f2efe6'); r(ox, oy, s, x + (p < 0.5 ? 3 : -1), 29, 1, 1, '#f2efe6'); },
  jagdlager(ox, oy, s, t, i) { const p = welle(t, 5000, hash01(i, 6)); r(ox, oy, s, 4 + p * 40, 6 + Math.sin(p * 20) * 2, 2, 1, '#2a2a2a'); },
  fischerboote(ox, oy, s, t, i) {
    for (const [bx, by] of [[14, 30], [32, 32]]) { const p = welle(t, 1800, bx / 40 + hash01(i, 7)); r(ox, oy, s, bx - 3 - p * 4, by, 2 + p * 8, 1, `rgba(220,240,255,${0.5 * (1 - p)})`); }
  },
  aquakultur(...a) { ANIM_VERBESSERUNG.fischerboote(...a); },
  oelplattform(ox, oy, s, t) { const f = Math.floor(t / 110) % 3; r(ox, oy, s, 46, 4 - f, 2, 3 + f, '#ff9a20'); r(ox, oy, s, 46, 6, 2, 2, '#ffe070'); },
  bohrturm(ox, oy, s, t, i) { const p = Math.sin(t / 500 + i); r(ox, oy, s, 31, 14 + p * 1.5, 4, 2, '#f0c030'); },
  deuterium(ox, oy, s, t, i) { const a = 0.35 + 0.35 * Math.sin(t / 600 + i); r(ox, oy, s, 36, 8, 3, 14, `rgba(140,240,255,${a})`); },
  heliumextraktor(...a) { ANIM_VERBESSERUNG.deuterium(...a); }, eisfoerderung(...a) { ANIM_VERBESSERUNG.deuterium(...a); }, asteroidenbohrer(...a) { ANIM_VERBESSERUNG.mine(...a); },
  wassermuehle(ox, oy, s, t) { const w = t / 700; for (let k = 0; k < 2; k++) { const a = w + k * Math.PI; r(ox, oy, s, 31 + Math.cos(a) * 5, 21 + Math.sin(a) * 5, 1, 1, '#e8d8b0'); } r(ox, oy, s, 36 + (Math.floor(t / 150) % 3), 28, 2, 1, 'rgba(230,245,255,.7)'); },
  windpark(ox, oy, s, t) { const an = Math.floor(t / 900) % 2 === 0; for (const [x, y] of [[14, 3], [25, 5], [35, 2]]) if (an) r(ox, oy, s, x, y, 1, 1, '#ff4030'); },
  solarpark(ox, oy, s, t, i) { const p = welle(t, 4200, hash01(i, 8)); r(ox, oy, s, 6 + p * 34, 13 + p * 10, 3, 1, `rgba(255,255,255,${0.6 * Math.sin(p * Math.PI)})`); },
  observatorium(ox, oy, s, t, i) { for (let k = 0; k < 3; k++) if (Math.floor(t / 500 + k * 2 + i) % 4 === 0) r(ox, oy, s, 8 + k * 14, 1 + (k % 2) * 3, 1, 1, '#fff6c8'); },
  leuchtturm(ox, oy, s, t) { const p = welle(t, 3000), rechts = p < 0.5; const a = Math.sin(p * Math.PI * 2) ** 2; C.fillStyle = `rgba(255,250,190,${0.35 * a})`; const x0 = ox + 24 * s, y0 = oy + 5 * s; C.beginPath(); C.moveTo(x0, y0); C.lineTo(x0 + (rechts ? 26 : -26) * s, y0 - 4 * s); C.lineTo(x0 + (rechts ? 26 : -26) * s, y0 + 5 * s); C.closePath(); C.fill(); },
  aussenposten(ox, oy, s, t) { const w = t / 600; r(ox, oy, s, 23 + Math.cos(w) * 4, 9 + Math.sin(w) * 2, 1, 1, '#80ff90'); },
  fort(ox, oy, s, t) { const f = Math.floor(t / 250) % 2; r(ox, oy, s, 35, 4 + f, 3, 1, 'rgba(255,255,255,.55)'); },
  handelsposten(ox, oy, s, t, i) { if (welle(t, 3000, hash01(i, 9)) < 0.12) r(ox, oy, s, 30, 16, 2, 2, '#ffe066'); },
  salzwerk(ox, oy, s, t, i) { if (Math.floor(t / 300 + i) % 5 === 0) r(ox, oy, s, 18 + hash01(i, Math.floor(t / 300)) * 14, 20, 1, 1, '#ffffff'); },
  pilzzucht(ox, oy, s, t, i) { const p = welle(t, 2500, hash01(i, 10)); r(ox, oy, s, 22 + Math.sin(p * 6) * 3, 22 - p * 14, 1, 1, `rgba(200,255,180,${1 - p})`); },
  irrlichtschrein(ox, oy, s, t, i) { for (let k = 0; k < 3; k++) { const w = t / 900 + k * 2.1 + i; r(ox, oy, s, 22 + Math.cos(w) * 10, 14 + Math.sin(w * 1.3) * 5, 2, 2, `rgba(150,240,255,${0.5 + 0.3 * Math.sin(w * 3)})`); } },
  ferienanlage(ox, oy, s, t, i) { if (welle(t, 2000, hash01(i, 11)) < 0.1) r(ox, oy, s, 26, 24, 2, 2, '#ffffff'); },
};
const KETTE_ALIAS = { holzfaeller: 'holzfaeller', deuterium: 'deuterium', observatorium: 'observatorium', leuchtturm: 'leuchtturm', aussenposten: 'aussenposten' };

/** Betrieb einer Verbesserung (Sprite-Ursprung ox, oy) und Ernte-Moment. kette aus den Verbesserungsdaten. */
export function zeichneVerbesserungAnim(kette, ox, oy, s, t, i) {
  if (stufe !== 'voll' || !kette) return;
  const f = ANIM_VERBESSERUNG[KETTE_ALIAS[kette] || kette];
  if (f) f(ox, oy, s, t, i);
  // Ernte-Moment: kurze goldene Funken, alle ~25 s je Feld zu einer anderen Zeit
  if (['farm', 'terrasse', 'plantage', 'mine', 'holzfaeller', 'fischerboote', 'weide', 'steinbruch', 'aquakultur'].includes(kette)) {
    const p = welle(t, 25000, hash01(i, 12));
    if (p < 0.06) { const q = p / 0.06; for (let k = 0; k < 4; k++) r(ox, oy, s, 16 + k * 5, 14 - q * 10 - (k % 2) * 3, 1, 1, `rgba(255,224,102,${1 - q})`); }
  }
}

// ---------- Städte ----------
/**
 * Leben in der Stadt (Sprite-Ursprung ox, oy, Stadtsprite 64×56): Rauch aus Kaminen (ab Industrie Schlote),
 * Lichter bei Nacht, kleine Leute auf den Gassen, wehende Fahne in Volksfarbe, Hafenbetrieb bei Küstenstädten.
 */
export function zeichneStadtAnim(st, ox, oy, s, t, o) {
  if (stufe !== 'voll') return;
  const za = st.zeitalter || 0, id = st.id | 0;
  // Rauch: Herdfeuer früh, Schlote ab Industrie (dichter, grauer)
  if (o.wetter) {
    const quellen = za >= 4 ? [[40, 8], [46, 12]] : [[22, 16]];
    for (const [qx, qy] of quellen) for (let k = 0; k < 3; k++) {
      const p = welle(t, za >= 4 ? 1600 : 2400, k / 3 + qx / 50);
      const g = za >= 4 ? 120 : 170;
      r(ox, oy, s, qx + Math.sin(p * 4 + k) * 1.5 + p * 3, qy - p * 16, 2 + p * 2, 2 + p * 2, `rgba(${g},${g},${g},${0.45 * (1 - p)})`);
    }
  }
  // Lichter bei Nacht: Fenster glimmen, einzelne flackern
  if (o.nacht > 0.05) {
    const n = 6 + Math.min(10, st.bev || 1);
    for (let k = 0; k < n; k++) {
      const lx = 10 + hash01(id, k * 2) * 44, ly = 22 + hash01(id, k * 2 + 1) * 24;
      const fl = Math.floor(t / 700 + k * 3) % 9 === 0 ? 0.4 : 1;
      r(ox, oy, s, lx, ly, 1, 1, `rgba(255,214,120,${o.nacht * 0.95 * fl})`);
    }
  }
  // Leute: kleine Punkte, die hin und her gehen
  const leute = Math.min(4, 1 + Math.floor((st.bev || 1) / 6));
  for (let k = 0; k < leute; k++) {
    const p = welle(t, 9000 + k * 1700, hash01(id, 30 + k));
    const x = 14 + Math.abs(p * 2 - 1) * 36, y = 49 + (k % 2) * 3;
    r(ox, oy, s, x, y - 1, 1, 1, '#e8c8a0'); r(ox, oy, s, x, y, 1, 1, ['#8a3a2a', '#2a4a8a', '#4a6a2a', '#6a4a8a'][k]);
  }
  // Fahne am höchsten Punkt, in Volksfarbe, weht
  const f = Math.floor(t / 220 + id) % 3;
  r(ox, oy, s, 31, 0, 1, 8, '#3a3028');
  r(ox, oy, s, 32, 1, 4, 1, o.farbe); r(ox, oy, s, 32, 2, 5 - (f === 1 ? 1 : 0), 1, o.farbe); r(ox, oy, s, 32, 3, 4 + (f === 2 ? 1 : 0), 1, o.farbe);
  // Hafen: kleines Boot pendelt vor der Stadt
  if (o.hafen) { const p = welle(t, 12000, hash01(id, 40)); const bx = 4 + Math.abs(p * 2 - 1) * 14; r(ox, oy, s, bx, 52, 5, 2, '#6a4a2a'); r(ox, oy, s, bx + 2, 48, 1, 4, '#e8e0d0'); r(ox, oy, s, bx + 3, 49, 2, 2, '#f2efe6'); }
}

// ---------- Wunder und Naturwunder ----------
/** Glimmen über fertigen Wundern (Lichtfunken steigen auf), Dampf bei Zukunftswundern. b, h: Bildbreite und -höhe auf dem Schirm. */
export function zeichneWunderAnim(id, x0, y0, b, h, s, t, zeitalter) {
  if (stufe !== 'voll') return;
  const pp = Math.max(1, Math.round(s));
  for (let k = 0; k < 4; k++) {
    const p = welle(t, 3200, k / 4 + hash01(id.length, k));
    const x = x0 + b * (0.2 + 0.6 * hash01(k, id.length + 3)), y = y0 + h * (0.55 - p * 0.6);
    C.fillStyle = `rgba(255,236,150,${0.7 * Math.sin(p * Math.PI)})`; C.fillRect(Math.round(x), Math.round(y), pp, pp);
  }
  if (zeitalter >= 7) for (let k = 0; k < 3; k++) {
    const p = welle(t, 2600, k / 3);
    C.fillStyle = `rgba(210,240,255,${0.35 * (1 - p)})`; C.fillRect(Math.round(x0 + b * (0.35 + k * 0.15)), Math.round(y0 + h * (0.2 - p * 0.3)), Math.round((2 + p * 3) * s), Math.round((2 + p * 3) * s));
  }
}
/** Lichtspiel über Naturwundern: wandernde Lichtpunkte. */
export function zeichneNaturwunderAnim(x, y, b, h, s, t, id) {
  if (stufe !== 'voll') return;
  const pp = Math.max(1, Math.round(s));
  for (let k = 0; k < 5; k++) {
    const p = welle(t, 4000 + k * 600, hash01(id.length, k));
    const px = x + b * (0.15 + 0.7 * hash01(k, id.length)), py = y + h * (0.7 - 0.5 * p);
    C.fillStyle = `rgba(255,255,230,${0.6 * Math.sin(p * Math.PI)})`; C.fillRect(Math.round(px), Math.round(py), pp, pp);
  }
}

// ---------- Tod ----------
/** Gefallene Einheit: Sprite sinkt, kippt und verblasst, Rauch steigt auf (p 0..1). */
export function zeichneTod(bild, x, y, s, p, links) {
  if (!bild) return;
  C.save();
  C.globalAlpha = Math.max(0, 1 - p);
  C.translate(Math.round(x), Math.round(y + 9 * s));
  if (links) C.scale(-1, 1);
  C.rotate(p * 0.9);
  C.drawImage(bild, Math.round(-(bild.width / 2) * s), Math.round(-bild.height * s + p * 6 * s), Math.round(bild.width * s), Math.round(bild.height * s));
  C.restore();
  for (let k = 0; k < 4; k++) { const q = Math.min(1, p * 1.2 + k * 0.08); C.fillStyle = `rgba(110,105,100,${0.5 * (1 - q)})`; C.fillRect(Math.round(x + (k - 1.5) * 4 * s), Math.round(y - q * 22 * s), Math.round((3 + q * 3) * s), Math.round((3 + q * 3) * s)); }
}

/** Für Tests: hat diese Verbesserungskette eine Betriebs-Animation? */
export function hatVerbesserungAnim(kette) { return !!ANIM_VERBESSERUNG[KETTE_ALIAS[kette] || kette]; }
