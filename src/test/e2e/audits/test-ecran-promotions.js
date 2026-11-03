/* Audit 05, promotions, par l'ecran « Gestion des promotions » (clics de l'utilisateur) :
 *  - PR-05 : une promotion qui n'a pas commence est affichee « A venir », pas « Oui » ;
 *  - PR-02 : modifier une promotion avec une fin avant le debut est refuse, et les dates ne changent pas en base ;
 *  - PR-03 : « Cloturer » une promotion a venir ou terminee est refuse, sa date de fin ne change pas ;
 *  - PR-04 : un prix special egal ou superieur au prix public est refuse ;
 *  - PR-07 : une remise decimale donne un message clair, pas une page d'erreur ;
 *  - PR-06 : un produit deja dans une promotion dont la periode chevauche ne peut pas etre ajoute a une autre ;
 *            la cloture d'une promotion en cours remet le drapeau « en promotion » selon les promotions restantes.
 * Donnees : promotions et produits d'essai (base de test seulement), retires a la fin.
 * Lancement seul : node src/test/e2e/audits/test-ecran-promotions.js
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

/* deux produits actifs, hors de toute promotion, prix public >= 1000 */
const produits = q("SELECT GROUP_CONCAT(CONCAT_WS('|', f.lg_FAMILLE_ID, f.str_NAME, f.int_PRICE, f.bl_PROMOTED) SEPARATOR ';') FROM ("
  + "SELECT f.* FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_PRICE >= 1000 AND LENGTH(f.str_NAME) >= 8"
  + " AND f.str_NAME NOT LIKE '%''%'"
  + " AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 31) f").split(';').map((x) => x.split('|'));
const [P, NOM_P, PRIX_P, DRAPEAU_P] = produits[0];
const [Q, NOM_Q, PRIX_Q, DRAPEAU_Q] = produits[1];
const ids = {};
const dates = (id) => q(`SELECT CONCAT(DATE(dt_START_DATE), ' ', DATE(dt_END_DATE)) FROM t_promotion WHERE lg_CODE_PROMOTION_ID = ${id}`);
const lignes = (id) => q(`SELECT COUNT(*) FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${id}`);
const drapeau = (f) => q(`SELECT IFNULL(bl_PROMOTED + 0, 'NULL') FROM t_famille WHERE lg_FAMILLE_ID = '${f}'`);

function retirer() {
  const liste = Object.values(ids).join(',') || '0';
  exec(`DELETE FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + `DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + `DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + `UPDATE t_famille SET bl_PROMOTED = ${DRAPEAU_P === 'NULL' || DRAPEAU_P === undefined ? 'NULL' : DRAPEAU_P} WHERE lg_FAMILLE_ID = '${P}';`
    + `UPDATE t_famille SET bl_PROMOTED = ${DRAPEAU_Q === 'NULL' || DRAPEAU_Q === undefined ? 'NULL' : DRAPEAU_Q} WHERE lg_FAMILLE_ID = '${Q}';`);
}
const promo = (type, debut, fin) => Number(q(`INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE)`
  + ` VALUES ('${type}', CURDATE() + INTERVAL ${debut} DAY, CURDATE() + INTERVAL ${fin} DAY); SELECT LAST_INSERT_ID();`));
function poser() {
  ids.A = promo('PRIX SPECIAL', -5, 5);   /* en cours, contient P */
  ids.B = promo('REMISE', 3, 20);         /* a venir, chevauche A */
  ids.C = promo('REMISE', -60, -30);      /* terminee */
  exec(`INSERT INTO t_promotion_product (int_DISCOUNT, bl_MODE, int_PACK_NUMBER, db_PRICE, int_ACTIVE_AT, dt_PROMOTED_DATE, lg_FAMILLE_ID, lg_CODE_PROMOTION_ID)`
    + ` VALUES (0, 0, 0, ${Number(PRIX_P) - 100}, 0, NOW(), '${P}', ${ids.A});`
    + `UPDATE t_famille SET bl_PROMOTED = 1 WHERE lg_FAMILLE_ID = '${P}';`);
}

(async () => {
  ok('Précondition : deux produits hors promotion', !!P && !!Q, NOM_P + ' (' + PRIX_P + ') / ' + NOM_Q + ' (' + PRIX_Q + ')');
  try { poser(); } catch (e) { retirer(); throw e; }
  const avant = { A: dates(ids.A), B: dates(ids.B), C: dates(ids.C) };
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    const p = await ctx.newPage();
    ctx.on('page', (pop) => { if (pop !== p) { pop.close().catch(() => {}); } });
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto(URL + '/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const m = p.locator('text=Masquer').filter({ visible: true }).first();
    if (await m.count()) { await m.click().catch(() => {}); }

    /* message affiche (Ext.MessageBox), ferme par OK ; rend son texte */
    const message = async () => {
      await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 30000 });
      const t = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
      await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } });
      await p.waitForTimeout(400);
      return t.replace(/\s+/g, ' ');
    };
    const grille = () => p.evaluate(() => Ext.getCmp('GridPromotionsID').getStore());
    const charger = async () => {
      await p.evaluate(() => { const s = Ext.getCmp('GridPromotionsID').getStore(); s.pageSize = 500; s.loadPage(1); });
      await p.waitForFunction(() => !Ext.getCmp('GridPromotionsID').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(500);
    };
    const rangee = async (id) => {
      const i = await p.evaluate((x) => Ext.getCmp('GridPromotionsID').getStore().findExact('lg_CODE_PROMOTION_ID', String(x)), id);
      if (i < 0) { throw new Error('promotion ' + id + ' absente de la liste'); }
      const row = p.locator('#GridPromotionsID .x-grid-row').nth(i);
      await row.scrollIntoViewIfNeeded();
      return row;
    };
    const icone = async (id, qtip) => (await rangee(id)).locator(`img[data-qtip*="${qtip}"]`).first().click();

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('promotionmanager', 'Promotions', ''));
    await p.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
    await charger();

    /* PR-05 */
    const etatB = (await (await rangee(ids.B)).innerText()).replace(/\s+/g, ' ');
    ok('PR-05 : la promotion qui commence dans 3 jours est « À venir », pas « Oui »', /venir/i.test(etatB) && !/\bOui\b/.test(etatB), etatB);

    /* PR-02 : modifier A avec fin avant debut */
    await icone(ids.A, 'Modifier la promotion');
    await p.waitForSelector('.x-window:visible input[name], .x-window:visible .x-form-field', { timeout: 15000 });
    const fen = p.locator('.x-window').filter({ hasText: 'Modifier la promotion' }).last();
    const champs = fen.locator('input.x-form-field');
    const jj = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear(); };
    /* champs : type (combo), debut, fin */
    await champs.nth(1).fill(jj(10)); await champs.nth(1).press('Tab');
    await champs.nth(2).fill(jj(1)); await champs.nth(2).press('Tab');
    const repMaj = p.waitForResponse((r) => r.url().includes('promotions/update'), { timeout: 8000 }).catch(() => null);
    await fen.getByText('Enregistrer', { exact: true }).click();
    const r2 = await repMaj;
    const msg2 = await message();
    await p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Modifier la promotion/.test(w.title || '')) { w.close(); } }); });
    ok('PR-02 : fin avant début refusée, l’écran le dit', /fin doit .*apr.s la date de d.but/i.test(msg2), msg2 + (r2 ? ' (serveur appelé)' : ' (refus à l’écran)'));
    ok('PR-02 : les dates de la promotion ne changent pas en base', dates(ids.A) === avant.A, dates(ids.A) + ' / ' + avant.A);

    /* PR-03 : cloturer B (a venir) puis C (terminee) */
    for (const [cle, libelle] of [['B', 'à venir'], ['C', 'terminée']]) {
      await icone(ids[cle], 'turer la promotion');
      await p.waitForTimeout(500);
      const conf = p.locator('.prestige-confirmer-icone');
      if (await conf.count()) { await conf.first().click(); } else if (await p.evaluate(() => Ext.Msg.isVisible())) { await p.evaluate(() => Ext.Msg.down('button[itemId=yes]').btnEl.dom.click()); }
      const t = await message();
      await charger();
      ok(`PR-03 : clôturer une promotion ${libelle} est refusé, sa date de fin ne change pas`, dates(ids[cle]) === avant[cle] && /d.j. termin|pas encore commenc/i.test(t), dates(ids[cle]) + ' / ' + avant[cle] + ' ; ' + t);
    }

    /* fenetre des produits d'une promotion ; choix d'un produit ; saisie ; Ajouter */
    const produitsDe = async (id) => {
      await icone(id, 'rer les produits de la promotion');
      await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
      await p.waitForTimeout(600);
    };
    const ajouter = async (nom, champ, valeur) => {
      const combo = await p.evaluate(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').filter((c) => c.isVisible(true))[0].id);
      await p.locator('#' + combo + '-inputEl').click();
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Backspace');
      await p.locator('#' + combo + '-inputEl').pressSequentially(nom.slice(0, 8), { delay: 40 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: nom }).first().click({ timeout: 20000 });
      await p.waitForTimeout(400);
      const cid = await p.evaluate((c) => Ext.ComponentQuery.query('window numberfield[itemId=' + c + ']').filter((x) => x.isVisible(true))[0].id, champ);
      await p.locator('#' + cid + '-inputEl').fill(String(valeur));
      const rep = p.waitForResponse((r) => r.url().includes('produits/add'), { timeout: 8000 }).catch(() => null);
      await p.locator('#' + cid + '-inputEl').press('Enter');
      const r = await rep;
      const t = await message();
      return { t, serveur: r ? r.status() : null };
    };
    const fermerProduits = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Produits de la promotion/.test(w.title || '')) { w.close(); } }); });

    /* PR-04 : Q dans A (PRIX SPECIAL) a un prix superieur au prix public */
    await produitsDe(ids.A);
    const r4 = await ajouter(NOM_Q, 'champPrixPromo', Number(PRIX_Q) + 500);
    await fermerProduits();
    ok('PR-04 : prix spécial supérieur au prix public refusé, rien n’est enregistré', /inf.rieur au prix public/i.test(r4.t) && q(`SELECT COUNT(*) FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${ids.A} AND lg_FAMILLE_ID = '${Q}'`) === '0', r4.t);

    /* PR-07 et PR-06 dans B (REMISE, a venir, chevauche A) */
    await produitsDe(ids.B);
    const r7 = await ajouter(NOM_Q, 'champRemise', '12.5');
    ok('PR-07 : remise décimale : message clair, pas de page d’erreur, rien d’enregistré', !/<html|exception|HTTP Status|Error report/i.test(r7.t) && /entier|d.cimal|virgule|valide/i.test(r7.t) && lignes(ids.B) === '0', r7.t);
    const r6 = await ajouter(NOM_P, 'champRemise', 10);
    await fermerProduits();
    ok('PR-06 : P déjà dans une promotion dont la période chevauche : ajout refusé', /chevauch/i.test(r6.t) && lignes(ids.B) === '0', r6.t + ' ; lignes B ' + lignes(ids.B));

    /* PR-06 : cloture de A (en cours) ; P n'est plus dans aucune promotion non terminee : drapeau 0 */
    await charger();
    await icone(ids.A, 'turer la promotion');
    await p.waitForTimeout(500);
    const conf = p.locator('.prestige-confirmer-icone');
    if (await conf.count()) { await conf.first().click(); } else if (await p.evaluate(() => Ext.Msg.isVisible())) { await p.evaluate(() => Ext.Msg.down('button[itemId=yes]').btnEl.dom.click()); }
    const tA = await message();
    const finA = dates(ids.A).split(' ')[1];
    ok('Clôture d’une promotion en cours : fin = hier, drapeau du produit remis à 0', /cl.tur/i.test(tA) && finA === q('SELECT CURDATE() - INTERVAL 1 DAY') && drapeau(P) === '0', tA + ' ; fin ' + finA + ' ; drapeau ' + drapeau(P));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d’essai retirées', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${Object.values(ids).join(',') || 0})`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
