// Naturwunder: besondere Orte der Erde, 1 bis 4 Felder groß. Sie werden einmal je Welt platziert (engine/naturwunder.js),
// nie auf Städte, Startplätze, Verbesserungen oder Einheiten. Ihre Felder sind unpassierbar, können aber von Städten
// bewirtschaftet werden (Ertrag statt des Geländes). Wer ein Naturwunder als Erster sieht, bekommt den Entdeckungsbonus.
//
// felder: Anzahl Felder. gelaende: erlaubte Gelände für alle Felder. wasser_nachbar: mindestens ein Feld grenzt an Wasser.
// ertrag: je Feld {n, p, g, w, k} (Grundwerte pro Stunde wie Gelände; w = Wissen, k = Kultur), glaube kommt mit der Religion.
// nachbar: Bonus für angrenzende Distrikte (Distrikt-ID -> Punkte), entdeckung: einmalig für den ersten Entdecker.
// effekt: Darstellung (glimmen, dampf, funkeln, nebel, rauch, wasser) für Animationen.

export const NATURWUNDER = [
  { id: 'feuerberg', name: 'Feuerberg', felder: 1, gelaende: ['gebirge', 'huegel', 'vulkan'], ertrag: { n: 0, p: 3, g: 0, w: 1, k: 2 }, nachbar: { industriezone: 2, campus: 1 }, entdeckung: { kultur: 60, wissen: 0 }, effekt: 'rauch', beschreibung: 'Ein rauchender Riese, dessen Glut nachts über das Land leuchtet. Seine Asche macht den Boden ringsum fruchtbar.' },
  { id: 'sternenkrater', name: 'Sternenkrater', felder: 2, gelaende: ['ebene', 'wueste', 'savanne', 'grasland', 'tundra'], ertrag: { n: 0, p: 1, g: 0, w: 3, k: 1 }, nachbar: { campus: 2 }, entdeckung: { kultur: 0, wissen: 80 }, effekt: 'funkeln', beschreibung: 'Hier stürzte einst ein Stern vom Himmel. Im Kraterboden glitzert fremdes Gestein.' },
  { id: 'perlenriff', name: 'Perlenriff', felder: 2, gelaende: ['kueste'], ertrag: { n: 2, p: 0, g: 2, w: 1, k: 1 }, nachbar: { hafen: 2, handelsplatz: 1 }, entdeckung: { kultur: 40, wissen: 40 }, effekt: 'wasser', beschreibung: 'Ein buntes Riff voller Fische, Muscheln und schimmernder Perlen, das aus dem flachen Wasser ragt.' },
  { id: 'regenbogenberg', name: 'Regenbogenberg', felder: 1, gelaende: ['gebirge', 'huegel'], ertrag: { n: 0, p: 1, g: 1, w: 0, k: 3 }, nachbar: { theater: 2, heiligtum: 1 }, entdeckung: { kultur: 80, wissen: 0 }, effekt: 'glimmen', beschreibung: 'Ein Berg in Streifen aus Rot, Gelb, Grün und Violett. Maler und Pilger kommen von weit her.' },
  { id: 'schluchtmeer', name: 'Tiefe Schlucht', felder: 3, gelaende: ['wueste', 'ebene', 'huegel', 'savanne'], ertrag: { n: 0, p: 1, g: 2, w: 0, k: 2 }, nachbar: { handelsplatz: 1, theater: 1 }, entdeckung: { kultur: 70, wissen: 0 }, effekt: 'nebel', beschreibung: 'Eine Schlucht so tief, dass unten ein eigenes Meer aus Wolken liegt.' },
  { id: 'geysirtal', name: 'Geysirtal', felder: 2, gelaende: ['tundra', 'huegel', 'ebene', 'grasland'], ertrag: { n: 1, p: 1, g: 0, w: 2, k: 1 }, nachbar: { campus: 1, heiligtum: 1 }, entdeckung: { kultur: 30, wissen: 50 }, effekt: 'dampf', beschreibung: 'Heiße Quellen schießen in regelmäßigen Stößen in den Himmel. Die Luft riecht nach Schwefel.' },
  { id: 'kristallhoehle', name: 'Kristallhöhle', felder: 1, gelaende: ['huegel', 'gebirge', 'kristallgebirge'], ertrag: { n: 0, p: 1, g: 1, w: 2, k: 1 }, nachbar: { campus: 2 }, entdeckung: { kultur: 0, wissen: 70 }, effekt: 'funkeln', beschreibung: 'Eine Höhle aus mannshohen, leuchtenden Kristallen, die die Gelehrten nicht erklären können.' },
  { id: 'donnerfall', name: 'Donnerfall', felder: 2, gelaende: ['huegel', 'wald', 'grasland', 'dschungel', 'ebene'], fluss: true, ertrag: { n: 1, p: 2, g: 2, w: 0, k: 1 }, nachbar: { industriezone: 2 }, entdeckung: { kultur: 50, wissen: 20 }, effekt: 'wasser', beschreibung: 'Ein Wasserfall so laut wie ein Gewitter. Sein Nebel spannt jeden Morgen einen Regenbogen.' },
  { id: 'eisfjord', name: 'Eisfjord', felder: 2, gelaende: ['tundra', 'schnee', 'huegel'], wasser_nachbar: true, ertrag: { n: 1, p: 1, g: 1, w: 1, k: 2 }, nachbar: { hafen: 1, theater: 1 }, entdeckung: { kultur: 60, wissen: 0 }, effekt: 'funkeln', beschreibung: 'Blaue Gletscher brechen donnernd ins Meer. Im Sommer schwimmen Eisberge durch den Fjord.' },
  { id: 'smaragdoase', name: 'Smaragdoase', felder: 1, gelaende: ['wueste'], ertrag: { n: 3, p: 0, g: 2, w: 0, k: 1 }, nachbar: { handelsplatz: 2, stadtviertel: 1 }, entdeckung: { kultur: 40, wissen: 0 }, effekt: 'glimmen', beschreibung: 'Ein grüner See mitten in der Wüste, umgeben von Palmen. Jede Karawane macht hier Rast.' },
  { id: 'fluesterwald', name: 'Flüsterwald', felder: 3, gelaende: ['wald', 'dschungel', 'pilzwald'], ertrag: { n: 2, p: 1, g: 0, w: 0, k: 2 }, nachbar: { heiligtum: 2 }, entdeckung: { kultur: 70, wissen: 0 }, effekt: 'nebel', beschreibung: 'Uralte Bäume, zwischen denen der Wind wie Stimmen klingt. Kein Holzfäller wagt sich hinein.' },
  { id: 'monolith', name: 'Schwarzer Monolith', felder: 1, gelaende: ['ebene', 'grasland', 'savanne', 'wueste', 'tundra'], ertrag: { n: 0, p: 0, g: 1, w: 2, k: 2 }, nachbar: { campus: 1, theater: 1, heiligtum: 1 }, entdeckung: { kultur: 50, wissen: 50 }, effekt: 'glimmen', beschreibung: 'Ein glatter, schwarzer Stein, höher als jeder Turm. Niemand weiß, wer ihn aufgestellt hat.' },
];

export const NATURWUNDER_NACH_ID = Object.assign(Object.create(null), Object.fromEntries(NATURWUNDER.map((n) => [n.id, n])));

/** Regeln für die Platzierung (Mindestabstände in Feldern). */
export const NATURWUNDER_REGELN = { abstandUntereinander: 14, abstandStadt: 4, abstandStart: 4, abstandLager: 3 };
