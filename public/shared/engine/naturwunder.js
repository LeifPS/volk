// Naturwunder: einmal je Welt platziert und im Spielzustand gespeichert (z.global.naturwunder), damit die Erdkarte
// bitgleich bleibt und die Platzierung in einer laufenden Welt Rücksicht auf Städte, Einheiten und Verbesserungen nehmen kann.
// Die Platzierung ist deterministisch: gleiche Welt (Karte + Zustand) ergibt dieselben Orte.
import { karte } from '../karte.js';
import { ANZAHL, abstand, nachbarn } from '../hex.js';
import { hash01 } from '../zufall.js';
import { GELAENDE } from '../daten/gelaende.js';
import { NATURWUNDER, NATURWUNDER_NACH_ID, NATURWUNDER_REGELN as R } from '../daten/naturwunder.js';

/** Wissen aus einem Entdeckungsbonus: so viele Punkte entsprechen einer ganzen laufenden Forschung. */
const WISSEN_JE_FORSCHUNG = 400;

export const naturwunder = {
  /** Feld -> Eintrag aus z.global.naturwunder (gecacht). */
  nwKarte() {
    if (this._nw && this._nwQuelle === this.z.global.naturwunder) return this._nw;
    const m = new Map();
    for (const nw of this.z.global.naturwunder || []) for (const i of nw.felder) m.set(i, nw);
    this._nw = m; this._nwQuelle = this.z.global.naturwunder;
    return m;
  },
  /** Naturwunder auf Feld i (Eintrag mit id, felder, entdeckt_von) oder undefined. */
  naturwunderAuf(i) { return this.nwKarte().get(i); },

  /**
   * Platziert alle Naturwunder, die es in dieser Welt noch nicht gibt. Nie auf oder nahe Städten und Barbarenlagern,
   * nie auf Feldern mit Besitzer, Verbesserung, Weg oder Einheit. Liefert die Zahl neu platzierter Naturwunder.
   */
  naturwunderPlatzieren() {
    const g = this.z.global;
    const liste = (g.naturwunder ||= []);
    const k = karte();
    const staedte = this.alleStaedte().map((s) => s.feld);
    const lager = Object.values(this.z.lager || {}).map((l) => l.feld);
    const besetzt = new Set(this.alleEinheiten().map((e) => e.feld));
    const vergeben = new Set(liste.flatMap((n) => n.felder));
    const frei = (i) => {
      if (i < 0 || i >= ANZAHL || vergeben.has(i) || besetzt.has(i)) return false;
      if (this.z.felder[i]) return false; // Besitz, Verbesserung, Weg, Fallout ...
      return true;
    };
    const nahe = (i, felder, d) => felder.some((f) => abstand(f, i) < d);
    let neu = 0;
    NATURWUNDER.forEach((def, nr) => {
      if (liste.some((n) => n.id === def.id)) return;
      const erlaubt = new Set(def.gelaende);
      const passt = (i) => frei(i) && erlaubt.has(GELAENDE[k.gelaende[i]].id) && !nahe(i, staedte, R.abstandStadt) && !nahe(i, lager, R.abstandLager);
      // Kandidaten in fester, pseudozufälliger Reihenfolge
      const kand = [];
      for (let i = 0; i < ANZAHL; i++) if (erlaubt.has(GELAENDE[k.gelaende[i]].id)) kand.push(i);
      kand.sort((a, b) => hash01(a, 700 + nr) - hash01(b, 700 + nr) || a - b);
      for (const anker of kand) {
        if (!passt(anker)) continue;
        if (liste.some((n) => n.felder.some((f) => abstand(f, anker) < R.abstandUntereinander))) continue;
        // zusammenhängende Form wachsen lassen
        const felder = [anker];
        while (felder.length < def.felder) {
          const rand = [];
          for (const f of felder) for (const n of nachbarn(f)) if (!felder.includes(n) && !rand.includes(n) && passt(n)) rand.push(n);
          if (!rand.length) break;
          rand.sort((a, b) => hash01(a, 760 + nr) - hash01(b, 760 + nr) || a - b);
          felder.push(rand[0]);
        }
        if (felder.length < def.felder) continue;
        if (def.fluss && !felder.some((f) => k.fluss[f])) continue;
        if (def.wasser_nachbar && !felder.some((f) => nachbarn(f).some((n) => GELAENDE[k.gelaende[n]].wasser))) continue;
        liste.push({ id: def.id, felder: felder.sort((a, b) => a - b), entdeckt_von: null });
        for (const f of felder) vergeben.add(f);
        neu++;
        break;
      }
    });
    if (neu) { this._nw = null; this.markiere('g'); }
    return neu;
  },

  /**
   * Prüft frisch erkundete Felder auf Naturwunder: Wer eines als Erster sieht, bekommt einmalig Kultur und Wissen.
   * Alle anderen Spieler erfahren, dass es entdeckt wurde.
   */
  naturwunderEntdecken(vid, felder) {
    const v = this.z.voelker[vid];
    if (!v || (v.art !== 'spieler' && v.art !== 'ki')) return;
    const karteNw = this.nwKarte();
    if (!karteNw.size) return;
    for (const i of felder) {
      const nw = karteNw.get(i);
      if (!nw || nw.entdeckt_von != null) continue;
      nw.entdeckt_von = vid;
      this.markiere('g');
      const def = NATURWUNDER_NACH_ID[nw.id];
      if (!def) continue;
      this.aendern(vid);
      const b = def.entdeckung || {};
      // Kultur: in die Hauptstadt (Grenzen) und ins Reich
      const haupt = this.staedteVon(vid).find((s) => s.hauptstadt) || this.staedteVon(vid)[0];
      if (b.kultur && haupt) { haupt.kultur = (haupt.kultur || 0) + b.kultur; this.markiere('s' + haupt.id); }
      if (b.kultur) v.kultur_gesamt = (v.kultur_gesamt || 0) + b.kultur;
      // Wissen: Fortschritt der laufenden Forschung
      if (b.wissen && v.forschung?.aktiv) v.forschung.fortschritt = Math.min(0.99, (v.forschung.fortschritt || 0) + b.wissen / WISSEN_JE_FORSCHUNG);
      const teile = [b.kultur ? `+${b.kultur} Kultur` : '', b.wissen ? `+${Math.round(b.wissen / WISSEN_JE_FORSCHUNG * 100)} % Forschung` : ''].filter(Boolean).join(', ');
      this.meldung(vid, `Naturwunder entdeckt: ${def.name}! Als erstes Volk erhältst du ${teile}.`, { art: 'wunder', feld: i, wichtig: true });
      for (const a of this.alleVoelker()) if (a.id !== vid && a.art === 'spieler') this.meldung(a.id, `${v.name} hat das Naturwunder "${def.name}" entdeckt.`, { art: 'wunder' });
    }
  },
};
