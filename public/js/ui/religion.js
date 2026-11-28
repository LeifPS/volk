// Religionsfenster: Pantheon wählen, Religion gründen (Name, Gründer- und Anhänger-Satz), verstärken (Verehrung, Reformer),
// Übersicht aller Religionen der Welt mit Anhänger-Städten. Alles per Antippen, handytauglich.
import { el as basisEl, symbol, fenster, toast, fehler, frageJaNein, zahl } from './basis.js';
import { T } from '../texte.js';
import { Z, an, du, eigeneStaedte, serverJetzt } from '../kern/zustand.js';
import { befehl } from '../kern/netz.js';
import { PANTHEONS, PANTHEON, RELIGIONEN, RELIGION, GLAUBENSSAETZE, GLAUBENSSATZ, RELIGION_REGELN as RR } from '../../shared/daten/religion.js';
import { ton } from '../audio.js';

const RT = () => T.religion;
function el(tag, attr, ...kinder) {
  if (attr && (attr instanceof Node || typeof attr === 'string' || Array.isArray(attr))) { kinder.unshift(attr); attr = {}; }
  return basisEl(tag, attr || {}, ...kinder.flat().filter((k) => k != null && k !== false));
}
let cssDa = false;
function css() {
  if (cssDa) return; cssDa = true;
  document.head.append(el('style', { text: `
.rl-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px; }
.rl-karte { border: 2px solid #556; background: #262b3d; padding: 6px; cursor: pointer; min-height: 54px; }
.rl-karte.gewaehlt { border-color: #ffe066; background: #3a3524; }
.rl-karte.vergeben { opacity: 0.4; cursor: default; }
.rl-karte b { display: block; font-size: 12px; }
.rl-religion { border-left: 6px solid; padding: 6px 8px; background: #1d2130; margin-bottom: 6px; }
` }));
}

const glaubeJetzt = () => { const d = du(); return (d?.glaube || 0) + (d?.raten?.glaube || 0) * Math.max(0, serverJetzt() - (d?.stand_um || serverJetzt())) / 3600000; };

let offen = null;
export function oeffneReligion() {
  css();
  if (offen) { offen.zeichne(); return; }
  const z = { wahl: {} };
  const f = fenster(RT().titel, (i) => { z.inhalt = i; }, { breite: 'voll', symbol: symbol('ui', 'religion', { px: 24 }), fuss: true });
  offen = z;
  z.zeichne = () => zeichne(z, f);
  const ab = an('aenderung', () => { if (offen === z && !Object.keys(z.wahl).length) z.zeichne(); });
  f.o.beiSchliessen = () => { offen = null; ab(); };
  z.zeichne();
}

function zeichne(z, f) {
  const d = du(); if (!d) return;
  const rel = Z.ansicht.welt?.religionen || {};
  const vergeben = new Set(Object.values(rel).flatMap((r) => r.saetze));
  const pantheonVergeben = new Set(Object.values(Z.ansicht.welt?.pantheons || {}));
  const eigene = Object.values(rel).find((r) => r.gruender === d.id);
  const teile = [el('div.st-zeile', symbol('ui', 'glaube', { px: 20 }), el('b.gold-t', { text: `${zahl(Math.floor(glaubeJetzt()))} ${RT().glaube}` }), el('span.klein', { text: ` (+${zahl(d.raten?.glaube || 0, 1)} ${RT().proStunde})` }))];
  const karte = (x, o) => el('div.rl-karte' + (o.gewaehlt ? '.gewaehlt' : '') + (o.vergeben ? '.vergeben' : ''), { onclick: o.vergeben ? null : o.onclick, role: 'button' }, el('b', { text: x.name }), el('div.klein', { text: x.text || '' }));
  const fuss = [];
  // 1) Pantheon
  if (!d.pantheon) {
    teile.push(el('h2', RT().pantheonTitel), el('p.klein', { text: RT().pantheonText(RR.pantheonKosten) }),
      el('div.rl-raster', PANTHEONS.map((p) => karte(p, { gewaehlt: z.wahl.pantheon === p.id, vergeben: pantheonVergeben.has(p.id), onclick: () => { z.wahl.pantheon = p.id; z.zeichne(); } }))));
    if (z.wahl.pantheon) fuss.push(el('button.knopf.gold', { onclick: async () => { const r = await befehl({ art: 'pantheon', id: z.wahl.pantheon }); if (!r.ok) return fehler(r.fehler); ton('zeitalter'); toast(RT().pantheonGewaehlt(PANTHEON[z.wahl.pantheon].name), 'erfolg'); z.wahl = {}; z.zeichne(); } }, symbol('ui', 'glaube'), RT().pantheonWaehlen));
  } else teile.push(el('p', el('b', { text: RT().deinPantheon + ': ' }), PANTHEON[d.pantheon].name, el('span.klein', { text: ' – ' + PANTHEON[d.pantheon].text })));
  // 2) Religion gründen
  if (d.pantheon && !eigene) {
    const staedte = eigeneStaedte().filter((s) => s.distrikte?.heiligtum);
    const max = RR.maxReligionen(Object.values(Z.ansicht.voelker).filter((v) => v.art === 'spieler').length);
    teile.push(el('h2', RT().gruendenTitel), el('p.klein', { text: RT().gruendenText(RR.gruendungKosten, Object.keys(rel).length, max) }));
    if (!staedte.length) teile.push(el('p.gold-t', { text: RT().brauchtHeiligtum }));
    else {
      z.wahl.stadt ||= staedte[0].id;
      teile.push(el('div.st-zeile', el('span.klein', { text: RT().heiligeStadt + ': ' }), ...staedte.map((s) => el('button.knopf.klein' + (z.wahl.stadt === s.id ? '.gold' : ''), { onclick: () => { z.wahl.stadt = s.id; z.zeichne(); } }, s.name))));
      teile.push(el('h3', RT().name), el('div.rl-raster', RELIGIONEN.map((r) => el('div.rl-karte' + (z.wahl.religion === r.id ? '.gewaehlt' : '') + (rel[r.id] ? '.vergeben' : ''), { style: { borderLeft: `6px solid ${r.farbe}` }, onclick: rel[r.id] ? null : () => { z.wahl.religion = r.id; z.zeichne(); } }, el('b', { text: r.name })))));
      for (const kat of ['gruender', 'anhaenger']) teile.push(el('h3', RT().kat[kat]), el('div.rl-raster', GLAUBENSSAETZE.filter((g) => g.kategorie === kat).map((g) => karte(g, { gewaehlt: z.wahl[kat] === g.id, vergeben: vergeben.has(g.id), onclick: () => { z.wahl[kat] = g.id; z.zeichne(); } }))));
      if (z.wahl.religion && z.wahl.gruender && z.wahl.anhaenger) fuss.push(el('button.knopf.gold', { onclick: async () => {
        if (!(await frageJaNein(RT().gruendenTitel, RT().gruendenFrage(RELIGION[z.wahl.religion].name, GLAUBENSSATZ[z.wahl.gruender].name, GLAUBENSSATZ[z.wahl.anhaenger].name), RT().gruenden))) return;
        const r = await befehl({ art: 'religion_gruenden', stadt: z.wahl.stadt, religion: z.wahl.religion, gruender: z.wahl.gruender, anhaenger: z.wahl.anhaenger });
        if (!r.ok) return fehler(r.fehler); ton('zeitalter'); toast(RT().gegruendet(RELIGION[z.wahl.religion].name), 'erfolg'); z.wahl = {}; z.zeichne();
      } }, symbol('ui', 'religion'), RT().gruenden));
    }
  }
  // 3) Verstärken
  if (eigene && !eigene.verstaerkt) {
    teile.push(el('h2', RT().verstaerkenTitel), el('p.klein', { text: RT().verstaerkenText(RR.verstaerkenKosten) }));
    for (const kat of ['verehrung', 'reformer']) teile.push(el('h3', RT().kat[kat]), el('div.rl-raster', GLAUBENSSAETZE.filter((g) => g.kategorie === kat).map((g) => karte(g, { gewaehlt: z.wahl[kat] === g.id, vergeben: vergeben.has(g.id), onclick: () => { z.wahl[kat] = g.id; z.zeichne(); } }))));
    if (z.wahl.verehrung && z.wahl.reformer) fuss.push(el('button.knopf.gold', { onclick: async () => { const r = await befehl({ art: 'religion_verstaerken', verehrung: z.wahl.verehrung, reformer: z.wahl.reformer }); if (!r.ok) return fehler(r.fehler); ton('zeitalter'); toast(RT().verstaerkt, 'erfolg'); z.wahl = {}; z.zeichne(); } }, symbol('ui', 'religion'), RT().verstaerken));
  }
  // 4) Religionen der Welt
  teile.push(el('h2', RT().weltTitel));
  const staedte = Object.values(Z.ansicht.staedte);
  const mehrheit = (s) => { let b = null, a = 0; for (const [rid, x] of Object.entries(s.glauben || {})) if (x > a) { a = x; b = rid; } return a >= RR.mehrheit ? b : null; };
  if (!Object.keys(rel).length) teile.push(el('p.klein', { text: RT().keineReligion }));
  for (const r of Object.values(rel)) {
    const def = RELIGION[r.id], gr = Z.ansicht.voelker[r.gruender];
    const anz = staedte.filter((s) => mehrheit(s) === r.id).length;
    teile.push(el('div.rl-religion', { style: { borderColor: def.farbe } },
      el('div.st-zeile', el('b', { text: def.name }), el('span.klein', { text: ` · ${RT().von} ${gr?.name || '?'} · ${RT().anhaengerStaedte(anz)}` })),
      el('div.klein', { text: r.saetze.map((id) => GLAUBENSSATZ[id]).filter(Boolean).map((g) => `${g.name}: ${g.text}`).join(' · ') })));
  }
  teile.push(el('p.klein', { text: RT().hilfe }));
  z.inhalt.replaceChildren(...teile);
  f.fuss.replaceChildren(el('span.klein', { style: { flex: 1 }, text: RT().fussText }), ...fuss);
}
