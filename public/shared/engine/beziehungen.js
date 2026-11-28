// Beziehungen zwischen Völkern (Handel und Diplomatie): Beziehungswert, Handelsabkommen, Embargo, Gesandte/Botschaften, KI-Reaktionen.
// Zustand im Diplomatie-Eintrag des Paares (z.diplomatie['a|b']):
//   beziehung (Zahl), handelsabkommen (bool), embargo: { <vid>: seit } (wer es verhängt hat), botschaft: { <vid>: stadtId } (vid hat eine Botschaft beim anderen),
//   ki_vorschlag_um (frühester nächster KI-Vorschlag).
// Regeln: daten/diplomatie.js. Der stündliche Takt läuft in diplomatiePruefung mit.
import { umkreis, abstand } from '../hex.js';
import { BEZIEHUNG, KI_SCHWELLEN, HANDELSABKOMMEN, EMBARGO, GESANDTER, beziehungsStufe } from '../daten/diplomatie.js';
import { EINHEIT, FREIGESCHALTET_DURCH } from '../daten/index.js';
import { STD } from '../regeln.js';
import { pruefe } from './spiel.js';

const GROSS = new Set(['spieler', 'ki']);
const klemme = (w) => Math.max(BEZIEHUNG.min, Math.min(BEZIEHUNG.max, w));

export const beziehungen = {
  /** Beziehungswert des Paares (0, wenn noch nie etwas war). */
  beziehung(a, b) { if (a === b) return BEZIEHUNG.max; return this.z.diplomatie[this.diploSchluessel(a, b)]?.beziehung || 0; },
  beziehungsStufe(a, b) { return beziehungsStufe(this.beziehung(a, b)); },
  /** Ändert die Beziehung (nur zwischen Spielern und KI-Völkern). */
  beziehungAendern(a, b, delta) {
    if (a === b || !delta) return;
    const va = this.z.voelker[a], vb = this.z.voelker[b];
    if (!va || !vb || !GROSS.has(va.art) || !GROSS.has(vb.art)) return;
    const d = this.diplo(a, b);
    const alt = d.beziehung || 0;
    d.beziehung = Math.round(klemme(alt + delta) * 10) / 10;
    this.markiere('d' + this.diploSchluessel(a, b));
    const sa = beziehungsStufe(alt), sn = beziehungsStufe(d.beziehung);
    if (sa.id !== sn.id) for (const [x, y] of [[a, b], [b, a]]) if (this.z.voelker[x].art === 'spieler') this.meldung(x, `Die Beziehung zu ${this.z.voelker[y].name} ist jetzt: ${sn.name}.`, { art: 'diplomatie' });
  },
  beziehungEreignis(a, b, art) { this.beziehungAendern(a, b, BEZIEHUNG.ereignis[art] || 0); },
  /** Kriegserklärung von a an b: großer Abschlag beim Opfer (bzw. Bündnisbruch), kleiner bei allen, die das Opfer kennen. */
  kriegBeziehung(a, b, warBuendnis) {
    this.beziehungEreignis(a, b, warBuendnis ? 'buendnis_gebrochen' : 'krieg_erklaert');
    for (const x of this.alleVoelker()) if (x.id !== a && x.id !== b && GROSS.has(x.art) && this.kennt(x.id, b) && this.kennt(x.id, a) && !this.imKrieg(x.id, b)) this.beziehungEreignis(x.id, a, 'krieg_zuschauer');
  },

  hatEmbargo(a, b) { const e = this.z.diplomatie[this.diploSchluessel(a, b)]?.embargo; return !!(e && Object.keys(e).length); },
  hatHandelsabkommen(a, b) { return !!this.z.diplomatie[this.diploSchluessel(a, b)]?.handelsabkommen; },
  /** Zusätzliche Handelsrouten aus Handelsabkommen. */
  abkommenRouten(vid) {
    let n = 0;
    for (const [k, d] of Object.entries(this.z.diplomatie)) if (d.handelsabkommen && k.split('|').map(Number).includes(vid)) n++;
    return Math.min(HANDELSABKOMMEN.maxZusatzRouten, n * HANDELSABKOMMEN.zusatzRouten);
  },
  /** Faktor auf den Routenwert zwischen den Völkern zweier Städte. */
  routenFaktor(a, b) { return a !== b && this.hatHandelsabkommen(a, b) ? 1 + HANDELSABKOMMEN.routenBonusProzent / 100 : 1; },

  /** Stündlich: Zustand des Paares treibt die Beziehung (bis zu Grenzen), alles verblasst langsam zur Mitte. */
  beziehungTakt() {
    const gross = this.alleVoelker().filter((v) => GROSS.has(v.art));
    if (gross.length < 2) return;
    // Routen zwischen Völkern zählen
    const routen = new Map();
    for (const e of this.alleEinheiten()) {
      if (!e.route?.aktiv) continue;
      const z = this.z.staedte[e.route.nach]; if (!z || z.volk === e.volk) continue;
      const k = this.diploSchluessel(e.volk, z.volk); routen.set(k, (routen.get(k) || 0) + 1);
    }
    const feinde = new Map(gross.map((v) => [v.id, new Set(this.kriegsgegner(v.id))]));
    const J = BEZIEHUNG.jeStunde;
    for (let i = 0; i < gross.length; i++) for (let j = i + 1; j < gross.length; j++) {
      const a = gross[i].id, b = gross[j].id;
      if (!this.kennt(a, b) && !this.kennt(b, a)) continue;
      const k = this.diploSchluessel(a, b);
      const d = this.z.diplomatie[k] || {};
      let z = 0;
      z += Math.min(3, routen.get(k) || 0) * J.handelsroute;
      if (d.offene_grenzen) z += J.offene_grenzen;
      if (d.buendnis) z += J.buendnis;
      if (d.handelsabkommen) z += J.handelsabkommen;
      z += Object.keys(d.botschaft || {}).length * J.botschaft;
      if (d.krieg) z += J.krieg;
      if (d.embargo && Object.keys(d.embargo).length) z += J.embargo;
      if (!d.krieg) for (const f of feinde.get(a)) if (f !== b && feinde.get(b).has(f) && GROSS.has(this.z.voelker[f]?.art)) { z += J.gemeinsamer_feind; break; }
      const alt = d.beziehung || 0;
      const V = BEZIEHUNG.verblassen, MAX = BEZIEHUNG.zustandMax, MIN = BEZIEHUNG.zustandMin;
      let neu;
      // Zustände treiben bis zu ihrer Grenze und halten dort; was darüber hinaus geht (Ereignisse), verblasst bis zur Grenze.
      if (z > 0) neu = alt < MAX ? Math.min(MAX, alt + z) : Math.max(MAX, alt - V);
      else if (z < 0) neu = alt > MIN ? Math.max(MIN, alt + z) : Math.min(MIN, alt + V);
      else neu = alt > 0 ? Math.max(0, alt - V) : Math.min(0, alt + V);
      if (Math.abs(neu - alt) > 1e-9) this.beziehungAendern(a, b, neu - alt);
    }
  },

  // ---------- Embargo ----------
  befehl_embargo(v, b) {
    const o = this.z.voelker[b.an];
    pruefe(o && o.id !== v.id && GROSS.has(o.art), 'Ein Embargo geht nur gegen andere Völker.');
    pruefe(this.kennt(v.id, o.id), 'Du kennst dieses Volk noch nicht.');
    const d = this.diplo(v.id, o.id);
    const k = this.diploSchluessel(v.id, o.id);
    if (b.aufheben) {
      pruefe(d.embargo?.[v.id] != null, 'Du hast kein Embargo gegen dieses Volk.');
      pruefe(this.t - d.embargo[v.id] >= EMBARGO.mindestDauer, 'Ein Embargo gilt mindestens 6 Stunden.');
      delete d.embargo[v.id];
      this.beziehungEreignis(v.id, o.id, 'embargo_aufgehoben');
      this.markiere('d' + k);
      this.meldung(o.id, `${v.name} hat das Embargo gegen dich aufgehoben.`, { art: 'handel' });
      return { ok: true };
    }
    pruefe(this.hatOption(v, 'embargo'), `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:embargo'])}".`);
    pruefe(!d.embargo?.[v.id], 'Das Embargo besteht schon.');
    this.embargoVerhaengen(v.id, o.id);
    return { ok: true };
  },
  embargoVerhaengen(vid, oid) {
    const d = this.diplo(vid, oid);
    (d.embargo ||= {})[vid] = this.t;
    d.handelsabkommen = false;
    this.markiere('d' + this.diploSchluessel(vid, oid));
    this.beziehungEreignis(vid, oid, 'embargo');
    // Routen zwischen beiden enden, Tauschangebote verfallen
    for (const e of this.alleEinheiten()) if (e.route) {
      const z = this.z.staedte[e.route.nach];
      if (z && ((e.volk === vid && z.volk === oid) || (e.volk === oid && z.volk === vid))) this.routeBeenden(e, 'Die Handelsroute endet wegen eines Embargos.');
    }
    for (const [id, a] of Object.entries(this.z.angebote)) if (a.art === 'tausch' && ((a.von === vid && a.an === oid) || (a.von === oid && a.an === vid))) this.angebotEntfernen(a);
    delete this._raten[vid]; delete this._raten[oid];
    this.meldung(oid, `${this.z.voelker[vid].name} verhängt ein Embargo gegen dich: kein Handel mehr zwischen euren Völkern.`, { art: 'handel', wichtig: true });
    this.meldung(vid, `Embargo gegen ${this.z.voelker[oid].name} verhängt.`, { art: 'handel' });
  },

  // ---------- Gesandte ----------
  /** Fremde Stadt, in der ein Gesandter auf Feld f eine Botschaft einrichten kann (in der Stadt oder daneben). */
  botschaftsZiel(vid, feld) {
    for (const s of this.alleStaedte()) {
      if (s.volk === vid || abstand(s.feld, feld) > 1) continue;
      if (!GROSS.has(this.z.voelker[s.volk]?.art)) continue;
      return s;
    }
    return null;
  },
  befehl_gesandtschaft(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(EINHEIT[e.typ].faehigkeiten?.includes('gesandtschaft'), 'Nur Gesandte können Botschaften einrichten.');
    const s = this.botschaftsZiel(v.id, e.feld);
    pruefe(s, 'Der Gesandte muss in oder neben einer Stadt eines anderen Volkes stehen.');
    pruefe(!this.imKrieg(v.id, s.volk), 'Mit Kriegsgegnern gibt es keine Botschaften.');
    const d = this.diplo(v.id, s.volk);
    pruefe(!d.botschaft?.[v.id], `Du hast schon eine Botschaft bei ${this.z.voelker[s.volk].name}.`);
    (d.botschaft ||= {})[v.id] = s.id;
    this.markiere('d' + this.diploSchluessel(v.id, s.volk));
    this.beziehungEreignis(v.id, s.volk, 'gesandtschaft');
    this.einheitEntfernen(e.id);
    v.bekannt ||= {}; v.bekannt[s.volk] = true;
    this.meldung(v.id, `Botschaft in ${s.name} eingerichtet. Ihr seht die Stadt und ihre Umgebung, die Beziehung wird besser.`, { art: 'diplomatie', feld: s.feld, wichtig: true });
    this.meldung(s.volk, `${v.name} hat eine Botschaft in ${s.name} eingerichtet.`, { art: 'diplomatie', feld: s.feld });
    this.markiere('v' + v.id);
    return { stadt: s.id };
  },
  /** Felder, die ein Volk über seine Botschaften sieht. */
  botschaftsSicht(vid, sicht) {
    for (const [k, d] of Object.entries(this.z.diplomatie)) {
      const id = d.botschaft?.[vid]; if (id == null) continue;
      const s = this.z.staedte[id]; if (!s || !k.split('|').map(Number).includes(s.volk)) continue;
      for (const i of umkreis(s.feld, GESANDTER.sichtRadius)) sicht.add(i);
    }
  },

  // ---------- KI ----------
  /** KI-Völker reagieren auf die Beziehung: Embargo, Groll bis zum Krieg, eigene Vorschläge an Spieler. */
  kiBeziehungen(v) {
    for (const o of this.alleVoelker()) {
      if (o.id === v.id || !GROSS.has(o.art) || !this.kennt(v.id, o.id)) continue;
      const w = this.beziehung(v.id, o.id);
      const d = this.diplo(v.id, o.id);
      const k = this.diploSchluessel(v.id, o.id);
      if (w <= KI_SCHWELLEN.embargo && !d.embargo?.[v.id] && !d.krieg && this.hatOption(v, 'embargo')) this.embargoVerhaengen(v.id, o.id);
      else if (w > KI_SCHWELLEN.embargo + 30 && d.embargo?.[v.id] != null && this.t - d.embargo[v.id] >= EMBARGO.mindestDauer) { delete d.embargo[v.id]; this.markiere('d' + k); this.meldung(o.id, `${v.name} hat das Embargo gegen dich aufgehoben.`, { art: 'handel' }); }
      if (w <= KI_SCHWELLEN.krieg && !d.krieg) this.kiKraenkung(v.id, o.id, 6); // bei anhaltend schlechter Beziehung wächst der Groll bis zum Krieg
      // Vorschläge (nur an Spieler, höchstens alle 12 Stunden je Paar)
      if (o.art !== 'spieler' || d.krieg || (d.ki_vorschlag_um || 0) > this.t) continue;
      let art = null;
      if (w >= KI_SCHWELLEN.vorschlagBuendnis && !d.buendnis && this.hatOption(v, 'buendnis') && this.hatOption(o, 'buendnis')) art = 'buendnis';
      else if (w >= KI_SCHWELLEN.vorschlagOffeneGrenzen && !d.offene_grenzen && this.hatOption(v, 'offene_grenzen') && this.hatOption(o, 'offene_grenzen')) art = 'offene_grenzen';
      else if (w >= KI_SCHWELLEN.vorschlagHandelsabkommen && !d.handelsabkommen && !this.hatEmbargo(v.id, o.id) && this.hatOption(v, 'handelsabkommen') && this.hatOption(o, 'handelsabkommen')) art = 'handelsabkommen';
      if (!art || Object.values(this.z.angebote).some((a) => a.von === v.id && a.an === o.id)) continue;
      d.ki_vorschlag_um = this.t + 12 * STD;
      const id = this.neueId();
      this.z.angebote[id] = { id, von: v.id, an: o.id, art, t: this.t, kosten: 0 };
      this.markiere('a' + id); this.markiere('d' + k);
      this.meldung(o.id, `${v.name} schlägt vor: ${this.angebotName(art)}. "Unsere Völker verstehen sich gut."`, { art: 'diplomatie', wichtig: true });
    }
  },
  /** Mindestbeziehung, ab der eine KI ein Angebot annimmt. */
  kiSchwelle(art) { return KI_SCHWELLEN[art] ?? -100; },
};
