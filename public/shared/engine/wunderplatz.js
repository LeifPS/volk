// Weltwunder stehen auf einem eigenen Feld im Stadtgebiet (wie in Civ 6). Der Spieler wählt das Feld beim Bauauftrag;
// gültige Felder hängen von der Platzregel des Wunders ab (daten/wunder.js, Feld "platz").
// Im Zustand: Bauauftrag { art: 'wunder', id, feld }, Baustelle auf dem Feld f.wb = Wunder-ID, fertiges Wunder f.wu = Wunder-ID
// und z.wunder[id].feld = Feld. Das Feld bleibt begehbar, trägt aber keine Verbesserung mehr und wird nicht bewirtschaftet.
import { karte } from '../karte.js';
import { nachbarn, ebeneVon } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { WUNDER_NACH_ID } from '../daten/index.js';

export const wunderplatz = {
  /** Grund, warum das Wunder nicht auf Feld i der Stadt s stehen kann (oder null). */
  wunderPlatzHindernis(s, wid, i) {
    const d = WUNDER_NACH_ID[wid]; if (!d) return 'Unbekanntes Wunder.';
    if (!Number.isInteger(i) || !s.gebiet?.includes(i)) return 'Das Feld gehört nicht zum Gebiet dieser Stadt.';
    if (i === s.feld) return 'Nicht auf dem Stadtzentrum.';
    if (ebeneVon(i) !== ebeneVon(s.feld)) return 'Das Feld liegt auf einer anderen Ebene.';
    const f = this.z.felder[i] || {};
    if (f.wu || f.wb) return 'Auf diesem Feld steht schon ein Wunder oder eine Baustelle.';
    if (f.d) return 'Auf diesem Feld steht ein Distrikt.';
    if (this.naturwunderAuf?.(i)) return 'Auf einem Naturwunder kann kein Bauwerk stehen.';
    if (this.einheitenAuf(i).some((e) => e.volk !== s.volk)) return 'Dort steht eine fremde Einheit.';
    for (const b of [...(s.bau || []), ...(s.schlange || [])]) if (b.art === 'wunder' && b.feld === i) return 'Dieses Feld ist schon für ein anderes Wunder vorgemerkt.';
    const g = GELAENDE[karte().gelaende[i]];
    const p = d.platz || { land: true };
    const k = karte();
    if (p.wasser && !g.wasser) return `${d.name} steht ${p.text}.`;
    if (!p.wasser && (g.wasser || g.leer)) return `${d.name} steht ${p.text || 'auf einem Landfeld'}.`;
    if (p.flach && g.hoehe > 1) return `${d.name} steht ${p.text}.`;
    if (p.gelaende && !p.gelaende.includes(g.id)) return `${d.name} steht ${p.text}.`;
    if (p.fluss && !k.fluss[i] && !nachbarn(i).some((n) => GELAENDE[k.gelaende[n]].suesswasser)) return `${d.name} steht ${p.text}.`;
    if (p.kueste && !nachbarn(i).some((n) => GELAENDE[k.gelaende[n]].wasser)) return `${d.name} steht ${p.text}.`;
    if (p.rand && nachbarn(i).every((n) => this.z.felder[n]?.s === s.id)) return `${d.name} steht ${p.text}.`;
    return null;
  },

  /** Alle gültigen Felder für das Wunder in der Stadt (für die Auswahl im Client und für die Migration). */
  wunderPlaetze(s, wid) { return (s.gebiet || []).filter((i) => !this.wunderPlatzHindernis(s, wid, i)); },

  /** Bestes Feld (für alte Aufträge und Altstände): zuerst ohne Verbesserung, dann irgendein gültiges, sonst lockerer. */
  wunderPlatzAutomatisch(s, wid) {
    const gueltig = this.wunderPlaetze(s, wid);
    const ohne = gueltig.filter((i) => !this.z.felder[i]?.v);
    if (ohne.length) return ohne[0];
    if (gueltig.length) return gueltig[0];
    // Notlösung für Altstände: irgendein Feld des Gebiets ohne Wunder/Baustelle (die Platzregel gilt dann nicht)
    const locker = (s.gebiet || []).find((i) => i !== s.feld && !this.z.felder[i]?.wu && !this.z.felder[i]?.wb && !this.naturwunderAuf?.(i) && ebeneVon(i) === ebeneVon(s.feld) && !GELAENDE[karte().gelaende[i]].wasser);
    return locker ?? null;
  },

  /** Baustelle setzen (beim Start des Auftrags): Die Verbesserung auf dem Feld weicht. */
  wunderBaustelle(s, b) {
    if (b.feld == null) return;
    const f = this.z.felder[b.feld] || {};
    if (f.v) this.meldung(s.volk, `${s.name}: Für ${WUNDER_NACH_ID[b.id]?.name} wurde die Verbesserung auf dem Bauplatz abgerissen.`, { feld: b.feld });
    this.setzeFeld(b.feld, { wb: b.id, v: null, pl: null });
    if (s.arbeit?.includes(b.feld)) { s.arbeit = s.arbeit.filter((x) => x !== b.feld); this.markiere('s' + s.id); }
  },
  /** Baustelle räumen (Abbruch oder verlorenes Rennen). */
  wunderBaustelleWeg(b) { if (b.feld != null && this.z.felder[b.feld]?.wb === b.id) this.setzeFeld(b.feld, { wb: null }); },
  /** Fertiges Wunder auf sein Feld setzen. */
  wunderAufFeld(wid, feld) {
    if (feld == null) return;
    this.setzeFeld(feld, { wb: null, wu: wid, v: null });
    if (this.z.wunder[wid]) { this.z.wunder[wid].feld = feld; this.markiere('w' + wid); }
  },
};
