/* Proforma (retour du 14/09) : le deuxieme produit s'ajoute a nouveau. La proforma porte le statut « devis » ;
 * le controle « vente modifiable » n'acceptait que « is_Process » et « pending » et refusait donc l'ajout en
 * annoncant une vente cloturee. Le parcours est joue a l'ecran : menu proforma, produit, quantite, Entree, deux
 * fois ; puis le retrait d'une ligne et la remise, qui passent par le meme controle. Les proformas posees sont
 * retirees a la fin. */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ventes = [];
function retirer() {
  ventes.filter(Boolean).forEach(id => exec("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + id + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + id + "';"));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    const produits = q("SELECT f.lg_FAMILLE_ID, f.int_PRICE, f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1' WHERE s.int_NUMBER_AVAILABLE>20 AND f.int_PRICE>0 AND f.str_STATUT='enable' AND f.int_CIP IS NOT NULL AND f.int_CIP<>'' LIMIT 2").split('\n').map(l => l.split('\t'));
    const user = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN='" + (process.env.E2E_LOGIN || 'admin') + "'");
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', process.env.E2E_LOGIN || 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const poster = (url, corps) => p.evaluate(async (a) => { const r = await fetch(a.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.corps) }); return { statut: r.status, corps: await r.text() }; }, { url, corps });
    const params = (x, qte, venteId) => ({ typeVenteId: '1', natureVenteId: '1', produitId: x[0], itemPu: Number(x[1]), qte: qte, qteServie: qte, devis: true, remiseId: '', venteId: venteId, userVendeurId: user, prevente: false });

    /* ------------------------------------------------ le parcours de l API, celui de l ecran de proforma */
    const r1 = JSON.parse((await poster('../api/v1/vente/devis', params(produits[0], 2, null))).corps);
    const venteId = r1.data && r1.data.lgPREENREGISTREMENTID; ventes.push(venteId);
    ok('Proforma : le premier produit cree la proforma', r1.success === true && !!venteId, JSON.stringify(r1.msg));
    ok('Proforma : elle porte bien le statut « devis »', q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === 'devis');
    const r2 = JSON.parse((await poster('../api/v1/vente/add/item', params(produits[1], 1, venteId))).corps);
    ok('Proforma : le deuxieme produit s ajoute', r2.success === true && !/clôturée/.test(String(r2.msg)), JSON.stringify(r2.msg));
    ok('Proforma : les deux lignes sont en base, le montant cumule', q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === '2'
      && Number(q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'")) === 2 * Number(produits[0][1]) + Number(produits[1][1]),
      q("SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'"));

    /* le retrait d une ligne et la remise passent par le meme controle */
    const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + venteId + "' ORDER BY dt_CREATED DESC LIMIT 1");
    const suppr = await p.evaluate(async (id) => { const r = await fetch('../api/v1/vente/remove/vno/item/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' } }); return { statut: r.status, corps: await r.text() }; }, ligne);
    ok('Proforma : une ligne se retire', suppr.statut === 200 && !/clôturée/.test(suppr.corps) && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + venteId + "'") === '1', suppr.corps.slice(0, 160));

    /* ------------------------------------------------ le meme parcours a l ecran */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doDevis', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doDevis #produit').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2500);

    /* un client d abord : la proforma est etablie pour quelqu un */
    const client = q("SELECT str_FIRST_NAME FROM t_client WHERE str_STATUT='enable' AND str_FIRST_NAME IS NOT NULL AND str_FIRST_NAME<>'' ORDER BY str_FIRST_NAME LIMIT 1");
    const champClient = await p.evaluate(() => Ext.ComponentQuery.query('doDevis #clientSearchTextField')[0].inputEl.id);
    await p.fill('#' + champClient, client);
    await p.press('#' + champClient, 'Enter');
    await p.waitForTimeout(3000);
    /* plusieurs homonymes : la fenetre de choix s ouvre, on prend le premier */
    const fenetreClient = await p.evaluate(() => Ext.ComponentQuery.query('clientDevis').length > 0 && Ext.ComponentQuery.query('clientDevis')[0].isVisible());
    if (fenetreClient) {
      await p.evaluate(() => {
        /* clic sur le « + » de la premiere ligne : c'est ce que la colonne d'action declenche */
        const g = Ext.ComponentQuery.query('clientDevis #lambdaClientGrid')[0];
        testextjs.app.getController('DevisCtr').btnAjouterClientLambda(g, 0, 0);
      });
      await p.waitForTimeout(2000);
    }
    const clientPose = await p.evaluate(() => { const c = testextjs.app.getController('DevisCtr').getClient(); return c ? String(c.get('strFIRSTNAME') || '') : ''; });
    ok('Ecran proforma : le client est rattache a la proforma', clientPose !== '', clientPose);

    const ajouterEcran = async (cip, qte) => {
      await p.evaluate(async (cible) => {
        const combo = Ext.ComponentQuery.query('doDevis #produit')[0];
        combo.getStore().load({ params: { query: cible, start: 0, limit: 20 } });
        await new Promise(r => setTimeout(r, 3000));
        const rec = combo.getStore().findRecord('intCIP', cible, 0, false, false, true) || combo.getStore().getAt(0);
        combo.select(rec);
        combo.fireEvent('select', combo, [rec]);
      }, cip);
      await p.waitForTimeout(1500);
      const qty = await p.evaluate(() => Ext.ComponentQuery.query('doDevis #qtyField')[0].inputEl.id);
      await p.fill('#' + qty, String(qte));
      await p.press('#' + qty, 'Enter');
      await p.waitForTimeout(3500);
    };
    const etatEcran = () => p.evaluate(() => {
      const g = Ext.ComponentQuery.query('doDevis #venteGrid')[0];
      const mb = Ext.MessageBox;
      const ctr = testextjs.app.getController('DevisCtr');
      const vente = ctr.getCurrent();
      return { lignes: g ? g.getStore().getCount() : -1, boite: mb.isVisible(),
        texte: mb.isVisible() ? String(mb.getEl().dom.textContent).slice(0, 200) : '',
        venteId: vente ? String(vente.lgPREENREGISTREMENTID) : null };
    });
    await ajouterEcran(produits[0][2], 2);
    const apres1 = await etatEcran();
    if (apres1.venteId) { ventes.push(apres1.venteId); }
    ok('Ecran proforma : le premier produit entre dans la liste', apres1.lignes === 1 && !apres1.boite, JSON.stringify(apres1));
    await ajouterEcran(produits[1][2], 1);
    const apres2 = await etatEcran();
    if (apres2.venteId) { ventes.push(apres2.venteId); }
    ok('Ecran proforma : le deuxieme produit entre aussi, sans message de vente cloturee', apres2.lignes === 2 && !apres2.boite && !/clôturée/.test(apres2.texte), JSON.stringify(apres2));
    await p.screenshot({ path: '/tmp/proforma.png' });
    ok('Ecran proforma : les deux lignes sont en base', !apres2.venteId || q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + apres2.venteId + "'") === '2', String(apres2.venteId));

    /* ------------------------------------------------ une vente cloturee reste protegee */
    const cloturee = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE str_STATUT='is_Closed' ORDER BY dt_UPDATED DESC LIMIT 1");
    const refus = JSON.parse((await poster('../api/v1/vente/add/item', params(produits[0], 1, cloturee))).corps);
    ok('Une vente cloturee refuse toujours l ajout, en renvoyant vers « Ventes terminées »', refus.success === false && /clôturée/.test(String(refus.msg)) && /Ventes terminées/.test(String(refus.msg)), String(refus.msg).slice(0, 140));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  retirer();
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
