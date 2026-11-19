/* SAUVEGARDE RECONNUE PAR LA SURVEILLANCE DE LA BASE (retour support du 18/11, R7).
 *
 * Chaque matin vers 08:35, la surveillance publiait « 1 requete(s) en cours depuis plus de 10 s (la plus ancienne :
 * 115 s) ». C'etait la sauvegarde elle-meme (mysqldump --single-transaction). Desormais elle est reconnue : ecartee
 * des requetes lentes, montree a part (« Sauvegarde en cours depuis n s »).
 *
 * Rapprochement, par les clics de l'utilisateur (Centre de support > Diagnostic & bugs > « Base de données ») :
 *  - une vraie sauvegarde (mariadb-dump --single-transaction de la copie d'essai) est tenue en cours ;
 *  - l'ecran montre « Sauvegarde en cours depuis n s », n = duree relevee dans PROCESSLIST (± 5 s) ;
 *  - le nombre de requetes lentes de l'ecran = celui de la route = 0 (la sauvegarde n'y est pas), et le detail ne
 *    cite pas la sauvegarde ;
 *  - la sauvegarde arretee, la ligne disparait ;
 *  - bilan : parametre de seuil remis, plus aucune sauvegarde en cours ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync, spawn } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CLE = 'SUPPORT_DB_SLOW_QUERY_S';
const dumpEnCours = () => q("SELECT COALESCE(MAX(TIME), -1) FROM information_schema.PROCESSLIST WHERE INFO LIKE 'SELECT /*!40001 SQL_NO_CACHE */%'");

async function panneauBase(p) {
  await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[title="Base de données — état courant"]')[0]; if (w) { w.close(); } });
  await p.locator('.x-btn:has-text("Base de données")').filter({ visible: true }).first().click();
  await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="Base de données — état courant"]').length > 0, null, { timeout: 30000 });
  return p.evaluate(() => Ext.ComponentQuery.query('window[title="Base de données — état courant"]')[0].body.dom.innerText);
}

(async () => {
  const avant = q("SELECT COALESCE(MAX(str_VALUE), '(absent)') FROM t_parameters WHERE str_KEY = '" + CLE + "'");
  if (avant === '(absent)') {
    q("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES ('" + CLE + "', '2', 'essai e2e', 'CUSTOMER', 'enable', NOW())");
  } else {
    q("UPDATE t_parameters SET str_VALUE = '2' WHERE str_KEY = '" + CLE + "'");
  }
  let dump = null;
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = [];
  p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    // une vraie sauvegarde, tenue en cours : sa sortie n'est jamais lue, mariadb-dump attend donc au milieu de la table
    dump = spawn('mariadb-dump', [...ENV_E2E.MARIADB, '--single-transaction', '--skip-lock-tables', BASE, 't_preenregistrement'], { stdio: ['ignore', 'pipe', 'ignore'] });
    dump.stdout.pause();
    const t0 = Date.now();
    while (Number(dumpEnCours()) < 4 && Date.now() - t0 < 60000) { await p.waitForTimeout(500); }
    ok('Précondition : la sauvegarde est en cours dans MariaDB (PROCESSLIST)', Number(dumpEnCours()) >= 4, dumpEnCours());

    await vues.connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest'); // Centre de support : super administrateur
    await vues.ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic').length > 0, null, { timeout: 60000 });
    const texte = await panneauBase(p);
    const duree = Number(dumpEnCours());
    const route = await p.evaluate(async () => (await (await fetch('../api/v1/support/diagnostic/base')).json()).data);
    const m = /Sauvegarde en cours\s*depuis (\d+) s/.exec(texte);
    ok('Écran : « Sauvegarde en cours depuis n s »', !!m, texte.slice(0, 400));
    ok('Rapprochement : durée de l\'écran = durée dans MariaDB (± 5 s)', m && Math.abs(Number(m[1]) - duree) <= 5, (m && m[1]) + ' / ' + duree);
    ok('Rapprochement : durée de la route = durée dans MariaDB (± 5 s)', Math.abs(route.sauvegardeEnCoursS - duree) <= 5, route.sauvegardeEnCoursS + ' / ' + duree);
    const lentes = /Requêtes de plus de 2 s \(hors sauvegarde\)\s*(-?\d+)/.exec(texte);
    ok('Écran : la sauvegarde n\'est pas comptée parmi les requêtes lentes (0)', lentes && lentes[1] === '0', lentes && lentes[0]);
    ok('Route : 0 requête lente, comme l\'écran', route.requetesLentes === 0, JSON.stringify({ lentes: route.requetesLentes }));
    ok('Détail des requêtes lentes : la sauvegarde n\'y figure pas', !/40001|SQL_NO_CACHE/.test(texte), '');

    // sauvegarde arretee : la ligne disparait
    dump.kill(); dump = null;
    const t1 = Date.now();
    while (Number(dumpEnCours()) >= 0 && Date.now() - t1 < 30000) { await p.waitForTimeout(500); }
    const apres = await panneauBase(p);
    ok('Sauvegarde arrêtée : plus de ligne « Sauvegarde en cours »', !/Sauvegarde en cours/.test(apres), apres.slice(0, 300));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack || e);
  } finally {
    if (dump) { dump.kill(); }
    await b.close();
    if (avant === '(absent)') {
      q("DELETE FROM t_parameters WHERE str_KEY = '" + CLE + "'");
    } else {
      q("UPDATE t_parameters SET str_VALUE = '" + avant.replace(/'/g, "''") + "' WHERE str_KEY = '" + CLE + "'");
    }
    const t2 = Date.now();
    while (Number(dumpEnCours()) >= 0 && Date.now() - t2 < 30000) { await new Promise((r) => setTimeout(r, 500)); }
    ok('Bilan : seuil remis, plus aucune sauvegarde en cours', q("SELECT COALESCE(MAX(str_VALUE), '(absent)') FROM t_parameters WHERE str_KEY = '" + CLE + "'") === avant
      && Number(dumpEnCours()) < 0, avant);
  }
  const ko = res.filter((r) => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
