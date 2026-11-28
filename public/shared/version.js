// Version von Spielcode und Netzprotokoll. Server und Client vergleichen sie beim Verbinden:
// Weicht sie ab (der Server wurde neu deployt, im Browser läuft noch der alte Code), lädt der Client die Seite neu.
// Bei jeder Änderung an Protokoll, Daten oder Engine erhöhen.
export const SPIEL_VERSION = '1.7.0';
