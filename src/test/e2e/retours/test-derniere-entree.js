/* FICHE ARTICLE : « Dern. entrée » (retours du 10/10, lot 1 ; reponse Q2).
 *
 * Avant : la date affichee etait la date du BL (dt_DATE_LIVRAISON), BL non entres en stock compris.
 * Attendu, sur l'apercu (double clic sur la ligne de la fiche article) et sur l'info produit :
 *  - « Dern. entrée » = date de MISE EN STOCK (mouvement « entree en stock » de la ligne du BL), BL entres en stock seulement ;
 *  - la date du BL a cote, en second (« BL du ... »), avec la quantite recue et le grossiste ;
 *  - un BL non entre en stock, meme plus recent, est ignore ;
 *  - sans mouvement (donnees anciennes) : date de cloture du BL ;
 *  - article sans aucune entree : « aucune entrée en stock ».
 * Jeu d'essai (3 BL, lignes, mouvement) retire a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* Produit d'essai JAMAIS recu en BL : le banc peuple sur 3 ans n'en a plus aucun ; il est copie d'un produit existant
   (fiche, stock, grossiste) sous un identifiant et un CIP d'essai, puis retire a la fin. */
const MODELE = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + " AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 1");
const P = 'E2E-DE-PRODUIT', CIP = '9E2EDE1';
function creerProduit() {
  exec("CREATE TEMPORARY TABLE e2e_de_f AS SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '" + MODELE + "';"
    + "UPDATE e2e_de_f SET lg_FAMILLE_ID = '" + P + "', int_CIP = '" + CIP + "', str_NAME = CONCAT('ZZE2E ', str_NAME), str_DESCRIPTION = CONCAT('ZZE2E ', str_DESCRIPTION);"
    + "INSERT INTO t_famille SELECT * FROM e2e_de_f;"
    + "CREATE TEMPORARY TABLE e2e_de_s AS SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + MODELE + "' AND lg_EMPLACEMENT_ID = '1';"
    + "UPDATE e2e_de_s SET lg_FAMILLE_STOCK_ID = 'E2E-DE-STOCK', lg_FAMILLE_ID = '" + P + "';"
    + "INSERT INTO t_famille_stock SELECT * FROM e2e_de_s;"
    + "CREATE TEMPORARY TABLE e2e_de_g AS SELECT * FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + MODELE + "' LIMIT 1;"
    + "UPDATE e2e_de_g SET lg_FAMILLE_GROSSISTE_ID = 'E2E-DE-GROS', lg_FAMILLE_ID = '" + P + "', str_CODE_ARTICLE = '" + CIP + "';"
    + "INSERT INTO t_famille_grossiste SELECT * FROM e2e_de_g;");
}
function retirerProduit() {
  exec("SET FOREIGN_KEY_CHECKS = 0; DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_ID = '" + P + "'; DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '" + P + "';"
    + " DELETE FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'; SET FOREIGN_KEY_CHECKS = 1;");
}
const [G, GNOM] = q("SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste ORDER BY str_LIBELLE LIMIT 1").split('\t');
const ORDER = q("SELECT lg_ORDER_ID FROM t_order LIMIT 1");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");

/* dates relatives au jour du test : A il y a deux mois, C il y a trois mois, B dans le mois en cours (entrees du mois) */
const MOIS = (decalage, jour, hm) => { const j = new Date(), d = new Date(j.getFullYear(), j.getMonth() + decalage, jour);
  const fr = String(jour).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  return { sql: fr.split('/').reverse().join('-') + ' ' + hm + ':00', fr, frh: fr + ' ' + hm }; };
const A_BL = MOIS(-2, 1, '00:00'), A_STOCK = MOIS(-2, 3, '09:15'), A_CLOS = MOIS(-2, 20, '10:00');
const B_BL = MOIS(0, 1, '00:00'), B_MAJ = MOIS(0, 1, '00:05'), B_STOCK = MOIS(0, 1, '00:30');
const C_BL = MOIS(-3, 10, '00:00'), C_CLOS = MOIS(-3, 12, '08:00');

function nettoyer() {
  exec("SET FOREIGN_KEY_CHECKS = 0; DELETE FROM hmvtproduit WHERE uuid LIKE 'E2E-DE-%'; DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE 'E2E-DE-%';"
    + " DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-DE-%'; SET FOREIGN_KEY_CHECKS = 1;");
}
function bl(id, statut, dateBl, cloture, qte) {
  return "INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)"
    + " VALUES ('E2E-DE-" + id + "', 'E2EDE" + id + "', '" + dateBl + "', 0, 0, 0, '" + ORDER + "', '" + statut + "', '" + dateBl + "', '" + cloture + "', '" + ADMIN + "');"
    + "INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_RECUE, int_QTE_UG, int_PAF, int_PRIX_VENTE, prixTarif, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('E2E-DE-L" + id + "', '" + G + "', '" + P + "', 'E2E-DE-" + id + "', " + qte + ", " + qte + ", 0, 100, 200, 100, '1', '" + statut + "', '" + dateBl + "', '" + cloture + "');";
}

(async () => {
  nettoyer();
  retirerProduit();
  creerProduit();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, CIP);
    await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });

    /* apercu par double clic sur la ligne, texte lu dans le bandeau */
    const apercu = async () => {
      await p.evaluate(() => { const b = Ext.getCmp('apercu_fiche_article'); b.hide(); b.produitAffiche = null; b.update(''); });
      await p.waitForTimeout(400);
      /* la ligne est retrouvee a chaque essai : un marquage du DOM disparait quand la grille se redessine */
      await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0], n = g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', P));
        return n && n.offsetParent !== null; }, P, { timeout: 90000 });
      const centre = await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0], n = g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', P));
        const td = Array.from(n.querySelectorAll('td')).filter((c) => c.offsetWidth > 0)[2], r = td.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, P);
      await p.mouse.dblclick(centre.x, centre.y);
      await p.waitForFunction(() => { const b = Ext.getCmp('apercu_fiche_article'); return b.isVisible() && /entr/i.test(b.getEl().dom.textContent); }, null, { timeout: 20000 });
      return p.evaluate(() => Ext.getCmp('apercu_fiche_article').getEl().dom.textContent.replace(/\s+/g, ' '));
    };
    const reappro = async () => JSON.parse(await p.evaluate(async (P) => (await fetch('../api/v1/commande/produit/reappro-infos/' + P)).text(), P));
    const info = async () => JSON.parse(await p.evaluate(async (P) => (await fetch('../api/v1/produit-search/fiche?produitId=' + P)).text(), P)).results[0].dt_LAST_ENTREE;

    let t = await apercu();
    ok('Article sans entrée : « Dern. entrée » — aucune entrée en stock', /Dern\. entrée\s*aucune entrée en stock/.test(t), t.slice(0, 300));

    /* A (il y a deux mois) : entre en stock le 3 a 09:15 (BL du 1er), BL retouche ensuite le 20 ;
       B : BL du 1er du mois en cours NON entre en stock ; C (il y a trois mois) : ancien BL du 10 clos le 12 sans mouvement */
    exec(bl('A', 'is_Closed', A_BL.sql, A_CLOS.sql, 5) + bl('B', 'is_Process', B_BL.sql, B_MAJ.sql, 9)
      + bl('C', 'is_Closed', C_BL.sql, C_CLOS.sql, 3)
      + "INSERT INTO hmvtproduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt)"
      + " VALUES ('E2E-DE-H', 1, '" + A_STOCK.sql + "', '" + A_STOCK.sql.slice(0, 10) + "', 'E2E-DE-LA', 100, 200, 0, 5, 5, 0, '1', '" + P + "', '" + ADMIN + "', '01')");
    t = await apercu();
    ok('Dern. entrée = date de mise en stock ' + A_STOCK.frh + ' (pas la date du BL non entré du ' + B_BL.fr + ')', new RegExp('Dern\\. entrée\\s*' + A_STOCK.frh).test(t) && t.indexOf(B_BL.fr) < 0, t.slice(0, 400));
    ok('À côté : 5 u., grossiste « ' + GNOM + ' », « BL du ' + A_BL.fr + ' »', t.indexOf(A_STOCK.frh + ' 5 u. · ' + GNOM + ' · BL du ' + A_BL.fr) >= 0, t.slice(0, 400));
    const achats = JSON.parse(await p.evaluate(async (P) => (await fetch('../api/v1/produit-search/apercu/' + P)).text(), P)).achatsTotal;
    ok('Achats de l\'aperçu : BL entrés en stock seulement (5 + 3 = 8, sans les 9 du BL non entré)', achats === 8 && /Achats\s*8/.test(t), 'achatsTotal=' + achats);
    let ra = await reappro();
    ok('Suggestion, info produit : Dern.Entrée ' + A_STOCK.frh + ' (5), le BL non entré du mois ne compte pas dans les entrées du mois', ra.derniereEntreeDate === A_STOCK.frh && ra.derniereEntreeQte === 5 && ra.qteEntreeMois === 0 && ra.frequenceAchatMois === 0, JSON.stringify(ra));
    ok('Info produit (fiche) : même date de dernière entrée', (await info()) === A_STOCK.frh, await info());

    /* sans mouvement (donnees anciennes) : date de cloture du BL */
    exec("DELETE FROM hmvtproduit WHERE uuid = 'E2E-DE-H'");
    t = await apercu();
    ok('Sans mouvement d\'entrée : date de clôture du BL (' + A_CLOS.frh + '), BL du ' + A_BL.fr, new RegExp('Dern\\. entrée\\s*' + A_CLOS.frh + ' 5 u\\. · .* · BL du ' + A_BL.fr).test(t), t.slice(0, 400));
    ok('Info produit : ' + A_CLOS.frh, (await info()) === A_CLOS.frh, await info());

    /* le BL B entre en stock : il devient la derniere entree */
    exec("UPDATE t_bon_livraison SET str_STATUT = 'is_Closed', dt_UPDATED = '" + B_STOCK.sql + "' WHERE lg_BON_LIVRAISON_ID = 'E2E-DE-B'");
    t = await apercu();
    ok('BL du ' + B_BL.fr + ' entré en stock : Dern. entrée ' + B_STOCK.frh + ', 9 u., BL du ' + B_BL.fr, new RegExp('Dern\\. entrée\\s*' + B_STOCK.frh + ' 9 u\\. · .* · BL du ' + B_BL.fr).test(t), t.slice(0, 400));
    ra = await reappro();
    ok('Suggestion, info produit : Dern.Entrée ' + B_STOCK.frh + ' (9), entrées du mois 9 sur 1 BL', ra.derniereEntreeDate === B_STOCK.frh && ra.derniereEntreeQte === 9 && ra.qteEntreeMois === 9 && ra.frequenceAchatMois === 1, JSON.stringify(ra));
    ok('Suggestion : libellé « Dern.Entrée »', await p.evaluate(async () => /abr\('Dern\.Entrée'/.test(await (await fetch('app/view/sm_user/suggerercde/SuggerercdeManager.js?_=' + Date.now())).text())));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    retirerProduit();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "') + (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-DE-%') + (SELECT COUNT(*) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE 'E2E-DE-%') + (SELECT COUNT(*) FROM hmvtproduit WHERE uuid LIKE 'E2E-DE-%')") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
