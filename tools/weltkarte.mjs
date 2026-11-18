#!/usr/bin/env node
// Zeichnet die Weltkarte mit allen Städten (Spieler, KI-Völker, Stadtstaaten) und Barbarenlagern als PNG.
//   ADMIN_TOKEN=... node tools/weltkarte.mjs [ausgabe.png]
// Andere Adresse: VOLK_URL=http://localhost:8787. Braucht Playwright (npm i) und das Secret ADMIN_TOKEN im Worker.
import { chromium } from 'playwright';
import { BREITE, HOEHE } from '../public/shared/hex.js';
import { karte } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';

const FARBE = { grasland: '#7fae5a', ebene: '#b3b66a', wald: '#3f7a3f', dschungel: '#2f6b3a', savanne: '#c4b45a', huegel: '#9a8a5c', gebirge: '#7d7a78', wueste: '#e0c98a', tundra: '#a8b4a0', schnee: '#f0f4f6', sumpf: '#5e7a5a', kueste: '#6fb7d6', meer: '#3d7fc4', tiefsee: '#2a5ea0', see: '#4f93cf', oase: '#5fb98a', vulkan: '#a04030', korallenriff: '#e08a9a', mangroven: '#4a8a6a', salzebene: '#e8e4d8', kristallgebirge: '#9a80c8', irrlichtmoor: '#6a7ab8', pilzwald: '#b06aa8' };

export async function zeichneWeltkarte(d, pfad) {
  const k = karte();
  const grund = Array.from({ length: BREITE * HOEHE }, (_, i) => FARBE[GELAENDE[k.gelaende[i]].id] || '#888');
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await seite.setContent('<body style="margin:0"><canvas id=c></canvas></body>');
  await seite.evaluate(({ d, grund, B, H }) => {
    const Z = 7, W = B * Z + Z / 2, HH = H * Z, LEG = 290;
    const c = document.getElementById('c'); c.width = W + LEG; c.height = HH; const x = c.getContext('2d');
    x.fillStyle = '#10151c'; x.fillRect(0, 0, c.width, c.height);
    const pos = (i) => [ (i % B) * Z + ((((i / B) | 0) & 1) ? Z / 2 : 0) + Z / 2, ((i / B) | 0) * Z + Z / 2 ];
    for (let i = 0; i < B * H; i++) { const [px, py] = pos(i); x.fillStyle = grund[i]; x.fillRect(px - Z / 2, py - Z / 2, Z, Z); }
    const volk = Object.fromEntries(d.voelker.map((v) => [v.id, v]));
    x.fillStyle = '#000'; for (const l of d.lager || []) { const [px, py] = pos(l.feld); x.fillRect(px - 2, py - 2, 4, 4); x.fillStyle = '#c00'; x.fillRect(px - 1, py - 1, 2, 2); x.fillStyle = '#000'; }
    const rang = { spieler: 3, ki: 2, stadtstaat: 1 };
    const st = [...d.staedte].sort((a, b) => (rang[volk[a.volk]?.art] || 0) - (rang[volk[b.volk]?.art] || 0));
    for (const s of st) {
      const v = volk[s.volk]; if (!v) continue; const [px, py] = pos(s.feld);
      const r = v.art === 'spieler' ? 7 : v.art === 'ki' ? 6 : 5;
      x.lineWidth = 2; x.strokeStyle = '#fff'; x.fillStyle = v.farbe || '#f0f';
      x.beginPath();
      if (v.art === 'stadtstaat') { x.moveTo(px, py - r); x.lineTo(px + r, py); x.lineTo(px, py + r); x.lineTo(px - r, py); x.closePath(); }
      else if (v.art === 'ki') x.rect(px - r + 1, py - r + 1, 2 * r - 2, 2 * r - 2);
      else x.arc(px, py, r, 0, Math.PI * 2);
      x.fill(); x.stroke();
      if (v.art !== 'stadtstaat' || true) { x.font = 'bold 12px sans-serif'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText(s.name, px + r + 3, py + 4); x.fillStyle = '#fff'; x.fillText(s.name, px + r + 3, py + 4); }
    }
    // Legende
    x.fillStyle = '#e8edf2'; x.font = 'bold 15px sans-serif'; let y = 28; x.fillText('Volk: Weltkarte', W + 14, y); y += 26;
    const gruppen = [['spieler', 'Spieler'], ['ki', 'KI-Völker'], ['stadtstaat', 'Stadtstaaten']];
    for (const [art, titel] of gruppen) {
      x.font = 'bold 13px sans-serif'; x.fillStyle = '#9fb3c8'; x.fillText(titel, W + 14, y); y += 20;
      for (const v of d.voelker.filter((q) => q.art === art)) {
        const n = d.staedte.filter((s) => s.volk === v.id).length;
        x.fillStyle = v.farbe; x.fillRect(W + 14, y - 11, 13, 13); x.strokeStyle = '#fff'; x.lineWidth = 1; x.strokeRect(W + 14, y - 11, 13, 13);
        x.fillStyle = '#e8edf2'; x.font = '12px sans-serif'; x.fillText(`${v.name}${art === 'spieler' ? (v.online ? ' (online)' : '') : ''} · ${n} ${n === 1 ? 'Stadt' : 'Städte'}`, W + 34, y); y += 19;
      }
      y += 8;
    }
    x.fillStyle = '#c00'; x.fillRect(W + 14, y - 10, 10, 10); x.fillStyle = '#e8edf2'; x.font = '12px sans-serif'; x.fillText(`Barbarenlager (${(d.lager || []).length})`, W + 34, y);
    x.fillText('Kreis = Spieler, Quadrat = KI,', W + 14, y + 26); x.fillText('Raute = Stadtstaat', W + 14, y + 42);
  }, { d, grund, B: BREITE, H: HOEHE });
  await seite.locator('#c').screenshot({ path: pfad });
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.VOLK_URL || 'https://volk.leifps.workers.dev';
  const token = process.env.ADMIN_TOKEN;
  if (!token) { console.error('Bitte ADMIN_TOKEN setzen (siehe Kopf dieser Datei).'); process.exit(1); }
  const r = await fetch(`${url}/api/admin/karte`, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json().catch(() => ({ ok: false, fehler: 'Keine gültige Antwort (Status ' + r.status + ')' }));
  if (!j.ok) { console.error('Fehler: ' + j.fehler); process.exit(1); }
  const out = process.argv[2] || 'weltkarte.png';
  await zeichneWeltkarte(j, out);
  console.log('Geschrieben: ' + out);
}
