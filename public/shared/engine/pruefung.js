// Konsistenzprüfung des Spielzustands (für Tests, Migration und das Admin-Werkzeug).
// Liefert eine Liste verständlicher Probleme; eine leere Liste heißt: alles in Ordnung.
import { EINHEIT, GEB, WUNDER_NACH_ID, FORSCHUNG, VERBESSERUNG, BEFOERDERUNG } from '../daten/index.js';
import { schichtVon } from './einheiten.js';

export function zustandPruefen(spiel) {
  const s = spiel, z = s.z, p = [];
  const belegt = new Map();
  for (const e of s.alleEinheiten()) {
    if (!EINHEIT[e.typ]) { p.push(`Einheit ${e.id}: unbekannter Typ ${e.typ}`); continue; }
    if (!z.voelker[e.volk]) p.push(`Einheit ${e.id}: Volk ${e.volk} fehlt`);
    if (!(e.hp > 0 && e.hp <= 100)) p.push(`Einheit ${e.id}: Lebenspunkte ${e.hp}`);
    for (const b of e.befoerderungen || []) if (!BEFOERDERUNG[b]) p.push(`Einheit ${e.id}: unbekannte Beförderung ${b}`);
    if (e.in) { if (!z.einheiten[e.in]) p.push(`Einheit ${e.id}: verladen in fehlende Einheit ${e.in}`); continue; }
    const sch = schichtVon(EINHEIT[e.typ]);
    if (sch === 'luft' || sch === 'handel' || z.voelker[e.volk]?.art === 'tiere') continue;
    // Eigene Einheiten dürfen durch eigene hindurchlaufen: Die Stapelregel gilt nur für stehende Einheiten.
    if (e.pfad?.length) continue;
    const k = (e.ebene || 0) + ':' + e.feld + ':' + sch;
    if (belegt.has(k)) p.push(`Stapelregel verletzt auf ${k}: Einheiten ${belegt.get(k)} und ${e.id}`);
    belegt.set(k, e.id);
  }
  for (const st of s.alleStaedte()) {
    if (!z.voelker[st.volk]) p.push(`Stadt ${st.id}: Volk ${st.volk} fehlt`);
    for (const g of Object.keys(st.gebaeude || {})) if (!GEB[g]) p.push(`Stadt ${st.id}: unbekanntes Gebäude ${g}`);
    for (const b of [...(st.bau || []), ...(st.schlange || [])]) {
      const t = b.art === 'gebaeude' ? GEB : b.art === 'wunder' ? WUNDER_NACH_ID : b.art === 'einheit' ? EINHEIT : null;
      if (!t || !t[b.id]) p.push(`Stadt ${st.id}: unbekannter Bauauftrag ${b.art}:${b.id}`);
    }
    for (const i of st.gebiet || []) if (z.felder[i]?.s !== st.id) p.push(`Stadt ${st.id}: Gebietsfeld ${i} gehört laut Feld nicht ihr`);
  }
  for (const [i, f] of Object.entries(z.felder)) {
    if (f.s && !z.staedte[f.s]?.gebiet?.includes(+i)) p.push(`Feld ${i}: gehört Stadt ${f.s}, die es nicht kennt`);
    if (f.v && !VERBESSERUNG[f.v]) p.push(`Feld ${i}: unbekannte Verbesserung ${f.v}`);
    if (f.w && !VERBESSERUNG[f.w]) p.push(`Feld ${i}: unbekannter Weg ${f.w}`);
  }
  for (const v of s.alleVoelker()) {
    if (!(v.gold >= 0 && Number.isFinite(v.gold))) p.push(`Volk ${v.id}: Gold ${v.gold}`);
    for (const [gut, x] of Object.entries(v.lager || {})) if (!(x >= -1e-6 && Number.isFinite(x))) p.push(`Volk ${v.id}: Lager ${gut} = ${x}`);
    for (const id of Object.keys(v.forschung?.erforscht || {})) if (!FORSCHUNG[id]) p.push(`Volk ${v.id}: unbekannte Forschung ${id}`);
    if (v.forschung?.aktiv && !FORSCHUNG[v.forschung.aktiv]) p.push(`Volk ${v.id}: unbekannte aktive Forschung ${v.forschung.aktiv}`);
  }
  for (const id of Object.keys(z.wunder || {})) if (!WUNDER_NACH_ID[id]) p.push(`Wunder ${id} unbekannt`);
  return p;
}
