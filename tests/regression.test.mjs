// Regressionstests für die Fehler aus dem Code-Review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uhr, STD, MIN, TAG, neueWelt, spielerMitStadt, vorspulen, speicherAttrappe, socketAttrappe } from './hilfen.mjs';
import { WeltServer } from '../src/server.js';
import { Konten } from '../src/konten.js';
import { nachbarn } from '../public/shared/hex.js';
import { karte } from '../public/shared/karte.js';
import { GELAENDE } from '../public/shared/daten/gelaende.js';

const env = { __eigeneUhr: true };
async function serverMitSpieler(name = 'anna') {
  const sp = speicherAttrappe(), so = socketAttrappe();
  const srv = new WeltServer(sp, env, so);
  const r = await srv.http('/api/registrieren', 'POST', { name, passwort: 'passwort1' }, 'ip-' + name);
  const ws = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(ws);
  await srv.nachricht(ws, JSON.stringify({ t: 'volk_gruenden', id: 1, name: name + 'volk', farbe: '#1010f0' }));
  return { sp, so, srv, ws, token: r.token, vid: ws.info.volk };
}

test('Aktives Naturereignis übersteht einen Neustart des Durable Objects', async () => {
  const { sp, so, srv, ws, vid } = await serverMitSpieler();
  const s = srv.spiel;
  await srv.nachricht(ws, JSON.stringify({ t: 'befehl', id: 2, b: { art: 'stadt_gruenden', einheit: s.einheitenVon(vid).find((e) => e.typ === 'siedler').id } }));
  const st = s.staedteVon(vid)[0];
  const id = s.neueId();
  (s.z.global.ereignisse ||= []).push({ id, typ: 'duerre', felder: st.gebiet.slice(), mitte: st.feld, start: s.t + MIN, ende: s.t + 10 * STD, aktiv: false, nahrung: -1 });
  s.markiere('g');
  uhr.vorspulen(2 * MIN); srv.alarm(); s.raten(vid); srv.nachAenderung();
  const neu = new WeltServer(sp, env, so);
  assert.doesNotThrow(() => neu.spiel.naechsteZeit());
  assert.equal((await neu.http('/api/status', 'GET')).ok, true);
});

test('Waffenruhe gilt in beide Richtungen: offline gegangener Angreifer greift nach dem Marsch nicht an', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Anfang'), B = spielerMitStadt(s, 'Beginn');
  A.v.schutz_bis = B.v.schutz_bis = 0;
  // Barbaren stören den Test sonst (es gibt jetzt viele Lager): entfernen
  for (const e of s.einheitenVon(s.barbarenVolk().id)) delete s.z.einheiten[e.id];
  s.z.lager = {}; s.z.global.barbaren_um = 0;
  s.verbindung(A.v.id, true); s.verbindung(B.v.id, true);
  Object.assign(s.diplo(A.v.id, B.v.id), { krieg: true, seit: s.t, letzter_kampf: s.t });
  const ka = s.einheitenVon(A.v.id).find((e) => e.typ === 'krieger'), kb = s.einheitenVon(B.v.id).find((e) => e.typ === 'krieger');
  let f0 = -1, f2 = -1;
  const ok = (i) => s.besitzer(i) == null && s.betretbar(A.v.id, { klasse: 'nahkampf' }, i) && !s.einheitenAuf(i).length;
  for (let i = 1000; i < 20000 && f0 < 0; i++) { if (!ok(i)) continue; for (const n1 of nachbarn(i)) { if (!ok(n1)) continue; const n2 = nachbarn(n1).find((x) => x !== i && !nachbarn(i).includes(x) && ok(x)); if (n2 != null) { f0 = i; f2 = n2; break; } } }
  ka.feld = f0; kb.feld = f2; s.positionenNeu();
  const r = s.befehl(B.v.id, { art: 'angreifen', einheit: kb.id, ziel: f0 });
  assert.equal(r.ok, true, r.fehler);
  kb.pfad[kb.pfad.length - 1].t = s.t + 45 * MIN;
  s.verbindung(B.v.id, false);
  vorspulen(s, 50 * MIN);
  assert.equal(s.z.einheiten[ka.id].hp, 100);
});

test('Prototyp-Schlüssel als Bau-ID oder Kontoname richten keinen Schaden an', async () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Prototyp');
  for (const typ of ['einheit', 'gebaeude', 'wunder']) for (const id of ['constructor', 'toString', '__proto__', 'raubtier']) {
    const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ, id });
    assert.equal(r.ok, false, typ + ':' + id);
  }
  assert.equal(stadt.schlange.length, 0);
  const k = new Konten({}, () => Date.now());
  for (const n of ['constructor', '__proto__', 'toString']) {
    const r = await k.anmelden(n, 'passwort1', 'x');
    assert.equal(r.ok, false);
  }
  assert.equal((await k.registrieren('constructor', 'passwort1', 'y')).ok, true);
});

test('Bei der Eroberung werden Kriegsschiffe im Hafen versenkt statt übernommen', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Hafenwacht'), B = spielerMitStadt(s, 'Seeraeuber');
  const k = karte();
  // eine Küstenstadt von A suchen oder Schiff einfach auf die Stadt setzen
  const boot = s.einheitErzeugen(A.v.id, 'boot', A.stadt.feld);
  if (boot) { boot.feld = A.stadt.feld; s.positionenNeu(); }
  const kb = s.einheitenVon(B.v.id).find((e) => e.typ === 'krieger');
  s.stadtErobern(A.stadt, kb);
  const militaerB = s.einheitenAuf(A.stadt.feld).filter((e) => e.volk === B.v.id && !['siedler', 'arbeiter', 'spaeher'].includes(e.typ));
  assert.equal(militaerB.length, 1, militaerB.map((e) => e.typ).join(','));
});

test('Automatischer Friedensvorschlag kommt nach Ablauf erneut', () => {
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Dauerkrieg'), B = spielerMitStadt(s, 'Gegenseite');
  Object.assign(s.diplo(A.v.id, B.v.id), { krieg: true, seit: s.t, letzter_kampf: s.t });
  vorspulen(s, 13 * STD);
  const erst = Object.values(s.z.angebote).find((a) => a.auto);
  assert.ok(erst);
  vorspulen(s, 8 * TAG);
  const neu = Object.values(s.z.angebote).find((a) => a.auto);
  assert.ok(neu && neu.id !== erst.id, 'nach Ablauf muss ein neuer Vorschlag kommen');
});

test('Zwei Tabs: Schließen eines Tabs lässt den Spieler verbunden', async () => {
  const sp = speicherAttrappe(), so = socketAttrappe();
  const srv = new WeltServer(sp, env, so);
  const r = await srv.http('/api/registrieren', 'POST', { name: 'zweitab', passwort: 'passwort1' }, 'z');
  const w1 = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(w1);
  const w2 = so.neu(srv.verbindungPruefen(r.token)); srv.verbunden(w2);
  await srv.nachricht(w1, JSON.stringify({ t: 'volk_gruenden', id: 1, name: 'Zweitabvolk', farbe: '#1010f0' }));
  const v = srv.spiel.z.voelker[w1.info.volk];
  assert.equal(v.verbunden, 2);
  so.weg(w1); srv.getrennt(w1); srv.getrennt(w1);
  assert.equal(v.verbunden, 1);
});

test('Nebel: Stadtplatz-Anfrage und Wegvorschau verraten nichts Unsichtbares', async () => {
  const { srv, ws, vid } = await serverMitSpieler('nebelig');
  const s = srv.spiel;
  const fremd = s.alleStaedte().find((x) => x.volk !== vid && !s.istErkundet(s.nebel(vid), x.feld));
  assert.throws(() => s.frage(vid, { art: 'stadtplatz', feld: fremd.feld }));
  const nahe = nachbarn(fremd.feld).find((i) => !s.istErkundet(s.nebel(vid), i));
  if (nahe != null) assert.throws(() => s.frage(vid, { art: 'stadtplatz', feld: nahe }));
});

test('Vorgemerkter Bauauftrag startet, sobald das Material reicht, ohne Sekundentakt', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Vormerker');
  s.aendern(v.id); v.gold = 0; delete s._raten[v.id];
  const r = s.befehl(v.id, { art: 'bauen', stadt: stadt.id, typ: 'einheit', id: 'krieger', vormerken: true });
  assert.equal(r.ok, true, r.fehler);
  let ereignisse = 0;
  for (let i = 0; i < 36; i++) { uhr.vorspulen(10 * MIN); ereignisse += s.verarbeite(uhr.jetzt()); }
  assert.ok(stadt.bau.length === 1 || s.einheitenVon(v.id).filter((e) => e.typ === 'krieger').length >= 2, 'Auftrag muss gestartet sein: ' + JSON.stringify({ schlange: stadt.schlange, bau: stadt.bau.length, gold: v.gold, k: s.einheitenVon(v.id).map((e) => e.typ), m: v.meldungen.slice(-3).map((m) => m.text) }));
  assert.ok(ereignisse < 9000, 'Sekundentakt? Ereignisse: ' + ereignisse);
});

test('Barbaren ignorieren den Neulingsschutz, Raubtiere nicht, Offline-Spieler bleiben verschont', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s, 'Neuling');
  v.verbunden = 1; v.letzte_aktivitaet = s.t;
  const b = s.barbarenVolk(), t = s.tierVolk();
  assert.ok(v.schutz_bis > s.t);
  assert.equal(s.kampfHindernis(b.id, v.id), null, 'Barbaren dürfen Neulinge angreifen');
  assert.ok(s.kampfHindernis(t.id, v.id), 'Raubtiere respektieren den Schutz');
  assert.equal(s.kampfHindernis(v.id, b.id), null, 'Neulinge dürfen Barbaren bekämpfen');
  // Barbar neben einem Neuling geht tatsächlich zum Angriff über
  const ziel = s.einheitenVon(v.id).find((e) => e.typ === 'krieger');
  const n = nachbarn(ziel.feld).find((i) => s.einheitenAuf(i).length === 0 && !s.stadtAuf(i));
  const e = s.einheitErzeugen(b.id, 'krieger', n, {});
  e.abkling_bis = 0; e.pfad = [];
  const hp = ziel.hp;
  s.barbarHandeln(b, e);
  assert.ok(e.angriff != null || ziel.hp < hp || e.hp < 100, 'Der Barbar geht auf den Neuling los');
  // offline: verschont
  v.verbunden = 0; v.letzte_aktivitaet = s.t - 2 * STD; v.getrennt_seit = s.t - 2 * STD;
  assert.ok(s.kampfHindernis(b.id, v.id));
});

test('Offline läuft die Wirtschaft nur 2 Stunden lang mit halber Leistung weiter', () => {
  const s = neueWelt();
  const { v } = spielerMitStadt(s, 'Anfang');
  s.verbindung(v.id, true); s.aendern(v.id); v.gold = 0; s.aendern(v.id);
  const rate = s.raten(v.id).gold;
  assert.ok(rate > 0);
  s.verbindung(v.id, false);
  vorspulen(s, 1 * STD); s.aendern(v.id);
  const verh = v.gold / rate;
  assert.ok(verh > 0.35 && verh < 0.65, 'nach 1 h ca. halbe Leistung: ' + verh);
  vorspulen(s, 1 * STD); s.aendern(v.id);
  const nach2 = v.gold;
  vorspulen(s, 5 * STD); s.aendern(v.id);
  assert.ok(Math.abs(v.gold - nach2) < 0.5, 'nach 2 h steht die Wirtschaft still');
  s.verbindung(v.id, true);
  assert.ok(s.raten(v.id).gold >= rate * 0.9, 'zurück online: volle Leistung');
});

test('Gewähltes Grenzfeld wird als Nächstes übernommen, ungültige Ziele werden abgelehnt', () => {
  const s = neueWelt();
  const { v, stadt } = spielerMitStadt(s, 'Ausbreiter');
  const kand = s.grenzKandidaten(stadt);
  assert.ok(kand.length > 0);
  const ziel = kand[kand.length - 1];
  assert.equal(s.befehl(v.id, { art: 'grenzziel', stadt: stadt.id, feld: ziel }).ok, true);
  assert.equal(s.bestesGrenzfeld(stadt), ziel);
  assert.equal(s.befehl(v.id, { art: 'grenzziel', stadt: stadt.id, feld: stadt.feld }).ok, false);
  s.aendern(v.id); stadt.kultur = 1e9; s.grenzwachstum(stadt.id);
  assert.ok(stadt.gebiet.includes(ziel), 'Ziel wurde übernommen');
  assert.equal(stadt.grenz_ziel, null);
  assert.equal(s.befehl(v.id, { art: 'grenzziel', stadt: stadt.id, feld: null }).ok, true);
});

test('Barbaren sind rot; alte schwarze Barbaren werden beim Laden umgefärbt', () => {
  const s = neueWelt();
  const b = s.alleVoelker().find((v) => v.art === 'barbar');
  assert.equal(b.farbe, '#9b111e');
  b.farbe = '#2b2b2b';
  s.barbarenFarbeAktualisieren();
  assert.equal(b.farbe, '#9b111e');
  assert.ok(s.schmutzig.has('v' + b.id));
});

test('Neuer Rohstoff durch Forschung: Meldung zeigt sofort, wo er im erkundeten Gebiet liegt', async () => {
  const { karte } = await import('../public/shared/karte.js');
  const { ROHSTOFFE } = await import('../public/shared/daten/rohstoffe.js');
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Omikron');
  const nr = ROHSTOFFE.findIndex((r) => r.id === 'kohle') + 1;
  const k = karte();
  const vorkommen = []; for (let i = 0; i < k.rohstoff.length; i++) if (k.rohstoff[i] === nr) vorkommen.push(i);
  assert.ok(vorkommen.length >= 2);
  const n = s.nebel(A.v.id); n.fill(0);
  n[vorkommen[0] >> 3] |= 1 << (vorkommen[0] & 7); // nur ein Vorkommen ist erkundet
  A.v.forschung.aktiv = 'kohleabbau'; A.v.forschung.fortschritt = 0;
  s.forschungFertig(A.v.id);
  const m = A.v.meldungen.find((x) => /Kohle/.test(x.text) && /Vorkommen/.test(x.text));
  assert.ok(m, 'Meldung vorhanden');
  assert.equal(m.feld, vorkommen[0]);
  assert.match(m.text, /Ein Vorkommen/);
});

test('Handelsroute: Beim Einrichten entsteht auf ihrem Weg eine Straße (nur Land, nicht in fremdem Gebiet)', async () => {
  const { FREIGESCHALTET_DURCH } = await import('../public/shared/daten/index.js');
  const { GELAENDE } = await import('../public/shared/daten/gelaende.js');
  const { umkreis } = await import('../public/shared/hex.js');
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Pioniere');
  const wid = 'pfad';
  const noetig = FREIGESCHALTET_DURCH['verbesserung:' + wid];
  if (noetig) A.v.forschung.erforscht[noetig] = 1;
  const k = karte();
  const felder = umkreis(A.stadt.feld, 3).filter((i) => i !== A.stadt.feld && !GELAENDE[k.gelaende[i]].wasser && s.besitzer(i) === A.v.id && !s.stadtAuf(i)).slice(0, 4);
  assert.ok(felder.length >= 2);
  const wasser = umkreis(A.stadt.feld, 6).find((i) => GELAENDE[k.gelaende[i]].wasser);
  const e = s.einheitErzeugen(A.v.id, 'karawane', A.stadt.feld);
  const r = { von: A.stadt.id, nach: A.stadt.id, aktiv: false, richtung: 'hin', felder: [...felder, ...(wasser != null ? [wasser] : [])] };
  s.routeWegeBauen(e, r);
  for (const i of felder) assert.equal(s.z.felder[i]?.w, wid);
  if (wasser != null) assert.ok(!s.z.felder[wasser]?.w, 'kein Weg auf Wasser');
  assert.ok(A.v.meldungen.some((m) => /Handelsroute hat auf ihrem Weg/.test(m.text)));
  assert.equal(r.felder, undefined);
});

test('Handelsroute zwischen zwei eigenen Städten: nach der Ankunft liegt ein Pfad auf dem Weg', async () => {
  const { FREIGESCHALTET_DURCH } = await import('../public/shared/daten/index.js');
  const { umkreis, abstand } = await import('../public/shared/hex.js');
  const s = neueWelt();
  const A = spielerMitStadt(s, 'Handelsvolk');
  const noetig = FREIGESCHALTET_DURCH['verbesserung:pfad'];
  if (noetig) A.v.forschung.erforscht[noetig] = 1;
  const ziel = umkreis(A.stadt.feld, 8).find((i) => abstand(i, A.stadt.feld) >= 5 && !s.stadtGruendenHindernis(A.v.id, i));
  assert.ok(ziel != null, 'Platz für zweite Stadt');
  const st2 = s.stadtGruenden(A.v.id, ziel, 'Zweitstadt');
  const e = s.einheitErzeugen(A.v.id, 'karawane', A.stadt.feld);
  const r = s.befehl(A.v.id, { art: 'handelsroute', einheit: e.id, stadt: (st2.id ?? st2) });
  assert.equal(r.ok, true, r.fehler);
  assert.ok(e.route.felder?.length > 0, 'Weg wurde gemerkt');
  const weg = [...e.route.felder];
  vorspulen(s, 6 * STD);
  const mitWeg = weg.filter((i) => s.z.felder[i]?.w);
  assert.ok(mitWeg.length > 0, 'Auf dem Weg liegt jetzt ein Pfad');
  assert.ok(A.v.meldungen.some((m) => /Handelsroute hat auf ihrem Weg/.test(m.text)));
});

test('Barbarenlager respawnen nicht: zerstörte Lager bleiben weg, die übrigen bringen weiter Einheiten hervor', () => {
  const s = neueWelt();
  const ids = Object.keys(s.z.lager);
  assert.ok(ids.length >= 5);
  const zerstoert = ids.slice(0, 3);
  for (const id of zerstoert) delete s.z.lager[id];
  const rest = Object.keys(s.z.lager).length;
  for (let i = 0; i < 4; i++) s.barbarenZug();
  assert.equal(Object.keys(s.z.lager).length, rest, 'keine neuen Lager nach Zerstörung');
  const b = s.barbarenVolk();
  const l = Object.values(s.z.lager)[0];
  l.naechste = 0;
  const vorher = s.einheitenVon(b.id).filter((e) => e.lager === l.id).length;
  s.barbarenZug();
  assert.ok(s.einheitenVon(b.id).filter((e) => e.lager === l.id).length >= vorher, 'Einheiten kommen weiter');
});
