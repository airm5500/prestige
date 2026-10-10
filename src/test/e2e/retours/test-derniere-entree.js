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
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 360) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const [P, CIP] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0 AND f.int_CIP IS NOT NULL AND f.int_CIP <> ''"
  + " AND NOT EXISTS (SELECT 1 FROM t_bon_livraison_detail d WHERE d.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " AND EXISTS (SELECT 1 FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID) ORDER BY f.int_CIP LIMIT 1").split('\t');
const [G, GNOM] = q("SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste ORDER BY str_LIBELLE LIMIT 1").split('\t');
const ORDER = q("SELECT lg_ORDER_ID FROM t_order LIMIT 1");
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");

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
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
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
      await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', P)).setAttribute('data-e2e', 'ligne'); }, P);
      await p.locator('[data-e2e=ligne] td').filter({ visible: true }).nth(2).dblclick();
      await p.waitForFunction(() => { const b = Ext.getCmp('apercu_fiche_article'); return b.isVisible() && /entr/i.test(b.getEl().dom.textContent); }, null, { timeout: 20000 });
      return p.evaluate(() => Ext.getCmp('apercu_fiche_article').getEl().dom.textContent.replace(/\s+/g, ' '));
    };
    const info = async () => JSON.parse(await p.evaluate(async (P) => (await fetch('../api/v1/produit-search/fiche?produitId=' + P)).text(), P)).results[0].dt_LAST_ENTREE;

    let t = await apercu();
    ok('Article sans entrée : « Dern. entrée » — aucune entrée en stock', /Dern\. entrée\s*aucune entrée en stock/.test(t), t.slice(0, 300));

    /* A : entre en stock le 03/09 a 09:15 (BL du 01/09), BL retouche ensuite le 20/09 ;
       B : BL du 05/10 NON entre en stock ; C : ancien BL du 10/08 clos le 12/08 sans mouvement */
    exec(bl('A', 'is_Closed', '2026-09-01 00:00:00', '2026-09-20 10:00:00', 5) + bl('B', 'is_Process', '2026-10-05 00:00:00', '2026-10-05 08:00:00', 9)
      + bl('C', 'is_Closed', '2026-08-10 00:00:00', '2026-08-12 08:00:00', 3)
      + "INSERT INTO hmvtproduit (uuid, checked, createdAt, mvtdate, pkey, prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID, lg_USER_ID, typeMvt)"
      + " VALUES ('E2E-DE-H', 1, '2026-09-03 09:15:00', '2026-09-03', 'E2E-DE-LA', 100, 200, 0, 5, 5, 0, '1', '" + P + "', '" + ADMIN + "', '01')");
    t = await apercu();
    ok('Dern. entrée = date de mise en stock 03/09/2026 09:15 (pas la date du BL non entré du 05/10)', /Dern\. entrée\s*03\/09\/2026 09:15/.test(t) && !/05\/10\/2026/.test(t), t.slice(0, 400));
    ok('À côté : 5 u., grossiste « ' + GNOM + ' », « BL du 01/09/2026 »', t.indexOf('03/09/2026 09:15 5 u. · ' + GNOM + ' · BL du 01/09/2026') >= 0, t.slice(0, 400));
    const achats = JSON.parse(await p.evaluate(async (P) => (await fetch('../api/v1/produit-search/apercu/' + P)).text(), P)).achatsTotal;
    ok('Achats de l\'aperçu : BL entrés en stock seulement (5 + 3 = 8, sans les 9 du BL non entré)', achats === 8 && /Achats\s*8/.test(t), 'achatsTotal=' + achats);
    ok('Info produit (fiche) : même date de dernière entrée', (await info()) === '03/09/2026 09:15', await info());

    /* sans mouvement (donnees anciennes) : date de cloture du BL */
    exec("DELETE FROM hmvtproduit WHERE uuid = 'E2E-DE-H'");
    t = await apercu();
    ok('Sans mouvement d\'entrée : date de clôture du BL (20/09/2026 10:00), BL du 01/09/2026', /Dern\. entrée\s*20\/09\/2026 10:00 5 u\. · .* · BL du 01\/09\/2026/.test(t), t.slice(0, 400));
    ok('Info produit : 20/09/2026 10:00', (await info()) === '20/09/2026 10:00', await info());

    /* le BL B entre en stock : il devient la derniere entree */
    exec("UPDATE t_bon_livraison SET str_STATUT = 'is_Closed', dt_UPDATED = '2026-10-06 11:30:00' WHERE lg_BON_LIVRAISON_ID = 'E2E-DE-B'");
    t = await apercu();
    ok('BL du 05/10 entré en stock le 06/10 : Dern. entrée 06/10/2026 11:30, 9 u., BL du 05/10/2026', /Dern\. entrée\s*06\/10\/2026 11:30 9 u\. · .* · BL du 05\/10\/2026/.test(t), t.slice(0, 400));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-DE-%') + (SELECT COUNT(*) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE 'E2E-DE-%') + (SELECT COUNT(*) FROM hmvtproduit WHERE uuid LIKE 'E2E-DE-%')") === '0');
    const n = res.filter((r) => r.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
