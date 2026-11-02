/* CACHE DES EDITIONS (demande du 02/11), suite de la balance : « Articles en sur-stock » et « Statistique famille »
 * chargent toutes leurs lignes a l'ecran ; l'impression les reprend au lieu de refaire le calcul. Le serveur le dit
 * dans l'en-tete X-Donnees-Ecran de la reponse du bouton (1 : repris).
 * Pour chaque etat, par les vues : filtres saisis, « rechercher », puis « imprimer » : donnees reprises ; un filtre
 * change sans relancer la recherche, puis « imprimer » : calcul refait (le PDF suit le filtre saisi).
 * « Statistique famille » exige P_SM_FAMI_STAT, absent du role du compte d'essai : le test le donne le temps du
 * parcours (ligne E2E-CACHE-FAM) et le retire. Aucune autre ecriture.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const DROIT = 'E2E-CACHE-FAM';
const retirerDroit = () => q(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT}'`);
const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

/* clic sur le bouton d'impression : la reponse de la servlet (redirection vers le PDF), en-tete et duree */
async function imprimer(ctx, p, bouton, servlet) {
  const t0 = Date.now();
  const reponse = ctx.waitForEvent('response', { predicate: (r) => r.url().includes(servlet), timeout: 180000 });
  await cliquer(p, bouton);
  const r = await reponse;
  return { entete: r.headers()['x-donnees-ecran'], statut: r.status(), ms: Date.now() - t0 };
}

/* recherche : clic sur « rechercher », attente de la reponse de l'ecran puis du magasin */
async function rechercher(p, vue, grille, url) {
  const reponse = p.waitForResponse((r) => url.test(r.url()), { timeout: 180000 });
  await cliquer(p, vue + ' #rechercher');
  await reponse;
  await p.waitForFunction(([v, g]) => !Ext.ComponentQuery.query(v + ' ' + g)[0].getStore().isLoading(), [vue, grille], { timeout: 60000 });
}

(async () => {
  retirerDroit();
  q(`INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)`
    + ` SELECT '${DROIT}', ru.lg_ROLE_ID, pr.lg_PRIVELEGE_ID, NOW(), NOW() FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID`
    + ` JOIN t_privilege pr ON pr.str_NAME = 'P_SM_FAMI_STAT' WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}'`
    + ` AND NOT EXISTS (SELECT 1 FROM t_role_privelege x WHERE x.lg_ROLE_ID = ru.lg_ROLE_ID AND x.lg_PRIVILEGE_ID = pr.lg_PRIVELEGE_ID)`);
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---------------------------------------------------- Articles en sur-stock */
    await ouvrirMenu(p, 'MENU PHARMACIEN', 'Articles en sur-stock');
    await p.waitForFunction(() => Ext.ComponentQuery.query('SurStock').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await saisir(p, 'SurStock #stock', '1');
    await rechercher(p, 'SurStock', 'gridpanel', /\/surstocks\?/);
    const lignes = await p.evaluate(() => Ext.ComponentQuery.query('SurStock gridpanel')[0].getStore().getCount());
    ok('Sur-stock : grille chargée', lignes >= 0, lignes + ' ligne(s)');
    const a = await imprimer(ctx, p, 'SurStock #imprimer', 'DataReportingServlet');
    ok('Sur-stock : imprimer après rechercher, données de l\'écran reprises', a.entete === '1', 'en-tête ' + a.entete + ', ' + a.statut + ', ' + a.ms + ' ms');
    await saisir(p, 'SurStock #stock', '2');
    const c = await imprimer(ctx, p, 'SurStock #imprimer', 'DataReportingServlet');
    ok('Sur-stock : filtre changé sans rechercher, calcul refait', c.entete === '0', 'en-tête ' + c.entete + ', ' + c.statut + ', ' + c.ms + ' ms');
    console.log('Sur-stock, durées : repris ' + a.ms + ' ms, recalculé ' + c.ms + ' ms');

    /* ---------------------------------------------------- Statistique famille */
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Statistique famille');
    const ouverture = p.waitForResponse((r) => /statfamillearticle\?/.test(r.url()), { timeout: 120000 });
    await p.waitForFunction(() => Ext.ComponentQuery.query('statfamilleartcl').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await ouverture;
    const fin = new Date(); const debut = new Date(fin.getFullYear(), fin.getMonth() - 1, 1);
    await saisir(p, 'statfamilleartcl #dtStart', jj(debut));
    await saisir(p, 'statfamilleartcl #dtEnd', jj(fin));
    await rechercher(p, 'statfamilleartcl', '#familleStatGrid', /statfamillearticle\?/);
    const d = await imprimer(ctx, p, 'statfamilleartcl #imprimer', 'BalancePdfServlet');
    ok('Statistique famille : imprimer après rechercher, données de l\'écran reprises', d.entete === '1', 'en-tête ' + d.entete + ', ' + d.statut + ', ' + d.ms + ' ms');
    await saisir(p, 'statfamilleartcl #dtStart', jj(new Date(fin.getFullYear(), fin.getMonth() - 2, 1)));
    const e = await imprimer(ctx, p, 'statfamilleartcl #imprimer', 'BalancePdfServlet');
    ok('Statistique famille : dates changées sans rechercher, calcul refait', e.entete === '0', 'en-tête ' + e.entete + ', ' + e.statut + ', ' + e.ms + ' ms');
    console.log('Statistique famille, durées : repris ' + d.ms + ' ms, recalculé ' + e.ms + ' ms');
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('deroulement', false, x.stack);
  } finally {
    retirerDroit();
    await b.close();
    ok('Droit d\'essai retiré', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT}'`) === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
