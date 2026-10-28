/* POINTS DU 28/10 : 4, 8, 9, 11, 12, 14, 15, 17, 18 (fenetre), 19. Compte e2e, par les vrais chemins de l'ecran.
 * Jeu d'essai : un client et son compte, une caisse ouverte si besoin, une vente differee et une prevente d'un produit ;
 * tout est retire a la fin (ventes, mouvements, dettes, client, caisse), stock remis.
 *  4.  « Terminer » une prevente rend son numero ; la question d'impression le montre (« ... prévente n° X ? ») ;
 *  8.  « Générer » le numero de bon : AAMMJJ + 4 chiffres, libre pour ce tiers payant ;
 *  9.  client assurance a 120 % : refuse par le serveur, message « ne peut pas dépasser 100 % » ;
 *  11. Factures : « Créer » ouvre la generation dans une fenetre modale, la liste reste dessous ;
 *  12. reglement d'une facture deja soldee : refuse d'emblee, message clair, rien n'est enregistre ;
 *  14. recherche de tiers payant par « contient » (un morceau du milieu du nom suffit) ;
 *  15. reglement differe partiel : tous les dossiers du client coches par defaut ;
 *  17. vente differee rouverte : « Différé » (et non « Espèces ») ;
 *  18. « Faire un règlement » des differes : fenetre modale, la liste des differes reste dessous ;
 *  19. reglement de carnet depot : montant negatif ou motif absent refuses, message explicite ;
 *  aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C1 = 'e2e-p2810-c1', CAISSE = 'e2e-p2810-caisse';
/* E2E_REFERENCE=1 : version d'avant les corrections ; les points 9, 12 et 19 n'y sont pas joues (elle ecrirait : client
   cree, reglement enregistre, solde du carnet modifie) */
const REFERENCE = process.env.E2E_REFERENCE === '1';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_pd_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_pd_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") OR lg_COMPTE_CLIENT_ID = '" + C1 + "-cpt';"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID = '" + C1 + "-cpt';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = '" + C1 + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_pd_l;");
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
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + C1 + "', 'ZZP2810', 'Divers', 'enable', NOW());"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + C1 + "-cpt', '" + C1 + "', 'enable', NOW())");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const api = (methode, url, corps, forme) => p.evaluate(async ([m, u, c, f]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': f ? 'application/x-www-form-urlencoded' : 'application/json' },
      body: c ? (f ? new URLSearchParams(c).toString() : JSON.stringify(c)) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [methode, url, corps, forme]);
  const message = () => p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : null));
  const fermerMsg = () => p.evaluate(() => { if (Ext.Msg.isVisible()) { const x = Ext.Msg.down('button[itemId=ok]') || Ext.Msg.down('button[itemId=no]'); x.btnEl.dom.click(); } return true; });
  const ouvrir = async (xtype, titre) => {
    await p.evaluate((x) => { testextjs.app.getController('App').onLoadNewComponent(x.x, x.t, ''); return true; }, { x: xtype, t: titre });
    await p.waitForFunction((x) => Ext.ComponentQuery.query(x).some((c) => c.isVisible(true)), xtype, { timeout: 60000 });
    await p.waitForTimeout(1500);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1000);

    /* 4 */
    const pv = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: true, remiseId: '', userVendeurId: ADMIN });
    const pvId = pv.data && pv.data.lgPREENREGISTREMENTID;
    const fin = await api('PUT', '../api/v1/vente/terminerprevente/' + pvId);
    const refPv = q("SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + pvId + "'");
    ok('4. « Terminer » la prévente rend son numéro', fin.success === true && fin.ref === refPv, JSON.stringify(fin) + ' ' + refPv);
    await p.evaluate((x) => { testextjs.app.getController('VenteCtr').proposerTicketPrevente(x.id, x.ref); return true; }, { id: pvId, ref: refPv });
    await p.waitForTimeout(800);
    const m4 = await message();
    ok('4. Question d\'impression avec le numéro de la prévente', (m4 || '').indexOf('prévente n° ' + refPv) >= 0, m4);
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.down('button[itemId=no]').btnEl.dom.click(); } return true; });
    await api('POST', '../api/v1/ventestats/remove/' + pvId);

    /* 8 */
    const tp = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY lg_TIERS_PAYANT_ID LIMIT 1");
    const bon = await api('GET', '../api/v1/vente/numero-bon/' + tp);
    const jour = q("SELECT DATE_FORMAT(NOW(), '%y%m%d')");
    ok('8. « Générer » : numéro de bon AAMMJJ + 4 chiffres', bon.success === true && new RegExp('^' + jour + '\\d{4}$').test(bon.numBon || ''), JSON.stringify(bon));
    ok('8. Numéro libre pour ce tiers payant', q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent t JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = t.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
      + " WHERE t.str_REF_BON = '" + bon.numBon + "' AND c.lg_TIERS_PAYANT_ID = '" + tp + "' AND t.str_STATUT = 'is_Closed'") === '0');

    /* 9 */
    if (!REFERENCE) {
    const tpAss = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' AND lg_TYPE_TIERS_PAYANT_ID = '1' ORDER BY lg_TIERS_PAYANT_ID LIMIT 1");
    const avantClients = q("SELECT COUNT(*) FROM t_client");
    const c9 = await api('POST', '../api/v1/client/add/assurance', { strFIRSTNAME: 'ZZP2810', strLASTNAME: 'TAUX', lgTIERSPAYANTID: tpAss, intPOURCENTAGE: 120,
      intPRIORITY: 1, strNUMEROSECURITESOCIAL: 'E2EP2810', tiersPayants: [], ayantDroits: [] });
    ok('9. Pourcentage 120 % refusé par le serveur, message explicite', c9.success === false && /ne peut pas dépasser 100 %/.test(c9.msg || ''), JSON.stringify(c9));
    ok('9. Aucun client créé', q("SELECT COUNT(*) FROM t_client") === avantClients);
    }

    /* 14 */
    const nom = q("SELECT str_NAME FROM t_tiers_payant WHERE str_STATUT = 'enable' AND CHAR_LENGTH(str_NAME) >= 8 ORDER BY str_NAME LIMIT 1");
    const morceau = nom.substring(3, 7);
    const r14 = await api('GET', '../api/v1/client/tiers-payants?query=' + encodeURIComponent(morceau));
    const noms = (r14.data || []).map((x) => x.strNAME || x.str_NAME || x.strFULLNAME);
    ok('14. Recherche par « contient » : « ' + morceau + ' » trouve « ' + nom + ' »', noms.indexOf(nom) >= 0, noms.slice(0, 5).join(', '));
    const debut14 = nom.substring(0, 3);
    const r14b = await api('GET', '../api/v1/client/tiers-payants?query=' + encodeURIComponent(debut14));
    const premiers = (r14b.data || []).map((x) => x.strNAME || '');
    const idxContient = premiers.findIndex((n) => !n.toUpperCase().startsWith(debut14.toUpperCase()));
    const idxDebut = premiers.findIndex((n) => n.toUpperCase().startsWith(debut14.toUpperCase()));
    ok('14. Les noms qui commencent par la saisie restent en tête', idxDebut === 0 && (idxContient === -1 || premiers.slice(idxContient).every((n) => !n.toUpperCase().startsWith(debut14.toUpperCase()))), premiers.slice(0, 6).join(', '));

    /* 12 */
    const facture = q("SELECT lg_FACTURE_ID FROM t_facture WHERE dbl_MONTANT_RESTANT <= 0 AND dbl_MONTANT_CMDE > 0 ORDER BY dt_CREATED DESC LIMIT 1");
    if (REFERENCE) {
      console.log('  (12 non joué sur la référence)');
    } else if (facture) {
      const avant12 = q("SELECT COUNT(*) FROM t_dossier_reglement WHERE lg_FACTURE_ID = '" + facture + "'");
      const r12 = await api('POST', '../api/v1/reglement-facture/do-reglement', { lg_FACTURE_ID: facture, MODE_REGLEMENT: '1', TYPE_REGLEMENT: '1', NET_A_PAYER: '1000',
        int_AMOUNT_RECU: '1000', int_AMOUNT_REMIS: '0', LISTDOSSIERS: '[]', checkedList: '[]' }, true);
      ok('12. Facture déjà soldée : règlement refusé, message clair', /déjà entièrement réglée/.test(r12.errors || '') && /autre onglet ou un autre poste/.test(r12.errors || ''), JSON.stringify(r12).slice(0, 250));
      ok('12. Rien n\'est enregistré', q("SELECT COUNT(*) FROM t_dossier_reglement WHERE lg_FACTURE_ID = '" + facture + "'") === avant12);
    } else {
      ok('12. Précondition : une facture soldée dans la base', false, 'aucune');
    }

    /* 17 et 15 : vente differee pour le client d'essai */
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const vd = add.data && add.data.lgPREENREGISTREMENTID;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId: vd, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet || produit.pu;
    const cl = await api('POST', '../api/v1/vente/cloturer/vno', { venteId: vd, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: 0, montantRemis: 0, montantPaye: 0, totalRecap: montant, partTP: 0, typeRegleId: '4', clientId: C1, nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '4', montant, montantAttentu: montant }] });
    ok('Précondition : vente différée clôturée pour le client d\'essai', cl.success === true, JSON.stringify(cl).slice(0, 200));
    const v17 = await api('GET', '../api/v1/ventestats/' + vd);
    const mode17 = await p.evaluate((r) => testextjs.app.getController('VenteCtr').getTypeReglementToDisplay(r.reglements, r.differe), v17.data || {});
    ok('17. Vente différée rouverte : mode « Différé » (4), pas « Espèces »', v17.data && v17.data.differe === true && mode17 === '4', JSON.stringify((v17.data || {}).reglements) + ' differe=' + (v17.data || {}).differe + ' mode=' + mode17);

    /* 18 (fenetre) et 15 */
    await ouvrir('delayed', 'Différés');
    /* le bouton est dans l'onglet des reglements : on l'active comme un clic sur l'onglet */
    await p.evaluate(() => { const bt = Ext.ComponentQuery.query('delayed #doreglement')[0]; let c = bt;
      while (c.ownerCt && !(c.ownerCt instanceof Ext.tab.Panel)) { c = c.ownerCt; }
      if (c.ownerCt) { c.ownerCt.setActiveTab(c); } return true; });
    await p.waitForTimeout(1000);
    await p.evaluate(() => { Ext.ComponentQuery.query('delayed #doreglement')[0].btnEl.dom.click(); return true; });
    await p.waitForFunction(() => Ext.ComponentQuery.query('fairereglement').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const f18 = await p.evaluate(() => { const v = Ext.ComponentQuery.query('fairereglement')[0], w = v.up('window');
      return { fenetre: !!w, modale: !!(w && w.modal), listeDessous: Ext.ComponentQuery.query('delayed').length > 0 }; });
    ok('18. « Faire un règlement » : fenêtre modale, la liste des différés reste dessous', f18.fenetre && f18.modale && f18.listeDessous, JSON.stringify(f18));
    await p.evaluate((c) => {
      const ctr = testextjs.app.getController('FaireReglementCtr'), combo = ctr.getClient();
      combo.getStore().add({ lgCLIENTID: c, fullName: 'ZZP2810 Divers', strNUMEROSECURITESOCIAL: '', strADRESSE: '' });
      combo.setValue(c);
      ctr.onClientSelect(combo);
      return true;
    }, C1);
    await p.waitForFunction(() => { const g = testextjs.app.getController('FaireReglementCtr').getGridReglement(); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => { const ctr = testextjs.app.getController('FaireReglementCtr'), n = ctr.getNature(); n.setValue('1'); ctr.natureSelectEvent(n); return true; });
    await p.waitForTimeout(800);
    const s15 = await p.evaluate(() => { const g = testextjs.app.getController('FaireReglementCtr').getGridReglement();
      return { lignes: g.getStore().getCount(), cochees: g.getSelectionModel().getSelection().length }; });
    ok('15. Règlement partiel : tous les dossiers du client cochés par défaut', s15.lignes > 0 && s15.cochees === s15.lignes, JSON.stringify(s15));
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('fairereglement')[0].up('window'); w.close(); return true; });
    await p.waitForTimeout(800);
    ok('18. Fermeture de la fenêtre : retour à la liste des différés', await p.evaluate(() => !Ext.ComponentQuery.query('fairereglement').length && Ext.ComponentQuery.query('delayed').some((x) => x.isVisible(true))));

    /* 11 */
    await ouvrir('facturemanager', 'Factures');
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('facturemanager')[0]; const bt = v.query('button').find((x) => x.handler === v.onAddCreate); bt.btnEl.dom.click(); return true; });
    await p.waitForFunction(() => Ext.ComponentQuery.query('addeditfacture').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const f11 = await p.evaluate(() => { const v = Ext.ComponentQuery.query('addeditfacture')[0], w = v.up('window');
      return { fenetre: !!w, modale: !!(w && w.modal), listeDessous: Ext.ComponentQuery.query('facturemanager').length > 0 }; });
    ok('11. « Créer » une facture : fenêtre modale, la liste des factures reste dessous', f11.fenetre && f11.modale && f11.listeDessous, JSON.stringify(f11));
    await p.evaluate(() => { const w = Ext.ComponentQuery.query('addeditfacture')[0].up('window'); w.close(); return true; });
    await p.waitForTimeout(800);
    ok('11. Fermeture : retour à la liste des factures', await p.evaluate(() => !Ext.ComponentQuery.query('addeditfacture').length && Ext.ComponentQuery.query('facturemanager').some((x) => x.isVisible(true))));

    /* 19 : carnet depot (refus avant toute ecriture) */
    /* la base de travail n'a pas toujours de carnet depot : le refus a lieu avant toute ecriture, quel que soit le tiers payant */
    const depot = q("SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant WHERE str_STATUT = 'enable' ORDER BY is_depot DESC, lg_TIERS_PAYANT_ID LIMIT 1");
    if (REFERENCE) {
      console.log('  (19 non joué sur la référence)');
    } else if (depot) {
      const avant19 = q("SELECT IFNULL(account, 0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + depot + "'");
      const r19a = await api('PUT', '../api/v2/carnet-depot/regler/' + depot, { montantPaye: -500, typeReglement: '1', motif: 1 });
      ok('19. Montant négatif refusé, message explicite', r19a.success === false && /supérieur à zéro|négatif/.test(r19a.msg || ''), JSON.stringify(r19a));
      /* le motif n'est exige que si l'officine a des motifs configures (sinon aucun reglement ne serait possible) */
      if (q('SELECT COUNT(*) FROM motif_reglement') !== '0') {
        const r19b = await api('PUT', '../api/v2/carnet-depot/regler/' + depot, { montantPaye: 500, typeReglement: '1' });
        ok('19. Motif absent refusé, message explicite', r19b.success === false && /motif/.test(r19b.msg || ''), JSON.stringify(r19b));
      } else {
        console.log('  (19 motif : aucun motif configuré dans cette base, le motif n\'y est pas exigé)');
      }
      ok('19. Solde du carnet inchangé', q("SELECT IFNULL(account, 0) FROM t_tiers_payant WHERE lg_TIERS_PAYANT_ID = '" + depot + "'") === avant19);
    } else {
      ok('19. Précondition : un carnet dépôt dans la base', false, 'aucun');
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + C1 + "'") === '0'
      && q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine.join('|'));
  }
  const k = res.filter((x) => x.c).length;
  console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
  process.exit(k === res.length ? 0 : 1);
})();
