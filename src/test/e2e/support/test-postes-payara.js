/* STABILITE DU SERVEUR, onglet « Postes » (demande du 02/11) : reglages de Payara de chaque poste (serveur et caisses
 * secondaires qui ont leur propre Payara), vus depuis l'ecran du serveur. Par les vues :
 *  - menu CENTRE DE SUPPORT > « Stabilité du serveur », onglet « Réglages conseillés » puis onglet « Postes » ;
 *  - ce poste y figure, marque « (ce poste) », avec son role, sa memoire, son pool et ses fils HTTP ;
 *  - deux caisses d'essai (lignes posees par le test, comme si leur Payara les avait relevees) : l'une a un pool
 *    enorme et un reglage critique, l'autre sans nouvelles depuis 40 jours ; les alertes d'ensemble les signalent ;
 *  - clic sur une caisse : ses reglages s'affichent dessous ;
 *  - lecture seule, aucune fenetre, aucune erreur JavaScript ; lignes et droit d'essai retires.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('./privilege-essai');
const { connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN_SUPPORT, 'P_SM_SUPPORT_SERVEUR');
const retirer = () => exec("DELETE FROM t_serveur_poste WHERE hote LIKE 'E2E-CAISSE-%'");
const REGLAGES = JSON.stringify([{ cle: 'fils', libelle: 'Fils HTTP de Payara', actuel: '5', conseille: '50', niveau: 'CRITIQUE' },
  { cle: 'pool', libelle: 'Connexions du pool', actuel: '5000', conseille: '32', niveau: 'A_AJUSTER' }]).replace(/'/g, "''");

(async () => {
  droit.remettre();
  droit.accorder();
  retirer();
  exec(`INSERT INTO t_serveur_poste (hote, domaine, serveur, mariadb_locale, releve_at, ram_mo, heap_mo, processeurs, pool_max, fils_http, a_ajuster, critiques, reglages)
        VALUES ('E2E-CAISSE-2', 'domain1', 0, 0, NOW() - INTERVAL 1 HOUR, 8192, 1024, 4, 5000, 5, 2, 1, '${REGLAGES}'),
               ('E2E-CAISSE-3', 'domain1', 0, 0, NOW() - INTERVAL 40 DAY, 4096, 1024, 2, 32, 50, 0, 0, '[]')`);
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [], err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    p.on('pageerror', (e) => err.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN_SUPPORT, 'e2etest');
    await ouvrirMenu(p, 'CENTRE DE SUPPORT', 'Stabilité du serveur');
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    const onglet = (titre) => p.locator('.supportserveur .x-tab').filter({ hasText: titre }).first();

    /* l'onglet Reglages inscrit ce poste (comme son demarrage), puis l'onglet Postes les liste */
    const reglages = p.waitForResponse((r) => /support\/serveur\/reglages(\?|$)/.test(r.url()), { timeout: 60000 });
    await onglet('Réglages conseillés').click();
    await reglages;
    const machines = p.waitForResponse((r) => /support\/serveur\/machines/.test(r.url()), { timeout: 60000 });
    await onglet('Postes').click();
    await machines;
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #postesPayara')[0].getStore().getCount() > 0, null, { timeout: 15000 });
    const lignes = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #postesPayara')[0].getStore().getRange().map((r) => r.data));
    const vue = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #postesPayara')[0].getView().getEl().id);
    const texte = await p.locator('#' + vue).innerText();
    const courant = lignes.find((x) => x.courant);
    ok('Ce poste figure, marqué « (ce poste) », avec mémoire, pool et fils HTTP', courant && courant.ramMo > 0 && courant.heapMo > 0 && courant.pool > 0 && courant.filsHttp > 0
      && /\(ce poste\)/.test(texte), JSON.stringify(courant && { hote: courant.hote, domaine: courant.domaine, pool: courant.pool, fils: courant.filsHttp }));
    ok('Ce poste : rôle et base lus de sa configuration', courant && courant.serveur === true && courant.mariadbLocale === true,
      courant && courant.serveur + ' / ' + courant.mariadbLocale);
    ok('Mémoires lisibles (« 8 Go », « 23,6 Go », jamais « 8, Go »)', /E2E-CAISSE-2[\s\S]*?\s8 Go\s+1 Go\s/.test(texte) && !/\d, Go/.test(texte),
      texte.slice(0, 200));
    ok('Caisse d\'essai affichée : rôle Caisse, pool 5000, « 1 critique(s) · 1 à ajuster »',
      /E2E-CAISSE-2\s+domain1\s+Caisse\s+à distance[\s\S]*5000[\s\S]*1 critique\(s\) · 1 à ajuster/.test(texte), texte.slice(0, 400));
    const alertes = await p.locator('#' + await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #alertesPostes')[0].getId())).innerText();
    ok('Alerte : pools au-delà de ce que MariaDB accepte', /totalisent \d+ connexions[\s\S]*n'en accepte que \d+/.test(alertes), alertes.slice(0, 300));
    ok('Alerte : caisse sans nouvelles depuis 40 jours', /Pas de relevé de « E2E-CAISSE-3 »/.test(alertes), alertes.slice(0, 300));
    const resume = await p.evaluate(() => Ext.ComponentQuery.query('supportserveur #resumePostes')[0].el.dom.textContent);
    ok('Résumé : postes relevés, postes déclarés, connexions MariaDB', /\d+ poste\(s\) relevé\(s\) pour \d+ déclaré\(s\)/.test(resume), resume);

    /* clic sur la caisse : ses reglages dessous */
    await p.locator('.supportserveur .x-grid-row').filter({ hasText: 'E2E-CAISSE-2' }).first().click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('supportserveur #reglagesPoste')[0].getStore().getCount() === 2, null, { timeout: 10000 }).catch(() => {});
    const detail = await p.evaluate(() => { const g = Ext.ComponentQuery.query('supportserveur #reglagesPoste')[0]; return { titre: g.title, n: g.getStore().getCount(), texte: g.getView().getEl().dom.innerText }; });
    ok('Clic sur la caisse : ses deux réglages dessous, le critique en clair', detail.n === 2 && /E2E-CAISSE-2/.test(detail.titre)
      && /Fils HTTP de Payara\s+5\s+50\s+Critique/.test(detail.texte), detail.titre + ' / ' + detail.texte.slice(0, 200));
    ok('Aucune fenêtre, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    await b.close();
    retirer();
    droit.reprendre();
    droit.remettre();
    ok('Lignes d\'essai retirées', q("SELECT COUNT(*) FROM t_serveur_poste WHERE hote LIKE 'E2E-CAISSE-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
