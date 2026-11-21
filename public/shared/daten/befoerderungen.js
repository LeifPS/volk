// Beförderungen nach dem Vorbild von Civilization 6.
// Jede Einheit gehört zu einem Beförderungsbaum (Beförderungsklasse). Der Baum hat 4 Stufen (I bis IV).
// Stufe I hat keine Voraussetzung, jede höhere Stufe braucht EINE der genannten Beförderungen aus der Stufe darunter
// (voraussetzung = Liste "eine davon"). Eine Einheit kann höchstens 5 Beförderungen haben, also nicht den ganzen Baum.
// Erfahrung und Stufen: siehe regeln.js (15 EP × Stufe). Wirkungen: siehe DATENFORMAT.md.

export const BAEUME = [
  { id: 'aufklaerer', name: 'Aufklärer', beschreibung: 'Späher und Kundschafter: Gelände, Sicht und Hinterhalte.' },
  { id: 'nahkampf', name: 'Nahkampf', beschreibung: 'Schwertkämpfer, Legionäre, Infanterie und Fallschirmjäger.' },
  { id: 'fernkampf', name: 'Fernkampf', beschreibung: 'Bogenschützen, Armbrustschützen und Schützen mit Feuerwaffen.' },
  { id: 'panzerabwehr', name: 'Reiterabwehr', beschreibung: 'Speerträger, Pikeniere und Panzerabwehrtrupps.' },
  { id: 'leichte_reiter', name: 'Leichte Reiter', beschreibung: 'Streitwagen, Reiter, Kavallerie, leichte Panzer und Hubschrauber.' },
  { id: 'schwere_reiter', name: 'Schwere Reiter', beschreibung: 'Elefanten, Ritter, Kürassiere und Panzer.' },
  { id: 'belagerung', name: 'Belagerung', beschreibung: 'Rammböcke, Katapulte, Kanonen und Artillerie.' },
  { id: 'see_nah', name: 'Seenahkampf', beschreibung: 'Galeeren, Koggen, Zerstörer und Panzerschiffe.' },
  { id: 'see_fern', name: 'Seefernkampf', beschreibung: 'Fregatten, Linienschiffe, Kreuzer und Schlachtschiffe.' },
  { id: 'seeraeuber', name: 'See-Räuber', beschreibung: 'U-Boote: Jagd auf Schiffe und Beute.' },
  { id: 'traeger', name: 'Flugzeugträger', beschreibung: 'Träger mit mehr Platz, Sicht und Schutz.' },
  { id: 'jaeger', name: 'Jäger', beschreibung: 'Jagdflugzeuge: Luftkampf und Tiefflug.' },
  { id: 'bomber', name: 'Bomber', beschreibung: 'Bomber: gegen Schiffe und Bodentruppen.' },
];
export const BAUM = Object.fromEntries(BAEUME.map((b) => [b.id, b]));

const SCHWERE = new Set(['kriegselefant', 'ritter', 'kuerassier', 'panzer', 'schwerer_panzer', 'moderner_kampfpanzer']);
/** Zu welchem Beförderungsbaum gehört diese Einheit? null = Einheit kann nicht befördert werden (Zivil, Sanitäter, Flak, Raketen ...). */
export function baumVon(d) {
  if (!d) return null;
  switch (d.klasse) {
    case 'spaeher': return 'aufklaerer';
    case 'nahkampf': return (d.boni || []).some((b) => b.gegen === 'reiter') ? 'panzerabwehr' : 'nahkampf';
    case 'fernkampf': return 'fernkampf';
    case 'reiter': return SCHWERE.has(d.id) ? 'schwere_reiter' : 'leichte_reiter';
    case 'belagerung': return 'belagerung';
    case 'see_nah': return 'see_nah';
    case 'see_fern': return 'see_fern';
    case 'u_boot': return 'seeraeuber';
    case 'traeger': return 'traeger';
    case 'jaeger': return 'jaeger';
    case 'bomber': return 'bomber';
    default: return null;
  }
}

// Kurzschreibweisen für Kampfbedingungen: { w: Stärke, rolle: 'angriff'|'verteidigung', art: 'nah'|'fern'|'luft',
//   gegen: Klasse/Bereich/Baum oder Liste, ort: ['stadt','befestigung'], gelaende: [..], ziel: 'befestigt'|'verwundet'|'in_stadt' }
const m = (w, o = {}) => ({ w, ...o });
const ANG = { rolle: 'angriff' }, VER = { rolle: 'verteidigung' };
const WALD = ['wald', 'dschungel', 'huegel', 'sumpf'];

// [stufe, id, name, beschreibung, voraussetzung (Liste "eine davon"), wirkung]
const BAUM_DATEN = {
  aufklaerer: [
    [1, 'waldlaeufer', 'Waldläufer', 'Wald und Dschungel kosten nur 1 Bewegungspunkt.', [], { gelaende_leicht: ['wald', 'dschungel'] }],
    [1, 'alpinist', 'Alpinist', 'Hügel kosten nur 1 Bewegungspunkt.', [], { gelaende_leicht: ['huegel'] }],
    [2, 'wachposten', 'Wachposten', '+1 Sicht in Wald und Dschungel.', ['waldlaeufer', 'alpinist'], { sicht_gelaende: { wald: 1, dschungel: 1 } }],
    [2, 'guerilla', 'Guerilla', 'Nach einem Angriff 30 % kürzere Pause.', ['waldlaeufer', 'alpinist'], { abklingzeit_prozent: -30 }],
    [3, 'fernglas', 'Fernglas', '+1 Sicht.', ['wachposten'], { sicht: 1 }],
    [3, 'hinterhalt', 'Hinterhalt', '+20 Stärke in jeder Lage.', ['guerilla'], { mods: [m(20)] }],
    [4, 'tarnung', 'Tarnung', 'Nur Gegner auf einem Nachbarfeld können die Einheit sehen.', ['fernglas', 'hinterhalt'], { tarnung: 1 }],
  ],
  nahkampf: [
    [1, 'schlachtruf', 'Schlachtruf', '+7 Stärke gegen Nah- und Fernkämpfer.', [], { mods: [m(7, { gegen: ['nahkampf', 'fernkampf'] })] }],
    [1, 'schildkroete', 'Schildkröte', '+10 Stärke beim Verteidigen gegen Fernangriffe.', [], { mods: [m(10, { ...VER, art: 'fern' })] }],
    [2, 'kommando', 'Kommando', '+1 Tempo.', ['schlachtruf', 'amphibisch'], { tempo: 1 }],
    [2, 'amphibisch', 'Amphibisch', 'Kein Abzug mehr beim Angriff aus einem Flussfeld.', ['schildkroete', 'kommando'], { kein_flussmalus: 1 }],
    [3, 'zweihaender', 'Zweihänder', '+7 Stärke gegen Reiterabwehr-Einheiten.', ['kommando', 'amphibisch'], { mods: [m(7, { gegen: 'panzerabwehr' })] }],
    [3, 'haeuserkampf', 'Häuserkampf', '+10 Stärke in Städten.', ['kommando', 'amphibisch'], { mods: [m(10, { ort: ['stadt'] })] }],
    [4, 'elitegarde', 'Elitegarde', 'Greift doppelt so oft an: 50 % kürzere Pause nach einem Angriff.', ['zweihaender', 'haeuserkampf'], { abklingzeit_prozent: -50 }],
  ],
  fernkampf: [
    [1, 'salve', 'Salve', '+5 Fernkampfstärke gegen Landeinheiten.', [], { mods: [m(5, { ...ANG, art: 'fern', gegen: 'land' })] }],
    [1, 'besatzung', 'Besatzung', '+10 Stärke in Städten und auf Befestigungen.', [], { mods: [m(10, { ort: ['stadt', 'befestigung'] })] }],
    [2, 'pfeilhagel', 'Pfeilhagel', '+7 Fernkampfstärke gegen Land- und Seeeinheiten.', ['salve'], { mods: [m(7, { ...ANG, art: 'fern', gegen: ['land', 'see'] })] }],
    [2, 'brandpfeile', 'Brandpfeile', '+7 Stärke gegen Städte.', ['besatzung'], { mods: [m(7, { gegen: 'stadt' })] }],
    [3, 'niederhalten', 'Niederhalten', 'Nahkämpfer, die diese Einheit angreifen, verlieren 5 Stärke.', ['pfeilhagel', 'brandpfeile'], { mods: [m(5, { ...VER, art: 'nah' })] }],
    [3, 'stellung', 'Stellung', '+10 Stärke beim Verteidigen gegen Stadtbeschuss.', ['pfeilhagel', 'brandpfeile'], { mods: [m(10, { ...VER, gegen: 'stadt' })] }],
    [4, 'meisterschuetze', 'Meisterschütze', 'Schießt doppelt so oft: 50 % kürzere Pause nach einem Angriff.', ['niederhalten', 'stellung'], { abklingzeit_prozent: -50 }],
  ],
  panzerabwehr: [
    [1, 'staffel', 'Staffel', '+5 Stärke gegen Reiter.', [], { mods: [m(5, { gegen: 'reiter' })] }],
    [1, 'stoss', 'Stoß', '+5 Stärke gegen Nahkämpfer.', [], { mods: [m(5, { gegen: 'nahkampf' })] }],
    [2, 'karree', 'Karree', 'Der Unterstützungsbonus durch Nachbarn zählt doppelt.', ['staffel'], { unterstuetzung_faktor: 2 }],
    [2, 'schiltron', 'Schiltron', '+10 Stärke beim Verteidigen gegen Nahangriffe.', ['stoss'], { mods: [m(10, { ...VER, art: 'nah' })] }],
    [3, 'umgruppieren', 'Umgruppieren', '+1 Tempo.', ['karree', 'schiltron'], { tempo: 1 }],
    [3, 'engpaesse', 'Engpässe', '+7 Stärke beim Verteidigen in Wald, Dschungel, Hügeln und Sumpf.', ['karree', 'schiltron'], { mods: [m(7, { ...VER, gelaende: WALD })] }],
    [4, 'haltet_die_linie', 'Haltet die Linie', '+10 Stärke beim Verteidigen gegen Reiter.', ['umgruppieren', 'engpaesse'], { mods: [m(10, { ...VER, gegen: 'reiter' })] }],
  ],
  leichte_reiter: [
    [1, 'schabracke', 'Schabracke', '+5 Stärke gegen Reiterabwehr-Einheiten.', [], { mods: [m(5, { gegen: 'panzerabwehr' })] }],
    [1, 'laeufer', 'Läufer', '+5 Stärke gegen Fernkämpfer und Belagerung.', [], { mods: [m(5, { gegen: ['fernkampf', 'belagerung'] })] }],
    [2, 'pluenderung', 'Plünderung', 'Plünderungen bringen 50 % mehr Gold.', ['schabracke'], { pluendern_prozent: 50 }],
    [2, 'doppelte_umfassung', 'Doppelte Umfassung', 'Der Flankenbonus zählt doppelt.', ['laeufer'], { flanke_faktor: 2 }],
    [3, 'geschuetzvernichtung', 'Geschützvernichtung', '+7 Stärke gegen Belagerung.', ['pluenderung', 'doppelte_umfassung'], { mods: [m(7, { gegen: 'belagerung' })] }],
    [3, 'verfolgung', 'Verfolgung', '+1 Tempo.', ['pluenderung', 'doppelte_umfassung'], { tempo: 1 }],
    [4, 'eskortentempo', 'Eskortentempo', '+1 Sicht und 25 % kürzere Pause nach einem Angriff.', ['geschuetzvernichtung', 'verfolgung'], { sicht: 1, abklingzeit_prozent: -25 }],
  ],
  schwere_reiter: [
    [1, 'ansturm', 'Ansturm', '+10 Stärke gegen befestigte Verteidiger.', [], { mods: [m(10, { ...ANG, ziel: 'befestigt' })] }],
    [1, 'rossharnisch', 'Rossharnisch', '+7 Stärke beim Verteidigen gegen Fernangriffe.', [], { mods: [m(7, { ...VER, art: 'fern' })] }],
    [2, 'brandschatzen', 'Brandschatzen', '+7 Stärke gegen Einheiten in Städten.', ['ansturm', 'niederreiten'], { mods: [m(7, { ziel: 'in_stadt' })] }],
    [2, 'niederreiten', 'Niederreiten', '+5 Stärke gegen verwundete Einheiten.', ['rossharnisch', 'brandschatzen'], { mods: [m(5, { ziel: 'verwundet' })] }],
    [3, 'panzerbrechend', 'Panzerbrechend', '+7 Stärke gegen schwere Reiter.', ['brandschatzen', 'niederreiten'], { mods: [m(7, { gegen: 'schwere_reiter' })] }],
    [3, 'reaktivpanzerung', 'Reaktivpanzerung', '+7 Stärke beim Verteidigen gegen schwere Reiter und Reiterabwehr.', ['niederreiten'], { mods: [m(7, { ...VER, gegen: ['schwere_reiter', 'panzerabwehr'] })] }],
    [4, 'durchbruch', 'Durchbruch', 'Greift doppelt so oft an: 50 % kürzere Pause nach einem Angriff.', ['panzerbrechend', 'reaktivpanzerung'], { abklingzeit_prozent: -50 }],
  ],
  belagerung: [
    [1, 'traubenschuss', 'Traubenschuss', '+7 Stärke gegen Landeinheiten.', [], { mods: [m(7, { gegen: 'land' })] }],
    [1, 'besatzungswaffen', 'Besatzungswaffen', '+7 Stärke beim Verteidigen.', [], { mods: [m(7, VER)] }],
    [2, 'schrapnell', 'Schrapnell', '+10 Stärke gegen Landeinheiten.', ['traubenschuss'], { mods: [m(10, { gegen: 'land' })] }],
    [2, 'granaten', 'Granaten', '+10 Stärke gegen Städte.', ['besatzungswaffen'], { mods: [m(10, { gegen: 'stadt' })] }],
    [3, 'entfernungsmessung', 'Erweiterte Entfernungsmessung', '+10 Stärke beim Angriff auf Schiffe.', ['schrapnell', 'granaten'], { mods: [m(10, { ...ANG, gegen: 'see' })] }],
    [3, 'erfahrene_besatzung', 'Erfahrene Besatzung', '25 % kürzere Pause nach einem Angriff.', ['schrapnell', 'granaten'], { abklingzeit_prozent: -25 }],
    [4, 'vorgeschobene_beobachter', 'Vorgeschobene Beobachter', '+1 Reichweite.', ['entfernungsmessung', 'erfahrene_besatzung'], { reichweite: 1 }],
  ],
  see_nah: [
    [1, 'steuermann', 'Steuermann', '+1 Tempo.', [], { tempo: 1 }],
    [1, 'rammsporn', 'Rammsporn', '+7 Stärke gegen Schiffe.', [], { mods: [m(7, { gegen: 'see' })] }],
    [2, 'ruderpinne', 'Ruderpinne', '+1 Sicht.', ['steuermann'], { sicht: 1 }],
    [2, 'verstaerkter_rumpf', 'Verstärkter Rumpf', '+10 Stärke beim Verteidigen gegen Fernangriffe.', ['rammsporn'], { mods: [m(10, { ...VER, art: 'fern' })] }],
    [3, 'konvoi', 'Konvoi', '+5 Stärke in jeder Lage.', ['ruderpinne', 'verstaerkter_rumpf'], { mods: [m(5)] }],
    [3, 'hilfsschiffe', 'Hilfsschiffe', 'Heilt auch außerhalb des eigenen Gebiets.', ['ruderpinne', 'verstaerkter_rumpf'], { heilt_fremd: 1 }],
    [4, 'schleichangriff', 'Schleichangriff', '+14 Stärke gegen U-Boote.', ['konvoi', 'hilfsschiffe'], { mods: [m(14, { gegen: 'u_boot' })] }],
  ],
  see_fern: [
    [1, 'gefechtslinie', 'Gefechtslinie', '+7 Stärke gegen Schiffe.', [], { mods: [m(7, { gegen: 'see' })] }],
    [1, 'kuestenbeschuss', 'Küstenbeschuss', '+7 Stärke gegen Städte.', [], { mods: [m(7, { gegen: 'stadt' })] }],
    [2, 'vorbereitungsfeuer', 'Vorbereitungsfeuer', '+7 Stärke gegen Landeinheiten.', ['gefechtslinie'], { mods: [m(7, { gegen: 'land' })] }],
    [2, 'sperrfeuer', 'Rollendes Sperrfeuer', '+10 Stärke gegen Städte.', ['kuestenbeschuss'], { mods: [m(10, { gegen: 'stadt' })] }],
    [3, 'versorgungsflotte', 'Versorgungsflotte', 'Heilt auch außerhalb des eigenen Gebiets.', ['vorbereitungsfeuer', 'sperrfeuer'], { heilt_fremd: 1 }],
    [3, 'annaeherungszuender', 'Annäherungszünder', '+7 Stärke beim Verteidigen gegen Luftangriffe.', ['vorbereitungsfeuer', 'sperrfeuer'], { mods: [m(7, { ...VER, art: 'luft' })] }],
    [4, 'koinzidenzmessung', 'Koinzidenz-Entfernungsmessung', '+1 Reichweite.', ['versorgungsflotte', 'annaeherungszuender'], { reichweite: 1 }],
  ],
  seeraeuber: [
    [1, 'beute', 'Beute', 'Plünderungen bringen 50 % mehr Gold.', [], { pluendern_prozent: 50 }],
    [1, 'entern', 'Entern', '+25 Gold für jedes besiegte Schiff.', [], { sieg_gold: 25 }],
    [2, 'schneller_kiel', 'Schneller Kiel', '+1 Tempo.', ['beute', 'zielsuchtorpedos'], { tempo: 1 }],
    [2, 'zielsuchtorpedos', 'Zielsuchtorpedos', '+10 Stärke gegen Schiffe.', ['entern', 'schneller_kiel'], { mods: [m(10, { gegen: 'see' })] }],
    [3, 'beobachtung', 'Beobachtung', '+1 Sicht.', ['schneller_kiel'], { sicht: 1 }],
    [3, 'lautlose_fahrt', 'Lautlose Fahrt', '25 % kürzere Pause nach einem Angriff.', ['zielsuchtorpedos'], { abklingzeit_prozent: -25 }],
    [4, 'wolfsrudel', 'Wolfsrudel', 'Greift doppelt so oft an: 50 % kürzere Pause nach einem Angriff.', ['beobachtung', 'lautlose_fahrt'], { abklingzeit_prozent: -50 }],
  ],
  traeger: [
    [1, 'flugdeck', 'Flugdeck', '+1 Flugzeugplatz.', [], { plaetze: 1 }],
    [1, 'aufklaerungsflugzeuge', 'Aufklärungsflugzeuge', '+1 Sicht.', [], { sicht: 1 }],
    [2, 'hangardeck', 'Hangardeck', '+1 Flugzeugplatz.', ['flugdeck', 'verbesserte_triebwerke'], { plaetze: 1 }],
    [2, 'verbesserte_triebwerke', 'Verbesserte Triebwerke', '+1 Tempo.', ['aufklaerungsflugzeuge', 'hangardeck'], { tempo: 1 }],
    [3, 'klappfluegel', 'Klappflügel', '+1 Flugzeugplatz.', ['hangardeck', 'deckcrews'], { plaetze: 1 }],
    [3, 'deckcrews', 'Deckcrews', 'Heilt 10 Lebenspunkte pro Stunde zusätzlich.', ['verbesserte_triebwerke', 'klappfluegel'], { heilung: 10 }],
    [4, 'supertraeger', 'Superträger', 'Heilt auch außerhalb des eigenen Gebiets.', ['deckcrews', 'klappfluegel'], { heilt_fremd: 1 }],
  ],
  jaeger: [
    [1, 'luftkampf', 'Luftkampf', '+7 Stärke gegen Jäger.', [], { mods: [m(7, { gegen: 'jaeger' })] }],
    [1, 'cockpitpanzerung', 'Cockpitpanzerung', '+7 Stärke beim Verteidigen gegen Flugabwehr.', [], { mods: [m(7, { ...VER, gegen: 'flak' })] }],
    [2, 'abfangjaeger', 'Abfangjäger', '+7 Stärke gegen Bomber.', ['luftkampf'], { mods: [m(7, { gegen: 'bomber' })] }],
    [2, 'tiefflug', 'Tiefflug', '+17 Stärke gegen Landeinheiten, die keine Reiter sind.', ['cockpitpanzerung'], { mods: [m(17, { gegen: 'land_ohne_reiter' })] }],
    [3, 'bodenpersonal', 'Bodenpersonal', 'Heilt 10 Lebenspunkte pro Stunde zusätzlich.', ['abfangjaeger'], { heilung: 10 }],
    [3, 'panzerknacker', 'Panzerknacker', '+17 Stärke gegen Reiter.', ['tiefflug'], { mods: [m(17, { gegen: 'reiter' })] }],
    [4, 'zusatztanks', 'Zusatztanks', '+2 Einsatzradius.', ['bodenpersonal', 'panzerknacker'], { reichweite: 2 }],
  ],
  bomber: [
    [1, 'kastenformation', 'Kastenformation', '+7 Stärke beim Verteidigen gegen Jäger.', [], { mods: [m(7, { ...VER, gegen: 'jaeger' })] }],
    [1, 'ausweichmanoever', 'Ausweichmanöver', '+7 Stärke beim Verteidigen gegen Flugabwehr.', [], { mods: [m(7, { ...VER, gegen: 'flak' })] }],
    [2, 'torpedobomber', 'Torpedobomber', '+17 Stärke gegen Schiffe.', ['kastenformation', 'ausweichmanoever'], { mods: [m(17, { gegen: 'see' })] }],
    [2, 'luftnahunterstuetzung', 'Luftnahunterstützung', '+12 Stärke gegen Landeinheiten.', ['kastenformation', 'ausweichmanoever'], { mods: [m(12, { gegen: 'land' })] }],
    [3, 'wartung', 'Taktische Wartung', 'Heilt 10 Lebenspunkte pro Stunde zusätzlich.', ['torpedobomber'], { heilung: 10 }],
    [3, 'langstrecke', 'Langstrecke', '+2 Einsatzradius.', ['luftnahunterstuetzung'], { reichweite: 2 }],
    [4, 'superfestung', 'Superfestung', '25 % kürzere Pause nach einem Angriff.', ['wartung', 'langstrecke'], { abklingzeit_prozent: -25 }],
  ],
};

export const BEFOERDERUNGEN = Object.entries(BAUM_DATEN).flatMap(([baum, liste]) =>
  liste.map(([stufe, id, name, beschreibung, voraussetzung, wirkung]) => ({ id: baum + '_' + id, baum, stufe, name, beschreibung, voraussetzung: voraussetzung.map((v) => baum + '_' + v), wirkung })));

/** Beförderungen eines Baums, nach Stufe sortiert. */
export const befoerderungenVon = (baum) => BEFOERDERUNGEN.filter((b) => b.baum === baum);
