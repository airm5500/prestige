/* RETOURS DU 10/10/2026 — LOT 1 : DEFAUTS. Chaque defaut est reproduit puis verifie corrige.
 *  10. Ventes terminees : vente commencee en « Prescription », cloturee en « Conseil » -> enregistree Conseil et
 *      retrouvee par le filtre nature = Conseil (avant : restait Prescription) ; la nature « depot » n'est jamais
 *      posee par une vente au comptant.
 * Tout ce que le test cree est retire (ventes, reglements, mouvements, stock remis).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const LOGIN = process.env.E2E_LOGIN || 'admin';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + LOGIN + "'");
const DEBUT = q("SELECT NOW() - INTERVAL 1 SECOND");
const CAISSE = 'e2e-l1-caisse';
let produit = null, stockOrigine = null, caisseCreee = false;

const ventesDuTest = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement"
  + " WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventesDuTest();
  exec("CREATE TEMPORARY TABLE e2e_l1_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_l1_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM t_fidelite_mouvement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM annulation_recette WHERE preenregistrement_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_l1_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_l1_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_l1_l; DROP TEMPORARY TABLE IF EXISTS e2e_l1_r;");
  if (produit && stockOrigine !== null) {
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = " + stockOrigine[0] + ", int_NUMBER = " + stockOrigine[1] + " WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
  }
  if (caisseCreee) {
    exec("DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '" + CAISSE + "'");
  }
}

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 200 AND 5000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q("SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'").split('|');
  exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '" + produit.id + "' AND lg_EMPLACEMENT_ID = '1'");
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
  const nouvelleVente = async (nature) => {
    const r = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: nature, produitId: produit.id, itemPu: produit.pu, qte: 1, qteServie: 1,
      devis: false, prevente: false, remiseId: '', userVendeurId: ADMIN });
    return r.data ? r.data.lgPREENREGISTREMENTID : null;
  };
  const cloturer = async (venteId, nature) => {
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
    const data = net.data || {};
    const m = data.montantNet;
    return api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: nature, devis: false, remiseId: '', userVendeurId: ADMIN,
      montantRecu: m, montantRemis: 0, montantPaye: m, totalRecap: m, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant: m, montantAttentu: m }] });
  };
  const nature = (v) => q("SELECT lg_NATURE_VENTE_ID FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1000);
    const jour = q('SELECT CURDATE()');

    /* 10. nature de vente choisie apres le premier produit */
    const v1 = await nouvelleVente('1');
    ok('10. Précondition : vente commencée en Prescription', nature(v1) === '1');
    const c1 = await cloturer(v1, '2');
    ok('10. Clôturée avec la nature Conseil : enregistrée Conseil', c1.success === true && nature(v1) === '2', JSON.stringify(c1).slice(0, 150) + ' nature=' + nature(v1));
    const liste = await api('GET', '../api/v1/ventestats?start=0&limit=200&dtStart=' + jour + '&dtEnd=' + jour + '&hStart=00:00&hEnd=23:59&nature=2&query=');
    ok('10. Ventes terminées, filtre Conseil : la vente est listée', (liste.data || []).some((x) => x.lgPREENREGISTREMENTID === v1), 'total=' + liste.total);
    const liste1 = await api('GET', '../api/v1/ventestats?start=0&limit=200&dtStart=' + jour + '&dtEnd=' + jour + '&hStart=00:00&hEnd=23:59&nature=1&query=');
    ok('10. Filtre Prescription : la vente Conseil n\'y est plus', !(liste1.data || []).some((x) => x.lgPREENREGISTREMENTID === v1));
    const v2 = await nouvelleVente('1');
    const c2 = await cloturer(v2, '3');
    ok('10. Nature « dépôt » envoyée par une vente au comptant : ignorée (reste Prescription)', c2.success === true && nature(v2) === '1', 'nature=' + nature(v2));
    const v3 = await nouvelleVente('2');
    const c3 = await cloturer(v3, '');
    ok('10. Sans nature à la clôture : celle du premier produit est gardée (Conseil)', c3.success === true && nature(v3) === '2', 'nature=' + nature(v3));

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + ' OK');
    process.exit(n === res.length ? 0 : 1);
  }
})();
