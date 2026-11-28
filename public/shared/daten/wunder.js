// Weltwunder: jedes gibt es nur einmal pro Server. Wer es zuerst fertigstellt, bekommt es;
// alle anderen erhalten ihr eingesetztes Material zurück. Format siehe DATENFORMAT.md.
// reich: reichsweite Boni (Bonus-Schlüssel), wirkung: zusätzliche Wirkung in der Stadt des Wunders.

const STD = 3600;
const TAG = 24 * STD;

// platz: Regel für das Feld im Stadtgebiet, auf dem das Wunder steht (Weltwunder werden auf Feldern platziert, siehe engine/bau.js):
//   land / wasser / flach (Land, Höhe flach) / gelaende (Liste) / fluss / kueste (Landfeld am Wasser) / rand (Grenzfeld des Stadtgebiets), text für die Anzeige.
export const WUNDER = [
  {
    id: 'pyramiden', name: 'Pyramiden', zeitalter: 0, kategorie: 'produktion',
    beschreibung: 'Gewaltige Grabmäler aus Stein. Deine Arbeiter bauen schneller und alle Bauaufträge gehen flotter voran.',
    kosten: { zeit: 6 * STD, gold: 400, stein: 300, marmor: 15 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { flach: true, gelaende: ['wueste', 'ebene', 'savanne', 'grasland', 'salzebene'], text: 'auf flachem, trockenem Land (Wüste, Ebene, Savanne, Grasland)' },
    reich: { arbeiter_tempo: 25, bauzeit_prozent: -10 },
    wirkung: { kultur: 2, produktion: 2 },
  },
  {
    id: 'grosse_bibliothek', name: 'Große Bibliothek', zeitalter: 1, kategorie: 'wissen',
    beschreibung: 'Alles Wissen der Welt an einem Ort. Dein ganzes Reich forscht schneller.',
    kosten: { zeit: 10 * STD, gold: 800, stein: 250, holz: 150, marmor: 25 }, unterhalt: 0, benoetigt: ['bibliothek'], ersetzt: null,
    platz: { land: true, text: 'auf einem Landfeld' },
    reich: { wissenschaft_prozent: 10 },
    wirkung: { wissenschaft: 6, kultur: 2 },
  },
  {
    id: 'koloss', name: 'Koloss', zeitalter: 1, kategorie: 'gold', braucht_kueste: true,
    beschreibung: 'Eine riesige Bronzestatue über der Hafeneinfahrt. Handelsrouten bringen viel mehr Gold, und du kannst eine Route mehr betreiben.',
    kosten: { zeit: 10 * STD, gold: 800, stein: 200, marmor: 25, kupfer: 5, zinn: 3 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { wasser: true, gelaende: ['kueste'], text: 'auf einem Küstenfeld im Wasser' },
    reich: { handel_gold_prozent: 25, handelsrouten: 1, gold_prozent: 5 },
    wirkung: { gold: 5 },
  },
  {
    id: 'grosse_mauer', name: 'Große Mauer', zeitalter: 2, kategorie: 'verteidigung',
    beschreibung: 'Ein endloser Wall entlang der Grenze. Alle deine Städte sind stärker und halten mehr aus.',
    kosten: { zeit: 18 * STD, gold: 1400, stein: 600, marmor: 35 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { land: true, rand: true, text: 'an der Grenze des Stadtgebiets' },
    reich: { stadt_staerke: 5, stadt_hp: 75, grenzwachstum_prozent: 10 },
    wirkung: { verteidigung: 10 },
  },
  {
    id: 'taj_mahal', name: 'Taj Mahal', zeitalter: 3, kategorie: 'kultur',
    beschreibung: 'Ein Palast aus weißem Marmor, schöner als alles andere. Alle Städte sind zufriedener und schaffen mehr Kultur.',
    kosten: { zeit: 30 * STD, gold: 2400, stein: 400, marmor: 60 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { land: true, fluss: true, text: 'an einem Fluss' },
    reich: { zufriedenheit: 2, kultur_prozent: 15 },
    wirkung: { kultur: 6 },
  },
  {
    id: 'kristallpalast', name: 'Kristallpalast', zeitalter: 4, kategorie: 'produktion',
    beschreibung: 'Eine Halle aus Glas und Eisen, Schaufenster der Industrie. Jede deiner Städte kann einen Bauauftrag mehr gleichzeitig ausführen.',
    kosten: { zeit: 45 * STD, gold: 4000, stein: 500, marmor: 70, eisen: 10 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { flach: true, text: 'auf flachem Land' },
    reich: { bauplaetze: 1, produktion_prozent: 10 },
    wirkung: { produktion: 5, kultur: 3 },
  },
  {
    id: 'freiheitsstatue', name: 'Freiheitsstatue', zeitalter: 5, kategorie: 'zufriedenheit',
    beschreibung: 'Ein Leuchtfeuer der Freiheit. Alle Städte sind zufriedener, erwirtschaften mehr Gold, und der Unterhalt sinkt.',
    kosten: { zeit: 2.5 * TAG, gold: 7000, stein: 600, marmor: 90, eisen: 10 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { land: true, kueste: true, text: 'an der Küste' },
    reich: { zufriedenheit: 3, gold_prozent: 10, unterhalt_rabatt: 15 },
    wirkung: { kultur: 6 },
  },
  {
    id: 'internationale_raumstation', name: 'Internationale Raumstation', zeitalter: 6, kategorie: 'wissen',
    beschreibung: 'Ein Labor im Weltall. Dein ganzes Reich forscht deutlich schneller, und deine Einheiten sehen weiter.',
    kosten: { zeit: 4 * TAG, gold: 12000, stein: 800, marmor: 120, aluminium: 15 }, unterhalt: 0, benoetigt: [], ersetzt: null,
    platz: { flach: true, text: 'auf flachem Land' },
    reich: { wissenschaft_prozent: 20, sicht: 1 },
    wirkung: { wissenschaft: 20 },
  },
  {
    id: 'weltgehirn', name: 'Weltgehirn', zeitalter: 7, kategorie: 'wissen',
    beschreibung: 'Ein gewaltiges Netz verbindet das Wissen aller Städte. Dein Reich forscht, baut und lernt schneller.',
    kosten: { zeit: 5 * TAG, gold: 15000, stein: 800, marmor: 130, seltene_erden: 10 }, unterhalt: 0, benoetigt: ['ki_labor'], ersetzt: null,
    platz: { land: true, text: 'auf einem Landfeld' },
    reich: { wissenschaft_prozent: 25, produktion_prozent: 5, erfahrung_prozent: 10 },
    wirkung: { wissenschaft: 30 },
  },
  {
    id: 'kuenstliche_sonne', name: 'Künstliche Sonne', zeitalter: 8, kategorie: 'produktion',
    beschreibung: 'Ein Stern von Menschenhand. Mehr Produktion und Nahrung im ganzen Reich, weniger Unterhalt.',
    kosten: { zeit: 6 * TAG, gold: 20000, stein: 900, marmor: 150, deuterium: 12 }, unterhalt: 0, benoetigt: ['fusionsreaktor'], ersetzt: null,
    platz: { flach: true, text: 'auf flachem Land' },
    reich: { produktion_prozent: 20, nahrung_prozent: 10, unterhalt_rabatt: 20 },
    wirkung: { produktion: 25 },
  },
  {
    id: 'weltraumaufzug', name: 'Weltraumaufzug', zeitalter: 9, kategorie: 'gold',
    beschreibung: 'Ein Seil bis in den Himmel. Dein Reich baut schneller, hat mehr Handelsrouten und verdient mehr am Handel.',
    kosten: { zeit: 7 * TAG, gold: 28000, stein: 1000, marmor: 170, titan: 15, deuterium: 10 }, unterhalt: 0, benoetigt: ['raumhafen'], ersetzt: null,
    platz: { flach: true, text: 'auf flachem Land' },
    reich: { bauzeit_prozent: -15, handelsrouten: 2, handel_gold_prozent: 20 },
    wirkung: { gold: 25 },
  },
  {
    id: 'sternenarche', name: 'Sternenarche', zeitalter: 10, kategorie: 'kultur',
    beschreibung: 'Ein Generationenschiff für die Reise zu fremden Sternen. Das größte Ziel und der größte Stolz eines Volkes.',
    kosten: { zeit: 8 * TAG, gold: 40000, stein: 1200, marmor: 200, titan: 20, antimaterie: 10 }, unterhalt: 0, benoetigt: ['sternenhafen'], ersetzt: null,
    platz: { flach: true, text: 'auf flachem Land' },
    reich: { kultur_prozent: 20, wissenschaft_prozent: 10, zufriedenheit: 4, stadt_staerke: 5 },
    wirkung: { kultur: 30, wissenschaft: 20 },
  },
];
