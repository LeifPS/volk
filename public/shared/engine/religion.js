// Religion: Glaube, Pantheon, Gründung und Verstärkung, Missionare und Apostel, religiöser Druck. Daten: daten/religion.js.
// Zustand:
//   v.glaube (Vorrat), v.pantheon (ID)
//   z.global.religionen[rid] = { id, gruender, heilige_stadt, saetze: [ids], gegruendet, verstaerkt }
//   s.glauben = { rid: Anteil 0..1 } (Summe <= 1, der Rest folgt keiner Religion)
//   Einheiten mit `missionieren`: e.religion (wird beim Ausbilden gesetzt), e.ladungen
//   z.global.religion_um: nächster Druck-Schritt
import { abstand } from '../hex.js';
import { EINHEIT } from '../daten/index.js';
import { PANTHEON, RELIGION, RELIGIONEN, GLAUBENSSATZ, RELIGION_REGELN as RR } from '../daten/religion.js';
import { STD } from '../regeln.js';
import { pruefe } from './spiel.js';

const hat = (d, f) => !!d?.faehigkeiten?.includes(f);

export const religion = {
  religionen() { return (this.z.global.religionen ||= {}); },
  /** Mehrheitsreligion einer Stadt (oder null). */
  mehrheit(s) {
    let best = null, ba = 0;
    for (const [rid, a] of Object.entries(s.glauben || {})) if (a > ba) { ba = a; best = rid; }
    return ba >= RR.mehrheit ? best : null;
  },
  /** Religion, die das Volk gegründet hat (oder null). */
  eigeneReligion(vid) { return Object.values(this.religionen()).find((r) => r.gruender === vid) || null; },
  /** Anzahl Städte (aller Völker) mit dieser Mehrheitsreligion. */
  anhaengerStaedte(rid) { return this.alleStaedte().filter((s) => this.mehrheit(s) === rid).length; },

  /** Reichsweite Boni aus Pantheon, Gründer- und Reformer-Sätzen (wird in boni() aufgerufen). */
  religionBoni(v, b) {
    const add = (wk, f = 1) => { for (const [k, x] of Object.entries(wk || {})) b[k] = (b[k] || 0) + x * f; };
    if (v.pantheon) add(PANTHEON[v.pantheon]?.reich);
    const r = this.eigeneReligion(v.id);
    if (!r) return;
    const n = this.anhaengerStaedte(r.id);
    for (const sid of r.saetze) {
      const g = GLAUBENSSATZ[sid]; if (!g) continue;
      if (g.reich) add(g.reich);
      if (g.je_stadt) add(g.je_stadt, Math.min(n, g.max || n));
    }
  },
  /** Stadt-Wirkungen der Mehrheitsreligion (Anhänger- und Verehrungs-Sätze) wie Gebäudewirkungen. */
  religionStadtWirkungen(s) {
    const rid = this.mehrheit(s); if (!rid) return [];
    const r = this.religionen()[rid]; if (!r) return [];
    return r.saetze.map((id) => GLAUBENSSATZ[id]?.stadt).filter(Boolean);
  },

  /** Befehl: Pantheon wählen (einmal, jedes Pantheon nur einmal in der Welt). */
  befehl_pantheon(v, b) {
    const p = PANTHEON[b.id];
    pruefe(p, 'Unbekanntes Pantheon.');
    pruefe(!v.pantheon, 'Dein Volk hat schon ein Pantheon.');
    pruefe(!this.alleVoelker().some((x) => x.pantheon === b.id), `"${p.name}" verehrt schon ein anderes Volk.`);
    this.aendern(v.id);
    pruefe((v.glaube || 0) >= RR.pantheonKosten, `Ein Pantheon kostet ${RR.pantheonKosten} Glaube (du hast ${Math.floor(v.glaube || 0)}). Glaube kommt aus Heiligtümern.`);
    v.glaube -= RR.pantheonKosten;
    v.pantheon = b.id;
    this.meldung(v.id, `Dein Volk verehrt nun ${p.name}: ${p.text}.`, { art: 'religion', wichtig: true });
    for (const a of this.alleVoelker()) if (a.id !== v.id && a.art === 'spieler') this.meldung(a.id, `${v.name} verehrt nun ${p.name}.`, { art: 'religion' });
    delete this._raten[v.id];
    this.markiere('v' + v.id);
  },

  /** Befehl: Religion gründen in einer Stadt mit Heiligtum (Gründer- und Anhänger-Satz wählen). */
  befehl_religion_gruenden(v, b) {
    pruefe(v.art === 'spieler' || v.art === 'ki', 'Nur Völker gründen Religionen.');
    pruefe(v.pantheon, 'Wähle zuerst ein Pantheon.');
    pruefe(!this.eigeneReligion(v.id), 'Dein Volk hat schon eine Religion gegründet.');
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    pruefe(this.hatDistrikt(s, 'heiligtum'), 'Eine Religion entsteht in einer Stadt mit Heiligtum.');
    const rel = this.religionen();
    const spieler = this.alleVoelker().filter((x) => x.art === 'spieler').length;
    pruefe(Object.keys(rel).length < RR.maxReligionen(spieler), 'In dieser Welt gibt es schon so viele Religionen, wie Platz haben.');
    pruefe(RELIGION[b.religion] && !rel[b.religion], 'Diese Religion gibt es schon oder sie ist unbekannt.');
    const vergeben = new Set(Object.values(rel).flatMap((r) => r.saetze));
    const g1 = GLAUBENSSATZ[b.gruender], g2 = GLAUBENSSATZ[b.anhaenger];
    pruefe(g1?.kategorie === 'gruender' && g2?.kategorie === 'anhaenger', 'Wähle einen Gründer- und einen Anhänger-Glaubenssatz.');
    pruefe(!vergeben.has(g1.id) && !vergeben.has(g2.id), 'Dieser Glaubenssatz gehört schon einer anderen Religion.');
    this.aendern(v.id);
    pruefe((v.glaube || 0) >= RR.gruendungKosten, `Eine Religion zu gründen kostet ${RR.gruendungKosten} Glaube (du hast ${Math.floor(v.glaube || 0)}).`);
    v.glaube -= RR.gruendungKosten;
    rel[b.religion] = { id: b.religion, gruender: v.id, heilige_stadt: s.id, saetze: [g1.id, g2.id], gegruendet: this.t, verstaerkt: false };
    s.glauben = { [b.religion]: 1 };
    this.religionTakt();
    this.markiere('g'); this.markiere('s' + s.id); this.markiere('v' + v.id);
    this.meldung(v.id, `${RELIGION[b.religion].name} ist gegründet! Heilige Stadt ist ${s.name}. Missionare und Apostel verbreiten den Glauben.`, { art: 'religion', wichtig: true, feld: s.feld });
    for (const a of this.alleVoelker()) if (a.id !== v.id && a.art === 'spieler') this.meldung(a.id, `${v.name} hat die Religion "${RELIGION[b.religion].name}" gegründet.`, { art: 'religion' });
    for (const a of this.alleVoelker()) delete this._raten[a.id];
    return { religion: b.religion };
  },

  /** Befehl: Religion verstärken (Verehrungs- und Reformer-Satz). */
  befehl_religion_verstaerken(v, b) {
    const r = this.eigeneReligion(v.id);
    pruefe(r, 'Dein Volk hat keine eigene Religion.');
    pruefe(!r.verstaerkt, 'Deine Religion ist schon verstärkt.');
    const vergeben = new Set(Object.values(this.religionen()).flatMap((x) => x.saetze));
    const g1 = GLAUBENSSATZ[b.verehrung], g2 = GLAUBENSSATZ[b.reformer];
    pruefe(g1?.kategorie === 'verehrung' && g2?.kategorie === 'reformer', 'Wähle einen Verehrungs- und einen Reformer-Glaubenssatz.');
    pruefe(!vergeben.has(g1.id) && !vergeben.has(g2.id), 'Dieser Glaubenssatz gehört schon einer anderen Religion.');
    this.aendern(v.id);
    pruefe((v.glaube || 0) >= RR.verstaerkenKosten, `Verstärken kostet ${RR.verstaerkenKosten} Glaube.`);
    v.glaube -= RR.verstaerkenKosten;
    r.saetze.push(g1.id, g2.id); r.verstaerkt = true;
    this.markiere('g'); this.markiere('v' + v.id);
    for (const a of this.alleVoelker()) delete this._raten[a.id];
    this.meldung(v.id, `${RELIGION[r.id].name} ist verstärkt: ${g1.name} und ${g2.name}.`, { art: 'religion', wichtig: true });
  },

  /** Religiöse Einheit bekommt beim Ausbilden die Mehrheitsreligion ihrer Stadt (sonst die eigene) und ihre Ladungen. */
  religionFuerEinheit(e, s) {
    const d = EINHEIT[e.typ];
    if (!hat(d, 'missionieren')) return;
    e.religion = (s && this.mehrheit(s)) || this.eigeneReligion(e.volk)?.id || null;
    e.ladungen = d.ladungen || 3;
  },

  /** Befehl: in einer Stadt (auf ihr oder daneben) missionieren. */
  befehl_missionieren(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(hat(d, 'missionieren') && e.religion, 'Diese Einheit trägt keine Religion.');
    const s = this.alleStaedte().find((x) => abstand(x.feld, e.feld) <= 1);
    pruefe(s, 'Missionieren geht nur in einer Stadt oder direkt daneben.');
    pruefe((e.ladungen || 0) > 0, 'Die Einheit hat keine Ladung mehr.');
    const w = hat(d, 'glaubenskampf') ? RR.apostelWirkung : RR.missionarWirkung;
    this.glaubenVerschieben(s, e.religion, w);
    e.ladungen--;
    this.markiere('e' + e.id);
    const name = RELIGION[e.religion].name;
    this.meldung(v.id, `${s.name}: ${name} gewinnt Anhänger (jetzt ${Math.round((s.glauben[e.religion] || 0) * 100)} %).`, { art: 'religion', feld: s.feld });
    if (s.volk !== v.id) this.meldung(s.volk, `Missionare von ${v.name} predigen in ${s.name}.`, { art: 'religion', feld: s.feld });
    if (e.ladungen <= 0) this.einheitEntfernen(e.id);
    return { anteil: s.glauben[e.religion] };
  },
  /** Anteil einer Religion in der Stadt um w erhöhen; die übrigen schrumpfen anteilig. */
  glaubenVerschieben(s, rid, w) {
    const g = (s.glauben ||= {});
    const neu = Math.min(1, (g[rid] || 0) + w);
    const rest = Object.entries(g).filter(([k]) => k !== rid);
    const summeRest = rest.reduce((a, [, x]) => a + x, 0);
    const platz = 1 - neu;
    for (const [k, x] of rest) g[k] = summeRest > platz && summeRest > 0 ? x * platz / summeRest : x;
    g[rid] = neu;
    for (const k of Object.keys(g)) if (g[k] < 0.005) delete g[k];
    this.markiere('s' + s.id);
    delete this._raten[s.volk];
  },

  /** Befehl: Glaubenskampf eines Apostels gegen eine benachbarte religiöse Einheit fremder Religion. */
  befehl_glaubenskampf(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(hat(EINHEIT[e.typ], 'glaubenskampf'), 'Nur Apostel führen Glaubenskämpfe.');
    const ziel = this.z.einheiten[b.ziel];
    pruefe(ziel && abstand(ziel.feld, e.feld) <= 1 && hat(EINHEIT[ziel.typ], 'missionieren') && ziel.religion && ziel.religion !== e.religion, 'Dort steht keine religiöse Einheit eines anderen Glaubens.');
    const staerke = (x) => (EINHEIT[x.typ].glaubensstaerke || 50) * (0.85 + 0.3 * this.zufall()) * (x.hp / 100);
    const sieg = staerke(e) >= staerke(ziel);
    const verlierer = sieg ? ziel : e, gewinner = sieg ? e : ziel;
    // Städte in der Nähe verlieren etwas vom Glauben des Verlierers
    for (const s of this.alleStaedte()) if (abstand(s.feld, verlierer.feld) <= 6 && s.glauben?.[verlierer.religion]) this.glaubenVerschieben(s, gewinner.religion, 0.08);
    this.meldung(v.id, sieg ? 'Glaubenskampf gewonnen!' : 'Glaubenskampf verloren.', { art: 'religion', feld: e.feld });
    if (ziel.volk !== v.id) this.meldung(ziel.volk, sieg ? 'Ein Glaubenskampf ging verloren.' : 'Ein fremder Apostel wurde im Glaubenskampf besiegt.', { art: 'religion', feld: ziel.feld });
    this.einheitEntfernen(verlierer.id);
    return { sieg };
  },

  /** Befehl: Inquisition in einer eigenen Stadt: andere Religionen verschwinden dort. */
  befehl_inquisition(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(hat(EINHEIT[e.typ], 'inquisition') && e.religion, 'Nur Apostel können eine Inquisition leiten.');
    const s = this.stadtAuf(e.feld);
    pruefe(s && s.volk === v.id, 'Die Inquisition geht nur in einer eigenen Stadt.');
    pruefe((e.ladungen || 0) > 0, 'Die Einheit hat keine Ladung mehr.');
    const eigen = s.glauben?.[e.religion] || 0;
    s.glauben = eigen ? { [e.religion]: eigen } : {};
    e.ladungen--;
    this.markiere('s' + s.id); this.markiere('e' + e.id);
    delete this._raten[v.id];
    if (e.ladungen <= 0) this.einheitEntfernen(e.id);
    this.meldung(v.id, `${s.name}: Fremde Lehren sind vertrieben.`, { art: 'religion', feld: s.feld });
  },

  /** Ein Druck-Schritt: Jede Stadt nähert ihre Anteile dem Druck der Umgebung an (heilige Städte und Mehrheitsstädte). */
  religionTakt() {
    const rel = this.religionen();
    const g = this.z.global;
    g.religion_um = this.t + RR.druckTaktStd * STD;
    if (!Object.keys(rel).length) return;
    const staedte = this.alleStaedte();
    const mehrheiten = new Map(staedte.map((s) => [s.id, this.mehrheit(s)]));
    const heilig = new Map(Object.values(rel).map((r) => [r.heilige_stadt, r.id]));
    for (const s of staedte) {
      const druck = {};
      for (const o of staedte) {
        const d = abstand(o.feld, s.feld);
        if (d > RR.druckReichweite) continue;
        const h = heilig.get(o.id);
        if (h) druck[h] = (druck[h] || 0) + RR.heiligeStadtDruck * (1 - d / (RR.druckReichweite + 1));
        const m = mehrheiten.get(o.id);
        if (m) druck[m] = (druck[m] || 0) + (o.id === s.id ? RR.eigenerDruck : RR.mehrheitDruck * (1 - d / (RR.druckReichweite + 1)));
      }
      const summe = Object.values(druck).reduce((a, x) => a + x, 0);
      if (!summe) continue;
      // Zielanteile: Druck relativ, gedeckelt (ohne Druck bleibt ein Teil ohne Religion)
      const ziel = {}; for (const [rid, x] of Object.entries(druck)) ziel[rid] = (x / summe) * Math.min(1, summe / 2);
      const alt = s.glauben || {};
      const neu = {};
      for (const rid of new Set([...Object.keys(alt), ...Object.keys(ziel)])) {
        const a = alt[rid] || 0, z = ziel[rid] || 0;
        const x = a + Math.max(-RR.druckSchritt, Math.min(RR.druckSchritt, z - a));
        if (x >= 0.005) neu[rid] = Math.round(x * 1000) / 1000;
      }
      const sum = Object.values(neu).reduce((a, x) => a + x, 0);
      if (sum > 1) for (const k of Object.keys(neu)) neu[k] = Math.round(neu[k] / sum * 1000) / 1000;
      if (JSON.stringify(neu) !== JSON.stringify(alt)) {
        const vorher = this.mehrheit(s);
        s.glauben = neu; this.markiere('s' + s.id);
        const nachher = this.mehrheit(s);
        if (vorher !== nachher) {
          for (const a of this.alleVoelker()) delete this._raten[a.id];
          if (nachher) this.meldung(s.volk, `${s.name} folgt jetzt mehrheitlich ${RELIGION[nachher].name}.`, { art: 'religion', feld: s.feld });
        }
      }
    }
    this.markiere('g');
  },

  /** KI: Pantheon und Religion, sobald Glaube reicht (einfacher Plan). */
  kiReligion(v) {
    if (!v.pantheon && (v.glaube || 0) >= RR.pantheonKosten) {
      const frei = Object.keys(PANTHEON).filter((id) => !this.alleVoelker().some((x) => x.pantheon === id));
      if (frei.length) try { this.befehl_pantheon(v, { id: frei[Math.floor(this.zufall() * frei.length)] }); } catch { /* egal */ }
    }
    if (v.pantheon && !this.eigeneReligion(v.id) && (v.glaube || 0) >= RR.gruendungKosten) {
      const s = this.staedteVon(v.id).find((x) => this.hatDistrikt(x, 'heiligtum'));
      const rel = this.religionen(), vergeben = new Set(Object.values(rel).flatMap((r) => r.saetze));
      const rid = RELIGIONEN.find((r) => !rel[r.id])?.id;
      const g1 = Object.values(GLAUBENSSATZ).find((g) => g.kategorie === 'gruender' && !vergeben.has(g.id));
      const g2 = Object.values(GLAUBENSSATZ).find((g) => g.kategorie === 'anhaenger' && !vergeben.has(g.id));
      if (s && rid && g1 && g2) try { this.befehl_religion_gruenden(v, { stadt: s.id, religion: rid, gruender: g1.id, anhaenger: g2.id }); } catch { /* kein Platz */ }
    }
  },
};
