// Zentrale Datei für die Texte der Oberfläche (nur Deutsch). Spielinhalte (Namen, Beschreibungen) stehen in public/shared/daten/.
export const T = {
  spielname: 'Volk',
  untertitel: 'Baue dein Volk in einer lebendigen Welt',
  ja: 'Ja', nein: 'Nein', ok: 'OK', abbrechen: 'Abbrechen', schliessen: 'Schließen', schliessenTip: 'Fenster schließen (Esc)', zurueck: 'Zurück', weiter: 'Weiter',
  // Anmeldung
  anmelden: 'Anmelden', registrieren: 'Neues Konto', benutzername: 'Benutzername (zum Anmelden)', passwort: 'Passwort',
  kontoHinweis: 'Der Benutzername ist nur zum Anmelden. Den Namen deines Volkes wählst du gleich danach.',
  passwortHinweis: 'Mindestens 6 Zeichen. Vergessen? Nur der Admin kann es zurücksetzen.',
  demo: 'Demo ansehen (ohne Konto)', verbinde: 'Verbinde mit der Welt …', abmelden: 'Abmelden',
  volkGruenden: 'Gründe dein Volk', volksname: 'Name deines Volkes', volksnameHinweis: 'So sehen dich alle anderen im Spiel (3 bis 24 Zeichen).',
  farbe: 'Farbe deines Volkes', farbeHinweis: 'Ausgegraute Farben sind schon vergeben oder zu ähnlich. Du kannst auch eine eigene Farbe wählen.',
  eigeneFarbe: 'Eigene Farbe', losGehts: 'Los geht’s!',
  // Leiste
  gold: 'Gold', wissenschaft: 'Wissenschaft', kultur: 'Kultur', zufriedenheit: 'Zufriedenheit', zeitalter: 'Zeitalter',
  goldTip: 'Gold: dein Schatz. Einkommen pro Stunde = Einnahmen minus Unterhalt. Klicken für die Aufschlüsselung.',
  wissenschaftTip: 'Wissenschaft: Jeder Punkt macht deine Forschung 1 % schneller.',
  kulturTip: 'Kultur lässt die Grenzen deiner Städte wachsen.',
  lagerTip: (name, cap) => `${name} im Reichslager (Lager fasst ${cap}). Pro Stunde kommt die angezeigte Menge dazu.`,
  menue: { forschung: 'Forschung (F1)', staedte: 'Reich und Städte (F2)', diplomatie: 'Diplomatie und Handel (F3)', rangliste: 'Rangliste (F4)', lexikon: 'Lexikon (F5)', hilfe: 'Was soll ich tun? (H)', einstellungen: 'Einstellungen', meldungen: 'Meldungen (N)' },
  keineForschung: 'Keine Forschung aktiv – klicke hier!',
  naechste: 'Nächste Aktion', naechsteTip: 'Springt zur nächsten Einheit oder Stadt, die einen Befehl braucht (Leertaste).',
  // Einheiten
  befehle: {
    bewegen: 'Bewegen', angreifen: 'Angreifen', gruenden: 'Stadt gründen', arbeiten: 'Bauen', auto_arbeit: 'Automatisch arbeiten', erkunden: 'Automatisch erkunden',
    befestigen: 'Befestigen', schlafen: 'Schlafen', wach: 'Aufwecken', anhalten: 'Anhalten', aufloesen: 'Auflösen', aufruesten: 'Aufrüsten', befoerdern: 'Befördern',
    handel: 'Handelsroute', pluendern: 'Plündern', luftangriff: 'Luftangriff', verlegen: 'Verlegen', atomschlag: 'Atomschlag',
  },
  befehlTips: {
    bewegen: 'Rechtsklick (Tablet: lange drücken) auf ein Feld schickt die Einheit dorthin. Vorher siehst du die Ankunftszeit.',
    angreifen: 'Rechtsklick auf einen Gegner zeigt eine Kampfvorschau. Kämpfe passieren nur auf deinen Befehl.',
    gruenden: 'Gründet hier eine neue Stadt. Der Siedler wird dabei verbraucht.',
    arbeiten: 'Baut eine Verbesserung auf diesem Feld (nur innerhalb deiner Grenzen).',
    auto_arbeit: 'Der Arbeiter sucht sich selbst sinnvolle Aufgaben.',
    erkunden: 'Die Einheit erkundet selbstständig unbekanntes Land.',
    befestigen: 'Die Einheit gräbt sich ein: +4 Verteidigung (nach 10 Minuten).',
    schlafen: 'Die Einheit wartet und wird bei "Nächste Aktion" übersprungen.',
    aufloesen: 'Löst die Einheit auf. Du bekommst einen Teil des Goldes zurück.',
    aufruesten: 'Rüstet die Einheit gegen Gold auf die neuere Version auf (nur im eigenen Gebiet).',
    handel: 'Wähle eine Zielstadt. Die Karawane pendelt dann und bringt dauerhaft Gold.',
    pluendern: 'Zerstört die feindliche Verbesserung auf diesem Feld vorübergehend und bringt Gold (nur im Krieg).',
  },
  // Kampf
  kampfvorschau: 'Kampfvorschau', angriffBestaetigen: 'Angreifen!', dein: 'Dein', gegner: 'Gegner', erwarteterSchaden: 'Erwarteter Schaden',
  // Allgemein
  verbindungWeg: 'Verbindung unterbrochen – verbinde neu …', verbindungDa: 'Wieder verbunden.',
  sitzungAbgelaufen: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  waehrendWeg: 'Während du weg warst',
  neulingsschutz: (rest) => `Neulingsschutz: noch ${rest}. In dieser Zeit kann dich niemand angreifen, und du kannst niemanden angreifen.`,
};
