/* POINT 7 DU 28/10. Vente modifiee sans aucun changement : pas de validation. Compte e2e.
 * Jeu d'essai : une vente au comptant d'un produit, cloturee par l'API de l'ecran de vente. Puis par les vues :
 *  - « Ventes terminées », recherche de la vente par sa reference (critere saisi), « Modifier » sur sa ligne ;
 *  - sur la copie, rien n'est change : montant recu saisi, « Terminer la vente » ;
 *  - message « Aucun changement détecté, retour à la liste des ventes » ; la vente d'origine n'est PAS annulee, aucune
 *    nouvelle vente, la copie est retiree ;
 *  - apres « OK », « Ventes terminées » se rouvre avec le meme critere de recherche et la vente dans la liste ;
 *  - une vraie modification (quantite changee) est toujours validee (l'origine est annulee) ;
 *  - aucune erreur JavaScript. Tout ce que le test cree est retire, stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAISSE = 'e2e-p7-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_p7_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_p7_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_modifiee_ligne WHERE modification_id IN (SELECT id FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + "));"
    + "DELETE FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_p7_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_p7_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_p7_l; DROP TEMPORARY TABLE IF EXISTS e2e_p7_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
}

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 20000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [methode, url, corps]);
  const etat = (id) => q("SELECT CONCAT(b_IS_CANCEL, '|', str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'");
  const message = () => p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : null));
  const clicMsg = (x) => p.evaluate((id) => { Ext.Msg.down('button[itemId=' + id + ']').btnEl.dom.click(); }, x);
  /* « Ventes terminées », critere = reference, « Modifier » sur la ligne de la vente, copie chargee a l'ecran */
  const ouvrirModification = async (venteId, ref) => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('ventemanager', 'Ventes terminées', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.evaluate((r) => { const c = Ext.ComponentQuery.query('ventemanager #query')[0]; c.setValue(r); testextjs.app.getController('VenteFinisCtr').doSearch(); }, ref);
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lgPREENREGISTREMENTID', id) >= 0; }, venteId, { timeout: 60000 });
    await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], i = g.getStore().findExact('lgPREENREGISTREMENTID', id), r = g.getStore().getAt(i);
      testextjs.app.getController('VenteFinisCtr').onEdite(g.getView(), i, 0, null, null, r, null);
    }, venteId);
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID && Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    return p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
  };
  const terminer = async (encore) => {
    await p.evaluate(() => {
      const c = testextjs.app.getController('VenteCtr'), net = Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0];
      const m = c.getMontantRecu(), montant = net ? Number(String(net.getValue()).replace(/\D/g, '')) : 0;
      m.setValue(montant || c.current.intPRICE);
      Ext.ComponentQuery.query('doventemanager #btnCloture')[0].btnEl.dom.click();
    });
    /* l'ecran peut d'abord recalculer le net a payer (message a valider), puis on termine a nouveau */
    await p.waitForTimeout(2500);
    const m = await message();
    if (encore !== false && m && /net à payer/i.test(m)) {
      await clicMsg('ok').catch(() => {});
      await p.waitForTimeout(2500);
      await terminer(false);
    }
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1000);
    /* vente au comptant d'un produit, comme l'ecran */
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const vente = add.data && add.data.lgPREENREGISTREMENTID;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId: vente, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet || produit.pu;
    const c = await api('POST', '../api/v1/vente/cloturer/vno', { venteId: vente, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    const ref = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'");
    ok('Précondition : vente au comptant clôturée', c.success === true && etat(vente) === '0|is_Closed', JSON.stringify(c).slice(0, 200) + ' ' + ref);

    const copie = await ouvrirModification(vente, ref);
    ok('« Modifier » depuis « Ventes terminées » : copie chargée à l\'écran de vente', !!copie && copie !== vente, copie);
    await terminer();
    await p.waitForFunction(() => Ext.Msg.isVisible() && /changement/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 }).catch(() => {});
    const m = await message();
    ok('Validation sans changement : « Aucun changement détecté, retour à la liste des ventes »', /Aucun changement détecté, retour à la liste des ventes/.test(m || ''), m);
    ok('La vente d\'origine n\'est pas annulée', etat(vente) === '0|is_Closed', etat(vente));
    ok('Aucune nouvelle vente clôturée', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PARENT_ID = '" + vente + "' AND str_STATUT = 'is_Closed'") === '0');
    await clicMsg('ok').catch(() => {});
    const liste = await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 }).then(() => true, () => false);
    const l = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0];
      return g ? { critere: Ext.ComponentQuery.query('ventemanager #query')[0].getValue(), presente: g.getStore().findExact('lgPREENREGISTREMENTID', id) >= 0, lignes: g.getStore().getCount() } : null; }, vente);
    ok('Retour à « Ventes terminées » avec le même critère de recherche', liste && l && l.critere === ref && l.presente, JSON.stringify(l));
    ok('La copie est retirée', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + copie + "' AND str_STATUT = 'is_Process'") === '0');

    /* vraie modification : toujours validee */
    const copie2 = await ouvrirModification(vente, ref);
    const ligne = q("SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + copie2 + "' LIMIT 1");
    /* comme la grille de l'ecran (onGridEdit) */
    const maj = await api('POST', '../api/v1/vente/update/item/vno', { itemId: ligne, qte: 2, qteServie: 2, itemPu: produit.pu, produitId: produit.id });
    await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); c.toRecalculate = true; if (c.refresh) { c.refresh(); } });
    await p.waitForTimeout(1500);
    await terminer();
    await p.waitForFunction((id) => !Ext.Msg.isVisible() || !/changement/i.test(Ext.Msg.msg.getEl().dom.innerText), copie2, { timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(4000);
    ok('Vraie modification (quantité 1 → 2) : validée, l\'origine est annulée', etat(vente).startsWith('1|')
      && q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + copie2 + "'") === 'is_Closed', JSON.stringify(maj).slice(0, 120) + ' origine ' + etat(vente) + ' msg ' + (await message()));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine.join('|'));
  }
  const k = res.filter((x) => x.c).length;
  console.log('\n' + k + '/' + res.length + ' OK');
  process.exit(k === res.length ? 0 : 1);
})();
