// Sprites der Zeitalter 7 bis 10 (KI, Fusion, Weltraum, Sterne). Siehe PLAN-ZEITALTER-8-11.md.
// Luft-, See- und Raumeinheiten. 32x32, Bug/Nase nach rechts, Licht von oben links.
// Schiffe: Seitenansicht, Wasserlinie y=27, Wasser in Reihe 28 (wie einheiten_see_luft.js).
// Drohnen und Flugzeuge: Aufsicht mit Bodenschatten. Raketen: schräg im Steigflug.
// Raumschiffe: eigene Formsprache in Seitenansicht (schwebend, Triebwerksglühen, Paneele, Antennen).
// Spielerfarbe über 'S' (Grundton), 'S-' (dunkel), 'S+' (hell).
import { definiere } from '../sprites.js';
import { PAL, Pinsel, mische, hell, dunkel } from '../pixel.js';

const S = 'S', SD = 'S-', SH = 'S+';
const SCHAUM = '#e8f3f9';
const SCHATTEN = '#1f2a33';

// ---------------------------------------------------------------- Farbwelten der Zeitalter
// KI: kühles Blau, Glas, Grau
const KI = { h: '#8d99ab', d: '#5f6a7b', l: '#c0c9d6', x: '#3f4857' };
const KI_GLAS = '#5b8cff', KI_GLAS_H = '#b4cdff', KI_GLAS_D = '#2f4f9e', KI_SENSOR = '#7ef0ff';
// Fusion: Weiß mit orangen Leuchtbändern
const FU = { h: '#e4e8ec', d: '#aab2bc', l: '#ffffff', x: '#757e8a' };
const FU_GLUT = '#f2a33a', FU_GLUT_H = '#ffd27a', FU_KERN = '#fff4d6', FU_GLUT_D = '#c46a1c';
// Weltraum: Weiß/Grau, violette Akzente, Triebwerksglühen
const RA = { h: '#d3d6de', d: '#9a9eac', l: '#f3f4f7', x: '#666a7a' };
const RA_VIO = '#8e7cc3', RA_VIO_D = '#5d4e93', RA_VIO_H = '#c4b8ee';
const RA_SOLAR = '#2d3770', RA_SOLAR_H = '#5466b8';
const RA_FOLIE = '#d9a63e', RA_FOLIE_D = '#a7771f';
// Sterne: kristallines Weiß, Hellblau, Violett, Leuchten
const ST = { h: '#dbe6f2', d: '#9fb4d0', l: '#ffffff', x: '#7383ab' };
const ST_EIS = '#a6dcff', ST_EIS_D = '#6aa6d8', ST_VIO = '#b48cf0', ST_VIO_D = '#7a58c8', ST_LICHT = '#f3ecff';

// Triebwerksglut (außen nach innen)
const GLUT_ORANGE = [FU_GLUT_D, FU_GLUT, FU_GLUT_H, FU_KERN];
const GLUT_VIOLETT = ['#6c58c8', '#a490ff', '#ddd4ff', '#ffffff'];
const GLUT_STERN = ['#8a62e0', '#c3a4ff', '#e9f6ff', '#ffffff'];

function einheit(id, zeichne) { definiere('einheit', id, { w: 32, h: 32, zeichne }); }

// ---------------------------------------------------------------- Hilfsfunktionen

/** Rumpf zeilenweise (aus einheiten_see_luft.js): Deck x0..x1, zum Kiel hin um heck/bug eingezogen. */
function rumpf(p, x0, x1, deck, kiel, bug, heck, f, k = 1.4) {
  const n = Math.max(1, kiel - deck);
  for (let y = deck; y <= kiel; y++) {
    const t = Math.pow((y - deck) / n, k);
    const l = Math.round(x0 + heck * t), r = Math.round(x1 - bug * t);
    for (let x = l; x <= r; x++) {
      let c = f.h;
      if (y === deck) c = f.l;
      else if (y === kiel || x === r) c = f.d;
      else if (x === l) c = f.l;
      p.px(x, y, c);
    }
  }
}
/** Wasser-Andeutung (eine Reihe) mit Schaum an den Enden. */
function wasser(p, x0, x1, y = 28) {
  for (let x = x0; x <= x1; x++) p.px(x, y, (x * 3 + y) % 7 === 0 ? PAL.wasserH : PAL.wasser);
  p.px(x1, y, SCHAUM).px(x1 - 1, y, SCHAUM).px(x0, y, SCHAUM).px(x0 + 1, y, PAL.wasserH);
}
/** Taucht alles ab Zeile y0 abgestuft ins Wasser ein (Unterwasserteil verblasst). */
function eintauchen(p, y0, y1, start = 0.25, schritt = 0.18) {
  for (let y = y0; y <= y1; y++) for (let x = 0; x < p.w; x++) {
    const c = p.hole(x, y); if (c && c[0] === '#') p.px(x, y, mische(c, PAL.wasser, start + (y - y0) * schritt));
  }
}
/** Bodenschatten für Luft- und Raumfahrzeuge. */
function schatten(p, cx, b, y = 29) {
  p.rect(cx - b, y, 2 * b + 1, 1, SCHATTEN).rect(cx - b + 2, y - 1, 2 * b - 3, 1, SCHATTEN);
}
/** Zeichnet fn auf eigenem Blatt (waagrecht, Nase rechts) und überträgt es um winkel gedreht um (cx,cy). */
function gedreht(p, winkel, cx, cy, fn) {
  const t = new Pinsel(p.w, p.h); fn(t);
  const c = Math.cos(winkel), s = Math.sin(winkel);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const dx = x - cx, dy = y - cy;
    const v = t.hole(Math.round(c * dx + s * dy + cx), Math.round(-s * dx + c * dy + cy));
    if (v) p.px(x, y, v);
  }
}
/** Färbt Pixel im Rechteck, die genau `alt` sind, per fn(x,y) um. */
function umfaerben(p, x0, y0, x1, y1, alt, fn) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (p.hole(x, y) === alt) p.px(x, y, fn(x, y));
}
/** Füllt ein Polygon und schattiert es: oberste Kante hell, unterste dunkel, sonst Grundton. */
function koerper(p, punkte, f) {
  const M = '#010203';
  p.poly(punkte, M);
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const [x, y] of punkte) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const war = (x, y) => p.hole(x, y);
  const maske = new Set();
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (war(x, y) === M) maske.add(y * 64 + x);
  const drin = (x, y) => maske.has(y * 64 + x);
  for (const k of maske) {
    const x = k % 64, y = (k - x) / 64;
    p.px(x, y, !drin(x, y - 1) ? f.l : !drin(x, y + 1) ? f.d : !drin(x - 1, y) ? f.l : f.h);
  }
}
/** Leuchtpunkt aus konzentrischen Ellipsen (farben: außen nach innen). */
function leuchten(p, cx, cy, r, farben) {
  farben.forEach((c, i) => { const rr = r * (1 - i / farben.length); if (rr >= 0.6) p.ellipse(cx, cy, rr, rr, c); else p.px(cx, cy, c); });
}
/** Triebwerksstrahl nach links: Austritt bei x, Mitte y, Höhe h, Länge len; farben außen nach innen. */
function strahl(p, x, y, h, len, farben) {
  for (let i = 0; i < len; i++) {
    const t = i / len, halb = (h / 2) * (1 - t * t);
    farben.forEach((c, k) => {
      const hh = halb * (1 - k / farben.length);
      if (hh < 0.3 && k > 0) return;
      for (let dy = -Math.round(hh); dy <= Math.round(hh); dy++) p.px(x - i, y + dy, c);
    });
  }
}
/** Paneelfugen: einzelne dunklere Pixel in Abständen auf einer Zeile (nur auf vorhandenen Pixeln). */
function fugen(p, x0, x1, y, schritt, c) { for (let x = x0; x <= x1; x += schritt) if (p.hole(x, y)) p.px(x, y, c); }
/** Ring (Ellipsenkontur) mit Farbe c; die obere (hintere) Hälfte optional in Farbe oben. */
function ring(p, cx, cy, rx, ry, c, oben = null) {
  for (let a = 0; a < 96; a++) {
    const w = a / 96 * Math.PI * 2, x = cx + Math.cos(w) * rx, y = cy + Math.sin(w) * ry;
    p.px(x, y, oben && Math.sin(w) < 0 ? oben : c);
  }
}
/** Kleine Antenne mit Leuchtspitze. */
function antenne(p, x, y0, y1, c, spitze) { p.rect(x, y0, 1, y1 - y0 + 1, c); if (spitze) p.px(x, y0 - 1, spitze); }

// ================================================================ KI-ZEITALTER

einheit('drohnenjaeger', (p) => {
  // schlanke unbemannte Jagddrohne (Aufsicht): vorwärts gepfeilte Flügel, V-Leitwerk, Glas-Sensornase statt Kanzel
  const f = KI;
  // vorwärts gepfeilte Flügel (Spitze weiter vorn als die Wurzel)
  p.poly([[8, 13], [15, 13], [20, 4], [16, 4]], f.h); p.poly([[8, 15], [15, 15], [20, 24], [16, 24]], f.h);
  p.linie(15, 13, 20, 4, f.l); p.linie(15, 15, 20, 24, f.d);
  p.linie(8, 13, 16, 4, f.d); p.linie(8, 15, 16, 24, f.d);
  p.rect(16, 4, 5, 1, S).rect(16, 24, 5, 1, SD).px(16, 4, SH);        // Spielerfarbene Flügelspitzen
  p.linie(12, 11, 17, 6, S); p.linie(12, 17, 17, 22, S);              // Flügelstreifen
  p.linie(13, 11, 18, 6, KI_GLAS); p.linie(13, 17, 18, 22, KI_GLAS_D); // Sensorleiste in der Flügelkante
  // V-Leitwerk schräg nach außen
  p.poly([[3, 13], [7, 13], [4, 8], [2, 8]], f.d); p.poly([[3, 15], [7, 15], [4, 20], [2, 20]], f.d);
  p.px(2, 8, S).px(3, 8, S).px(2, 20, S).px(3, 20, S);
  // schmaler Rumpf
  p.poly([[3, 13], [24, 12], [30, 14], [24, 16], [3, 15]], f.h);
  p.rect(4, 13, 20, 1, f.l).rect(4, 15, 20, 1, f.d);
  p.rect(8, 14, 3, 1, f.x).px(9, 14, KI_SENSOR);                     // Lufteinlass
  // Glas-Sensornase mit Lichtpunkt
  p.rect(23, 13, 4, 3, KI_GLAS).rect(23, 13, 3, 1, KI_GLAS_H).px(26, 15, KI_GLAS_D).px(24, 14, '#ffffff');
  p.px(29, 14, KI_SENSOR).px(30, 14, f.l);
  // Triebwerk mit blauem Glühen
  p.rect(1, 13, 2, 3, KI_GLAS).px(1, 14, KI_GLAS_H).px(0, 14, '#ffffff');
  schatten(p, 15, 6);
});

einheit('angriffsdrohne', (p) => {
  // große, bewaffnete Bomberdrohne (Aufsicht): lange gerade Flügel, Waffenträger, Sensorkugel, Schubpropeller
  const f = KI;
  p.poly([[13, 1], [16, 1], [18, 13], [18, 15], [16, 27], [13, 27], [12, 15], [12, 13]], f.h);
  p.linie(13, 1, 12, 13, f.l); p.linie(13, 27, 12, 15, f.l);
  p.linie(16, 1, 18, 13, f.d); p.linie(16, 27, 18, 15, f.d);
  p.rect(13, 1, 3, 2, S).rect(13, 26, 3, 2, S).px(13, 1, SH).px(15, 27, SD);
  p.rect(14, 5, 2, 6, SD).rect(14, 18, 2, 6, SD).rect(14, 5, 1, 6, S).rect(14, 18, 1, 6, S);
  // Waffenträger mit Lenkbomben unter den Flügeln
  for (const y of [4, 8, 20, 24]) {
    p.rect(17, y, 5, 1, '#3a4049').px(21, y, S).px(17, y, '#6a717b');
    p.px(18, y - 1, '#6a717b').px(18, y + 1, '#2a2e35');
  }
  // dicker Rumpf
  p.poly([[3, 12], [22, 11], [27, 12], [29, 14], [27, 16], [22, 17], [3, 16]], f.h);
  p.rect(4, 12, 20, 1, f.l).rect(4, 16, 20, 1, f.d).rect(6, 13, 16, 1, mische(f.h, f.l, 0.5));
  p.rect(7, 14, 4, 1, f.d).rect(8, 15, 2, 1, KI_SENSOR);
  // Satellitenbuckel und Sensorkugel
  p.ellipse(24, 14, 3, 2, f.l); p.ellipse(24.5, 14, 2, 1.4, f.h);
  p.ellipse(28, 14, 1.4, 1.4, KI_GLAS); p.px(27, 13, KI_GLAS_H).px(29, 15, KI_GLAS_D);
  // umgekehrtes V-Leitwerk
  p.poly([[3, 12], [7, 12], [4, 6], [2, 6]], f.d); p.poly([[3, 16], [7, 16], [4, 22], [2, 22]], f.d);
  p.px(2, 6, S).px(3, 6, S).px(2, 22, S).px(3, 22, S);
  // Schubpropeller
  p.rect(1, 10, 1, 9, '#d4dae0').px(1, 14, '#2a2e35').px(2, 14, f.x);
  schatten(p, 15, 9, 30);
});

einheit('unterwasserdrohne', (p) => {
  // flache U-Boot-Drohne: kein Turm, nur eine Sensorflosse, Sonarkuppel, Mantelpropeller, blaue Sensorlichter
  const f = { h: '#556b80', d: '#33424f', l: '#8197ab' };
  // flacher Tropfenrumpf
  p.poly([[4, 25], [8, 23], [26, 23], [29, 24], [30, 25], [29, 26], [26, 27], [8, 27]], f.h);
  p.rect(8, 23, 18, 1, f.l).rect(8, 27, 18, 1, f.d).px(5, 24, f.l);
  p.rect(9, 24, 15, 1, S).px(9, 24, SH).px(23, 24, SD);               // Rumpfstreifen
  for (let x = 10; x <= 22; x += 3) p.px(x, 25, KI_SENSOR);           // Sensorlichter
  // flache, nach hinten geneigte Sensorflosse
  p.poly([[13, 23], [16, 20], [21, 20], [22, 23]], f.h);
  p.rect(16, 20, 5, 1, f.l).linie(13, 23, 16, 20, f.l).linie(21, 20, 22, 22, f.d);
  p.rect(17, 21, 4, 1, KI_GLAS).px(17, 21, KI_GLAS_H);
  antenne(p, 18, 17, 19, '#2f3a46', KI_SENSOR);
  // Sonarkuppel aus Glas am Bug
  p.rect(27, 24, 2, 2, KI_GLAS).px(27, 24, KI_GLAS_H).px(29, 25, KI_GLAS_D).px(29, 24, KI_GLAS);
  // Mantelpropeller am Heck
  p.rect(1, 23, 3, 5, f.d).rect(2, 24, 1, 3, '#1c2630').rect(1, 23, 3, 1, f.l);
  p.px(3, 22, f.d).px(3, 28, f.d);
  eintauchen(p, 25, 27);
  wasser(p, 0, 31);
  p.px(17, 28, KI_SENSOR).px(23, 28, KI_SENSOR);
});

// ================================================================ FUSIONSZEITALTER

/** Leuchtendes Heckbecken: glühende Düse am Heck (x = Heckkante) und orange Kielwasser-Spur im Wasser. */
function heckglut(p, x, y = 25) {
  p.rect(x - 1, y - 1, 2, 3, FU_GLUT).px(x - 1, y, FU_GLUT_H).px(x, y, FU_KERN).px(x - 1, y - 1, FU_GLUT_H);
  p.px(x - 2, y, FU_GLUT).px(x - 2, y + 1, FU_GLUT_D).px(x - 3, y + 1, FU_GLUT_D);
  for (let i = 0; i < 7; i++) p.px(x - 2 - i + 2, 28, i < 2 ? FU_KERN : i < 4 ? FU_GLUT_H : i < 6 ? FU_GLUT : FU_GLUT_D);
  p.px(x - 1, 27, FU_GLUT_H).px(x - 2, 27, FU_GLUT);
}
/** Kastenförmiger Aufbau: Oberkante und linke Kante hell, rechte Kante dunkel. */
function block(p, x, y, w, h, f) {
  p.rect(x, y, w, h, f.h).rect(x, y, w, 1, f.l).rect(x, y, 1, h, f.l).rect(x + w - 1, y + 1, 1, h - 1, f.d);
}
/** Plasmaturm (Blick nach rechts): flacher Turm, Lauf, glühende Mündungskugel. */
function plasmaturm(p, x, y, f = FU) {
  p.rect(x, y, 4, 2, f.h).rect(x, y, 4, 1, f.l).rect(x + 1, y - 1, 2, 1, f.l).px(x + 3, y + 1, f.d);
  p.rect(x + 4, y, 2, 1, f.x);
  p.rect(x + 6, y - 1, 2, 2, FU_GLUT).px(x + 6, y - 1, FU_GLUT_H).px(x + 7, y - 1, FU_KERN).px(x + 7, y, FU_GLUT_D);
}

einheit('fusionszerstoerer', (p) => {
  // weißer Tarnkappen-Zerstörer: wellenbrechender Bug, kantiges Deckhaus, Schienengeschütz, glühendes Heckbecken
  const f = FU;
  rumpf(p, 4, 25, 22, 27, -4, 1, f, 1);
  p.rect(5, 23, 21, 1, S).px(5, 23, SH);                              // Rumpfstreifen
  p.rect(5, 24, 23, 1, FU_GLUT);                                       // Leuchtband
  for (let x = 8; x <= 26; x += 6) p.px(x, 24, FU_KERN);
  p.rect(5, 26, 24, 1, f.d);
  // kantiges Deckhaus mit zwei Facetten
  p.poly([[9, 22], [11, 15], [20, 15], [22, 22]], f.h);
  for (let y = 16; y <= 21; y++) for (let x = 16; x <= 22; x++) if (p.hole(x, y) === f.h) p.px(x, y, mische(f.h, f.d, 0.45));
  p.rect(11, 15, 9, 1, f.l).linie(9, 22, 11, 15, f.l).linie(20, 15, 22, 22, f.d);
  p.rect(12, 17, 8, 1, '#2c3440').px(13, 17, FU_GLUT_H).px(18, 17, FU_GLUT_H);
  p.rect(11, 20, 10, 1, FU_GLUT).px(15, 20, FU_GLUT_H);
  // Sensormast (Pyramide) mit Antenne und Wimpel
  p.poly([[13, 15], [15, 9], [17, 15]], f.h); p.linie(13, 15, 15, 9, f.l); p.linie(15, 9, 17, 15, f.d);
  p.px(15, 12, KI_GLAS).px(15, 13, KI_GLAS_D);
  antenne(p, 15, 5, 8, f.x, FU_GLUT_H);
  p.rect(12, 5, 3, 2, S).px(12, 6, SD).px(14, 5, SH);
  // Schienengeschütz am Bug
  p.rect(23, 20, 4, 2, f.h).rect(23, 20, 4, 1, f.l).px(26, 21, f.d);
  p.rect(27, 20, 4, 1, f.x).px(30, 20, FU_GLUT_H);
  // Landedeck achtern
  p.rect(4, 21, 5, 1, f.d).px(6, 21, FU_GLUT);
  wasser(p, 1, 30);
  heckglut(p, 4, 25);
});

einheit('plasmakreuzer', (p) => {
  // großer weißer Kreuzer: gestufte Aufbauten, Fusionsreaktor mit Glutfenster, drei Plasmatürme mit glühenden Mündungen
  const f = FU;
  rumpf(p, 2, 26, 20, 27, -3, 1, f, 1);
  p.rect(3, 21, 24, 1, S).rect(3, 22, 24, 1, SD).px(3, 21, SH);
  p.rect(3, 23, 26, 1, FU_GLUT);
  for (let x = 6; x <= 26; x += 5) p.px(x, 23, FU_KERN);
  p.rect(3, 26, 25, 1, f.d);
  // Reaktorblock achtern mit Glutfenster
  block(p, 6, 15, 7, 5, f);
  p.ellipse(9, 17, 1.6, 1.6, FU_GLUT_D); p.px(9, 17, FU_KERN).px(8, 17, FU_GLUT_H).px(10, 17, FU_GLUT_H).px(9, 16, FU_GLUT_H).px(9, 18, FU_GLUT);
  // Brückenturm
  block(p, 13, 11, 7, 9, f);
  p.rect(14, 13, 5, 1, '#2c3440').px(18, 13, FU_GLUT_H);
  p.rect(14, 16, 5, 1, FU_GLUT).px(14, 16, FU_GLUT_H);
  // Radarkuppel, Mast, Wimpel
  p.ellipse(15, 9, 1.6, 1.3, f.l); p.px(14, 8, '#ffffff').px(16, 10, f.d);
  antenne(p, 18, 4, 10, f.x, FU_GLUT_H); p.rect(17, 7, 3, 1, f.x);
  p.rect(19, 4, 3, 2, S).px(21, 5, SD).px(19, 4, SH);
  // Plasmatürme: vorn zwei (überhöht), achtern Startzellen
  plasmaturm(p, 20, 18); plasmaturm(p, 19, 15);
  p.rect(3, 19, 3, 1, f.d).px(3, 19, FU_GLUT).px(5, 19, FU_GLUT);
  wasser(p, 0, 31);
  heckglut(p, 3, 25);
});

einheit('hyperschallbomber', (p) => {
  // Pfeil-Wellenreiter (Aufsicht): extrem gestreckt, Nase glüht vom Hitzeschild, breiter Staustrahl-Auslass
  const f = FU;
  p.poly([[30, 14], [9, 3], [5, 4], [7, 12], [7, 16], [5, 24], [9, 25]], f.h);
  p.linie(30, 14, 9, 3, f.l); p.linie(29, 14, 10, 4, f.l);
  p.linie(30, 14, 9, 25, f.d);
  p.poly([[27, 14], [8, 12], [8, 16]], f.d);
  p.poly([[26, 14], [9, 13], [9, 15]], f.x);
  p.linie(10, 5, 20, 10, S); p.linie(10, 23, 20, 18, S); p.linie(10, 6, 18, 10, SD); p.linie(10, 22, 18, 18, SD);
  p.linie(8, 7, 13, 9, FU_GLUT); p.linie(8, 21, 13, 19, FU_GLUT);
  p.px(30, 14, FU_KERN).px(29, 14, FU_KERN).px(28, 14, FU_GLUT_H).px(27, 14, FU_GLUT_H).px(28, 13, FU_GLUT).px(28, 15, FU_GLUT).px(26, 13, FU_GLUT_D).px(26, 15, FU_GLUT_D);
  p.px(31, 14, FU_GLUT_H);
  p.rect(6, 9, 3, 1, f.l).rect(6, 19, 3, 1, f.d);
  p.rect(5, 11, 2, 7, f.x);
  strahl(p, 4, 14, 6, 5, GLUT_ORANGE);
  schatten(p, 16, 8);
});

einheit('hyperschallrakete', (p) => {
  // lange weiße Rakete im Steigflug, Nase glüht, langer Glühschweif
  gedreht(p, -0.62, 16, 15, (q) => {
    strahl(q, 7, 15, 3, 7, GLUT_ORANGE);
    q.rect(8, 14, 17, 3, FU.h).rect(8, 14, 17, 1, FU.l).rect(8, 16, 17, 1, FU.d);
    q.rect(13, 14, 1, 3, FU_GLUT).rect(20, 14, 1, 3, S).rect(21, 14, 1, 3, SD);
    q.poly([[25, 14], [30, 15], [25, 16]], FU.h);
    q.px(27, 15, FU_GLUT).px(28, 15, FU_GLUT_H).px(29, 15, FU_KERN).px(30, 15, '#ffffff').px(26, 14, FU_GLUT_D).px(26, 16, FU_GLUT_D);
    q.poly([[8, 13], [12, 13], [8, 10]], FU.d); q.poly([[8, 17], [12, 17], [8, 20]], FU.x);
    q.px(8, 10, S).px(8, 20, SD);
  });
  for (const [x, y, c] of [[4, 25, FU_GLUT_H], [2, 27, FU_GLUT], [6, 24, FU_KERN], [1, 29, FU_GLUT_D], [3, 26, FU_GLUT]]) p.px(x, y, c);
  schatten(p, 18, 4);
});

// ================================================================ WELTRAUMZEITALTER

einheit('raumjaeger', (p) => {
  // kleines Raumschiff in Seitenansicht: Keilrumpf, Kanzel, Rückenflosse, Bauchflügel, violettes Triebwerk
  const f = RA;
  // Bauchflügel (hinten unten, im Schatten)
  p.poly([[8, 16], [17, 16], [12, 21], [7, 21]], f.d); p.rect(7, 20, 5, 1, S).px(7, 20, SH);
  // Keilrumpf mit dunkler Unterseite
  koerper(p, [[6, 10], [16, 9], [30, 14], [17, 17], [6, 17]], f);
  p.linie(17, 16, 29, 14, f.d); p.rect(7, 16, 10, 1, f.d);
  fugen(p, 8, 24, 13, 4, f.d); p.rect(13, 11, 1, 5, f.d);
  // Kanzel (Glaskuppel)
  p.poly([[16, 10], [19, 8], [22, 9], [24, 11], [16, 11]], '#2b2f4a');
  p.px(18, 9, RA_VIO_H).px(19, 9, '#ffffff').px(20, 9, RA_VIO_H).px(22, 10, RA_VIO_D);
  // violetter Leuchtstreifen und Spielerfarbe
  p.linie(17, 13, 28, 14, RA_VIO); p.rect(7, 12, 5, 2, S).rect(7, 12, 5, 1, SH);
  // Rückenflosse
  p.poly([[6, 10], [10, 10], [7, 5], [5, 5]], f.h); p.linie(5, 5, 6, 10, f.l); p.rect(5, 5, 3, 1, S);
  // Laserkanone unter der Nase
  p.rect(20, 17, 7, 1, f.x).px(27, 17, RA_VIO_H);
  // Triebwerksdüse und Strahl
  p.rect(4, 11, 2, 6, f.x).rect(4, 11, 1, 6, f.d);
  strahl(p, 3, 14, 5, 4, GLUT_VIOLETT);
  schatten(p, 16, 6);
});

einheit('orbitalbomber', (p) => {
  // großer Raumbomber: flacher Rumpf, Radiatorpaneele, offener Bombenschacht, zwei Triebwerke
  const f = RA;
  koerper(p, [[4, 8], [22, 7], [30, 13], [26, 18], [4, 19]], f);
  for (let x = 7; x <= 18; x += 4) { p.rect(x, 6, 3, 2, RA_SOLAR).px(x, 6, RA_SOLAR_H).px(x + 2, 7, '#1d2450'); }
  p.poly([[22, 8], [26, 10], [24, 11], [21, 9]], '#2b2f4a'); p.px(23, 9, RA_VIO_H);
  fugen(p, 6, 26, 12, 3, f.d); p.rect(13, 9, 1, 9, f.d);
  p.rect(5, 14, 22, 1, RA_VIO).rect(5, 15, 22, 1, RA_VIO_D);
  p.rect(14, 10, 7, 2, S).rect(14, 10, 7, 1, SH);
  p.rect(10, 19, 10, 2, '#262838');
  for (const x of [11, 14, 17]) p.rect(x, 20, 2, 2, RA_VIO_D).px(x, 20, RA_VIO_H);
  p.poly([[4, 8], [8, 8], [5, 3], [3, 3]], f.h); p.px(3, 3, S).px(4, 3, S);
  p.poly([[4, 19], [8, 19], [5, 23], [3, 23]], f.d);
  p.rect(2, 9, 3, 4, f.x).rect(2, 14, 3, 4, f.x).rect(2, 9, 1, 9, f.d);
  strahl(p, 1, 11, 4, 3, GLUT_VIOLETT); strahl(p, 1, 16, 4, 3, GLUT_VIOLETT);
  schatten(p, 16, 9, 30);
});

einheit('kinetischer_stab', (p) => {
  // Trägerkapsel im Orbit (oben links) klinkt einen glühenden Wolframstab aus, der schräg herabstürzt
  // Trägerkapsel mit zwei Sonnensegeln
  for (const x0 of [0, 13]) {
    p.rect(x0, 3, 4, 4, RA_SOLAR).rect(x0, 3, 4, 1, RA_SOLAR_H);
    p.px(x0 + 2, 4, RA_SOLAR_H).px(x0 + 2, 5, RA_SOLAR_H);
  }
  p.rect(4, 5, 9, 1, RA.x);
  koerper(p, [[5, 1], [11, 1], [12, 9], [4, 9]], RA);
  p.rect(5, 5, 7, 1, S).rect(5, 6, 7, 1, SD).px(5, 5, SH);
  p.px(7, 3, RA_VIO).px(8, 3, RA_VIO_H).px(9, 3, RA_VIO);
  antenne(p, 8, 0, 0, RA.x);
  p.rect(9, 9, 3, 1, '#262838');                                      // Ausklinköffnung
  // Wolframstab (2 Pixel breit, Licht von links)
  for (let i = 0; i <= 13; i++) {
    const x = 12 + i * 0.85, y = 11 + i;
    p.px(x, y, '#a7adbd'); p.px(x + 1, y, '#5b5f6e');
  }
  p.px(12, 10, '#5b5f6e').px(13, 10, '#3c3f4b');
  // Plasmamantel um die Spitze (Bugstoßwelle)
  const sx = 24, sy = 25;
  p.linie(sx, sy, sx - 5, sy - 2, FU_GLUT_D); p.linie(sx, sy, sx - 2, sy - 5, FU_GLUT_D);
  p.linie(sx, sy, sx - 3, sy - 1, FU_GLUT); p.linie(sx, sy, sx - 1, sy - 3, FU_GLUT);
  p.px(sx - 1, sy - 1, FU_GLUT_H).px(sx - 1, sy, FU_GLUT_H).px(sx, sy - 1, FU_GLUT_H);
  p.px(sx, sy, FU_KERN).px(sx + 1, sy + 1, '#ffffff').px(sx + 1, sy, FU_KERN).px(sx, sy + 1, FU_KERN);
  schatten(p, 26, 3);
});

einheit('orbitalfaehre', (p) => {
  // schwere Fähre über dem Wasser: Frachtraum mit zwei Landeinheiten, Hubdüsen, Haupttriebwerk
  const f = RA;
  koerper(p, [[5, 8], [20, 7], [29, 13], [27, 18], [5, 19]], f);
  p.rect(8, 11, 13, 6, '#232637');
  for (const x of [9, 15]) {
    p.rect(x, 14, 5, 2, S).rect(x + 1, 13, 3, 1, SH).rect(x, 15, 5, 1, SD);
    p.rect(x + 3, 13, 3, 1, '#4a4d5e');
    p.px(x, 16, '#111').px(x + 2, 16, '#111').px(x + 4, 16, '#111');
  }
  p.rect(8, 10, 13, 1, f.d);
  p.poly([[21, 9], [25, 10], [26, 12], [21, 12]], '#2b2f4a'); p.px(22, 10, RA_VIO_H).px(23, 10, '#ffffff');
  p.rect(6, 18, 21, 1, RA_VIO);
  p.rect(22, 15, 5, 1, S);
  for (const x of [9, 20]) {
    p.rect(x, 19, 3, 2, f.x).px(x, 19, f.d);
    for (let y = 21; y <= 26; y++) { p.px(x + 1, y, y < 24 ? '#ffffff' : '#ddd4ff'); if (y < 25) { p.px(x, y, '#a490ff'); p.px(x + 2, y, '#a490ff'); } }
    p.px(x - 1, 27, SCHAUM).px(x + 3, 27, SCHAUM).px(x - 2, 27, PAL.wasserH).px(x + 4, 27, PAL.wasserH);
  }
  p.poly([[5, 8], [9, 8], [6, 3], [4, 3]], f.h); p.px(4, 3, S).px(5, 3, S);
  p.rect(3, 10, 2, 7, f.x);
  strahl(p, 2, 13, 5, 3, GLUT_VIOLETT);
  wasser(p, 1, 30);
});

einheit('raumfrachter', (p) => {
  // Handelsraumschiff: langer Kiel mit Containern oben und unten, Brückenmodul vorn, großes Triebwerk hinten
  const f = RA;
  p.rect(6, 13, 20, 2, f.d).rect(6, 13, 20, 1, f.h);
  const farben = [S, '#c26b3d', '#3e7fae', SD, '#6aa36a', '#d0b04a'];
  let n = 0;
  for (let x = 8; x <= 20; x += 4) for (const y of [9, 15]) {
    const c = farben[n++ % farben.length];
    p.rect(x, y, 4, 4, c);
    const d = c === S ? SD : c === SD ? SD : dunkel(c, 0.3), l = c === S ? SH : c === SD ? S : hell(c, 0.3);
    p.rect(x, y, 4, 1, l).rect(x + 3, y, 1, 4, d).px(x + 1, y + 2, d);
  }
  koerper(p, [[24, 10], [28, 10], [30, 14], [28, 18], [24, 18]], f);
  p.rect(27, 12, 2, 2, '#2b2f4a').px(27, 12, RA_VIO_H);
  p.rect(24, 16, 4, 1, RA_VIO);
  antenne(p, 26, 6, 9, f.x, RA_VIO_H); p.rect(25, 8, 3, 1, f.x);
  koerper(p, [[2, 9], [7, 10], [7, 18], [2, 19]], f);
  p.rect(3, 12, 3, 1, RA_VIO).rect(3, 16, 3, 1, RA_VIO_D);
  strahl(p, 1, 14, 7, 2, GLUT_VIOLETT);
  schatten(p, 16, 9);
});

einheit('raumsonde', (p) => {
  // Späher: goldfolierter Sondenkörper, Parabolantenne, zwei Sonnensegel, Messausleger
  const segel = (x0) => {
    p.rect(x0, 12, 9, 5, RA_SOLAR);
    for (let x = x0; x < x0 + 9; x += 3) p.rect(x, 12, 1, 5, RA_SOLAR_H);
    p.rect(x0, 12, 9, 1, RA_SOLAR_H).rect(x0, 14, 9, 1, '#3a479a');
  };
  segel(1); segel(22);
  p.rect(1, 12, 1, 5, S).rect(30, 12, 1, 5, SD).px(1, 12, SH);            // Spielerfarbene Segelkanten
  p.rect(10, 14, 3, 1, RA.x).rect(19, 14, 3, 1, RA.x);
  p.rect(13, 11, 6, 7, RA_FOLIE).rect(13, 11, 6, 1, '#f0cd70').rect(18, 11, 1, 7, RA_FOLIE_D).rect(13, 17, 6, 1, RA_FOLIE_D);
  p.px(14, 13, '#f0cd70').px(16, 15, RA_FOLIE_D);
  p.rect(13, 14, 6, 1, S).px(13, 14, SH).px(18, 14, SD);
  p.rect(15, 9, 2, 2, RA.d);
  p.ellipse(16, 6, 4, 1.6, RA.l); p.rect(12, 7, 9, 1, RA.d); p.px(13, 5, '#ffffff');
  antenne(p, 16, 2, 5, RA.x, RA_VIO_H);
  p.linie(18, 18, 24, 23, RA.x); p.px(25, 24, RA_VIO).px(24, 24, RA_VIO_H);
  p.rect(14, 18, 4, 1, RA.x); p.px(15, 19, '#a490ff').px(16, 19, '#ffffff');
  schatten(p, 16, 6);
});

// ================================================================ STERNENZEITALTER

/** Kristallkörper: obere Facette hell, untere Hellblau, entlang der Mittellinie ym von hinten nach vorn. */
function kristall(p, hinten, vorn, ym, hoch, tief, f = ST) {
  const xs = hinten + (vorn - hinten) * 0.35;
  p.poly([[hinten, ym], [xs, ym - hoch], [vorn, ym]], f.l);
  p.poly([[hinten + 1, ym], [xs, ym - hoch + 1], [vorn - 2, ym]], f.h);
  p.poly([[hinten, ym], [xs, ym + tief], [vorn, ym]], ST_EIS);
  p.poly([[hinten + 2, ym + 1], [xs, ym + tief - 1], [vorn - 3, ym + 1]], ST_EIS_D);
}

einheit('sternenjaeger', (p) => {
  // eleganter Kristalljäger: lange Klinge, Kristallflossen, leuchtende Kernlinie
  p.poly([[4, 13], [11, 13], [5, 4]], ST.h); p.linie(4, 13, 5, 4, ST.l); p.linie(5, 4, 11, 13, ST.d);
  p.poly([[5, 15], [12, 15], [7, 23]], ST_EIS_D); p.linie(5, 15, 7, 23, ST_EIS);
  p.linie(6, 7, 7, 12, S); p.linie(7, 7, 9, 12, SD);
  kristall(p, 3, 30, 14, 4, 3);
  p.linie(4, 14, 28, 14, ST_VIO); p.linie(8, 14, 22, 14, ST_LICHT);
  p.px(18, 12, '#ffffff').px(17, 11, ST.l);
  p.poly([[17, 11], [20, 10], [23, 12]], ST_VIO_D); p.px(20, 11, ST_VIO);
  p.rect(12, 16, 5, 1, S);
  leuchten(p, 3, 14, 2, GLUT_STERN);
  p.px(0, 14, ST_VIO);
  schatten(p, 16, 6);
});

einheit('sternenbomber', (p) => {
  // großer Kristallbomber: wuchtiger Keilkristall, sichtbarer Antimateriekern, Bombenträger mit leuchtenden Kugeln
  // nach hinten gepfeilte Kristallsplitter oben und unten
  p.poly([[4, 10], [12, 8], [2, 2]], ST.h); p.linie(2, 2, 4, 10, ST.l); p.linie(2, 2, 12, 8, ST.l);
  p.linie(4, 5, 8, 8, S);
  p.poly([[4, 18], [12, 19], [3, 24]], ST_EIS_D); p.linie(3, 24, 12, 19, ST_EIS);
  // Hauptkristall: großer Rhombus (obere Facetten hell, untere eisblau)
  p.poly([[3, 10], [13, 6], [31, 14], [3, 14]], ST.h);
  p.poly([[3, 14], [31, 14], [14, 21], [3, 18]], ST_EIS);
  p.poly([[13, 7], [30, 14], [13, 14]], mische(ST.h, ST.d, 0.35));   // vordere, abgewandte Facette
  p.linie(3, 10, 13, 6, ST.l); p.linie(13, 6, 30, 13, ST.l); p.px(13, 6, '#ffffff');
  p.linie(3, 18, 14, 21, ST_EIS_D); p.linie(14, 21, 30, 15, ST_EIS_D);
  p.linie(13, 7, 13, 20, ST.d);                                        // Facettenkante
  p.rect(4, 14, 27, 1, ST_VIO).px(22, 14, ST_LICHT).px(27, 14, '#ffffff');
  p.rect(5, 11, 7, 2, S).rect(5, 11, 7, 1, SH);                        // Spielerfarbenes Band
  p.rect(5, 16, 7, 1, SD);
  // Antimateriekern im Sichtfenster
  p.rect(16, 11, 4, 2, ST_VIO).rect(17, 11, 2, 1, ST_LICHT).px(17, 11, '#ffffff').rect(16, 12, 4, 1, ST_VIO_D);
  // Bombenträger mit Antimaterie-Kugeln
  p.rect(7, 20, 13, 1, ST.x);
  for (const x of [8, 12, 16]) { p.rect(x, 21, 3, 2, ST_VIO).px(x, 21, ST_LICHT).px(x + 1, 21, '#ffffff').px(x + 2, 22, ST_VIO_D); }
  // Antriebe
  p.rect(2, 9, 1, 11, ST.x);
  leuchten(p, 2, 11, 1.6, GLUT_STERN); leuchten(p, 2, 17, 1.6, GLUT_STERN);
  schatten(p, 16, 9, 30);
});

einheit('antimaterie_rakete', (p) => {
  // Kristallrakete mit Einschlusskugel, in der der Antimateriekern violett leuchtet; Lichtschweif
  gedreht(p, -0.62, 16, 15, (q) => {
    strahl(q, 7, 15, 3, 7, GLUT_STERN);
    q.rect(8, 14, 17, 3, ST.h).rect(8, 14, 17, 1, ST.l).rect(8, 16, 17, 1, ST.d);
    q.poly([[25, 14], [30, 15], [25, 16]], ST_EIS); q.linie(25, 14, 29, 15, ST.l);
    q.rect(21, 14, 2, 3, S).rect(21, 14, 2, 1, SH).rect(21, 16, 2, 1, SD);
    // Sichtfenster auf den Kern, eingefasst von zwei Einschlussringen
    q.rect(13, 14, 5, 3, ST_VIO).rect(13, 14, 5, 1, ST_VIO_D);
    q.rect(14, 15, 3, 1, ST_LICHT).px(15, 15, '#ffffff');
    q.rect(12, 13, 1, 5, ST.x).rect(18, 13, 1, 5, ST.x).px(12, 13, ST.l).px(18, 13, ST.l);
    // Kristallflossen
    q.poly([[8, 13], [11, 13], [8, 11]], ST_EIS); q.poly([[8, 17], [11, 17], [8, 19]], ST_EIS_D);
    q.px(8, 11, S).px(8, 19, SD);
  });
  for (const [x, y, c] of [[4, 25, ST_VIO], [2, 27, ST_LICHT], [6, 27, ST_VIO_D], [1, 29, ST_VIO], [3, 23, ST_EIS]]) p.px(x, y, c);
  schatten(p, 18, 4);
});

einheit('gravitationskreuzer', (p) => {
  // Kristallschiff mit zwei leuchtenden Gravitationsringen unter dem Rumpf; schwebt frei über dem Wasser
  // Rumpf
  p.poly([[2, 10], [26, 10], [31, 12], [26, 16], [6, 16]], ST.h);
  p.rect(3, 10, 23, 1, ST.l);
  p.poly([[5, 14], [28, 14], [26, 16], [6, 16]], ST_EIS); p.rect(7, 16, 19, 1, ST_EIS_D);
  p.rect(3, 11, 23, 1, S).px(3, 11, SH);
  p.rect(4, 13, 25, 1, ST_VIO);
  for (const x of [6, 12, 18, 24]) p.px(x, 13, ST_LICHT);
  // nach hinten geneigte Kristalltürme
  p.poly([[6, 10], [7, 6], [9, 6], [12, 10]], ST.h); p.linie(6, 10, 7, 6, ST.l); p.linie(9, 6, 12, 10, ST.d);
  p.poly([[12, 10], [13, 2], [15, 2], [21, 10]], ST.h); p.linie(12, 10, 13, 2, ST.l); p.linie(15, 2, 21, 10, ST.d);
  p.linie(14, 4, 15, 9, ST_VIO); p.px(14, 5, ST_LICHT);
  p.rect(15, 7, 3, 1, ST_VIO_D);
  // Bugemitter
  leuchten(p, 28, 11, 1.5, [ST_VIO_D, ST_VIO, '#ffffff']);
  // Gravitationsringe: zwei flache, schräg gesehene Ringe unter dem Rumpf (außen violett, innen dunkles Feld, heller Kern)
  for (const x of [10, 22]) {
    p.ellipse(x, 18.5, 4.2, 1.6, ST_VIO);
    ring(p, x, 18.5, 4.2, 1.6, ST_VIO_D, ST_LICHT);
    p.rect(x - 2, 18, 5, 1, '#2a1f4a').rect(x - 1, 19, 3, 1, '#2a1f4a').px(x, 18, '#ffffff').px(x - 1, 18, ST_VIO).px(x + 1, 18, ST_VIO);
  }
  // Wasser mit Eindellungen und Lichtschimmer unter den Ringen
  wasser(p, 0, 31);
  for (const x of [10, 22]) {
    p.rect(x - 3, 28, 7, 1, ST_EIS).px(x, 28, '#ffffff').px(x - 3, 28, PAL.wasserH).px(x + 3, 28, PAL.wasserH);
    p.rect(x - 1, 27, 3, 1, ST_VIO).px(x, 27, ST_LICHT);
  }
});

einheit('sternensonde', (p) => {
  // Späher mit großem, schimmerndem Lichtsegel und kleinem Kristallkern
  const segel = [[16, 1], [29, 12], [16, 23], [3, 12]];
  const M = '#010203';
  p.poly(segel, M);
  umfaerben(p, 0, 0, 31, 31, M, (x, y) => {
    const glanz = (x + y) % 9 === 0;                                   // feine Lichtschlieren
    if (glanz) return '#ffffff';
    return x + y < 28 ? '#e4e6fb' : '#cbbff2';                          // beleuchtete und abgewandte Hälfte
  });
  p.linie(16, 1, 29, 12, '#ffffff'); p.linie(3, 12, 16, 1, '#ffffff');
  p.linie(29, 12, 16, 23, ST_VIO_D); p.linie(16, 23, 3, 12, ST_VIO_D);
  // Spielerfarbener Saum
  p.linie(17, 2, 22, 6, S); p.linie(10, 6, 15, 2, S); p.linie(17, 3, 21, 6, SH);
  // Takelage zum Kern
  for (const [x, y] of segel) p.linie(x, y, 16, 12, ST_EIS_D);
  // Kristallkern
  p.poly([[16, 8], [19, 12], [16, 16], [13, 12]], ST.h);
  p.linie(16, 8, 13, 12, '#ffffff'); p.linie(19, 12, 16, 16, ST_EIS_D); p.linie(13, 12, 16, 16, ST_EIS);
  leuchten(p, 16, 12, 1.4, [ST_VIO, ST_LICHT, '#ffffff']);
  p.rect(15, 15, 3, 1, S).px(15, 15, SH);
  schatten(p, 16, 7);
});

einheit('sternenfrachter', (p) => {
  // riesiger Frachter über die ganze Breite: Kristallkiel, Reihen facettierter Frachtkapseln, Lichtbänder, Großantrieb
  // Frachtkapseln oben (hell) und unten (eisblau)
  for (const x of [5, 11, 17]) {
    p.poly([[x, 10], [x, 6], [x + 1, 5], [x + 4, 5], [x + 5, 6], [x + 5, 10]], ST.h);
    p.rect(x + 1, 5, 4, 1, ST.l).rect(x, 6, 1, 4, ST.l).rect(x + 5, 6, 1, 4, ST.d);
    p.rect(x + 1, 7, 4, 1, S).px(x + 1, 7, SH);
    p.poly([[x, 18], [x, 21], [x + 1, 22], [x + 4, 22], [x + 5, 21], [x + 5, 18]], ST_EIS);
    p.rect(x + 1, 22, 4, 1, ST_EIS_D).rect(x + 5, 18, 1, 4, ST_EIS_D);
    p.rect(x + 1, 20, 4, 1, SD);
  }
  // Kiel
  koerper(p, [[2, 10], [24, 10], [31, 14], [24, 18], [2, 18]], ST);
  p.rect(3, 12, 23, 1, ST_LICHT).rect(3, 13, 24, 1, ST_VIO).rect(3, 16, 22, 1, ST_EIS);
  for (const x of [5, 11, 17, 23]) p.px(x, 12, '#ffffff').px(x, 16, '#ffffff').px(x, 14, ST_VIO_D).px(x, 15, ST_VIO_D);
  // Brücke
  p.poly([[24, 11], [28, 12], [24, 12]], ST_VIO_D); p.px(25, 11, ST_VIO).px(26, 12, ST_LICHT);
  p.rect(26, 15, 3, 1, S);
  // Großantrieb
  p.rect(2, 10, 2, 9, ST.x).px(2, 10, ST.d);
  leuchten(p, 2, 14, 3, GLUT_STERN);
  strahl(p, 0, 14, 4, 1, GLUT_STERN);
  schatten(p, 16, 11, 30);
});
