// Distrikte wie in Civ 6: Eine Stadt baut auf Feldern ihres Gebiets Distrikte, die Gebäude einer Sorte bündeln.
// Ein Distrikt liegt auf einem Feld (Spielzustand: Feld f.d = Distrikt-ID, Stadt s.distrikte[typ] = { feld, spez, ... }).
// Gebäude mit `distrikt` (siehe Zuordnung unten) brauchen den Distrikt in ihrer Stadt; einfache Stadtgebäude bleiben im Zentrum.
//
// ertrag:   Ertragsart der Nachbarschaftsboni ('w' Wissen, 'g' Gold, 'p' Produktion, 'k' Kultur, 'n' Nahrung, 'glaube' Glaube).
// nachbar:  Liste von Regeln { quelle, wert } mit quelle:
//             'gelaende:<id>' (Nachbarfeld mit diesem Gelände), 'fluss' (das Distriktfeld oder ein Nachbar liegt am Fluss),
//             'wasser' (Nachbar ist Wasser), 'kueste' (Nachbar ist Küstenwasser), 'naturwunder', 'weltwunder',
//             'distrikt' (jeder benachbarte Distrikt), 'distrikt:<id>', 'verbesserung:<kette>' (z. B. mine), 'rohstoff:<art>' ('luxus', 'bonus', 'strategisch'),
//             'stadtzentrum'.
//           Werte können gebrochen sein (0,5); die Summe wird im Stadtfenster mit Quellen angezeigt.
// stufen:   Gebäudekette in 3 Stufen (die Stufe des Distrikts ist die Zahl der Stufen, deren Gebäude oder ein Nachfolger in der Stadt steht).
//           Ab Stufe 2 zählt der Nachbarschaftsbonus 1,5-fach, ab Stufe 3 doppelt.
// spez:     zwei Ausrichtungen; Wirkung wie Gebäudewirkung, gilt für die Stadt. Umstellen dauert SPEZ_UMSTELLEN_STD Stunden.
// ebene:    0 = Erde, 1 = Weltraum (Kolonien haben eigene Distrikte).
// farbe:    Erkennungsfarbe auf der Karte und im Stadtfenster (Civ-6-artig: Campus blau, Handelsplatz gelb ...).

export const DISTRIKT_REGELN = {
  /** Höchstzahl Distrikte je Stadt: 1 + je angefangene 4 Einwohner einer mehr (Altstände dürfen darüber liegen). */
  maxDistrikte: (bev) => 1 + Math.floor(Math.max(0, bev - 1) / 4),
  /** Nachbarschaftsbonus-Faktor je Stufe (Index = Stufe). */
  stufenFaktor: [1, 1, 1.5, 2],
  /** Grundertrag des Distrikts wächst mit dem Zeitalter des Volkes (Ausbaustufen der Optik folgen dem Zeitalter). */
  grundJeZeitalter: 0.5,
  spezUmstellenStd: 6,
  /** Lebenspunkte eines Distrikts; geplündert bringt er nichts, bis er repariert ist. */
  hp: 100,
  pluenderDauerStd: 8,
  reparaturGoldJeZeitalter: 60,
};

export const DISTRIKTE = [
  {
    id: 'campus', name: 'Campus', kurz: 'Wissen', farbe: '#4f8fe6', ertrag: 'w', ebene: 0,
    beschreibung: 'Hochschulen, Labore und Sternwarten. Bringt Wissenschaft, besonders neben Bergen, Dschungel und Naturwundern.',
    kosten: { zeit: 40 * 60, gold: 60, holz: 30, stein: 20 },
    nachbar: [{ quelle: 'gelaende:gebirge', wert: 1 }, { quelle: 'gelaende:kristallgebirge', wert: 1 }, { quelle: 'naturwunder', wert: 2 }, { quelle: 'gelaende:dschungel', wert: 0.5 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['bibliothek', 'universitaet', 'forschungslabor'],
    spez: [
      { id: 'forschung', name: 'Forschungsstätte', text: '+10 % Wissenschaft in der Stadt', wirkung: { wissenschaft_prozent: 10 } },
      { id: 'lehre', name: 'Lehrstätte', text: '+2 Kultur und neue Einheiten +10 Erfahrung', wirkung: { kultur: 2, erfahrung: 10 } },
    ],
  },
  {
    id: 'heiligtum', name: 'Heiligtum', kurz: 'Glaube', farbe: '#e8dca8', ertrag: 'glaube', ebene: 0,
    beschreibung: 'Schreine, Tempel und Kathedralen. Bringt Glauben, besonders neben Bergen, Wäldern und Naturwundern.',
    kosten: { zeit: 40 * 60, gold: 50, holz: 30, stein: 20 },
    nachbar: [{ quelle: 'gelaende:gebirge', wert: 1 }, { quelle: 'naturwunder', wert: 2 }, { quelle: 'gelaende:wald', wert: 0.5 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['schrein', 'tempel', 'kathedrale'],
    spez: [
      { id: 'pilger', name: 'Pilgerstätte', text: '+2 Zufriedenheit', wirkung: { zufriedenheit: 2 } },
      { id: 'kloster', name: 'Kloster', text: '+2 Kultur und +1 Wissenschaft je 4 Einwohner', wirkung: { kultur: 2, pro_einwohner: { w: 0.25 } } },
    ],
  },
  {
    id: 'handelsplatz', name: 'Handelsplatz', kurz: 'Gold', farbe: '#e8c23a', ertrag: 'g', ebene: 0,
    beschreibung: 'Märkte, Banken und Börsen. Bringt Gold, besonders an Flüssen und mit Handelsrouten.',
    kosten: { zeit: 50 * 60, gold: 60, holz: 40, stein: 20 },
    nachbar: [{ quelle: 'fluss', wert: 2 }, { quelle: 'kueste', wert: 1 }, { quelle: 'distrikt:hafen', wert: 2 }, { quelle: 'rohstoff:luxus', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['markt', 'bank', 'boerse'],
    spez: [
      { id: 'markt', name: 'Großmarkt', text: '+15 % Gold in der Stadt', wirkung: { gold_prozent: 15 } },
      { id: 'kontor', name: 'Handelskontor', text: '+1 Handelsroute und +3 Gold', wirkung: { handelsrouten: 1, gold: 3 } },
    ],
  },
  {
    id: 'industriezone', name: 'Industriezone', kurz: 'Produktion', farbe: '#9a9a9a', ertrag: 'p', ebene: 0,
    beschreibung: 'Werkstätten, Fabriken und Kraftwerke. Bringt Produktion, besonders neben Minen und Steinbrüchen.',
    kosten: { zeit: 60 * 60, gold: 70, holz: 40, stein: 30 },
    nachbar: [{ quelle: 'verbesserung:mine', wert: 1 }, { quelle: 'verbesserung:steinbruch', wert: 1 }, { quelle: 'verbesserung:holzfaellerlager', wert: 0.5 }, { quelle: 'naturwunder', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['werkstatt', 'fabrik', 'kraftwerk'],
    spez: [
      { id: 'werft', name: 'Rüstungswerft', text: 'Einheiten 15 % schneller gebaut', wirkung: { einheit_bauzeit_prozent: -15 } },
      { id: 'kraftwerk', name: 'Energiezentrum', text: '+10 % Produktion in der Stadt', wirkung: { produktion_prozent: 10 } },
    ],
  },
  {
    id: 'theaterplatz', name: 'Theaterplatz', kurz: 'Kultur', farbe: '#e0703a', ertrag: 'k', ebene: 0,
    beschreibung: 'Theater, Museen und Arenen. Bringt Kultur, besonders neben Weltwundern und Naturwundern.',
    kosten: { zeit: 50 * 60, gold: 60, holz: 30, stein: 30 },
    nachbar: [{ quelle: 'weltwunder', wert: 2 }, { quelle: 'naturwunder', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['theater', 'opernhaus', 'museum'],
    spez: [
      { id: 'kunst', name: 'Kunstviertel', text: '+15 % Kultur in der Stadt', wirkung: { kultur_prozent: 15 } },
      { id: 'spiele', name: 'Vergnügungsviertel', text: '+3 Zufriedenheit', wirkung: { zufriedenheit: 3 } },
    ],
  },
  {
    id: 'hafen', name: 'Hafen', kurz: 'See', farbe: '#3cc4c4', ertrag: 'g', ebene: 0, wasser: true,
    beschreibung: 'Werften, Leuchttürme und Häfen. Liegt auf einem Küstenfeld. Bringt Gold und Nahrung vom Meer.',
    kosten: { zeit: 50 * 60, gold: 60, holz: 50, stein: 10 },
    nachbar: [{ quelle: 'rohstoff:see', wert: 1 }, { quelle: 'stadtzentrum', wert: 2 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['werft', 'hafen', 'grosshafen'],
    spez: [
      { id: 'fischerei', name: 'Fischereihafen', text: '+3 Nahrung', wirkung: { nahrung: 3 } },
      { id: 'flotte', name: 'Flottenstützpunkt', text: 'Schiffe 20 % schneller gebaut, +10 Erfahrung', wirkung: { einheit_bauzeit_prozent: -20, erfahrung: 10 } },
    ],
  },
  {
    id: 'militaerlager', name: 'Militärlager', kurz: 'Militär', farbe: '#b0503a', ertrag: 'p', ebene: 0, verteidigung: 4,
    beschreibung: 'Kasernen, Ställe und Akademien. Neue Einheiten bekommen Erfahrung; der Distrikt verteidigt sich selbst und schützt die Nachbarn.',
    kosten: { zeit: 50 * 60, gold: 60, holz: 50, stein: 20 },
    nachbar: [{ quelle: 'gelaende:huegel', wert: 0.5 }, { quelle: 'rohstoff:strategisch', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['kaserne', 'waffenkammer', 'militaerakademie'],
    spez: [
      { id: 'drill', name: 'Drillplatz', text: 'neue Einheiten +15 Erfahrung', wirkung: { erfahrung: 15 } },
      { id: 'ruestung', name: 'Rüstkammer', text: 'Einheiten 15 % schneller gebaut', wirkung: { einheit_bauzeit_prozent: -15 } },
    ],
  },
  {
    id: 'stadtviertel', name: 'Stadtviertel', kurz: 'Wohnen', farbe: '#7fbf5a', ertrag: 'n', ebene: 0, wohnraum: 4,
    beschreibung: 'Wohnhäuser, Bäder und Gärten. Mehr Wohnraum und Nahrung, besonders an Flüssen und Seen.',
    kosten: { zeit: 40 * 60, gold: 50, holz: 40, stein: 20 },
    nachbar: [{ quelle: 'fluss', wert: 1 }, { quelle: 'gelaende:see', wert: 1 }, { quelle: 'stadtzentrum', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: ['badehaus', 'schlossgarten', 'co2_waescher'],
    spez: [
      { id: 'wohnen', name: 'Wohnquartier', text: '+2 Wohnraum, die Stadt wächst schneller', wirkung: { wachstum_behalt: 10 }, wohnraum: 2 },
      { id: 'gaerten', name: 'Gartenstadt', text: '+2 Zufriedenheit', wirkung: { zufriedenheit: 2 } },
    ],
  },
  // ---------- Weltraum (Kolonien) ----------
  {
    id: 'kuppelviertel', name: 'Kuppelviertel', kurz: 'Wohnen', farbe: '#a6d0ff', ertrag: 'n', ebene: 1, wohnraum: 4,
    beschreibung: 'Wohnkuppeln mit Gärten. Die Kolonie wächst und bleibt zufrieden.',
    kosten: { zeit: 20 * 3600, gold: 2500, titan: 1 },
    nachbar: [{ quelle: 'gelaende:eisboden', wert: 1 }, { quelle: 'stadtzentrum', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: [],
    spez: [
      { id: 'garten', name: 'Gartenkuppeln', text: '+4 Nahrung', wirkung: { nahrung: 4 } },
      { id: 'feste', name: 'Festkuppeln', text: '+3 Zufriedenheit und +2 Kultur', wirkung: { zufriedenheit: 3, kultur: 2 } },
    ],
  },
  {
    id: 'forschungskuppel', name: 'Forschungskuppel', kurz: 'Wissen', farbe: '#7b8cff', ertrag: 'w', ebene: 1,
    beschreibung: 'Labore unter Glas mit freiem Blick ins All. Viel Wissenschaft, besonders neben Kratern und Eis.',
    kosten: { zeit: 24 * 3600, gold: 3000, titan: 1 },
    nachbar: [{ quelle: 'gelaende:mondkrater', wert: 1 }, { quelle: 'gelaende:eisboden', wert: 0.5 }, { quelle: 'gelaende:orbit', wert: 0.5 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: [],
    spez: [
      { id: 'teleskop', name: 'Weltraumteleskop', text: '+20 % Wissenschaft in der Kolonie', wirkung: { wissenschaft_prozent: 20 } },
      { id: 'labor', name: 'Schwerelosigkeitslabor', text: '+6 Wissenschaft', wirkung: { wissenschaft: 6 } },
    ],
  },
  {
    id: 'bergbaudistrikt', name: 'Bergbaudistrikt', kurz: 'Produktion', farbe: '#c08a5a', ertrag: 'p', ebene: 1,
    beschreibung: 'Schmelzöfen und Verladerampen. Viel Produktion neben Minen, Gebirgen und Asteroiden.',
    kosten: { zeit: 24 * 3600, gold: 3000, titan: 1 },
    nachbar: [{ quelle: 'gelaende:marsgebirge', wert: 1 }, { quelle: 'gelaende:asteroiden', wert: 1 }, { quelle: 'verbesserung:marsmine', wert: 1 }, { quelle: 'verbesserung:mondmine', wert: 1 }, { quelle: 'distrikt', wert: 0.5 }],
    stufen: [],
    spez: [
      { id: 'schmelze', name: 'Schmelzwerk', text: '+15 % Produktion', wirkung: { produktion_prozent: 15 } },
      { id: 'verladung', name: 'Verladestation', text: '+2 Titan je Stunde ins Reichslager', wirkung: { material: { titan: 0.4 } } },
    ],
  },
];

/** Gebäude, die in einen Distrikt gehören (alles andere bleibt im Stadtzentrum). */
export const GEBAEUDE_DISTRIKT = {
  campus: ['bibliothek', 'campus', 'universitaet', 'sternwarte', 'akademie', 'schule', 'forschungslabor', 'rechenzentrum', 'raumfahrtzentrum', 'ki_labor', 'quantenrechner', 'sternenobservatorium'],
  heiligtum: ['schrein', 'tempel', 'kathedrale'],
  handelsplatz: ['markt', 'muenzpraegeanstalt', 'karawanserei', 'bank', 'handelskompanie', 'boerse', 'einkaufszentrum'],
  industriezone: ['werkstatt', 'manufaktur', 'fabrik', 'robotfabrik', 'autonome_fabrik', 'molekularfabrik', 'materiewandler', 'kraftwerk', 'kernkraftwerk', 'fusionsreaktor', 'stahlwerk', 'raffinerie', 'solarkraftwerk', 'orbitalkraftwerk', 'intelligentes_stromnetz', 'antimateriefabrik'],
  theaterplatz: ['theater', 'opernhaus', 'museum', 'rundfunkhaus', 'medienzentrum', 'virtuelles_forum', 'weltarchiv', 'kolosseum', 'stadion', 'zoo'],
  hafen: ['werft', 'leuchtturm', 'hafen', 'trockendock', 'grosshafen', 'containerhafen', 'drohnenhafen'],
  militaerlager: ['kaserne', 'stall', 'waffenkammer', 'gestuet', 'pulvermuehle', 'militaerakademie', 'plasmaschmiede', 'orbitalwerft', 'sternenwerft'],
  stadtviertel: ['badehaus', 'schlossgarten', 'co2_waescher'],
};
/** Gebäude-ID -> Distrikt-ID. */
export const DISTRIKT_VON_GEBAEUDE = Object.fromEntries(Object.entries(GEBAEUDE_DISTRIKT).flatMap(([d, l]) => l.map((g) => [g, d])));
export const DISTRIKT = Object.assign(Object.create(null), Object.fromEntries(DISTRIKTE.map((d) => [d.id, d])));

/**
 * Traditionen und ihre einzigartigen Distrikte. Jedes Volk wählt einmal eine Tradition (KI-Völker passend zu ihrer Persönlichkeit).
 * Der einzigartige Distrikt ersetzt einen Grund-Distrikt: gleiche Gebäude, aber billiger (kosten_faktor) und mit Zusatzbonus.
 * Im Spielzustand bleibt die ID des Grund-Distrikts (z. B. 'campus'), die Tradition des Volkes verändert Name, Kosten und Wirkung.
 */
export const TRADITIONEN = [
  { id: 'gelehrte', name: 'Tradition der Gelehrten', persoenlichkeit: 'forscher', distrikt: 'campus', unikat: { id: 'akademie_der_weisen', name: 'Akademie der Weisen', beschreibung: 'Ein Campus mit Lesesälen und Gärten. Billiger und mit zusätzlicher Kultur.', kosten_faktor: 0.6, bonus: { kultur: 2 }, nachbar_extra: [{ quelle: 'gelaende:huegel', wert: 0.5 }] } },
  { id: 'haendler', name: 'Tradition der Händler', persoenlichkeit: 'haendler', distrikt: 'handelsplatz', unikat: { id: 'grosser_basar', name: 'Großer Basar', beschreibung: 'Ein Handelsplatz voller Stände und Karawanen. Billiger, eine Handelsroute mehr.', kosten_faktor: 0.6, bonus: { handelsrouten: 1 }, nachbar_extra: [{ quelle: 'gelaende:wueste', wert: 0.5 }] } },
  { id: 'baumeister', name: 'Tradition der Baumeister', persoenlichkeit: 'bauer', distrikt: 'industriezone', unikat: { id: 'bauhuette', name: 'Bauhütte', beschreibung: 'Eine Industriezone mit Steinmetzen und Kränen. Billiger, Gebäude entstehen schneller.', kosten_faktor: 0.6, bonus: { produktion: 2 }, nachbar_extra: [{ quelle: 'gelaende:wald', wert: 0.5 }] } },
  { id: 'krieger', name: 'Tradition der Krieger', persoenlichkeit: 'krieger', distrikt: 'militaerlager', unikat: { id: 'heerlager', name: 'Heerlager', beschreibung: 'Ein Militärlager mit Übungsplätzen. Billiger, neue Einheiten mit noch mehr Erfahrung.', kosten_faktor: 0.6, bonus: { erfahrung: 10 }, nachbar_extra: [{ quelle: 'gelaende:ebene', wert: 0.5 }] } },
  { id: 'seefahrer', name: 'Tradition der Seefahrer', persoenlichkeit: 'seefahrer', distrikt: 'hafen', unikat: { id: 'seehafen', name: 'Hafen der Kühnen', beschreibung: 'Ein Hafen mit Leuchtfeuer und großen Werften. Billiger, mehr Nahrung und Gold vom Meer.', kosten_faktor: 0.6, bonus: { nahrung: 2, gold: 2 }, nachbar_extra: [{ quelle: 'kueste', wert: 0.5 }] } },
];
export const TRADITION = Object.assign(Object.create(null), Object.fromEntries(TRADITIONEN.map((t) => [t.id, t])));
