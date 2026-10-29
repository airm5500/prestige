/* LOT 4 DU RAPPORT ANOMALIES_CENTRE_SUPPORT_2026-10-26 : volet ecran (J6, A3). S3 est couvert par
 * SupportPoolMonitorTest.
 *
 * Parcours par les vues (compte e2e, administrateur). Aucune donnee ecrite :
 *  - J6 : SERVICE CLIENT > Ventes > nouvelle vente, un code scanne dans Produit puis Entree. La recherche findone de ce
 *    code est interceptee et recoit une page HTML avec le statut 200 (cas d'un code mal route). Avant : « result is
 *    null » dans VenteCtr ; apres : aucune erreur JavaScript, on reste sur le champ ;
 *  - A3 : SERVICE CLIENT > Proforma, « Modifier » de la premiere proforma. La reponse de la liste est interceptee pour
 *    ne plus porter de client (proforma sans client). Avant : appel « client-assurance//<vente> », 404 et « Probleme
 *    avec le server » ; apres : aucun appel client-assurance, aucune fenetre. Le volet est saute s'il n'y a aucune
 *    proforma sur la periode affichee.
 * Les envois au centre de support sont interceptes : l'essai n'y cree aucun evenement.
 *
 * node support/anomalies-centre/test-lot4-ecrans.js   (BASE=http://localhost:9080/prestige ; VOLETS=J6,A3)
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../../outils/poste');
const { connexion, ouvrirMenu, cliquer } = require('../../outils/vues');

const joue = (v) => !process.env.VOLETS || process.env.VOLETS.split(',').includes(v);
const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const visible = (p, r) => p.waitForFunction((q) => Ext.ComponentQuery.query(q).some((x) => x.isVisible(true)), r, { timeout: 60000 });
const fenetres = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => (m.msg && m.msg.getEl() ? m.msg.getEl().dom.innerText : '?')));

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  await p.route('**/api/v1/support/events', (r) => r.request().method() === 'POST' ? r.fulfill({ status: 200, body: '{}' }) : r.continue());
  const appels = []; p.on('response', (r) => { if (/\/api\/v1\/(vente\/findone|client\/client-assurance)/.test(r.url())) { appels.push({ url: r.url(), statut: r.status() }); } });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* ---- J6 ---- */
    if (joue('J6')) try {
      await p.route('**/api/v1/vente/findone/E2EJ6HTML*', (r) => r.fulfill({ status: 200, contentType: 'text/html',
        body: '<!DOCTYPE html><html><body>Page de connexion</body></html>' }));
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
      await visible(p, 'cloturerventemanager #addBtn');
      await cliquer(p, 'cloturerventemanager #addBtn');
      const champ = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
      await visible(p, champ);
      await p.waitForTimeout(1500);
      appels.length = 0; erreurs.length = 0;
      await cliquer(p, champ);
      await p.keyboard.type('E2EJ6HTML', { delay: 15 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
      const parti = appels.some((a) => /findone\/E2EJ6HTML/.test(a.url));
      const nul = erreurs.filter((m) => /null|undefined|success/.test(m));
      ok('J6 réponse 200 non JSON à findone : aucune erreur JavaScript', parti && nul.length === 0, JSON.stringify({ parti, erreurs }));
      const surChamp = await p.evaluate((r) => { const c = Ext.ComponentQuery.query(r).filter((x) => x.isVisible(true))[0];
        return !!c && c.inputEl && document.activeElement === c.inputEl.dom; }, champ);
      ok('J6 : on reste sur le champ Produit', surChamp);
      await p.unroute('**/api/v1/vente/findone/E2EJ6HTML*');
      /* non-regression : un code inconnu repart au serveur et revient en JSON */
      appels.length = 0;
      await cliquer(p, champ); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
      await p.keyboard.type('E2EINCONNU42', { delay: 10 }); await p.keyboard.press('Enter'); await p.waitForTimeout(2000);
      ok('J6 non-régression : un code ordinaire est toujours cherché (findone)', appels.some((a) => /findone\/E2EINCONNU42/.test(a.url) && a.statut === 200), JSON.stringify(appels));
    } catch (x) { ok('J6 parcours sans exception', false, x.message); }

    /* ---- A3 ---- */
    if (joue('A3')) try {
      /* proforma sans client : on retire le client de la reponse de la liste (lecture seule) */
      /* le retour a la liste la recharge pendant la fermeture du navigateur : erreurs de fin ignorees */
      const sansClient = async (r) => { try {
        const rep = await r.fetch(); let corps = await rep.text();
        try { const j = JSON.parse(corps); (j.data || []).forEach((v) => { v.client = { lgCLIENTID: '' }; v.clientFullName = ''; }); corps = JSON.stringify(j); } catch (e) { /* tel quel */ }
        await r.fulfill({ response: rep, body: corps });
      } catch (e) { /* page fermee */ } };
      await p.route('**/api/v1/ventestats/devis*', sansClient);
      await ouvrirMenu(p, 'SERVICE CLIENT', 'Proforma');
      await visible(p, 'devismanager gridpanel');
      /* un mois de proformas, puis « rechercher » */
      await p.evaluate(() => { const fin = new Date(); Ext.ComponentQuery.query('devismanager #dtStart')[0].setValue(new Date(fin.getTime() - 30 * 86400000)); Ext.ComponentQuery.query('devismanager #dtEnd')[0].setValue(fin); });
      await cliquer(p, 'devismanager #rechercher');
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
      const n = await p.evaluate(() => Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0].getStore().getCount());
      if (n === 0) {
        console.log('SKIP  A3 : aucune proforma sur le dernier mois');
      } else {
        appels.length = 0; erreurs.length = 0;
        const id = await p.evaluate(() => Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0].getId());
        await p.locator('#' + id + ' .x-grid-row').first().locator('img[data-qtip="Modifier"]').first().click();
        await visible(p, 'doDevis #contenu');
        await p.waitForTimeout(3000);
        const ca = appels.filter((a) => /client-assurance/.test(a.url));
        const msgs = await fenetres(p);
        ok('A3 proforma sans client : aucun appel client-assurance, aucune fenêtre', ca.length === 0 && msgs.length === 0, JSON.stringify({ ca, msgs }));
        ok('A3 : aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs));
        /* retour a la liste sans rien modifier */
        await cliquer(p, 'doDevis #contenu [xtype=toolbar] #btnGoBack').catch(() => {});
      }
      await p.waitForTimeout(1500);
      await p.unroute('**/api/v1/ventestats/devis*', sansClient);
      /* non-regression : une proforma qui a un client le relit toujours (reponse de la liste non modifiee) */
      if (n > 0) {
        /* le retour recree la liste sur la periode du jour : on remet le mois */
        await visible(p, 'devismanager gridpanel');
        await p.evaluate(() => { const v = Ext.ComponentQuery.query('devismanager').filter((x) => x.isVisible(true))[0]; const fin = new Date();
          v.down('#dtStart').setValue(new Date(fin.getTime() - 30 * 86400000)); v.down('#dtEnd').setValue(fin); });
        await cliquer(p, 'devismanager #rechercher');
        await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
        const rang = await p.evaluate(() => Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0].getStore().findBy((r) => !!(r.get('client') && r.get('client').lgCLIENTID)));
        if (rang < 0) {
          console.log('SKIP  A3 non-régression : aucune proforma avec client', await p.evaluate(() => { const st = Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0].getStore(); return st.getCount() + ' ' + JSON.stringify(st.getCount() ? st.getAt(0).data.client : null); }));
        } else {
          appels.length = 0;
          const id = await p.evaluate(() => Ext.ComponentQuery.query('devismanager gridpanel').filter((x) => x.isVisible(true))[0].getId());
          await p.locator('#' + id + ' .x-grid-row').nth(rang).locator('img[data-qtip="Modifier"]').first().click();
          await visible(p, 'doDevis #contenu');
          await p.waitForTimeout(3000);
          ok('A3 non-régression : une proforma avec client relit son client (200)', appels.some((a) => /client-assurance\/[^/]+\/[^/?]+/.test(a.url) && a.statut === 200), JSON.stringify(appels));
          await cliquer(p, 'doDevis #contenu [xtype=toolbar] #btnGoBack').catch(() => {});
          await p.waitForTimeout(1500);
        }
      }
    } catch (x) { ok('A3 parcours sans exception', false, x.message); }
  } finally {
    await b.close();
    const echecs = res.filter((x) => !x).length;
    console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
    process.exit(echecs ? 1 : 0);
  }
})();
