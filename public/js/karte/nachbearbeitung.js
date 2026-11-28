// Nachbearbeitung der Karte mit einem WebGL-Shader (optional, mit Rückfall).
// Die Karte wird wie immer mit Canvas 2D gezeichnet. Ist die Nachbearbeitung an, legt sich darüber eine WebGL-Fläche,
// die das fertige Bild als Textur nimmt und drei Dinge tut:
//   1. Farbwelt je Zeitalter (leichte Tönung, Sättigung, Kontrast) – die "Zeitalter-Stile" aus dem Auftrag,
//   2. Leuchten heller Pixel (Lichter bei Nacht, Lava, Laser, Plasma) als weicher Schein,
//   3. Vignette (dunklere Ränder lenken den Blick in die Mitte; im All stärker).
// Ohne WebGL, bei Fehlern oder wenn ein Bild im Mittel zu lange dauert, schaltet sie sich selbst ab:
// Dann bleibt alles genau wie vorher (die WebGL-Fläche wird entfernt, die 2D-Karte ist unverändert sichtbar).
import { ZEITALTER } from '../../shared/daten/zeitalter.js';

/** Farbwelt je Zeitalter: Tönung (RGB-Faktoren um 1), Sättigung (1 = unverändert), Kontrast, Stärke des Leuchtens. */
export const FARBWELTEN = [
  { ton: [1.06, 1.0, 0.9], saett: 0.96, kontrast: 1.02, leuchten: 0.35 },  // Antike: warm, erdig
  { ton: [1.05, 1.01, 0.92], saett: 1.0, kontrast: 1.03, leuchten: 0.35 }, // Klassik: sonnig
  { ton: [1.02, 0.99, 0.94], saett: 0.95, kontrast: 1.04, leuchten: 0.4 },  // Mittelalter: gedeckt
  { ton: [1.05, 1.0, 0.9], saett: 1.04, kontrast: 1.04, leuchten: 0.4 },   // Renaissance: golden
  { ton: [1.03, 0.98, 0.93], saett: 0.88, kontrast: 1.06, leuchten: 0.45 }, // Industrie: rußig, entsättigt
  { ton: [0.99, 1.0, 1.02], saett: 0.97, kontrast: 1.05, leuchten: 0.45 },  // Moderne: neutral kühl
  { ton: [0.97, 1.02, 1.03], saett: 0.98, kontrast: 1.06, leuchten: 0.5 },  // Atomzeit: Türkis
  { ton: [0.95, 1.0, 1.08], saett: 1.03, kontrast: 1.06, leuchten: 0.65 },  // KI: Glas und Blau
  { ton: [1.05, 1.02, 0.97], saett: 1.05, kontrast: 1.05, leuchten: 0.75 }, // Fusion: hell, warmes Plasma
  { ton: [0.99, 0.96, 1.08], saett: 1.02, kontrast: 1.08, leuchten: 0.8 },  // Weltraum: Violett
  { ton: [0.98, 1.02, 1.07], saett: 1.06, kontrast: 1.08, leuchten: 0.9 },  // Sterne: Silber und Kristall
];

const VS = `attribute vec2 p; varying vec2 uv; void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D bild;
uniform vec2 px;          // Größe eines Pixels in UV
uniform vec3 ton;
uniform float saett, kontrast, leuchten, vignette, staerke;
float hell(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 glanz(vec2 o) { vec3 c = texture2D(bild, uv + o).rgb; return c * smoothstep(0.72, 0.95, hell(c)); }
void main() {
  vec3 c = texture2D(bild, uv).rgb;
  // Leuchten: 12 Abtastungen auf zwei Ringen, nur helle Pixel tragen bei
  vec3 g = vec3(0.0);
  vec2 r1 = px * 5.0, r2 = px * 11.0;
  g += glanz(vec2( r1.x, 0.0)) + glanz(vec2(-r1.x, 0.0)) + glanz(vec2(0.0,  r1.y)) + glanz(vec2(0.0, -r1.y));
  g += glanz(r1 * vec2(0.7, 0.7)) + glanz(r1 * vec2(-0.7, 0.7)) + glanz(r1 * vec2(0.7, -0.7)) + glanz(r1 * vec2(-0.7, -0.7));
  g += 0.6 * (glanz(vec2(r2.x, 0.0)) + glanz(vec2(-r2.x, 0.0)) + glanz(vec2(0.0, r2.y)) + glanz(vec2(0.0, -r2.y)));
  c += g * (leuchten * 0.075);
  // Farbwelt: Tönung, Sättigung, Kontrast (mit Stärke gemischt, damit die Lesbarkeit bleibt)
  vec3 f = c * ton;
  float l = hell(f);
  f = mix(vec3(l), f, saett);
  f = (f - 0.5) * kontrast + 0.5;
  c = mix(c, f, staerke);
  // Vignette
  vec2 d = uv - 0.5;
  c *= 1.0 - vignette * smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.9)));
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

let gl = null, glCv = null, prog = null, tex = null, ort = {}, aktiv = false, gewuenscht = true;
let zuLangsam = 0, abgeschaltetGrund = '';

/** Ist die Nachbearbeitung gerade aktiv? */
export const istAktiv = () => aktiv;
export const grund = () => abgeschaltetGrund;

function bauen(quelle) {
  glCv = document.createElement('canvas');
  glCv.id = 'karte-gl';
  glCv.setAttribute('aria-hidden', 'true');
  Object.assign(glCv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', display: 'block' });
  gl = glCv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('kein WebGL');
  const sh = (art, text) => { const s = gl.createShader(art); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['bild', 'px', 'ton', 'saett', 'kontrast', 'leuchten', 'vignette', 'staerke']) ort[n] = gl.getUniformLocation(prog, n);
  tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(ort.bild, 0);
  glCv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); abschalten('WebGL-Kontext verloren'); });
  quelle.after(glCv);
}

/** Schaltet ab und räumt auf: Die 2D-Karte ist danach unverändert sichtbar. */
function abschalten(warum) {
  aktiv = false; abgeschaltetGrund = warum || '';
  if (glCv) glCv.remove();
  glCv = null; gl = null; prog = null; tex = null; ort = {};
}

/** An- oder ausschalten (Einstellung). Beim ersten Anschalten wird WebGL eingerichtet; scheitert das, bleibt es aus. */
export function setzeNachbearbeitung(an, quelle) {
  gewuenscht = !!an;
  if (!gewuenscht) { abschalten(''); return false; }
  if (aktiv) return true;
  try { bauen(quelle); aktiv = true; zuLangsam = 0; abgeschaltetGrund = ''; } catch (e) { abschalten(String(e?.message || e)); }
  return aktiv;
}

/**
 * Nach jedem gezeichneten Bild: das 2D-Bild durch den Shader schicken.
 * o: { zeitalter, ebene (0 Erde, 1 All), nacht (0..1), msBild (gleitende Zeichenzeit) }.
 */
export function nachbearbeiten(quelle, o) {
  if (!aktiv || !gl) return;
  const t0 = performance.now();
  try {
    if (glCv.width !== quelle.width || glCv.height !== quelle.height) { glCv.width = quelle.width; glCv.height = quelle.height; gl.viewport(0, 0, quelle.width, quelle.height); }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, quelle);
    const fw = FARBWELTEN[Math.max(0, Math.min(ZEITALTER.length - 1, o.zeitalter || 0))];
    const all = o.ebene === 1;
    gl.uniform2f(ort.px, 1 / quelle.width * (quelle.width / Math.max(1, quelle.clientWidth || quelle.width)), 1 / quelle.height * (quelle.height / Math.max(1, quelle.clientHeight || quelle.height)));
    gl.uniform3fv(ort.ton, all ? [1, 1, 1] : fw.ton);
    gl.uniform1f(ort.saett, all ? 1.05 : fw.saett);
    gl.uniform1f(ort.kontrast, all ? 1.08 : fw.kontrast);
    gl.uniform1f(ort.leuchten, (all ? 1.0 : fw.leuchten) * (0.6 + 0.8 * (o.nacht || 0)));
    gl.uniform1f(ort.vignette, all ? 0.42 : 0.22);
    gl.uniform1f(ort.staerke, all ? 0.85 : 0.65);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  } catch (e) { abschalten(String(e?.message || e)); return; }
  // Schutz: Dauern Zeichnen plus Nachbearbeitung im Mittel zu lange, schaltet sie sich ab (nichts soll schlechter laufen als vorher)
  const gesamt = (o.msBild || 0) + (performance.now() - t0);
  zuLangsam = gesamt > 28 ? zuLangsam + 1 : Math.max(0, zuLangsam - 2);
  if (zuLangsam > 90) { abschalten('zu langsam auf diesem Gerät'); o.beiAbschaltung?.(); }
}
