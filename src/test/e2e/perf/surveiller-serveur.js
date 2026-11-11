/* SURVEILLANCE D'UN SERVEUR PRESTIGE PENDANT UN ESSAI (plantages aux heures de sauvegarde, de SMS, du releve de nuit).
 *
 * Toutes les 2 s : le serveur repond-il (page d'accueil, delai), la JVM est-elle vivante (PID), son tas (jstat) ;
 * toutes les 5 s : requetes en cours dans la base de l'essai (SHOW PROCESSLIST), la plus longue, les attentes de verrou.
 * En continu : le journal du serveur (server.log) pour les jalons (releve, valorisation, sauvegarde, SMS, pipeline de
 * demarrage) et les erreurs graves (SEVERE, OutOfMemoryError, arret).
 *
 * Regles : le texte des requetes est tronque et ses valeurs entre quotes masquees (aucune donnee de patient) ; les
 * lignes du journal qui parlent de SMS ne gardent que le nom du journal et le jalon, jamais le texte d'un message.
 *
 * Variables : BASE (http://localhost:11080/prestige), SERVEUR_PID, PAYARA_DOMAINE (dossier du domaine), DB_TEST,
 * MARIADB_OPTIONS (fichier d'options du client), DUREE_MIN (60), SORTIE (fichier JSON), JDK_BIN (jstat).
 * Arret : Ctrl+C ou fin de DUREE_MIN ; le resume est ecrit dans SORTIE et affiche.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile, execFileSync } = require('child_process');

const BASE = process.env.BASE || 'http://localhost:11080/prestige';
const PID = process.env.SERVEUR_PID;
const DOMAINE = process.env.PAYARA_DOMAINE;
const DB = process.env.DB_TEST;
const OPTIONS = process.env.MARIADB_OPTIONS;
const DUREE_MS = Number(process.env.DUREE_MIN || 60) * 60000;
const SORTIE = process.env.SORTIE || 'surveillance.json';
const JSTAT = path.join(process.env.JDK_BIN || 'C:/Program Files/Eclipse Adoptium/jdk-17.0.20.101-hotspot/bin', process.platform === 'win32' ? 'jstat.exe' : 'jstat');

const t0 = Date.now();
const heure = (t) => new Date(t).toISOString().slice(11, 19);
const sondes = [];      // { t, ms | null (pas de reponse) }
const tas = [];         // { t, usedMo, maxMo, gcS }
const base = [];        // { t, actives, plusLongue, verrous, req }
const jalons = [];      // { t, quoi }
const graves = [];      // { t, ligne }
const posteLibre = [];  // { t, mo } : memoire libre du poste (un poste a court de memoire n'est pas un defaut de Prestige)
const SEUIL_GEL_MS = Number(process.env.SEUIL_GEL_S || 10) * 1000;
let vivant = true;
let mortA = null;

/* --- serveur HTTP --- */
function sonder() {
  const debut = Date.now();
  const req = http.get(BASE + '/', { timeout: 30000 }, (r) => { r.resume(); r.on('end', () => sondes.push({ t: debut, ms: Date.now() - debut, code: r.statusCode })); });
  req.on('timeout', () => { req.destroy(); });
  req.on('error', () => sondes.push({ t: debut, ms: null }));
}

/* --- JVM : vivante ? tas ? --- */
function jvm() {
  if (!PID) { return; }
  execFile('tasklist', ['/FI', 'PID eq ' + PID, '/NH'], (e, out) => {
    const ok = !e && new RegExp('\\b' + PID + '\\b').test(out || '');
    if (vivant && !ok) { vivant = false; mortA = Date.now(); jalons.push({ t: mortA, quoi: 'JVM DISPARUE (PID ' + PID + ')' }); }
  });
  execFile(JSTAT, ['-gc', PID], (e, out) => {
    if (e || !out) { return; }
    const l = out.trim().split(/\r?\n/);
    if (l.length < 2) { return; }
    const h = l[0].trim().split(/\s+/), v = l[1].trim().split(/\s+/).map((x) => Number(x.replace(',', '.'))), g = (k) => v[h.indexOf(k)] || 0;
    const used = g('S0U') + g('S1U') + g('EU') + g('OU'), max = g('S0C') + g('S1C') + g('EC') + g('OC');
    tas.push({ t: Date.now(), usedMo: Math.round(used / 1024), capMo: Math.round(max / 1024), gcS: Math.round((g('GCT') || 0) * 10) / 10 });
  });
}

/* --- base : requetes en cours de l'essai --- */
const masquer = (sql) => String(sql || '').replace(/'(?:[^'\\]|\\.)*'/g, "'?'").replace(/\s+/g, ' ').slice(0, 140);
function interrogerBase() {
  if (!DB || !OPTIONS) { return; }
  const q = "SELECT COUNT(*), IFNULL(MAX(TIME),0), SUM(STATE LIKE '%lock%'), "
    + "IFNULL(SUBSTRING_INDEX(GROUP_CONCAT(CONCAT(TIME,'s ',IFNULL(STATE,''),' : ',REPLACE(REPLACE(IFNULL(INFO,''),'\\n',' '),'\\t',' ')) ORDER BY TIME DESC SEPARATOR '\\n'),'\\n',2),'') "
    + "FROM information_schema.PROCESSLIST WHERE DB='" + DB + "' AND COMMAND <> 'Sleep' AND ID <> CONNECTION_ID()";
  execFile('mariadb', ['--defaults-extra-file=' + OPTIONS, '-N', '--raw', '-e', q], { timeout: 20000 }, (e, out) => {
    const t = Date.now();
    if (e) { base.push({ t, erreur: String(e.message).split('\n')[0].slice(0, 80) }); return; }
    const [n, longue, verrous, ...reste] = String(out).replace(/\r/g, '').split('\t');
    base.push({ t, actives: Number(n), plusLongue: Number(longue), verrous: Number(verrous || 0), req: reste.join('\t').split('\n').map(masquer).filter(Boolean) });
  });
}

/* --- journal du serveur --- */
const JALONS = [
  [/Daily stock started/, 'releve du stock : debut'], [/Daily stock finished.*duration\(s\): ?(\d+)/, 'releve du stock : fin'],
  [/Daily stock error/, 'releve du stock : ERREUR'], [/Stock daily value update started/, 'valorisation : debut'],
  [/Stock daily value update finished/, 'valorisation : fin'], [/\[PIPELINE-\w+\] Demarrage/, 'pipeline de demarrage : debut'],
  [/\[PIPELINE-\w+\] Termine/, 'pipeline de demarrage : fin'], [/[Ss]auvegarde[^\]]{0,80}(lanc|termin|echou|reussi|OK|ERREUR)/, 'sauvegarde'],
  [/sendPendingSms|smsJob|NotificationScheduledService/, 'SMS en attente'], [/recapActivity|PointActivite/, 'SMS recapitulatif'],
  [/Reprise de l'historique|backfill/i, 'reprise historique'], [/OutOfMemoryError/, 'OUT OF MEMORY'],
  [/Shutting down|server shutdown|Server shutdown/i, 'ARRET DU SERVEUR'], [/MonitorInvocationsTask delayed/, 'serveur sature (MonitorInvocationsTask)'],
];
let tailleLue = 0;
let reliquat = '';
function lireJournal() {
  if (!DOMAINE) { return; }
  const f = path.join(DOMAINE, 'logs', 'server.log');
  let st;
  try { st = fs.statSync(f); } catch (e) { return; }
  if (st.size < tailleLue) { tailleLue = 0; }          // rotation
  if (st.size === tailleLue) { return; }
  const fd = fs.openSync(f, 'r');
  const buf = Buffer.alloc(Math.min(st.size - tailleLue, 8 * 1024 * 1024));
  fs.readSync(fd, buf, 0, buf.length, tailleLue);
  fs.closeSync(fd);
  tailleLue += buf.length;
  const texte = reliquat + buf.toString('utf8');
  const entrees = texte.split(/\n(?=\[20\d\d-)/);
  reliquat = entrees.pop();
  for (const ent of entrees) {
    const t = Date.now();
    const loggeur = (ent.match(/\] \[([\w.$]+)\] \[tid/) || [])[1] || '';
    const parleSms = /sms/i.test(loggeur) || /\bsms\b/i.test(ent);
    for (const [re, quoi] of JALONS) { if (re.test(ent)) { jalons.push({ t, quoi, loggeur }); break; } }
    if (/\[SEVERE\]|\[GRAVE\]|OutOfMemoryError/.test(ent)) {
      const premiere = ent.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim();
      graves.push({ t, loggeur, ligne: parleSms ? '(journal SMS : texte non repris)' : masquer(premiere).slice(0, 160) });
    }
  }
}

/* --- resume --- */
function resume() {
  const ko = sondes.filter((s) => s.ms === null || s.ms > 10000);
  const lentes = sondes.filter((s) => s.ms !== null && s.ms > 2000);
  /* fenetres d'indisponibilite : sondes successives sans reponse ou > 10 s */
  const fenetres = [];
  let f = null;
  sondes.slice().sort((a, b) => a.t - b.t).forEach((s) => {
    const mal = s.ms === null || s.ms > 10000;
    if (mal && !f) { f = { debut: s.t, fin: s.t }; } else if (mal) { f.fin = s.t; } else if (f) { fenetres.push(f); f = null; }
  });
  if (f) { fenetres.push(f); }
  const tasMax = tas.reduce((m, x) => (x.usedMo > m.usedMo ? x : m), { usedMo: 0 });
  const baseMax = base.reduce((m, x) => ((x.plusLongue || 0) > (m.plusLongue || 0) ? x : m), { plusLongue: 0 });
  const r = {
    debut: new Date(t0).toISOString(), dureeMin: Math.round((Date.now() - t0) / 60000), base: BASE, jvmVivante: vivant,
    jvmDisparueA: mortA ? new Date(mortA).toISOString() : null,
    sondes: sondes.length, sansReponseOuPlusDe10s: ko.length, plusDe2s: lentes.length,
    pireReponseMs: Math.max(0, ...sondes.filter((s) => s.ms !== null).map((s) => s.ms)),
    indisponibilites: fenetres.map((x) => heure(x.debut) + ' -> ' + heure(x.fin) + ' (' + Math.round((x.fin - x.debut) / 1000 + 2) + ' s)'),
    tasMaxMo: tasMax.usedMo, tasCapMo: tasMax.capMo, tasMaxA: tasMax.t ? heure(tasMax.t) : null,
    tempsGcS: tas.length ? tas[tas.length - 1].gcS - tas[0].gcS : null,
    requeteLaPlusLongueS: baseMax.plusLongue || 0, requeteLaPlusLongueA: baseMax.t ? heure(baseMax.t) : null, requeteLaPlusLongue: baseMax.req || [],
    attentesDeVerrouMax: Math.max(0, ...base.map((x) => x.verrous || 0)),
    jalons: jalons.map((j) => heure(j.t) + ' ' + j.quoi),
    erreursGraves: graves.length, erreursGravesExtraits: graves.slice(0, 15).map((g) => heure(g.t) + ' ' + g.loggeur + ' : ' + g.ligne),
    memoireLibrePosteMinMo: posteLibre.length ? Math.min(...posteLibre.map((x) => x.mo)) : null,
  };
  /* VERDICT : ce que l'officine appelle « serveur arrete » ou « caisses figees » */
  const raisons = [];
  if (!vivant) { raisons.push('JVM disparue a ' + heure(mortA)); }
  fenetres.filter((x) => x.fin - x.debut + 2000 >= SEUIL_GEL_MS)
    .forEach((x) => raisons.push('serveur sans reponse de ' + heure(x.debut) + ' a ' + heure(x.fin)));
  if (jalons.some((j) => /OUT OF MEMORY/.test(j.quoi))) { raisons.push('manque de memoire Java (OutOfMemoryError)'); }
  if (jalons.some((j) => /ARRET DU SERVEUR/.test(j.quoi))) { raisons.push('arret du serveur dans le journal'); }
  if (jalons.some((j) => /releve du stock : ERREUR/.test(j.quoi))) { raisons.push('erreur du releve du stock'); }
  r.verdict = raisons.length ? 'ECHEC' : 'OK';
  r.raisons = raisons;
  fs.writeFileSync(SORTIE, JSON.stringify(Object.assign({}, r, { detail: { sondes, tas, base, jalons, graves } })));
  return r;
}

const minuteurs = [setInterval(sonder, 2000), setInterval(jvm, 2000),
  setInterval(() => posteLibre.push({ t: Date.now(), mo: Math.round(require('os').freemem() / 1048576) }), 5000), setInterval(interrogerBase, 5000), setInterval(lireJournal, 2000),
  setInterval(() => { const r = resume(); console.log(heure(Date.now()) + ' sondes ' + r.sondes + ', sans reponse/>10 s ' + r.sansReponseOuPlusDe10s
    + ', tas max ' + r.tasMaxMo + ' Mo, requete la plus longue ' + r.requeteLaPlusLongueS + ' s, erreurs graves ' + r.erreursGraves
    + (vivant ? '' : ', JVM DISPARUE') + ', verdict ' + r.verdict); }, 60000)];
/* la surveillance commence a la fin du journal : on ne relit pas l'historique */
try { tailleLue = fs.statSync(path.join(DOMAINE || '', 'logs', 'server.log')).size; } catch (e) { tailleLue = 0; }
function finir() {
  minuteurs.forEach(clearInterval);
  setTimeout(() => { const r = resume(); console.log(JSON.stringify(r, null, 1)); process.exit(r.verdict === 'OK' ? 0 : 1); }, 3000);
}
setTimeout(finir, DUREE_MS);
process.on('SIGINT', finir);
process.on('SIGTERM', finir);
console.log('Surveillance de ' + BASE + ' (PID ' + (PID || '?') + ', base ' + (DB || '?') + ') pendant ' + DUREE_MS / 60000 + ' min');
