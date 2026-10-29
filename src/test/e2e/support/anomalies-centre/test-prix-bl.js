/* C5 / J19 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : modification du prix d'une ligne de bon de livraison.
 *
 * La fenetre ne s'ouvre que depuis un bon EN COURS (« Gestion des entrees ») ; une copie n'en a pas toujours. Le test
 * en fabrique un par l'ecran, puis le retire par l'ecran :
 *  1. GESTION DES COMMANDES > Commande en cours : « Cloner la commande » de la premiere commande (copie en cours) ;
 *  2. sur la copie, « Créer le bon de livraisson » : reference E2E-BL-..., date du jour, montant de la commande ;
 *  3. GESTION DES COMMANDES > Gestion des entrees : detail du bon d'essai, « Modifier Article » de la premiere ligne.
 *     Tout appel a ws_transaction.jsp?mode=modifproductprice est intercepte (page d'erreur 500 rendue) : aucun prix
 *     n'est modifie.
 *     - C5 : PAF vide, Enregistrer : rien n'est envoye, le champ est signale, la fenetre reste ouverte ;
 *     - J19 : prix valides, Enregistrer, erreur 500 : message lisible, sans erreur JavaScript ni page HTML ;
 *  4. retrait : « Supprimer » du bon (la commande repasse en cours), puis « Supprimer » de la copie de commande ;
 *     controle par les listes de l'ecran que ni le bon ni la copie ne restent.
 * Seule trace qui ne peut pas etre retiree par l'ecran : le numero de commande du jour (KEY_LAST_ORDER_COMMAND_NUMBER)
 * avance d'un cran, comme pour toute commande creee.
 * Les envois au centre de support sont interceptes. A jouer sur une copie de travail (capitale, laborex_v1_db).
 *
 * node support/anomalies-centre/test-prix-bl.js   (BASE=http://localhost:9080/prestige pour le second domaine)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre, attendreMessage } = require('../../outils/vues');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const REF_BL = ('E2E-BL-' + Date.now().toString(36)).toUpperCase().slice(0, 20);
const visible = (p, r) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: 60000 });
const chargee = (p, r) => p.waitForFunction((q) => { const g = Ext.ComponentQuery.query(q).filter((x) => x.isVisible(true))[0];
  return g && !g.getStore().isLoading(); }, r, { timeout: 60000 });

/* clic sur l'icone (info-bulle) de la ligne d'indice donne de la grille designee */
async function iconeLigne(p, grille, indice, infobulle) {
  const id = await p.evaluate((g) => { const c = Ext.ComponentQuery.query(g).filter((x) => x.isVisible(true))[0]; return c ? c.getId() : null; }, grille);
  if (!id) { throw new Error('Grille absente : ' + grille); }
  await p.locator('#' + id + ' .x-grid-row').nth(indice).locator('img[data-qtip="' + infobulle + '"]').first().click();
}
const indice = (p, grille, champ, valeur) => p.evaluate(({ g, c, v }) => {
  const x = Ext.ComponentQuery.query(g).filter((y) => y.isVisible(true))[0]; return x ? x.getStore().findExact(c, v) : -1; }, { g: grille, c: champ, v: valeur });
async function fermerMessages(p) {
  for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => repondre(p, 'yes')).catch(() => {}); await p.waitForTimeout(300); }
}
async function fermerFenetres(p) {
  for (const croix of await p.locator('.x-window .x-tool-close').filter({ visible: true }).all()) { await croix.click().catch(() => {}); await p.waitForTimeout(300); }
}
/* icone de suppression a confirmer dans l'icone (PrestigeConfirmation) : premier clic, puis « Confirmer ? » */
async function supprimerLigne(p, grille, i, infobulle) {
  await iconeLigne(p, grille, i, infobulle);
  await p.waitForTimeout(600);
  const confirmer = p.getByText('Confirmer ?', { exact: true }).filter({ visible: true }).first();
  if (await confirmer.count()) { await confirmer.click(); } else if (await texteMessage(p)) { await repondre(p, 'yes'); }
  await p.waitForTimeout(2500);
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1700, height: 950 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const prix = [];
  await p.route('**/ws_transaction.jsp?mode=modifproductprice*', (r) => { prix.push(r.request().postData() || ''); r.fulfill({ status: 500,
    contentType: 'text/html', body: '<!DOCTYPE html><html><head><title>Payara Server - Error report</title></head><body>HTTP Status 500</body></html>' }); });
  /* AVANT=1 : l'ecran recoit editprice.js tel qu'il etait avant le correctif (31622a33), pour voir le test echouer */
  if (process.env.AVANT === '1') {
    const ancien = require('child_process').execFileSync('git', ['show',
      '31622a33:src/main/webapp/general/app/view/commandemanagement/bonlivraison/action/editprice.js'], { encoding: 'utf8' });
    await p.route('**/bonlivraison/action/editprice.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: ancien }));
    console.log('AVANT=1 : editprice.js de 31622a33');
  }
  let refCopie = null, blId = null;
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const commandes = 'i_order_manager';

    /* 1. copie d'une commande en cours */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await visible(p, commandes); await chargee(p, commandes);
    const avant = await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getStore().getRange().map((r) => r.get('str_REF_ORDER')), commandes);
    if (!avant.length) { throw new Error('aucune commande en cours a cloner'); }
    await iconeLigne(p, commandes, 0, 'Cloner la commande');
    await attendreMessage(p, 'cloner', 10000); await repondre(p, 'yes');
    const msg = await attendreMessage(p, 'Nouvelle référence', 30000);
    refCopie = msg && (msg.match(/Nouvelle référence : (\S+)/) || [])[1];
    await fermerMessages(p);
    ok('Copie de commande créée par « Cloner la commande »', !!refCopie, msg);
    if (!refCopie) { throw new Error('copie non creee'); }
    await chargee(p, commandes);

    /* 2. bon de livraison de la copie */
    const i = await indice(p, commandes, 'str_REF_ORDER', refCopie);
    const montant = await p.evaluate(({ g, i }) => Ext.ComponentQuery.query(g)[0].getStore().getAt(i).get('PRIX_ACHAT_TOTAL'), { g: commandes, i });
    await iconeLigne(p, commandes, i, 'Créer le bon de livraisson');
    await p.waitForFunction(() => { const c = Ext.getCmp('str_REF_LIVRAISON'); return c && c.isVisible(true); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.evaluate(({ ref, montant }) => {
      Ext.getCmp('str_REF_LIVRAISON').setValue(ref); Ext.getCmp('dt_DATE_LIVRAISON').setValue(new Date());
      Ext.getCmp('int_MHT').setValue(montant); Ext.getCmp('int_TVA').setValue(0);
    }, { ref: REF_BL, montant });
    await p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).last().click();
    const cree = await attendreMessage(p, 'success', 30000) || await texteMessage(p);
    await fermerMessages(p); await fermerFenetres(p);

    /* 3. le bon d'essai dans « Gestion des entrees » */
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Gestion des entrées');
    await visible(p, 'bonlivraisonmanager'); await chargee(p, 'bonlivraisonmanager');
    const iBl = await indice(p, 'bonlivraisonmanager', 'str_REF_LIVRAISON', REF_BL);
    blId = iBl >= 0 ? await p.evaluate((i) => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().getAt(i).get('lg_BON_LIVRAISON_ID'), iBl) : null;
    ok('Bon de livraison d\'essai créé et listé dans « Gestion des entrées »', iBl >= 0, REF_BL + ' ' + cree);
    if (iBl < 0) { throw new Error('bon d\'essai absent'); }
    await iconeLigne(p, 'bonlivraisonmanager', iBl, 'Detail livraison');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const ouvrirPrix = async () => {
      await p.locator('#gridpanelID .x-grid-row').first().locator('img[data-qtip="Modifier Article"]').first().click();
      await p.waitForFunction(() => { const c = Ext.getCmp('int_PAF'); return c && c.isVisible(true); }, null, { timeout: 30000 });
      await p.waitForTimeout(800);
    };
    const enregistrer = () => p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).last().click();

    await ouvrirPrix();
    await p.evaluate(() => { Ext.getCmp('int_PAF').setValue(''); });
    prix.length = 0;
    await enregistrer();
    await p.waitForTimeout(1500);
    const c5 = await p.evaluate(() => { const c = Ext.getCmp('int_PAF'); return { ouvert: !!(c && c.isVisible(true)), erreur: c ? c.getActiveError() : null }; });
    ok('C5 PAF vide puis Enregistrer : rien n\'est envoyé, le champ est signalé, la fenêtre reste ouverte',
      prix.length === 0 && c5.ouvert && !!c5.erreur, JSON.stringify(c5) + ' envois : ' + prix.length);
    await fermerMessages(p); await fermerFenetres(p);

    await ouvrirPrix();
    await p.evaluate(() => { ['int_PRIX_VENTE', 'int_PRIX_REFERENCE', 'int_PAF', 'int_PA_REEL'].forEach((i) => {
      const c = Ext.getCmp(i); if (!/^\d+$/.test(String(c.getValue()))) { c.setValue('100'); } }); });
    prix.length = 0;
    const nbErreurs = erreurs.length;
    await enregistrer();
    await p.waitForTimeout(2500);
    const message = await texteMessage(p);
    const j19 = erreurs.slice(nbErreurs);
    ok('J19 erreur 500 du serveur : message lisible, sans erreur JavaScript ni page HTML affichée',
      prix.length === 1 && j19.length === 0 && !!message && !/<!DOCTYPE|<html/i.test(message),
      'envois ' + prix.length + ' | erreurs ' + j19.join(' ; ') + ' | message ' + message);
    await fermerMessages(p); await fermerFenetres(p);
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    /* 4. retrait par l'ecran */
    try {
      await fermerMessages(p); await fermerFenetres(p);
      if (blId) {
        await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Gestion des entrées');
        await visible(p, 'bonlivraisonmanager'); await chargee(p, 'bonlivraisonmanager');
        const iBl = await indice(p, 'bonlivraisonmanager', 'lg_BON_LIVRAISON_ID', blId);
        if (iBl >= 0) { await supprimerLigne(p, 'bonlivraisonmanager', iBl, 'Supprimer'); }
        await chargee(p, 'bonlivraisonmanager');
        ok('Retrait : bon d\'essai supprimé par l\'écran', await indice(p, 'bonlivraisonmanager', 'lg_BON_LIVRAISON_ID', blId) < 0);
      }
      if (refCopie) {
        await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
        await visible(p, 'i_order_manager'); await chargee(p, 'i_order_manager');
        await p.evaluate(() => Ext.ComponentQuery.query('i_order_manager')[0].getStore().load());
        await p.waitForTimeout(1500); await chargee(p, 'i_order_manager');
        const iC = await indice(p, 'i_order_manager', 'str_REF_ORDER', refCopie);
        if (iC >= 0) { await supprimerLigne(p, 'i_order_manager', iC, 'Supprimer'); }
        await chargee(p, 'i_order_manager');
        ok('Retrait : copie de commande supprimée par l\'écran', await indice(p, 'i_order_manager', 'str_REF_ORDER', refCopie) < 0, refCopie);
      }
      const reste = await p.evaluate(async ({ ref, bl }) => {
        const bons = await (await fetch('../api/v1/commande/list-bons?start=0&limit=50&statut=enable&query=' + encodeURIComponent(bl))).json();
        const cmd = await (await fetch('../api/v1/commande/list?start=0&limit=50&query=' + encodeURIComponent(ref || 'E2E-AUCUNE'))).json();
        return { bons: bons.total, commandes: (cmd.data || []).filter((o) => o.str_REF_ORDER === ref).length };
      }, { ref: refCopie, bl: REF_BL });
      ok('Aucune donnée d\'essai restante (bon et copie de commande)', reste.bons === 0 && reste.commandes === 0, JSON.stringify(reste));
    } catch (x) {
      ok('Retrait sans exception', false, x.message + ' (bon ' + blId + ', copie ' + refCopie + ')');
    }
    await ENV_E2E.capture(p, 'prix-bl-fin').catch(() => {});
    await b.close();
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
