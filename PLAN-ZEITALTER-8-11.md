# Volk: Plan für 4 neue Zeitalter (Stand 21.11.2026)

Nur ein Plan, nichts programmiert. Grundlage: Repo LeifPS/volk (Datenformat, Forschungsbaum, Engine, Tests gelesen).

## 1. Die neuen Zeitalter im Überblick

| Nr. | ID | Name | Leitidee | Akzentfarbe | Stadt-Stil (`stil`) |
|---|---|---|---|---|---|
| 8 | `ki` | KI-Zeitalter | Roboter, Drohnen, lernende Maschinen | #5b8cff | `smart`: Glastürme mit Grünflächen und Solarfassaden |
| 9 | `fusion` | Fusionszeitalter | Saubere Energie, Plasma, Schwebetechnik | #f2a33a | `fusion`: weiße Kuppeln mit Lichtbändern |
| 10 | `weltraum` | Weltraumzeitalter | Orbit, Mond, Mars, Asteroiden | #8e7cc3 | `orbital`: Raumhäfen, Aufzugsmast, Habitat-Kuppeln |
| 11 | `sterne` | Sternenzeitalter | Antimaterie, Sternenschiffe, Terraforming | #e6eef7 | `stern`: kristalline Türme, Schwebeplattformen |

Technisch sind das die Zeitalter-Indizes 7 bis 10 (bisher 0 bis 6).

## 2. Wichtige Entscheidungen (vorgeschlagen)

**Update 21.11.:** Leif hat entschieden: langes Endgame, Antimaterie-Rakete bleibt, und der Weltraum wird eine **eigene zweite Spielebene** (siehe Opus-Prompt). Punkt 3 unten ist deshalb überholt: Mond, Mars und Asteroiden sind Felder auf der Weltraum-Karte mit Kolonie-Städten, die Gebäude `mondbasis`, `marskolonie`, `asteroidenbergwerk` entfallen. Wo Plan und Prompt sich widersprechen, gilt der Prompt.

1. **Die Vorstufen gibt es schon.** Die Atomzeit endet bereits mit `kuenstliche_intelligenz` und `fusionsforschung`. Die bleiben unverändert. Die Schlüsselforschungen der neuen Zeitalter bauen direkt darauf auf.
2. **Aufstieg wie bisher:** 60 % der Forschungen des alten Zeitalters plus die Schlüsselforschung des neuen (steht immer in der ersten Spalte des Zeitalters).
3. **Raum ohne zweite Karte.** Der Weltraum ist kein eigenes Spielfeld. Raumschiffe verhalten sich wie Flugzeuge (Einsatzradius, stationiert im Raumhafen). Mond, Mars und Asteroiden sind **Kolonie-Gebäude** in der Stadt, die Rohstoffe liefern. So bleibt die Engine fast unverändert.
4. **Keine neuen Einheitenklassen.** Alle neuen Einheiten nutzen vorhandene Klassen (`nahkampf`, `reiter`, `jaeger`, `bomber`, `rakete` usw.). Dadurch passen sie automatisch in die 13 Beförderungsbäume. Neue Klassen wären viel mehr Arbeit.
5. **Neue Lagergüter** (5 Stück): `seltene_erden`, `deuterium`, `titan`, `helium3`, `antimaterie`. Die drei letzten gibt es nur über Kolonien bzw. Fabriken, nicht als Kartenfeld.
6. **Zukunftstechnologien** (die 5 wiederholbaren) wandern ans Ende des Sternenzeitalters.
7. **Dauer.** Der Baum wird deutlich länger. Grobe Schätzung: plus 20 bis 30 Tage für einen guten Spieler. Das ist mehr als dein Ziel von 2 bis 4 Wochen für den ganzen Baum. Mein Vorschlag: Die neuen Zeitalter sind das **Endgame** (Spieler, die den alten Baum fertig haben, haben weiter etwas zu tun). Die endgültigen Dauern stellt die Balance-Simulation (`npm run balance`) ein. Wenn du es kürzer willst, nehmen wir 16 statt 22 Forschungen je Zeitalter.

## 3. Zahlen und Stellschrauben (alles in `regeln.js` und den Datendateien)

| Größe | bisher (7 Zeitalter) | Vorschlag neue Zeitalter |
|---|---|---|
| `ZEIT_TEMPO` | 10, 8, 6, 5, 4, 3, 2.5 | dazu 2.2, 2.0, 1.8, 1.6 |
| `MARSCH_ZEITALTER` | 1, 1, 1, 1, 1.25, 1.5, 2 | dazu 2.2, 2.4, 2.6, 2.8 (späte Einheiten etwas zäher) |
| Forschungsspalten | Atomzeit 37 bis 43 | KI 44 bis 49, Fusion 50 bis 55, Weltraum 56 bis 61, Sterne 62 bis 67, Zukunft 68 |
| Forschungsdauer (Grundwert) | Atomzeit 55 bis 67 h | KI 70 bis 80 h, Fusion 82 bis 92 h, Weltraum 94 bis 104 h, Sterne 106 bis 116 h, Zukunft 120 h |
| Forschungen je Zeitalter | 25 bis 38 | KI 23, die anderen je 22 (89 neu, plus die 5 Zukunft) |
| Einheitenstärke | Atomzeit bis 110 | KI 115 bis 135, Fusion 140 bis 165, Weltraum 170 bis 200, Sterne 205 bis 250 |
| Einheitenbauzeit (Grundwert) | Atomzeit 16 bis 48 h | KI 24 bis 56 h, Fusion 30 bis 66 h, Weltraum 36 bis 80 h, Sterne 44 bis 96 h |
| Gebäudebauzeit | Atomzeit 1 bis 2 Tage | KI 1,5 bis 3, Fusion 2 bis 3,5, Weltraum 2,5 bis 4,5, Sterne 3 bis 5,5 Tage |
| Wunder | Atomzeit 4 Tage | 5, 6, 7 und 8 Tage |

## 4. Was sich außerhalb der Daten ändern muss

- `zeitalter.js`: 4 Einträge. `ZEIT_TEMPO`, `MARSCH_ZEITALTER`, `SPALTEN_ZEITALTER`, `DAUER_JE_SPALTE`, `SCHLUESSEL`, `WIEDERHOLBAR` in `regeln.js` bzw. `forschung.js` erweitern.
- Barbarenlager: `einheiten_je_zeitalter` auf 11 Einträge (die neuen Zeitalter bekommen dieselbe Infanterie wie die Atomzeit, damit Barbaren nicht zu stark werden). KI-Völker forschen weiter höchstens bis zur Moderne.
- Tests anpassen: Zeitalter-Zahl (7 auf 11), Mindestzahl Forschungen je Zeitalter (25 auf 20 für die neuen) und die Obergrenze 42, Bauzeit-Bereiche, Unterhalt-Grenze Einheiten (8 auf 12) und Gebäude (10 auf 14), Wunder-Bauzeit (max 4 Tage auf 8), Atomwaffen-Test ("ganz am Ende"), Zukunftstechnologien (Zeitalter 6 auf 10).
- Grafik: Städte (`staedte.js`, bisher auf Zeitalter 0 bis 6 begrenzt) bekommen 4 neue Stile, dazu Sprites für alle neuen Einheiten, Gebäude, Wunder, Verbesserungen und Rohstoffe (alles im Code gezeichnet).
- Texte und UI: Zeitalter-Fenster, Lexikon, Hilfe, Forschungsbaum-Farben, Zeitalter-Musik (`audio.js`).
- Hub: Update-Log und Version laufen über die Commit-Nachricht. Dieser ganze Ausbau wäre ein **Großes Update** (Neu für den Spieler: vier Zeitalter).

---

## 5. Zeitalter 8: KI-Zeitalter (`ki`, Index 7)

Look: Glastürme mit Dachgärten, Drohnen über der Stadt, Wege unverändert. Neues Lagergut: **Seltene Erden**.

### 5.1 Forschungen (23), Spalten 44 bis 49, Dauer 70 bis 80 h

Schreibweise wie im Repo: `e:` Einheit, `g:` Gebäude, `w:` Wunder, `v:` Verbesserung, `r:` Rohstoff, `b:` Bonus.

| Spalte | ID | Name | Zweig | Voraussetzungen | Schaltet frei |
|---|---|---|---|---|---|
| 44 | `lernende_maschinen` (**Schlüssel**) | Lernende Maschinen | wissen | kuenstliche_intelligenz, vernetzung | b:wissenschaft_prozent=5 |
| 44 | `seltene_erden_abbau` | Seltene Erden | industrie | nanotechnologie, robotik | r:seltene_erden, v:robotermine |
| 44 | `drohnentechnik` | Drohnentechnik | luft | tarnkappentechnik, robotik | v:drohnenwarte |
| 45 | `sprachverstehen` | Sprachverstehen | wissen | lernende_maschinen | g:ki_labor, b:wissenschaft_prozent=5 |
| 45 | `autonome_fahrzeuge` | Autonome Fahrzeuge | industrie | lernende_maschinen, seltene_erden_abbau | e:lieferdrohnen |
| 45 | `kampfroboter_technik` | Kampfroboter | militaer | lernende_maschinen, infanterietaktik | e:kampfroboter |
| 45 | `exoskelette` | Exoskelette | militaer | seltene_erden_abbau, verbundpanzerung | e:exoskelett_infanterie |
| 45 | `schwarmdrohnen` | Schwarmdrohnen | luft | drohnentechnik, lernende_maschinen | e:drohnenschwarm |
| 46 | `intelligente_netze` | Intelligente Netze | industrie | autonome_fahrzeuge, solartechnik | g:intelligentes_stromnetz |
| 46 | `genom_bearbeitung` | Genom-Bearbeitung | wissen | sprachverstehen, moderne_medizin | g:genlabor, b:heilung_prozent=10 |
| 46 | `vertikale_landwirtschaft` | Vertikale Landwirtschaft | wirtschaft | autonome_fahrzeuge, landtechnik | g:vertikalfarm, b:nahrung_prozent=5 |
| 46 | `laserabwehr_technik` | Laserabwehr | militaer | schwarmdrohnen, boden_luft_raketen | g:laserturm, e:laserabwehr |
| 46 | `autonome_panzer_technik` | Autonome Panzer | militaer | kampfroboter_technik, verbundpanzerung | e:autonomer_panzer |
| 47 | `virtuelle_welten` | Virtuelle Welten | staat | sprachverstehen, massenmedien | g:virtuelles_forum, b:kultur_prozent=5 |
| 47 | `autonome_fertigung` | Autonome Fertigung | industrie | intelligente_netze, robotik | g:autonome_fabrik, b:produktion_prozent=5 |
| 47 | `unterwasserdrohnen_technik` | Unterwasserdrohnen | see | schwarmdrohnen, marinelenkwaffen | e:unterwasserdrohne |
| 47 | `drohnenlogistik` | Drohnenlogistik | wirtschaft | autonome_fahrzeuge, containerlogistik | g:drohnenhafen, b:handel_gold_prozent=10 |
| 47 | `ki_medizin` | KI-Medizin | wissen | genom_bearbeitung | e:medi_drohne |
| 48 | `quantenalgorithmen` | Quantenalgorithmen | wissen | sprachverstehen, teilchenphysik | b:wissenschaft_prozent=5 |
| 48 | `gefechts_ki` | Gefechts-KI | militaer | laserabwehr_technik, autonome_panzer_technik | b:erfahrung_prozent=10 |
| 48 | `jagddrohnen` | Jagddrohnen | luft | schwarmdrohnen, duesentriebwerk | e:drohnenjaeger, e:angriffsdrohne |
| 48 | `digitale_verwaltung` | Digitale Verwaltung | staat | virtuelle_welten, autonome_fertigung | b:unterhalt_rabatt=10 |
| 49 | `weltgehirn_technik` | Weltgehirn | wissen | quantenalgorithmen, digitale_verwaltung | w:weltgehirn |

### 5.2 Einheiten (10)

Werte: Stärke / Fern / Reichweite / Tempo. Bauzeit in Stunden (Grundwert), Gold. Unterhalt pro Stunde.

| ID | Name | Klasse | Werte | Kosten | Unterhalt | Besonderes | Aufrüstung von |
|---|---|---|---|---|---|---|---|
| `exoskelett_infanterie` | Exoskelett-Infanterie | nahkampf | 118 / - / - / 3 | 24 h, 2000 Gold, Aluminium 1, Seltene Erden 1 | 8 | Soldaten in kraftverstärkten Anzügen, schnell zu Fuß | moderne_infanterie |
| `kampfroboter` | Kampfroboter | nahkampf | 125 / - / - / 2 | 28 h, 2300 Gold, Seltene Erden 2 | 9 | +10 gegen Fernkämpfer | panzergrenadier |
| `drohnenschwarm` | Drohnenschwarm | fernkampf | 70 / 118 / 2 / 4 | 26 h, 2100 Gold, Seltene Erden 1 | 8 | kein Gegenschaden | raketenwerfer |
| `autonomer_panzer` | Autonomer Panzer | reiter | 130 / - / - / 5 | 36 h, 2800 Gold, Eisen 2, Öl 2, Seltene Erden 1 | 10 | ohne Besatzung, +10 gegen Nahkämpfer | moderner_kampfpanzer |
| `laserabwehr` | Laserabwehr | flak | 110 / - / - / 4 | 28 h, 2200 Gold, Seltene Erden 1 | 8 | +35 gegen Luft, +30 gegen Raketen | flugabwehrraketen |
| `drohnenjaeger` | Drohnenjäger | jaeger | 115 / 110 / 12 / - | 34 h, 2600 Gold, Aluminium 2, Seltene Erden 1 | 9 | fängt Bomber ab | duesenjaeger |
| `angriffsdrohne` | Angriffsdrohne | bomber | 80 / 135 / 16 / - | 40 h, 3000 Gold, Aluminium 2, Seltene Erden 1 | 10 | +10 gegen Städte | tarnkappenbomber |
| `unterwasserdrohne` | Unterwasserdrohne | u_boot | 95 / 115 / 3 / 6 | 38 h, 2900 Gold, Seltene Erden 2 | 9 | Tarnung, Tiefsee, kein Gegenschaden | atom_u_boot |
| `medi_drohne` | Medi-Drohne | sanitaeter | 50 / - / - / 5 | 24 h, 1900 Gold, Seltene Erden 1 | 7 | heilt Nachbarn sehr schnell | feldlazarett |
| `lieferdrohnen` | Lieferdrohnen | haendler | 0 / - / - / 6 | 22 h, 1800 Gold | 3 | Handelsrouten, sehr einträglich | lastwagenkonvoi |

### 5.3 Gebäude (8)

| ID | Name | Kategorie | Ersetzt / braucht | Wirkung | Kosten | Unterhalt |
|---|---|---|---|---|---|---|
| `ki_labor` | KI-Labor | wissen | ersetzt rechenzentrum | +25 Wissenschaft, +20 % Wissenschaft | 2 Tage, 4200 Gold, Stein 250, Seltene Erden 2 | 10 |
| `autonome_fabrik` | Autonome Fabrik | produktion | ersetzt robotfabrik | +14 Produktion, +35 % Produktion | 2,25 Tage, 4800 Gold, Aluminium 3, Seltene Erden 2 | 12 |
| `intelligentes_stromnetz` | Intelligentes Stromnetz | produktion | braucht kraftwerk | +15 % Produktion, erlässt 4 Gold Unterhalt, +1 Zufriedenheit | 1,5 Tage, 3000 Gold, Aluminium 2 | 5 |
| `vertikalfarm` | Vertikalfarm | nahrung | ersetzt kuehlhaus | +8 Nahrung, +15 % Nahrung, 40 % Nahrung bleibt beim Wachsen | 1,5 Tage, 3200 Gold, Aluminium 1 | 6 |
| `genlabor` | Genlabor | militaer | ersetzt klinikum | Heilung 50, 25 % Nahrung bleibt, +2 Zufriedenheit | 1,75 Tage, 3600 Gold, Seltene Erden 1 | 8 |
| `virtuelles_forum` | Virtuelles Forum | kultur | braucht medienzentrum | +12 Kultur, +3 Zufriedenheit, +20 % Kultur | 1,5 Tage, 3200 Gold | 8 |
| `laserturm` | Laserturm | verteidigung | ersetzt flakstellung | Verteidigung +14, Stadtreichweite +1, Sicht +1 | 1,5 Tage, 3000 Gold, Seltene Erden 1 | 6 |
| `drohnenhafen` | Drohnenhafen | see | ersetzt containerhafen, Küste | +12 Gold, +6 Produktion, +4 Handelsrouten | 2 Tage, 4000 Gold, Seltene Erden 1 | 9 |

### 5.4 Verbesserungen, Rohstoff, Wunder

- **Robotermine** (Kette `mine`, Stufe 4): +5 Produktion, doppelte Lieferung. Wird durch `seltene_erden_abbau` frei.
- **Drohnenwarte** (Kette `aussenposten`, Stufe 4): Sicht 11 Felder. Wird durch `drohnentechnik` frei.
- **Seltene Erden** (strategisch): Vorkommen in Hügeln, Gebirge, Kristallgebirge, Wüste (Dichte 0,008), erschlossen per Mine, +2 Produktion, sichtbar ab `seltene_erden_abbau`. Zweck: Roboter, Drohnen, KI-Gebäude.
- **Wunder Weltgehirn** (`weltgehirn`, braucht KI-Labor): +25 % Wissenschaft, +5 % Produktion, +10 % Erfahrung im ganzen Reich, in der Stadt +30 Wissenschaft. Kosten 5 Tage, 15 000 Gold, Stein 800, Marmor 130, Seltene Erden 10.
- Barbaren: nutzen weiter Infanterie. Keine neuen Optionen nötig.

---

## 6. Zeitalter 9: Fusionszeitalter (`fusion`, Index 8)

Look: weiße Kuppelstädte mit leuchtenden Bändern, Magnetbahnen statt Autobahnen. Neues Lagergut: **Deuterium** (aus dem Meer).

### 6.1 Forschungen (22), Spalten 50 bis 55, Dauer 82 bis 92 h

| Spalte | ID | Name | Zweig | Voraussetzungen | Schaltet frei |
|---|---|---|---|---|---|
| 50 | `kernfusion` (**Schlüssel**) | Kernfusion | raumfahrt | fusionsforschung, quantenalgorithmen | b:produktion_prozent=5 |
| 50 | `supraleiter` | Supraleiter | industrie | quantenalgorithmen, seltene_erden_abbau | b:produktion_prozent=3 |
| 50 | `plasmaphysik` | Plasmaphysik | raumfahrt | fusionsforschung, laserabwehr_technik | b:wissenschaft_prozent=3 |
| 51 | `fusionsreaktor_bau` | Fusionsreaktor | industrie | kernfusion, supraleiter | g:fusionsreaktor |
| 51 | `deuteriumgewinnung` | Deuterium-Gewinnung | see | kernfusion, unterwasserdrohnen_technik | r:deuterium, v:deuteriumfabrik |
| 51 | `quantencomputer_bau` | Quantencomputer | wissen | supraleiter, quantenalgorithmen | g:quantenrechner |
| 51 | `magnetschwebetechnik` | Magnetschwebetechnik | industrie | supraleiter, autonome_fahrzeuge | v:magnetbahn |
| 51 | `plasmawaffen` | Plasmawaffen | militaer | plasmaphysik, exoskelette | e:plasmagrenadier, g:plasmaschmiede |
| 52 | `energienetz_global` | Weltweites Energienetz | wirtschaft | fusionsreaktor_bau, intelligente_netze | g:molekularfabrik, b:gold_prozent=5, b:unterhalt_rabatt=10 |
| 52 | `schwebepanzer_technik` | Schwebepanzer | militaer | magnetschwebetechnik, autonome_panzer_technik | e:schwebepanzer |
| 52 | `schienenkanonen` | Schienenkanonen | militaer | supraleiter, mehrfachraketenwerfer | e:railgun_batterie |
| 52 | `energieschilde` | Energieschilde | militaer | plasmaphysik, laserabwehr_technik | g:energieschild, e:schildgenerator |
| 52 | `hyperloop_technik` | Hyperloop | staat | magnetschwebetechnik, digitale_verwaltung | g:hyperloop_station |
| 53 | `co2_entzug` | CO2-Entzug | wissen | fusionsreaktor_bau, klimaforschung | g:co2_waescher, b:nahrung_prozent=5, b:zufriedenheit=1 |
| 53 | `hyperschalltechnik` | Hyperschalltechnik | luft | plasmawaffen, jagddrohnen | e:hyperschallbomber |
| 53 | `fusionsantrieb_schiffe` | Fusionsantrieb für Schiffe | see | fusionsreaktor_bau, unterwasserdrohnen_technik | e:fusionszerstoerer |
| 53 | `nanomedizin` | Nanomedizin | wissen | ki_medizin, quantencomputer_bau | e:nanomediziner, b:heilung_prozent=10 |
| 54 | `plasmaschiffe` | Plasma-Kriegsschiffe | see | fusionsantrieb_schiffe, energieschilde | e:plasmakreuzer |
| 54 | `hyperschallraketen` | Hyperschallraketen | militaer | hyperschalltechnik, schienenkanonen | e:hyperschallrakete |
| 54 | `fusionsstaedte` | Fusionsstädte | staat | energienetz_global, hyperloop_technik | b:zufriedenheit=2, b:kultur_prozent=5 |
| 55 | `kuenstliche_sonne_technik` | Künstliche Sonne | raumfahrt | fusionsreaktor_bau, energienetz_global, quantencomputer_bau | w:kuenstliche_sonne |
| 55 | `orbitalraketen` | Orbitalraketen | raumfahrt | hyperschallraketen, kernfusion | b:sicht=1 |

### 6.2 Einheiten (9)

| ID | Name | Klasse | Werte | Kosten | Unterhalt | Besonderes | Aufrüstung von |
|---|---|---|---|---|---|---|---|
| `plasmagrenadier` | Plasmagrenadier | nahkampf | 142 / - / - / 3 | 30 h, 2900 Gold, Deuterium 1, Seltene Erden 1 | 9 | +10 gegen Befestigte (Städte, Forts) | exoskelett_infanterie |
| `schwebepanzer` | Schwebepanzer | reiter | 155 / - / - / 6 | 44 h, 3500 Gold, Seltene Erden 2, Deuterium 1 | 11 | `gelaende_ignorieren` (alle Felder kosten 1) | autonomer_panzer |
| `railgun_batterie` | Railgun-Batterie | belagerung | 80 / 160 / 4 / 3 | 46 h, 3800 Gold, Seltene Erden 2, Deuterium 1 | 11 | `belagerung`, kein Gegenschaden | raketenartillerie |
| `schildgenerator` | Schildgenerator | flak | 135 / - / - / 4 | 36 h, 3200 Gold, Deuterium 1 | 9 | +40 gegen Luft, +35 gegen Raketen | laserabwehr |
| `fusionszerstoerer` | Fusionszerstörer | see_nah | 145 / - / - / 7 | 48 h, 3800 Gold, Deuterium 2, Seltene Erden 1 | 11 | Tiefsee, +20 gegen U-Boote | lenkwaffenzerstoerer |
| `plasmakreuzer` | Plasmakreuzer | see_fern | 110 / 155 / 4 / 6 | 56 h, 4400 Gold, Deuterium 2, Seltene Erden 2 | 12 | Tiefsee, kein Gegenschaden | raketenkreuzer |
| `hyperschallbomber` | Hyperschallbomber | bomber | 95 / 150 / 20 / - | 52 h, 4200 Gold, Deuterium 2, Aluminium 2 | 12 | Tarnung, +10 gegen Städte | angriffsdrohne |
| `hyperschallrakete` | Hyperschallrakete | rakete | 0 / 165 / 18 / - | 34 h, 2600 Gold, Deuterium 1, Aluminium 1 | 4 | `einmalig` | lenkrakete |
| `nanomediziner` | Nanomediziner | sanitaeter | 60 / - / - / 6 | 30 h, 2800 Gold, Seltene Erden 1 | 8 | heilt Nachbarn extrem schnell | medi_drohne |

### 6.3 Gebäude (7)

| ID | Name | Kategorie | Ersetzt / braucht | Wirkung | Kosten | Unterhalt |
|---|---|---|---|---|---|---|
| `fusionsreaktor` | Fusionsreaktor | produktion | ersetzt kernkraftwerk | +16 Produktion, +40 % Produktion, erlässt 6 Gold Unterhalt | 2,5 Tage, 6500 Gold, Stein 400, Deuterium 2, Seltene Erden 2 | 12 |
| `quantenrechner` | Quantenrechner | wissen | ersetzt ki_labor | +35 Wissenschaft, +25 % Wissenschaft | 2,5 Tage, 6500 Gold, Seltene Erden 3, Deuterium 1 | 13 |
| `molekularfabrik` | Molekularfabrik | produktion | ersetzt autonome_fabrik | +18 Produktion, +40 % Produktion | 3 Tage, 7500 Gold, Aluminium 4, Seltene Erden 3 | 14 |
| `hyperloop_station` | Hyperloop-Station | infrastruktur | ersetzt u_bahn | +5 Produktion, +15 % Produktion, +3 Zufriedenheit, +6 Gold, +1 Handelsroute | 2 Tage, 5500 Gold, Seltene Erden 2 | 9 |
| `energieschild` | Energieschild | verteidigung | ersetzt betonbunker | Verteidigung +24, +400 Stadt-HP | 2,5 Tage, 6000 Gold, Stein 300, Deuterium 2 | 9 |
| `co2_waescher` | CO2-Wäscher | zufriedenheit | - | +3 Zufriedenheit, +6 Nahrung, +10 % Nahrung | 2 Tage, 5000 Gold, Aluminium 2 | 8 |
| `plasmaschmiede` | Plasmaschmiede | militaer | braucht kaserne | Einheiten 25 % schneller gebaut, neue Einheiten +20 Erfahrung | 2 Tage, 5200 Gold, Deuterium 2 | 10 |

### 6.4 Verbesserungen, Rohstoff, Wunder

- **Magnetbahn** (Weg, Kette `strasse`, Stufe 6): Bewegungskosten 0,08, +1 Gold. Frei durch `magnetschwebetechnik`.
- **Deuteriumfabrik** (Wasser, Kette `deuterium`): +3 Produktion, liefert Deuterium. Nur auf Feldern mit Deuterium. Frei durch `deuteriumgewinnung`.
- **Deuterium** (strategisch): Vorkommen auf Meer, Küste, Tiefsee (Dichte 0,012). Zweck: Fusionsreaktoren und Plasmawaffen.
- **Wunder Künstliche Sonne** (`kuenstliche_sonne`, braucht Fusionsreaktor): +20 % Produktion, +10 % Nahrung, 20 % weniger Unterhalt im ganzen Reich, in der Stadt +25 Produktion. Kosten 6 Tage, 20 000 Gold, Stein 900, Marmor 150, Deuterium 12.

---

## 7. Zeitalter 10: Weltraumzeitalter (`weltraum`, Index 9)

Look: Städte mit Raumhafen und Aufzugsmast, Habitat-Kuppeln, Satelliten am Himmel. Neue Lagergüter: **Titan** und **Helium-3**. Beide gibt es nur aus Kolonie-Gebäuden (siehe Abschnitt 2, Punkt 3). Optionale Regel für später: jedes Kolonie-Gebäude nur einmal pro Volk (braucht eine kleine Engine-Erweiterung, deshalb nicht Teil des Grundplans).

### 7.1 Forschungen (22), Spalten 56 bis 61, Dauer 94 bis 104 h

| Spalte | ID | Name | Zweig | Voraussetzungen | Schaltet frei |
|---|---|---|---|---|---|
| 56 | `orbitalbau` (**Schlüssel**) | Orbitalbau | raumfahrt | orbitalraketen, supraleiter | g:raumhafen, e:raumsonde |
| 56 | `leichtbau_titan` | Titanlegierungen | industrie | supraleiter, seltene_erden_abbau | b:produktion_prozent=3 |
| 56 | `raumfahrtmedizin` | Raumfahrtmedizin | wissen | nanomedizin | b:heilung_prozent=10 |
| 57 | `orbitalwerften` | Orbitalwerften | raumfahrt | orbitalbau | g:orbitalwerft |
| 57 | `raumjaeger_technik` | Raumjäger | luft | orbitalbau, hyperschalltechnik | e:raumjaeger |
| 57 | `orbitale_solarkraft` | Orbitale Solarkraft | industrie | orbitalbau, energienetz_global | g:orbitalkraftwerk |
| 57 | `raumanzug_infanterie` | Raumlandetruppen | militaer | orbitalbau, plasmawaffen | e:raumlandetruppe |
| 57 | `mondlandung` | Mondbasis | raumfahrt | orbitalbau, raumfahrtmedizin | g:mondbasis |
| 58 | `helium3_abbau` | Helium-3-Abbau | industrie | mondlandung, kernfusion | b:produktion_prozent=3 |
| 58 | `orbitalabwehr_technik` | Orbitalabwehr | militaer | raumjaeger_technik, energieschilde | g:orbitalabwehr, e:orbitalflak |
| 58 | `orbitalbomber_technik` | Orbitalbomber | luft | raumjaeger_technik, hyperschallraketen | e:orbitalbomber |
| 58 | `asteroidenbergbau` | Asteroidenbergbau | industrie | mondlandung, leichtbau_titan | g:asteroidenbergwerk |
| 58 | `raumfrachter_technik` | Raumfrachter | wirtschaft | orbitalbau, drohnenlogistik | e:raumfrachter, e:orbitalfaehre, b:handel_gold_prozent=10 |
| 59 | `marsmission` | Marskolonie | raumfahrt | mondlandung, raumfahrtmedizin | g:marskolonie, b:sicht=1 |
| 59 | `biokuppeln` | Biokuppeln | wirtschaft | mondlandung, vertikale_landwirtschaft | g:biokuppel, b:nahrung_prozent=5 |
| 59 | `kinetische_waffen` | Kinetische Orbitalwaffen | militaer | orbitalabwehr_technik, schienenkanonen | e:kinetischer_stab |
| 59 | `schwerelosigkeitstaktik` | Schwerelosigkeits-Taktik | militaer | raumanzug_infanterie, gefechts_ki | e:mondpanzer, b:erfahrung_prozent=10 |
| 59 | `raumstationsnetz` | Raumstationsnetz | wissen | orbitalwerften, quantencomputer_bau | b:wissenschaft_prozent=5 |
| 60 | `weltraumaufzug_technik` | Weltraumaufzug | raumfahrt | leichtbau_titan, raumstationsnetz | w:weltraumaufzug |
| 60 | `weltraumrecht` | Weltraumrecht | staat | raumstationsnetz, fusionsstaedte | b:zufriedenheit=2, b:unterhalt_rabatt=10 |
| 61 | `kolonialverwaltung` | Kolonialverwaltung | staat | marsmission, weltraumrecht | b:kultur_prozent=5, b:grenzwachstum_prozent=10 |
| 61 | `antimaterie_physik` | Antimaterie-Physik | raumfahrt | asteroidenbergbau, marsmission, kinetische_waffen | b:wissenschaft_prozent=5 |

### 7.2 Einheiten (9)

Raumjäger und Orbitalbomber nutzen die Luft-Regeln: "Reichweite" ist der Einsatzradius, stationiert im Raumhafen.

| ID | Name | Klasse | Werte | Kosten | Unterhalt | Besonderes | Aufrüstung von |
|---|---|---|---|---|---|---|---|
| `raumlandetruppe` | Raumlandetruppe | nahkampf | 172 / - / - / 3 | 36 h, 4000 Gold, Seltene Erden 2, Deuterium 1 | 11 | Sicht 3, geeignet für Luftlandung | plasmagrenadier |
| `mondpanzer` | Mondpanzer | reiter | 185 / - / - / 6 | 56 h, 5200 Gold, Titan 2, Deuterium 2 | 12 | `gelaende_ignorieren` | schwebepanzer |
| `raumjaeger` | Raumjäger | jaeger | 175 / 160 / 25 / - | 52 h, 5000 Gold, Deuterium 1, Helium-3 1, Aluminium 2 | 12 | fängt Bomber ab | drohnenjaeger |
| `orbitalbomber` | Orbitalbomber | bomber | 110 / 185 / 30 / - | 64 h, 6200 Gold, Helium-3 1, Aluminium 2, Titan 1 | 12 | Tarnung, +10 gegen Städte | hyperschallbomber |
| `orbitalflak` | Orbitalflak | flak | 165 / - / - / 5 | 48 h, 4400 Gold, Seltene Erden 1, Titan 1 | 11 | +45 gegen Luft, +40 gegen Raketen | schildgenerator |
| `kinetischer_stab` | Kinetischer Stab | rakete | 0 / 190 / 24 / - | 40 h, 3600 Gold, Titan 2, Deuterium 1 | 5 | `einmalig`, keine Flächenwirkung | hyperschallrakete |
| `raumfrachter` | Raumfrachter | haendler | 0 / - / - / 8 | 36 h, 3200 Gold, Deuterium 1 | 4 | Handelsrouten, extrem einträglich | lieferdrohnen |
| `orbitalfaehre` | Orbitalfähre | transport | 90 / - / - / 8 | 44 h, 4200 Gold, Helium-3 1, Deuterium 2 | 8 | trägt 2 Landeinheiten, Tiefsee | landungsschiff |
| `raumsonde` | Raumsonde | spaeher | 60 / - / - / 8 | 30 h, 3000 Gold | 5 | Sicht 6, Auto-Erkunden, `gelaende_ignorieren` | fernaufklaerer |

### 7.3 Gebäude (8)

Die drei Kolonien brauchen einen **Raumhafen** in derselben Stadt.

| ID | Name | Kategorie | Ersetzt / braucht | Wirkung | Kosten | Unterhalt |
|---|---|---|---|---|---|---|
| `raumhafen` | Raumhafen | luft | ersetzt raketenbasis | 12 Luftplätze, +8 Gold, +2 Handelsrouten, Verteidigung +6 | 3 Tage, 9000 Gold, Stein 500, Aluminium 4, Seltene Erden 3, Deuterium 2 | 13 |
| `mondbasis` | Mondbasis | wissen | braucht raumhafen | +15 Wissenschaft, Sicht +3, liefert 2 Helium-3 pro Stunde | 3 Tage, 10 000 Gold, Aluminium 4, Seltene Erden 3 | 14 |
| `marskolonie` | Marskolonie | kultur | braucht mondbasis | +10 Nahrung, +10 Kultur, +2 Zufriedenheit, liefert 1 Titan pro Stunde | 3,5 Tage, 12 000 Gold, Aluminium 4, Deuterium 3 | 14 |
| `asteroidenbergwerk` | Asteroidenbergwerk | produktion | braucht raumhafen | +10 Produktion, liefert 3 Titan und 1 Seltene Erden pro Stunde | 3,5 Tage, 11 000 Gold, Deuterium 3, Seltene Erden 3 | 14 |
| `orbitalkraftwerk` | Orbitalkraftwerk | produktion | ersetzt solarkraftwerk | +12 Produktion, +30 % Produktion, +1 Zufriedenheit | 3 Tage, 8500 Gold, Aluminium 4, Seltene Erden 2 | 12 |
| `orbitalwerft` | Orbitalwerft | militaer | braucht raumhafen | Einheiten 30 % schneller gebaut, +25 Erfahrung, 4 Luftplätze | 3 Tage, 9000 Gold, Deuterium 3 | 13 |
| `orbitalabwehr` | Orbitalabwehr | verteidigung | ersetzt laserturm | Verteidigung +24, Stadtreichweite +2, Sicht +2 | 3 Tage, 8000 Gold, Titan 2, Deuterium 2 | 10 |
| `biokuppel` | Biokuppel | nahrung | ersetzt vertikalfarm | +12 Nahrung, +20 % Nahrung, 50 % Nahrung bleibt | 2,5 Tage, 7500 Gold, Titan 2 | 9 |

### 7.4 Rohstoffe, Wunder

- **Titan** und **Helium-3**: strategische Lagergüter ohne Kartenfeld, nur über die Kolonie-Gebäude (`material` pro Stunde). Titan baut Spät-Gebäude und Mondpanzer, Helium-3 ist der Treibstoff der Raumflieger.
- **Wunder Weltraumaufzug** (`weltraumaufzug`, braucht Raumhafen): 15 % schnelleres Bauen, +2 Handelsrouten, +20 % Handelsgold im ganzen Reich, in der Stadt +25 Gold. Kosten 7 Tage, 28 000 Gold, Stein 1000, Marmor 170, Titan 15, Deuterium 10.

---

## 8. Zeitalter 11: Sternenzeitalter (`sterne`, Index 10)

Look: kristalline Türme, Schwebeplattformen, Städte mit leuchtendem Schutzfeld. Neues Lagergut: **Antimaterie** (nur aus der Antimaterie-Fabrik).

### 8.1 Forschungen (22), Spalten 62 bis 67, Dauer 106 bis 116 h

| Spalte | ID | Name | Zweig | Voraussetzungen | Schaltet frei |
|---|---|---|---|---|---|
| 62 | `sternenantrieb` (**Schlüssel**) | Sternenantrieb | raumfahrt | antimaterie_physik, helium3_abbau | b:wissenschaft_prozent=5 |
| 62 | `exotische_werkstoffe` | Exotische Werkstoffe | industrie | antimaterie_physik, leichtbau_titan | b:produktion_prozent=5 |
| 62 | `gravitationsphysik` | Gravitationsphysik | wissen | antimaterie_physik, quantencomputer_bau | b:wissenschaft_prozent=3 |
| 63 | `antimaterie_erzeugung` | Antimaterie-Erzeugung | industrie | sternenantrieb, exotische_werkstoffe | g:antimateriefabrik |
| 63 | `sternenhafen_bau` | Sternenhäfen | raumfahrt | sternenantrieb, orbitalwerften | g:sternenhafen, g:sternenwerft, e:sternensonde |
| 63 | `materiewandlung` | Materiewandlung | industrie | exotische_werkstoffe, autonome_fertigung | g:materiewandler |
| 63 | `nanoschwaerme` | Nanoschwärme | militaer | exotische_werkstoffe, schwerelosigkeitstaktik | e:nanoschwarm |
| 64 | `sternenobservatorien` | Sternenobservatorien | wissen | gravitationsphysik, raumstationsnetz | g:sternenobservatorium, b:sicht=1 |
| 64 | `gravitationswaffen` | Gravitationswaffen | militaer | gravitationsphysik, kinetische_waffen | e:gravitationswerfer |
| 64 | `sternenjaeger_technik` | Sternenjäger | luft | sternenhafen_bau, raumjaeger_technik | e:sternenjaeger |
| 64 | `planetarer_schild_technik` | Planetarer Schild | militaer | gravitationsphysik, energieschilde, orbitalabwehr_technik | g:planetarer_schild |
| 64 | `antimaterie_panzerung` | Antimaterie-Panzerung | militaer | antimaterie_erzeugung, nanoschwaerme | e:antimaterie_panzer |
| 65 | `phasentechnik` | Phasentechnik | militaer | planetarer_schild_technik, nanoschwaerme | e:phasenflak |
| 65 | `sternenbomber_technik` | Sternenbomber | luft | sternenjaeger_technik, orbitalbomber_technik | e:sternenbomber |
| 65 | `gravitationsschiffe` | Gravitationsschiffe | see | antimaterie_erzeugung, plasmaschiffe | e:gravitationskreuzer |
| 65 | `terraforming` | Terraforming | wirtschaft | biokuppeln, antimaterie_erzeugung | g:terraformer, b:nahrung_prozent=5 |
| 65 | `welterbe_archiv` | Welterbe-Archiv | staat | kolonialverwaltung, virtuelle_welten | g:weltarchiv, b:kultur_prozent=5 |
| 66 | `antimaterie_waffen` | Antimaterie-Waffen | militaer | antimaterie_panzerung, gravitationswaffen | e:antimaterie_rakete |
| 66 | `sternenlogistik` | Sternenlogistik | wirtschaft | sternenhafen_bau, raumfrachter_technik | e:sternenfrachter, b:handel_gold_prozent=10, b:handelsrouten=1 |
| 66 | `stellare_kultur` | Stellare Kultur | staat | terraforming, welterbe_archiv | b:zufriedenheit=3, b:kultur_prozent=5 |
| 67 | `arche_technik` | Generationenschiff | raumfahrt | sternenlogistik, terraforming, sternenobservatorien | w:sternenarche |
| 67 | `sternenfrieden` | Sternenfrieden | staat | stellare_kultur, antimaterie_waffen | b:zufriedenheit=2, b:stadt_staerke=3 |

### 8.2 Einheiten (10)

| ID | Name | Klasse | Werte | Kosten | Unterhalt | Besonderes | Aufrüstung von |
|---|---|---|---|---|---|---|---|
| `nanoschwarm` | Nanoschwarm | nahkampf | 212 / - / - / 3 | 44 h, 5200 Gold, Antimaterie 1, Seltene Erden 1 | 12 | +10 gegen Fernkämpfer | raumlandetruppe |
| `antimaterie_panzer` | Antimaterie-Panzer | reiter | 232 / - / - / 6 | 66 h, 7000 Gold, Antimaterie 2, Titan 2 | 12 | `gelaende_ignorieren` | mondpanzer |
| `gravitationswerfer` | Gravitationswerfer | belagerung | 100 / 215 / 5 / 4 | 70 h, 7400 Gold, Antimaterie 1, Titan 2 | 12 | `belagerung`, kein Gegenschaden | railgun_batterie |
| `phasenflak` | Phasenflak | flak | 210 / - / - / 6 | 56 h, 5600 Gold, Antimaterie 1, Titan 1 | 11 | +50 gegen Luft, +45 gegen Raketen | orbitalflak |
| `sternenjaeger` | Sternenjäger | jaeger | 218 / 200 / 32 / - | 66 h, 7000 Gold, Antimaterie 1, Helium-3 1, Titan 1 | 12 | fängt Bomber ab | raumjaeger |
| `sternenbomber` | Sternenbomber | bomber | 140 / 235 / 38 / - | 84 h, 8600 Gold, Antimaterie 2, Helium-3 1, Titan 2 | 12 | Tarnung, +10 gegen Städte | orbitalbomber |
| `antimaterie_rakete` | Antimaterie-Rakete | rakete | 0 / 245 / 28 / - | 50 h, 6000 Gold, Antimaterie 2, Titan 1 | 6 | `einmalig`, trifft nur ein Ziel (keine Flächenwirkung, die Atomwaffe bleibt die einzige Flächenwaffe) | kinetischer_stab |
| `gravitationskreuzer` | Gravitationskreuzer | see_fern | 140 / 215 / 5 / 8 | 88 h, 9000 Gold, Antimaterie 2, Titan 3 | 12 | Tiefsee, kein Gegenschaden | plasmakreuzer |
| `sternensonde` | Sternensonde | spaeher | 70 / - / - / 10 | 40 h, 4400 Gold, Antimaterie 1 | 6 | Sicht 8, Auto-Erkunden, `gelaende_ignorieren` | raumsonde |
| `sternenfrachter` | Sternenfrachter | haendler | 0 / - / - / 10 | 48 h, 4800 Gold, Antimaterie 1 | 5 | Handelsrouten, die einträglichsten im Spiel | raumfrachter |

### 8.3 Gebäude (8)

| ID | Name | Kategorie | Ersetzt / braucht | Wirkung | Kosten | Unterhalt |
|---|---|---|---|---|---|---|
| `antimateriefabrik` | Antimaterie-Fabrik | produktion | braucht fusionsreaktor | +12 Produktion, liefert 1 Antimaterie pro Stunde | 3,5 Tage, 14 000 Gold, Stein 400, Titan 3, Helium-3 3 | 14 |
| `sternenhafen` | Sternenhafen | luft | ersetzt raumhafen | 16 Luftplätze, +12 Gold, +3 Handelsrouten, Verteidigung +8 | 4 Tage, 16 000 Gold, Titan 4, Helium-3 3 | 14 |
| `sternenwerft` | Sternenwerft | militaer | ersetzt orbitalwerft | Einheiten 35 % schneller gebaut, +30 Erfahrung, 6 Luftplätze | 4 Tage, 15 000 Gold, Titan 3, Antimaterie 2 | 14 |
| `sternenobservatorium` | Sternenobservatorium | wissen | ersetzt quantenrechner | +45 Wissenschaft, +30 % Wissenschaft, Sicht +4 | 4 Tage, 15 000 Gold, Titan 3, Antimaterie 1 | 14 |
| `materiewandler` | Materiewandler | produktion | ersetzt molekularfabrik | +22 Produktion, +45 % Produktion, liefert 4 Stein und 2 Eisen pro Stunde | 4 Tage, 16 000 Gold, Titan 4, Antimaterie 2 | 14 |
| `planetarer_schild` | Planetarer Schild | verteidigung | ersetzt energieschild | Verteidigung +32, +600 Stadt-HP | 4 Tage, 14 000 Gold, Titan 4, Antimaterie 2 | 12 |
| `terraformer` | Terraformer | nahrung | ersetzt biokuppel | +16 Nahrung, +25 % Nahrung, +3 Zufriedenheit, 60 % Nahrung bleibt | 3,5 Tage, 12 000 Gold, Titan 3 | 12 |
| `weltarchiv` | Weltarchiv | kultur | braucht virtuelles_forum | +16 Kultur, +3 Zufriedenheit, +25 % Kultur | 3 Tage, 11 000 Gold, Titan 2 | 12 |

### 8.4 Rohstoff, Wunder, Zukunftstechnologien

- **Antimaterie**: strategisches Lagergut ohne Kartenfeld, nur aus der Antimaterie-Fabrik und dem Besitz weniger Fabriken zu halten. Verbraucht von fast allen Sterneneinheiten, deshalb bremst sie das Wettrüsten auf natürliche Weise.
- **Wunder Sternenarche** (`sternenarche`, braucht Sternenhafen): +20 % Kultur, +10 % Wissenschaft, +4 Zufriedenheit, Stadtstärke +5 im ganzen Reich, in der Stadt +30 Kultur und +20 Wissenschaft. Kosten 8 Tage, 40 000 Gold, Stein 1200, Marmor 200, Titan 20, Antimaterie 10.
- **Zukunftstechnologien** (5 wiederholbare, Spalte 68, Dauer 120 h) bleiben die gleichen, bekommen aber neue Voraussetzungen: `zukunft_wissen` (sternenobservatorien, arche_technik), `zukunft_wirtschaft` (sternenlogistik, sternenfrieden), `zukunft_industrie` (materiewandlung, antimaterie_waffen), `zukunft_verteidigung` (planetarer_schild_technik, phasentechnik), `zukunft_kultur` (stellare_kultur, arche_technik). Zeitalter wird 10 statt 6.

---

## 9. Optik, Ton und Spielgefühl

- **Städte:** 4 neue Stile (`smart`, `fusion`, `orbital`, `stern`), jeweils in 3 Größen wie bisher. Die Städte-Grafik ist heute bei Zeitalter 6 gedeckelt und muss auf 10 erweitert werden.
- **Wege:** Magnetbahn als neue Wegstufe (leuchtende Schiene, keine Räder). Die anderen Wege bleiben.
- **Einheiten-Banner:** Symbole für die neuen Einheiten, Volksfarbe wie bisher. Drohnen und Raumflieger bekommen dieselbe Luft-Darstellung wie die Flugzeuge.
- **Zeitalter-Meldung:** "Dein Volk tritt in ein neues Zeitalter ein" (Text kommt aus `zeitalter.js`), dazu je Zeitalter ein kurzer Satz wie bei den alten: KI: *Glastürme, Drohnen und lernende Maschinen.* Fusion: *Weiße Kuppeln, Plasma und Magnetbahnen.* Weltraum: *Raumhäfen, Mondbasen und der Weg zu den Sternen.* Sterne: *Kristalltürme, Antimaterie und Schiffe für Generationen.*
- **Musik** (Chiptune, `audio.js`): KI ruhig-elektronisch, Fusion hell und treibend, Weltraum weit und langsam, Sterne feierlich.

## 10. Umsetzung in Stufen (wenn du das Okay gibst)

Wie bei deinen anderen Spielen: jede Stufe einzeln pushen und kurz berichten.

1. **Grundlage:** 4 Zeitalter in `zeitalter.js`, Tempo-Kurven, Spalten und Dauern, Zukunftstechnologien verschieben, Tests auf 11 Zeitalter anpassen. Danach muss alles wie vorher laufen.
2. **KI-Zeitalter:** Forschungen, Einheiten, Gebäude, Seltene Erden, Wunder, Tests.
3. **Fusionszeitalter:** wie oben, plus Deuterium und Magnetbahn.
4. **Weltraumzeitalter:** wie oben, plus Titan und Helium-3 über Kolonien.
5. **Sternenzeitalter:** wie oben, plus Antimaterie.
6. **Grafik:** Städte, Sprites, Wege, Banner für alles Neue (der größte Brocken).
7. **Texte, Lexikon, Hilfe, Musik.**
8. **Balance:** `npm run balance` laufen lassen, Forschungsdauern und Kosten nachstellen, Browser-Test mit `?demo=1&zeitalter=7` bis 10.
9. **Hub:** Commit-Nachricht "Großes Update: Vier neue Zeitalter".

Jede Stufe hat ihre eigene Testbarkeit: Die Datentests prüfen automatisch, dass jede Einheit, jedes Gebäude, jedes Wunder und jede Verbesserung durch genau eine Forschung freigeschaltet wird.

## 11. Zahlen im Überblick

| | bisher | neu | danach |
|---|---|---|---|
| Zeitalter | 7 | 4 | 11 |
| Forschungen | 242 | 89 | 331 |
| Einheiten | 96 | 38 | 134 |
| Gebäude | 79 | 31 | 110 |
| Weltwunder | 8 | 4 | 12 |
| Verbesserungen | 50 | 4 | 54 |
| Lagergüter | 16 | 5 | 21 |

## 12. Offene Fragen an dich

1. **Länge:** Sollen die neuen Zeitalter ein langes Endgame sein (rund 22 Forschungen je Zeitalter, ca. plus 20 bis 30 Tage), oder lieber kürzer (16 je Zeitalter)?
2. **Kolonien:** Sollen Mond, Mars und Asteroiden Gebäude in der Stadt bleiben (einfach), oder willst du später eine echte zweite Ebene im Weltraum (viel Arbeit)?
3. **Raumschiffe:** Reicht es, dass sie wie Flugzeuge funktionieren, oder sollen sie eine eigene Bedienung bekommen?
4. **KI-Völker:** Sollen sie weiter nur bis zur Moderne forschen? (Mein Vorschlag: ja.)
5. **Antimaterie-Rakete:** Eine zweite Superwaffe neben der Atomwaffe, oder streichen?
6. **Namen:** Passen "KI-Zeitalter", "Fusionszeitalter", "Weltraumzeitalter", "Sternenzeitalter"?
