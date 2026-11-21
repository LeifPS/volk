// Zeitalter-Aufstieg: schlichte Einblendung in der Bildmitte (Name des Zeitalters) mit Trommel-Fanfare, wie in Civilization.
// Wird durch die Meldung { art: 'zeitalter', zeitalter: <neuer Index> } ausgelöst. Klick, Esc oder Enter schließen sofort.
import { el } from './basis.js';
import { ZEITALTER } from '../../shared/daten/zeitalter.js';
import { an, serverJetzt } from '../kern/zustand.js';
import { ton } from '../audio.js';

const WARTESCHLANGE = [];
let laeuft = false;

export function starteZeitalterAnimation() {
  an('meldungen', (liste) => {
    for (const m of liste) {
      // Nur frische Meldungen (nicht die alten beim Einloggen)
      if (m.art === 'zeitalter' && m.zeitalter != null && serverJetzt() - m.t < 2 * 60 * 1000) zeigeZeitalter(m.zeitalter);
    }
  });
}

export function zeigeZeitalter(index) {
  WARTESCHLANGE.push(index);
  if (!laeuft) naechste();
}

function naechste() {
  const index = WARTESCHLANGE.shift();
  if (index == null) { laeuft = false; return; }
  laeuft = true;
  abspielen(index, naechste);
}

function abspielen(index, fertig) {
  const za = ZEITALTER[Math.max(0, Math.min(ZEITALTER.length - 1, index))];
  const wurzel = el('div#zeitalter-ani',
    el('div.za-band',
      el('div.za-label', { text: 'Neues Zeitalter' }),
      el('div.za-name', { text: za.name })));
  document.body.append(wurzel);
  ton('zeitalter');
  let beendet = false;
  const schliessen = () => {
    if (beendet) return; beendet = true;
    clearTimeout(timer);
    removeEventListener('keydown', taste, true);
    wurzel.classList.add('raus');
    setTimeout(() => { wurzel.remove(); fertig(); }, 450);
  };
  const taste = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); schliessen(); } };
  addEventListener('keydown', taste, true);
  wurzel.addEventListener('click', schliessen);
  const timer = setTimeout(schliessen, 4200);
}
