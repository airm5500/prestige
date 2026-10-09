/* PAIEMENT D'UNE VENTE AVEC LES POINTS DE FIDELITE (retours du 09/10 (6), mode de reglement « Points fidelite »).
 * Parcours de l'ecran de vente par son API (ajout, net a payer, cloture), comme la caisse, et controle a l'ecran.
 * Jeu d'essai (retire a la fin ; parametres de fidelite et etat du mode remis) : client E2E-PTS avec 200 points
 * (valeur du point 5 FCFA -> 1 000 FCFA), produit de 200 a 400 FCFA.
 *  - mode propose a la caisse seulement quand la fidelite est activee ;
 *  - A : vente payee entierement en points -> points debites (arrondi au point superieur), reglement « Points
 *    fidelite » enregistre (vente_reglement, mouvement de caisse), ligne au ticket Z ;
 *  - B : especes + points -> seuls les points du second mode sont debites ; la part payee en points ne rapporte
 *    pas de points ;
 *  - C : points insuffisants -> cloture refusee avec le solde, vente NON enregistree (ni stock, ni points) ;
 *  - D : sans client -> refusee ; vente en depot -> refusee ;
 *  - annulation de la vente A : points rendus au client ;
 *  - ecran de vente : avertissement immediat quand les points ne suffisent pas ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const C = 'E2E-PTS-C1', CAISSE = 'e2e-pts-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q("SELECT NOW() - INTERVAL 1 SECOND");
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_pts_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_pts_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "' OR lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_pts_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_pts_r);"
    + "DELETE FROM t_compte_client WHERE lg_CLIENT_ID = '" + C + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = '" + C + "';"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_pts_l; DROP TEMPORARY TABLE IF EXISTS e2e_pts_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
  if (caisseCreee) {
    exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'");
  }
}

(async () => {
  exec("DROP TABLE IF EXISTS zz_e2e_pts_param; CREATE TABLE zz_e2e_pts_param AS SELECT * FROM t_fidelite_parametre;"
    + "DROP TABLE IF EXISTS zz_e2e_pts_mode; CREATE TABLE zz_e2e_pts_mode AS SELECT lg_TYPE_REGLEMENT_ID, str_STATUT FROM t_type_reglement WHERE lg_TYPE_REGLEMENT_ID = '20';");
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 400 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + C + "', 'ZZPTS', 'Fidele', 'enable', NOW());"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + C + "-cpt', '" + C + "', 'enable', NOW())");
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
  const solde = () => Number(q("SELECT COALESCE(SUM(int_POINTS), 0) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'"));
  const modes = async () => ((await api('GET', '../api/v1/common/reglement?_dc=' + Date.now())).data || []).map((m) => m.lgTYPEREGLEMENTID);
  const nouvelleVente = async (qte) => {
    const r = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    return r.data ? r.data.lgPREENREGISTREMENTID : null;
  };
  /* comme la caisse (buildModeReglements) : un mode seul, ou especes + second mode */
  const cloturer = async (venteId, mode, clientId, second, url) => {
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {};
    const montant = data.montantNet;
    let reglements, recu = montant;
    if (second) {
      recu = montant - second.montant;
      reglements = [{ typeReglement: second.mode, montant: second.montant, montantAttentu: second.montant, montantVerse: second.montant },
        { typeReglement: '1', montant: recu, montantAttentu: recu, montantVerse: recu }];
    } else {
      reglements = [{ typeReglement: mode, montant, montantAttentu: montant }];
    }
    const r = await api('POST', url || '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: recu, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: mode, clientId, nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements });
    return { r, montant };
  };
  const statut = (v) => q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1000);

    /* mode propose seulement quand la fidelite est activee */
    let r = await api('PUT', '../api/v1/fidelite/parametres', { actif: false });
    ok('Fidélité désactivée : « Points fidélité » absent des modes de la caisse', r.success && !(await modes()).includes('20'), JSON.stringify(await modes()));
    r = await api('PUT', '../api/v1/fidelite/parametres', { actif: true, montantPoint: 1000, valeurPoint: 5, seuil: 10, expirationMois: 12, assurance: true,
      debut: q('SELECT CURDATE()') });
    ok('Fidélité activée : « Points fidélité » proposé à la caisse', r.success && (await modes()).includes('20'), JSON.stringify(await modes()));
    r = await api('POST', '../api/v1/fidelite/client/' + C + '/ajuster', { points: 200, motif: 'Essai paiement en points' });
    ok('Précondition : le client a 200 points (1 000 FCFA)', r.success && solde() === 200, JSON.stringify(r));
    const info = await api('GET', '../api/v1/fidelite/paiement?client=' + C);
    ok('Caisse : solde et montant payable du client (200 points, 1 000 FCFA)', info.success && info.utilisable && info.solde === 200 && info.montantMax === 1000, JSON.stringify(info));

    /* A : tout en points */
    const vA = await nouvelleVente(1);
    const cA = await cloturer(vA, '20', C);
    const ptsA = Math.ceil(cA.montant / 5);
    ok('A. Vente payée entièrement en points : clôturée, ' + ptsA + ' point(s) débités', cA.r.success === true && statut(vA) === 'is_Closed' && solde() === 200 - ptsA,
      JSON.stringify(cA.r).slice(0, 200) + ' solde ' + solde());
    ok('A. Règlement « Points fidélité » enregistré (vente_reglement et mouvement de caisse)',
      q("SELECT GROUP_CONCAT(type_regelement) FROM vente_reglement WHERE vente_id = '" + vA + "'") === '20'
      && q("SELECT typeReglementId FROM mvttransaction WHERE pkey = '" + vA + "' LIMIT 1") === '20');
    ok('A. Utilisation de points rattachée à la vente, avec sa valeur',
      q("SELECT CONCAT(int_POINTS, '|', int_VALEUR) FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = '" + vA + "' AND str_TYPE = 'UTILISATION'") === -ptsA + '|' + cA.montant);

    /* B : especes + points */
    const vB = await nouvelleVente(2);
    const avantB = solde();
    const cB = await cloturer(vB, '1', C, { mode: '20', montant: 300 });
    ok('B. Espèces + points : seuls les 60 points du second mode sont débités', cB.r.success === true && solde() === avantB - 60, JSON.stringify(cB.r).slice(0, 200) + ' solde ' + solde());
    ok('B. Deux règlements enregistrés : espèces et points',
      q("SELECT GROUP_CONCAT(CONCAT(type_regelement, '=', montant) ORDER BY type_regelement) FROM vente_reglement WHERE vente_id = '" + vB + "'") === '1=' + (cB.montant - 300) + ',20=300');

    /* C : points insuffisants */
    const vC = await nouvelleVente(10);
    const avantC = solde();
    const stockAvant = q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
    const cC = await cloturer(vC, '20', C);
    ok('C. Points insuffisants : clôture refusée avec le solde du client', cC.r.success === false && /n'en a que/.test(cC.r.msg || ''), JSON.stringify(cC.r));
    ok('C. Vente non enregistrée : toujours en cours, stock et points inchangés', statut(vC) === 'is_Process' && solde() === avantC
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockAvant
      && q("SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + vC + "'") === '0');

    /* D : sans client, depot */
    const vD = await nouvelleVente(1);
    const cD = await cloturer(vD, '20', '');
    ok('D. Sans client : refusée', cD.r.success === false && statut(vD) === 'is_Process', JSON.stringify(cD.r));
    const cDep = await api('POST', '../api/v1/vente/clotureVenteDepot', { venteId: vD, typeRegleId: '20', montantPaye: 500, montantRecu: 500,
      reglements: [{ typeReglement: '20', montant: 500, montantAttentu: 500 }] });
    ok('D. Vente en dépôt payée en points : refusée', cDep.success === false && /dépôt/.test(cDep.msg || ''), JSON.stringify(cDep));

    /* pas de points gagnes sur la part payee en points */
    await api('POST', '../api/v1/fidelite/synchroniser');
    const gainB = q("SELECT int_BASE FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = '" + vB + "' AND str_TYPE = 'GAIN'");
    const gainA = q("SELECT int_BASE FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = '" + vA + "' AND str_TYPE = 'GAIN'");
    ok('Points gagnés sur la seule part payée autrement qu\'en points (A : 0, B : net − 300)', gainA === '0' && gainB === String(cB.montant - 300), 'A ' + gainA + ' B ' + gainB);

    /* ticket Z : ligne « Points fidelite » (les donnees du ticket) */
    const jour = q('SELECT CURDATE()');
    const z = await api('POST', '../api/v1/caisse/fetch-tickez', { dtStart: jour, dtEnd: jour, hrStart: '00:00', hrEnd: '23:59', userId: '', description: '' });
    ok('Ticket Z : ligne « Points fidélité »', /Points fid.lit/.test(JSON.stringify(z)), JSON.stringify(z).slice(0, 200));

    /* annulation de la vente A : points rendus */
    const avantAnn = solde();
    const ann = await api('GET', '../api/v1/vente/annulation/' + vA);
    await api('GET', '../api/v1/fidelite/paiement?client=' + C);
    ok('Annulation de la vente payée en points : ' + ptsA + ' point(s) rendus au client', ann.success === true && solde() === avantAnn + ptsA
      && q("SELECT int_POINTS FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID = '" + vA + "' AND str_TYPE = 'RESTITUTION'") === String(ptsA),
      JSON.stringify(ann).slice(0, 160) + ' solde ' + avantAnn + ' -> ' + solde());

    /* ecran de vente : avertissement immediat */
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(2000);
    await p.evaluate((c) => { const ctl = testextjs.app.getController('VenteCtr');
      ctl.client = { get: (k) => (k === 'lgCLIENTID' ? c : null) };
      ctl.netAmountToPay = { montantNet: 50000 }; ctl.getNetAmountToPay = () => ctl.netAmountToPay; ctl.verifierPointsFidelite(); }, C);
    await p.waitForFunction(() => Ext.MessageBox.isVisible(), null, { timeout: 15000 });
    const alerte = await p.evaluate(() => Ext.MessageBox.msg.getEl().dom.textContent);
    await p.evaluate(() => Ext.MessageBox.hide());
    ok('Écran de vente : avertissement quand les points ne couvrent pas le net (solde, montant payable, conseil espèces + points)',
      /point\(s\)/.test(alerte) && /Espèces/.test(alerte) && /Points fidélité/.test(alerte), alerte);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    exec("DELETE FROM t_fidelite_parametre; INSERT INTO t_fidelite_parametre SELECT * FROM zz_e2e_pts_param;"
      + "UPDATE t_type_reglement t JOIN zz_e2e_pts_mode z ON z.lg_TYPE_REGLEMENT_ID = t.lg_TYPE_REGLEMENT_ID SET t.str_STATUT = z.str_STATUT;"
      + "UPDATE t_mode_reglement m JOIN zz_e2e_pts_mode z ON z.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID SET m.str_STATUT = z.str_STATUT;"
      + "DROP TABLE zz_e2e_pts_param, zz_e2e_pts_mode;");
    ok('Jeu d\'essai retiré, paramètres de fidélité et mode remis', q("SELECT COUNT(*) FROM t_client WHERE lg_CLIENT_ID = '" + C + "'") === '0'
      && q("SELECT COUNT(*) FROM t_fidelite_mouvement WHERE lg_CLIENT_ID = '" + C + "'") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
