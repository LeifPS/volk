// Einheiten: Erzeugen, Bewegung in Echtzeit (A* + Zeitstempel je Schritt), Stapelregel, Sicht/Nebel, Heilung, Befehle.
import { karte, stadtGelaendeOk } from '../karte.js';
import { GESAMT, abstand, nachbarn, umkreis, ebeneVon } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { EINHEIT, BEFOERDERUNG, BEFOERDERUNGEN, VERBESSERUNG, FREIGESCHALTET_DURCH, baumVon } from '../daten/index.js';
import { sucheWeg } from '../pfad.js';
import { schrittDauer, WIRTSCHAFT_TEMPO, EINGESCHIFFT_TEMPO, STADT_MINDESTABSTAND, HEILUNG, STD, MIN, AUFLOESEN_ERSTATTUNG, AUFRUESTEN_FAKTOR, AUFRUESTEN_ZEIT_FAKTOR, produktionTempo, epFuerBefoerderung, MAX_BEFOERDERUNGEN, EP, STADT_GRUND_HP } from '../regeln.js';
import { pruefe, SpielFehler } from './spiel.js';

// Raubtiere sind keine baubare Einheit, sondern Teil der Welt (nicht in EINHEITEN, also nicht im Forschungsbaum).
if (!EINHEIT.raubtier) EINHEIT.raubtier = { id: 'raubtier', name: 'Raubtier', klasse: 'nahkampf', zeitalter: 0, staerke: 16, fern: 0, reichweite: 0, tempo: 2, sicht: 2, kosten: { zeit: 0 }, unterhalt: 0, abklingzeit: 1800, upgrade: null, faehigkeiten: [], boni: [], beschreibung: 'Ein wildes Tier. Greift Einheiten an, die ihm zu nahe kommen, tötet aber nie.' };

const ZIVIL = new Set(['zivil', 'spaeher', 'haendler', 'see_zivil', 'sanitaeter']);
const SEE = new Set(['see_zivil', 'see_nah', 'see_fern', 'u_boot', 'traeger', 'transport']);
const LUFT = new Set(['jaeger', 'bomber', 'rakete', 'atom']);

export function bereichVon(d) { return SEE.has(d.klasse) ? 'see' : LUFT.has(d.klasse) ? 'luft' : 'land'; }
/** Händler (Karawanen, Handelsschiffe) stehen auf keiner Stapelschicht: sie blockieren kein Feld und werden von keiner Einheit blockiert. */
const ISTHANDEL = (d) => d.klasse === 'haendler' || (d.klasse === 'see_zivil' && !!d.faehigkeiten?.includes('handel'));
export function schichtVon(d) { return LUFT.has(d.klasse) ? 'luft' : ISTHANDEL(d) ? 'handel' : ZIVIL.has(d.klasse) ? 'zivil' : 'militaer'; }
export function istMilitaer(d) { return schichtVon(d) === 'militaer'; }

function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(t, n) { const s = atob(t); const u = new Uint8Array(n); for (let i = 0; i < Math.min(n, s.length); i++) u[i] = s.charCodeAt(i); return u; }
export const NEBEL_BYTES = Math.ceil(GESAMT / 8); // beide Ebenen; ältere, kürzere Nebeldaten werden beim Lesen aufgefüllt

export const einheiten = {
  einheitDaten(e) { return EINHEIT[e.typ]; },
  /** Tatsächlicher Ort (verladene Einheiten sind dort, wo ihr Träger ist). */
  einheitOrt(e) { return e.in && this.z.einheiten[e.in] ? this.z.einheiten[e.in].feld : e.feld; },
  bereich(d) { return bereichVon(d); },
  schicht(d) { return schichtVon(d); },

  eigeneEinheit(v, id, waehrendUmruestung = false) {
    const e = this.z.einheiten[id];
    pruefe(e && e.volk === v.id, 'Das ist nicht deine Einheit.');
    pruefe(!e.umruestung || waehrendUmruestung, `Die Einheit wird gerade aufgerüstet (fertig in ${Math.ceil((e.umruestung?.fertig_um - this.t) / MIN)} min).`);
    this.pruefeBereit(e);
    return e;
  },

  /** Eingeschifft: Landeinheit auf einem Wasserfeld. Sie wird nur übergesetzt und kann nichts tun (wie in Civ 6). */
  eingeschifft(e) { const g = GELAENDE[karte().gelaende[e.feld]]; return bereichVon(EINHEIT[e.typ]) === 'land' && !EINHEIT[e.typ].faehigkeiten?.includes('raumschiff') && !!(g?.wasser || g?.leer); },
  pruefeNichtEingeschifft(e, was) { pruefe(!this.eingeschifft(e), `Eingeschiffte Einheiten können nicht ${was}. Setze erst an Land über.`); },

  // ---------- Erzeugen / Entfernen ----------
  einheitErzeugen(vid, typ, feld, o = {}) {
    const d = EINHEIT[typ]; if (!d) return null;
    const v = this.z.voelker[vid];
    let ziel = feld;
    const schicht = schichtVon(d);
    if (schicht !== 'luft') {
      const frei = this.freiesFeld(vid, d, feld, 3);
      if (frei < 0) return null;
      ziel = frei;
    }
    const id = this.neueId();
    const e = { id, volk: vid, typ, feld: ziel, hp: 100, hp_um: this.t, ep: 0, befoerderungen: [], pfad: [], modus: 'wach', erstellt: this.t };
    if (o.stadt) {
      const s = this.z.staedte[o.stadt];
      const erf = s ? this.gebaeudeSumme(s, 'erfahrung') : 0;
      e.ep = Math.min(erf, EP.start_max);
    }
    if (o.ki) e.ki = o.ki;
    this.z.einheiten[id] = e;
    this.markiere('e' + id);
    this.positionenNeu();
    if (v && v.art !== 'tiere') { this.aendern(vid); this.erkunde(vid, ziel, this.sichtweite(e)); }
    return e;
  },

  /** Nächstes freies Feld für eine Einheit (Stapelregel: 1 Militär + 1 Zivil je Feld). */
  freiesFeld(vid, d, start, maxR = 3) {
    for (let r = 0; r <= maxR; r++) {
      const ring = r === 0 ? [start] : umkreis(start, r).filter((i) => abstand(i, start) === r);
      ring.sort((a, b) => a - b);
      for (const i of ring) if (this.platzFrei(vid, d, i) && this.betretbar(vid, d, i)) return i;
    }
    return -1;
  },

  platzFrei(vid, d, i, ausser = null) {
    const schicht = schichtVon(d);
    if (schicht === 'luft' || schicht === 'handel') return true;
    for (const u of this.einheitenAuf(i)) {
      if (u.id === ausser) continue;
      if (u.volk !== vid) return false;
      if (schichtVon(EINHEIT[u.typ]) === schicht) return false;
    }
    return true;
  },

  /** Darf eine Einheit dieses Volkes das Feld grundsätzlich betreten (Gelände, Grenzen)? */
  betretbar(vid, d, i) {
    return this.bewegungsKostenRoh(vid, d, i, i, true) < Infinity;
  },

  einheitEntfernen(id, o = {}) {
    const e = this.z.einheiten[id]; if (!e) return;
    const v = this.z.voelker[e.volk];
    if (v && v.art !== 'tiere') this.aendern(e.volk);
    // verladene Einheiten gehen mit unter
    for (const x of this.alleEinheiten()) if (x.in === id) { if (o.ladungRetten) { x.in = null; x.feld = e.feld; } else { delete this.z.einheiten[x.id]; this.markiere('e' + x.id); } }
    delete this.z.einheiten[id];
    this.markiere('e' + id);
    this.positionenNeu();
    if (v && v.art !== 'tiere') delete this._raten[e.volk];
  },

  // ---------- Bewegung ----------
  /** Händler (Karawanen, Handelsschiffe) ziehen überall durch: Grenzen gelten für sie nicht. */
  ignoriertGrenzen(d) { return !!d?.faehigkeiten?.includes('handel'); },

  /** Darf Volk a das Gebiet von Volk b betreten? */
  darfBetreten(a, b) {
    if (a === b) return true;
    const vb = this.z.voelker[b];
    if (!vb) return true;
    if (vb.art === 'barbar' || vb.art === 'tiere') return true;
    if (this.imKrieg(a, b)) return true;
    const dp = this.diplo(a, b);
    if (dp.offene_grenzen || dp.buendnis) return true;
    if (vb.art === 'stadtstaat') return (vb.einfluss?.[a] || 0) >= 30 || vb.verbuendet === a;
    return false;
  },

  /** Rohkosten eines Schritts (ohne Einheiten-Blockaden). */
  bewegungsKostenRoh(vid, d, von, nach, nurZiel = false) {
    const k = karte();
    const g = GELAENDE[k.gelaende[nach]];
    const bes = this.besitzer(nach);
    if (bes != null && bes !== vid && !this.ignoriertGrenzen(d) && !this.darfBetreten(vid, bes)) return Infinity;
    const bereich = bereichVon(d);
    const st = this.stadtAuf(nach);
    if (st && st.volk !== vid && !this.verbuendet(vid, st.volk)) return Infinity;
    if (this.naturwunderAuf(nach)) return Infinity; // Naturwunder sind unpassierbar
    if (ebeneVon(nach) === 1 || ebeneVon(von) === 1) return bereich === 'luft' ? Infinity : this.raumKosten(vid, d, von, nach, nurZiel);
    const f = this.z.felder[nach];
    if (bereich === 'luft') return Infinity;
    if (bereich === 'see') {
      if (g.wasser) { if (g.tief && !d.faehigkeiten?.includes('tiefsee')) return Infinity; return 1; }
      if (st && (st.volk === vid || this.verbuendet(vid, st.volk))) return 1;
      if (f && f.v === 'kanal') return 1;
      return Infinity;
    }
    const v = this.z.voelker[vid];
    if (g.wasser) {
      if (!v || !this.hatOption(v, 'einschiffen')) return Infinity;
      if (g.tief && !this.hatOption(v, 'tiefsee_einschiffen')) return Infinity;
      return Math.max(1, (d.tempo || 2) / EINGESCHIFFT_TEMPO);
    }
    if (nurZiel) return 1;
    if (d.faehigkeiten?.includes('gelaende_ignorieren')) return 1;
    let c = g.bewegung;
    const fv = this.z.felder[von];
    if (fv?.w && f?.w) c = Math.min(c, Math.max(VERBESSERUNG[fv.w].bewegung, VERBESSERUNG[f.w].bewegung));
    else if (k.fluss[nach] && !f?.br && !GELAENDE[k.gelaende[von]].wasser && !k.fluss[von]) c += 0.5;
    if (GELAENDE[k.gelaende[von]].wasser) c = Math.max(c, 1.5); // Ausschiffen dauert
    return c;
  },

  /** Kosten-Funktion für die Wegsuche einer konkreten Einheit (fremde Einheiten blockieren). */
  kostenFunktion(e, ziel, sicht = null) {
    const d = EINHEIT[e.typ];
    const leicht = new Set(); for (const bid of e.befoerderungen || []) for (const gid of BEFOERDERUNG[bid]?.wirkung?.gelaende_leicht || []) leicht.add(gid);
    return (von, nach) => {
      let c = this.bewegungsKostenRoh(e.volk, d, von, nach);
      if (c === Infinity) return c;
      if (c > 1 && leicht.size && leicht.has(karte().gelaende[nach])) c = 1;   // Beförderung: Waldläufer, Alpinist
      if (sicht && !sicht.has(nach)) return c;
      for (const u of this.einheitenAuf(nach)) {
        if (u.volk === e.volk) continue;
        if (this.verbuendet(e.volk, u.volk) && schichtVon(EINHEIT[u.typ]) !== schichtVon(d)) continue;
        return Infinity;
      }
      return c;
    };
  },

  tempoBonus(e, d) {
    const b = this.raten(e.volk).boni;
    let p = bereichVon(d) === 'see' ? b.tempo_see : b.tempo_land;
    for (const bid of e.befoerderungen || []) p += (BEFOERDERUNG[bid]?.wirkung?.tempo || 0) * 25;
    return p;
  },

  /** Plant einen Weg mit Ankunftszeiten je Schritt. */
  planeWeg(e, ziel, o = {}) {
    const d = EINHEIT[e.typ];
    const w = sucheWeg(e.feld, ziel, this.kostenFunktion(e, ziel, o.sicht || null), { minKosten: 0.12, zielNachbarReicht: !!o.nachbar });
    if (!w) return null;
    const bonus = this.tempoBonus(e, d);
    let t = this.t;
    const pfad = [];
    for (let j = 0; j < w.felder.length; j++) {
      t += schrittDauer(w.kosten[j], d.tempo || 2, bonus, d.zeitalter || 0);
      pfad.push({ f: w.felder[j], t });
    }
    return pfad;
  },

  /** Setzt eine Einheit in Marsch. Liefert true oder wirft einen Fehler (außer o.still). */
  bewegeNach(e, ziel, o = {}) {
    const d = EINHEIT[e.typ];
    try {
      pruefe(Number.isInteger(ziel) && ziel >= 0 && ziel < GESAMT, 'Ungültiges Ziel.');
      pruefe(ebeneVon(ziel) === ebeneVon(e.feld), 'Das Ziel liegt auf der anderen Ebene. Zum Wechseln zwischen Erde und All dient der Raumhafen.');
      pruefe(bereichVon(d) !== 'luft', 'Flugzeuge werden verlegt (Befehl "Verlegen") oder greifen an.');
      pruefe(ziel !== e.feld || o.nachbar, 'Die Einheit steht schon dort.');
      if (!o.nachbar) {
        const bes = this.besitzer(ziel);
        pruefe(bes == null || this.ignoriertGrenzen(d) || this.darfBetreten(e.volk, bes), 'Fremdes Gebiet darfst du nur mit "Offenen Grenzen" oder im Krieg betreten.');
        pruefe(this.bewegungsKostenRoh(e.volk, d, ziel, ziel, true) < Infinity, bereichVon(d) === 'see' ? 'Schiffe können nur auf Wasser fahren (Tiefsee erst mit späteren Schiffen).' : 'Dorthin kann diese Einheit nicht (Wasser erst mit der Forschung zum Einschiffen).');
        const fremd = this.einheitenAuf(ziel).find((u) => u.volk !== e.volk && !this.verbuendet(e.volk, u.volk));
        pruefe(!fremd, 'Dort steht eine fremde Einheit. Zum Kämpfen nutze "Angreifen".');
      }
      const pfad = this.planeWeg(e, ziel, o);
      pruefe(pfad && pfad.length, 'Es gibt keinen Weg dorthin.');
      this.hpAbrechnen(e);
      e.pfad = pfad;
      e.arbeit = null;
      if (e.modus === 'befestigt' || e.modus === 'schlafen') e.modus = 'wach';
      this.markiere('e' + e.id);
      return true;
    } catch (err) {
      if (o.still && err instanceof SpielFehler) return false;
      throw err;
    }
  },

  befehl_bewegen(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(!e.in || bereichVon(EINHEIT[e.typ]) !== 'luft', 'Flugzeuge werden verlegt.');
    if (e.in) this.ausladen(e);
    e.angriff = null; e.nach_arbeit = null;
    if (e.modus === 'erkunden' || e.modus === 'auto_arbeit') e.modus = 'wach';
    if (e.route && !b.route) this.routeBeenden(e, 'Die Handelsroute wurde beendet, weil die Karawane einen neuen Befehl bekam.');
    this.bewegeNach(e, b.ziel | 0);
    return { ankunft: e.pfad[e.pfad.length - 1].t };
  },

  befehl_anhalten(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    e.pfad = []; e.angriff = null; e.nach_arbeit = null;
    if (e.modus === 'erkunden') e.modus = 'wach';
    this.stapelAufloesen(e);
    this.markiere('e' + e.id);
  },

  befehl_modus(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(['wach', 'schlafen', 'befestigt', 'erkunden', 'auto_arbeit'].includes(b.modus), 'Unbekannter Modus.');
    const d = EINHEIT[e.typ];
    if (b.modus === 'befestigt') pruefe(istMilitaer(d), 'Nur Militäreinheiten können sich befestigen.');
    if (b.modus === 'befestigt' || b.modus === 'auto_arbeit' || b.modus === 'erkunden') this.pruefeNichtEingeschifft(e, b.modus === 'befestigt' ? 'sich befestigen' : b.modus === 'erkunden' ? 'automatisch erkunden' : 'automatisch arbeiten');
    if (b.modus === 'auto_arbeit') pruefe(d.faehigkeiten?.includes('arbeiten') || d.faehigkeiten?.includes('see_arbeiten'), 'Nur Arbeiter können automatisch arbeiten.');
    this.hpAbrechnen(e);
    e.modus = b.modus;
    e.modus_seit = this.t;
    if (b.modus === 'befestigt' || b.modus === 'schlafen') { e.pfad = []; }
    this.markiere('e' + e.id);
    if (b.modus === 'erkunden') { e.arbeit = null; this.erkundenWeiter(e); }
    if (b.modus === 'auto_arbeit') { if (!e.arbeit) this.autoArbeitWeiter(e); }
  },

  /** Steht die Einheit (nach Stopp/Blockade) auf einem Feld mit einer eigenen stehenden Einheit derselben Schicht, rückt sie aufs nächste freie Feld. */
  stapelAufloesen(e) {
    const d = EINHEIT[e.typ];
    const sch = schichtVon(d);
    if (sch === 'luft' || sch === 'handel' || e.in) return;
    const mit = this.einheitenAuf(e.feld).find((u) => u.id !== e.id && !u.in && u.volk === e.volk && schichtVon(EINHEIT[u.typ]) === sch && !u.pfad?.length);
    if (!mit) return;
    const f = this.freiesFeld(e.volk, d, e.feld);
    if (f < 0 || f === e.feld) return;
    e.feld = f;
    for (const x of this.alleEinheiten()) if (x.in === e.id) { x.feld = f; this.markiere('e' + x.id); }
    this.positionenNeu();
    this.markiere('e' + e.id);
    this.erkunde(e.volk, e.feld, this.sichtweite(e));
  },

  /** Ein Schritt eines Marsches ist fällig. */
  schritt(eid) {
    const e = this.z.einheiten[eid];
    if (!e || !e.pfad || !e.pfad.length) return;
    const d = EINHEIT[e.typ];
    const st = e.pfad[0];
    const letzter = e.pfad.length === 1;
    // Ist der Schritt (noch) erlaubt?
    let kosten = this.bewegungsKostenRoh(e.volk, d, e.feld, st.f);
    let tausch = null;
    if (kosten < Infinity) {
      for (const u of this.einheitenAuf(st.f)) {
        if (u.id === e.id) continue;
        if (u.volk !== e.volk && !(this.verbuendet(e.volk, u.volk) && schichtVon(EINHEIT[u.typ]) !== schichtVon(d))) { kosten = Infinity; break; }
        if (letzter && u.volk === e.volk && schichtVon(d) !== 'handel' && schichtVon(EINHEIT[u.typ]) === schichtVon(d)) {
          // Platztausch mit einer stehenden eigenen Einheit, sonst davor anhalten
          if (!u.pfad?.length && this.bewegungsKostenRoh(u.volk, EINHEIT[u.typ], st.f, e.feld) < Infinity && this.platzFrei(u.volk, EINHEIT[u.typ], e.feld, e.id)) tausch = u;
          else kosten = Infinity;
        }
      }
    }
    if (kosten === Infinity) {
      e.pfad = [];
      this.stapelAufloesen(e);
      this.markiere('e' + eid);
      if (e.route) { this.routeNeuPlanen(e); return; }
      if (e.modus === 'erkunden') { this.erkundenWeiter(e); return; }
      if (e.modus === 'auto_arbeit') { this.autoArbeitWeiter(e); return; }
      if (e.angriff) { const z = e.angriff; e.angriff = null; this.meldung(e.volk, `${d.name}: Der Weg zum Angriffsziel ist blockiert.`, { feld: e.feld }); return void z; }
      this.meldung(e.volk, `${d.name}: Der Weg ist blockiert, die Einheit wartet.`, { feld: e.feld });
      return;
    }
    this.hpAbrechnen(e);
    const vorher = e.feld;
    e.feld = st.f;
    e.pfad.shift();
    for (const x of this.alleEinheiten()) if (x.in === e.id) { x.feld = e.feld; this.markiere('e' + x.id); }
    if (tausch) { tausch.feld = vorher; this.hpAbrechnen(tausch); this.markiere('e' + tausch.id); }
    this.positionenNeu();
    this.markiere('e' + eid);
    this.erkunde(e.volk, e.feld, this.sichtweite(e));
    // Beiwerk unterwegs
    this.nachSchritt?.(e);
    if (!this.z.einheiten[eid]) return; // z. B. beim Erobern eines Lagers verbraucht
    if (!e.pfad.length) this.ankunft(e);
  },

  ankunft(e) {
    const d = EINHEIT[e.typ];
    if (e.angriff) { const z = e.angriff; e.angriff = null; this.angriffNachMarsch(e, z); return; }
    if (e.nach_arbeit) { const id = e.nach_arbeit; e.nach_arbeit = null; const h = this.verbesserungHindernis(this.z.voelker[e.volk], e.feld, id, e); if (!h) this.arbeitStarten(e, id); else this.autoArbeitWeiter(e); return; }
    if (e.route) { this.routeAnkunft(e); return; }
    if (e.modus === 'erkunden') { this.erkundenWeiter(e); return; }
    if (e.verlade_in) { const tr = this.z.einheiten[e.verlade_in]; e.verlade_in = null; if (tr && tr.feld === e.feld) { e.in = tr.id; this.positionenNeu(); } }
    if (this.z.voelker[e.volk]?.art === 'spieler' && istMilitaer(d) === false && d.faehigkeiten?.includes('gruenden')) this.meldung(e.volk, 'Der Siedler ist angekommen. Gründe hier eine Stadt!', { feld: e.feld });
  },

  /** Automatisches Erkunden: nächstes unerkundetes Gebiet anlaufen. */
  erkundenWeiter(e) {
    const n = this.nebel(e.volk);
    const d = EINHEIT[e.typ];
    let best = -1, bestW = Infinity;
    for (let r = 2; r <= 14 && best < 0; r += 3) {
      for (const i of umkreis(e.feld, r)) {
        if (abstand(i, e.feld) < r - 2) continue;
        if (this.istErkundet(n, i)) continue;
        // ein erkundetes, betretbares Feld daneben anlaufen
        for (const j of nachbarn(i)) {
          if (!this.istErkundet(n, j) || j === e.feld) continue;
          if (this.bewegungsKostenRoh(e.volk, d, j, j, true) === Infinity) continue;
          if (!this.platzFrei(e.volk, d, j, e.id)) continue;
          const w = abstand(e.feld, j) + ((i * 7919) % 13) * 0.05;
          if (w < bestW) { bestW = w; best = j; }
        }
      }
    }
    if (best < 0 || !this.bewegeNach(e, best, { still: true })) {
      e.modus = 'wach';
      this.meldung(e.volk, `${d.name}: In der Nähe gibt es nichts mehr zu erkunden.`, { feld: e.feld });
      this.markiere('e' + e.id);
    }
  },

  // ---------- Sicht und Nebel ----------
  sichtweite(e) {
    const d = EINHEIT[e.typ];
    if (!d) return 1;
    let s = d.sicht || 2;
    const g = GELAENDE[karte().gelaende[e.feld]];
    if (bereichVon(d) === 'land') s += g.sicht || 0;
    const v = this.z.voelker[e.volk];
    if (v && v.art === 'spieler') s += this.raten(e.volk).boni.sicht || 0;
    for (const bid of e.befoerderungen || []) { const w = BEFOERDERUNG[bid]?.wirkung; if (w) s += (w.sicht || 0) + (w.sicht_gelaende?.[g.id] || 0); }
    return Math.max(1, Math.min(6, s));
  },

  nebel(vid) {
    let n = this._nebel[vid];
    if (!n) {
      const t = this.z.nebel?.[vid];
      n = t ? unb64(t, NEBEL_BYTES) : new Uint8Array(NEBEL_BYTES);
      this._nebel[vid] = n;
    }
    return n;
  },
  istErkundet(n, i) { return (n[i >> 3] & (1 << (i & 7))) !== 0; },
  nebelText(vid) { return b64(this.nebel(vid)); },

  /** Deckt Felder im Umkreis auf (erkundet). */
  erkunde(vid, mitte, radius) {
    const v = this.z.voelker[vid];
    if (!v || v.art === 'tiere' || v.art === 'barbar') return;
    const n = this.nebel(vid);
    const neue = [];
    for (const i of umkreis(mitte, radius)) {
      const m = 1 << (i & 7);
      if (!(n[i >> 3] & m)) { n[i >> 3] |= m; neue.push(i); (this._neuErkundet ||= {})[vid] ||= []; this._neuErkundet[vid].push(i); }
    }
    if (neue.length) { (this.z.nebel ||= {}); this.z.nebel[vid] = null; this.markiere('n' + vid); this.kontaktePruefen?.(vid, mitte, radius); this.naturwunderEntdecken?.(vid, neue); }
  },

  /** Aktuell sichtbare Felder eines Volkes (inkl. Verbündeter und verbündeter Stadtstaaten). */
  sichtbareFelder(vid) {
    const quellen = [vid];
    for (const v of this.alleVoelker()) {
      if (v.id === vid) continue;
      if (this.verbuendet(vid, v.id)) quellen.push(v.id);
      if (v.art === 'stadtstaat' && v.verbuendet === vid) quellen.push(v.id);
    }
    const sicht = new Set();
    for (const q of quellen) {
      for (const e of this.einheitenVon(q)) {
        if (e.in) continue;
        for (const i of umkreis(e.feld, this.sichtweite(e))) sicht.add(i);
      }
      for (const s of this.staedteVon(q)) {
        for (const i of umkreis(s.feld, 2 + this.gebaeudeSumme(s, 'sicht'))) sicht.add(i);
        for (const i of s.gebiet || []) {
          sicht.add(i);
          const f = this.z.felder[i];
          if (f && f.v && VERBESSERUNG[f.v]?.sicht) for (const j of umkreis(i, VERBESSERUNG[f.v].sicht)) sicht.add(j);
        }
      }
    }
    return sicht;
  },

  // ---------- Lebenspunkte ----------
  heilrate(e) {
    if (e.pfad?.length || e.unterversorgt || e.in) return 0;
    const d = EINHEIT[e.typ];
    if (bereichVon(d) === 'luft') { const s = this.stadtAuf(e.feld); return (s && s.volk === e.volk ? HEILUNG.stadt : HEILUNG.eigen) * WIRTSCHAFT_TEMPO; }
    const s = this.stadtAuf(e.feld);
    let r;
    if (s && s.volk === e.volk) r = HEILUNG.stadt + this.gebaeudeSumme(s, 'heilung');
    else { const bes = this.besitzer(e.feld); r = bes === e.volk ? HEILUNG.eigen : (bes != null && this.verbuendet(e.volk, bes)) ? HEILUNG.freund : HEILUNG.fremd; }
    if (e.modus === 'befestigt' && r === 0) r = 4;
    if (r < HEILUNG.freund && this.befMax(e, 'heilt_fremd')) r = HEILUNG.freund;   // Beförderung: heilt auch außerhalb des eigenen Gebiets
    for (const bid of e.befoerderungen || []) r += BEFOERDERUNG[bid]?.wirkung?.heilung || 0;
    // Sanitäter in der Nähe
    for (const n of [e.feld, ...nachbarn(e.feld)]) for (const u of this.einheitenAuf(n)) if (u.volk === e.volk && EINHEIT[u.typ]?.faehigkeiten?.includes('heilen')) { r += 10; break; }
    r *= WIRTSCHAFT_TEMPO;
    const v = this.z.voelker[e.volk];
    if (v && v.art !== 'tiere' && v.art !== 'barbar') r *= 1 + (this.raten(e.volk).boni.heilung_prozent || 0) / 100;
    return r;
  },
  aktuelleHp(e) {
    const r = this.heilrate(e);
    return Math.min(100, (e.hp ?? 100) + r * Math.max(0, this.t - (e.hp_um ?? this.t)) / STD);
  },
  hpAbrechnen(e) {
    const hp = this.aktuelleHp(e);
    if (hp !== e.hp || e.hp_um !== this.t) { e.hp = Math.round(hp * 100) / 100; e.hp_um = this.t; this.markiere('e' + e.id); }
  },

  // ---------- Stadt gründen ----------
  stadtGruendenHindernis(vid, i) {
    if (!stadtGelaendeOk(i)) return 'Auf diesem Gelände kann keine Stadt stehen (nicht auf Wasser, Gebirge oder Eis).';
    if (this.naturwunderAuf(i)) return 'Auf einem Naturwunder kann keine Stadt stehen.';
    if (this.z.felder[i]?.wu || this.z.felder[i]?.wb) return 'Auf einem Weltwunder kann keine Stadt stehen.';
    const bes = this.besitzer(i);
    if (bes != null && bes !== vid) return 'Nicht auf fremdem Gebiet.';
    for (const s of this.alleStaedte()) if (abstand(s.feld, i) < STADT_MINDESTABSTAND) return `Zu nah an ${s.name}: Städte brauchen mindestens ${STADT_MINDESTABSTAND} Felder Abstand.`;
    for (const l of Object.values(this.z.lager)) if (abstand(l.feld, i) < 2) return 'Zu nah an einem Barbarenlager.';
    return null;
  },

  befehl_stadt_gruenden(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(d.faehigkeiten?.includes('gruenden'), 'Nur Siedler und Kolonisten können Städte gründen.');
    this.pruefeNichtEingeschifft(e, 'Städte gründen');
    pruefe(!e.pfad?.length, 'Der Siedler ist noch unterwegs.');
    const h = this.ebeneGruendenHindernis(e, e.feld) || this.stadtGruendenHindernis(v.id, e.feld);
    pruefe(!h, h);
    const name = this.stadtName(v, b.name);
    const s = this.stadtGruenden(v.id, e.feld, name);
    this.einheitEntfernen(e.id);
    return { stadt: s.id };
  },

  stadtName(v, wunsch) {
    let n = typeof wunsch === 'string' ? wunsch.replace(/[^\p{L}\p{N} '\-.]/gu, '').trim().slice(0, 24) : '';
    const vorhanden = new Set(this.alleStaedte().map((s) => s.name.toLowerCase()));
    if (n.length >= 2 && !vorhanden.has(n.toLowerCase())) return n;
    const basis = ['Ahornfeld', 'Bergen', 'Lindau', 'Mühlbach', 'Eichstätt', 'Rosenheim', 'Falkenstein', 'Seeburg', 'Wolfsgrund', 'Sonnenberg', 'Talheim', 'Birkenau', 'Steinach', 'Hohenfels', 'Kranichfeld', 'Uferstadt', 'Hirschau', 'Waldkirch', 'Goldbach', 'Silberau', 'Weidenhof', 'Fuchstal', 'Morgenrot', 'Rabenstein', 'Lerchenfeld', 'Brunnen', 'Felsenau', 'Nebelhain', 'Kieselbach', 'Buchenau'];
    const nr = this.staedteVon(v.id).length;
    const kern = v.name.replace(/[^\p{L}]/gu, '').slice(0, 10) || 'Volk';
    if (nr === 0 && !vorhanden.has(kern.toLowerCase())) return kern;
    for (let k = 0; k < 200; k++) {
      const x = basis[(nr + k + v.id) % basis.length] + (k >= basis.length ? ' ' + (Math.floor(k / basis.length) + 1) : '');
      if (!vorhanden.has(x.toLowerCase())) return x;
    }
    return 'Stadt ' + this.neueId();
  },

  stadtGruenden(vid, feld, name) {
    const v = this.z.voelker[vid];
    this.aendern(vid);
    const id = this.neueId();
    const erste = this.staedteVon(vid).length === 0;
    const s = { id, volk: vid, name, feld, gegruendet: this.t, bev: 1, nahrung: 0, kultur: 0, grenz_k: 0, gebaeude: {}, bau: [], schlange: [], arbeit: [], gebiet: [], manuell: false, hp: null, hp_um: this.t };
    if (erste || !this.staedteVon(vid).some((x) => x.gebaeude.palast)) { s.gebaeude.palast = 1; s.hauptstadt = true; }
    this.z.staedte[id] = s;
    for (const i of umkreis(feld, 1)) if (!this.z.felder[i]?.s) this.feldUebernehmen(s, i);
    if (!s.gebiet.includes(feld)) this.feldUebernehmen(s, feld);
    s.hp = this.stadtMaxHp(s);
    this.positionenNeu();
    this.autoBewirtschaften(s);
    this.erkunde(vid, feld, 3);
    this.markiere('s' + id);
    if (v.art === 'spieler') this.meldung(vid, `${name} wurde gegründet!`, { art: 'stadt', feld, wichtig: erste });
    delete this._raten[vid];
    return s;
  },

  befehl_stadt_umbenennen(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    const n = this.stadtName(v, b.name);
    pruefe(typeof b.name === 'string' && n.toLowerCase() === b.name.trim().toLowerCase(), 'Dieser Name ist ungültig oder schon vergeben (2 bis 24 Zeichen).');
    s.name = n; this.markiere('s' + s.id);
  },

  // ---------- Verwaltung ----------
  befehl_aufloesen(v, b) {
    const e = this.eigeneEinheit(v, b.einheit, true);
    const d = EINHEIT[e.typ];
    const gold = Math.floor((d.kosten.gold || 0) * AUFLOESEN_ERSTATTUNG);
    this.aendern(v.id);
    v.gold += gold;
    if (e.route) this.routeBeenden(e);
    this.einheitEntfernen(e.id, { ladungRetten: true });
    this.meldung(v.id, `${d.name} wurde aufgelöst. Du bekommst ${gold} Gold zurück.`);
    return { gold };
  },

  aufruestenKosten(e) {
    const d = EINHEIT[e.typ], n = EINHEIT[d.upgrade];
    if (!n) return null;
    const k = { gold: Math.max(10, Math.round(((n.kosten.gold || 0) - (d.kosten.gold || 0) * 0.5) * AUFRUESTEN_FAKTOR)) };
    for (const [gut, x] of Object.entries(n.kosten)) if (!['zeit', 'gold', 'holz', 'stein'].includes(gut)) k[gut] = x;
    return k;
  },

  /**
   * Dauer des Aufrüstens: 25 % länger als die schnellste Eigenproduktion der neuen Einheit in einer eigenen Stadt,
   * damit Aufrüsten nie schneller ist als direkt neu zu bauen. Die Einheit ist währenddessen nicht einsatzbereit.
   */
  aufruestenDauerMs(e) {
    const n = EINHEIT[EINHEIT[e.typ]?.upgrade];
    if (!n) return null;
    let best = Infinity;
    for (const s of this.alleStaedte()) if (s.volk === e.volk) best = Math.min(best, this.bauDauerMs(s, 'einheit', n.id));
    if (!Number.isFinite(best)) best = Math.max(30 * 1000, Math.round(n.kosten.zeit * 1000 / produktionTempo(n.zeitalter || 0)));
    return Math.round(best * AUFRUESTEN_ZEIT_FAKTOR);
  },

  befehl_aufruesten(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(this.hatOption(v, 'aufruesten'), `Aufrüsten erfordert die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:aufruesten'])}".`);
    pruefe(d.upgrade && EINHEIT[d.upgrade], 'Diese Einheit kann nicht aufgerüstet werden.');
    pruefe(this.freigeschaltet(v, 'einheit', d.upgrade), `Für ${EINHEIT[d.upgrade].name} fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['einheit:' + d.upgrade])}".`);
    pruefe(this.besitzer(e.feld) === v.id, 'Aufrüsten geht nur im eigenen Gebiet.');
    pruefe(!e.pfad?.length, 'Die Einheit ist unterwegs.');
    pruefe(!e.arbeit && !e.route, 'Die Einheit ist beschäftigt.');
    const k = this.aufruestenKosten(e);
    this.bezahle(v, k);
    this.hpAbrechnen(e);
    e.angriff = null; e.nach_arbeit = null;
    if (e.modus === 'erkunden' || e.modus === 'auto_arbeit') e.modus = 'wach';
    const dauer = this.aufruestenDauerMs(e);
    e.umruestung = { zu: d.upgrade, fertig_um: this.t + dauer };
    this.markiere('e' + e.id);
    this.meldung(v.id, `${d.name} wird zu ${EINHEIT[d.upgrade].name} aufgerüstet (dauert ${Math.ceil(dauer / MIN)} min, bis dahin nicht einsatzbereit).`, { feld: e.feld });
    return { fertig_um: e.umruestung.fertig_um };
  },

  umruestungFertig(id) {
    const e = this.z.einheiten[id];
    if (!e?.umruestung) return;
    const alt = EINHEIT[e.typ], neu = EINHEIT[e.umruestung.zu];
    delete e.umruestung;
    if (!neu) return;
    this.hpAbrechnen(e);
    e.typ = neu.id;
    e.hp = Math.max(e.hp, 50);
    this.markiere('e' + e.id);
    this.meldung(e.volk, `${alt.name} wurde zu ${neu.name} aufgerüstet.`, { art: 'einheit', feld: e.feld });
    delete this._raten[e.volk];
  },

  // ---------- Erfahrung und Beförderungen (wie Civ 6) ----------
  /** Größter Wert eines Wirkungsschlüssels über alle Beförderungen der Einheit (0, wenn keine ihn hat). */
  befMax(e, schluessel) { let m = 0; for (const bid of e.befoerderungen || []) m = Math.max(m, BEFOERDERUNG[bid]?.wirkung?.[schluessel] || 0); return m; },
  /** Summe eines Wirkungsschlüssels über alle Beförderungen. */
  befSumme(e, schluessel) { let m = 0; for (const bid of e.befoerderungen || []) m += BEFOERDERUNG[bid]?.wirkung?.[schluessel] || 0; return m; },
  /** Beförderungsbaum der Einheit (null = nicht befördbar). */
  befoerderungsBaum(e) { return baumVon(EINHEIT[e.typ]); },
  /** Stufe der Einheit: 1 + Anzahl der Beförderungen. */
  einheitStufe(e) { return 1 + (e.befoerderungen || []).length; },
  /** Beförderungen, die die Einheit jetzt wählen dürfte (Voraussetzung erfüllt, noch nicht vorhanden). */
  befoerderungenVerfuegbar(e) {
    const baum = this.befoerderungsBaum(e); if (!baum) return [];
    const hat = new Set(e.befoerderungen || []);
    return BEFOERDERUNGEN.filter((p) => p.baum === baum && !hat.has(p.id) && (p.voraussetzung.length === 0 || p.voraussetzung.some((v) => hat.has(v))));
  },
  /** EP, die bis zur nächsten Beförderung nötig sind (null = Höchststufe). */
  epBenoetigt(e) { const n = (e.befoerderungen || []).length; return n >= MAX_BEFOERDERUNGEN ? null : epFuerBefoerderung(n + 1); },
  befoerderungMoeglich(e) {
    const need = this.epBenoetigt(e);
    return need != null && !!this.befoerderungsBaum(e) && (e.ep || 0) >= need && this.befoerderungenVerfuegbar(e).length > 0;
  },
  /** Erfahrung gutschreiben. Prozentboni (Gebäude, Forschung) wirken einmal und werden aufgerundet; wartet die Einheit auf ihre Beförderung, verfällt der Rest. */
  epGeben(e, x, gegnerVolk) {
    const need = this.epBenoetigt(e);
    if (need == null || !this.befoerderungsBaum(e)) return 0;
    const gv = this.z.voelker[gegnerVolk];
    if (gv && (gv.art === 'barbar' || gv.art === 'tiere') && (e.befoerderungen || []).length >= 1) x = EP.nach_beforderung_barbar;
    const v = this.z.voelker[e.volk];
    if (v && v.art === 'spieler') x *= 1 + (this.raten(e.volk).boni.erfahrung_prozent || 0) / 100;
    x = Math.ceil(x - 1e-9);
    const alt = e.ep || 0;
    e.ep = Math.min(need, alt + x);
    if (e.ep !== alt) this.markiere('e' + e.id);
    return e.ep - alt;
  },

  befehl_befoerdern(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    this.befoerdern(e, b.befoerderung);
  },
  /** Beförderung vergeben: heilt 50 LP, setzt den EP-Balken zurück und kostet eine kurze Erholung. */
  befoerdern(e, bid) {
    if (!e.befoerderungen) e.befoerderungen = [];   // ältere/gespeicherte Einheiten haben das Feld nicht
    const p = BEFOERDERUNG[bid];
    pruefe(p, 'Unbekannte Beförderung.');
    pruefe(this.befoerderungsBaum(e), 'Diese Einheit kann nicht befördert werden.');
    pruefe(this.befoerderungMoeglich(e), 'Die Einheit hat noch nicht genug Erfahrung.');
    pruefe(p.baum === this.befoerderungsBaum(e), 'Diese Beförderung passt nicht zu dieser Einheit.');
    pruefe(!(e.befoerderungen || []).includes(p.id), 'Diese Beförderung hat die Einheit schon.');
    pruefe(p.voraussetzung.length === 0 || p.voraussetzung.some((x) => e.befoerderungen.includes(x)), 'Dafür braucht die Einheit zuerst eine Beförderung aus der Stufe davor.');
    this.hpAbrechnen(e);
    e.befoerderungen.push(p.id);
    e.ep = 0;
    e.hp = Math.min(100, e.hp + EP.heilung_beforderung);
    e.abkling_bis = Math.max(e.abkling_bis || 0, this.t + EP.erholung_beforderung);
    this.markiere('e' + e.id);
    delete this._raten[e.volk];
    return p;
  },

  // ---------- Transport ----------
  ausladen(e) {
    const tr = this.z.einheiten[e.in];
    e.in = null;
    if (tr) e.feld = tr.feld;
    this.positionenNeu();
    this.markiere('e' + e.id);
  },

  luftPlatzFrei(s) {
    const plaetze = 2 + this.gebaeudeSumme(s, 'luft_plaetze');
    const da = this.einheitenAuf(s.feld).filter((u) => bereichVon(EINHEIT[u.typ]) === 'luft').length;
    return da < plaetze;
  },
};
