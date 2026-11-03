/* Audit 05 PR-01, promotions appliquees a la vente au comptant seulement, par l'ecran de vente (clics de l'utilisateur).
 * Decision du 03/11 : promotion au comptant uniquement, jamais en assurance ; sur une ligne en promotion, la remise
 * client ne s'ajoute pas (« promotion seule »), elle reste sur les autres lignes.
 * Parcours : SERVICE CLIENT > Ventes > nouvelle vente au comptant ; trois articles scannes :
 *  - P en PRIX SPECIAL en cours : prix promotionnel sur la ligne, mention « PROMOTION » dans la grille ;
 *  - T dans une promotion a venir : prix public (une promotion qui n'a pas commence ne s'applique pas) ;
 *  - U en UNITES GRATUITES (1 offerte a partir de 2) : quantite 3 saisie dans la grille, 2 payees, « dont 1 offerte » ;
 *  - remise client choisie dans les listes : rien sur P ni U, la remise sur T ;
 *  - type de vente passe en assurance : P et U reviennent au prix public, total recharge a l'ecran.
 * Donnees : promotions d'essai, codes remise des trois produits, vente d'essai et stock, tout retire a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-promotion-vente.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* une remise client active avec une grille VNO de taux > 0, et le code remise article qui y mene */
const [REMISE, NOM_REMISE, TYPE_REMISE, CODE] = q("SELECT r.lg_REMISE_ID, r.str_NAME, tr.str_DESCRIPTION, w.str_CODE_REMISE_ARTICLE FROM t_remise r"
  + " JOIN t_type_remise tr ON tr.lg_TYPE_REMISE_ID = r.lg_TYPE_REMISE_ID"
  + " JOIN t_grille_remise g ON g.lg_REMISE_ID = r.lg_REMISE_ID AND g.str_STATUT = 'enable' AND g.dbl_TAUX > 0"
  + " JOIN t_workflow_remise_article w ON w.str_CODE_GRILLE_VNO = g.str_CODE_GRILLE AND w.str_STATUT = 'enable'"
  + " WHERE r.str_STATUT = 'enable' AND w.str_CODE_REMISE_ARTICLE NOT IN ('2', '3') ORDER BY r.str_NAME LIMIT 1").split('\t');
/* trois produits en stock, hors promotion, prix public >= 1000, non deconditionnes */
const produits = q("SELECT GROUP_CONCAT(CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.int_PRICE, IFNULL(f.str_CODE_REMISE, 'NULL'),"
  + " IFNULL(f.bl_PROMOTED + 0, 'NULL'), s.int_NUMBER_AVAILABLE, s.int_NUMBER) SEPARATOR ';') FROM (SELECT f.* FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE >= 1000 AND s.int_NUMBER_AVAILABLE > 20 AND LENGTH(f.int_CIP) = 7"
  + " AND IFNULL(f.bool_DECONDITIONNE, 0) = 0"
  + " AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.int_CIP DESC LIMIT 3 OFFSET 7) f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'")
  .split(';').map((x) => { const [id, cip, prix, code, drapeau, dispo, total] = x.split('|'); return { id, cip, prix: Number(prix), code, drapeau, dispo, total }; });
const [P, T, U] = produits;
const NOM_ASSURANCE = q("SELECT str_NAME FROM t_type_vente WHERE lg_TYPE_VENTE_ID = '2'");
const ids = [];
const ventes = [];

const promo = (type, debut, fin) => Number(q(`INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE)`
  + ` VALUES ('${type}', CURDATE() + INTERVAL ${debut} DAY, CURDATE() + INTERVAL ${fin} DAY); SELECT LAST_INSERT_ID();`));
const produitPromo = (promotion, f, prix, seuil, offertes) => q(`INSERT INTO t_promotion_product (int_DISCOUNT, bl_MODE, int_PACK_NUMBER, db_PRICE,`
  + ` int_ACTIVE_AT, dt_PROMOTED_DATE, lg_FAMILLE_ID, lg_CODE_PROMOTION_ID) VALUES (0, 0, ${offertes}, ${prix}, ${seuil}, NOW(), '${f.id}', ${promotion});`
  + ` UPDATE t_famille SET bl_PROMOTED = 1 WHERE lg_FAMILLE_ID = '${f.id}'`);
function poser() {
  ids.push(promo('PRIX SPECIAL', -2, 5)); produitPromo(ids[0], P, P.prix - 100, 0, 0);
  ids.push(promo('PRIX SPECIAL', 3, 10)); produitPromo(ids[1], T, T.prix - 100, 0, 0);
  ids.push(promo('UNITES GRATUITES', -2, 5)); produitPromo(ids[2], U, U.prix, 2, 1);
  q(`UPDATE t_famille SET str_CODE_REMISE = '${CODE}' WHERE lg_FAMILLE_ID IN ('${P.id}', '${T.id}', '${U.id}')`);
}
function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  }
  const liste = ids.join(',') || '0';
  q(`DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${liste}); DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${liste})`);
  for (const f of produits) {
    q(`UPDATE t_famille SET bl_PROMOTED = ${f.drapeau}, str_CODE_REMISE = ${f.code === 'NULL' ? 'NULL' : "'" + f.code + "'"} WHERE lg_FAMILLE_ID = '${f.id}';`
      + ` UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${f.dispo}, int_NUMBER = ${f.total} WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '${f.id}'`);
  }
}
const ligne = (v, f) => q(`SELECT CONCAT_WS(' ', int_QUANTITY, int_PRICE_UNITAIR, int_PRICE, IFNULL(int_FREE_PACK_NUMBER, 0), IFNULL(int_PRICE_REMISE, 0),`
  + ` IFNULL(promotion_produit_id, 'NULL')) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v}' AND lg_FAMILLE_ID = '${f.id}'`).split(' ');

(async () => {
  ok('Jeu d\'essai : une remise client et trois produits', !!REMISE && produits.length === 3 && !!U && !!NOM_ASSURANCE,
    NOM_REMISE + ' / ' + produits.map((f) => f.cip + ' ' + f.prix).join(', '));
  try { poser(); } catch (e) { nettoyer(); throw e; }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const scanner = async (cip) => {
    const CHAMP = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await cliquer(p, CHAMP);
    await p.keyboard.type(cip, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(1500);
  };
  const grille = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('doventemanager gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
    return g ? g.getEl().dom.innerText.replace(/\s+/g, ' ') : ''; });
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await p.waitForTimeout(1500);

    await scanner(P.cip);
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    await scanner(T.cip);
    await scanner(U.cip);

    const lp = ligne(vente, P);
    ok('PRIX SPECIAL en cours : prix promotionnel décidé par le serveur, ligne marquée',
      Number(lp[1]) === P.prix - 100 && Number(lp[2]) === P.prix - 100 && lp[5] !== 'NULL', lp.join(' ') + ' (public ' + P.prix + ')');
    const lt = ligne(vente, T);
    ok('Promotion à venir : prix public', Number(lt[1]) === T.prix && lt[5] === 'NULL', lt.join(' '));

    /* QD de la ligne U : vrai clic sur la cellule, 3, Entree */
    const cellule = await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('doventemanager gridpanel').filter((x) => x.isVisible(true) && x.getStore().getCount() > 0)[0];
      const r = g.getStore().findRecord('intCIP', cip); const col = g.columns.filter((c) => c.dataIndex === 'intQUANTITY')[0];
      const c = g.getView().getCell(r, col); c.dom.id = c.dom.id || 'e2e-qd-u'; return c.dom.id; }, U.cip);
    await p.click('#' + cellule);
    await p.waitForTimeout(500);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('3', { delay: 40 });
    await p.keyboard.press('Enter');
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2000);
    const lu = ligne(vente, U);
    ok('UNITES GRATUITES (1 offerte à partir de 2) : 3 boîtes, 2 payées', lu[0] === '3' && Number(lu[2]) === 2 * U.prix && lu[3] === '1' && lu[5] !== 'NULL', lu.join(' '));
    const texte = await grille();
    ok('Grille : mention PROMOTION et « dont 1 offerte(s) »', /PROMOTION/.test(texte) && /dont 1 offerte/.test(texte), texte.slice(0, 300));
    const total = await p.evaluate(() => testextjs.app.getController('VenteCtr').getTotalField().getValue());
    const attendu = (P.prix - 100) + T.prix + 2 * U.prix;
    ok('Total de la vente affiché', Number(String(total).replace(/\D/g, '')) === attendu
      && Number(q(`SELECT int_PRICE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${vente}'`)) === attendu, total + ' / ' + attendu);

    /* remise client : type puis remise, choisis dans les listes */
    await choisir(p, 'doventemanager #contenu [xtype=container] #typeRemise', TYPE_REMISE);
    await p.waitForTimeout(500);
    await choisir(p, 'doventemanager #contenu [xtype=container] #remise', NOM_REMISE);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2000);
    const rp = ligne(vente, P)[4], rt = ligne(vente, T)[4], ru = ligne(vente, U)[4];
    ok('Remise client : rien sur les lignes en promotion, la remise sur la ligne sans promotion', rp === '0' && ru === '0' && Number(rt) > 0,
      'P=' + rp + ' U=' + ru + ' T=' + rt);

    /* passage en assurance par la liste du type de vente */
    await choisir(p, 'doventemanager #typeVente', NOM_ASSURANCE);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2500);
    const ap = ligne(vente, P), au = ligne(vente, U);
    ok('Vente passée en assurance : prix public, plus de promotion ni d\'unité offerte',
      Number(ap[1]) === P.prix && ap[5] === 'NULL' && Number(au[2]) === 3 * U.prix && au[3] === '0' && au[5] === 'NULL', ap.join(' ') + ' | ' + au.join(' '));
    const attenduVo = P.prix + T.prix + 3 * U.prix;
    const totalVo = await p.evaluate(() => testextjs.app.getController('VenteCtr').getTotalField().getValue());
    ok('Total rechargé à l\'écran après le passage en assurance', Number(String(totalVo).replace(/\D/g, '')) === attenduVo
      && !/PROMOTION/.test(await grille()), totalVo + ' / ' + attenduVo);
    const msg = await texteMessage(p);
    if (msg) { await repondre(p, 'ok').catch(() => {}); }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées', ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0')
      && q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${ids.join(',') || 0})`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
