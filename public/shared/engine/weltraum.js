// Weltraum-Ebene: Bewegung im All, Start und Landung am Raumhafen, Kolonien, Lieferungen aus dem All.
// Die Ebene eines Feldes ergibt sich aus seinem Index (siehe hex.js: ebeneVon). KI-Völker und Barbaren betreten das All nie.
import { karte } from '../karte.js';
import { ebeneVon, yVon, idxE, abstand, HOEHE, RAUM_START } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { EINHEIT, GEB } from '../daten/index.js';
import { ankunftsZeile } from '../weltraumkarte.js';
import { STD, EINGESCHIFFT_TEMPO } from '../regeln.js';
import { pruefe } from './spiel.js';

/** Balance-Werte für den Übergang zwischen Erde und All. */
export const RAUMFLUG = {
  dauer: 2 * STD,          // so lange ist eine Einheit nach Start oder Landung beschäftigt
  gold: 300,               // Kosten je Einheit und Flug
  passagiere: 2,           // eine Orbitalfähre nimmt bis zu 2 Landeinheiten mit
  faehreReichweite: 1,     // beim Landen muss die Fähre höchstens so weit entfernt sein
};

const hat = (d, f) => !!d?.faehigkeiten?.includes(f);
export const istRaumschiff = (d) => hat(d, 'raumschiff');
export const istRaumtauglich = (d) => hat(d, 'raumschiff') || hat(d, 'raumtauglich');

export const weltraum = {
  /** Hat das Volk irgendwo einen Raumhafen (oder dessen Ausbaustufe)? */
  hatRaumhafen(vid) { return this.staedteVon(vid).some((s) => this.hatGebaeude(s, 'raumhafen')); },
  /** Städte des Volkes mit Raumhafen auf der Erde (Start- und Landeplätze). */
  raumhaefen(vid) { return this.staedteVon(vid).filter((s) => ebeneVon(s.feld) === 0 && this.hatGebaeude(s, 'raumhafen')); },

  /**
   * Bewegungskosten auf der Weltraum-Ebene. Orbit-Felder ("leer") befahren nur Raumschiffe; raumtaugliche Landeinheiten
   * treiben dort in einer Raumkapsel (wie Einschiffen auf der Erde). Feste Körper betreten nur raumtaugliche Landeinheiten.
   */
  raumKosten(vid, d, von, nach, nurZiel) {
    if (ebeneVon(von) !== ebeneVon(nach)) return Infinity;
    if (!istRaumtauglich(d)) return Infinity;
    const k = karte();
    const g = GELAENDE[k.gelaende[nach]];
    if (istRaumschiff(d)) {
      if (g.leer) return 1;
      const st = this.stadtAuf(nach);
      if (st && (st.volk === vid || this.verbuendet(vid, st.volk))) return 1; // Kolonie als Hafen
      return Infinity;
    }
    if (g.leer) return Math.max(1, (d.tempo || 2) / EINGESCHIFFT_TEMPO);
    if (nurZiel) return 1;
    if (hat(d, 'gelaende_ignorieren')) return 1;
    let c = g.bewegung;
    if (GELAENDE[k.gelaende[von]].leer) c = Math.max(c, 1.5); // Landen dauert
    return c;
  },

  /** Ist die Einheit gerade mitten in einem Start oder einer Landung? */
  imFlug(e) { return !!(e.flug_bis && e.flug_bis > this.t); },

  /**
   * Befehl: Start ins All bzw. Landung auf der Erde.
   * Start: Die Einheit steht in einer eigenen Stadt mit Raumhafen. Raumschiffe fliegen allein; Landeinheiten brauchen eine
   * Orbitalfähre in derselben Stadt, die mitfliegt (bis zu 2 Passagiere; ein Befehl an die Fähre nimmt bis zu 2 Landeinheiten mit).
   * Landung: Die Einheit steht im Erdorbit; Landeinheiten brauchen eine Fähre in der Nähe. Ziel ist eine eigene Stadt mit Raumhafen.
   */
  befehl_ebene_wechseln(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(v.art === 'spieler', 'Nur Spieler-Völker reisen ins All.');
    pruefe(istRaumtauglich(d), `${d.name} ist nicht für das All gebaut.`);
    this.pruefeBereit(e);
    const k = karte();
    const nachOben = ebeneVon(e.feld) === 0;
    let gruppe;
    let zielStadt = null;
    if (nachOben) {
      const st = this.stadtAuf(e.feld);
      pruefe(st && st.volk === v.id && this.hatGebaeude(st, 'raumhafen'), 'Starten geht nur in einer eigenen Stadt mit Raumhafen.');
      gruppe = this.fluggruppe(v, e, (u) => u.feld === e.feld);
      zielStadt = st;
    } else {
      pruefe(GELAENDE[k.gelaende[e.feld]].id === 'erdorbit', 'Landen geht nur vom Erdorbit aus (am linken Rand der Weltraumkarte).');
      const haefen = this.raumhaefen(v.id);
      pruefe(haefen.length, 'Du hast auf der Erde keine Stadt mit Raumhafen zum Landen.');
      zielStadt = (b.stadt && haefen.find((s) => s.id === b.stadt)) || haefen.find((s) => s.hauptstadt) || haefen[0];
      gruppe = this.fluggruppe(v, e, (u) => this.abstandFeld(u.feld, e.feld) <= RAUMFLUG.faehreReichweite && ebeneVon(u.feld) === 1);
    }
    const kosten = { gold: RAUMFLUG.gold * gruppe.length };
    const kb = this.kannBezahlen(v, kosten);
    pruefe(kb.ok, this.fehltText(kosten, kb.fehlt));
    this.aendern(v.id);
    this.bezahle(v, kosten);
    // Zielfeld: im Erdorbit auf Höhe der Startstadt, auf der Erde in der Zielstadt
    const ziel = nachOben ? idxE(1, 1, ankunftsZeile(yVon(zielStadt.feld), HOEHE)) : zielStadt.feld;
    const angekommen = [];
    for (const u of gruppe) {
      const du = EINHEIT[u.typ];
      const f = this.freiesFeld(v.id, du, ziel, 6);
      if (f < 0) continue;
      if (u.route) this.routeBeenden(u, 'Die Handelsroute endet, weil das Schiff die Ebene wechselt.');
      this.hpAbrechnen(u);
      u.feld = f; u.pfad = []; u.modus = 'wach'; u.angriff = null; u.flug_bis = this.t + RAUMFLUG.dauer;
      this.markiere('e' + u.id);
      angekommen.push(u);
    }
    pruefe(angekommen.length, 'Am Ziel ist kein Platz frei.');
    this.positionenNeu();
    for (const u of angekommen) this.erkunde(v.id, u.feld, this.sichtweite(u));
    const namen = angekommen.map((u) => EINHEIT[u.typ].name).join(', ');
    this.meldung(v.id, nachOben ? `Start geglückt: ${namen} ${angekommen.length > 1 ? 'sind' : 'ist'} unterwegs in den Erdorbit.` : `Landeanflug auf ${zielStadt.name}: ${namen}.`, { art: 'einheit', feld: angekommen[0].feld });
    this.zaehle(v.id, 'raumflug');
    return { feld: angekommen[0].feld, ebene: ebeneVon(angekommen[0].feld) };
  },

  /** Wer fliegt mit? Raumschiffe allein; Landeinheiten nur mit einer Fähre (die Fähre nimmt bis zu 2 Landeinheiten mit). */
  fluggruppe(v, e, inReichweite) {
    const d = EINHEIT[e.typ];
    const eigene = this.einheitenVon(v.id).filter((u) => u.id !== e.id && !u.in && inReichweite(u) && !this.imFlug(u) && !u.umruestung);
    const istFaehre = (u) => hat(EINHEIT[u.typ], 'transport') && istRaumschiff(EINHEIT[u.typ]);
    const land = (u) => istRaumtauglich(EINHEIT[u.typ]) && !istRaumschiff(EINHEIT[u.typ]);
    if (istRaumschiff(d)) {
      if (!hat(d, 'transport')) return [e];
      return [e, ...eigene.filter(land).slice(0, RAUMFLUG.passagiere)];
    }
    const faehre = eigene.find(istFaehre);
    pruefe(faehre, 'Landeinheiten brauchen eine Orbitalfähre an derselben Stelle, die sie mitnimmt.');
    const mit = eigene.filter(land).slice(0, RAUMFLUG.passagiere - 1);
    return [e, ...mit, faehre];
  },

  abstandFeld(a, b) { return abstand(a, b); },

  /** Wirft einen Fehler, solange die Einheit startet oder landet. */
  pruefeBereit(e) {
    pruefe(!this.imFlug(e), `Die Einheit ist noch im Flug (fertig in ${Math.ceil((e.flug_bis - this.t) / 60000)} min).`);
  },

  /** Darf hier eine Stadt stehen? Kolonisten nur im All, Siedler nur auf der Erde. */
  ebeneGruendenHindernis(e, i) {
    const d = EINHEIT[e.typ];
    if (ebeneVon(i) === 1 && !hat(d, 'raumtauglich')) return 'Im All gründen nur Kolonisten Städte.';
    if (ebeneVon(i) === 0 && e.typ === 'kolonist') return 'Kolonisten gründen Kolonien auf Mond, Mars und Eismond, nicht auf der Erde.';
    return null;
  },
};

/** Für Tests und Werkzeuge: alle Gebäude, die als Raumhafen zählen. */
export const RAUMHAFEN_GEBAEUDE = Object.keys(GEB).filter((g) => g === 'raumhafen' || g === 'sternenhafen');
export { RAUM_START };
