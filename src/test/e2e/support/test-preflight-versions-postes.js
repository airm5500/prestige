/* CENTRE DE SUPPORT > « Diagnostic & bugs » > auto-diagnostic : VERSION DES POSTES (journal support du 26/11, J26-3).
 *
 * Le 25/11 a 00:10, sur capitale, une alerte « Job planifie en retard ... (le job n'a peut-etre jamais tourne) » a ete
 * ecrite sans version : ce texte a disparu du code le 14/10, et toute version posterieure au 28/10 date ses
 * evenements. Un Payara branche sur la base tournait donc avec un WAR ancien, sans que rien ne le dise.
 * Par les vues : menu, bouton de l'auto-diagnostic. Rapprochement base / ecran :
 *  - etat initial : la ligne « Version des postes » est rouge si et seulement si la base contient deja un evenement
 *    de moins de 48 h sans version (hors maintenance), et annonce alors leur nombre ;
 *  - evenement d'essai sans version, comme l'ecrirait un ancien WAR : ligne rouge, nombre + 1, message cite, version
 *    attendue de ce poste rappelee ;
 *  - maintenance d'essai sans version : le nombre ne change pas (les maintenances n'etaient pas datees) ;
 *  - bilan : le rejeu de l'auto-diagnostic n'ecrit rien dans le journal (memes lignes avant et apres) ;
 *  - aucune erreur JavaScript.
 * Les lignes d'essai (signatures « e2e-version-postes-* ») sont retirees a la fin, meme en cas d'echec.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ESSAI = 'e2e-version-postes-';
const MESSAGE = 'E2E evenement sans version (ancien WAR)';
const retirer = () => q(`DELETE FROM t_application_event WHERE signature LIKE '${ESSAI}%'`);
const SANS_VERSION = "FROM t_application_event WHERE created_at >= NOW() - INTERVAL 48 HOUR"
  + " AND (version_app IS NULL OR version_app = '') AND url_ou_ecran NOT LIKE 'maintenance:%'";
const inserer = (suffixe, url) => q("INSERT INTO t_application_event (id, created_at, modified_at, status, last_seen_at, module, type,"
  + " niveau, signature, message_court, occurrences, utilisateur, url_ou_ecran, version_app) VALUES"
  + ` (UUID(), NOW(), NOW(), 'ENABLE', NOW(), 'SERVEUR', 'SERVEUR', 'ERROR', '${ESSAI}${suffixe}', '${MESSAGE}', 1, 'WATCHDOG', '${url}', NULL)`);

(async () => {
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const diagnostic = async () => {
    const reponse = p.waitForResponse((r) => r.url().includes('support/diagnostic/preflight'), { timeout: 60000 });
    await cliquer(p, 'supportdiagnostic button#btnPreflight');
    await reponse;
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').some((w) => w.isVisible()), null, { timeout: 30000 });
    return p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').filter((x) => x.isVisible())[0];
      const tr = [...w.getEl().dom.querySelectorAll('tr')].find((x) => x.textContent.includes('Version des postes'));
      const r = tr ? { rouge: tr.querySelector('span').style.color === 'red', texte: tr.textContent } : null;
      w.close();
      return r;
    });
  };
  const nombreAnnonce = (l) => { const m = l && /(\d+) evenement\(s\) ecrit\(s\) sans version/.exec(l.texte); return m ? Number(m[1]) : 0; };
  try {
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic').some((c) => c.isVisible(true)), null, { timeout: 60000 });

    const enBase = Number(q('SELECT COUNT(*) ' + SANS_VERSION));
    const lignesAvant = q('SELECT COUNT(*) FROM t_application_event');
    let l = await diagnostic();
    ok('État initial : ligne « Version des postes » présente, rouge seulement s\'il y a déjà des événements sans version',
      l && l.rouge === (enBase > 0) && nombreAnnonce(l) === enBase, 'en base ' + enBase + ' ; ' + JSON.stringify(l));

    inserer('ancien', 'serveur:job-E2E-VERSION');
    l = await diagnostic();
    ok('Événement d\'un ancien WAR : ligne rouge, nombre + 1, version attendue rappelée',
      l && l.rouge && nombreAnnonce(l) === enBase + 1 && /la version doit etre \d{4}-\d{2}-\d{2}/.test(l.texte), JSON.stringify(l));
    ok('Écran = base : nombre annoncé identique au compte en base', nombreAnnonce(l) === Number(q('SELECT COUNT(*) ' + SANS_VERSION)));

    inserer('maintenance', 'maintenance:E2E');
    l = await diagnostic();
    ok('Maintenance sans version : le nombre ne change pas', l && nombreAnnonce(l) === enBase + 1, JSON.stringify(l));

    ok('Bilan : le rejeu n\'écrit rien dans le journal (seules les 2 lignes d\'essai en plus)',
      Number(q('SELECT COUNT(*) FROM t_application_event')) === Number(lignesAvant) + 2);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Lignes d\'essai retirées', q(`SELECT COUNT(*) FROM t_application_event WHERE signature LIKE '${ESSAI}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
