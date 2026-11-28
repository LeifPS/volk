// Civics (Kulturbaum), Regierungen und Politikkarten.
// Fortschritt im Kulturbaum wird mit Kultur bezahlt: Die Kultur aller Städte fließt pro Stunde in die aktive Civic
// (wie Wissenschaft in die Forschung). Daten: daten/civics.js. Wirkungen laufen über dieselben Bonus-Pfade wie die Forschung.
//
// Zustand je Volk:
//   v.civics   = { aktiv, punkte, erforscht: { id: 1 }, schlange: [], teil: { id: punkte } }
//   v.regierung = { id, seit, uebergang_bis }   (während des Übergangs wirken Grundbonus und Spezialeffekt nur halb)
//   v.karten   = { militaer: [ids], wirtschaft: [...], diplomatie: [...], joker: [...] }
//   v.freier_tausch = true nach jedem Civic-Abschluss (der nächste Kartenwechsel ist kostenlos)
import { CIVIC, CIVICS, REGIERUNG, POLITIKKARTE, START_CIVICS } from '../daten/civics.js';
import { STD } from '../regeln.js';
import { pruefe } from './spiel.js';

export const KATEGORIEN = ['militaer', 'wirtschaft', 'diplomatie', 'joker'];
/** Stellschrauben (per Balance-Simulation eingestellt). */
export const KULTUR_REGELN = {
  /** So viel Stadt-Kultur pro Stunde ergibt einen Kulturpunkt pro Stunde für den Kulturbaum. */
  teiler: 30,
  /** Übergangszeit nach einem Regierungswechsel (halbe Wirkung). */
  uebergangStd: 12,
  /** Gebühr je getauschter Karte, wenn der Tausch nicht frei ist: so viel Gold je Zeitalter + 1. */
  tauschGoldJeZeitalter: 40,
};

const leer = () => ({ aktiv: null, punkte: 0, erforscht: {}, schlange: [], teil: {} });

export const civics = {
  civicsVon(v) { return (v.civics ||= leer()); },
  civicErforscht(v, id) { return !!v.civics?.erforscht?.[id]; },
  civicMoeglich(v, id) {
    const c = CIVIC[id]; if (!c) return false;
    const cv = this.civicsVon(v);
    if (cv.erforscht[id]) return false;
    return c.voraussetzungen.every((x) => cv.erforscht[x]);
  },
  /** Fehlende Voraussetzungen in sinnvoller Reihenfolge (inklusive id). */
  civicWeg(v, id) {
    const erg = [], gesehen = new Set(), cv = this.civicsVon(v);
    const besuche = (x) => { if (gesehen.has(x)) return; gesehen.add(x); const c = CIVIC[x]; if (!c || cv.erforscht[x]) return; for (const p of c.voraussetzungen) besuche(p); erg.push(x); };
    besuche(id);
    return erg;
  },
  /** Kulturpunkte pro Stunde für den Kulturbaum. */
  kulturPunkteRate(vid) { return Math.max(0, this.raten(vid).kultur || 0) / KULTUR_REGELN.teiler; },

  /** Zeitpunkt, zu dem die aktive Civic fertig wird (für die Ereignisschleife), oder null. */
  civicZeit(v) {
    const cv = v.civics; if (!cv || !cv.aktiv) return null;
    const c = CIVIC[cv.aktiv]; if (!c) return null;
    const rate = this.kulturPunkteRate(v.id);
    if (rate <= 0) return null;
    return Math.ceil((v.stand_um ?? this.t) + Math.max(0, c.kosten - (cv.punkte || 0)) / rate * STD);
  },

  befehl_civic(v, b) {
    const c = CIVIC[b.id];
    pruefe(c, 'Unbekannte Civic.');
    const cv = this.civicsVon(v);
    pruefe(!cv.erforscht[b.id], 'Diese Civic ist schon abgeschlossen.');
    this.aendern(v.id);
    const weg = this.civicWeg(v, b.id);
    this.civicWechseln(v, weg[0]);
    cv.schlange = weg.slice(1);
    this.markiere('v' + v.id);
    return { weg };
  },
  /** Befehl: ganze Civic-Warteschlange setzen (fehlende Voraussetzungen werden eingefügt). */
  befehl_civic_schlange(v, b) {
    pruefe(Array.isArray(b.ids) && b.ids.length <= 40, 'Ungültige Warteschlange.');
    this.aendern(v.id);
    const cv = this.civicsVon(v), neu = [], sim = { civics: { erforscht: { ...cv.erforscht } } };
    if (cv.aktiv) sim.civics.erforscht[cv.aktiv] = 1;
    for (const id of b.ids) {
      if (!CIVIC[id] || neu.includes(id)) continue;
      for (const x of this.civicWeg(sim, id)) if (!neu.includes(x)) { neu.push(x); sim.civics.erforscht[x] = 1; }
    }
    if (!cv.aktiv && neu.length) this.civicWechseln(v, neu.shift());
    cv.schlange = neu;
    this.markiere('v' + v.id);
  },
  civicWechseln(v, id) {
    const cv = this.civicsVon(v);
    if (cv.aktiv === id) return;
    if (cv.aktiv && cv.punkte > 0) cv.teil[cv.aktiv] = cv.punkte;
    cv.aktiv = id;
    cv.punkte = cv.teil[id] || 0;
    delete cv.teil[id];
  },

  civicFertig(vid) {
    const v = this.z.voelker[vid];
    const cv = this.civicsVon(v);
    const c = CIVIC[cv.aktiv]; if (!c) { cv.aktiv = null; return; }
    this.aendern(vid);
    cv.erforscht[c.id] = 1;
    cv.aktiv = null; cv.punkte = 0;
    v.freier_tausch = true;
    const neu = c.freischaltet.map((x) => x.art === 'politikkarte' ? POLITIKKARTE[x.id]?.name : x.art === 'regierung' ? 'Regierung ' + REGIERUNG[x.id]?.name : null).filter(Boolean);
    this.meldung(vid, `Civic abgeschlossen: ${c.name}.${neu.length ? ' Neu: ' + neu.join(', ') + '.' : ''} Der nächste Kartentausch ist kostenlos.`, { art: 'kultur', wichtig: true });
    while (cv.schlange.length) { const n = cv.schlange.shift(); if (this.civicMoeglich(v, n)) { this.civicWechseln(v, n); break; } }
    if (!cv.aktiv && v.art === 'spieler') this.meldung(vid, 'Wähle eine neue Civic im Kulturbaum.', { art: 'kultur' });
    if (v.art !== 'spieler') this.kiPolitik?.(v);
    delete this._raten[vid];
    this.markiere('v' + vid);
  },

  /** Ist eine Regierung bzw. Karte für das Volk freigeschaltet? */
  regierungFrei(v, id) { return CIVICS.some((c) => c.freischaltet.some((x) => x.art === 'regierung' && x.id === id) && this.civicErforscht(v, c.id)); },
  karteFrei(v, id) { return CIVICS.some((c) => c.freischaltet.some((x) => x.art === 'politikkarte' && x.id === id) && this.civicErforscht(v, c.id)); },
  plaetze(v) { const r = REGIERUNG[v.regierung?.id]; return r ? r.plaetze : { militaer: 0, wirtschaft: 0, diplomatie: 0, joker: 0 }; },
  imUebergang(v) { return !!(v.regierung?.uebergang_bis && v.regierung.uebergang_bis > this.t); },

  /** Befehl: Regierung wechseln. Karten, die nicht mehr passen, fallen heraus; eine Weile wirkt die neue Regierung nur halb. */
  befehl_regierung(v, b) {
    const r = REGIERUNG[b.id];
    pruefe(r, 'Unbekannte Regierung.');
    pruefe(this.regierungFrei(v, b.id), 'Diese Regierung ist noch nicht freigeschaltet (Kulturbaum).');
    pruefe(v.regierung?.id !== b.id, 'Diese Regierung hast du schon.');
    this.aendern(v.id);
    const erste = !v.regierung;
    v.regierung = { id: b.id, seit: this.t, uebergang_bis: erste ? null : this.t + KULTUR_REGELN.uebergangStd * STD };
    this.kartenKuerzen(v);
    if (v.regierung.uebergang_bis) this.ablaufPlanen?.(v.id, v.regierung.uebergang_bis);
    this.meldung(v.id, `Neue Regierung: ${r.name}.${erste ? '' : ` In den nächsten ${KULTUR_REGELN.uebergangStd} Stunden wirkt sie nur halb (Übergang).`}`, { art: 'kultur', wichtig: true });
    delete this._raten[v.id];
    this.markiere('v' + v.id);
    return { uebergang_bis: v.regierung.uebergang_bis };
  },
  /** Karten auf die Plätze der Regierung kürzen (zu viele fallen heraus). */
  kartenKuerzen(v) {
    const p = this.plaetze(v);
    v.karten ||= {};
    for (const k of KATEGORIEN) v.karten[k] = (v.karten[k] || []).filter((id) => POLITIKKARTE[id]).slice(0, p[k] || 0);
  },

  /** Prüft eine Kartenbelegung; liefert einen Fehlertext oder null. Joker-Plätze nehmen jede Karte. */
  kartenHindernis(v, karten) {
    if (!karten || typeof karten !== 'object') return 'Ungültige Kartenbelegung.';
    const p = this.plaetze(v), alle = [];
    for (const k of KATEGORIEN) {
      const l = karten[k] || [];
      if (!Array.isArray(l)) return 'Ungültige Kartenbelegung.';
      if (l.length > (p[k] || 0)) return `Zu viele Karten in der Kategorie ${k} (Plätze: ${p[k] || 0}).`;
      for (const id of l) {
        const c = POLITIKKARTE[id];
        if (!c) return 'Unbekannte Karte.';
        if (!this.karteFrei(v, id)) return `Die Karte "${c.name}" ist noch nicht freigeschaltet.`;
        if (k !== 'joker' && c.kategorie !== k) return `"${c.name}" passt nicht in einen ${k}-Platz.`;
        alle.push(id);
      }
    }
    if (new Set(alle).size !== alle.length) return 'Jede Karte kann nur einmal liegen.';
    return null;
  },
  /** Gebühr für einen Kartentausch (0 nach einem Civic-Abschluss oder ohne Änderung). */
  tauschKosten(v, karten) {
    if (v.freier_tausch) return 0;
    const alt = new Set(KATEGORIEN.flatMap((k) => v.karten?.[k] || []));
    const neu = KATEGORIEN.flatMap((k) => karten[k] || []);
    const geaendert = neu.filter((id) => !alt.has(id)).length;
    return geaendert * KULTUR_REGELN.tauschGoldJeZeitalter * (1 + (v.zeitalter || 0));
  },
  /** Befehl: Politikkarten setzen (komplette Belegung). */
  befehl_karten(v, b) {
    pruefe(v.regierung, 'Wähle zuerst eine Regierung.');
    const h = this.kartenHindernis(v, b.karten);
    pruefe(!h, h);
    const gold = this.tauschKosten(v, b.karten);
    if (gold) { const k = this.kannBezahlen(v, { gold }); pruefe(k.ok, this.fehltText({ gold }, k.fehlt)); }
    this.aendern(v.id);
    if (gold) this.bezahle(v, { gold });
    v.karten = Object.fromEntries(KATEGORIEN.map((k) => [k, [...(b.karten[k] || [])]]));
    v.freier_tausch = false;
    delete this._raten[v.id];
    this.markiere('v' + v.id);
    return { gold };
  },

  /** Reichsweite Boni aus Regierung (halb im Übergang) und Politikkarten. */
  politikBoni(v, b) {
    const add = (wk, f = 1) => { for (const [k, x] of Object.entries(wk || {})) b[k] = (b[k] || 0) + x * f; };
    const r = REGIERUNG[v.regierung?.id];
    if (r) { const f = this.imUebergang(v) ? 0.5 : 1; add(r.bonus, f); add(r.spezial?.wirkung, f); }
    for (const k of KATEGORIEN) for (const id of v.karten?.[k] || []) add(POLITIKKARTE[id]?.wirkung);
    for (const c of CIVICS) if (v.civics?.erforscht?.[c.id]) for (const x of c.freischaltet) if (x.art === 'bonus') b[x.id] = (b[x.id] || 0) + (x.wert || 0);
  },

  /** Neues Volk: Start-Civics und Stammesordnung. */
  civicsStart(v) {
    const cv = this.civicsVon(v);
    for (const id of START_CIVICS) cv.erforscht[id] = 1;
    if (!v.regierung && this.regierungFrei(v, 'stammesordnung')) v.regierung = { id: 'stammesordnung', seit: this.t, uebergang_bis: null };
    v.karten ||= { militaer: [], wirtschaft: [], diplomatie: [], joker: [] };
  },

  /** KI und Bots: Civic nach Persönlichkeit wählen, beste freie Regierung nehmen und Plätze automatisch belegen. */
  kiPolitik(v) {
    const cv = this.civicsVon(v);
    if (!cv.aktiv) {
      const kand = CIVICS.filter((c) => this.civicMoeglich(v, c.id) && c.zeitalter <= Math.max(5, v.zeitalter || 0)).sort((a, b) => a.kosten - b.kosten || (a.id < b.id ? -1 : 1));
      if (kand.length) this.civicWechseln(v, kand[0].id);
    }
    const frei = Object.keys(REGIERUNG).filter((id) => this.regierungFrei(v, id));
    const beste = frei.sort((a, b) => this.regierungsWert(b) - this.regierungsWert(a))[0];
    if (beste && v.regierung?.id !== beste) { v.regierung = { id: beste, seit: this.t, uebergang_bis: v.regierung ? this.t + KULTUR_REGELN.uebergangStd * STD : null }; }
    v.karten = this.kartenAutomatisch(v);
    delete this._raten[v.id];
    this.markiere('v' + v.id);
  },
  regierungsWert(id) { const r = REGIERUNG[id]; return r ? Object.values(r.plaetze).reduce((a, x) => a + x, 0) * 10 + Object.keys(r.bonus || {}).length : 0; },
  /** "Alle zuweisen": die stärksten freien Karten auf die Plätze (einfache Wertung: Summe der Wirkungswerte). */
  kartenAutomatisch(v) {
    const p = this.plaetze(v), frei = Object.values(POLITIKKARTE).filter((c) => this.karteFrei(v, c.id));
    const wert = (c) => Object.values(c.wirkung || {}).reduce((a, x) => a + Math.abs(x), 0);
    frei.sort((a, b) => wert(b) - wert(a) || (a.id < b.id ? -1 : 1));
    const genutzt = new Set(), erg = { militaer: [], wirtschaft: [], diplomatie: [], joker: [] };
    for (const k of ['militaer', 'wirtschaft', 'diplomatie']) for (const c of frei) { if (erg[k].length >= (p[k] || 0)) break; if (c.kategorie === k && !genutzt.has(c.id)) { erg[k].push(c.id); genutzt.add(c.id); } }
    for (const c of frei) { if (erg.joker.length >= (p.joker || 0)) break; if (!genutzt.has(c.id)) { erg.joker.push(c.id); genutzt.add(c.id); } }
    return erg;
  },
};
