// Ton (vorläufig): wird durch die Chiptune-Engine ersetzt.
let ctx = null;
export function tonStarten() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } } }
export function ton(art) {}
export function musikZeitalter(z) {}
export function einstellungenSetzen(o) {}
