/* LOT 1 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : volet ecran (P1, A1, C5/J19). J3 a son propre test
 * (test-import-commande-annuler.js).
 *
 * Parcours par les vues (compte e2e, administrateur). Aucune donnee ecrite :
 *  - P1 : GESTION DU STOCK > Suivi mouvement article2, « Voir détail » de la premiere ligne, puis « Actualiser » de la
 *    barre du bas de la fenetre : l'appel monitoringproduct garde le produit et la periode (avant : sans dates, 500) ;
 *  - A1 : SERVICE CLIENT > Ventes > nouvelle vente, « .. » scanne dans Produit puis Entree : aucun appel au serveur
 *    (avant : le navigateur reecrivait l'adresse en vente/, 404), champ vide, message dans la page ;
 *  - C5/J19 : GESTION DES COMMANDES > Gestion des entrees, detail du premier bon, « Modifier Article » de la premiere
 *    ligne. Tout appel a ws_transaction.jsp?mode=modifproductprice est intercepte et recoit une page d'erreur 500 :
 *    aucun prix n'est modifie. PAF vide puis Enregistrer : rien n'est envoye et le champ est signale (avant : appel,
 *    puis 500) ; avec des prix valides, la page d'erreur 500 donne un message lisible, sans erreur JavaScript (avant :
 *    « Ext.JSON.decode » sur la page HTML).
 * Les envois au centre de support sont interceptes : l'essai n'y cree aucun evenement.
 *
 * node support/anomalies-centre/test-lot1-ecrans.js   (BASE=http://localhost:9080/prestige pour le second domaine)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre } = require('../../outils/vues');

/* VOLETS=C5 : ne jouer que ces volets (P1, A1, C5) */
const joue = (v) => !process.env.VOLETS || process.env.VOLETS.split(',').includes(v);
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const visible = (p, r) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: 60000 });
/* clic sur l'icone d'une colonne d'actions (premiere ligne de la grille designee, icone de l'info-bulle donnee) */
async function icone(p, grille, infobulle) {
  const id = await p.evaluate((g) => { const c = Ext.ComponentQuery.query(g).filter((x) => x.isVisible(true))[0]; return c ? c.getId() : null; }, grille);
  if (!id) { throw new Error('Grille absente : ' + grille); }
  await p.locator('#' + id + ' .x-grid-row').first().locator('img[data-qtip="' + infobulle + '"], img.x-action-col-icon').first().click();
}
async function fermerMessages(p) {
  for (let i = 0; i < 3 && await texteMessage(p); i++) { await repondre(p, 'ok').catch(() => {}); await p.waitForTimeout(300); }
}

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const prix = [];
  await p.route('**/ws_transaction.jsp?mode=modifproductprice*', (r) => { prix.push(r.request().postData() || ''); r.fulfill({ status: 500,
    contentType: 'text/html', body: '<!DOCTYPE html><html><head><title>Payara Server - Error report</title></head><body>HTTP Status 500</body></html>' }); });
  const appels = []; p.on('response', (r) => { if (/\/api\/v1\/(produit\/monitoringproduct|vente\/)/.test(r.url())) { appels.push({ url: r.url(), statut: r.status() }); } });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---- P1 ---- */
    if (joue('P1')) try {
      await ouvrirMenu(p, 'GESTION DU STOCK', 'Suivi mouvement article2');
      await visible(p, 'monitoringproduct gridpanel');
      /* periode d'un mois (celle du jour peut etre vide sur une copie), puis « Rechercher » */
      await p.evaluate(() => {
        const fin = new Date(); const debut = new Date(fin.getTime() - 30 * 86400000);
        Ext.ComponentQuery.query('monitoringproduct #dtStart')[0].setValue(debut);
        Ext.ComponentQuery.query('monitoringproduct #dtEnd')[0].setValue(fin);
      });
      await cliquer(p, 'monitoringproduct #rechercher');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('monitoringproduct gridpanel')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
      await icone(p, 'monitoringproduct gridpanel', 'Voir détail');
      await p.waitForTimeout(2500);
      appels.length = 0;
      /* bouton « Actualiser » de la barre de pagination de la fenetre de detail */
      const actualiser = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window{isVisible()}').pop(); const t = w && w.down('pagingtoolbar');
        const btn = t && t.down('#refresh'); return btn ? btn.getId() : null; });
      if (!actualiser) { throw new Error('Bouton Actualiser introuvable'); }
      await p.click('#' + actualiser);
      await p.waitForTimeout(2500);
      const mp = appels.filter((a) => /monitoringproduct\?/.test(a.url));
      ok('P1 « Actualiser » du détail : produit et période envoyés, réponse 200',
        mp.length > 0 && mp.every((a) => /dtStart=\d/.test(a.url) && /produitId=[^&]/.test(a.url) && a.statut === 200), JSON.stringify(mp));
      for (const croix of await p.locator('.x-window .x-tool-close').filter({ visible: true }).all()) { await croix.click().catch(() => {}); await p.waitForTimeout(300); }
      /* la fenetre de detail doit etre fermee avant l'ecran suivant : elle recouvrait le bouton « nouvelle vente » */
      await p.waitForFunction(() => Ext.ComponentQuery.query('window{isVisible()}').length === 0, null, { timeout: 10000 }).catch(() => {});
    } catch (x) { ok('P1 parcours sans exception', false, x.message); }

    /* ---- A1 ---- */
    if (joue('A1')) try {
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await visible(p, 'cloturerventemanager #addBtn');
      await cliquer(p, 'cloturerventemanager #addBtn');
      const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
      await visible(p, champ);
      await p.waitForTimeout(1500);
      appels.length = 0;
      await cliquer(p, champ);
      await p.keyboard.type('..', { delay: 20 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2000);
      const etat = await p.evaluate((r) => ({ champ: Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0].getRawValue(),
        fenetre: Ext.ComponentQuery.query('messagebox{isVisible()}').length > 0 }), champ);
      const vers = appels.filter((a) => /\/api\/v1\/vente\/(findone\/?)?(\?|$)/.test(a.url) || a.statut === 404);
      ok('A1 « .. » scanné : aucun appel au serveur, champ vidé, sans fenêtre', vers.length === 0 && etat.champ === '' && !etat.fenetre,
        JSON.stringify(etat) + ' ' + JSON.stringify(vers));
      /* non-regression : un lien reste refuse, un code ordinaire (qui ne designe aucun produit : rien n'est ajoute a
         la vente) part toujours a la recherche */
      const scanner = async (texte) => {
        await cliquer(p, champ); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
        await p.keyboard.type(texte, { delay: 10 }); await p.keyboard.press('Enter'); await p.waitForTimeout(2000);
      };
      await p.waitForFunction(() => document.body.innerText.indexOf('Code illisible') < 0, null, { timeout: 15000 }).catch(() => {});
      appels.length = 0;
      await scanner('https://exemple.test/promo');
      const lien = await p.evaluate(() => document.body.innerText.indexOf('QR code publicitaire') >= 0);
      ok('A1 non-régression : un lien scanné reste refusé (« QR code publicitaire »), sans appel', lien && appels.length === 0, JSON.stringify(appels));
      appels.length = 0;
      await scanner('E2EINCONNU42');
      ok('A1 non-régression : un code ordinaire est toujours cherché (findone)', appels.some((a) => /\/vente\/findone\/E2EINCONNU42/.test(a.url)), JSON.stringify(appels));
    } catch (x) { ok('A1 parcours sans exception', false, x.message); }
    await fermerMessages(p);

    /* ---- C5 / J19 ---- */
    if (joue('C5')) try {
      await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Gestion des entrées');
      await visible(p, 'bonlivraisonmanager');
      /* l'ecran ne liste que les bons en cours : sur une copie qui n'en a aucun, ce volet ne peut pas se jouer */
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
      if (await p.evaluate(() => Ext.ComponentQuery.query('bonlivraisonmanager')[0].getStore().getCount()) === 0) {
        throw new Error('aucun bon de livraison en cours sur cette base : volet C5/J19 non joué');
      }
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
      await icone(p, 'bonlivraisonmanager', 'Detail livraison');
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
      const ouvrirPrix = async () => {
        await p.locator('#gridpanelID .x-grid-row').first().locator('img[data-qtip="Modifier Article"]').first().click();
        await p.waitForFunction(() => { const c = Ext.getCmp('int_PAF'); return c && c.isVisible(true); }, null, { timeout: 30000 });
        await p.waitForTimeout(800);
      };
      const enregistrer = () => p.locator('.x-window').filter({ visible: true }).getByText('Enregistrer', { exact: true }).last().click();

      await ouvrirPrix();
      await p.evaluate(() => Ext.getCmp('int_PAF').setValue(''));
      prix.length = 0;
      await enregistrer();
      await p.waitForTimeout(1500);
      const c5 = await p.evaluate(() => { const c = Ext.getCmp('int_PAF'); return { ouvert: !!(c && c.isVisible(true)), invalide: !!(c && c.getActiveError()) }; });
      ok('C5 PAF vide puis Enregistrer : rien n\'est envoyé, le champ est signalé, la fenêtre reste ouverte',
        prix.length === 0 && c5.ouvert && c5.invalide, JSON.stringify(c5) + ' envois : ' + prix.length);
      await fermerMessages(p);
      for (const croix of await p.locator('.x-window .x-tool-close').filter({ visible: true }).all()) { await croix.click().catch(() => {}); await p.waitForTimeout(300); }

      await ouvrirPrix();
      await p.evaluate(() => { ['int_PRIX_VENTE', 'int_PRIX_REFERENCE', 'int_PAF', 'int_PA_REEL'].forEach((i) => { const c = Ext.getCmp(i); if (!/^\d+$/.test(String(c.getValue()))) { c.setValue('100'); } }); });
      prix.length = 0;
      const avant = erreurs.length;
      await enregistrer();
      await p.waitForTimeout(2500);
      const message = await texteMessage(p);
      const j19 = erreurs.slice(avant);
      ok('J19 erreur 500 du serveur : message lisible, sans erreur JavaScript ni page HTML affichée',
        prix.length === 1 && j19.length === 0 && message && !/<!DOCTYPE|<html/i.test(message), 'envois ' + prix.length + ' | erreurs ' + j19.join(' ; ') + ' | message ' + message);
      await fermerMessages(p);
    } catch (x) { ok('C5/J19 parcours sans exception', false, x.message); }

    ok('Aucune autre erreur JavaScript', erreurs.filter((m) => !/JSON\.decode|You're trying to decode/.test(m)).length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await ENV_E2E.capture(p, 'lot1-fin').catch(() => {});
    await b.close();
  }
  const ko = res.filter((x) => !x).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
