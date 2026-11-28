// Distrikte: Bau auf einem Feld des Stadtgebiets, Nachbarschaftsboni (mit Quellen für die Anzeige), Stufen aus der Gebäudekette,
// Spezialisierung, Plünderung und Reparatur. Daten: daten/distrikte.js.
// Zustand: Feld f.d = Distrikt-ID (für Karte und Rendering), Stadt s.distrikte[id] = { feld, spez, spez_ab, pl_bis }.
import { karte } from '../karte.js';
import { nachbarn, ebeneVon } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { ROHSTOFFE } from '../daten/rohstoffe.js';
import { VERBESSERUNG, GEB } from '../daten/index.js';
import { DISTRIKT, DISTRIKTE, DISTRIKT_REGELN as DR, DISTRIKT_VON_GEBAEUDE, TRADITION, TRADITIONEN } from '../daten/distrikte.js';
import { STD } from '../regeln.js';
import { pruefe } from './spiel.js';

const SEE_ROHSTOFFE = new Set(['fisch', 'wale', 'muscheln', 'perlen', 'krabben']);

export const distrikte = {
  /** Distrikt, dem ein Gebäude gehört (oder undefined: Stadtzentrum). */
  gebaeudeDistrikt(gid) { return DISTRIKT_VON_GEBAEUDE[gid]; },
  hatDistrikt(s, id) { return !!s.distrikte?.[id]; },
  distriktZahl(s) { return Object.keys(s.distrikte || {}).length; },
  distriktMax(s) { return DR.maxDistrikte(s.bev || 1); },

  /** Stufe 0..3: wie viele Stufen der Gebäudekette (oder deren Nachfolger) stehen in der Stadt. */
  distriktStufe(s, id) {
    const d = DISTRIKT[id]; if (!d || !this.hatDistrikt(s, id)) return 0;
    if (!d.stufen.length) return 1 + Math.min(2, Math.floor((this.z.voelker[s.volk]?.zeitalter || 0) / 10)); // Kolonie-Distrikte: Stufe aus dem Zeitalter
    let n = 0;
    for (const g of d.stufen) if (this.hatGebaeude(s, g)) n++;
    return Math.max(1, n);
  },

  /** Ist der Distrikt gerade geplündert (bringt nichts)? */
  distriktGepluendert(s, id) { const x = s.distrikte?.[id]; return !!(x && x.pl_bis && x.pl_bis > this.t); },

  /**
   * Nachbarschaftsbonus eines (gebauten oder geplanten) Distrikts auf Feld i: { summe, quellen: [{ text, wert, feld }] }.
   * Die Quellen werden im Stadtfenster angezeigt.
   */
  distriktNachbarschaft(s, id, i) {
    const d = DISTRIKT[id]; if (!d) return { summe: 0, quellen: [] };
    const k = karte();
    const quellen = [];
    const plus = (text, wert, feld) => { if (wert) quellen.push({ text, wert, feld }); };
    const nb = nachbarn(i);
    const uni = this.unikatFuer(s.volk, id);
    for (const r of [...d.nachbar, ...(uni?.nachbar_extra || [])]) {
      const [art, arg] = r.quelle.split(':');
      if (art === 'fluss') { if (k.fluss[i] || nb.some((n) => k.fluss[n])) plus('Fluss', r.wert, i); continue; }
      for (const n of nb) {
        const g = GELAENDE[k.gelaende[n]];
        const f = this.z.felder[n] || {};
        let passt = false, text = '';
        if (art === 'gelaende') { passt = g.id === arg && !this.naturwunderAuf?.(n); text = g.name; }
        else if (art === 'wasser') { passt = !!g.wasser; text = 'Wasser'; }
        else if (art === 'kueste') { passt = g.id === 'kueste'; text = 'Küste'; }
        else if (art === 'naturwunder') { passt = !!this.naturwunderAuf?.(n); text = 'Naturwunder'; }
        else if (art === 'weltwunder') { passt = !!f.wu; text = 'Weltwunder'; }
        else if (art === 'stadtzentrum') { passt = n === s.feld; text = 'Stadtzentrum'; }
        else if (art === 'distrikt') { passt = !!f.d && (!arg || f.d === arg); text = arg ? DISTRIKT[arg]?.name : 'Distrikt'; }
        else if (art === 'verbesserung') { passt = !!f.v && VERBESSERUNG[f.v]?.kette === arg && !(f.pl > this.t); text = VERBESSERUNG[f.v]?.name || arg; }
        else if (art === 'rohstoff') {
          const rn = k.rohstoff[n]; const ro = rn ? ROHSTOFFE[rn - 1] : null;
          passt = !!ro && (arg === 'see' ? SEE_ROHSTOFFE.has(ro.id) : ro.art === arg) && this.siehtRohstoff(this.z.voelker[s.volk], ro);
          text = ro?.name || arg;
        }
        if (passt) plus(text, r.wert, n);
      }
    }
    const roh = quellen.reduce((a, q) => a + q.wert, 0);
    return { roh, quellen };
  },

  /** Ertrag des Distrikts pro Stunde (Grundwerte vor Faktoren): Nachbarschaft × Stufenfaktor + Grundwert nach Zeitalter. */
  distriktErtrag(s, id, boni = null) {
    const d = DISTRIKT[id]; const x = s.distrikte?.[id];
    if (!d || !x || this.distriktGepluendert(s, id)) return { art: d?.ertrag, wert: 0, nachbar: { roh: 0, quellen: [] }, stufe: 0 };
    const nb = x.feld != null ? this.distriktNachbarschaft(s, id, x.feld) : { roh: 0, quellen: [] };
    const stufe = this.distriktStufe(s, id);
    const za = this.z.voelker[s.volk]?.zeitalter || 0;
    const b = boni || this.boni(this.z.voelker[s.volk]);
    const nbProzent = (b.nachbar_prozent || 0) + (b['nachbar_' + id + '_prozent'] || 0);
    let wert = nb.roh * DR.stufenFaktor[stufe] * (1 + nbProzent / 100) + 1 + za * DR.grundJeZeitalter;
    if (x.spez_ab && x.spez_ab > this.t) wert *= 0.5; // Umstellung läuft
    return { art: d.ertrag, wert: Math.round(wert * 10) / 10, nachbar: nb, stufe };
  },

  /** Wirkungen der Distrikte (Spezialisierung) wie Gebäudewirkungen; geplünderte Distrikte wirken nicht. */
  distriktWirkungen(s) {
    const l = [];
    for (const [id, x] of Object.entries(s.distrikte || {})) {
      if (this.distriktGepluendert(s, id)) continue;
      const sp = DISTRIKT[id]?.spez?.find((p) => p.id === x.spez);
      if (sp && !(x.spez_ab && x.spez_ab > this.t)) l.push(sp.wirkung);
      const uni = this.unikatFuer(s.volk, id);
      if (uni) l.push(uni.bonus);
    }
    return l;
  },

  /** Grund, warum auf Feld i kein Distrikt dieses Typs gebaut werden kann (oder null). */
  distriktPlatzHindernis(s, id, i) {
    const d = DISTRIKT[id]; if (!d) return 'Unbekannter Distrikt.';
    if (!Number.isInteger(i) || !s.gebiet?.includes(i)) return 'Das Feld gehört nicht zum Gebiet dieser Stadt.';
    if (i === s.feld) return 'Nicht auf dem Stadtzentrum.';
    if (ebeneVon(i) !== (d.ebene || 0)) return d.ebene ? 'Dieser Distrikt gehört in eine Kolonie im All.' : 'Dieser Distrikt gehört auf die Erde.';
    const f = this.z.felder[i] || {};
    if (f.d) return 'Hier steht schon ein Distrikt.';
    if (f.wu || f.wb) return 'Hier steht ein Weltwunder.';
    if (this.naturwunderAuf?.(i)) return 'Auf einem Naturwunder kann nichts gebaut werden.';
    for (const b of [...(s.bau || []), ...(s.schlange || [])]) if ((b.art === 'distrikt' || b.art === 'wunder') && b.feld === i) return 'Dieses Feld ist schon verplant.';
    const g = GELAENDE[karte().gelaende[i]];
    if (d.wasser) { if (g.id !== 'kueste' && g.id !== 'see') return 'Ein Hafen liegt auf Küstenwasser neben der Stadt.'; }
    else if (g.wasser || g.leer) return 'Distrikte stehen an Land.';
    else if (g.hoehe >= 3) return 'Nicht auf Gebirge.';
    if (this.einheitenAuf(i).some((e) => e.volk !== s.volk)) return 'Dort steht eine fremde Einheit.';
    return null;
  },
  distriktPlaetze(s, id) { return (s.gebiet || []).filter((i) => !this.distriktPlatzHindernis(s, id, i)); },
  /** Bestes Feld: höchster Nachbarschaftsbonus, dann ohne Verbesserung, dann niedrigster Index (deterministisch). */
  distriktPlatzAutomatisch(s, id, streng = true) {
    let l = this.distriktPlaetze(s, id);
    if (!l.length && !streng) l = (s.gebiet || []).filter((i) => i !== s.feld && !this.z.felder[i]?.d && !this.z.felder[i]?.wu && !this.naturwunderAuf?.(i) && ebeneVon(i) === (DISTRIKT[id]?.ebene || 0) && !GELAENDE[karte().gelaende[i]].wasser);
    let best = null, bw = -Infinity;
    for (const i of l) {
      const w = this.distriktNachbarschaft(s, id, i).roh * 10 - (this.z.felder[i]?.v ? 3 : 0) - (s.arbeit?.includes(i) ? 1 : 0);
      if (w > bw || (w === bw && i < best)) { bw = w; best = i; }
    }
    return best;
  },

  /** Distrikt fertig: aufs Feld setzen, Verbesserung weicht, Feld wird nicht mehr bewirtschaftet. */
  distriktSetzen(s, id, feld) {
    s.distrikte ||= {};
    const d = DISTRIKT[id];
    s.distrikte[id] = { feld, spez: d?.spez?.[0]?.id || null };
    this.setzeFeld(feld, { d: id, db: null, v: null, pl: null });
    if (s.arbeit?.includes(feld)) s.arbeit = s.arbeit.filter((x) => x !== feld);
    this.markiere('s' + s.id);
    delete this._raten[s.volk];
  },

  /** Distrikte ohne Feld (aus der Migration sehr kleiner Städte) bekommen ein Feld, sobald eins frei ist. */
  distriktOhneFeldSetzen(s) {
    for (const [id, x] of Object.entries(s.distrikte || {})) {
      if (x.feld != null) continue;
      const feld = this.distriktPlatzAutomatisch(s, id, false);
      if (feld != null) { const spez = x.spez; this.distriktSetzen(s, id, feld); if (spez) s.distrikte[id].spez = spez; }
    }
  },

  /** Befehl: Spezialisierung eines Distrikts umstellen (dauert ein paar Stunden, in der Zeit halber Ertrag). */
  befehl_distrikt_spez(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    const x = s.distrikte?.[b.distrikt];
    pruefe(x, 'Diesen Distrikt hat die Stadt nicht.');
    const sp = DISTRIKT[b.distrikt].spez.find((p) => p.id === b.spez);
    pruefe(sp, 'Unbekannte Ausrichtung.');
    pruefe(x.spez !== sp.id, 'Diese Ausrichtung ist schon gewählt.');
    this.aendern(v.id);
    x.spez = sp.id; x.spez_ab = this.t + DR.spezUmstellenStd * STD;
    this.ablaufPlanen?.(v.id, x.spez_ab);
    this.markiere('s' + s.id);
    return { spez_ab: x.spez_ab };
  },

  /** Befehl: geplünderten Distrikt sofort gegen Gold reparieren. */
  befehl_distrikt_reparieren(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    pruefe(this.distriktGepluendert(s, b.distrikt), 'Dieser Distrikt ist nicht beschädigt.');
    const kosten = { gold: DR.reparaturGoldJeZeitalter * (1 + (v.zeitalter || 0)) };
    const k = this.kannBezahlen(v, kosten);
    pruefe(k.ok, this.fehltText(kosten, k.fehlt));
    this.aendern(v.id);
    this.bezahle(v, kosten);
    s.distrikte[b.distrikt].pl_bis = null;
    this.setzeFeld(s.distrikte[b.distrikt].feld, { pl: null });
    this.markiere('s' + s.id);
  },

  /** Eine feindliche Einheit plündert den Distrikt, auf dem sie steht. Liefert true, wenn etwas geplündert wurde. */
  distriktPluendern(feld, taeter) {
    const f = this.z.felder[feld]; if (!f?.d || !f.s) return false;
    const s = this.z.staedte[f.s]; if (!s?.distrikte?.[f.d]) return false;
    const x = s.distrikte[f.d];
    if (x.pl_bis && x.pl_bis > this.t) return false;
    this.aendern(s.volk);
    x.pl_bis = this.t + DR.pluenderDauerStd * STD;
    this.setzeFeld(feld, { pl: x.pl_bis });
    this.ablaufPlanen?.(s.volk, x.pl_bis);
    this.markiere('s' + s.id);
    this.meldung(s.volk, `${s.name}: Der Distrikt ${DISTRIKT[f.d].name} wurde geplündert und bringt ${DR.pluenderDauerStd} Stunden lang nichts (oder sofort gegen Gold reparieren).`, { art: 'kampf', feld, wichtig: true });
    if (taeter) this.meldung(taeter, `Distrikt ${DISTRIKT[f.d].name} von ${s.name} geplündert.`, { art: 'kampf', feld });
    return true;
  },

  /** Einzigartiger Distrikt des Volkes für diesen Grund-Distrikt (aus seiner Tradition) oder null. */
  unikatFuer(vid, id) {
    const t = TRADITION[this.z.voelker[vid]?.tradition];
    return t && t.distrikt === id ? t.unikat : null;
  },
  /** Befehl: Tradition wählen (einmalig). */
  befehl_tradition_waehlen(v, b) {
    pruefe(!v.tradition, 'Dein Volk hat seine Tradition schon gewählt.');
    pruefe(TRADITION[b.id], 'Unbekannte Tradition.');
    this.aendern(v.id);
    v.tradition = b.id;
    this.meldung(v.id, `Dein Volk folgt der ${TRADITION[b.id].name}. Sein einzigartiger Distrikt: ${TRADITION[b.id].unikat.name}.`, { art: 'info', wichtig: true });
    return { tradition: b.id };
  },
  /** KI-Völker und Stadtstaaten: Tradition passend zur Persönlichkeit. */
  kiTradition(v) {
    if (v.tradition || (v.art !== 'ki')) return;
    const t = TRADITIONEN.find((x) => x.persoenlichkeit === v.ki?.persoenlichkeit);
    if (t) { v.tradition = t.id; this.markiere('v' + v.id); }
  },

  /** Liste aller Distrikt-Typen, die das Volk in dieser Stadt bauen könnte (für Bauliste/KI). */
  distriktTypenFuer(s) { return DISTRIKTE.filter((d) => (d.ebene || 0) === ebeneVon(s.feld)); },
};

export { DISTRIKT, GEB };
