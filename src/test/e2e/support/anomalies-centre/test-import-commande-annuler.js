/* TEST D'ECRAN : « Annuler » de la fenetre « Importer une commande » (ticket TCK-20260929-E81DF44E).
 *
 * Signalement : TypeError « can't access property "close", Ext.getCmp(...) is undefined » (ImportXLS.js:191).
 * Parcours : GESTION DES COMMANDES > Commande en cours, bouton « IMPORTER UNE COMMANDE », puis « Annuler ».
 * Attendu : la fenetre se ferme sans erreur JavaScript. Le test echoue tant que le defaut est present.
 * Aucune donnee ecrite : l'envoi de l'erreur au centre de support est intercepte (aucun evenement cree).
 *
 * node support/anomalies-centre/test-import-commande-annuler.js */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const V = require('../../outils/vues');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
  await V.ouvrirMenu(p, process.env.MENU_PARENT || 'GESTION DES COMMANDES', process.env.MENU_ENTREE || 'Commande en cours');
  await p.getByText('IMPORTER UNE COMMANDE', { exact: true }).first().click();
  await p.waitForFunction(() => { const w = Ext.getCmp('xlsxdialog'); return w && w.isVisible(); }, null, { timeout: 15000 });
  await V.cliquer(p, '#xlsxdialog button[text=Annuler]');
  await p.waitForTimeout(1000);
  const fenetreFermee = await p.evaluate(() => !Ext.getCmp('xlsxdialog'));
  await ENV_E2E.capture(p, 'import-commande-annuler');
  await b.close();
  const fautives = erreurs.filter((m) => /close/.test(m));
  console.log('fenetre fermee :', fenetreFermee, '| erreurs JS :', erreurs.length ? erreurs.join(' || ') : 'aucune');
  if (fautives.length || !fenetreFermee) {
    console.log('ECHEC : defaut reproduit (erreur « close » au clic sur Annuler)');
    process.exit(1);
  }
  console.log('OK : fenetre fermee sans erreur');
})().catch((e) => { console.error(e); process.exit(2); });
