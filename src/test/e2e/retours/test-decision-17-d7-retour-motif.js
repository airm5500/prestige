/* DECISION 17 D7 DU PHARMACIEN (15/10, confirmee le 19/10) : RETOUR FOURNISSEUR, MOTIF DIFFERENT.
 *
 * « Normalement un produit n'a qu'un motif sur un meme BL. Si cela arrive : option 1 (une ligne par produit, motif et
 * lot), avec un message : « Vous avez ajouté ce produit avec un motif différent ». » Avant : la quantite etait cumulee
 * sur la premiere ligne et le second motif perdu sans le dire.
 *  - meme produit, meme motif : la quantite s'ajoute a la ligne (inchange), sans message ;
 *  - meme produit, autre motif : nouvelle ligne avec ce motif, message ;
 *  - le total retourne du produit (toutes lignes) ne depasse jamais la quantite recue : refus lisible ;
 *  - par l'ecran (GESTION DES COMMANDES > Retour fournisseur > NOUVEAU RETOUR) : le meme produit ajoute avec deux
 *    motifs donne deux lignes dans la grille et le message s'affiche en bandeau, sans fenetre a fermer.
 * Un BL d'essai (10 boites recues) et le stock sont poses en base ; tout est retire, stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const M = 'E2E-D7-', REF = 'E2E-D7-BL1', NOTE = 'E2E-D7-RETOUR';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const PRODUIT = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 1 OFFSET 17");
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const [MA, MB] = q("SELECT GROUP_CONCAT(lg_MOTIF_RETOUR ORDER BY lg_MOTIF_RETOUR SEPARATOR '|') FROM (SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 2) x").split('|');
const CIP = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${PRODUIT}'`);
const LIB = [MA, MB].map((m) => q(`SELECT str_LIBELLE FROM t_motif_retour WHERE lg_MOTIF_RETOUR = '${m}'`));
const STOCK0 = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`).split('|');

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}' OR lg_BON_LIVRAISON_ID = '${M}B1'`);
  exec(`DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${M}B1';`
    + `DELETE FROM t_order WHERE lg_ORDER_ID = '${M}C1';`);
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[0]}, int_NUMBER = ${STOCK0[1]} WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
}
function poser() {
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)
    VALUES ('${M}C1', '${M}C1', 1, '${G}', '${ADMIN}', 'is_Closed', NOW(), NOW(), 0, 0, 0);
    INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID, direct_import)
    VALUES ('${M}B1', '${REF}', CURDATE(), 10000, 0, 10000, '${M}C1', 'is_Closed', NOW(), NOW(), '${ADMIN}', 0);
    INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PAF, int_PRIX_VENTE, int_PA_REEL, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK, lg_ZONE_GEO_ID)
    SELECT '${M}D1', '${G}', '${PRODUIT}', '${M}B1', 10, 0, 10, 1000, 1500, 1000, 'is_Closed', NOW(), NOW(), 0, 0, 0, f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.lg_FAMILLE_ID = '${PRODUIT}';`);
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`);
}

(async () => {
  retirer();
  try { poser(); } catch (e) { retirer(); throw e; }
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
    return r.json(); }, [m, u, c]);
  const lignes = (id) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_MOTIF_RETOUR, ':', int_NUMBER_RETURN) ORDER BY lg_MOTIF_RETOUR SEPARATOR ' '), '') FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${id}'`);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const r = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: REF, strCOMMENTAIRE: NOTE, items: [{ produitId: PRODUIT, lgMOTIFRETOUR: MA, intNUMBERRETURN: 2 }] });
    const id = r.data && r.data.lgRETOURFRSID;
    ok('Retour créé : une ligne, motif A, 2 boîtes', r.success === true && lignes(id) === MA + ':2', JSON.stringify(r).slice(0, 200));
    const item = (motif, n) => api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: id, produitId: PRODUIT, lgMOTIFRETOUR: motif, intNUMBERRETURN: n });
    const a = await item(MA, 1);
    ok('Même produit, même motif : la quantité s\'ajoute (3), sans message', a.success === true && lignes(id) === MA + ':3' && !/motif différent/.test(JSON.stringify(a)), lignes(id) + ' ' + JSON.stringify(a).slice(0, 200));
    const b2 = await item(MB, 4);
    ok('Même produit, autre motif : une seconde ligne avec ce motif (A:3, B:4)', b2.success === true && lignes(id) === MA + ':3 ' + MB + ':4', lignes(id));
    ok('… avec le message « Vous avez ajouté ce produit avec un motif différent »', /Vous avez ajouté ce produit avec un motif différent/.test(JSON.stringify(b2)), JSON.stringify(b2).slice(0, 250));
    const c = await item(MB, 4);
    ok('Total du produit au-delà des 10 reçues (3 + 4 + 4) : refusé, lignes inchangées', c.success === false && lignes(id) === MA + ':3 ' + MB + ':4', JSON.stringify(c).slice(0, 200) + ' ' + lignes(id));

    /* par l'ecran */
    const u = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    const erreurs = []; u.on('pageerror', (e) => erreurs.push(e.message));
    const liste = async (id, texte, choix) => {
      await u.click('#' + id + '-inputEl'); await u.keyboard.press('Control+A'); await u.keyboard.type(texte, { delay: 40 });
      const item = u.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: choix || texte }).first();
      await item.waitFor({ timeout: 20000 }); await item.click(); await u.waitForTimeout(500);
    };
    await connexion(u, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(u, 'GESTION DES COMMANDES', 'Retour fournisseur');
    await u.waitForFunction(() => Ext.ComponentQuery.query('retourfrsmanager').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    const nouveau = u.locator('.x-btn').filter({ visible: true }).filter({ hasText: 'NOUVEAU RETOUR' }).first();
    await nouveau.waitFor({ timeout: 60000 });
    await nouveau.click();
    await u.waitForFunction(() => Ext.getCmp('lg_BON_LIVRAISON_ID') && Ext.getCmp('lg_BON_LIVRAISON_ID').isVisible(true), null, { timeout: 30000 });
    await liste('lg_BON_LIVRAISON_ID', REF);
    const ajouter = async (motif) => {
      await u.waitForFunction(() => !Ext.getCmp('str_NAME').isDisabled(), null, { timeout: 20000 });
      await liste('str_NAME', CIP);
      await liste('lg_MOTIF_RETOUR', motif.slice(0, 4), motif);
      await u.click('#int_QUANTITE-inputEl'); await u.keyboard.press('Control+A'); await u.keyboard.type('1');
      const rep = u.waitForResponse((r) => /retourfournisseur\/(new|add-item)/.test(r.url()), { timeout: 30000 });
      await u.keyboard.press('Enter'); /* l'ecran valide la ligne par Entree dans la quantite (bouton masque) */
      await rep; await u.waitForTimeout(1200);
    };
    await ajouter(LIB[0]);
    await ajouter(LIB[1]);
    const ecran = await u.evaluate(() => ({ lignes: Ext.getCmp('gridpanelID').getStore().getCount(),
      bandeau: Array.from(document.querySelectorAll('body *')).filter((e) => e.offsetParent && e.children.length === 0
        && /motif différent/.test(e.textContent)).map((e) => e.textContent).join(' | '),
      fenetres: Ext.WindowManager.getActive() ? Ext.WindowManager.getActive().title || '' : '' }));
    ok('Écran : même produit, deux motifs → deux lignes dans la grille', ecran.lignes === 2, JSON.stringify(ecran));
    ok('Écran : message « motif différent » en bandeau, aucune fenêtre à fermer', /Vous avez ajouté ce produit avec un motif différent/.test(ecran.bandeau)
      && !/Error|Message/.test(ecran.fenetres), JSON.stringify(ecran));
    ok('Écran : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Jeu d\'essai retiré, stock remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}' OR lg_BON_LIVRAISON_ID = '${M}B1'`) === '0'
      && q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PRODUIT}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK0.join('|'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
