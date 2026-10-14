/* ANNULATION DE VENTE : JAMAIS DEUX FOIS (demandes serveur des applications mobiles, demande 6 et lot 1 d'integrite).
 * Constat : l'annulation ne verifiait pas si la vente etait deja annulee ; un second appel (double clic, rechargement,
 * nouvelle tentative d'un telephone) clonait de nouveau la vente et RECREDITAIT LE STOCK une seconde fois.
 *  - annulation par la route de l'ecran « Ventes terminees » (GET vente/annulation/{id}) : stock rendu une fois ;
 *  - second appel : refuse (code ETAT, « deja annulee »), stock et ventes inchanges ;
 *  - la vente « copie » d'annulation (montants negatifs) ne s'annule pas ;
 *  - deux annulations lancees en meme temps : une seule passe ;
 *  - nouvelle route POST vente/{id}/annuler (X-Client-Ref) : meme reponse au rejeu, refus ETAT sinon.
 * Jeu d'essai retire a la fin (ventes, mouvements, stock remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const CAISSE = 'e2e-ann-caisse';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q("SELECT NOW() - INTERVAL 1 SECOND");
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_ann_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_ann_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_ann_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM mobile_client_ref WHERE reference LIKE 'E2E-ANN-%';"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_ann_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_ann_l; DROP TEMPORARY TABLE IF EXISTS e2e_ann_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
  if (caisseCreee) {
    exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'");
  }
}

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 2000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1 OFFSET 7").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  if (q("SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '" + ADMIN + "' AND str_STATUT = 'is_Using'") === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + " VALUES ('" + CAISSE + "', '" + ADMIN + "', 0, 0, CURDATE(), NOW(), '" + ADMIN + "', NOW(), '" + ADMIN + "', 'is_Using')");
    caisseCreee = true;
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (methode, url, corps, entetes) => p.evaluate(async ([m, u, c, h]) => {
    const r = await fetch(u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}), body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { success: false, brut: t.slice(0, 200) }; } j.http = r.status; return j;
  }, [methode, url, corps, entetes]);
  const stock = () => Number(q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'"));
  const copies = (v) => Number(q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'"));
  const mouvementsAnnulation = (v) => Number(q("SELECT COUNT(*) FROM hmvtproduit h JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = h.pkey"
    + " JOIN t_preenregistrement t ON t.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE t.lg_PREENGISTREMENT_ANNULE_ID = '" + v + "'"));
  const vente = async (qte) => {
    const r = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    const venteId = r.data ? r.data.lgPREENREGISTREMENTID : null;
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet;
    const c = await api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    return c.success ? venteId : null;
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });

    /* 1. annulation rejouee */
    const v1 = await vente(2);
    ok('Précondition : vente de 2 boîtes clôturée, stock 100 → 98', v1 && stock() === 98, stock());
    const a1 = await api('GET', '../api/v1/vente/annulation/' + v1);
    ok('Première annulation : acceptée, stock rendu (98 → 100), une copie d\'annulation', a1.success === true && stock() === 100 && copies(v1) === 1, JSON.stringify(a1).slice(0, 120) + ' stock ' + stock());
    const a2 = await api('GET', '../api/v1/vente/annulation/' + v1);
    ok('Seconde annulation : refusée (code ETAT, « déjà annulée »), stock et copies inchangés', a2.success === false && a2.code === 'ETAT' && /déjà annulée/i.test(a2.msg || '')
      && stock() === 100 && copies(v1) === 1 && mouvementsAnnulation(v1) === 1, JSON.stringify(a2).slice(0, 160) + ' stock ' + stock() + ' copies ' + copies(v1));
    const copie = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_PREENGISTREMENT_ANNULE_ID = '" + v1 + "'");
    const a3 = await api('GET', '../api/v1/vente/annulation/' + copie);
    ok('La copie d\'annulation (montants négatifs) ne s\'annule pas', a3.success === false && a3.code === 'ETAT' && stock() === 100 && copies(copie) === 0, JSON.stringify(a3).slice(0, 160));

    /* 2. deux annulations en meme temps */
    const v2 = await vente(3);
    const [b1, b2] = await p.evaluate(async (u) => Promise.all([fetch(u).then((r) => r.json()), fetch(u).then((r) => r.json())]), '../api/v1/vente/annulation/' + v2);
    ok('Deux annulations simultanées : une seule passe, stock rendu une fois (97 → 100)', [b1, b2].filter((x) => x.success === true).length === 1 && stock() === 100 && copies(v2) === 1,
      JSON.stringify([b1.success, b1.code, b2.success, b2.code]) + ' stock ' + stock() + ' copies ' + copies(v2));

    /* 3. route POST avec X-Client-Ref (applications mobiles) */
    const v3 = await vente(1);
    const c1 = await api('POST', '../api/v1/vente/' + v3 + '/annuler', null, { 'X-Client-Ref': 'E2E-ANN-1' });
    ok('POST vente/{id}/annuler : annulée (annulee:true, date), stock rendu', c1.success === true && c1.annulee === true && !!c1.dtAnnulation && stock() === 100, JSON.stringify(c1).slice(0, 160));
    const c2 = await api('POST', '../api/v1/vente/' + v3 + '/annuler', null, { 'X-Client-Ref': 'E2E-ANN-1' });
    ok('Même X-Client-Ref rejoué : même réponse, rien refait', c2.success === true && c2.dtAnnulation === c1.dtAnnulation && copies(v3) === 1 && stock() === 100, JSON.stringify(c2).slice(0, 160));
    const c3 = await api('POST', '../api/v1/vente/' + v3 + '/annuler', null, { 'X-Client-Ref': 'E2E-ANN-2' });
    ok('Autre X-Client-Ref sur une vente annulée : code ETAT', c3.success === false && c3.code === 'ETAT' && copies(v3) === 1, JSON.stringify(c3).slice(0, 160));
    const c4 = await api('GET', '../api/v1/vente/zzz-inconnue/annuler');
    ok('GET sur la route POST : refusée (405), rien annulé', c4.http === 405, c4.http);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, stock remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'") === stockOrigine[0]);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
