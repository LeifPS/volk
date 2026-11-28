// Der Civics-Baum von Volk: der Kulturfortschritt, ein zweiter Baum neben der Forschung, gespeist von Kultur.
// Dazu die Regierungen und Politikkarten, die Civics freischalten.
//
// Die Tabelle unten ist kompakt geschrieben und wird beim Laden in das Standardformat umgewandelt:
//   [id, name, spalte, voraussetzungen, freischaltet, beschreibung]
// freischaltet-Kurzschrift: 'k:id' Politikkarte, 'r:id' Regierung, 'b:schluessel=wert' reichsweiter Bonus, 'o:id' Option.
// zeitalter und kosten ergeben sich aus der Spalte (siehe CIVIC_SPALTEN_ZEITALTER und CIVIC_KOSTEN_JE_SPALTE).

/** Erste Spalte jedes Zeitalters (Antike 0-3, Klassik 4-7, Mittelalter 8-11, Renaissance 12-15, Industrie 16-19, Moderne 20-23,
 *  Atomzeit 24-27, KI-Zeitalter 28-30, Fusionszeitalter 31-33, Weltraumzeitalter 34-36, Sternenzeitalter 37-39). */
export const CIVIC_SPALTEN_ZEITALTER = [0, 4, 8, 12, 16, 20, 24, 28, 31, 34, 37];

/** Kosten in Kulturpunkten je Spalte (Länge 40). */
export const CIVIC_KOSTEN_JE_SPALTE = [
  // Stufe 13 (Balance): frühe Zeitalter billiger, weil die Forschung dort sehr schnell ist und der Kulturbaum sonst
  // mehr als ein Zeitalter zurückliegt (vorher: Antike 40-100, Klassik 130-270, Mittelalter 335-590, Renaissance 700-1090,
  // Industrie 1240-1780, Moderne 2000-2700).
  25, 35, 45, 60, // Antike
  80, 105, 135, 170, // Klassik
  215, 265, 320, 385, // Mittelalter
  470, 560, 650, 750, // Renaissance
  880, 1000, 1140, 1290, // Industrie
  1650, 1850, 2060, 2280, // Moderne
  2900, 3050, 3200, 3400, // Atomzeit
  3650, 3950, 4300, // KI-Zeitalter
  4700, 5100, 5550, // Fusionszeitalter
  6000, 6500, 7000, // Weltraumzeitalter
  8400, 9000, 9800, // Sternenzeitalter
];

const ROH = [
  // ======================= ANTIKE (Spalten 0-3) =======================
  // Spalte 0 – Start-Civics
  ['stammesgesetze', 'Stammesgesetze', 0, [], ['r:stammesordnung', 'k:kriegerehre'], 'Ungeschriebene Regeln halten die Sippe zusammen und geben ihr den ersten Anführer.'],
  ['erzaehlkunst', 'Erzählkunst am Feuer', 0, [], ['k:lagerfeuergeschichten'], 'Abends am Feuer werden die Taten der Ahnen erzählt und nie vergessen.'],
  // Spalte 1
  ['handwerksbrauch', 'Handwerksbrauch', 1, ['stammesgesetze'], ['k:gemeinschaftsarbeit'], 'Wer ein Handwerk beherrscht, gibt es an die Jüngeren weiter.'],
  ['wachdienst', 'Wachdienst der Sippe', 1, ['stammesgesetze'], ['k:dorfwache'], 'Nachts hält immer jemand Wache, damit alle ruhig schlafen.'],
  ['ahnenverehrung', 'Ahnenverehrung', 1, ['erzaehlkunst'], ['b:glaube_prozent=3'], 'Die Verstorbenen bleiben Teil der Familie und werden um Rat gebeten.'],
  ['tauschsitten', 'Tauschsitten', 1, ['erzaehlkunst', 'stammesgesetze'], ['k:tauschmarkt'], 'Feste Regeln machen den Tausch zwischen Fremden sicher.'],
  // Spalte 2
  ['beuterecht', 'Beuterecht', 2, ['wachdienst'], ['k:beutezug'], 'Was im Kampf erobert wird, wird gerecht unter den Kriegern geteilt.'],
  ['aeltestenrat', 'Ältestenrat', 2, ['handwerksbrauch', 'ahnenverehrung'], ['k:landnahme'], 'Die Erfahrensten entscheiden gemeinsam, wohin das Volk zieht.'],
  ['mythen', 'Mythen und Sagen', 2, ['ahnenverehrung'], ['b:kultur_prozent=3'], 'Geschichten von Göttern und Helden geben dem Volk ein gemeinsames Bild der Welt.'],
  ['gastrecht', 'Gastrecht', 2, ['tauschsitten'], ['k:gastfreundschaft'], 'Wer als Gast kommt, steht unter dem Schutz des ganzen Dorfes.'],
  // Spalte 3
  ['erbliche_herrschaft', 'Erbliche Herrschaft', 3, ['aeltestenrat', 'beuterecht'], ['r:koenigtum'], 'Die Macht geht vom Vater auf den Sohn über, und mit ihr eine Krone.'],
  ['kriegerbuende', 'Kriegerbünde', 3, ['beuterecht'], ['k:speerdrill'], 'Junge Krieger schwören einander Treue und üben jeden Tag gemeinsam.'],
  ['ackerrecht', 'Ackerrecht', 3, ['handwerksbrauch', 'gastrecht'], ['b:nahrung_prozent=3'], 'Jede Familie weiß, welches Feld ihr gehört und wann geerntet wird.'],
  ['opferriten', 'Opferriten', 3, ['mythen'], ['b:glaube_prozent=3', 'b:zufriedenheit=1'], 'Gaben an die Götter sollen Regen, Ernte und Frieden bringen.'],

  // ======================= KLASSIK (Spalten 4-7) =======================
  // Spalte 4
  ['geschriebenes_recht', 'Geschriebenes Recht', 4, ['erbliche_herrschaft', 'ackerrecht'], ['b:grenzwachstum_prozent=5', 'b:gold_prozent=2'], 'In Stein gemeißelte Gesetze gelten für alle gleich.'],
  ['heerwesen', 'Heerwesen', 4, ['kriegerbuende'], ['k:landwehr'], 'Aus Kriegerhaufen werden geordnete Truppen mit Rang und Sold.'],
  ['schauspielkunst', 'Schauspielkunst', 4, ['mythen', 'gastrecht'], ['b:kultur_prozent=3'], 'Auf der Bühne werden alte Sagen für alle lebendig.'],
  // Spalte 5
  ['buergerrecht', 'Bürgerrecht', 5, ['geschriebenes_recht'], ['b:zufriedenheit=1'], 'Wer Bürger ist, hat Rechte, und die Stadt wird zu seiner Heimat.'],
  ['strassenrecht', 'Straßenrecht', 5, ['geschriebenes_recht', 'heerwesen'], ['k:heerstrassen'], 'Wer eine Straße baut, muss sie pflegen, und jeder darf sie benutzen.'],
  ['denkschulen', 'Denkschulen', 5, ['schauspielkunst'], ['k:akademiefoerderung'], 'Lehrer und Schüler streiten auf dem Marktplatz über das Wesen der Dinge.'],
  ['tempeldienst', 'Tempeldienst', 5, ['opferriten', 'schauspielkunst'], ['k:heilige_haine'], 'Priester pflegen die heiligen Stätten das ganze Jahr hindurch.'],
  // Spalte 6
  ['volksversammlung', 'Volksversammlung', 6, ['buergerrecht', 'denkschulen'], ['r:republik'], 'Die Bürger stimmen auf dem Platz selbst über ihre Gesetze ab.'],
  ['grenzlegionen', 'Grenzlegionen', 6, ['strassenrecht'], ['b:heilung_prozent=5', 'b:erfahrung_prozent=3'], 'Feste Lager an der Grenze halten Truppen gesund und kampfbereit.'],
  ['muenzwesen', 'Münzwesen', 6, ['tauschsitten', 'geschriebenes_recht'], ['b:gold_prozent=4'], 'Geprägte Münzen mit dem Bild des Herrschers ersetzen den Tausch.'],
  // Spalte 7
  ['gesandtschaften', 'Gesandtschaften', 7, ['volksversammlung', 'muenzwesen'], ['k:botschafter'], 'Kluge Boten reisen an fremde Höfe und knüpfen Bündnisse.'],
  ['triumphzuege', 'Triumphzüge', 7, ['grenzlegionen'], ['k:triumph'], 'Siegreiche Heerführer ziehen mit ihrer Beute jubelnd durch die Hauptstadt.'],
  ['bauordnung', 'Bauordnung', 7, ['strassenrecht', 'muenzwesen'], ['k:distriktplanung'], 'Baumeister planen ganze Stadtteile, statt Haus an Haus zu reihen.'],

  // ======================= MITTELALTER (Spalten 8-11) =======================
  // Spalte 8
  ['lehnswesen', 'Lehnswesen', 8, ['triumphzuege', 'bauordnung'], ['k:lehnsdienst'], 'Land gegen Treue: Vasallen stellen ihrem Herrn Truppen.'],
  ['kloesterliches_leben', 'Klösterliches Leben', 8, ['tempeldienst', 'denkschulen'], ['k:klosterschulen'], 'Hinter Klostermauern wird gebetet, gearbeitet und Wissen abgeschrieben.'],
  ['stadtrecht', 'Stadtrecht', 8, ['volksversammlung', 'bauordnung'], ['b:handelsrouten=1'], 'Stadtluft macht frei: Städte regeln Markt und Handel selbst.'],
  // Spalte 9
  ['gottesgnadentum', 'Gottesgnadentum', 9, ['kloesterliches_leben', 'lehnswesen'], ['r:theokratie'], 'Der Herrscher regiert im Auftrag des Himmels, und der Glaube führt den Staat.'],
  ['ritterorden', 'Ritterorden', 9, ['lehnswesen'], ['b:erfahrung_prozent=5'], 'Ritter geloben Tapferkeit und üben ihr Leben lang den Kampf.'],
  ['zunftwesen', 'Zunftwesen', 9, ['stadtrecht'], ['k:zunftordnung'], 'Meister wachen über Preise, Lehrlinge und die Güte der Ware.'],
  ['minnesang', 'Minnesang', 9, ['gesandtschaften', 'kloesterliches_leben'], ['b:kultur_prozent=4'], 'Fahrende Sänger tragen Lieder von Burg zu Burg.'],
  // Spalte 10
  ['burgfrieden', 'Burgfrieden', 10, ['ritterorden', 'stadtrecht'], ['k:wehrhafte_mauern'], 'Innerhalb der Mauern ist jeder Streit verboten, alle verteidigen gemeinsam.'],
  ['kirchenzehnt', 'Kirchenzehnt', 10, ['gottesgnadentum'], ['b:glaube_prozent=4'], 'Ein Zehntel jeder Ernte gehört den Tempeln und Klöstern.'],
  ['staedtebund', 'Städtebund', 10, ['zunftwesen', 'gesandtschaften'], ['k:handelskontore'], 'Handelsstädte schließen sich zusammen und schützen ihre Kaufleute.'],
  // Spalte 11
  ['glaubensheere', 'Glaubensheere', 11, ['kirchenzehnt', 'burgfrieden'], ['b:pluendern_prozent=10', 'b:glaube_prozent=2'], 'Im Namen des Glaubens ziehen Heere in ferne Länder.'],
  ['schreibstuben', 'Schreibstuben', 11, ['minnesang', 'kloesterliches_leben'], ['b:wissenschaft_prozent=3'], 'Schreiber kopieren alte Werke, damit kein Wissen verloren geht.'],
  ['landfrieden', 'Landfrieden', 11, ['burgfrieden', 'staedtebund'], ['k:geleitschutz'], 'Fehden werden verboten, damit Händler sicher reisen können.'],

  // ======================= RENAISSANCE (Spalten 12-15) =======================
  // Spalte 12
  ['humanismus', 'Humanismus', 12, ['schreibstuben'], ['k:maezene'], 'Der Mensch und seine Fähigkeiten rücken in den Mittelpunkt des Denkens.'],
  ['seerecht', 'Seerecht', 12, ['landfrieden', 'staedtebund'], ['k:flottenmanoever'], 'Feste Regeln für Häfen, Schiffe und Ladungen beleben die Meere.'],
  ['soeldnerwesen', 'Söldnerwesen', 12, ['glaubensheere'], ['k:soldvertraege'], 'Wer gut zahlt, bekommt erfahrene Kämpfer für jeden Feldzug.'],
  // Spalte 13
  ['kaufmannsrat', 'Kaufmannsrat', 13, ['seerecht', 'zunftwesen'], ['r:handelsrepublik'], 'Die reichsten Handelshäuser lenken gemeinsam die Geschicke des Staates.'],
  ['flugschriften', 'Flugschriften', 13, ['humanismus'], ['k:flugblaetter'], 'Gedruckte Blätter tragen neue Ideen schneller als jeder Bote.'],
  ['glaubensstreit', 'Glaubensstreit', 13, ['kirchenzehnt', 'humanismus'], ['b:glaube_prozent=4', 'b:wissenschaft_prozent=2'], 'Neue Lehren fordern die alten heraus, und das Volk denkt selbst nach.'],
  // Spalte 14
  ['absolutismus', 'Absolutismus', 14, ['kaufmannsrat', 'soeldnerwesen'], ['k:hofstaat'], 'Der Herrscher vereint alle Macht in seiner Hand und glänzt am prächtigen Hof.'],
  ['entdeckerfahrten', 'Entdeckerfahrten', 14, ['seerecht'], ['b:sicht=1', 'b:tempo_see=3'], 'Mutige Kapitäne segeln über den Rand der bekannten Karten hinaus.'],
  ['gelehrtengesellschaften', 'Gelehrtengesellschaften', 14, ['humanismus', 'flugschriften'], ['k:forschungsstipendien'], 'Forscher treffen sich, tauschen Briefe und prüfen gegenseitig ihre Ideen.'],
  // Spalte 15
  ['merkantilismus', 'Merkantilismus', 15, ['kaufmannsrat', 'entdeckerfahrten'], ['b:gold_prozent=4'], 'Mehr verkaufen als einkaufen: Der Staatsschatz soll stetig wachsen.'],
  ['stehendes_heer', 'Stehendes Heer', 15, ['absolutismus', 'soeldnerwesen'], ['k:exerzierplatz'], 'Ein Heer, das auch im Frieden bereitsteht, übt Tag für Tag.'],
  ['voelkerrecht', 'Völkerrecht', 15, ['absolutismus', 'gelehrtengesellschaften'], ['k:staendige_vertretung'], 'Auch zwischen Völkern gelten Regeln, selbst im Krieg.'],

  // ======================= INDUSTRIE (Spalten 16-19) =======================
  // Spalte 16
  ['aufklaerung', 'Aufklärung', 16, ['voelkerrecht', 'gelehrtengesellschaften'], ['b:wissenschaft_prozent=4'], 'Habe Mut, dich deines eigenen Verstandes zu bedienen.'],
  ['freihandel', 'Freihandel', 16, ['merkantilismus'], ['k:zollfreiheit'], 'Fallen die Zölle, fließen die Waren und mit ihnen das Gold.'],
  ['arbeitsteilung', 'Arbeitsteilung', 16, ['merkantilismus', 'glaubensstreit'], ['k:fabrikordnung'], 'Jeder macht nur einen Handgriff, und gemeinsam entsteht viel mehr.'],
  // Spalte 17
  ['volksbewaffnung', 'Volksbewaffnung', 17, ['stehendes_heer', 'aufklaerung'], ['k:allgemeine_wehrpflicht'], 'Die Verteidigung des Landes wird zur Pflicht jedes Bürgers.'],
  ['buergerliche_freiheiten', 'Bürgerliche Freiheiten', 17, ['aufklaerung'], ['b:zufriedenheit=1', 'b:kultur_prozent=2'], 'Rede, Glaube und Versammlung sind frei, und das Volk atmet auf.'],
  ['ueberseehandel', 'Überseehandel', 17, ['freihandel', 'entdeckerfahrten'], ['b:handelsrouten=1'], 'Handelsflotten verbinden ferne Häfen zu einem Netz aus Waren.'],
  // Spalte 18
  ['verfassungsstaat', 'Verfassungsstaat', 18, ['buergerliche_freiheiten', 'volksbewaffnung'], ['r:demokratie'], 'Eine Verfassung bindet auch die Mächtigen, und das Volk wählt seine Vertreter.'],
  ['armenfuersorge', 'Armenfürsorge', 18, ['buergerliche_freiheiten', 'arbeitsteilung'], ['b:nahrung_prozent=3', 'b:zufriedenheit=1'], 'Die Stadt sorgt dafür, dass niemand auf der Straße hungern muss.'],
  ['generalstab', 'Generalstab', 18, ['volksbewaffnung'], ['b:erfahrung_prozent=5'], 'Offiziere planen Feldzüge am Kartentisch, lange bevor der erste Schuss fällt.'],
  // Spalte 19
  ['nationalgefuehl', 'Nationalgefühl', 19, ['verfassungsstaat', 'generalstab'], ['k:vaterlandsliebe'], 'Eine Sprache, eine Fahne, eine Geschichte: Das Volk fühlt sich als Ganzes.'],
  ['eisenbahngesellschaften', 'Eisenbahngesellschaften', 19, ['ueberseehandel', 'arbeitsteilung'], ['k:schienennetz'], 'Kühne Unternehmer verbinden das Land mit Schienen.'],
  ['romantik', 'Romantik', 19, ['armenfuersorge', 'buergerliche_freiheiten'], ['b:kultur_prozent=4'], 'Dichter und Maler suchen das Gefühl in Natur, Sage und Heimat.'],

  // ======================= MODERNE (Spalten 20-23) =======================
  // Spalte 20
  ['arbeiterbewegung', 'Arbeiterbewegung', 20, ['armenfuersorge', 'eisenbahngesellschaften'], ['b:produktion_prozent=3', 'b:zufriedenheit=1'], 'Arbeiter schließen sich zusammen und erkämpfen bessere Bedingungen.'],
  ['massenpresse', 'Massenpresse', 20, ['nationalgefuehl', 'romantik'], ['k:staatspropaganda'], 'Billige Zeitungen erreichen jeden Haushalt, und mit ihnen jede Botschaft.'],
  ['grossindustrie', 'Großindustrie', 20, ['eisenbahngesellschaften', 'arbeitsteilung'], ['k:akkordarbeit'], 'Riesige Werke beschäftigen Tausende und bauen in Tagen, was früher Monate dauerte.'],
  // Spalte 21
  ['notstandsgesetze', 'Notstandsgesetze', 21, ['nationalgefuehl', 'generalstab'], ['r:diktatur'], 'In der Krise übernimmt eine Hand die ganze Macht, angeblich nur für kurze Zeit.'],
  ['sozialversicherung', 'Sozialversicherung', 21, ['arbeiterbewegung'], ['b:zufriedenheit=1', 'b:nahrung_prozent=3'], 'Krankheit und Alter werden gemeinsam abgesichert.'],
  ['staedtebau', 'Städtebau', 21, ['grossindustrie', 'massenpresse'], ['k:wohnviertel'], 'Planer entwerfen helle, gesunde Wohnviertel für die wachsenden Städte.'],
  // Spalte 22
  ['kriegswirtschaft', 'Kriegswirtschaft', 22, ['notstandsgesetze', 'grossindustrie'], ['k:ruestungsproduktion'], 'Alle Fabriken arbeiten für die Front, und Waffen rollen am Fließband.'],
  ['staatengemeinschaft', 'Staatengemeinschaft', 22, ['massenpresse', 'voelkerrecht'], ['k:schiedsgericht'], 'Die Völker gründen einen gemeinsamen Rat, um Kriege zu verhindern.'],
  ['avantgarde', 'Avantgarde', 22, ['staedtebau', 'massenpresse'], ['b:kultur_prozent=4', 'b:kultur_je_distrikt=1'], 'Kühne Künstler brechen mit allen Regeln und erfinden die Kunst neu.'],
  // Spalte 23
  ['rundfunkwesen', 'Rundfunkwesen', 23, ['avantgarde', 'staatengemeinschaft'], ['b:zufriedenheit=1', 'b:einfluss_prozent=5'], 'Aus jedem Wohnzimmer klingen Nachrichten, Hörspiele und Musik.'],
  ['luftkriegsdoktrin', 'Luftkriegsdoktrin', 23, ['kriegswirtschaft'], ['b:sicht=1', 'b:erfahrung_prozent=3'], 'Wer den Himmel beherrscht, sieht den Feind lange vor dem Kampf.'],

  // ======================= ATOMZEIT (Spalten 24-27) =======================
  // Spalte 24
  ['abschreckung', 'Abschreckung', 24, ['luftkriegsdoktrin', 'staatengemeinschaft'], ['k:wehrbereitschaft'], 'Wer stark genug ist, muss nicht kämpfen: Niemand wagt den ersten Schlag.'],
  ['wohlfahrtsstaat', 'Wohlfahrtsstaat', 24, ['sozialversicherung', 'rundfunkwesen'], ['b:nahrung_prozent=4', 'b:zufriedenheit=1'], 'Der Staat sorgt für Bildung, Gesundheit und Wohnung für alle.'],
  ['grossforschung', 'Großforschung', 24, ['staedtebau', 'avantgarde'], ['k:forschungszentren'], 'Tausende Forscher arbeiten gemeinsam an den großen Fragen der Zeit.'],
  // Spalte 25
  ['blockfreiheit', 'Blockfreiheit', 25, ['abschreckung'], ['b:einfluss_prozent=5', 'b:stadt_staerke=3'], 'Zwischen den großen Mächten geht das Volk seinen eigenen Weg.'],
  ['konsumgesellschaft', 'Konsumgesellschaft', 25, ['wohlfahrtsstaat', 'rundfunkwesen'], ['k:kaufhaeuser'], 'Volle Schaufenster und bunte Werbung locken die Menschen in die Städte.'],
  ['buergerrechtsbewegung', 'Bürgerrechtsbewegung', 25, ['wohlfahrtsstaat'], ['b:zufriedenheit=1', 'b:kultur_prozent=3'], 'Menschen marschieren friedlich für gleiche Rechte, und das Land verändert sich.'],
  // Spalte 26
  ['spezialkraefte', 'Spezialkräfte', 26, ['abschreckung', 'grossforschung'], ['k:elitetraining'], 'Kleine, hart ausgebildete Einheiten erledigen, was ganze Armeen nicht schaffen.'],
  ['weltmarkt', 'Weltmarkt', 26, ['konsumgesellschaft', 'blockfreiheit'], ['b:handelsrouten=1', 'b:handel_gold_prozent=5'], 'Waren aus aller Welt sind überall zu haben.'],
  ['umweltbewegung', 'Umweltbewegung', 26, ['buergerrechtsbewegung', 'grossforschung'], ['k:naturschutzgebiete'], 'Die Menschen erkennen, dass Wälder, Flüsse und Luft Schutz brauchen.'],
  // Spalte 27
  ['friedensmissionen', 'Friedensmissionen', 27, ['spezialkraefte', 'blockfreiheit'], ['k:blauhelme'], 'Neutrale Truppen trennen Streitende und sichern brüchige Waffenruhen.'],
  ['popkultur', 'Popkultur', 27, ['weltmarkt', 'umweltbewegung'], ['b:kultur_prozent=5'], 'Lieder, Filme und Mode deines Volkes begeistern die ganze Welt.'],

  // ======================= KI-ZEITALTER (Spalten 28-30) =======================
  // Spalte 28
  ['digitale_buergerrechte', 'Digitale Bürgerrechte', 28, ['popkultur', 'friedensmissionen'], ['b:zufriedenheit=1', 'b:wissenschaft_prozent=3'], 'Auch im Netz gehören die eigenen Daten dem Menschen, nicht der Maschine.'],
  ['datenoekonomie', 'Datenökonomie', 28, ['weltmarkt'], ['k:datenhandel'], 'Informationen werden zum wertvollsten Rohstoff der Welt.'],
  ['drohnendoktrin', 'Drohnendoktrin', 28, ['spezialkraefte'], ['b:heilung_prozent=10', 'b:sicht=1'], 'Unbemannte Späher und Sanitätsdrohnen begleiten jede Truppe.'],
  // Spalte 29
  ['algorithmische_verwaltung', 'Algorithmische Verwaltung', 29, ['datenoekonomie', 'digitale_buergerrechte'], ['r:technokratie'], 'Lernende Systeme planen Haushalt und Verkehr, Fachleute geben die Richtung vor.'],
  ['offenes_wissen', 'Offenes Wissen', 29, ['digitale_buergerrechte'], ['b:wissenschaft_prozent=4'], 'Alles Wissen der Menschheit ist frei zugänglich, für jeden und überall.'],
  ['cyberabwehr', 'Cyberabwehr', 29, ['drohnendoktrin', 'digitale_buergerrechte'], ['b:stadt_staerke=3', 'b:stadt_hp=5'], 'Wachsame Programme schützen Städte vor unsichtbaren Angriffen.'],
  // Spalte 30
  ['grundeinkommen', 'Grundeinkommen', 30, ['algorithmische_verwaltung'], ['b:zufriedenheit=1', 'b:produktion_prozent=2'], 'Jeder Mensch erhält genug zum Leben, und Arbeit wird zur freien Wahl.'],
  ['vernetzte_staedte', 'Vernetzte Städte', 30, ['algorithmische_verwaltung', 'offenes_wissen'], ['k:intelligente_netze'], 'Straßen, Leitungen und Häuser sprechen miteinander und sparen Energie.'],
  ['maschinenethik', 'Maschinenethik', 30, ['offenes_wissen', 'cyberabwehr'], ['k:ki_vermittler'], 'Klare Regeln legen fest, was denkende Maschinen tun dürfen.'],

  // ======================= FUSIONSZEITALTER (Spalten 31-33) =======================
  // Spalte 31
  ['energieteilung', 'Energieteilung', 31, ['vernetzte_staedte', 'grundeinkommen'], ['k:energieallmende'], 'Grenzenlose Energie aus der Fusion gehört allen Bürgern gemeinsam.'],
  ['planetare_verantwortung', 'Planetare Verantwortung', 31, ['maschinenethik', 'grundeinkommen'], ['b:nahrung_prozent=4', 'b:zufriedenheit=1'], 'Das Volk sieht sich als Hüter des ganzen Planeten.'],
  ['schilddoktrin', 'Schilddoktrin', 31, ['cyberabwehr'], ['b:stadt_staerke=4', 'b:heilung_prozent=5'], 'Energieschilde statt Mauern: Verteidigung wird zur Wissenschaft.'],
  // Spalte 32
  ['weltparlament', 'Weltparlament', 32, ['planetare_verantwortung', 'maschinenethik'], ['k:weltbuergerschaft'], 'Gewählte Vertreter aller Völker beraten über die Zukunft der Erde.'],
  ['mobilitaetsrecht', 'Mobilitätsrecht', 32, ['energieteilung'], ['b:tempo_land=3', 'b:arbeiter_tempo=5'], 'Jeder darf reisen, wohin er will, auf schwebenden Bahnen in Minuten.'],
  ['lichtkunst', 'Lichtkunst', 32, ['energieteilung', 'planetare_verantwortung'], ['b:kultur_prozent=5'], 'Künstler malen mit Plasma und Licht an den Nachthimmel.'],
  // Spalte 33
  ['strategische_autonomie', 'Strategische Autonomie', 33, ['schilddoktrin', 'mobilitaetsrecht'], ['k:autonome_verbaende'], 'Selbstständige Kampfverbände versorgen und warten sich selbst.'],
  ['ueberflussgesellschaft', 'Überflussgesellschaft', 33, ['energieteilung', 'lichtkunst'], ['b:gebaeude_bauzeit_prozent=-5', 'b:produktion_prozent=3'], 'Mangel ist Geschichte, und die Menschen widmen sich dem Erschaffen.'],
  ['menschheitserbe', 'Menschheitserbe', 33, ['weltparlament', 'lichtkunst'], ['k:weltkulturerbe'], 'Alle großen Werke der Geschichte werden als gemeinsames Erbe geschützt.'],

  // ======================= WELTRAUMZEITALTER (Spalten 34-36) =======================
  // Spalte 34
  ['kolonialrecht', 'Kolonialrecht', 34, ['weltparlament', 'strategische_autonomie'], ['k:siedlungscharta'], 'Wer Mond und Mars besiedelt, braucht klare Regeln für neues Land.'],
  ['orbitalwirtschaft', 'Orbitalwirtschaft', 34, ['ueberflussgesellschaft'], ['k:orbitalwerften'], 'Fabriken im Orbit fertigen, was auf der Erde unmöglich wäre.'],
  ['raumflottendoktrin', 'Raumflottendoktrin', 34, ['strategische_autonomie'], ['k:sternenmarine'], 'Flotten denken nicht mehr in Meeren, sondern in Umlaufbahnen.'],
  // Spalte 35
  ['schwerelose_kunst', 'Kunst der Schwerelosigkeit', 35, ['menschheitserbe', 'orbitalwirtschaft'], ['b:kultur_prozent=5'], 'Tänzer und Bildhauer entdecken, was ohne Schwerkraft möglich ist.'],
  ['mondvertraege', 'Mondverträge', 35, ['kolonialrecht'], ['b:handelsrouten=1'], 'Feste Abkommen regeln Bergbau und Handel auf dem Mond.'],
  ['megastrukturen', 'Megastrukturen', 35, ['orbitalwirtschaft', 'raumflottendoktrin'], ['b:wunder_bauzeit_prozent=-5', 'b:distrikt_bauzeit_prozent=-5'], 'Bauwerke von der Größe ganzer Gebirge werden plötzlich denkbar.'],
  // Spalte 36
  ['raumbuergerschaft', 'Raumbürgerschaft', 36, ['mondvertraege', 'schwerelose_kunst'], ['b:zufriedenheit=1', 'b:einfluss_prozent=5'], 'Wer im All geboren wird, ist trotzdem Bürger mit allen Rechten.'],
  ['orbitaler_wachdienst', 'Orbitaler Wachdienst', 36, ['raumflottendoktrin', 'megastrukturen'], ['b:sicht=1', 'b:stadt_staerke=4'], 'Wachstationen im Orbit behalten jeden Winkel der Welt im Blick.'],

  // ======================= STERNENZEITALTER (Spalten 37-39) =======================
  // Spalte 37
  ['sternenbund', 'Sternenbund', 37, ['raumbuergerschaft', 'kolonialrecht'], ['k:sternenbundvertrag'], 'Welten unter vielen Sonnen schließen einen Bund für immer.'],
  ['generationenethik', 'Generationenethik', 37, ['raumbuergerschaft', 'megastrukturen'], ['b:zufriedenheit=1', 'b:nahrung_prozent=5'], 'Wer Schiffe für Jahrhunderte baut, denkt an die Enkel der Enkel.'],
  ['sternenwacht', 'Kodex der Sternenwacht', 37, ['orbitaler_wachdienst'], ['b:erfahrung_prozent=5', 'b:heilung_prozent=10'], 'Die Wächter der Sterne schwören, jede Welt des Bundes zu schützen.'],
  // Spalte 38
  ['galaktisches_recht', 'Galaktisches Recht', 38, ['sternenbund'], ['b:handel_gold_prozent=5', 'b:einfluss_prozent=5'], 'Ein Recht für alle Welten, gesprochen über Lichtjahre hinweg.'],
  ['sphaerenmusik', 'Sphärenmusik', 38, ['generationenethik'], ['k:sphaerenkonzerte'], 'Aus den Klängen der Sterne entsteht eine Musik, die jedes Herz berührt.'],
  ['antimateriedoktrin', 'Antimateriedoktrin', 38, ['sternenwacht', 'generationenethik'], ['k:vernichtungsschlag'], 'Eine Waffe, so mächtig, dass ihr bloßer Besitz Kriege entscheidet.'],
  // Spalte 39
  ['einheit_der_voelker', 'Einheit aller Völker', 39, ['galaktisches_recht', 'sphaerenmusik'], ['k:allvolk'], 'Alle Völker verstehen sich als eine einzige, große Familie.'],
  ['erbe_der_sterne', 'Erbe der Sterne', 39, ['antimateriedoktrin', 'galaktisches_recht'], ['b:wissenschaft_prozent=5', 'b:produktion_prozent=5'], 'Das Wissen aller Zeitalter vereint sich zu einer neuen Blüte.'],
];

/** Die Regierungen. plaetze: Anzahl der Kartenplätze je Kategorie. */
export const REGIERUNGEN = [
  {
    id: 'stammesordnung', name: 'Stammesordnung',
    beschreibung: 'Der stärkste Krieger führt, die Sippe folgt. Einfach, aber wirksam.',
    plaetze: { militaer: 1, wirtschaft: 1, diplomatie: 0, joker: 0 },
    bonus: { erfahrung_prozent: 5 },
    spezial: { text: 'Jeder Sieg bringt etwas Beute ins Lager.', wirkung: { sieg_gold: 10 } },
  },
  {
    id: 'koenigtum', name: 'Königtum',
    beschreibung: 'Ein König herrscht von Gottes oder Blutes Gnaden und schützt sein Reich.',
    plaetze: { militaer: 2, wirtschaft: 1, diplomatie: 0, joker: 0 },
    bonus: { stadt_staerke: 3 },
    spezial: { text: 'Die Grenzen des Reiches wachsen schneller.', wirkung: { grenzwachstum_prozent: 10 } },
  },
  {
    id: 'republik', name: 'Republik',
    beschreibung: 'Gewählte Räte lenken den Staat, und freie Bürger treiben Handel.',
    plaetze: { militaer: 1, wirtschaft: 2, diplomatie: 1, joker: 0 },
    bonus: { gold_prozent: 5 },
    spezial: { text: 'Freie Bürger sind zufriedener.', wirkung: { zufriedenheit: 1 } },
  },
  {
    id: 'theokratie', name: 'Theokratie',
    beschreibung: 'Priester und Herrscher sind eins, und der Glaube durchdringt jeden Lebensbereich.',
    plaetze: { militaer: 2, wirtschaft: 1, diplomatie: 1, joker: 0 },
    bonus: { glaube_prozent: 10 },
    spezial: { text: 'Gesegnete Truppen heilen schneller.', wirkung: { heilung_prozent: 15 } },
  },
  {
    id: 'handelsrepublik', name: 'Handelsrepublik',
    beschreibung: 'Kaufleute regieren, und jeder Hafen ist ein Tor zum Reichtum.',
    plaetze: { militaer: 1, wirtschaft: 3, diplomatie: 1, joker: 0 },
    bonus: { handel_gold_prozent: 10 },
    spezial: { text: 'Eine zusätzliche Handelsroute.', wirkung: { handelsrouten: 1 } },
  },
  {
    id: 'demokratie', name: 'Demokratie',
    beschreibung: 'Das Volk wählt seine Regierung, und freie Menschen bauen eine freie Gesellschaft.',
    plaetze: { militaer: 1, wirtschaft: 3, diplomatie: 2, joker: 1 },
    bonus: { zufriedenheit: 1, gold_prozent: 5 },
    spezial: { text: 'Distrikte werden 10 % schneller gebaut.', wirkung: { distrikt_bauzeit_prozent: -10 } },
  },
  {
    id: 'diktatur', name: 'Diktatur',
    beschreibung: 'Ein Wille, ein Befehl: Der Staat stellt alles in den Dienst der Macht.',
    plaetze: { militaer: 3, wirtschaft: 1, diplomatie: 1, joker: 1 },
    bonus: { einheit_bauzeit_prozent: -10 },
    spezial: { text: 'Einheiten kosten 20 % weniger Unterhalt.', wirkung: { einheiten_unterhalt_rabatt: 20 } },
  },
  {
    id: 'technokratie', name: 'Technokratie',
    beschreibung: 'Fachleute und lernende Systeme entscheiden nach Daten statt nach Meinung.',
    plaetze: { militaer: 1, wirtschaft: 3, diplomatie: 1, joker: 2 },
    bonus: { wissenschaft_prozent: 10 },
    spezial: { text: 'Gebäude werden 10 % schneller gebaut.', wirkung: { gebaeude_bauzeit_prozent: -10 } },
  },
];

/** Die Politikkarten. kategorie: Platzart. veraltet_durch: spätere, stärkere Karte derselben Art. */
export const POLITIKKARTEN = [
  // ----- Militär (20) -----
  { id: 'kriegerehre', name: 'Kriegerehre', kategorie: 'militaer', wirkung: { erfahrung_prozent: 10 }, text: '+10 % Erfahrung für Einheiten', veraltet_durch: 'elitetraining' },
  { id: 'dorfwache', name: 'Dorfwache', kategorie: 'militaer', wirkung: { stadt_staerke: 5 }, text: '+5 Stadtstärke', veraltet_durch: 'wehrhafte_mauern' },
  { id: 'beutezug', name: 'Beutezug', kategorie: 'militaer', wirkung: { sieg_gold: 20 }, text: '+20 Gold je gewonnenem Kampf', veraltet_durch: 'triumph' },
  { id: 'speerdrill', name: 'Speerdrill', kategorie: 'militaer', wirkung: { einheit_bauzeit_prozent: -15 }, text: 'Einheiten 15 % schneller ausgebildet', veraltet_durch: 'soldvertraege' },
  { id: 'landwehr', name: 'Landwehr', kategorie: 'militaer', wirkung: { einheiten_unterhalt_rabatt: 10 }, text: '-10 % Unterhalt für Einheiten', veraltet_durch: 'lehnsdienst' },
  { id: 'heerstrassen', name: 'Heerstraßen', kategorie: 'militaer', wirkung: { tempo_land: 10 }, text: '+10 % Tempo an Land', veraltet_durch: 'schienennetz' },
  { id: 'triumph', name: 'Triumph', kategorie: 'militaer', wirkung: { sieg_gold: 40 }, text: '+40 Gold je gewonnenem Kampf', veraltet_durch: 'vernichtungsschlag' },
  { id: 'lehnsdienst', name: 'Lehnsdienst', kategorie: 'militaer', wirkung: { einheiten_unterhalt_rabatt: 15 }, text: '-15 % Unterhalt für Einheiten', veraltet_durch: 'allgemeine_wehrpflicht' },
  { id: 'wehrhafte_mauern', name: 'Wehrhafte Mauern', kategorie: 'militaer', wirkung: { stadt_staerke: 10 }, text: '+10 Stadtstärke', veraltet_durch: 'wehrbereitschaft' },
  { id: 'flottenmanoever', name: 'Flottenmanöver', kategorie: 'militaer', wirkung: { tempo_see: 15 }, text: '+15 % Tempo auf See', veraltet_durch: 'sternenmarine' },
  { id: 'soldvertraege', name: 'Soldverträge', kategorie: 'militaer', wirkung: { einheit_bauzeit_prozent: -20 }, text: 'Einheiten 20 % schneller ausgebildet', veraltet_durch: 'ruestungsproduktion' },
  { id: 'exerzierplatz', name: 'Exerzierplatz', kategorie: 'militaer', wirkung: { nachbar_militaerlager_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Militärlager' },
  { id: 'allgemeine_wehrpflicht', name: 'Allgemeine Wehrpflicht', kategorie: 'militaer', wirkung: { einheiten_unterhalt_rabatt: 20 }, text: '-20 % Unterhalt für Einheiten', veraltet_durch: 'autonome_verbaende' },
  { id: 'schienennetz', name: 'Militärisches Schienennetz', kategorie: 'militaer', wirkung: { tempo_land: 20 }, text: '+20 % Tempo an Land' },
  { id: 'ruestungsproduktion', name: 'Rüstungsproduktion', kategorie: 'militaer', wirkung: { einheit_bauzeit_prozent: -25 }, text: 'Einheiten 25 % schneller ausgebildet' },
  { id: 'wehrbereitschaft', name: 'Wehrbereitschaft', kategorie: 'militaer', wirkung: { stadt_staerke: 15, stadt_hp: 10 }, text: '+15 Stadtstärke, +10 Stadt-Lebenspunkte' },
  { id: 'elitetraining', name: 'Elitetraining', kategorie: 'militaer', wirkung: { erfahrung_prozent: 25 }, text: '+25 % Erfahrung für Einheiten' },
  { id: 'autonome_verbaende', name: 'Autonome Verbände', kategorie: 'militaer', wirkung: { einheiten_unterhalt_rabatt: 25, heilung_prozent: 10 }, text: '-25 % Unterhalt für Einheiten, +10 % Heilung' },
  { id: 'sternenmarine', name: 'Sternenmarine', kategorie: 'militaer', wirkung: { tempo_see: 25 }, text: '+25 % Tempo auf See' },
  { id: 'vernichtungsschlag', name: 'Vernichtungsschlag', kategorie: 'militaer', wirkung: { sieg_gold: 80 }, text: '+80 Gold je gewonnenem Kampf' },

  // ----- Wirtschaft (22) -----
  { id: 'lagerfeuergeschichten', name: 'Lagerfeuergeschichten', kategorie: 'wirtschaft', wirkung: { kultur_prozent: 5 }, text: '+5 % Kultur', veraltet_durch: 'sphaerenkonzerte' },
  { id: 'gemeinschaftsarbeit', name: 'Gemeinschaftsarbeit', kategorie: 'wirtschaft', wirkung: { gebaeude_bauzeit_prozent: -10 }, text: 'Gebäude 10 % schneller gebaut', veraltet_durch: 'akkordarbeit' },
  { id: 'tauschmarkt', name: 'Tauschmarkt', kategorie: 'wirtschaft', wirkung: { gold_prozent: 5 }, text: '+5 % Gold', veraltet_durch: 'datenhandel' },
  { id: 'akademiefoerderung', name: 'Akademieförderung', kategorie: 'wirtschaft', wirkung: { wissenschaft_prozent: 8 }, text: '+8 % Wissenschaft', veraltet_durch: 'forschungsstipendien' },
  { id: 'heilige_haine', name: 'Heilige Haine', kategorie: 'wirtschaft', wirkung: { nachbar_heiligtum_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Heiligtümer' },
  { id: 'distriktplanung', name: 'Distriktplanung', kategorie: 'wirtschaft', wirkung: { distrikt_bauzeit_prozent: -10 }, text: 'Distrikte 10 % schneller gebaut', veraltet_durch: 'orbitalwerften' },
  { id: 'klosterschulen', name: 'Klosterschulen', kategorie: 'wirtschaft', wirkung: { nachbar_campus_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Campus', veraltet_durch: 'forschungszentren' },
  { id: 'zunftordnung', name: 'Zunftordnung', kategorie: 'wirtschaft', wirkung: { produktion_prozent: 8 }, text: '+8 % Produktion' },
  { id: 'handelskontore', name: 'Handelskontore', kategorie: 'wirtschaft', wirkung: { handel_gold_prozent: 15 }, text: '+15 % Gold aus Handelsrouten', veraltet_durch: 'zollfreiheit' },
  { id: 'maezene', name: 'Mäzene', kategorie: 'wirtschaft', wirkung: { nachbar_theaterplatz_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Theaterplätze' },
  { id: 'forschungsstipendien', name: 'Forschungsstipendien', kategorie: 'wirtschaft', wirkung: { wissenschaft_prozent: 12 }, text: '+12 % Wissenschaft' },
  { id: 'zollfreiheit', name: 'Zollfreiheit', kategorie: 'wirtschaft', wirkung: { handel_gold_prozent: 20 }, text: '+20 % Gold aus Handelsrouten' },
  { id: 'fabrikordnung', name: 'Fabrikordnung', kategorie: 'wirtschaft', wirkung: { nachbar_industriezone_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Industriezonen' },
  { id: 'akkordarbeit', name: 'Akkordarbeit', kategorie: 'wirtschaft', wirkung: { gebaeude_bauzeit_prozent: -20 }, text: 'Gebäude 20 % schneller gebaut' },
  { id: 'wohnviertel', name: 'Neue Wohnviertel', kategorie: 'wirtschaft', wirkung: { nachbar_stadtviertel_prozent: 50 }, text: '+50 % Nachbarschaftsbonus für Stadtviertel' },
  { id: 'forschungszentren', name: 'Forschungszentren', kategorie: 'wirtschaft', wirkung: { nachbar_campus_prozent: 100 }, text: '+100 % Nachbarschaftsbonus für Campus' },
  { id: 'kaufhaeuser', name: 'Kaufhäuser', kategorie: 'wirtschaft', wirkung: { nachbar_handelsplatz_prozent: 75 }, text: '+75 % Nachbarschaftsbonus für Handelsplätze' },
  { id: 'datenhandel', name: 'Datenhandel', kategorie: 'wirtschaft', wirkung: { gold_prozent: 15 }, text: '+15 % Gold' },
  { id: 'intelligente_netze', name: 'Intelligente Netze', kategorie: 'wirtschaft', wirkung: { unterhalt_rabatt: 20 }, text: '-20 % Unterhalt für Gebäude' },
  { id: 'weltkulturerbe', name: 'Weltkulturerbe', kategorie: 'wirtschaft', wirkung: { kultur_je_distrikt: 2 }, text: '+2 Kultur je Distrikt' },
  { id: 'orbitalwerften', name: 'Orbitalwerften', kategorie: 'wirtschaft', wirkung: { distrikt_bauzeit_prozent: -25 }, text: 'Distrikte 25 % schneller gebaut' },
  { id: 'sphaerenkonzerte', name: 'Sphärenkonzerte', kategorie: 'wirtschaft', wirkung: { kultur_prozent: 25 }, text: '+25 % Kultur' },

  // ----- Diplomatie (12) -----
  { id: 'landnahme', name: 'Landnahme', kategorie: 'diplomatie', wirkung: { grenzwachstum_prozent: 10 }, text: '+10 % Grenzwachstum', veraltet_durch: 'flugblaetter' },
  { id: 'gastfreundschaft', name: 'Gastfreundschaft', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 10 }, text: '+10 % Einfluss', veraltet_durch: 'botschafter' },
  { id: 'botschafter', name: 'Botschafter', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 15 }, text: '+15 % Einfluss', veraltet_durch: 'staendige_vertretung' },
  { id: 'geleitschutz', name: 'Geleitschutz', kategorie: 'diplomatie', wirkung: { handelsrouten: 1 }, text: '+1 Handelsroute' },
  { id: 'flugblaetter', name: 'Flugblätter', kategorie: 'diplomatie', wirkung: { grenzwachstum_prozent: 15 }, text: '+15 % Grenzwachstum', veraltet_durch: 'siedlungscharta' },
  { id: 'staendige_vertretung', name: 'Ständige Vertretung', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 20 }, text: '+20 % Einfluss', veraltet_durch: 'schiedsgericht' },
  { id: 'schiedsgericht', name: 'Schiedsgericht', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 25 }, text: '+25 % Einfluss', veraltet_durch: 'sternenbundvertrag' },
  { id: 'blauhelme', name: 'Friedenstruppen', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 10, zufriedenheit: 1 }, text: '+10 % Einfluss, +1 Zufriedenheit' },
  { id: 'ki_vermittler', name: 'KI-Vermittler', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 15, grenzwachstum_prozent: 10 }, text: '+15 % Einfluss, +10 % Grenzwachstum' },
  { id: 'weltbuergerschaft', name: 'Weltbürgerschaft', kategorie: 'diplomatie', wirkung: { zufriedenheit: 2, einfluss_prozent: 10 }, text: '+2 Zufriedenheit, +10 % Einfluss' },
  { id: 'siedlungscharta', name: 'Siedlungscharta', kategorie: 'diplomatie', wirkung: { grenzwachstum_prozent: 25 }, text: '+25 % Grenzwachstum' },
  { id: 'sternenbundvertrag', name: 'Sternenbundvertrag', kategorie: 'diplomatie', wirkung: { einfluss_prozent: 30 }, text: '+30 % Einfluss' },

  // ----- Joker (6) -----
  { id: 'hofstaat', name: 'Prächtiger Hofstaat', kategorie: 'joker', wirkung: { zufriedenheit: 2 }, text: '+2 Zufriedenheit' },
  { id: 'vaterlandsliebe', name: 'Vaterlandsliebe', kategorie: 'joker', wirkung: { produktion_prozent: 5, kultur_prozent: 5 }, text: '+5 % Produktion, +5 % Kultur' },
  { id: 'staatspropaganda', name: 'Staatspropaganda', kategorie: 'joker', wirkung: { kultur_prozent: 10, zufriedenheit: 1 }, text: '+10 % Kultur, +1 Zufriedenheit' },
  { id: 'naturschutzgebiete', name: 'Naturschutzgebiete', kategorie: 'joker', wirkung: { nahrung_prozent: 8, zufriedenheit: 1 }, text: '+8 % Nahrung, +1 Zufriedenheit' },
  { id: 'energieallmende', name: 'Energieallmende', kategorie: 'joker', wirkung: { produktion_prozent: 15 }, text: '+15 % Produktion' },
  { id: 'allvolk', name: 'Allvolk', kategorie: 'joker', wirkung: { zufriedenheit: 3, kultur_prozent: 10, wissenschaft_prozent: 10 }, text: '+3 Zufriedenheit, +10 % Kultur und Wissenschaft' },
];

const ART_KUERZEL = { k: 'politikkarte', r: 'regierung', b: 'bonus', o: 'option' };

function zeitalterVonSpalte(spalte) {
  let z = 0;
  for (let i = 0; i < CIVIC_SPALTEN_ZEITALTER.length; i++) if (spalte >= CIVIC_SPALTEN_ZEITALTER[i]) z = i;
  return z;
}

function freischaltung(eintrag) {
  const [kurz, rest] = eintrag.split(':');
  const art = ART_KUERZEL[kurz];
  if (art === 'bonus') {
    const [id, wert] = rest.split('=');
    return { art, id, wert: Number(wert) };
  }
  return { art, id: rest };
}

export const CIVICS = ROH.map(([id, name, spalte, voraussetzungen, frei, beschreibung]) => ({
  id,
  name,
  zeitalter: zeitalterVonSpalte(spalte),
  spalte,
  kosten: CIVIC_KOSTEN_JE_SPALTE[spalte],
  voraussetzungen,
  freischaltet: frei.map(freischaltung),
  beschreibung,
}));

const nachId = (liste) => Object.assign(Object.create(null), Object.fromEntries(liste.map((x) => [x.id, x])));

export const CIVIC = nachId(CIVICS);
export const REGIERUNG = nachId(REGIERUNGEN);
export const POLITIKKARTE = nachId(POLITIKKARTEN);

/** Civic-ID → IDs der Civics, die sie als Voraussetzung haben. */
export const CIVIC_NACHFOLGER = Object.assign(Object.create(null), Object.fromEntries(CIVICS.map((c) => [c.id, []])));
for (const c of CIVICS) for (const v of c.voraussetzungen) CIVIC_NACHFOLGER[v]?.push(c.id);

/** IDs der Start-Civics (ohne Voraussetzungen). */
export const START_CIVICS = CIVICS.filter((c) => c.voraussetzungen.length === 0).map((c) => c.id);
