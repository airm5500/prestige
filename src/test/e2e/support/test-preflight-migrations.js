/* CENTRE DE SUPPORT > « Diagnostic & bugs » > auto-diagnostic : MISES A JOUR DE LA BASE EN ECHEC (journaux du 02/10
 * au 17/10).
 *
 * A chaque redemarrage du serveur de l'officine : « Schema contains a failed repeatable migration (update system
 * privilege) ». Une ligne en echec dans flyway_schema_history bloque toutes les mises a jour suivantes, et rien ne le
 * signalait hors du server.log.
 * Par les vues : menu, bouton de l'auto-diagnostic.
 *  - sans echec : la ligne « Mises a jour de la base (Flyway) » est verte ;
 *  - avec une ligne en echec (posee par le test dans la copie de travail) : la ligne est rouge, nomme la mise a jour
 *    et dit qu'elle bloque les suivantes ;
 *  - aucune erreur JavaScript.
 * La ligne d'essai (description « E2E echec migration ») est retiree a la fin, meme en cas d'echec.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ESSAI = 'E2E echec migration';
const retirer = () => q(`DELETE FROM flyway_schema_history WHERE description = '${ESSAI}'`);

(async () => {
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  /* la ligne du controle dans la fenetre de l'auto-diagnostic : couleur et detail */
  const diagnostic = async () => {
    const reponse = p.waitForResponse((r) => r.url().includes('support/diagnostic/preflight'), { timeout: 60000 });
    await cliquer(p, 'supportdiagnostic button#btnPreflight');
    await reponse;
    await p.waitForFunction(() => Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').some((w) => w.isVisible()), null, { timeout: 30000 });
    const l = await p.evaluate(() => {
      const w = Ext.ComponentQuery.query('window[title="Auto-diagnostic de la supervision"]').filter((x) => x.isVisible())[0];
      const tr = [...w.getEl().dom.querySelectorAll('tr')].find((x) => x.textContent.includes('Mises a jour de la base (Flyway)'));
      const r = tr ? { rouge: tr.querySelector('span').style.color === 'red', texte: tr.textContent } : null;
      w.close();
      return r;
    });
    return l;
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Diagnostic & bugs');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportdiagnostic').some((c) => c.isVisible(true)), null, { timeout: 60000 });

    let l = await diagnostic();
    ok('Sans échec : la ligne « Mises à jour de la base » est présente et verte', l && !l.rouge, JSON.stringify(l));

    q(`INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)`
      + ` SELECT MAX(installed_rank) + 1000, NULL, '${ESSAI}', 'SQL', 'R__e2e_echec.sql', 0, 'e2e', NOW(), 0, 0 FROM flyway_schema_history`);
    l = await diagnostic();
    ok('Avec une mise à jour en échec : ligne rouge qui la nomme et dit qu\'elle bloque les suivantes',
      l && l.rouge && l.texte.includes(ESSAI) && l.texte.includes("ne s'appliquent plus"), JSON.stringify(l));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Ligne d\'essai retirée', q(`SELECT COUNT(*) FROM flyway_schema_history WHERE description = '${ESSAI}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
