/* PLAN DU 06/11, POINT 3.4 : L'HISTORIQUE DES PROMOTIONS EST VIDE.
 *
 * Journal de l'utilisateur (06/11 12:42) : « listHistorique promotions », ClassCastException Boolean -> Number a
 * PromotionServiceImpl.listHistorique : la colonne bl_MODE est lue comme un nombre, l'erreur est avalee, la liste rend
 * « total 0 » sans message.
 *
 * Parcours, par les ecrans (compte de test, 1600 x 950) :
 *  - trois promotions d'essai en cours, une de chaque type (REMISE, PRIX SPECIAL, UNITES GRATUITES) ;
 *  - « Promotions » > icone « Gerer les produits de la promotion » > choix du produit > saisie > « Ajouter », pour quatre
 *    produits aux valeurs differentes (remise 15 %, prix special = public - 135, 5+1, 3+2) : bl_MODE vaut 1 pour la
 *    remise et 0 pour les autres, les deux formes passent par la liste ;
 *  - « Historique de promotions » : la liste n'est pas vide, son total = nombre de lignes en base ;
 *  - rapprochement, ligne par ligne : chaque ajout fait ecrit exactement une ligne d'historique, et la grille montre pour
 *    elle les memes CIP, produit, type, remise, prix, unites gratuites, seuil, debut, fin et date que la base ;
 *  - recherche par CIP : une seule ligne, la bonne ;
 *  - bilan avant / apres : quatre lignes d'historique de plus, rien d'autre ; aucune fenetre d'erreur, aucune erreur JS.
 * Tout est retire a la fin (historique, produits en promotion, promotions, drapeaux des produits).
 * Lancement seul : node src/test/e2e/audits/test-ecran-historique-promotions.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const URL = process.env.BASE || 'http://localhost:8080/prestige';
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });

/* quatre produits actifs, hors de toute promotion, prix differents >= 1000, nom sans apostrophe */
const produits = q("SELECT GROUP_CONCAT(CONCAT_WS('|', f.lg_FAMILLE_ID, f.str_NAME, f.int_PRICE, f.int_CIP, IFNULL(f.bl_PROMOTED + 0, 'NULL')) SEPARATOR ';') FROM ("
  + "SELECT f.* FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 1000 AND 9000 AND LENGTH(f.str_NAME) >= 8"
  + " AND f.str_NAME NOT LIKE '%''%' AND f.int_CIP REGEXP '^[0-9]{7}$'"
  + " AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
  + " GROUP BY f.int_PRICE ORDER BY f.int_PRICE LIMIT 4 OFFSET 17) f").split(';').map((x) => {
  const [id, nom, prix, cip, drapeau] = x.split('|');
  return { id, nom, prix: Number(prix), cip, drapeau };
});
const ids = {};
const promo = (type) => Number(q(`INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE)`
  + ` VALUES ('${type}', CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 9 DAY); SELECT LAST_INSERT_ID();`));
function retirer() {
  const liste = Object.values(ids).join(',') || '0';
  exec(`DELETE FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + `DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + `DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${liste});`
    + produits.map((p) => `UPDATE t_famille SET bl_PROMOTED = ${p.drapeau === 'NULL' ? 'NULL' : p.drapeau} WHERE lg_FAMILLE_ID = '${p.id}';`).join(''));
}
const COMPTE = () => Number(q('SELECT COUNT(*) FROM t_promotion_history'));

(async () => {
  ok('Précondition : quatre produits hors promotion, prix différents', produits.length === 4 && new Set(produits.map((p) => p.prix)).size === 4,
    produits.map((p) => p.nom + ' ' + p.prix).join(' / '));
  ids.R = promo('REMISE'); ids.S = promo('PRIX SPECIAL'); ids.U = promo('UNITES GRATUITES');
  const [P1, P2, P3, P4] = produits;
  /* ajout : promotion, produit, champs a remplir, valeurs attendues en base */
  const AJOUTS = [
    { promo: ids.R, type: 'REMISE', p: P1, champs: { champRemise: 15 }, attendu: { remise: 15, prix: Math.round(P1.prix * 85 / 100), pack: 0, seuil: 0, mode: 1 } },
    { promo: ids.S, type: 'PRIX SPECIAL', p: P2, champs: { champPrixPromo: P2.prix - 135 }, attendu: { remise: 0, prix: P2.prix - 135, pack: 0, seuil: 0, mode: 0 } },
    { promo: ids.U, type: 'UNITES GRATUITES', p: P3, champs: { champPack: 1, champSeuil: 5 }, attendu: { remise: 0, prix: P3.prix, pack: 1, seuil: 5, mode: 0 } },
    { promo: ids.U, type: 'UNITES GRATUITES', p: P4, champs: { champPack: 2, champSeuil: 3 }, attendu: { remise: 0, prix: P4.prix, pack: 2, seuil: 3, mode: 0 } },
  ];
  const AVANT = COMPTE();
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
    const fenetreErreur = () => p.evaluate(() => Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.innerText : '');

    /* ---- Promotions : ajout des quatre produits par la fenetre des produits */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('promotionmanager', 'Promotions', ''));
    await p.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
    await p.evaluate(() => { const s = Ext.getCmp('GridPromotionsID').getStore(); s.pageSize = 500; s.loadPage(1); });
    await p.waitForFunction(() => !Ext.getCmp('GridPromotionsID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const rangee = async (id) => {
      const i = await p.evaluate((x) => Ext.getCmp('GridPromotionsID').getStore().findExact('lg_CODE_PROMOTION_ID', String(x)), id);
      if (i < 0) { throw new Error('promotion ' + id + ' absente de la liste'); }
      const row = p.locator('#GridPromotionsID .x-grid-row').nth(i);
      await row.scrollIntoViewIfNeeded();
      return row;
    };
    const fermerProduits = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Produits de la promotion/.test(w.title || '')) { w.close(); } }); });
    for (const a of AJOUTS) {
      await (await rangee(a.promo)).locator('img[data-qtip*="rer les produits de la promotion"]').first().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
      await p.waitForTimeout(600);
      const combo = await p.evaluate(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').filter((c) => c.isVisible(true))[0].id);
      await p.locator('#' + combo + '-inputEl').click();
      await p.locator('#' + combo + '-inputEl').pressSequentially(a.p.cip, { delay: 40 });
      await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: a.p.nom }).first().click({ timeout: 20000 });
      await p.waitForTimeout(400);
      for (const [champ, valeur] of Object.entries(a.champs)) {
        const cid = await p.evaluate((c) => Ext.ComponentQuery.query('window numberfield[itemId=' + c + ']').filter((x) => x.isVisible(true))[0].id, champ);
        await p.locator('#' + cid + '-inputEl').fill(String(valeur));
      }
      const rep = p.waitForResponse((r) => r.url().includes('produits/add'), { timeout: 15000 });
      await p.locator('.x-window:visible').filter({ hasText: 'Produits de la promotion' }).getByText('Ajouter', { exact: true }).click();
      const r = await rep;
      const corps = await r.json().catch(() => ({}));
      await p.waitForTimeout(600);
      const e = await fenetreErreur();
      await fermerProduits();
      ok(`Ajout par l'écran : ${a.type} ${a.p.nom} accepté`, String(corps.success) === '1' && !e, JSON.stringify(corps) + ' ' + e);
    }

    /* ---- base : une ligne d'historique par ajout, valeurs justes */
    const enBase = AJOUTS.map((a) => q(`SELECT CONCAT_WS('|', lg_CODE_PROMOTION_HISTORY, int_CIP, str_NAME, str_TYPE, int_DISCOUNT, bl_MODE + 0, ROUND(db_PRICE),`
      + ` int_PACK_NUMBER, int_ACTIVE_AT, DATE_FORMAT(dt_START_DATE, '%d/%m/%Y'), DATE_FORMAT(dt_END_DATE, '%d/%m/%Y'), DATE_FORMAT(dt_PROMOTED_DATE, '%d/%m/%Y'))`
      + ` FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID = ${a.promo} AND lg_FAMILLE_ID = '${a.p.id}'`).split('\n').filter(Boolean).map((l) => l.split('|')));
    ok('Base : exactement une ligne d\'historique par ajout, avec type, remise, prix, unités gratuites, seuil et bl_MODE attendus',
      enBase.every((l, i) => l.length === 1 && l[0][3] === AJOUTS[i].type && Number(l[0][4]) === AJOUTS[i].attendu.remise
        && Number(l[0][5]) === AJOUTS[i].attendu.mode && Number(l[0][6]) === AJOUTS[i].attendu.prix
        && Number(l[0][7]) === AJOUTS[i].attendu.pack && Number(l[0][8]) === AJOUTS[i].attendu.seuil),
      JSON.stringify(enBase.map((l) => l.map((x) => x.slice(3, 9)))));

    /* ---- Historique de promotions */
    const rep = p.waitForResponse((r) => r.url().includes('promotions/historique'), { timeout: 30000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('promotionhistorymanager', 'Historique de promotions', ''));
    await rep;
    await p.waitForFunction(() => Ext.getCmp('GridPromotionHistoriqueID') && !Ext.getCmp('GridPromotionHistoriqueID').getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const total = await p.evaluate(() => Ext.getCmp('GridPromotionHistoriqueID').getStore().getTotalCount());
    const enBaseTotal = COMPTE();
    ok('Historique : la liste n\'est pas vide, son total = lignes en base', total > 0 && total === enBaseTotal, 'écran ' + total + ' ; base ' + enBaseTotal);

    const lignesEcran = await p.evaluate(() => {
      const g = Ext.getCmp('GridPromotionHistoriqueID');
      return g.getStore().getRange().map((r, i) => {
        const n = g.getView().getNode(i);
        return { id: String(r.get('lg_CODE_PROMOTION_HISTORY')), texte: n ? n.innerText.replace(/\s+/g, ' ') : '',
          v: ['dt_PROMOTED_DATE', 'int_CIP', 'str_NAME', 'str_TYPE', 'int_DISCOUNT', 'db_PROMOTION_PRICE', 'int_PACK_NUMBER', 'int_ACTIVE_AT', 'dt_START_DATE', 'dt_END_DATE'].map((c) => String(r.get(c))) };
      });
    });
    AJOUTS.forEach((a, i) => {
      const b0 = enBase[i][0];
      const e = b0 && lignesEcran.find((l) => l.id === b0[0]);
      const attendus = b0 ? [b0[11], b0[1], b0[2], b0[3], b0[4], String(Number(b0[6])), b0[7], b0[8], b0[9], b0[10]] : [];
      const memes = e && attendus.every((x, k) => (k === 5 ? String(Math.round(Number(e.v[k]))) : e.v[k]) === x)
        && attendus.every((x) => e.texte.includes(k5(x)));
      ok(`Rapprochement ${a.type} ${a.p.nom} : grille = base (date, CIP, produit, type, remise, prix, gratuites, seuil, début, fin)`,
        memes, JSON.stringify({ ecran: e && e.v, base: attendus }));
    });

    /* ---- recherche par CIP */
    await p.locator('#rech_promotion_historique-inputEl').fill(P3.cip);
    const rep2 = p.waitForResponse((r) => r.url().includes('promotions/historique'), { timeout: 30000 });
    await p.getByText('rechercher', { exact: true }).click();
    await rep2;
    await p.waitForTimeout(800);
    const trouve = await p.evaluate(() => Ext.getCmp('GridPromotionHistoriqueID').getStore().getRange().map((r) => r.get('int_CIP') + ' ' + r.get('str_TYPE')));
    const attenduCip = Number(q(`SELECT COUNT(*) FROM t_promotion_history WHERE int_CIP LIKE '%${P3.cip}%' OR str_NAME LIKE '%${P3.cip}%'`));
    ok('Recherche par CIP : les lignes de ce CIP seulement, autant qu\'en base', trouve.length === attenduCip && trouve.every((t) => t.startsWith(P3.cip)), JSON.stringify(trouve));

    /* ---- bilan */
    ok('Bilan : quatre lignes d\'historique de plus, rien d\'autre', COMPTE() - AVANT === 4, (COMPTE() - AVANT) + ' ligne(s)');
    ok('Aucune fenêtre d\'erreur', !(await fenetreErreur()));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack + ' ' + err.join(' | '));
  } finally {
    await b.close();
    retirer();
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${Object.values(ids).join(',') || 0})`) === '0'
      && COMPTE() === AVANT, 'historique ' + COMPTE() + ' contre ' + AVANT);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();

/* nombre affiche par la grille : « 1500.0 » cote serveur pour le prix, compare sans decimale */
function k5(x) { return String(x).replace(/\.0$/, ''); }
