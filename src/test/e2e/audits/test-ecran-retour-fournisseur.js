/* Audit 06, retour fournisseur, par l'ecran « Retours fournisseurs » (clics de l'utilisateur) :
 *  - RF-02 : deux grossistes ont un BL de meme numero ; le retour fait sur le BL choisi (grossiste 1) est rattache a ce
 *    BL et a ce grossiste, pas au BL le plus recent portant ce numero ;
 *  - RF-04 : un retour rouvert par « Ouvrir le retour » montre ses lignes, et « Ajouter » complete ce retour au lieu d'en
 *    creer un second ;
 *  - RF-03 : un nouveau retour sur la meme ligne de BL ne depasse pas la quantite recue, retours deja faits compris.
 * Donnees d'essai (prefixe E2E-RF-) retirees a la fin ; aucun retour n'est valide, le stock ne bouge pas.
 * Lancement seul : node src/test/e2e/audits/test-ecran-retour-fournisseur.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-RF-';
const REF = 'E2ERF' + String(Date.now()).slice(-5);
const RECU = 6;
const [P, CIP, G1] = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.lg_GROSSISTE_ID) FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_PAF > 0 AND f.int_PRICE > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 10 AND 50"
  + " AND f.lg_GROSSISTE_ID IS NOT NULL AND LENGTH(f.int_CIP) >= 6 ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 7").split('|');
const G2 = q(`SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID <> '${G1}' ORDER BY lg_GROSSISTE_ID LIMIT 1`);
const LIB1 = q(`SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '${G1}'`);
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const BLS = [M + 'BLX', M + 'BLY'];
const liste = (a) => a.map((x) => `'${x}'`).join(',');

function retirer() {
  const rets = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID IN (${liste(BLS)})`
    + ` OR lg_RETOUR_FRS_ID IN (SELECT d.lg_RETOUR_FRS_ID FROM t_retour_fournisseur_detail d WHERE d.bonLivraisonDetail_id IN (${liste(BLS.map((b) => b + '-D'))}))`);
  exec(`DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${rets}); DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${rets});`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${liste(BLS)}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${liste(BLS)});`
    + `DELETE FROM t_order WHERE lg_ORDER_ID IN ('${M}OX', '${M}OY');`);
}
/* BL entre en stock (is_Closed), une ligne du produit : RECU boites recues */
function bon(x, g, decalage) {
  const [paf, prix, zone] = q(`SELECT CONCAT_WS('|', int_PAF, int_PRICE, IFNULL(lg_ZONE_GEO_ID, '')) FROM t_famille WHERE lg_FAMILLE_ID = '${P}'`).split('|');
  const o = M + 'O' + x, b = M + 'BL' + x, quand = `NOW() - INTERVAL ${decalage} HOUR`;
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` VALUES ('${o}', '${o}', 1, '${g}', '${ADMIN}', 'is_Closed', ${quand}, ${quand}, 0, 0, 0);`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` VALUES ('${b}', '${REF}', ${quand}, ${RECU * paf}, 0, ${RECU * paf}, '${o}', 'is_Closed', ${quand}, ${quand}, '${ADMIN}');`
    + `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT)`
    + ` VALUES ('${b}-D', '${g}', '${P}', '${b}', ${RECU}, 0, ${RECU}, ${prix}, ${prix}, ${paf}, ${paf}, ${zone ? `'${zone}'` : 'NULL'}, 'is_Closed', ${quand}, ${quand}, 0);`);
}
const retours = () => q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID IN (${liste(BLS)})`
  + ` OR lg_RETOUR_FRS_ID IN (SELECT lg_RETOUR_FRS_ID FROM t_retour_fournisseur_detail WHERE bonLivraisonDetail_id IN (${liste(BLS.map((b) => b + '-D'))}))`);

(async () => {
  retirer();
  ok('Précondition : un produit en stock, deux grossistes', !!P && !!G1 && !!G2, P + ' ' + G1 + ' ' + G2);
  /* meme numero de BL : grossiste 1 (le plus ancien), grossiste 2 (le plus recent) */
  bon('X', G1, 5);
  bon('Y', G2, 1);

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    const articles = [];
    p.on('response', async (r) => { if (r.url().includes('RetourFourData')) { articles.push(r.status() + ' ' + r.url().slice(-80) + ' ' + (await r.text().catch(() => '?')).slice(0, 25)); } });
    p.on('requestfailed', (r) => { if (r.url().includes('RetourFourData')) { articles.push('ECHEC ' + r.failure().errorText + ' ' + r.url().slice(-80)); } });
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }

    const listeRetours = async () => {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('retourfrsmanager', 'Retours fournisseurs', ''));
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
      await p.waitForTimeout(800);
    };
    const fleche = async (id) => {
      const t = await p.evaluate((x) => Ext.getCmp(x).getEl().down('.x-form-trigger').id, id);
      await p.locator('#' + t).click();
    };
    /* produit, motif, quantite, Entree ; rend la reponse du serveur */
    const ajouter = async (qte) => {
      await p.waitForFunction(() => !Ext.getCmp('str_NAME').isDisabled(), null, { timeout: 20000 });
      /* l'ecran met le curseur dans « Article » et selectionne son texte 100 ms apres le choix du BL : attendre */
      await p.waitForTimeout(800);
      await p.locator('#str_NAME-inputEl').click();
      await p.keyboard.type(CIP, { delay: 40 });
      await p.locator('.x-boundlist-item').filter({ visible: true, hasText: CIP }).first().click({ timeout: 15000 }).catch(async (e) => {
        const s = await p.evaluate(() => { const st = Ext.getCmp('str_NAME').getStore(); return st.getProxy().url + ' n=' + st.getCount() + ' ' + JSON.stringify(st.getCount() ? st.getAt(0).data : {}).slice(0, 200); });
        throw new Error('article absent de la liste : ' + s + ' | ' + articles.join(' || '));
      });
      await fleche('lg_MOTIF_RETOUR');
      await p.locator('.x-boundlist-item').filter({ visible: true }).first().click();
      await p.locator('#int_QUANTITE-inputEl').fill(String(qte));
      const rep = p.waitForResponse((r) => /retourfournisseur\/(new|add-item)/.test(r.url()), { timeout: 30000 });
      await p.locator('#int_QUANTITE-inputEl').press('Enter');
      const r = await (await rep).json().catch(() => ({}));
      await p.waitForTimeout(800);
      if (await p.evaluate(() => Ext.Msg.isVisible())) { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); }
      return r;
    };
    /* nouveau retour, BL du grossiste 1 choisi dans la liste */
    const nouveauRetour = async () => {
      await listeRetours();
      await p.getByText('NOUVEAU RETOUR', { exact: true }).first().click();
      await p.waitForFunction(() => Ext.getCmp('lg_BON_LIVRAISON_ID') && Ext.getCmp('lg_BON_LIVRAISON_ID').isVisible(true), null, { timeout: 30000 });
      await p.waitForTimeout(800);
      await p.locator('#lg_BON_LIVRAISON_ID-inputEl').click();
      await p.keyboard.type(REF, { delay: 40 });
      await p.waitForFunction(() => { const s = Ext.getCmp('lg_BON_LIVRAISON_ID').getStore(); return !s.isLoading() && s.getCount() >= 2; }, null, { timeout: 30000 });
      const i = await p.evaluate((x) => Ext.getCmp('lg_BON_LIVRAISON_ID').getStore().findExact('lg_BON_LIVRAISON_ID', x), M + 'BLX');
      await p.locator('.x-boundlist-item').filter({ visible: true }).nth(i).click();
    };

    /* RF-02 */
    await nouveauRetour();
    const vu = await p.evaluate(() => Ext.getCmp('str_GROSSISTE_LIBELLE').getValue());
    ok('RF-02 : grossiste affiché = celui du BL choisi', vu === LIB1, vu + ' / ' + LIB1);
    const r1 = await ajouter(4);
    ok('RF-02 : retour créé', r1 && r1.success, JSON.stringify(r1).slice(0, 200));
    const ret = q(`SELECT CONCAT_WS('|', r.lg_RETOUR_FRS_ID, r.lg_BON_LIVRAISON_ID, r.lg_GROSSISTE_ID, d.bonLivraisonDetail_id) FROM t_retour_fournisseur r`
      + ` JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE d.bonLivraisonDetail_id IN (${liste(BLS.map((x) => x + '-D'))})`
      + ` OR r.lg_BON_LIVRAISON_ID IN (${liste(BLS)}) ORDER BY r.dt_CREATED LIMIT 1`).split('|');
    ok('RF-02 : le retour est rattaché au BL et au grossiste choisis (pas au BL homonyme le plus récent)',
      ret[1] === M + 'BLX' && ret[2] === G1 && ret[3] === M + 'BLX-D', ret.slice(1).join(' '));

    /* RF-04 : retour prepare puis mis en attente (« Mettre en attente », mobile ou web sans droit de validation) ; la
       liste montre les retours en attente */
    exec(`UPDATE t_retour_fournisseur SET str_STATUT = 'is_Waiting' WHERE lg_RETOUR_FRS_ID = '${ret[0]}'`);
    await listeRetours();
    await p.waitForFunction((x) => Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().findExact('lg_RETOUR_FRS_ID', x) >= 0, ret[0], { timeout: 30000 }).catch(async () => {
      const v = await p.evaluate(() => { const st = Ext.ComponentQuery.query('retourfrsmanager')[0].getStore(); return st.getCount() + ' ' + st.getRange().slice(0, 3).map((r) => r.get('lg_RETOUR_FRS_ID') + ':' + r.get('str_REF_LIVRAISON')).join(','); });
      throw new Error('retour absent de la liste : ' + v);
    });
    const iRet = await p.evaluate((x) => Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().findExact('lg_RETOUR_FRS_ID', x), ret[0]);
    await p.locator('.x-grid-row').filter({ visible: true }).nth(iRet).locator('img[data-qtip="Ouvrir le retour (le modifier, le valider)"]').click();
    await p.waitForFunction(() => Ext.getCmp('gridpanelID') && Ext.getCmp('gridpanelID').isVisible(true) && !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const lignes = await p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getCount());
    ok('RF-04 : le retour rouvert affiche sa ligne', lignes === 1, lignes + ' ligne(s)');
    const r2 = await ajouter(1);
    const qte = q(`SELECT IFNULL(SUM(int_NUMBER_RETURN), 0) FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ret[0]}'`);
    ok('RF-04 : « Ajouter » complète ce retour, aucun second retour créé', retours() === '1' && qte === '5', retours() + ' retour(s), ' + qte + ' boîte(s) ; ' + JSON.stringify(r2).slice(0, 150));

    /* RF-03 : 5 deja retournees sur 6 recues ; un autre retour de 2 doit etre refuse */
    await nouveauRetour();
    const r3 = await ajouter(2);
    ok('RF-03 : un autre retour sur la même ligne de BL ne dépasse pas la quantité reçue (5 déjà retournées sur 6)',
      r3 && !r3.success && retours() === '1', retours() + ' retour(s) ; ' + JSON.stringify(r3).slice(0, 200));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées', retours() === '0' && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${liste(BLS)})`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
