// Sprites der Zeitalter 7 bis 10 (KI, Fusion, Weltraum, Sterne). Siehe PLAN-ZEITALTER-8-11.md.
// Land- und Zivileinheiten. 32x32, Blick nach rechts, Füße/Ketten unten bei y≈30, Licht von oben links.
// Spielerfarbe über 'S', 'S-', 'S+', 'S--'.
// Leuchtende Teile (Strahlen, Schwebepolster, Schilde, Schwarmteilchen) werden NACH dem Umriss gezeichnet,
// damit sie wie Licht wirken und keinen dunklen Rand bekommen. Darum setzen alle Sprites hier ihren
// Umriss selbst (umriss: false, dann p.umriss() an der passenden Stelle).
import { definiere } from '../sprites.js';
import { PAL, hell, dunkel, Pinsel, UMRISS } from '../pixel.js';

const S = 'S', SD = 'S-', SH = 'S+', SDD = 'S--';
/** Dunkler/heller Ton, funktioniert auch mit Spielerfarben-Platzhaltern. */
const dk = (c, t = 0.25) => (c === S ? SD : c === SH ? S : c === SD ? SDD : c === SDD ? SDD : dunkel(c, t));
const hl = (c, t = 0.25) => (c === S ? SH : c === SD ? S : c === SDD ? SD : c === SH ? SH : hell(c, t));

// ---------------------------------------------------------------- Farbwelten der vier Zeitalter

/** KI-Zeitalter: kühles Weiß-Grau, Karbon, Glas, Blau. */
const KI = {
  weiss: '#e3e8ee', grau: '#aab4c0', grauD: '#717c8a', carbon: '#2d333b', carbonH: '#4a535e',
  glas: '#6cc8f4', glasD: '#3a86bf', glasH: '#d6f3ff', blau: '#5b8cff', licht: '#9fdcff',
};
/** Fusionszeitalter: Weiß, warmes Creme, orange Leuchtbänder, Plasma. */
const FU = {
  weiss: '#f6f2ea', creme: '#d8d0c0', grauD: '#8c8374', dunkel: '#3a342e',
  orange: '#f2a33a', glut: '#ffd27a', kern: '#fff5d6', rot: '#e2682a',
};
/** Weltraumzeitalter: Raumanzug-Weiß, Violett, goldenes Visier. */
const WR = {
  anzug: '#efecf5', anzugD: '#bdb6cc', anzugDD: '#857c98', violett: '#8e7cc3', violettD: '#5f5091', violettH: '#bfb0ee',
  visier: '#e6b545', visierD: '#a67a22', visierH: '#fff1b8', metall: '#8f90a0', metallD: '#5c5d6c', gitter: '#3e3d4a',
};
/** Sternenzeitalter: kristallines Weiß, Eisblau, Violett, Antimaterie-Leuchten. */
const ST = {
  kristall: '#eef4fb', eis: '#bcd6f2', eisD: '#7f9ccc', tief: '#463c78', tiefD: '#2c2552',
  violett: '#a374e6', violettH: '#d6bcff', kern: '#ffffff', cyan: '#a6f2ff', cyanD: '#5cc4e0',
};
const KREUZ = '#d8261c';

// ---------------------------------------------------------------- Grundwerkzeuge

/**
 * Zeichnet fn auf ein eigenes Blatt, schattiert es optional und überträgt es.
 * o.rand setzt eine Trennlinie um das Teil, aber nur dort, wo darunter schon etwas gezeichnet ist
 * (innere Kanten). Die Außenkante macht der Gesamtumriss, so bleibt sie überall genau 1 Pixel dick.
 */
function lage(p, fn, o = {}) {
  const t = new Pinsel(p.w, p.h); fn(t);
  if (o.schatten !== 0) t.schattieren(o.schatten ?? 0.18);
  const teil = t.feld.slice();
  if (o.rand) t.umriss(o.rand === true ? UMRISS : o.rand);
  for (let i = 0; i < t.feld.length; i++) {
    if (teil[i]) p.feld[i] = teil[i];
    else if (t.feld[i] && p.feld[i]) p.feld[i] = t.feld[i];
  }
}
/** Linie mit Dicke d (weitere Linien nach unten bzw. bei senk nach rechts versetzt). */
function strich(p, x0, y0, x1, y1, c, d = 2, senk = false) {
  for (let i = 0; i < d; i++) senk ? p.linie(x0 + i, y0, x1 + i, y1, c) : p.linie(x0, y0 + i, x1, y1 + i, c);
}
/** Rohr unter Winkel (Grad, 0 = rechts, positiv = nach oben). Gibt die Mündung zurück. */
function rohr(p, x, y, laenge, winkel, dicke, c, cH) {
  const r = winkel * Math.PI / 180, ex = Math.cos(r), ey = -Math.sin(r);
  for (let i = 0; i <= laenge; i += 0.5) for (let k = 0; k < dicke; k++) {
    p.px(x + ex * i + (-ey) * k * 0.9, y + ey * i + ex * k * 0.9, k === 0 && cH ? cH : c);
  }
  return [Math.round(x + ex * laenge), Math.round(y + ey * laenge)];
}
/** Schachbrett-Raster (Dithering) für durchscheinende Flächen. Nur Pixel, für die maske(x,y) gilt. */
function raster(p, x, y, w, h, c, phase = 0, maske = null) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if ((x + i + y + j + phase) % 2) continue;
    if (maske && !maske(x + i, y + j)) continue;
    p.px(x + i, y + j, c);
  }
}
/** Setzt c nur auf bisher leere Pixel (für Leuchten hinter Körpern). */
function leerPx(p, x, y, c) { if (!p.hole(x, y)) p.px(x, y, c); }
/** Ein Sprite mit selbst gesetztem Umriss anmelden. */
function einheit(id, zeichne) { definiere('einheit', id, { w: 32, h: 32, umriss: false, zeichne }); }
/** Weiches Leuchten: gerasterte Pixel um einen Punkt, nur auf leere Felder (nach dem Umriss zeichnen). */
function schein(p, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if (Math.hypot(x - cx, y - cy) <= r + 0.2 && (x + y) % 2 === 0) leerPx(p, x, y, c);
  }
}
/**
 * Schwebepolster unter einem Fahrzeug (nach dem Umriss zeichnen): leuchtende Zeilen, nach unten ausdünnend,
 * dazu optional ein dunkler Bodenschatten bei y=30.
 */
function schwebeLicht(p, x0, x1, y, farben, boden = true) {
  farben.forEach((c, j) => {
    for (let x = x0 + j; x <= x1 - j; x++) if (j === 0 || (x + j) % 2 === 0) leerPx(p, x, y + j, c);
  });
  if (boden) for (let x = x0 + 2; x <= x1 - 2; x++) leerPx(p, x, 30, '#1c1a26');
}

// ---------------------------------------------------------------- Figuren

/**
 * Gepanzerte Figur der Zukunft (Blick rechts, Füße bei y=30). Zeichnet Beine, Rumpf und hinteren Arm.
 * Kopf/Helm, Waffe und vorderer Arm folgen im jeweiligen Sprite.
 * o: platte (Panzerplatten), gelenk (Anzug darunter), stiefel, brust (Brustplatte, Standard Spielerfarbe, null = keine),
 *    breit (wuchtiger), pose ('stehen' | 'schritt' | 'knien'), handHinten [x,y]
 */
function ruestling(p, o = {}) {
  const pl = o.platte, ge = o.gelenk, st = o.stiefel || ge;
  const b = o.breit ? 1 : 0;
  const knien = o.pose === 'knien';
  const u = knien ? 4 : 0;
  const hh = o.handHinten || [11, 22 + u];
  // Arm und Beine flach (dünne Schrägen würden durch Schattierung fleckig), Glanzkanten von Hand
  lage(p, (q) => {
    strich(q, 12, 17 + u, hh[0], hh[1], dk(pl, 0.3), 2 + b, true);
    const plD = dk(pl, 0.25);
    if (knien) {
      q.rect(11, 26, 4, 3, plD); q.rect(8, 28, 6, 2, plD); q.rect(6, 29, 3, 2, st);
      q.rect(15, 24, 6, 3, pl); q.rect(18, 26, 3 + b, 4, pl); q.rect(18, 29, 5, 2, st);
      q.rect(15, 24, 6, 1, hl(pl, 0.4)); q.px(19, 25, ge);
    } else if (o.pose === 'schritt') {
      strich(q, 12, 23, 10, 28, plD, 3, true); q.rect(9, 29, 5 + b, 2, st);
      strich(q, 15, 23, 18, 28, pl, 3, true); q.rect(18, 29, 5 + b, 2, st);
      q.linie(15, 23, 18, 28, hl(pl, 0.4));
      q.px(11, 26, ge).px(17, 26, ge);
    } else {
      q.rect(11, 23, 3 + b, 6, plD); q.rect(10, 29, 5 + b, 2, st);
      q.rect(16, 23, 3 + b, 6, pl); q.rect(16, 29, 5 + b, 2, st);
      q.rect(16, 23, 1, 6, hl(pl, 0.4));
      q.px(12, 26, ge).px(17, 26, ge);
    }
  }, { schatten: 0 });
  // Rumpf mit Licht von oben links
  lage(p, (q) => {
    q.rect(11 - b, 15 + u, 9 + b, 8, pl);
    q.rect(11 - b, 22 + u, 9 + b, 2, ge);
  }, { schatten: 0.16 });
  // Brustplatte in Spielerfarbe
  const br = o.brust === undefined ? S : o.brust;
  if (br) { p.rect(13, 16 + u, 6, 5, br); p.rect(13, 16 + u, 6, 1, hl(br)); p.rect(13, 20 + u, 6, 1, dk(br)); }
}

/** Helme, (x,y) = linke obere Ecke, Gesicht nach rechts. */
function helm(p, x, y, typ) {
  const k = {
    // KI: Vollhelm mit breitem Glasvisier
    ki: { z: ['.wwww..', 'wwwwww.', 'wwwgggh', 'wwwgGgg', 'dwwgggg', '.dddcc.', '..cc...'],
      f: { w: KI.weiss, d: KI.grau, g: KI.glasD, G: KI.glasH, h: KI.glas, c: KI.carbon } },
    // Fusion: kantiger weißer Helm, T-Schlitz glüht orange
    fusion: { z: ['.wwwww.', 'wwwwwww', 'wwwkooo', 'wwwwkoW', 'dwwwkow', '.ddwwww', '..dddd.'],
      f: { w: FU.weiss, d: FU.creme, k: FU.dunkel, o: FU.orange, W: FU.glut } },
    // Weltraum: runder Raumhelm mit goldenem Visier
    raum: { z: ['..aaaa..', '.aaaaaa.', 'aaaavvva', 'aaavVvvv', 'aaavvvvv', 'aaaavvva', '.dddddd.', '..mmmm..'],
      f: { a: WR.anzug, d: WR.anzugD, v: WR.visier, V: WR.visierH, m: WR.metall } },
  }[typ];
  lage(p, (q) => q.karte(x, y, k.z, k.f), { schatten: 0.12 });
}

/** Kleine Quadrokopter-Drohne (7x4), Mitte (x,y). koerper = Rumpffarbe, licht = Positionslicht. */
function drohne(p, x, y, koerper = S, licht = KI.licht) {
  p.karte(x - 3, y - 2, ['rr...rr', '.cbbbc.', '..blb..', '..c.c..'],
    { r: '#c6d0da', c: KI.carbon, b: koerper, l: licht });
}

// ================================================================ KI-Zeitalter

// Exoskelett-Infanterie: Soldat im kraftverstärkten Anzug, Karbon-Rahmen an den Beinen, Glasvisier.
einheit('exoskelett_infanterie', (p) => {
  ruestling(p, { platte: KI.weiss, gelenk: KI.carbon, pose: 'schritt', handHinten: [10, 21] });
  // Energieeinheit auf dem Rücken
  lage(p, (q) => { q.rect(7, 15, 4, 8, KI.carbonH); q.rect(8, 14, 2, 1, KI.carbonH); }, { schatten: 0.15 });
  p.px(8, 17, KI.blau).px(8, 19, KI.blau).px(9, 17, KI.licht);
  // Exo-Streben an den Beinen
  p.linie(13, 23, 11, 28, KI.carbon).linie(15, 23, 18, 28, KI.carbon);
  p.px(11, 26, KI.blau).px(17, 26, KI.blau);
  // Schulterpanzer mit Spielerfarbe
  lage(p, (q) => { q.rect(14, 14, 6, 4, KI.weiss); q.rect(15, 13, 4, 1, KI.weiss); }, { schatten: 0.15 });
  p.rect(15, 15, 4, 1, S).px(19, 15, SD);
  helm(p, 13, 7, 'ki');
  p.linie(13, 7, 12, 4, KI.carbon); p.px(12, 3, KI.licht); // Antenne
  // Karabiner mit Leuchtvisier
  lage(p, (q) => {
    q.rect(15, 19, 11, 2, KI.grau); q.rect(26, 19, 3, 1, KI.carbon); q.rect(17, 21, 2, 2, KI.carbon); q.rect(21, 21, 2, 1, KI.carbon);
    q.rect(19, 18, 4, 1, KI.carbon);
  }, { schatten: 0.15 });
  p.px(22, 18, KI.glas).rect(16, 19, 9, 1, KI.weiss).px(24, 20, KI.blau);
  // vorderer Arm
  strich(p, 16, 17, 18, 20, KI.weiss, 2, true); p.px(16, 17, '#ffffff');
  p.px(19, 21, KI.carbon).px(20, 21, KI.carbon);
  p.umriss();
  p.px(29, 19, KI.licht); // Mündungslicht
});

// Kampfroboter: zweibeinig mit Vogelbeinen, kantiger Rumpf mit Sensorauge, Armkanone und Raketenkasten.
einheit('kampfroboter', (p) => {
  const w = KI.weiss, g = KI.grau, gd = KI.grauD, c = KI.carbon;
  // Vogelbein als Pixelkarte: Hüfte -> Knie nach vorn -> Ferse nach hinten -> Krallenfuß
  const BEIN = [
    '.ccccc......',
    '.fffff......',
    '..fffff.....',
    '...fffff....',
    '....fffff...',
    '.....ccbcc..',
    '.....FFccc..',
    '....FFFF....',
    '...FFFF.....',
    '..FFFF......',
    '..FFcc......',
    '.cccccccc...',
    'cc..c...cc..',
  ];
  // hinteres Bein dunkler, vorderes hell mit Glanzkante (keine Trennlinie, sonst wird es fleckig)
  lage(p, (q) => q.karte(4, 18, BEIN, { c: c, f: gd, F: dunkel(gd, 0.25), b: KI.glasD }), { schatten: 0 });
  lage(p, (q) => q.karte(11, 18, BEIN, { c: c, f: g, F: gd, b: KI.blau }), { schatten: 0 });
  p.linie(12, 19, 15, 22, KI.weiss).linie(15, 25, 13, 27, KI.grau);
  // Hüftgelenk
  lage(p, (q) => { q.rect(7, 16, 10, 3, c); }, { schatten: 0.1 });
  // Rumpf
  lage(p, (q) => {
    q.poly([[6, 8], [19, 7], [24, 10], [24, 15], [20, 17], [7, 17], [5, 14]], w);
  }, { schatten: 0.2, rand: true });
  p.rect(7, 12, 11, 3, S).rect(7, 12, 11, 1, SH).rect(7, 14, 11, 1, SD);
  p.linie(13, 9, 13, 16, g).px(9, 9, '#ffffff');
  // Sensorkopf: schwarzes Band mit blauem Auge
  p.rect(17, 9, 7, 3, c).rect(20, 10, 3, 1, KI.glas).px(22, 10, KI.glasH);
  // Raketenkasten auf der Schulter
  lage(p, (q) => { q.rect(6, 3, 7, 5, g); q.rect(6, 3, 7, 1, w); }, { schatten: 0.1, rand: true });
  for (let i = 0; i < 3; i++) p.px(7 + i * 2, 5, c).px(7 + i * 2, 6, KI.blau);
  // Armkanone (Mehrfachlauf)
  lage(p, (q) => {
    q.rect(15, 14, 7, 5, gd); q.rect(22, 15, 8, 1, c); q.rect(22, 17, 8, 1, c); q.rect(22, 16, 7, 1, KI.carbonH); q.rect(25, 14, 2, 5, g);
  }, { schatten: 0.15, rand: true });
  p.rect(16, 15, 3, 1, S);
  p.umriss();
  p.px(30, 16, KI.licht).px(31, 16, KI.glas);
});

// Drohnenschwarm: Bediener mit Steuertafel, Startkasten, mehrere Drohnen in der Luft.
einheit('drohnenschwarm', (p) => {
  ruestling(p, { platte: KI.grau, gelenk: KI.carbon, pose: 'stehen', handHinten: [12, 21] });
  helm(p, 13, 9, 'ki');
  // Startkasten mit offenen Röhren
  lage(p, (q) => { q.rect(22, 22, 9, 7, KI.weiss); q.rect(21, 29, 11, 2, KI.carbon); }, { schatten: 0.18, rand: true });
  p.rect(23, 25, 7, 2, S).rect(23, 25, 7, 1, SH);
  for (let i = 0; i < 3; i++) p.rect(23 + i * 3, 22, 2, 2, KI.carbon);
  p.px(24, 23, KI.blau).px(30, 28, KI.licht);
  // Steuertafel in den Händen (leuchtet)
  strich(p, 16, 17, 18, 20, KI.weiss, 2, true);
  lage(p, (q) => { q.rect(18, 18, 4, 3, KI.carbon); }, { schatten: 0, rand: true });
  p.rect(19, 18, 2, 2, KI.glas).px(19, 18, KI.glasH);
  // Drohnen im Formationsflug
  drohne(p, 5, 4); drohne(p, 15, 2); drohne(p, 26, 4); drohne(p, 24, 12, SD); drohne(p, 6, 11, SD);
  p.umriss();
  // Steuerlinks als feine Lichtpunkte
  p.px(21, 16, KI.licht).px(22, 14, KI.licht).px(26, 20, KI.licht).px(26, 18, KI.licht);
});

// Autonomer Panzer: flach, keine Luke, Sensormast, fernbediente Waffenstation, weiß-graue Keilpanzerung.
einheit('autonomer_panzer', (p) => {
  const w = KI.weiss, g = KI.grau, c = KI.carbon;
  // Gummiketten
  lage(p, (q) => {
    q.rect(3, 25, 24, 5, c); q.ellipse(4, 27, 2, 2, c); q.ellipse(26, 27, 2, 2, c);
    for (let i = 0; i < 6; i++) q.kreis(6 + i * 4, 27, 1.5, KI.grauD);
  }, { schatten: 0.12 });
  for (let x = 4; x < 27; x += 2) p.px(x, 25, KI.carbonH);
  // flache Wanne mit Schürze
  lage(p, (q) => {
    q.poly([[1, 20], [24, 19], [31, 22], [29, 25], [1, 25]], w);
  }, { schatten: 0.18 });
  p.rect(2, 24, 27, 1, g);
  p.rect(4, 22, 11, 2, S).rect(4, 22, 11, 1, SH);
  p.rect(17, 22, 9, 1, KI.blau); // Leuchtband
  // niedriger Waffenturm ohne Luke
  lage(p, (q) => {
    q.poly([[6, 19], [8, 15], [19, 14], [23, 17], [23, 19]], g);
    q.rect(23, 16, 9, 1, c); q.rect(23, 17, 6, 1, KI.carbonH);
  }, { schatten: 0.18, rand: true });
  p.rect(9, 16, 8, 1, w).rect(10, 17, 6, 1, S);
  // Sensormast mit Kugelkamera
  p.linie(5, 18, 5, 11, c).linie(6, 18, 6, 12, KI.grauD);
  lage(p, (q) => { q.kreis(6, 9, 2, c); }, { schatten: 0, rand: true });
  p.px(7, 9, KI.glas).px(6, 8, KI.glasH).px(7, 8, KI.glas);
  // Seitensensoren
  p.px(28, 22, KI.glas).px(20, 15, KI.glas);
  p.umriss();
  p.px(1, 8, KI.licht).px(2, 9, KI.licht); // Funkpuls
});

// Laserabwehr: Radfahrzeug mit Laserturm, Linse und Strahl gen Himmel.
einheit('laserabwehr', (p) => {
  const w = KI.weiss, g = KI.grau, c = KI.carbon;
  lage(p, (q) => {
    q.rect(1, 20, 29, 6, w); q.rect(23, 14, 7, 6, w); q.rect(1, 25, 29, 1, g);
  }, { schatten: 0.18 });
  p.rect(25, 15, 4, 3, KI.glasD).px(25, 15, KI.glasH).px(26, 15, KI.glas);
  p.rect(3, 21, 9, 2, S).rect(3, 21, 9, 1, SH);
  for (const x of [5, 11, 19, 25]) { p.kreis(x, 27, 2.6, '#22262c'); p.kreis(x, 27, 1, KI.grau); }
  // Drehkranz
  lage(p, (q) => { q.rect(10, 17, 10, 3, g); q.rect(12, 15, 6, 2, KI.grauD); }, { rand: true });
  // Lasergehäuse in Spielerfarbe und schräges Emitterrohr mit Linse
  lage(p, (q) => { q.rect(9, 12, 9, 5, w); }, { schatten: 0.2, rand: true });
  p.rect(10, 14, 7, 2, S).rect(10, 14, 7, 1, SH);
  lage(p, (q) => { strich(q, 14, 12, 20, 6, KI.grau, 3, false); q.linie(14, 12, 20, 6, KI.weiss); }, { schatten: 0, rand: true });
  lage(p, (q) => { q.kreis(21, 6, 2.4, c); }, { schatten: 0, rand: true });
  p.kreis(21, 6, 1.3, KI.glas).px(21, 6, '#ffffff').px(20, 5, KI.glasH);
  // Radarplatte
  lage(p, (q) => { q.rect(3, 13, 5, 6, KI.grauD); q.rect(3, 13, 5, 1, g); }, { rand: true });
  p.px(5, 15, KI.blau).px(5, 17, KI.blau);
  p.umriss();
  // Laserstrahl
  p.linie(23, 4, 27, 0, KI.licht); p.linie(24, 4, 28, 0, KI.glasH); p.linie(24, 5, 29, 0, KI.licht); p.px(23, 3, '#ffffff');
});

// Medi-Drohne: Sanitäts-Schwebedrohne mit rotem Kreuz und Scanlicht.
einheit('medi_drohne', (p) => {
  const w = KI.weiss, c = KI.carbon;
  // Ausleger und Rotoren
  lage(p, (q) => {
    q.linie(8, 12, 14, 14, c); q.linie(8, 13, 14, 15, c); q.linie(24, 12, 18, 14, c); q.linie(24, 13, 18, 15, c);
    q.rect(5, 10, 6, 2, KI.grauD); q.rect(21, 10, 6, 2, KI.grauD);
  }, { schatten: 0 });
  // Rumpf
  lage(p, (q) => {
    q.ellipse(16, 15, 7, 4, w); q.rect(12, 19, 8, 2, KI.grau);
  }, { schatten: 0.2, rand: true });
  // rotes Kreuz
  p.rect(14, 12, 5, 7, '#ffffff'); p.rect(15, 13, 3, 5, KREUZ); p.rect(14, 14, 5, 3, KREUZ);
  p.rect(9, 15, 4, 2, S).rect(20, 15, 4, 2, S).px(9, 15, SH).px(20, 15, SH);
  // Greifer mit Verbandskasten
  p.linie(13, 21, 12, 23, c).linie(19, 21, 20, 23, c);
  lage(p, (q) => { q.rect(13, 22, 7, 4, '#ffffff'); }, { schatten: 0.15, rand: true });
  p.rect(16, 23, 1, 2, KREUZ).rect(15, 23, 3, 1, KREUZ);
  p.px(10, 14, KI.glas).px(22, 14, KI.glas);
  p.umriss();
  // Rotorscheiben (verwischt) und Scanlicht
  for (let x = 3; x <= 12; x++) p.px(x, 9, x % 2 ? '#d8e2ec' : '#a8b4c2');
  for (let x = 19; x <= 28; x++) p.px(x, 9, x % 2 ? '#a8b4c2' : '#d8e2ec');
  for (let y = 27; y <= 29; y++) raster(p, 10 + (29 - y), y, 13 - 2 * (29 - y), 1, '#8ff0c8', 0);
  for (let x = 11; x <= 21; x++) leerPx(p, x, 30, '#1c2226');
});

// Lieferdrohnen: autonome Bodenstation mit Landeplattform, Drohnen mit Paketen.
einheit('lieferdrohnen', (p) => {
  const w = KI.weiss, c = KI.carbon, karton = '#c89a5a', kartonD = '#9c7440';
  // fahrerloser Lieferwagen mit Landedeck
  lage(p, (q) => {
    q.poly([[2, 18], [22, 18], [29, 21], [30, 26], [2, 26]], w);
    q.rect(1, 17, 22, 1, KI.grau);
  }, { schatten: 0.18 });
  p.poly([[23, 19], [27, 21], [28, 24], [23, 24]], KI.glasD); p.px(24, 20, KI.glasH).px(24, 21, KI.glas);
  p.rect(3, 20, 17, 4, S).rect(3, 20, 17, 1, SH);
  p.px(11, 21, PAL.gold).px(10, 22, PAL.gold).px(12, 22, PAL.gold).px(11, 22, PAL.goldD); // Münzzeichen
  p.rect(2, 25, 28, 1, KI.carbonH); p.px(29, 23, KI.licht);
  for (const x of [7, 25]) { p.kreis(x, 27, 2.6, '#22262c'); p.kreis(x, 27, 1, KI.grau); }
  // Pakete auf dem Deck
  lage(p, (q) => { q.rect(4, 13, 5, 4, karton); q.rect(13, 14, 4, 3, karton); }, { schatten: 0.15, rand: true });
  p.linie(6, 13, 6, 16, kartonD).linie(15, 14, 15, 16, kartonD);
  // Drohnen mit hängenden Paketen
  const traeger = (x, y, b) => {
    drohne(p, x, y, S);
    p.px(x, y + 2, c);
    lage(p, (q) => { q.rect(x - 2, y + 3, 5, b, karton); }, { schatten: 0.15, rand: true });
    p.linie(x, y + 3, x, y + 2 + b, kartonD);
  };
  traeger(9, 3, 3); traeger(23, 8, 4);
  p.umriss();
  p.px(12, 7, KI.licht).px(14, 9, KI.licht).px(19, 12, KI.licht); // Flugbahn
});

// ================================================================ Fusionszeitalter

// Plasmagrenadier: schwere weiße Rüstung, orange Leuchtbänder, Plasmawerfer mit glühender Kammer.
einheit('plasmagrenadier', (p) => {
  ruestling(p, { platte: FU.weiss, gelenk: FU.dunkel, breit: true, pose: 'stehen', handHinten: [11, 21] });
  p.rect(12, 22, 8, 1, FU.orange); // Gürtelband
  p.px(12, 26, FU.orange).px(17, 26, FU.orange);
  // Reaktor-Tornister
  lage(p, (q) => { q.rect(7, 13, 4, 9, FU.creme); q.rect(8, 11, 2, 2, FU.grauD); }, { schatten: 0.18, rand: true });
  p.rect(7, 15, 4, 1, FU.orange).rect(7, 18, 4, 1, FU.orange).px(8, 16, FU.glut).px(8, 17, FU.glut).px(8, 11, FU.glut);
  // wuchtiger Schulterpanzer
  lage(p, (q) => { q.rect(13, 13, 8, 5, FU.weiss); q.rect(14, 12, 6, 1, FU.weiss); }, { schatten: 0.18, rand: true });
  p.rect(14, 15, 6, 1, S).rect(14, 16, 6, 1, SD).rect(14, 14, 6, 1, SH);
  helm(p, 14, 6, 'fusion');
  // Plasmawerfer
  lage(p, (q) => {
    q.rect(15, 19, 9, 4, FU.creme); q.rect(24, 20, 4, 2, FU.grauD); q.rect(17, 23, 2, 2, FU.dunkel);
    q.rect(18, 18, 4, 1, FU.grauD);
  }, { schatten: 0.18, rand: true });
  p.rect(17, 20, 6, 2, FU.dunkel).rect(18, 20, 4, 1, FU.orange).rect(18, 21, 4, 1, FU.glut).px(20, 20, FU.kern);
  for (const x of [24, 26]) p.px(x, 20, FU.orange);
  // vorderer Arm
  strich(p, 17, 17, 16, 20, FU.weiss, 2, true); p.px(16, 20, FU.dunkel).px(17, 20, FU.dunkel);
  p.umriss();
  // Plasmakugel an der Mündung
  p.kreis(29.5, 20.5, 1.2, FU.glut); p.px(29, 20, FU.kern).px(30, 20, FU.kern);
  schein(p, 29.5, 20.5, 2.6, FU.orange);
});

// Schwebepanzer: weißer runder Rumpf, orange Leuchtband, schwebt auf Lichtpolster.
einheit('schwebepanzer', (p) => {
  const w = FU.weiss, cr = FU.creme, d = FU.dunkel;
  lage(p, (q) => {
    q.poly([[1, 18], [22, 17], [30, 20], [29, 24], [24, 26], [4, 26], [1, 23]], w);
  }, { schatten: 0.2 });
  p.rect(2, 21, 27, 1, FU.orange).rect(3, 22, 25, 1, cr);
  p.rect(5, 19, 10, 2, S).rect(5, 19, 10, 1, SH);
  // Schwebedüsen
  lage(p, (q) => { q.rect(5, 26, 4, 1, d); q.rect(13, 26, 4, 1, d); q.rect(21, 26, 4, 1, d); }, { schatten: 0 });
  // Kuppelturm mit Kanone
  lage(p, (q) => {
    q.poly([[6, 17], [8, 13], [12, 11], [18, 11], [22, 14], [23, 17]], w);
  }, { schatten: 0.2, rand: true });
  p.rect(8, 15, 13, 1, FU.orange).rect(10, 13, 3, 1, FU.glut);
  p.px(16, 13, S).px(17, 13, S).px(18, 13, SD);
  lage(p, (q) => { q.rect(22, 14, 10, 2, cr); q.rect(22, 14, 10, 1, w); q.rect(26, 13, 2, 4, cr); }, { schatten: 0.1, rand: true });
  p.px(27, 14, FU.orange).px(27, 15, FU.orange);
  p.umriss();
  p.px(31, 14, FU.glut);
  // Lichtpolster
  for (const x0 of [5, 13, 21]) for (let x = x0; x < x0 + 4; x++) p.px(x, 27, FU.glut);
  schwebeLicht(p, 4, 25, 28, [FU.orange, FU.orange]);
});

// Railgun-Batterie: Plattform auf Stützen mit langer Doppelschiene und leuchtenden Spulen.
einheit('railgun_batterie', (p) => {
  const w = FU.weiss, cr = FU.creme, d = FU.dunkel;
  // Stützfüße
  lage(p, (q) => {
    q.linie(4, 24, 2, 29, d); q.linie(5, 24, 3, 29, d); q.rect(0, 29, 6, 2, FU.grauD);
    q.linie(21, 24, 24, 29, d); q.linie(22, 24, 25, 29, d); q.rect(22, 29, 6, 2, FU.grauD);
  }, { schatten: 0 });
  // Plattform
  lage(p, (q) => {
    q.poly([[1, 20], [24, 20], [27, 23], [24, 26], [2, 26]], w);
  }, { schatten: 0.2 });
  p.rect(2, 23, 23, 1, FU.orange);
  p.rect(4, 21, 9, 2, S).rect(4, 21, 9, 1, SH);
  // Lafette
  lage(p, (q) => { q.poly([[8, 20], [10, 14], [17, 14], [19, 20]], cr); q.rect(10, 12, 6, 2, FU.grauD); }, { schatten: 0.2, rand: true });
  // Doppelschiene im Verhältnis 2:1 nach oben rechts (saubere Pixeltreppe)
  lage(p, (q) => {
    for (let i = 0; i <= 20; i++) {
      const x = 11 + i, y = 13 - Math.floor(i / 2);
      q.px(x, y - 1, FU.weiss); q.px(x, y, FU.dunkel); q.px(x, y + 1, FU.creme);
    }
  }, { schatten: 0, rand: true });
  // Spulenringe
  for (const i of [3, 8, 13, 18]) {
    const x = 11 + i, y = 13 - Math.floor(i / 2);
    p.rect(x, y - 2, 2, 5, FU.orange); p.px(x, y - 2, FU.glut).px(x, y, FU.kern);
  }
  // Lafette: Sichtfenster des Energiespeichers
  p.rect(11, 16, 5, 2, FU.dunkel).rect(12, 16, 3, 1, FU.orange);
  p.umriss();
  // Projektil vor der Mündung
  leerPx(p, 31, 1, FU.kern); leerPx(p, 31, 0, FU.glut);
  schwebeLicht(p, 8, 18, 27, [FU.glut, FU.orange], false);
});

// Schildgenerator: Fahrzeug mit Generatormast und leuchtender Schildkuppel.
einheit('schildgenerator', (p) => {
  const w = FU.weiss, cr = FU.creme;
  lage(p, (q) => {
    q.poly([[3, 21], [26, 21], [29, 24], [29, 27], [3, 27]], w);
  }, { schatten: 0.2 });
  p.rect(4, 24, 24, 1, FU.orange);
  p.rect(5, 22, 7, 2, S).rect(5, 22, 7, 1, SH).rect(20, 22, 6, 2, S).rect(20, 22, 6, 1, SH);
  for (const x of [7, 16, 25]) { p.kreis(x, 28, 2.2, '#2a2622'); p.px(x, 28, FU.grauD); }
  // Generatormast
  lage(p, (q) => { q.poly([[12, 21], [14, 13], [18, 13], [20, 21]], cr); q.rect(13, 11, 6, 2, FU.grauD); }, { schatten: 0.2, rand: true });
  p.rect(15, 15, 2, 5, FU.dunkel).rect(15, 16, 2, 3, FU.orange);
  lage(p, (q) => q.kreis(16, 9, 2.5, FU.dunkel), { schatten: 0, rand: true });
  p.kreis(16, 9, 1.6, FU.glut).px(16, 9, FU.kern).px(15, 8, FU.kern);
  p.umriss();
  // Schildkuppel (durchscheinend: Bogen + Rasterschimmer)
  const cx = 16, cy = 27, rx = 15, ry = 24;
  for (let a = 0; a <= 180; a += 1) {
    const r = a * Math.PI / 180, x = Math.round(cx + Math.cos(r) * rx), y = Math.round(cy - Math.sin(r) * ry);
    leerPx(p, x, y, a > 55 && a < 125 ? FU.kern : FU.glut);
  }
  for (let a = 30; a <= 150; a += 1) {
    const r = a * Math.PI / 180, x = Math.round(cx + Math.cos(r) * (rx - 2)), y = Math.round(cy - Math.sin(r) * (ry - 2));
    if ((x + y) % 2 === 0) leerPx(p, x, y, FU.orange);
  }
  p.px(9, 7, '#ffffff').px(8, 8, FU.kern).px(10, 6, FU.kern); // Glanzlicht
});

// Nanomediziner: Sanitäter im weißen Fusionsanzug, Nano-Emitter mit Heilwolke.
einheit('nanomediziner', (p) => {
  ruestling(p, { platte: FU.weiss, gelenk: FU.grauD, pose: 'schritt', handHinten: [11, 22] });
  // weißes Brustfeld mit Kreuz, Spielerfarbe an Schultern/Gürtel
  p.rect(13, 16, 6, 5, FU.weiss).rect(15, 17, 2, 3, KREUZ).rect(14, 18, 4, 1, KREUZ);
  p.rect(11, 22, 9, 1, S).rect(11, 15, 9, 1, S).px(11, 16, SD);
  // Medizin-Tornister
  lage(p, (q) => { q.rect(7, 15, 4, 7, FU.creme); }, { schatten: 0.18, rand: true });
  p.px(8, 17, FU.orange).px(8, 19, FU.orange);
  helm(p, 13, 8, 'fusion');
  p.px(14, 9, KREUZ).px(13, 10, KREUZ).px(14, 10, KREUZ).px(15, 10, KREUZ).px(14, 11, KREUZ);
  // Emitter-Stab mit Nanokammer
  lage(p, (q) => { q.rect(18, 18, 6, 2, FU.creme); q.rect(24, 17, 2, 4, FU.grauD); }, { schatten: 0.15, rand: true });
  p.rect(20, 18, 2, 1, FU.orange);
  strich(p, 16, 17, 18, 19, FU.weiss, 2, true);
  p.umriss();
  // Nanowolke: schimmernde Teilchen, dichter am Emitter
  const pkt = [[27, 18], [28, 17], [27, 20], [29, 19], [28, 15], [30, 16], [29, 21], [26, 15], [30, 13], [27, 12], [31, 18], [25, 13],
    [29, 11], [26, 10], [31, 14], [24, 11], [28, 9], [30, 22], [27, 23]];
  pkt.forEach(([x, y], i) => leerPx(p, x, y, i % 3 === 0 ? '#8ff0d8' : i % 3 === 1 ? FU.glut : FU.kern));
});

// ================================================================ Weltraumzeitalter

// Raumlandetruppe: Soldat im Raumanzug, goldenes Visier, Lebenserhaltung, Sprungdüsen.
einheit('raumlandetruppe', (p) => {
  ruestling(p, { platte: WR.anzug, gelenk: WR.violettD, pose: 'schritt', handHinten: [10, 21] });
  p.rect(13, 16, 6, 5, WR.anzug).rect(13, 18, 6, 2, S).rect(13, 18, 6, 1, SH).px(17, 16, WR.violett); // Brustgurt in Spielerfarbe
  p.px(11, 26, WR.violett).px(17, 26, WR.violett);
  // Lebenserhaltung mit Sprungdüse
  lage(p, (q) => { q.rect(6, 13, 5, 10, WR.anzugD); q.rect(7, 23, 3, 2, WR.metallD); }, { schatten: 0.18, rand: true });
  p.px(7, 15, WR.violettH).px(7, 17, WR.violett).px(9, 15, S).px(9, 17, S);
  // Schulterplatte
  lage(p, (q) => { q.rect(14, 14, 6, 4, WR.anzug); }, { schatten: 0.18, rand: true });
  p.rect(15, 15, 4, 2, S).px(15, 15, SH);
  helm(p, 12, 6, 'raum');
  // Gewehr
  lage(p, (q) => {
    q.rect(15, 19, 10, 2, WR.metallD); q.rect(25, 19, 4, 1, WR.gitter); q.rect(17, 21, 2, 2, WR.gitter); q.rect(19, 18, 3, 1, WR.gitter);
  }, { schatten: 0.15, rand: true });
  p.rect(16, 19, 8, 1, WR.metall).px(23, 20, WR.violettH).px(21, 18, WR.violettH);
  strich(p, 16, 17, 18, 20, WR.anzug, 2, true); p.px(19, 21, WR.anzugD).px(20, 21, WR.anzugD);
  p.umriss();
  // Düsenschein
  p.px(8, 26, WR.violettH).px(7, 27, WR.violett).px(9, 27, WR.violett).px(8, 28, WR.violettH);
});

// Mondpanzer: Panzer auf großen Gitterrädern, Parabolantenne, Goldfolie.
einheit('mondpanzer', (p) => {
  const a = WR.anzug, ad = WR.anzugD, m = WR.metallD;
  // Fahrgestell
  lage(p, (q) => { q.rect(3, 22, 26, 2, m); }, { schatten: 0 });
  // Gitterräder
  const gitterrad = (cx, cy) => {
    lage(p, (q) => {
      q.kreis(cx, cy, 4, WR.gitter);
      for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        if (Math.hypot(x - cx, y - cy) <= 3.2) q.px(x, y, (x + y) % 2 ? WR.metall : '#c8c8d4');
      }
      q.kreis(cx, cy, 1, WR.violettD); q.px(cx, cy, WR.violettH);
    }, { schatten: 0, rand: true });
  };
  gitterrad(6, 26); gitterrad(16, 26); gitterrad(26, 26);
  // Wanne
  lage(p, (q) => {
    q.poly([[1, 16], [23, 15], [30, 18], [29, 22], [2, 22]], a);
  }, { schatten: 0.2, rand: true });
  p.rect(2, 20, 27, 1, WR.violett).rect(3, 21, 25, 1, ad);
  p.rect(4, 17, 9, 2, S).rect(4, 17, 9, 1, SH);
  p.rect(16, 17, 6, 2, WR.visier).px(16, 17, WR.visierH).px(18, 18, WR.visierD); // Goldfolie
  // Turm
  lage(p, (q) => {
    q.poly([[8, 15], [9, 11], [19, 10], [23, 13], [23, 15]], a);
    q.rect(23, 12, 9, 2, ad); q.rect(23, 12, 9, 1, a); q.rect(29, 11, 2, 4, WR.metall);
  }, { schatten: 0.2, rand: true });
  p.rect(11, 12, 6, 1, WR.violett).px(20, 12, WR.violettH);
  // Parabolantenne
  p.linie(6, 15, 4, 9, m);
  lage(p, (q) => q.karte(1, 3, ['....ab', '...abb', '..abb.', '.abb..', 'abb...'], { a: '#f2f0f8', b: WR.anzugD }), { schatten: 0 });
  p.linie(3, 6, 5, 4, WR.metallD).px(6, 3, WR.violettH); // Speiseantenne
  p.umriss();
});

// Orbitalflak: Startfahrzeug mit steilen Abschussschienen gen Himmel.
einheit('orbitalflak', (p) => {
  const a = WR.anzug, ad = WR.anzugD, m = WR.metallD;
  lage(p, (q) => {
    q.rect(1, 21, 29, 5, a); q.rect(23, 16, 7, 5, a); q.rect(1, 25, 29, 1, ad);
  }, { schatten: 0.2 });
  p.rect(24, 17, 5, 2, WR.violettD).px(24, 17, WR.violettH);
  p.rect(3, 22, 7, 2, S).rect(3, 22, 7, 1, SH);
  p.rect(11, 23, 18, 1, WR.violett);
  for (const x of [5, 12, 19, 26]) { p.kreis(x, 27, 2.4, WR.gitter); p.px(x, 27, WR.metall); p.px(x - 1, 26, WR.metall); }
  // Stütze und Schienenträger
  lage(p, (q) => { q.rect(11, 17, 8, 4, m); q.linie(12, 20, 9, 26, m); }, { schatten: 0.15, rand: true });
  // zwei senkrechte Startschienen mit schlanken Orbitalraketen
  lage(p, (q) => {
    q.rect(11, 6, 1, 12, m); q.rect(15, 4, 1, 14, m); q.rect(19, 6, 1, 12, m);
    for (const [x, y] of [[12, 5], [16, 3]]) {
      q.rect(x, y + 2, 3, 12, a); q.rect(x + 2, y + 2, 1, 12, ad);
      q.rect(x, y + 1, 3, 1, WR.violett); q.px(x + 1, y, WR.violettH);
      q.rect(x, y + 8, 3, 1, S);
      q.px(x - 1, y + 13, WR.violettD).px(x + 3, y + 13, WR.violettD);
    }
  }, { schatten: 0.12, rand: true });
  // Radarschüssel
  p.linie(27, 16, 27, 12, m);
  lage(p, (q) => { q.poly([[24, 9], [28, 7], [31, 11], [26, 12]], '#d8d4e4'); }, { schatten: 0.15, rand: true });
  p.px(27, 10, WR.violett);
  p.umriss();
});

// Kolonist: Siedler im Raumanzug mit Tragegestell, Ausrüstungskiste und Kuppel-Bausatz.
einheit('kolonist', (p) => {
  ruestling(p, { platte: WR.anzug, gelenk: WR.anzugDD, pose: 'stehen', handHinten: [11, 22], brust: null });
  p.rect(11, 18, 9, 1, WR.violett).rect(11, 22, 9, 1, WR.violettD); // Anzugstreifen
  // Tragegestell mit großer Kiste in Spielerfarbe
  lage(p, (q) => { q.rect(4, 12, 7, 10, S); q.rect(10, 10, 1, 14, WR.metallD); }, { schatten: 0.15, rand: true });
  p.rect(4, 12, 6, 1, SH).rect(4, 15, 6, 1, SD).rect(4, 19, 6, 1, SD).px(5, 13, '#ffffff');
  lage(p, (q) => { q.rect(4, 9, 6, 3, WR.anzugD); q.rect(4, 9, 6, 1, WR.anzug); }, { schatten: 0, rand: true }); // Zeltrolle
  helm(p, 12, 7, 'raum');
  // Kuppel-Bausatz vor ihm: Kiste mit Glaskuppel
  lage(p, (q) => {
    q.rect(20, 25, 10, 5, WR.anzugD); q.rect(20, 25, 10, 1, WR.anzug);
  }, { schatten: 0.15, rand: true });
  p.rect(21, 27, 8, 1, WR.violett);
  lage(p, (q) => { q.ellipse(25, 24, 4, 3, '#a8d8f0'); q.rect(21, 24, 9, 1, '#a8d8f0'); }, { schatten: 0, rand: true });
  p.px(23, 22, '#ffffff').px(24, 22, '#e0f4ff').px(22, 23, '#e0f4ff');
  // Arm reicht zur Kuppel
  strich(p, 16, 17, 19, 22, WR.anzug, 2, true); p.px(20, 23, WR.anzugDD).px(21, 23, WR.anzugDD);
  // Antenne mit Wimpel in Spielerfarbe
  p.linie(4, 8, 4, 2, WR.metallD); p.rect(5, 2, 3, 2, S).px(5, 2, SH);
  p.umriss();
  p.px(4, 1, WR.violettH);
});

// ================================================================ Sternenzeitalter

// Nanoschwarm: schimmernde, formwandelnde Gestalt aus Teilchen mit Kristallklinge.
einheit('nanoschwarm', (p) => {
  // dunkler Kern als Gestalt (Rumpf, Beine, Kopf)
  lage(p, (q) => {
    q.poly([[11, 15], [19, 14], [20, 22], [17, 24], [12, 24]], ST.tief);
    q.linie(13, 24, 11, 29, ST.tief); q.linie(14, 24, 12, 29, ST.tief); q.rect(9, 29, 4, 2, ST.tief);
    q.linie(16, 24, 19, 29, ST.tief); q.linie(17, 24, 20, 29, ST.tief); q.rect(18, 29, 4, 2, ST.tief);
    q.ellipse(16, 10, 3, 3, ST.tief);
  }, { schatten: 0.15, rand: ST.tiefD });
  // Kern leuchtet in Spielerfarbe
  p.rect(13, 16, 4, 4, S).px(14, 17, SH).px(15, 18, SH).px(13, 16, SH);
  // Schimmer: Teilchen im Körper
  raster(p, 11, 14, 10, 11, ST.violett, 0, (x, y) => p.hole(x, y) === ST.tief || p.hole(x, y) === hell(ST.tief, 0.15));
  raster(p, 9, 6, 13, 25, ST.eisD, 1, (x, y) => (x * 7 + y * 3) % 5 === 0 && !!p.hole(x, y) && p.hole(x, y) !== ST.tiefD);
  p.px(17, 9, ST.cyan).px(18, 10, ST.kern); // Auge
  // Klingenarm aus Kristall
  lage(p, (q) => {
    q.linie(17, 16, 21, 18, ST.tief); q.linie(17, 17, 21, 19, ST.tief);
    q.poly([[21, 17], [30, 12], [31, 13], [22, 20]], ST.eis);
  }, { schatten: 0.2, rand: ST.tiefD });
  p.linie(22, 18, 30, 13, ST.kristall);
  p.umriss();
  // abfliegende Teilchen hinten (formwandelnd)
  const t = [[8, 14, ST.violettH], [6, 16, ST.cyan], [7, 19, S], [4, 13, ST.violett], [5, 18, ST.violettH], [3, 15, ST.cyan], [9, 11, ST.cyan],
    [7, 10, S], [2, 18, ST.violettH], [6, 22, ST.cyan], [4, 21, S], [3, 10, SH], [8, 21, S], [5, 25, SH], [9, 24, ST.violettH], [1, 12, ST.cyan], [10, 8, ST.violettH],
    [22, 9, ST.cyan], [20, 6, ST.violettH], [23, 23, ST.cyan], [24, 26, ST.violettH]];
  t.forEach(([x, y, c]) => leerPx(p, x, y, c));
});

// Antimaterie-Panzer: kristalliner Schwebepanzer mit violett-weißem Kern.
einheit('antimaterie_panzer', (p) => {
  // Facettenrumpf
  lage(p, (q) => {
    q.poly([[1, 19], [8, 16], [24, 16], [31, 20], [26, 25], [5, 25]], ST.eis);
    q.poly([[1, 19], [8, 16], [24, 16], [31, 20]], ST.kristall);
    q.poly([[5, 25], [16, 21], [26, 25]], ST.eisD);
  }, { schatten: 0.12 });
  p.linie(1, 19, 31, 20, ST.kristall).linie(8, 16, 16, 21, ST.eisD).linie(24, 16, 16, 21, ST.eisD);
  p.linie(2, 21, 8, 23, S).linie(2, 22, 7, 24, SD).linie(30, 21, 25, 24, S);
  // Kristallturm
  lage(p, (q) => {
    q.poly([[7, 16], [11, 11], [19, 10], [23, 13], [22, 16]], ST.kristall);
    q.poly([[11, 11], [19, 10], [16, 14]], '#ffffff');
  }, { schatten: 0.1, rand: true });
  p.linie(9, 15, 21, 15, S).px(16, 14, ST.eis);
  // Kristallrohr
  lage(p, (q) => { q.rect(22, 12, 9, 2, ST.eis); q.rect(22, 12, 9, 1, ST.kristall); q.px(31, 12, ST.cyan); }, { schatten: 0, rand: true });
  // Antimateriekern
  lage(p, (q) => q.kreis(16, 21, 2.5, ST.tiefD), { schatten: 0, rand: true });
  p.kreis(16, 21, 1.6, ST.violett).px(16, 21, ST.kern).px(15, 21, ST.violettH).px(16, 20, ST.violettH);
  p.umriss();
  schein(p, 16, 21, 4, ST.violettH);
  schwebeLicht(p, 5, 26, 27, [ST.violett, ST.violettH, ST.violett]);
});

// Gravitationswerfer: Kristallgeschütz auf zwei Füßen, leuchtende Gravitationsringe um das Rohr, Schwarzes-Loch-Geschoss.
einheit('gravitationswerfer', (p) => {
  // Füße
  lage(p, (q) => {
    q.poly([[6, 23], [9, 23], [7, 29], [3, 29]], ST.eisD); q.rect(2, 29, 7, 2, ST.tief);
    q.poly([[18, 23], [21, 23], [25, 29], [21, 29]], ST.eis); q.rect(20, 29, 7, 2, ST.tief);
  }, { schatten: 0.12 });
  // Sockel
  lage(p, (q) => { q.poly([[3, 24], [7, 19], [21, 19], [25, 24], [21, 26], [7, 26]], ST.kristall); }, { schatten: 0.15, rand: true });
  p.rect(6, 22, 16, 2, S).rect(6, 22, 16, 1, SH);
  p.poly([[7, 19], [21, 19], [14, 21]], '#ffffff');
  // Lafette
  lage(p, (q) => { q.poly([[9, 19], [11, 14], [17, 14], [19, 19]], ST.eisD); }, { schatten: 0.15, rand: true });
  p.rect(13, 16, 3, 2, ST.tief).px(14, 16, ST.violett);
  // Verschluss (facettiert) und waagrechtes Rohr
  lage(p, (q) => {
    q.poly([[3, 12], [6, 8], [11, 8], [12, 16], [6, 16]], ST.eis);
    q.poly([[3, 12], [6, 8], [11, 8], [8, 12]], ST.kristall);
    q.rect(11, 10, 14, 1, ST.kristall); q.rect(11, 11, 14, 1, ST.tief); q.rect(11, 12, 14, 1, ST.tiefD); q.rect(11, 13, 14, 1, ST.eisD);
    q.rect(24, 9, 3, 6, ST.eis); q.rect(24, 9, 3, 1, ST.kristall);
  }, { schatten: 0, rand: true });
  p.rect(6, 12, 4, 2, S).rect(6, 12, 4, 1, SH);
  p.umriss();
  // Gravitationsringe: hintere Hälfte hinter dem Rohr, vordere Hälfte davor
  for (const x of [14, 18, 22]) {
    for (let a = 0; a < 360; a += 6) {
      const r = a * Math.PI / 180, rx = Math.round(x + Math.cos(r) * 1.5), ry = Math.round(11.5 + Math.sin(r) * 5);
      if (Math.cos(r) < -0.1) leerPx(p, rx, ry, ST.violett); else p.px(rx, ry, a > 270 || a < 20 ? ST.violettH : ST.violett);
    }
  }
  // Schwarzes-Loch-Geschoss mit Lichtkranz
  p.kreis(29, 11.5, 1.2, ST.tiefD); p.px(29, 11, '#0e0a1c').px(29, 12, '#0e0a1c');
  for (let a = 0; a < 360; a += 25) {
    const r = a * Math.PI / 180; leerPx(p, Math.round(29 + Math.cos(r) * 2.6), Math.round(11.5 + Math.sin(r) * 2.6), a % 50 ? ST.violettH : ST.kern);
  }
});

// Phasenflak: Kristall-Schwebesockel mit phasenverschobenen, durchscheinenden Emittern.
einheit('phasenflak', (p) => {
  lage(p, (q) => {
    q.poly([[2, 21], [7, 18], [25, 18], [30, 21], [26, 25], [6, 25]], ST.eis);
    q.poly([[2, 21], [7, 18], [25, 18], [30, 21]], ST.kristall);
  }, { schatten: 0.12 });
  p.rect(6, 22, 20, 1, S).rect(8, 23, 16, 1, SD);
  p.linie(2, 21, 30, 21, ST.kristall);
  // drei Emitter-Spitzen mit Fassung
  const spitze = (q, x, y0, h, c, cH) => {
    q.poly([[x - 1, y0], [x + 1, y0], [x + 1, y0 - h + 2], [x, y0 - h], [x - 1, y0 - h + 2]], c);
    q.linie(x - 1, y0, x - 1, y0 - h + 2, cH);
  };
  lage(p, (q) => {
    q.rect(6, 16, 5, 2, ST.tief); q.rect(14, 16, 5, 2, ST.tief); q.rect(21, 16, 5, 2, ST.tief);
  }, { schatten: 0.12, rand: true });
  lage(p, (q) => {
    spitze(q, 8, 15, 9, ST.eisD, ST.eis); spitze(q, 16, 15, 13, ST.eis, ST.kristall); spitze(q, 23, 15, 9, ST.eisD, ST.eis);
  }, { schatten: 0.1, rand: true });
  p.px(16, 6, ST.cyan).px(8, 10, ST.cyan).px(23, 10, ST.cyan).px(8, 17, S).px(16, 17, S).px(23, 17, S);
  p.umriss();
  // Phasengeister: versetzte, gerasterte Kopien der Spitzen (wirken durchscheinend)
  const geist = (x, y0, h, c) => {
    for (let y = y0 - h; y <= y0; y++) for (let dx = -1; dx <= 1; dx++) {
      if ((x + dx + y) % 2 === 0 && !(y < y0 - h + 2 && dx !== 0)) leerPx(p, x + dx, y, c);
    }
  };
  geist(11, 12, 9, ST.cyan); geist(19, 10, 13, ST.violettH); geist(26, 12, 9, ST.cyan);
  // Phasenblitze über den Spitzen
  leerPx(p, 16, 0, ST.kern); leerPx(p, 15, 1, ST.violettH); leerPx(p, 17, 1, ST.violettH); leerPx(p, 8, 3, ST.cyan); leerPx(p, 23, 3, ST.cyan);
  schwebeLicht(p, 6, 26, 26, [ST.cyan, ST.cyanD]);
});
