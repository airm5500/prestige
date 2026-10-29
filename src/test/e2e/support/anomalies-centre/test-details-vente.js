/* L5 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : facture-tiers-payant/details-vente (blocage de 37 s en officine,
 * ticket TCK-20261020-7C0519F6 ; 15 a 18 s mesures sur les copies).
 *
 *  - API : sans identifiant de vente, la route calculait les totaux sur TOUTES les ventes en cours. Attendu : reponse
 *    vide immediate (moins de 1 s) ; avec un identifiant, la reponse est inchangee (memes lignes et totaux) ;
 *  - ecran : FACTURATION > Factures, « Detail Bordereau » de la premiere facture, « Afficher le detail de la vente »
 *    de la premiere vente, puis « Actualiser » de la barre de pages des lignes : l'appel garde la vente (avant : sans
 *    identifiant, d'ou la lenteur).
 * Lecture seule. Les envois au centre de support sont interceptes.
 *
 * node support/anomalies-centre/test-details-vente.js   (BASE=http://localhost:9080/prestige pour le second domaine)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const visible = (p, r) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: 60000 });
async function iconeLigne(p, idGrille, indice, infobulle) {
  await p.locator('#' + idGrille + ' .x-grid-row').nth(indice).locator('img[data-qtip="' + infobulle + '"]').first().click();
}
const URL = '../api/v1/facture-tiers-payant/details-vente';

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const appels = [];
  p.on('requestfinished', async (r) => { if (/details-vente/.test(r.url())) { const t = r.timing(); appels.push({ url: r.url(), ms: Math.round(t.responseEnd) }); } });
  const appel = (u) => p.evaluate(async (u) => { const t0 = performance.now(); const x = await fetch(u); const j = await x.json().catch(() => null);
    return { statut: x.status, ms: Math.round(performance.now() - t0), json: j }; }, u);
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    const vide = await appel(URL);
    ok('API sans identifiant de vente : réponse vide en moins de 1 s', vide.statut === 200 && vide.ms < 1000 && vide.json && vide.json.total === '0'
      && Number(vide.json.total_vente) === 0, vide.ms + ' ms, total_vente ' + (vide.json && vide.json.total_vente));

    /* ecran */
    await ouvrirMenu(p, 'FACTURATION', 'Factures');
    await visible(p, 'facturemanager');
    const grille = await p.evaluate(() => { const g = Ext.ComponentQuery.query('facturemanager gridpanel, facturemanager[isXType]').filter((x) => x.getStore && x.isVisible(true))[0]
      || Ext.ComponentQuery.query('facturemanager')[0]; return g.getId(); });
    await p.waitForFunction((id) => { const g = Ext.getCmp(id); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, grille, { timeout: 60000 });
    await iconeLigne(p, grille, 0, 'Detail Bordereau');
    await p.waitForFunction(() => { const g = Ext.getCmp('CltgridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await iconeLigne(p, 'CltgridpanelID', 0, 'Afficher le detail de la vente');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelFacureID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const vente = await p.evaluate(() => Ext.getCmp('CltgridpanelID').getStore().getAt(0).get('lg_PREENREGISTREMENT_ID'));
    const lignes = await p.evaluate(() => Ext.getCmp('gridpanelFacureID').getStore().getCount());

    /* non-regression : avec l'identifiant, memes lignes */
    const avec = await appel(URL + '?lg_PREENREGISTREMENT_ID=' + encodeURIComponent(vente) + '&str_STATUT=is_Closed');
    ok('API avec identifiant : lignes de la vente renvoyées (comme l\'écran)', avec.statut === 200 && avec.json && Number(avec.json.total) === lignes,
      avec.ms + ' ms, ' + (avec.json && avec.json.total) + ' ligne(s) pour ' + lignes + ' à l\'écran');

    appels.length = 0;
    const actualiser = await p.evaluate(() => { const t = Ext.getCmp('gridpanelFacureID').down('pagingtoolbar'); const btn = t && t.down('#refresh'); return btn ? btn.getId() : null; });
    if (!actualiser) { throw new Error('Bouton Actualiser introuvable'); }
    await p.click('#' + actualiser);
    await p.waitForFunction(() => !Ext.getCmp('gridpanelFacureID').getStore().isLoading(), null, { timeout: 90000 });
    await p.waitForTimeout(500);
    const apres = await p.evaluate(() => Ext.getCmp('gridpanelFacureID').getStore().getCount());
    ok('Écran « Actualiser » des lignes : la vente est gardée, mêmes lignes',
      appels.length > 0 && appels.every((a) => a.url.indexOf('lg_PREENREGISTREMENT_ID=' + encodeURIComponent(vente)) >= 0) && apres === lignes,
      JSON.stringify(appels.map((a) => ({ id: /lg_PREENREGISTREMENT_ID=/.test(a.url), ms: a.ms }))) + ' lignes ' + apres + '/' + lignes);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
