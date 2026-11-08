/* PLAN DU 06/11, POINT 3.3 (DEMANDE DU 07/11) : ECRAN D'AJOUT D'UN PRODUIT A UNE PROMOTION.
 *
 * Demande : « le champ de recherche produit est court alors qu'il y a de la place ; si promo prix, rappeler le prix
 * actuel juste avant le prix a saisir ; si promo UG, rappeler la quantite en stock ; si remise ... ».
 * Reponses retenues : rappel « Prix actuel : X » (prix special), « Prix actuel : X -> Prix apres remise : Y » (remise,
 * recalcule a la frappe du %), « Stock : N » (unites gratuites, stock vendable de l'officine, sans les depots).
 * Par l'ecran Promotions > « Gerer les produits » (compte de test), trois promotions d'essai :
 *  - le champ de recherche prend la place libre de la barre (au moins 360 px, pas de grand vide a droite) ;
 *  - la liste de recherche montre CIP, nom, prix et stock ; rapprochement : prix et stock affiches = base ;
 *  - rappel apres le choix : prix actuel = base ; remise 15 % : prix apres remise = arrondi(prix x 85 / 100) = prix
 *    enregistre par le serveur apres « Ajouter » ; stock = base ;
 *  - apres l'ajout, le rappel est vide ; aucune erreur JavaScript.
 * Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/retours/test-promotion-ajout-produit-0811.js
 */
const { chromium } = require('playwright-core');
const A = require('../audits/commun');
const vues = require('../outils/vues');
const { ok, q, exec } = A;

const filtre = " AND f.int_PRICE BETWEEN 1000 AND 5000 AND f.int_CIP REGEXP '^[0-9]{7}$' AND f.str_NAME NOT LIKE '%''%' AND LENGTH(f.str_NAME) >= 8"
  + ' AND NOT EXISTS (SELECT 1 FROM t_promotion_product pp WHERE pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID)';
/* stocks differents, dont un a 0 */
const PS = A.produit(17, 23, filtre), PR = A.produit(31, 7, filtre), PU = A.produit(43, 0, filtre);
for (const x of [PS, PR, PU]) {
  const [cip, nom, drapeau] = q(`SELECT CONCAT_WS('|', int_CIP, str_NAME, IFNULL(bl_PROMOTED + 0, 'NULL')) FROM t_famille WHERE lg_FAMILLE_ID = '${x.id}'`).split('|');
  Object.assign(x, { cip, nom, drapeau });
}
const promos = {};
const nouvelle = (type) => Number(q(`INSERT INTO t_promotion (str_TYPE, dt_START_DATE, dt_END_DATE) VALUES ('${type}', CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 5 DAY); SELECT LAST_INSERT_ID();`));
function retirer() {
  const l = Object.values(promos).join(',') || '0';
  exec(`DELETE FROM t_promotion_history WHERE lg_CODE_PROMOTION_ID IN (${l}); DELETE FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID IN (${l});`
    + ` DELETE FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${l})`);
  for (const x of [PS, PR, PU]) { exec(`UPDATE t_famille SET bl_PROMOTED = ${x.drapeau} WHERE lg_FAMILLE_ID = '${x.id}'`); }
}
const chiffres = (t) => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

(async () => {
  ok('Jeu d\'essai : trois produits, prix et stocks différents (23, 7, 0)', [PS, PR, PU].every((x) => x.id && x.nom) && A.stock(PS) === 23 && A.stock(PR) === 7 && A.stock(PU) === 0,
    [PS, PR, PU].map((x) => x.cip + ' ' + x.pu + ' stock ' + A.stock(x)).join(', '));
  promos.S = nouvelle('PRIX SPECIAL'); promos.R = nouvelle('REMISE'); promos.U = nouvelle('UNITES GRATUITES');
  const b = await A.ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await vues.connexion(p, A.ENV_E2E.LOGIN, 'e2etest');
    const menu = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getNodeById('promotionmanager');
      return n && n.parentNode ? { parent: n.parentNode.get('text'), texte: n.get('text') } : null; });
    await vues.ouvrirMenu(p, menu.parent, menu.texte);
    await p.waitForFunction(() => Ext.getCmp('GridPromotionsID') && Ext.getCmp('GridPromotionsID').isVisible(true), null, { timeout: 30000 });
    await p.mouse.click(1000, 700); await p.waitForTimeout(500);
    const charger = async () => {
      await p.evaluate(() => { const s = Ext.getCmp('GridPromotionsID').getStore(); s.pageSize = 500; s.loadPage(1); });
      await p.waitForFunction(() => !Ext.getCmp('GridPromotionsID').getStore().isLoading(), null, { timeout: 30000 });
      await p.waitForTimeout(600);
    };
    const visibleId = (item) => p.evaluate((c) => { const x = Ext.ComponentQuery.query('window [itemId=' + c + ']').filter((y) => y.isVisible(true))[0]; return x ? x.id : null; }, item);
    const rappel = () => p.evaluate(() => { const x = Ext.ComponentQuery.query('window tbtext[itemId=rappelProduit]').filter((y) => y.isVisible(true))[0];
      return x ? x.getEl().dom.innerText.replace(/\s+/g, ' ').trim() : null; });
    const ouvrir = async (id) => {
      await charger();
      const i = await p.evaluate((x) => Ext.getCmp('GridPromotionsID').getStore().findExact('lg_CODE_PROMOTION_ID', String(x)), id);
      const row = p.locator('#GridPromotionsID .x-grid-row').nth(i);
      await row.scrollIntoViewIfNeeded();
      await row.locator('img[data-qtip*="rer les produits de la promotion"]').first().click();
      await p.waitForFunction(() => Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').some((c) => c.isVisible(true)), null, { timeout: 15000 });
      await p.waitForTimeout(600);
    };
    /* tape le debut du nom, lit la ligne de la liste, la choisit */
    const choisir = async (x) => {
      const combo = await visibleId('choixProduit');
      await p.locator('#' + combo + '-inputEl').click();
      await p.locator('#' + combo + '-inputEl').pressSequentially(x.nom.slice(0, 8), { delay: 40 });
      const item = p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: x.nom }).first();
      await item.waitFor({ timeout: 20000 });
      const texte = (await item.innerText()).replace(/\s+/g, ' ').trim();
      await item.click();
      await p.waitForTimeout(500);
      return texte;
    };
    const fermer = () => p.evaluate(() => { Ext.WindowManager.each((w) => { if (w.isXType && w.isXType('window') && w.isVisible() && /Produits de la promotion/.test(w.title || '')) { w.close(); } }); });

    /* ---- prix special ---- */
    await ouvrir(promos.S);
    const largeur = await p.evaluate(() => { const c = Ext.ComponentQuery.query('window combobox[itemId=choixProduit]').filter((y) => y.isVisible(true))[0];
      const tb = c.up('toolbar'); const items = tb.items.items.filter((y) => y.isVisible());
      const dernier = items[items.length - 1]; const droite = dernier.getEl().getRight(), bord = tb.getEl().getRight();
      return { combo: c.getWidth(), barre: tb.getWidth(), vide: bord - droite }; });
    ok('Le champ de recherche prend la place libre : au moins 360 px, pas de grand vide à droite de la barre', largeur.combo >= 360 && largeur.vide < 40,
      JSON.stringify(largeur));
    const ligneS = await choisir(PS);
    const prixS = Number(q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${PS.id}'`));
    ok('Liste de recherche : CIP, nom, prix et stock = base', ligneS.includes(PS.cip) && ligneS.includes(PS.nom) && /stock 23\b/.test(ligneS)
      && chiffres(ligneS.split(PS.nom)[1].split('F')[0]) === prixS, ligneS);
    let r = await rappel();
    ok('Prix spécial : rappel « Prix actuel : X » = prix de la fiche', /^Prix actuel : /.test(r || '') && chiffres(r) === prixS, r + ' / ' + prixS);
    await fermer();

    /* ---- remise ---- */
    await ouvrir(promos.R);
    await choisir(PR);
    const prixR = Number(q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${PR.id}'`));
    r = await rappel();
    ok('Remise : rappel « Prix actuel : X » avant la saisie du %', /^Prix actuel : /.test(r || '') && chiffres(r) === prixR && !/remise/i.test(r), r);
    const cr = await visibleId('champRemise');
    await p.locator('#' + cr + '-inputEl').fill('15');
    await p.waitForTimeout(400);
    r = await rappel();
    const apres = Math.round(prixR * 85 / 100);
    const lu = (r || '').split('remise')[1];
    ok('Remise 15 % : « Prix après remise : Y », Y = arrondi(prix × 85 / 100)', /Prix apr.s remise/.test(r || '') && chiffres(lu) === apres, r + ' / ' + apres);
    const rep = p.waitForResponse((x) => x.url().includes('produits/add'), { timeout: 8000 }).catch(() => null);
    await p.locator('#' + cr + '-inputEl').press('Enter');
    await rep; await p.waitForTimeout(800);
    const enBase = Number(q(`SELECT ROUND(db_PRICE) FROM t_promotion_product WHERE lg_CODE_PROMOTION_ID = ${promos.R} AND lg_FAMILLE_ID = '${PR.id}'`));
    ok('Rapprochement : prix après remise affiché = prix enregistré par le serveur', enBase === apres, enBase + ' / ' + apres);
    r = await rappel();
    ok('Après « Ajouter » : le rappel est vidé', r === '', JSON.stringify(r));
    await fermer();

    /* ---- unites gratuites : stock 0 ---- */
    await ouvrir(promos.U);
    const ligneU = await choisir(PU);
    r = await rappel();
    ok('Unités gratuites : rappel « Stock : N » = stock de l\'officine (0 ici), liste = base', r === 'Stock : 0' && /stock 0\b/.test(ligneU), r + ' ; ' + ligneU);
    await fermer();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    retirer();
    A.nettoyer();
    ok('Promotions d\'essai retirées', q(`SELECT COUNT(*) FROM t_promotion WHERE lg_CODE_PROMOTION_ID IN (${Object.values(promos).join(',') || 0})`) === '0');
    process.exit(A.bilan() ? 1 : 0);
  }
})();
