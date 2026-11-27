// Die Zeitalter (0 bis 6 seit der ersten Fassung, ab 7 seit dem Ausbau, siehe PLAN-ZEITALTER-8-11.md). farbe: Akzentfarbe im Forschungsbaum. stil: Schlüssel für die Zeitalter-Optik der Grafik.
export const ZEITALTER = [
  { id: 'antike', name: 'Antike', farbe: '#b9935a', stil: 'holz', beschreibung: 'Holzhütten, Lehmpfade, Bronze und die ersten Götter.' },
  { id: 'klassik', name: 'Klassik', farbe: '#c7b07a', stil: 'stein', beschreibung: 'Steinhäuser mit Ziegeldächern, Säulen, Straßen und Legionen.' },
  { id: 'mittelalter', name: 'Mittelalter', farbe: '#8f6f4e', stil: 'fachwerk', beschreibung: 'Fachwerk, Burgen, Ritter und Kathedralen.' },
  { id: 'renaissance', name: 'Renaissance', farbe: '#a05a4a', stil: 'putz', beschreibung: 'Verputzte Häuser, Kuppeln, Galeonen und Schießpulver.' },
  { id: 'industrie', name: 'Industrie', farbe: '#8a4b3a', stil: 'backstein', beschreibung: 'Backstein, Schornsteine, Gleise und Dampf.' },
  { id: 'moderne', name: 'Moderne', farbe: '#6a7c8c', stil: 'beton', beschreibung: 'Beton, Glas, Panzer und Flugzeuge.' },
  { id: 'atom', name: 'Atomzeit', farbe: '#4a8c8c', stil: 'hochhaus', beschreibung: 'Hochhäuser, Kühltürme, Raketen und das Atom.' },
  { id: 'ki', name: 'KI-Zeitalter', farbe: '#5b8cff', stil: 'smart', beschreibung: 'Glastürme, Drohnen und lernende Maschinen.' },
  { id: 'fusion', name: 'Fusionszeitalter', farbe: '#f2a33a', stil: 'fusion', beschreibung: 'Weiße Kuppeln, Plasma und Magnetbahnen.' },
  { id: 'weltraum', name: 'Weltraumzeitalter', farbe: '#8e7cc3', stil: 'orbital', beschreibung: 'Raumhäfen, Mondbasen und der Weg zu den Sternen.' },
  { id: 'sterne', name: 'Sternenzeitalter', farbe: '#e6eef7', stil: 'stern', beschreibung: 'Kristalltürme, Antimaterie und Schiffe für Generationen.' },
];
export const ZEITALTER_IDS = ZEITALTER.map((z) => z.id);
