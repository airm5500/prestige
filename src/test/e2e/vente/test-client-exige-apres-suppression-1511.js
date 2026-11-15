/* PLAN DU 14/11, POINT 6 : VENTE AU COMPTANT, CLIENT EXIGE A TORT APRES LA SUPPRESSION D'UN PRODUIT.
 *
 * Scenario de la pharmacie : ajouter un produit, choisir un client (bouton « ASSOCIER UN CLIENT »), supprimer le
 * produit, ajouter un autre produit -> l'ecran exige un client obligatoire, alors que la vente est au comptant, en
 * especes, sans produit d'ordonnancier.
 *
 * Etat au 15/11 : NON REPRODUIT sur le code du 15/11 (ni par le bouton « ASSOCIER UN CLIENT », ni par le mode de
 * reglement ORANGE) : defaut « suspecte », en attente de la sequence exacte et du texte du message. Le test reste comme
 * garde-fou : il rejoue les deux parcours et dit a quelle etape la vente perd son client si le defaut revient.
 *
 * Parcours de l'ecran (compte d'essai), une fois par facon de choisir le client :
 *  - ORANGE (quantite 3) : produit A (quantite 2), mode de reglement ORANGE, client standard d'essai dans la fenetre ;
 *  - BOUTON (quantite 2) : produit A (quantite 2), « ASSOCIER UN CLIENT », meme client ;
 * puis icone « Supprimer le produit » de la ligne A, produit B, montant recu = net, « Terminer la vente ».
 * Attendu : aucun message exigeant un client, ni a l'ajout de B ni a la cloture ; vente cloturee avec la seule ligne B.
 * Bilan : stock A inchange, stock B - quantite ; un mouvement de caisse et une recette au net de la vente ; rien pour A.
 * Jeu d'essai retire : ventes, client d'essai ; stocks remis.
 * Lancement seul : node src/test/e2e/vente/test-client-exige-apres-suppression-1511.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const etats = [];
const { ok, q, MARQUE } = C;

const texteMessages = (p) => p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => (m.msg && m.msg.getEl ? m.msg.getEl().dom.innerText : '') || '').join(' | '));
async function fermerMessages(p, journal) {
  for (let i = 0; i < 4; i++) {
    const t = await texteMessages(p);
    if (!t) { return; }
    journal.push(t);
    const id = await p.evaluate(() => { const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; if (!box) { return null; }
      const b = box.query('button{isVisible()}').find((x) => /^(ok|non|no)$/i.test((x.text || '').trim())) || box.query('button{isVisible()}')[0]; return b ? b.getId() : null; });
    if (!id) { return; }
    await p.click('#' + id);
    await p.waitForTimeout(500);
  }
}

(async () => {
  C.ouvrirCaisse();
  /* deux produits hors ordonnancier */
  const HORS = "AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0";
  const A = C.produit(10, 500, HORS);
  const B = C.produit(10, 500, HORS + " AND f.lg_FAMILLE_ID <> '" + A.id + "'");
  for (const pr of [A, B]) { pr.cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + pr.id + "'"); }
  const stock = (pr) => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + pr.id + "' AND lg_EMPLACEMENT_ID = '1'"));
  const sess = await C.connecter();
  const { p, api } = sess;
  let clientId = null;
  const etatVente = () => p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), cl = c.getClient();
    return { vente: c.getCurrent() ? c.getCurrent().lgPREENREGISTREMENTID : null, lignes: Ext.ComponentQuery.query('doventemanager #contenu gridpanel')[0].getStore().getCount(),
      client: cl ? (cl.get ? cl.get('lgCLIENTID') : 'objet') : null, mode: c.getSafeComboValue('getVnotypeReglement', '?'), applique: c._appliedTypeReglement || null,
      attente: !!c._pendingModeNeedsClient, extra: c.extraModeReglementId || null }; });
  try {
    const cree = await api('POST', '../api/v1/client/add/lambda', { strFIRSTNAME: MARQUE + 'CLI', strLASTNAME: 'ESSAI', strADRESSE: '', lgTYPECLIENTID: '6', consentSms: 'false' });
    clientId = cree.data && cree.data.lgCLIENTID;
    ok('Précondition : deux produits hors ordonnancier, un client standard d\'essai', !!(A && B && clientId), [A && A.id, B && B.id, clientId].join(' '));

    const parcours = async (second, qte, mode) => {
      const journal = [];
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
      await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      await fermerMessages(p, []);
      const ajouter = async (pr, n) => {
        const ci = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
        await p.click(ci); await p.keyboard.press('Control+A'); await p.keyboard.type(pr.cip, { delay: 40 });
        await p.waitForSelector('.x-boundlist-item:visible', { timeout: 20000 });
        await p.locator('.x-boundlist-item:visible').filter({ hasText: pr.cip }).first().click();
        await p.waitForTimeout(600);
        const qi = await p.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
        await p.click(qi); await p.keyboard.press('Control+A'); await p.keyboard.type(String(n)); await p.keyboard.press('Enter');
        await p.waitForTimeout(2000);
      };
      await ajouter(A, 2);
      await fermerMessages(p, journal);
      const venteId = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; });
      if (venteId && !C.etat.ventes.includes(venteId)) { C.etat.ventes.push(venteId); }
      if (mode === 'ORANGE') {
        /* mode de reglement ORANGE : la fenetre de choix du client s'ouvre d'office */
        await V.choisir(p, 'doventemanager #contenu #typeReglement', 'ORANGE');
        await p.waitForTimeout(2500);
        await fermerMessages(p, journal);
      } else {
        /* « ASSOCIER UN CLIENT » puis choix du client d'essai */
        const assoc = await p.evaluate(() => { const b = Ext.ComponentQuery.query('doventemanager #contenu #btnClientComptant')[0]; return b && b.isVisible() ? b.getId() : null; });
        await p.click('#' + assoc); await p.waitForTimeout(1500);
      }
      await p.evaluate((nom) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const st = g.getStore(); st.getProxy().extraParams = Ext.apply(st.getProxy().extraParams || {}, { query: nom }); st.load(); }, MARQUE + 'CLI');
      await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; return g && !g.getStore().isLoading() && g.getStore().findExact('lgCLIENTID', id) >= 0; }, clientId, { timeout: 20000 });
      await p.evaluate((id) => { const g = Ext.ComponentQuery.query('clientLambda #lambdaClientGrid')[0]; const i = g.getStore().findExact('lgCLIENTID', id); testextjs.app.getController('VenteCtr').btnAjouterClientLambda(g, i, i); }, clientId);
      await p.waitForTimeout(2000);
      await fermerMessages(p, journal);
      /* icone « Supprimer le produit » de la ligne A */
      const icone = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('doventemanager #contenu gridpanel')[0]; const i = g.getStore().findBy((r) => r.get('lgFAMILLEID') === id || r.get('produitId') === id);
        const n = g.getView().getNode(i >= 0 ? i : 0); const ic = n && n.querySelector('.x-action-col-icon'); if (ic) { ic.setAttribute('data-e2e', 'suppr'); } return !!ic; }, A.id);
      etats.push(['avant suppression', await etatVente()]);
      if (icone) { await p.click('[data-e2e=suppr]'); }
      await p.waitForTimeout(2500);
      await fermerMessages(p, journal);
      etats.push(['apres suppression', await etatVente()]);
      const avantB = journal.length;
      await ajouter(second, qte);
      const messagesAjout = journal.slice(avantB);
      await fermerMessages(p, messagesAjout);
      etats.push(['apres ajout', await etatVente()]);
      /* montant recu = net, puis « Terminer la vente » */
      await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), net = Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0];
        c.getMontantRecu().setValue((net ? Number(String(net.getValue()).replace(/\D/g, '')) : 0) || (c.getNetAmountToPay() || {}).montantNet); });
      const btn = await p.evaluate(() => Ext.ComponentQuery.query('doventemanager #btnCloture')[0].getId());
      await p.click('#' + btn);
      await p.waitForTimeout(4000);
      const messagesCloture = [];
      await fermerMessages(p, messagesCloture);
      const vid = await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr').getCurrent(); return c ? c.lgPREENREGISTREMENTID : null; }) || venteId;
      if (vid && !C.etat.ventes.includes(vid)) { C.etat.ventes.push(vid); }
      /* fenetre de choix du client ou du medecin restee ouverte : la vente n'est pas cloturee */
      const fenetres = await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').filter((w) => !w.isXType('messagebox')).map((w) => w.xtype + '/' + (w.title || '')));
      await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').filter((w) => !w.isXType('messagebox')).forEach((w) => w.close()));
      return { venteId: venteId, icone, messagesAjout, messagesCloture, fenetres, tous: journal };
    };

    for (const [mode, qte] of [['ORANGE', 3], ['BOUTON', 2]]) {
    /* client par le mode de reglement ORANGE, puis par le bouton « ASSOCIER UN CLIENT » ; quantites differentes */
    const sA = stock(A), sB = stock(B);
    const r = await parcours(B, qte, mode);
    const exige = (t) => /client/i.test(t) && /(obligatoire|exig|veuillez|choisir|s[ée]lectionn)/i.test(t);
    const t = mode + ' : ';
    ok(t + 'icône « Supprimer le produit » trouvée et cliquée', r.icone);
    ok(t + 'ajout du second produit : aucun message exigeant un client', !r.messagesAjout.some(exige), r.messagesAjout.join(' || '));
    ok(t + 'clôture : aucun client exigé (ni message, ni fenêtre de choix)', !r.messagesCloture.some(exige) && r.fenetres.length === 0,
      r.messagesCloture.join(' || ') + ' ; fenêtres ' + r.fenetres.join(','));
    const v = q("SELECT CONCAT_WS('|', str_STATUT, int_PRICE, (SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_QUANTITY)) FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID))"
      + " FROM t_preenregistrement p WHERE lg_PREENREGISTREMENT_ID = '" + r.venteId + "'").split('|');
    ok(t + 'vente clôturée, une seule ligne : B quantité ' + qte, v[0] === 'is_Closed' && v[2] === B.id + ':' + qte, v.join(' | '));
    ok(t + 'bilan stock : A inchangé, B - ' + qte, stock(A) === sA && stock(B) === sB - qte, `A ${sA} -> ${stock(A)} ; B ${sB} -> ${stock(B)}`);
    const traces = q("SELECT CONCAT_WS(' ', (SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + r.venteId + "'), (SELECT IFNULL(SUM(montantPaye), 0) FROM mvttransaction WHERE pkey = '" + r.venteId + "'),"
      + " (SELECT COUNT(*) FROM t_recettes WHERE str_REF_FACTURE = '" + r.venteId + "'))");
    const net = Number(v[1]);
    ok(t + 'bilan caisse : un mouvement et une recette au net de la vente (' + qte + ' x ' + B.pu + ')', traces === '1 ' + net + ' 1' && net === qte * B.pu, traces + ' / net ' + net);

    }

    console.log('États de la vente : ' + JSON.stringify(etats));
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    if (clientId) {
      C.etat.restaurations.push("DELETE FROM t_client WHERE lg_CLIENT_ID = '" + clientId + "' AND str_FIRST_NAME LIKE '" + MARQUE + "%'");
      C.etat.restaurations.push("DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + clientId + "'");
    }
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
