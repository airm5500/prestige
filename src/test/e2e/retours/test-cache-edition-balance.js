/* CACHE DES EDITIONS (demande du 02/11) : l'impression de la balance reprend les donnees que l'ecran vient
 * d'afficher au lieu de refaire le calcul. Le serveur le dit dans l'en-tete X-Donnees-Ecran du PDF (1 : repris).
 *  - periode chargee par « rechercher », puis « imprimer » : donnees reprises ;
 *  - dates changees sans relancer la recherche, puis « imprimer » : calcul refait (le PDF suit les dates saisies) ;
 *  - une autre session (autre navigateur) n'a pas les donnees du premier.
 * Lecture seule : aucune donnee posee.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu, cliquer, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const jj = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

/* la balance ouverte par le menu, periode saisie et recherchee */
async function ouvrir(ctx, debut, fin) {
  const p = await ctx.newPage();
  await connexion(p, ENV_E2E.LOGIN, 'e2etest');
  await ouvrirMenu(p, 'GESTION COURANTE', 'Balance Vente/Caisse2');
  await p.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 20000 });
  await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 60000 });
  await saisir(p, 'balancesalecahs #dtStart', debut);
  await saisir(p, 'balancesalecahs #dtEnd', fin);
  const chargement = p.waitForResponse((r) => /\/balancesalecash\?/.test(r.url()), { timeout: 120000 });
  await cliquer(p, 'balancesalecahs #rechercher');
  await chargement;
  await p.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 60000 });
  return p;
}

/* clic sur « imprimer » : la reponse du PDF ouvert dans un nouvel onglet */
async function imprimer(ctx, p) {
  const t0 = Date.now();
  const reponse = ctx.waitForEvent('response', { predicate: (r) => r.url().includes('/balancesalecash/pdf'), timeout: 180000 });
  await cliquer(p, 'balancesalecahs #imprimer');
  const r = await reponse;
  await r.finished();
  /* le corps d'un PDF ouvert dans la visionneuse n'est pas lisible : sa taille l'est */
  const taille = (await r.request().sizes().catch(() => ({}))).responseBodySize || 0;
  return { entete: r.headers()['x-donnees-ecran'], type: r.headers()['content-type'] || '', taille, ms: Date.now() - t0 };
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const fin = new Date(); const debut = new Date(fin.getFullYear(), fin.getMonth() - 1, 1);
    const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p = await ouvrir(ctx, jj(debut), jj(fin));
    p.on('pageerror', (e) => err.push(String(e.message)));
    ok('Bouton « imprimer » affiché et actif', await p.evaluate(() => { const x = Ext.ComponentQuery.query('balancesalecahs #imprimer')[0]; return x && x.isVisible(true) && !x.isDisabled(); }));

    const a = await imprimer(ctx, p);
    ok('PDF produit', a.type.includes('pdf') && a.taille > 1000, a.type + ' ' + a.taille + ' o');
    ok('Imprimer après rechercher : données de l\'écran reprises', a.entete === '1', 'en-tête ' + a.entete + ', ' + a.ms + ' ms');

    /* dates changees sans relancer la recherche : l'edition suit les dates saisies, donc recalcule */
    const autreDebut = new Date(fin.getFullYear(), fin.getMonth() - 2, 1);
    await saisir(p, 'balancesalecahs #dtStart', jj(autreDebut));
    const c = await imprimer(ctx, p);
    ok('Dates changées sans rechercher : calcul refait', c.entete === '0', 'en-tête ' + c.entete + ', ' + c.ms + ' ms');
    ok('PDF produit (dates changées)', c.type.includes('pdf') && c.taille > 1000, c.type + ' ' + c.taille + ' o');

    /* une autre session n'a pas les donnees de la premiere */
    const ctx2 = await b.newContext({ viewport: { width: 1500, height: 950 } });
    const p2 = await ctx2.newPage();
    await connexion(p2, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p2, 'GESTION COURANTE', 'Balance Vente/Caisse2');
    await p2.waitForFunction(() => Ext.ComponentQuery.query('balancesalecahs #balanceGrid').length > 0, null, { timeout: 20000 });
    await p2.waitForFunction(() => !Ext.ComponentQuery.query('balancesalecahs #balanceGrid')[0].getStore().isLoading(), null, { timeout: 60000 });
    await saisir(p2, 'balancesalecahs #dtStart', jj(debut));
    await saisir(p2, 'balancesalecahs #dtEnd', jj(fin));
    const d = await imprimer(ctx2, p2);
    ok('Autre session, sans rechercher : rien de repris de la première', d.entete === '0', 'en-tête ' + d.entete);
    console.log('Durées : repris ' + a.ms + ' ms, recalculé ' + c.ms + ' ms');
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
