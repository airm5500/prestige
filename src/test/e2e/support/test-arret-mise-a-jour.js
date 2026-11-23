/* ARRET DE LA MISE A JOUR : PAS D'ALERTE « ARRET BRUTAL » (journal d'appaul du 21/11, N6).
 *
 * Le 21/11 a 07:04-07:19, la mise a jour du matin a arrete puis relance Prestige sur chaque poste. Le serveur n'avait
 * pas le temps de s'arreter proprement : le fichier temoin du watchdog restait, et chaque redemarrage levait une alerte
 * WARN « Arret brutal du serveur : Arret force, sans erreur visible » (7 alertes, une par poste).
 *
 * Correction : le temoin note la version de Prestige ; au redemarrage, si elle a change et qu'aucun indice plus fort
 * n'explique l'arret, la cause est « Arret pour la mise a jour de Prestige » (INFO) : historique du serveur, sans
 * alerte au Centre de support.
 *
 * Vrai chemin, sur le domaine d'essai (jamais domain1) : arret force du processus Java du domaine (taskkill /F, comme
 * un arret qui n'attend pas la fin de l'application ; « asadmin stop-domain --kill » arrete proprement sous Windows et
 * efface le temoin), puis demarrage par asadmin.
 *  A. meme version : le diagnostic reste « Arret force », une alerte WARN est creee (comportement inchange) ;
 *  B. version changee (le temoin laisse par la session tuee porte une autre version, comme celui de la version
 *     precedente apres une mise a jour) : session close en « BRUTAL » avec la cause MISE_A_JOUR, les deux versions dans
 *     l'explication, et aucune alerte.
 * Bilan : chaque scenario laisse exactement ses traces (une session close, une alerte pour A, aucune pour B) ; le test
 * retire ensuite les sessions closes et l'alerte qu'il a creees.
 *
 * Variables : PAYARA_DOMAINE (dossier du domaine d'essai), DB_TEST, BASE.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ENV_E2E = require('../outils/poste');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();

const DOMAINE = process.env.PAYARA_DOMAINE || '';
const NOM = path.basename(DOMAINE);
if (!DOMAINE || NOM === 'domain1') {
  console.log('FAIL  Domaine d\'essai requis (PAYARA_DOMAINE), jamais domain1 : ' + DOMAINE);
  process.exit(1);
}
const ASADMIN = path.join(DOMAINE, '..', '..', '..', 'bin', 'asadmin.bat');
const asadmin = (...args) => execFileSync('cmd', ['/c', ASADMIN, ...args], { encoding: 'utf8', timeout: 600000 });
const TEMOIN_DIR = process.env.WATCHDOG_DIR || 'D:/prestige/support/watchdog';
const TEMOIN = path.join(TEMOIN_DIR, 'heartbeat-' + NOM.replace(/[^A-Za-z0-9_-]/g, '_') + '.flag');
const URL_BASE = (process.env.BASE || '').replace(/\/$/, '');

const attendreApplication = async () => {
  const fin = Date.now() + 600000;
  while (Date.now() < fin) {
    try {
      const r = await fetch(URL_BASE + '/security/index.html');
      if (r.ok) { return true; }
    } catch (e) { /* pas encore demarre */ }
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  return false;
};
/* le watchdog lit le temoin au demarrage puis le reecrit : on attend sa reecriture */
const attendreTemoin = async (avant) => {
  const fin = Date.now() + 120000;
  while (Date.now() < fin) {
    if (fs.existsSync(TEMOIN) && fs.statSync(TEMOIN).mtimeMs > avant) { return true; }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  return false;
};
const idsAlertes = () => q("SELECT id FROM t_application_event WHERE url_ou_ecran LIKE 'serveur:crash-%'").split(/\r?\n/).filter(Boolean);
const alertes = () => idsAlertes().length;
/* alertes creees par le test, retirees a la fin (et elles seules) */
const creees = new Set();
/* processus Java du domaine d'essai, reconnu au dossier du domaine dans sa ligne de commande (seul ce PID est tue) */
const pidDomaine = () => {
  const sortie = execFileSync('powershell', ['-NoProfile', '-Command',
    "Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | ForEach-Object { if ($_.CommandLine -match 'domains[\\/]" + NOM + "[\\/ \"]') { $_.ProcessId } }"],
  { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  if (sortie.length !== 1) { throw new Error('Processus du domaine ' + NOM + ' introuvable ou ambigu : ' + sortie.join(',')); }
  return sortie[0];
};
/* session en cours du domaine d'essai : celle de son PID (d'autres domaines du poste peuvent ecrire dans la meme base) */
const sessionDe = (pid) => q("SELECT IFNULL(MAX(id), 0) FROM t_serveur_vie WHERE pid = " + pid + " AND arret = 'EN_COURS'");

/* arret force puis demarrage ; modifier(temoin) peut changer le temoin laisse par la session tuee */
async function arretForce(modifier) {
  const pid = pidDomaine();
  const deja = new Set(idsAlertes());
  const avant = { alertes: deja.size, session: Number(sessionDe(pid)), max: Number(q('SELECT MAX(id) FROM t_serveur_vie')) };
  execFileSync('taskkill', ['/F', '/PID', pid], { encoding: 'utf8' });
  await new Promise((ok) => setTimeout(ok, 3000));
  const laisse = fs.existsSync(TEMOIN) ? fs.readFileSync(TEMOIN, 'utf8') : '';
  if (modifier) { fs.writeFileSync(TEMOIN, modifier(laisse)); }
  const t0 = Date.now();
  asadmin('start-domain', NOM);
  const pret = await attendreApplication();
  const temoin = await attendreTemoin(t0);
  await new Promise((ok) => setTimeout(ok, 3000));
  const close = q('SELECT CONCAT_WS(\'|\', arret, IFNULL(cause_code, \'\'), IFNULL(cause_explication, \'\')) FROM t_serveur_vie WHERE id = ' + avant.session);
  const nouvelles = q('SELECT COUNT(*) FROM t_serveur_vie WHERE id > ' + avant.max);
  const apres = idsAlertes();
  apres.filter((id) => !deja.has(id)).forEach((id) => creees.add(id));
  return { avant, laisse, pret, temoin, close: close.split('|'), nouvelles: Number(nouvelles), alertes: apres.length - avant.alertes };
}

(async () => {
  const sessionsCreees = [];
  try {
    const actuel = fs.existsSync(TEMOIN) ? fs.readFileSync(TEMOIN, 'utf8') : '';
    const version = ((actuel.match(/^version=(.+)$/m) || [])[1] || '').trim();
    ok('Le témoin du domaine porte la version de Prestige', !!version, TEMOIN + ' : ' + (version || actuel.replace(/\n/g, ' ')));

    /* A. meme version : comportement inchange */
    const a = await arretForce(null);
    sessionsCreees.push(a.avant.session);
    ok('A. Prestige redémarré après l\'arrêt forcé', a.pret && a.temoin, `${a.pret} ${a.temoin}`);
    ok('A. Même version : session close « BRUTAL », cause ARRET_FORCE', a.close[0] === 'BRUTAL' && a.close[1] === 'ARRET_FORCE', a.close.join(' | '));
    ok('A. Même version : une alerte, une seule nouvelle session', a.alertes === 1 && a.nouvelles === 1, `alertes +${a.alertes}, sessions +${a.nouvelles}`);

    /* B. version changee : la mise a jour */
    const ancienne = '2026-11-16 03:45 UTC';
    const b = await arretForce((t) => (/^version=/m.test(t) ? t.replace(/^version=.*$/m, 'version=' + ancienne) : t.trimEnd() + '\nversion=' + ancienne + '\n'));
    sessionsCreees.push(b.avant.session);
    ok('B. Prestige redémarré après l\'arrêt de la mise à jour', b.pret && b.temoin, `${b.pret} ${b.temoin}`);
    ok('B. Version changée : session close « BRUTAL », cause MISE_A_JOUR', b.close[0] === 'BRUTAL' && b.close[1] === 'MISE_A_JOUR', b.close.join(' | '));
    ok('B. L\'explication donne l\'ancienne et la nouvelle version', b.close[2].includes(ancienne) && !!version && b.close[2].includes(version), b.close[2]);
    ok('B. Aucune alerte, une seule nouvelle session', b.alertes === 0 && b.nouvelles === 1, `alertes +${b.alertes}, sessions +${b.nouvelles}`);
    const relu = fs.readFileSync(TEMOIN, 'utf8');
    ok('B. Le témoin réécrit porte la version qui tourne', relu.includes('version=' + version), relu.replace(/\n/g, ' '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    /* retrait des traces du test : sessions tuees (closes) et alertes creees (scenario A ; B sur l'ancien code) */
    for (const id of sessionsCreees) {
      q('DELETE FROM t_serveur_vie WHERE id = ' + id + " AND arret <> 'EN_COURS'");
    }
    for (const id of creees) {
      /* le client mariadb double les antislashs du chemin en sortie -sN */
      const ref = q("SELECT IFNULL(log_ref, '') FROM t_application_event WHERE id = '" + id + "'").replace(/\\\\/g, '\\');
      q("DELETE FROM t_application_event_occurrence WHERE event_id = '" + id + "'; DELETE FROM t_application_event WHERE id = '" + id + "'");
      if (ref && fs.existsSync(ref)) { fs.unlinkSync(ref); }
    }
    ok('Nettoyage : alertes et sessions du test retirées', idsAlertes().every((id) => !creees.has(id))
      && sessionsCreees.every((id) => q('SELECT COUNT(*) FROM t_serveur_vie WHERE id = ' + id + " AND arret <> 'EN_COURS'") === '0'), [...creees].join(', '));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
