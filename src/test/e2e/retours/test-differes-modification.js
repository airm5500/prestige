/* VENTE DIFFEREE MODIFIEE (retours du 09/10 (1), cas 1). Parcours de l'ecran de vente par son API (ajout, net a
 * payer, cloture en differe, modification d'une vente cloturee, cloture de la copie). Comportement ATTENDU :
 *  B. vente differee de 2 produits, 1 produit deja regle, modifiee puis recloturee en differe (meme client) :
 *     le reste du = nouveau prix - ce qui etait deja regle (avant : tout le prix etait de nouveau du) ;
 *  A. vente differee modifiee puis cloturee au comptant : plus aucune dette pour cette vente sur le compte du
 *     client (avant : la ligne copiee restait « en cours » avec l'ancien montant, comptee dans le solde) ;
 *  C. vente differee modifiee, cloturee en differe pour un AUTRE client : la dette passe sur le nouveau client
 *     (avant : elle restait sur l'ancien) ;
 *  D. cloture de la copie refusee par un controle : la vente d'origine n'est PAS annulee (avant : annulee quand
 *     meme) ;
 *  + coherence : solde du releve = somme des restes dus, pour chaque client.
 * Tout ce que le test cree est retire (ventes, copies, annulations, mouvements, stock remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', [BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C1 = 'e2e-dmod-c1', C2 = 'e2e-dmod-c2', CAISSE = 'e2e-dmod-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q("SELECT NOW() - INTERVAL 1 SECOND");
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  const d = q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_DOSSIER_REGLEMENT_ID, '''')), '''-''') FROM t_dossier_reglement WHERE str_ORGANISME_ID IN ('" + C1 + "', '" + C2 + "')");
  exec("CREATE TEMPORARY TABLE e2e_dm_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_dm_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_modifiee_ligne WHERE modification_id IN (SELECT id FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + "));"
    + "DELETE FROM vente_modifiee WHERE vente_id IN (" + v + ") OR vente_origine_id IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_dm_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ") OR pkey IN (" + d + ");"
    + "DELETE FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (" + d + ");"
    + "DELETE FROM t_reglement WHERE str_REF_RESSOURCE IN (" + d + ");"
    + "DELETE FROM t_dossier_reglement_detail WHERE lg_DOSSIER_REGLEMENT_ID IN (" + d + ");"
    + "DELETE FROM t_dossier_reglement WHERE lg_DOSSIER_REGLEMENT_ID IN (" + d + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") OR lg_COMPTE_CLIENT_ID IN ('" + C1 + "-cpt', '" + C2 + "-cpt');"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_dm_r);"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID IN ('" + C1 + "-cpt', '" + C2 + "-cpt');"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID IN ('" + C1 + "', '" + C2 + "');"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_dm_l; DROP TEMPORARY TABLE IF EXISTS e2e_dm_r;");
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
  for (const [c, nom] of [[C1, 'ZZDMOD Un'], [C2, 'ZZDMOD Deux']]) {
    exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + c + "', '" + nom.split(' ')[0] + "', '" + nom.split(' ')[1] + "', 'enable', NOW());"
      + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + c + "-cpt', '" + c + "', 'enable', NOW())");
  }
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [methode, url, corps]);
  const ligne = (vente) => q("SELECT CONCAT_WS('|', cc.lg_CLIENT_ID, tp.int_PRICE, tp.int_PRICE_RESTE, tp.str_STATUT) FROM t_preenregistrement_compte_client tp"
    + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID WHERE tp.lg_PREENREGISTREMENT_ID = '" + vente + "'");
  const restes = (client) => Number(q("SELECT COALESCE(SUM(tp.int_PRICE_RESTE), 0) FROM t_preenregistrement_compte_client tp JOIN t_compte_client cc"
    + " ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID"
    + " WHERE cc.lg_CLIENT_ID = '" + client + "' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"));
  /* comme l'ecran : ajout, net a payer, cloture */
  const nouvelleVente = async (qte) => {
    const r = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    return r.data ? r.data.lgPREENREGISTREMENTID : null;
  };
  const cloturer = async (venteId, mode, clientId, recu, typeVente) => {
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {};
    const montant = data.montantNet || produit.pu;
    return api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: typeVente || '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: recu, montantRemis: 0, montantPaye: recu, totalRecap: montant, partTP: 0, typeRegleId: mode, clientId, nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: mode, montant: mode === '1' ? recu : montant, montantAttentu: mode === '1' ? recu : montant }] });
  };
  const modifier = async (venteId) => {
    const r = await api('PUT', '../api/v1/vente/modifier-vente-terme/' + venteId);
    const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PARENT_ID = '" + venteId + "' AND str_STATUT = 'is_Process' ORDER BY dt_CREATED DESC LIMIT 1");
    return { r, copie };
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1000);
    const prix2 = 2 * produit.pu;

    /* B : deja regle conserve */
    const vB = await nouvelleVente(2);
    const cB = await cloturer(vB, '4', C1, 0);
    ok('Précondition : vente de 2 produits clôturée en différé pour le client 1', cB.success === true && ligne(vB) === C1 + '|' + prix2 + '|' + prix2 + '|is_Closed', JSON.stringify(cB).slice(0, 200) + ' ' + ligne(vB));
    const idLigne = q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_ID FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + vB + "'");
    const rg = await api('POST', '../api/v1/reglement/reglementdiffere', { montantRecu: produit.pu, montantRemis: 0, montantPaye: produit.pu, clientId: C1, typeRegleId: '1',
      nom: '', banque: '', lieux: '', totalRecap: prix2, natureVenteId: q('SELECT CURDATE()'), commentaire: JSON.stringify([idLigne]), restesAttendus: JSON.stringify({ [idLigne]: prix2 }) });
    ok('Précondition : 1 produit réglé (reste = 1 produit)', rg.success === true && ligne(vB).split('|')[2] === String(produit.pu), JSON.stringify(rg) + ' ' + ligne(vB));
    const mB = await modifier(vB);
    ok('Précondition : modification de la vente clôturée (copie en cours)', !!mB.copie, JSON.stringify(mB.r).slice(0, 200));
    const cB2 = await cloturer(mB.copie, '4', C1, 0);
    ok('B. Vente modifiée recloturée en différé : reste dû = prix − déjà réglé (1 produit), pas tout le prix',
      cB2.success === true && ligne(mB.copie) === C1 + '|' + prix2 + '|' + produit.pu + '|is_Closed', JSON.stringify(cB2).slice(0, 160) + ' copie ' + ligne(mB.copie));

    /* A : recloturee au comptant */
    const vA = await nouvelleVente(1);
    await cloturer(vA, '4', C1, 0);
    const avantA = restes(C1);
    const mA = await modifier(vA);
    const cA = await cloturer(mA.copie, '1', C1, produit.pu);
    ok('A. Vente différée modifiée puis payée au comptant : plus de dette pour cette vente sur le compte du client',
      cA.success === true && restes(C1) === avantA - produit.pu && !/\|is_Process$/.test(ligne(mA.copie)), JSON.stringify(cA).slice(0, 160) + ' restes ' + avantA + ' -> ' + restes(C1) + ' copie ' + ligne(mA.copie));

    /* C : autre client */
    const vC = await nouvelleVente(1);
    await cloturer(vC, '4', C1, 0);
    const mC = await modifier(vC);
    const cC = await cloturer(mC.copie, '4', C2, 0);
    ok('C. Vente modifiée recloturée en différé pour un autre client : la dette passe sur ce client',
      cC.success === true && ligne(mC.copie).startsWith(C2 + '|') && restes(C2) === produit.pu, JSON.stringify(cC).slice(0, 160) + ' copie ' + ligne(mC.copie));

    /* D : cloture refusee */
    const vD = await nouvelleVente(1);
    await cloturer(vD, '4', C1, 0);
    const mD = await modifier(vD);
    const cD = await cloturer(mD.copie, '4', C1, 0, '2');
    ok('D. Clôture de la copie refusée (type de vente changé) : la vente d\'origine n\'est pas annulée',
      cD.success === false && q("SELECT CONCAT(b_IS_CANCEL, '|', str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'") === '0|is_Closed'
      && ligne(vD) === C1 + '|' + produit.pu + '|' + produit.pu + '|is_Closed', JSON.stringify(cD).slice(0, 160) + ' origine ' + q("SELECT CONCAT(b_IS_CANCEL, '|', str_STATUT) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'") + ' ligne ' + ligne(vD));
    const cD2 = await cloturer(mD.copie, '4', C1, 0);
    ok('D. Puis clôture correcte : l\'origine est annulée, une seule dette', cD2.success === true
      && q("SELECT b_IS_CANCEL FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vD + "'") === '1' && ligne(mD.copie) === C1 + '|' + produit.pu + '|' + produit.pu + '|is_Closed', JSON.stringify(cD2).slice(0, 160));

    /* coherence */
    for (const c of [C1, C2]) {
      const r = await api('GET', '../api/v1/reglement/releve?dtStart=2020-01-01&dtEnd=2030-12-31&clientId=' + c);
      ok('Cohérence ' + c + ' : solde du relevé = somme des restes dus', r.soldeFinal === restes(c), 'relevé ' + r.soldeFinal + ', restes ' + restes(c));
    }
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'"); }
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine.join('|'));
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
