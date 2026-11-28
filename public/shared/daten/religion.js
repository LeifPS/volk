// Religion wie in Civilization 6, in Echtzeit: Glaube sammeln, Pantheon wählen, Religion gründen, Glaubenssätze,
// Missionare und Apostel, religiöser Druck zwischen Städten. Engine: engine/religion.js.
//
// Wirkungs-Arten in den Glaubenssätzen:
//   reich:    reichsweite Boni (Bonus-Schlüssel wie bei Forschung und Politikkarten)
//   stadt:    Wirkung wie ein Gebäude in jeder Stadt, deren Mehrheitsreligion diese ist (egal, wem sie gehört)
//   je_stadt: reichsweiter Bonus für den Gründer je Anhänger-Stadt (höchstens bis `max` Städte)

export const RELIGION_REGELN = {
  /** Glaube pro Stunde = Glaube-Ertrag × dieser Faktor (wie das Wirtschaftstempo). */
  glaubeFaktor: 5,
  pantheonKosten: 60,
  gruendungKosten: 400,
  verstaerkenKosten: 900,
  /** Höchstzahl Religionen: Spielerzahl + 2, mindestens 3, höchstens 8. */
  maxReligionen: (spieler) => Math.max(3, Math.min(8, spieler + 2)),
  /** Religiöser Druck: alle so viele Stunden ein Schritt. */
  druckTaktStd: 1,
  /** Reichweite in Feldern und Gewicht des Drucks. */
  druckReichweite: 9, heiligeStadtDruck: 3, mehrheitDruck: 1, eigenerDruck: 0.5,
  /** So stark nähern sich die Anteile pro Schritt dem Druck an. */
  druckSchritt: 0.04,
  /** Ab diesem Anteil ist eine Religion Mehrheitsreligion der Stadt. */
  mehrheit: 0.5,
  missionarWirkung: 0.25, apostelWirkung: 0.35,
};

export const PANTHEONS = [
  { id: 'erntegoettin', name: 'Göttin der Ernte', text: '+4 % Nahrung in allen Städten', reich: { nahrung_prozent: 4 } },
  { id: 'schmiedegott', name: 'Gott der Schmiede', text: '+3 % Produktion in allen Städten', reich: { produktion_prozent: 3 } },
  { id: 'hueter_des_wissens', name: 'Hüter des Wissens', text: '+3 % Wissenschaft', reich: { wissenschaft_prozent: 3 } },
  { id: 'gott_der_strassen', name: 'Gott der Straßen', text: 'Einheiten 8 % schneller an Land', reich: { tempo_land: 8 } },
  { id: 'meeresgott', name: 'Gott des Meeres', text: 'Schiffe 10 % schneller, +5 % Handelsgold', reich: { tempo_see: 10, handel_gold_prozent: 5 } },
  { id: 'kriegsgott', name: 'Gott des Krieges', text: '+10 % Erfahrung für Einheiten', reich: { erfahrung_prozent: 10 } },
  { id: 'heilende_quellen', name: 'Heilende Quellen', text: 'Einheiten heilen 15 % schneller', reich: { heilung_prozent: 15 } },
  { id: 'feuer_des_herdes', name: 'Feuer des Herdes', text: '+1 Zufriedenheit in jeder Stadt', reich: { zufriedenheit: 1 } },
  { id: 'goettin_der_kuenste', name: 'Göttin der Künste', text: '+4 % Kultur', reich: { kultur_prozent: 4 } },
  { id: 'sternenfluesterer', name: 'Sternenflüsterer', text: '+25 % Nachbarschaftsbonus für Campus und Heiligtum', reich: { nachbar_campus_prozent: 25, nachbar_heiligtum_prozent: 25 } },
  { id: 'gott_der_waelder', name: 'Gott der Wälder', text: 'Grenzen wachsen 10 % schneller', reich: { grenzwachstum_prozent: 10 } },
  { id: 'goldene_kuh', name: 'Die goldene Kuh', text: '+4 % Gold', reich: { gold_prozent: 4 } },
];

/** Acht Religionen (Name, Farbe für Karte und Stadtfenster). Die Zahl der gründbaren Religionen hängt an der Spielerzahl. */
export const RELIGIONEN = [
  { id: 'sonnenweg', name: 'Sonnenweg', farbe: '#f2b632', symbol: 'tag' },
  { id: 'quellenlehre', name: 'Quellenlehre', farbe: '#4fb3d9', symbol: 'see' },
  { id: 'sternenbund', name: 'Sternenbund', farbe: '#8e7cc3', symbol: 'stern_voll' },
  { id: 'ahnenpfad', name: 'Ahnenpfad', farbe: '#b07d4f', symbol: 'krone' },
  { id: 'feuerhaus', name: 'Haus des Feuers', farbe: '#e0533d', symbol: 'warnung' },
  { id: 'lebenskreis', name: 'Kreis des Lebens', farbe: '#5aa84f', symbol: 'nahrung' },
  { id: 'stille_lehre', name: 'Stille Lehre', farbe: '#d9d9e8', symbol: 'nacht' },
  { id: 'lichtorden', name: 'Orden des Lichts', farbe: '#ffe8a0', symbol: 'kultur' },
];

/** Glaubenssätze: kategorie gruender | anhaenger | verehrung | reformer. Bei der Gründung: 1 Gründer + 1 Anhänger;
 *  beim Verstärken: 1 Verehrung + 1 Reformer. Jeder Satz gehört höchstens einer Religion in der Welt. */
export const GLAUBENSSAETZE = [
  // Gründer: wirkt für das gründende Volk je Anhänger-Stadt (auch fremde Städte zählen)
  { id: 'zehnt', kategorie: 'gruender', name: 'Zehnt', text: '+1 % Gold je Anhänger-Stadt (höchstens +15 %)', je_stadt: { gold_prozent: 1 }, max: 15 },
  { id: 'kirchenlehre', kategorie: 'gruender', name: 'Kirchenlehre', text: '+1 % Wissenschaft je Anhänger-Stadt (höchstens +12 %)', je_stadt: { wissenschaft_prozent: 1 }, max: 12 },
  { id: 'pilgerfahrt', kategorie: 'gruender', name: 'Pilgerfahrt', text: '+1 % Kultur je Anhänger-Stadt (höchstens +15 %)', je_stadt: { kultur_prozent: 1 }, max: 15 },
  { id: 'weltkirche', kategorie: 'gruender', name: 'Weltkirche', text: '+2 % Glaube je Anhänger-Stadt (höchstens +30 %)', je_stadt: { glaube_prozent: 2 }, max: 15 },
  { id: 'heilige_bauten', kategorie: 'gruender', name: 'Heilige Bauten', text: 'Gebäude 1 % schneller je Anhänger-Stadt (höchstens 12 %)', je_stadt: { gebaeude_bauzeit_prozent: -1 }, max: 12 },
  { id: 'kreuzzug', kategorie: 'gruender', name: 'Glaubensstreiter', text: '+1 % Erfahrung je Anhänger-Stadt (höchstens +15 %)', je_stadt: { erfahrung_prozent: 1 }, max: 15 },
  { id: 'friedensbotschaft', kategorie: 'gruender', name: 'Friedensbotschaft', text: '+1 Zufriedenheit je 3 Anhänger-Städte (höchstens +3)', je_stadt: { zufriedenheit: 0.34 }, max: 9 },
  { id: 'handelssegen', kategorie: 'gruender', name: 'Handelssegen', text: '+2 % Handelsgold je Anhänger-Stadt (höchstens +24 %)', je_stadt: { handel_gold_prozent: 2 }, max: 12 },
  { id: 'missionsgeist', kategorie: 'gruender', name: 'Missionsgeist', text: '+2 % Einfluss bei Stadtstaaten je Anhänger-Stadt (höchstens +30 %)', je_stadt: { einfluss_prozent: 2 }, max: 15 },
  { id: 'baumeister_gottes', kategorie: 'gruender', name: 'Baumeister Gottes', text: 'Wunder 2 % schneller je Anhänger-Stadt (höchstens 20 %)', je_stadt: { wunder_bauzeit_prozent: -2 }, max: 10 },
  // Anhänger: wirkt in jeder Stadt mit dieser Mehrheitsreligion
  { id: 'gemeinschaftsmahl', kategorie: 'anhaenger', name: 'Gemeinschaftsmahl', text: '+2 Nahrung in der Stadt', stadt: { nahrung: 2 } },
  { id: 'gebetsstunden', kategorie: 'anhaenger', name: 'Gebetsstunden', text: '+2 Zufriedenheit in der Stadt', stadt: { zufriedenheit: 2 } },
  { id: 'heilige_schriften', kategorie: 'anhaenger', name: 'Heilige Schriften', text: '+3 Wissenschaft in der Stadt', stadt: { wissenschaft: 3 } },
  { id: 'chorgesang', kategorie: 'anhaenger', name: 'Chorgesang', text: '+2 Kultur in der Stadt', stadt: { kultur: 2 } },
  { id: 'tempelmaerkte', kategorie: 'anhaenger', name: 'Tempelmärkte', text: '+3 Gold in der Stadt', stadt: { gold: 3 } },
  { id: 'fleissgebot', kategorie: 'anhaenger', name: 'Fleißgebot', text: '+2 Produktion in der Stadt', stadt: { produktion: 2 } },
  { id: 'feiertage', kategorie: 'anhaenger', name: 'Feiertage', text: '+10 % Kultur in der Stadt', stadt: { kultur_prozent: 10 } },
  { id: 'kloster_der_stille', kategorie: 'anhaenger', name: 'Kloster der Stille', text: '+10 % Wissenschaft in der Stadt', stadt: { wissenschaft_prozent: 10 } },
  { id: 'segen_der_saat', kategorie: 'anhaenger', name: 'Segen der Saat', text: '+10 % Nahrung in der Stadt', stadt: { nahrung_prozent: 10 } },
  { id: 'heilige_waffen', kategorie: 'anhaenger', name: 'Heilige Waffen', text: 'Stadt verteidigt sich stärker (+4)', stadt: { verteidigung: 4 } },
  { id: 'armenpflege', kategorie: 'anhaenger', name: 'Armenpflege', text: 'Stadt wächst schneller (10 % Nahrung bleibt)', stadt: { wachstum_behalt: 10 } },
  { id: 'wanderprediger', kategorie: 'anhaenger', name: 'Wanderprediger', text: 'Grenzen wachsen 15 % schneller', stadt: { grenzwachstum_prozent: 15 } },
  // Verehrung (beim Verstärken): starke Wirkung in jeder Anhänger-Stadt
  { id: 'grosse_tempel', kategorie: 'verehrung', name: 'Große Tempel', text: '+3 Kultur und +1 Zufriedenheit in Anhänger-Städten', stadt: { kultur: 3, zufriedenheit: 1 } },
  { id: 'pagoden', kategorie: 'verehrung', name: 'Pagoden', text: '+2 Zufriedenheit und +2 Wissenschaft in Anhänger-Städten', stadt: { zufriedenheit: 2, wissenschaft: 2 } },
  { id: 'kathedralen_des_lichts', kategorie: 'verehrung', name: 'Kathedralen des Lichts', text: '+15 % Kultur in Anhänger-Städten', stadt: { kultur_prozent: 15 } },
  { id: 'heilige_haine', kategorie: 'verehrung', name: 'Heilige Haine', text: '+4 Nahrung in Anhänger-Städten', stadt: { nahrung: 4 } },
  { id: 'lehrkloester', kategorie: 'verehrung', name: 'Lehrklöster', text: '+15 % Wissenschaft in Anhänger-Städten', stadt: { wissenschaft_prozent: 15 } },
  { id: 'opferhallen', kategorie: 'verehrung', name: 'Opferhallen', text: '+5 Gold in Anhänger-Städten', stadt: { gold: 5 } },
  { id: 'feuertuerme', kategorie: 'verehrung', name: 'Feuertürme', text: '+3 Produktion in Anhänger-Städten', stadt: { produktion: 3 } },
  { id: 'sternwarten_des_glaubens', kategorie: 'verehrung', name: 'Sternwarten des Glaubens', text: '+1 Sicht und +2 Wissenschaft in Anhänger-Städten', stadt: { sicht: 1, wissenschaft: 2 } },
  // Reformer (beim Verstärken): reichsweite Boni für den Gründer
  { id: 'gelehrte_orden', kategorie: 'reformer', name: 'Gelehrte Orden', text: '+6 % Wissenschaft im ganzen Reich', reich: { wissenschaft_prozent: 6 } },
  { id: 'bettelorden', kategorie: 'reformer', name: 'Bettelorden', text: '+2 Zufriedenheit in jeder Stadt', reich: { zufriedenheit: 2 } },
  { id: 'kirchenstaat', kategorie: 'reformer', name: 'Kirchenstaat', text: '+6 % Gold im ganzen Reich', reich: { gold_prozent: 6 } },
  { id: 'heiliger_krieg', kategorie: 'reformer', name: 'Heiliger Krieg', text: '+15 % Erfahrung, +30 Gold je gewonnenem Kampf', reich: { erfahrung_prozent: 15, sieg_gold: 30 } },
  { id: 'tempelbauer', kategorie: 'reformer', name: 'Tempelbauer', text: 'Distrikte 15 % schneller gebaut', reich: { distrikt_bauzeit_prozent: -15 } },
  { id: 'reformierte_lehre', kategorie: 'reformer', name: 'Reformierte Lehre', text: '+6 % Kultur im ganzen Reich', reich: { kultur_prozent: 6 } },
  { id: 'gruene_lehre', kategorie: 'reformer', name: 'Grüne Lehre', text: '+6 % Nahrung im ganzen Reich', reich: { nahrung_prozent: 6 } },
  { id: 'weltmission', kategorie: 'reformer', name: 'Weltmission', text: '+20 % Glaube, +1 Handelsroute', reich: { glaube_prozent: 20, handelsrouten: 1 } },
  { id: 'werkethik', kategorie: 'reformer', name: 'Werkethik', text: '+5 % Produktion im ganzen Reich', reich: { produktion_prozent: 5 } },
  { id: 'friedensfuersten', kategorie: 'reformer', name: 'Friedensfürsten', text: '+3 Stadtstärke und +10 % Stadt-Lebenspunkte', reich: { stadt_staerke: 3, stadt_hp: 50 } },
];

const nachId = (l) => Object.assign(Object.create(null), Object.fromEntries(l.map((x) => [x.id, x])));
export const PANTHEON = nachId(PANTHEONS);
export const RELIGION = nachId(RELIGIONEN);
export const GLAUBENSSATZ = nachId(GLAUBENSSAETZE);
