// Kern der Spiel-Engine: Zustand, Ereignisschleife, Befehle.
// Nichts tickt: Jede Wartezeit ist ein Zielzeitpunkt; fällige Ereignisse werden in zeitlicher Reihenfolge abgearbeitet,
// wenn jemand etwas anfragt oder der Alarm des Durable Objects feuert. Erträge werden als Rate × Zeit integriert.
import { jetzt } from '../uhr.js';
import { zufallsquelle } from '../zufall.js';
import { STD, epFuerBefoerderung } from '../regeln.js';
import { BEFOERDERUNG } from '../daten/index.js';
import { wirtschaft } from './wirtschaft.js';
import { bau } from './bau.js';
import { forschung } from './forschung.js';
import { einheiten } from './einheiten.js';
import { kampf } from './kampf.js';
import { diplomatie } from './diplomatie.js';
import { akteure } from './akteure.js';
import { ansicht } from './ansicht.js';
import { start } from './start.js';
import { weltraum } from './weltraum.js';
import { naturwunder } from './naturwunder.js';
import { wunderplatz } from './wunderplatz.js';
import { distrikte } from './distrikte.js';
import { civics } from './civics.js';
import { religion } from './religion.js';
import { eurekas } from './eurekas.js';
import { beziehungen } from './beziehungen.js';
import { ZUSTAND_VERSION, migriere } from './migration.js';

const LEER = Object.freeze([]);

export class SpielFehler extends Error {}
/** Wirft einen verständlichen Fehler für den Spieler, wenn die Bedingung nicht erfüllt ist. */
export function pruefe(bedingung, text) { if (!bedingung) throw new SpielFehler(text); }

export { ZUSTAND_VERSION };

export function leererZustand(t = jetzt()) {
  return {
    version: ZUSTAND_VERSION, zeit: t, erstellt: t, naechsteId: 1, zufall: 1234567,
    voelker: {}, staedte: {}, einheiten: {}, felder: {}, diplomatie: {}, angebote: {}, wunder: {}, lager: {},
    global: { initialisiert: false },
  };
}

export class Spiel {
  constructor(zustand) {
    this.z = zustand || leererZustand();
    this.t = this.z.zeit;
    this.schmutzig = new Set();   // geänderte Schlüssel für die Speicherung
    this.geaendert = true;        // irgendetwas Sichtbares hat sich geändert (für Ansichts-Deltas)
    this._raten = {};             // Cache der Ertragsraten je Volk
    this._pos = null;             // Feld -> Einheiten-IDs
    this._stadtPos = null;        // Feld -> Stadt-ID
    this._nebel = {};             // Volk -> Uint8Array erkundet (dekodiert)
    this.ausgehend = [];          // Ereignisse für Clients (z. B. Kampf-Animationen)
    this.migrationen = migriere(this.z, this);   // Altstände auf die aktuelle Version heben (siehe migration.js)
    if (this.migrationen.length) this.allesMarkieren();
    this.befoerderungenMigrieren();
    this.wegeMigrieren();
  }

  /** Alte Beförderungen (vor dem Civ-6-Umbau) sind weg: unbekannte IDs werden entfernt, EP auf den neuen Balken begrenzt. */
  befoerderungenMigrieren() {
    for (const e of Object.values(this.z.einheiten || {})) {
      let geaendert = false;
      if (e.befoerderungen) {
        const neu = e.befoerderungen.filter((b) => BEFOERDERUNG[b]);
        if (neu.length !== e.befoerderungen.length) { geaendert = true; if (neu.length) e.befoerderungen = neu; else delete e.befoerderungen; }
      }
      if (!e.befoerderungen && e.ep) { e.ep = Math.min(e.ep, epFuerBefoerderung(1)); geaendert = true; }
      else if (e.befoerderungen && e.ep > epFuerBefoerderung(e.befoerderungen.length + 1)) { e.ep = epFuerBefoerderung(e.befoerderungen.length + 1); geaendert = true; }
      if (geaendert) this.schmutzig.add('e' + e.id);
    }
  }

  /** Markiert jede Speicherzeile als geändert (nach einer Migration wird alles neu geschrieben). */
  allesMarkieren() {
    this.markiere('g');
    for (const id of Object.keys(this.z.voelker)) { this.markiere('v' + id); this.markiere('n' + id); }
    for (const id of Object.keys(this.z.staedte)) this.markiere('s' + id);
    for (const id of Object.keys(this.z.einheiten)) this.markiere('e' + id);
    for (const id of Object.keys(this.z.felder)) this.markiere('f' + id);
    this._raten = {}; this.positionenNeu();
  }

  // ---------- Grundlagen ----------
  zufall() {
    const q = zufallsquelle(this.z.zufall);
    const r = q();
    this.z.zufall = q.zustand();
    this.markiere('g');
    return r;
  }
  neueId() { const id = this.z.naechsteId++; this.markiere('g'); return id; }
  markiere(k) { this.schmutzig.add(k); this.geaendert = true; }

  volk(id) { return this.z.voelker[id]; }
  stadt(id) { return this.z.staedte[id]; }
  einheit(id) { return this.z.einheiten[id]; }
  alleVoelker() { return Object.values(this.z.voelker); }
  // Listen aller Städte und Einheiten werden gecacht (sie werden sehr oft gebraucht). Ungültig bei Anlegen/Entfernen
  // (einheitErzeugen, einheitEntfernen, Stadtgründung) und mit positionenNeu(); die Rückgabe nie verändern.
  alleStaedte() { if (this._staedteL?.q !== this.z.staedte) this._staedteL = { q: this.z.staedte, l: Object.values(this.z.staedte) }; return this._staedteL.l; }
  alleEinheiten() { if (this._einheitenL?.q !== this.z.einheiten) this._einheitenL = { q: this.z.einheiten, l: Object.values(this.z.einheiten) }; return this._einheitenL.l; }
  listenNeu() { this._staedteL = null; this._einheitenL = null; }
  staedteVon(vid) { return this.alleStaedte().filter((s) => s.volk === vid); }
  einheitenVon(vid) { return this.alleEinheiten().filter((e) => e.volk === vid); }

  feld(i) { return this.z.felder[i] || null; }
  setzeFeld(i, patch) {
    const f = { ...(this.z.felder[i] || {}), ...patch };
    for (const k of Object.keys(f)) if (f[k] === null || f[k] === undefined || f[k] === false) delete f[k];
    if (Object.keys(f).length) this.z.felder[i] = f; else delete this.z.felder[i];
    this.markiere('f' + i);
  }
  /** Stadt-ID, der das Feld gehört (oder undefined). */
  feldStadt(i) { const f = this.z.felder[i]; return f ? f.s : undefined; }
  /** Volk-ID, dem das Feld gehört (oder undefined). */
  besitzer(i) { const s = this.feldStadt(i); return s ? this.z.staedte[s]?.volk : undefined; }

  positionenNeu() { this._pos = null; this._stadtPos = null; }
  /** Eine Einheit ist von Feld `alt` nach e.feld gezogen: Positionsindex gezielt nachführen statt neu bauen. */
  positionVerschieben(e, alt) {
    if (!this._pos || e.in || alt === e.feld) return;
    const l = this._pos.get(alt);
    if (l) { const n = l.filter((u) => u !== e); if (n.length) this._pos.set(alt, n); else this._pos.delete(alt); }
    const z = this._pos.get(e.feld);
    this._pos.set(e.feld, z ? [...z, e] : [e]);
  }
  einheitenAuf(i) {
    if (!this._pos) {
      this._pos = new Map();
      for (const e of this.alleEinheiten()) {
        if (e.in) continue; // verladen (Transport/Träger)
        const l = this._pos.get(e.feld); if (l) l.push(e); else this._pos.set(e.feld, [e]);
      }
    }
    // Die Liste ist gecacht und darf nicht verändert werden (positionenNeu macht sie bei jeder Bewegung/Entfernung ungültig).
    return this._pos.get(i) || LEER;
  }
  stadtAuf(i) {
    if (!this._stadtPos) { this._stadtPos = new Map(); for (const s of this.alleStaedte()) this._stadtPos.set(s.feld, s.id); }
    const id = this._stadtPos.get(i);
    return id ? this.z.staedte[id] : null;
  }

  /** Meldung für ein Volk (Benachrichtigungsliste, "Während du weg warst"). */
  meldung(vid, text, o = {}) {
    const v = this.z.voelker[vid];
    if (!v || v.art !== 'spieler') return;
    v.meldungen = v.meldungen || [];
    v.meldungen.push({ id: this.neueId(), t: this.t, text, art: o.art || 'info', feld: o.feld ?? null, wichtig: !!o.wichtig, ...(o.zeitalter != null ? { zeitalter: o.zeitalter } : {}) });
    if (v.meldungen.length > 120) v.meldungen.splice(0, v.meldungen.length - 120);
    this.markiere('v' + vid);
  }

  // ---------- Ereignisschleife ----------
  /** Arbeitet alle Ereignisse bis zum Zeitpunkt `bis` in zeitlicher Reihenfolge ab. */
  verarbeite(bis = jetzt()) {
    let n = 0, letztes = null, gleich = 0;
    for (;;) {
      const e = this.naechstesEreignis();
      if (!e || e.t > bis) break;
      if (e.t > this.t) this.t = e.t;
      // Schutz gegen ein Ereignis, das sich nicht selbst erledigt
      if (letztes && letztes.schluessel === e.schluessel && letztes.t === e.t) { if (++gleich > 3) { this.fehlerProtokoll('Ereignis hängt: ' + e.schluessel); e.notbremse?.(); if (gleich > 6) break; } } else gleich = 0;
      letztes = e;
      try { e.f(); } catch (err) {
        if (err instanceof SpielFehler) this.fehlerProtokoll('Ereignis ' + e.schluessel + ': ' + err.message);
        else this.fehlerProtokoll('Ereignis ' + e.schluessel + ': ' + (err && err.stack || err));
        try { e.notbremse?.(); } catch (e2) { /* egal */ }
      }
      if (++n > 500000) { this.fehlerProtokoll('Zu viele Ereignisse'); break; }
      // Eurekas gebündelt prüfen, spätestens alle 15 Spielminuten (lange Nachholläufe bleiben so zeitlich genau genug)
      if (this._eurekaOffen?.size && this.t - (this._eurekaUm || 0) >= 15 * 60000) this.eurekasSicherPruefen();
    }
    if (bis > this.t) this.t = bis;
    this.eurekasSicherPruefen();
    if (this.z.zeit !== this.t) { this.z.zeit = this.t; this.schmutzig.add('g'); }
    return n;
  }

  fehlerProtokoll(text) {
    (this.z.global.fehler ||= []).push({ t: this.t, text });
    if (this.z.global.fehler.length > 50) this.z.global.fehler.shift();
    if (typeof console !== 'undefined') console.warn('[Volk]', text);
  }

  /**
   * Das zeitlich nächste fällige Ereignis (oder null): { t, schluessel, f, notbremse }.
   * Verglichen werden nur Zeit, Art und Objekt; die Funktionen entstehen erst für den Gewinner (läuft sehr oft, spart Speicher).
   */
  naechstesEreignis() {
    let bt = Infinity, ba = null, bx = null;
    const k = (t, art, x) => { if (t != null && t < bt && Number.isFinite(t)) { bt = t; ba = art; bx = x; } };
    for (const e of this.alleEinheiten()) {
      if (e.pfad && e.pfad.length) k(e.pfad[0].t, 'schritt', e);
      if (e.arbeit) k(e.arbeit.fertig_um, 'arbeit', e);
      if (e.umruestung) k(e.umruestung.fertig_um, 'umruest', e);
      if (e.einsatz) k(e.einsatz.zurueck_um, 'einsatz', e);
    }
    for (const s of this.alleStaedte()) {
      for (const b of s.bau || []) k(b.fertig_um, 'bau', s);
      if (s.warte_um) k(s.warte_um, 'warte', s);
      k(this.wachstumsZeit(s), 'wachs', s);
      k(this.grenzZeit(s), 'grenze', s);
    }
    for (const v of this.alleVoelker()) {
      k(this.forschungsZeit(v), 'forsch', v);
      k(this.civicZeit(v), 'civic', v);
      if (v.offline_ende) k(v.offline_ende, 'offende', v);
      k(this.goldNullZeit(v), 'goldnull', v);
      if (v.mangel_um) k(v.mangel_um, 'mangel', v);
      if (v.abkommen_bis) k(v.abkommen_bis, 'abk', v);
      if (v.ki && v.ki.denken_um) k(v.ki.denken_um, 'ki', v);
    }
    const g = this.z.global;
    if (g.barbaren_um) k(g.barbaren_um, 'barbaren', null);
    if (g.natur_um) k(g.natur_um, 'natur', null);
    if (g.jahreszeit_um) k(g.jahreszeit_um, 'jahreszeit', null);
    if (g.religion_um) k(g.religion_um, 'religion', null);
    if (g.diplo_um) k(g.diplo_um, 'diplo', null);
    if (g.ablaeufe && g.ablaeufe.length) { let m = Infinity; for (const a of g.ablaeufe) if (a.t < m) m = a.t; k(m, 'ablauf', null); }
    for (const ev of g.ereignisse || []) k(ev.aktiv ? ev.ende : ev.start, 'naturev', ev);
    if (ba == null) return null;
    return this.ereignisBauen(bt, ba, bx);
  }

  /** Baut Schlüssel, Aktion und Notbremse für ein Ereignis der Art `art` am Objekt `x`. */
  ereignisBauen(t, art, x) {
    const g = this.z.global, id = x?.id;
    const E = (schluessel, f, notbremse) => ({ t, schluessel, f, notbremse });
    switch (art) {
      case 'schritt': return E('schritt' + id, () => this.schritt(id), () => { x.pfad = []; });
      case 'arbeit': return E('arbeit' + id, () => this.arbeitFertig(id), () => { x.arbeit = null; });
      case 'umruest': return E('umruest' + id, () => this.umruestungFertig(id), () => { delete x.umruestung; });
      case 'einsatz': return E('einsatz' + id, () => this.einsatzZurueck(id), () => { x.einsatz = null; });
      case 'bau': return E('bau' + id, () => this.bauFertig(id), () => { x.bau = []; });
      case 'warte': return E('warte' + id, () => { x.warte_um = null; this.bauSchlangeWeiter(id); });
      case 'wachs': return E('wachs' + id, () => this.wachstum(id), () => { x.nahrung = 0; });
      case 'grenze': return E('grenze' + id, () => this.grenzwachstum(id), () => { x.kultur = 0; });
      case 'forsch': return E('forsch' + id, () => this.forschungFertig(id), () => { x.forschung.aktiv = null; });
      case 'civic': return E('civic' + id, () => this.civicFertig(id), () => { x.civics.aktiv = null; });
      case 'offende': return E('offende' + id, () => { this.aendern(id); x.offline_faktor = 0; x.offline_ende = null; delete this._raten[id]; }, () => { x.offline_ende = null; });
      case 'goldnull': return E('goldnull' + id, () => this.goldNull(id));
      case 'mangel': return E('mangel' + id, () => this.mangelSchritt(id), () => { x.mangel_um = null; });
      case 'abk': return E('abk' + id, () => { this.aendern(id); x.abkommen_bis = null; this.markiere('v' + id); this.meldung(id, 'Das Forschungsabkommen ist ausgelaufen.'); });
      case 'ki': return E('ki' + id, () => this.kiDenken(id), () => { x.ki.denken_um = this.t + STD; });
      case 'barbaren': return E('barbaren', () => this.barbarenZug(), () => { g.barbaren_um = this.t + STD; });
      case 'natur': return E('natur', () => this.naturZug(), () => { g.natur_um = this.t + 6 * STD; });
      case 'jahreszeit': return E('jahreszeit', () => this.jahreszeitWechsel(), () => { g.jahreszeit_um = this.t + STD; });
      case 'religion': return E('religion', () => this.religionTakt(), () => { g.religion_um = this.t + STD; });
      case 'diplo': return E('diplo', () => this.diplomatiePruefung(), () => { g.diplo_um = this.t + STD; });
      case 'ablauf': return E('ablauf', () => this.ablaufFaellig(), () => { g.ablaeufe = []; });
      case 'naturev': return E('natur' + id, () => this.naturSchritt(id), () => { g.ereignisse = g.ereignisse.filter((y) => y !== x); });
    }
    return null;
  }

  /** Zeitpunkt des nächsten Ereignisses für den Alarm (oder null). */
  naechsteZeit() { const e = this.naechstesEreignis(); return e ? e.t : null; }

  // ---------- Befehle ----------
  /**
   * Führt einen Befehl eines Volkes aus. Liefert { ok: true, ... } oder { ok: false, fehler }.
   * Der Client legt nie Werte fest; alles wird hier geprüft.
   */
  befehl(vid, b) {
    try {
      this.verarbeite(jetzt());
      pruefe(b && typeof b === 'object' && typeof b.art === 'string', 'Ungültiger Befehl.');
      const v = this.z.voelker[vid];
      pruefe(v, 'Unbekanntes Volk.');
      if (v.art === 'spieler') { v.letzte_aktivitaet = this.t; this.markiere('v' + vid); }
      const h = this['befehl_' + b.art];
      pruefe(typeof h === 'function' && BEFEHLE.has(b.art), 'Unbekannter Befehl: ' + b.art);
      const erg = h.call(this, v, b) || {};
      this.verarbeite(this.t);
      return { ok: true, ...erg };
    } catch (e) {
      if (e instanceof SpielFehler) return { ok: false, fehler: e.message };
      this.fehlerProtokoll('Befehl ' + (b && b.art) + ': ' + (e && e.stack || e));
      return { ok: false, fehler: 'Interner Fehler. Bitte später erneut versuchen.' };
    }
  }
}

/** Erlaubte Befehle (Whitelist). */
export const BEFEHLE = new Set([
  'stadt_gruenden', 'bewegen', 'anhalten', 'modus', 'angreifen', 'arbeiten', 'arbeit_abbrechen', 'bauen', 'bau_abbrechen', 'bau_hoch',
  'forschen', 'forschung_schlange', 'feld_bewirtschaften', 'auto_bewirtschaften', 'grenzziel', 'aufloesen', 'aufruesten', 'befoerdern',
  'krieg_erklaeren', 'diplomatie_angebot', 'angebot_antwort', 'angebot_zurueckziehen', 'tausch_angebot', 'handelsroute',
  'stadtstaat_geschenk', 'pluendern', 'luftangriff', 'verlegen', 'atomschlag', 'stadt_angriff', 'stadt_umbenennen',
  'meldungen_gelesen', 'tutorial', 'neuanfang', 'ping', 'einstellungen', 'tribut_fordern', 'ebene_wechseln', 'distrikt_spez', 'distrikt_reparieren', 'tradition_waehlen', 'civic', 'civic_schlange', 'regierung', 'karten', 'pantheon', 'religion_gruenden', 'religion_verstaerken', 'missionieren', 'glaubenskampf', 'inquisition', 'embargo', 'gesandtschaft',
]);

Object.assign(Spiel.prototype, wirtschaft, bau, forschung, einheiten, kampf, diplomatie, akteure, ansicht, start, weltraum, naturwunder, wunderplatz, distrikte, civics, religion, eurekas, beziehungen);
