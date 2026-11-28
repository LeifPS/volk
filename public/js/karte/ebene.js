// Welche Ebene der Client gerade zeigt (0 = Erde, 1 = Weltraum). Der Renderer, die Gelände-Kacheln, die Wege und die Minikarte
// zeichnen immer nur diese Ebene. Wechsel per Knopf, Taste oder automatisch beim Springen zu einem Feld der anderen Ebene.
import { EBENEN } from '../../shared/hex.js';

let aktiv = 0;
const hoerer = new Set();
/** Beschreibung der aktiven Ebene ({ nr, start, breite, hoehe, anzahl, name }). */
export const EB = () => EBENEN[aktiv];
export const aktiveEbene = () => aktiv;
/** Ebene wechseln; Hörer (Kamera, Minikarte, Knopf) werden benachrichtigt. */
export function setzeEbene(n) {
  n = n ? 1 : 0;
  if (n === aktiv) return;
  aktiv = n;
  for (const f of hoerer) f(n);
}
export function beiEbenenwechsel(f) { hoerer.add(f); }
