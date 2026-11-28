// Eurekas (Boosts wie in Civ 6): Jede Forschung und jede Civic hat eine Bedingung; wer sie durch echtes Spielen erfüllt,
// bekommt 40 % der Kosten erlassen. Daten: daten/eurekas.js. Geprüft wird nur auf dem Server.
//
// Zähler je Volk (v.zaehler): einheiten (Klasse -> Anzahl ausgebildet), siege, raumflug, krieg.
// Ausgelöste Eurekas: v.eurekas = { 'f:<id>': Zeit, 'c:<id>': Zeit }.
// Geprüft wird gebündelt: Jede Änderung an einem Volk (aendern) merkt es vor, am Ende der Verarbeitung laufen die Prüfungen.
import { EUREKAS_FORSCHUNG, EUREKAS_CIVIC } from '../daten/eurekas.js';
import { FORSCHUNG, CIVIC, VERBESSERUNG } from '../daten/index.js';
import { ebeneVon } from '../hex.js';

/** Anteil der Kosten, den eine Eureka erlässt. */
export const EUREKA_ANTEIL = 0.4;

export const eurekas = {
  zaehler(v) { return (v.zaehler ||= { einheiten: {}, siege: 0, raumflug: 0, krieg: 0 }); },
  zaehle(vid, was, klasse) {
    const v = this.z.voelker[vid]; if (!v || (v.art !== 'spieler' && v.art !== 'ki')) return;
    const z = this.zaehler(v);
    if (was === 'einheit') z.einheiten[klasse] = (z.einheiten[klasse] || 0) + 1;
    else z[was] = (z[was] || 0) + 1;
    this.eurekaVormerken(vid);
    this.markiere('v' + vid);
  },
  eurekaVormerken(vid) { (this._eurekaOffen ||= new Set()).add(vid); },

  /**
   * Kontext für eine Prüfrunde: einmal über Städte, Gebiet und Einheiten zählen, damit jede Bedingung danach billig ist
   * (die Prüfung läuft im Durable Object und soll wenig Rechenzeit kosten).
   */
  eurekaKontext(v) {
    const staedte = this.staedteVon(v.id);
    const k = { v, staedte, gebaeude: {}, distrikte: {}, ketten: {}, rohstoffe: new Set(), maxBev: 0, kueste: false, fluss: false, kolonie: false, maxStufe: 0, typen: new Set() };
    for (const s of staedte) {
      k.maxBev = Math.max(k.maxBev, s.bev || 0);
      if (ebeneVon(s.feld) === 1) k.kolonie = true;
      else { if (!k.kueste && this.istKuestenstadt(s)) k.kueste = true; if (!k.fluss && this.istFlussstadt(s)) k.fluss = true; }
      const hier = new Set();
      for (const g of Object.keys(s.gebaeude || {})) { hier.add(g); for (const x of this.ersetztKette(g)) hier.add(x); }
      for (const g of hier) k.gebaeude[g] = (k.gebaeude[g] || 0) + 1;
      for (const d of Object.keys(s.distrikte || {})) k.distrikte[d] = (k.distrikte[d] || 0) + 1;
      for (const i of s.gebiet || []) {
        const f = this.z.felder[i]; if (!f) continue;
        const kv = VERBESSERUNG[f.v]?.kette, kw = VERBESSERUNG[f.w]?.kette;
        if (kv) k.ketten[kv] = (k.ketten[kv] || 0) + 1;
        if (kw) k.ketten[kw] = (k.ketten[kw] || 0) + 1;
        if (f.v) { const r = this.erschlossenerRohstoff(i, v); if (r) k.rohstoffe.add(r.id); }
      }
    }
    for (const e of this.einheitenVon(v.id)) { k.typen.add(e.typ); k.maxStufe = Math.max(k.maxStufe, this.einheitStufe(e)); }
    return k;
  },

  /** Wert einer Bedingung (Zahl) und Ziel; erfüllt, wenn wert >= ziel. kx = Kontext aus eurekaKontext. */
  bedingungStand(v, b, kx = this.eurekaKontext(v)) {
    const ziel = b.anzahl || b.stufe || 1;
    const z = this.zaehler(v);
    let wert = 0;
    switch (b.art) {
      case 'staedte': wert = kx.staedte.length; break;
      case 'einwohner': wert = kx.maxBev; break;
      case 'kuestenstadt': wert = kx.kueste ? 1 : 0; break;
      case 'flussstadt': wert = kx.fluss ? 1 : 0; break;
      case 'gebaeude': wert = kx.gebaeude[b.id] || 0; break;
      case 'distrikt': wert = kx.distrikte[b.id] || 0; break;
      case 'verbesserung': wert = kx.ketten[b.kette] || 0; break;
      case 'einheiten_ausgebildet': wert = z.einheiten[b.klasse] || 0; break;
      case 'einheit_besitzen': wert = kx.typen.has(b.id) ? 1 : 0; break;
      case 'siege': wert = z.siege || 0; break;
      case 'befoerderung': wert = kx.maxStufe; break;
      case 'handelsrouten': wert = (kx.routen ??= this.aktiveRouten(v.id).length); break;
      case 'kontakte': wert = Object.keys(v.bekannt || {}).length; break;
      case 'wunder': wert = (kx.wunder ??= Object.values(this.z.wunder).filter((w) => w.volk === v.id && w.fertig).length); break;
      case 'naturwunder': { const n = this.nebel(v.id); wert = (kx.nw ??= (this.z.global.naturwunder || []).filter((nw) => nw.felder.some((i) => this.istErkundet(n, i))).length); break; }
      case 'rohstoff': wert = kx.rohstoffe.has(b.id) ? 1 : 0; break;
      case 'luxusgueter': wert = (kx.luxus ??= Object.keys(this.luxusBestand(v)).length); break;
      case 'gold': wert = v.gold || 0; break;
      case 'pantheon': wert = v.pantheon ? 1 : 0; break;
      case 'religion': wert = this.eigeneReligion(v.id) ? 1 : 0; break;
      case 'regierung': wert = v.regierung?.id === b.id ? 1 : 0; break;
      case 'karten': wert = Object.values(v.karten || {}).flat().length; break;
      case 'forschung': wert = v.forschung?.erforscht?.[b.id] ? 1 : 0; break;
      case 'civic': wert = v.civics?.erforscht?.[b.id] ? 1 : 0; break;
      case 'kolonie': wert = kx.kolonie ? 1 : 0; break;
      case 'raumflug': wert = z.raumflug || 0; break;
      case 'krieg': wert = (z.krieg || 0) || (this.hatKrieg(v.id) ? 1 : 0); break;
      case 'stadtstaat_freund': wert = this.alleVoelker().some((ss) => ss.art === 'stadtstaat' && (ss.einfluss?.[v.id] || 0) >= 30) ? 1 : 0; break;
      default: wert = 0;
    }
    return { wert, ziel };
  },
  bedingungErfuellt(v, b, kx) { const st = this.bedingungStand(v, b, kx); return st.wert >= st.ziel; },

  eurekasSicherPruefen() {
    this._eurekaUm = this.t;
    try { this.eurekasPruefen(); } catch (err) { this._eurekaOffen = new Set(); this.fehlerProtokoll('Eurekas: ' + (err && err.stack || err)); }
  },

  /**
   * Stand aller offenen Eurekas eines Volkes (ohne etwas auszulösen): { f: { id: [wert, ziel] }, c: {...} }.
   * Nur bis ein Zeitalter über dem aktuellen, das spart Rechenzeit; weiter voraus zeigt der Baum nur den Text.
   */
  eurekaStaende(v, kx = this.eurekaKontext(v)) {
    const e = v.eurekas || {};
    const horizont = (v.zeitalter || 0) + 1;
    const stand = { f: {}, c: {} };
    for (const [id, eu] of Object.entries(EUREKAS_FORSCHUNG)) {
      const f = FORSCHUNG[id];
      if (!f || e['f:' + id] || (v.forschung?.erforscht?.[id] && !f.wiederholbar) || f.zeitalter > horizont) continue;
      const st = this.bedingungStand(v, eu.bed, kx);
      stand.f[id] = [Math.floor(st.wert), st.ziel];
    }
    for (const [id, eu] of Object.entries(EUREKAS_CIVIC)) {
      const c = CIVIC[id];
      if (!c || e['c:' + id] || v.civics?.erforscht?.[id] || c.zeitalter > horizont) continue;
      const st = this.bedingungStand(v, eu.bed, kx);
      stand.c[id] = [Math.floor(st.wert), st.ziel];
    }
    return stand;
  },

  /** Prüft alle noch offenen Eurekas der vorgemerkten Völker und löst erfüllte aus. */
  eurekasPruefen() {
    const offen = this._eurekaOffen; if (!offen || !offen.size) return;
    this._eurekaOffen = new Set();
    for (const vid of offen) {
      const v = this.z.voelker[vid];
      if (!v || (v.art !== 'spieler' && v.art !== 'ki')) continue;
      v.eurekas ||= {};
      const stand = this.eurekaStaende(v);
      for (const art of ['f', 'c']) for (const [id, [w, zl]] of Object.entries(stand[art])) {
        if (w < zl) continue;
        this.eurekaAusloesen(v, art, id, (art === 'f' ? EUREKAS_FORSCHUNG : EUREKAS_CIVIC)[id]);
        delete stand[art][id];
      }
      (this._eurekaStand ||= {})[vid] = stand;
    }
  },

  /** Für die Ansicht: ausgelöste Eurekas und Fortschritt der offenen. */
  eurekaAnsicht(v) {
    const stand = this._eurekaStand?.[v.id] || ((this._eurekaStand ||= {})[v.id] = this.eurekaStaende(v));
    return { erfuellt: v.eurekas || {}, stand };
  },

  /** 40 % der Kosten erlassen: bei der aktiven Forschung/Civic sofort, sonst als Teilfortschritt gemerkt. */
  eurekaAusloesen(v, art, id, eu) {
    this.aendern(v.id);
    v.eurekas['f' === art ? 'f:' + id : 'c:' + id] = this.t;
    if (art === 'f') {
      const fo = v.forschung;
      if (fo.aktiv === id) fo.fortschritt = Math.min(0.999, (fo.fortschritt || 0) + EUREKA_ANTEIL);
      else { fo.teil ||= {}; fo.teil[id] = Math.min(0.999, (fo.teil[id] || 0) + EUREKA_ANTEIL); }
      this.meldung(v.id, `Eureka! "${eu.text}" erfüllt: ${FORSCHUNG[id].name} kostet 40 % weniger.`, { art: 'eureka', wichtig: true });
    } else {
      const cv = this.civicsVon(v), k = CIVIC[id].kosten;
      if (cv.aktiv === id) cv.punkte = Math.min(k * 0.999, (cv.punkte || 0) + EUREKA_ANTEIL * k);
      else cv.teil[id] = Math.min(k * 0.999, (cv.teil[id] || 0) + EUREKA_ANTEIL * k);
      this.meldung(v.id, `Inspiration! "${eu.text}" erfüllt: ${CIVIC[id].name} kostet 40 % weniger.`, { art: 'eureka', wichtig: true });
    }
    this.markiere('v' + v.id);
  },
};
