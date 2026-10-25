/* DECISION 12 DU PHARMACIEN (15/10, confirmee le 19/10) : RECEPTION BL MOBILE.
 *
 *  a) « Valider avec ecart » : la validation est REFUSEE tant que des lignes ne sont pas saisies, avec un message
 *     qui nomme les produits manquants (« Produits non saisis : … »). Une ligne commencee mais incomplete est
 *     refusee de la meme facon (avant : message general sans les produits).
 *  b) P_BL_MOBILE_SCANNER sur add-lot et creerbl, donne a tous les profils qui ont un menu de saisie des BL (rien
 *     n'est bloque au poste) : sans le droit, 403 interdit et rien d'enregistre ; avec, la saisie passe.
 * Un BL d'essai (deux lignes) est pose en base ; rien n'est valide (pas d'entree en stock). Tout est retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-D12-', REF = 'E2E-D12-BL1';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const PRODUITS = q("SELECT GROUP_CONCAT(x.id SEPARATOR '|') FROM (SELECT f.lg_FAMILLE_ID id FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 11) x").split('|');
const NOMS = PRODUITS.map((id) => q(`SELECT str_NAME FROM t_famille WHERE lg_FAMILLE_ID = '${id}'`));
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const scanner = require('../support/privilege-essai')(q, exec, ENV_E2E.LOGIN, 'P_BL_MOBILE_SCANNER');

function retirer() {
  exec(`DELETE FROM mobile_client_ref WHERE ref LIKE 'e2e-d12-%';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_order WHERE lg_ORDER_ID = '${M}C1';`);
}
function poser() {
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${M}C1', '${M}C1', 2, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);
    INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)
    VALUES ('${M}B1', '${REF}', CURDATE(), 15000, 0, 15000, '${M}C1', 'enable', NOW(), NOW(), '${ADMIN}', 0);`
    + PRODUITS.map((id, i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)
    SELECT '${M}D${i + 1}', '${G}', '${id}', '${M}B1', ${i ? 5 : 10}, 0, 0, 1000, 1500, 1000, 'enable', NOW(), NOW(), 0, 0, 0, f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.lg_FAMILLE_ID = '${id}';`).join(''));
}

(async () => {
  scanner.remettre();
  retirer();
  try { poser(); } catch (e) { retirer(); throw e; }
  const peremption = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 2 YEAR, '%Y-%m-%d')");
  const b = await ENV_E2E.lancer(chromium);
  let p;
  const connecter = async () => {
    p = await (await b.newContext()).newPage();
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
  };
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
  const lot = (d, qty, num) => api('POST', '../api/v1/commande/add-lot', { idBonDetail: M + d, qty, freeQty: 0, numLot: num, datePeremption: peremption });
  const lots = () => q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'`);
  try {
    await connecter();
    /* a) une ligne commencee (3 sur 10), l'autre pas commencee */
    const l1 = await lot('D1', 3, 'E2ED12A');
    ok('Saisie d\'un lot (avec le droit) : acceptée', l1.status === 200 && lots() === '1', JSON.stringify(l1));
    const v1 = await api('PUT', '../api/v1/commande/validerbl/' + M + 'B1');
    ok('Validation, ligne incomplète : refusée, « Produits non saisis » nomme le produit', v1.j && v1.j.success === false
      && /Produits non saisis/.test(v1.j.msg) && v1.j.msg.includes(NOMS[0]) && !v1.j.msg.includes(NOMS[1]), JSON.stringify(v1.j));
    const v2 = await api('PUT', '../api/v1/commande/validerbl/' + M + 'B1?avecEcart=true');
    ok('« Valider avec écart » : refusé, les deux produits nommés (incomplet et non saisi)', v2.j && v2.j.success === false
      && /Produits non saisis/.test(v2.j.msg) && v2.j.msg.includes(NOMS[0]) && v2.j.msg.includes(NOMS[1]), JSON.stringify(v2.j));
    ok('Rien n\'est entré en stock', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1'`) === 'enable');

    /* b) sans P_BL_MOBILE_SCANNER */
    scanner.retirer();
    await connecter();
    const l2 = await lot('D2', 1, 'E2ED12B');
    ok('Sans P_BL_MOBILE_SCANNER : add-lot 403 interdit, aucun lot', l2.status === 403 && l2.j && l2.j.interdit === true && lots() === '1', JSON.stringify(l2));
    const c1 = await api('POST', '../api/v1/commande/creerbl', { ref: M + 'C1', refExt: 'E2E-D12-X' });
    ok('Sans P_BL_MOBILE_SCANNER : creerbl 403 interdit', c1.status === 403 && c1.j && c1.j.interdit === true, JSON.stringify(c1));
    scanner.remettre();
    await connecter();
    const droits = await api('GET', '../api/v1/user/droits');
    ok('Droit rendu : user/droits contient P_BL_MOBILE_SCANNER', JSON.stringify(droits.j || {}).includes('P_BL_MOBILE_SCANNER'));
    const sans = q("SELECT COUNT(DISTINCT rp.lg_ROLE_ID) FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE p.str_NAME IN ('P_SM_BL', 'P_SM_COMMANDE_PROCESS', 'P_SM_FAMILLE', 'P_SM_ETAT_STOCK', 'P_ENTREE_EN_STOCK') AND NOT EXISTS (SELECT 1 FROM t_role_privelege x"
      + " JOIN t_privilege s ON s.lg_PRIVELEGE_ID = x.lg_PRIVILEGE_ID AND s.str_NAME = 'P_BL_MOBILE_SCANNER' WHERE x.lg_ROLE_ID = rp.lg_ROLE_ID)");
    ok('Tous les profils des menus de saisie des BL ont P_BL_MOBILE_SCANNER (rien de bloqué au poste)', sans === '0', sans + ' rôle(s) sans');
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    scanner.remettre();
    retirer();
    ok('Jeu d\'essai retiré', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1'`) === '0' && lots() === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
