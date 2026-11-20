/* CREATION DU BON DE LIVRAISON D'UNE GRANDE COMMANDE (journal de Pontmain, 13/11 23:51 : creerbl bloque 32 s).
 *
 * Photographie des fils : pour chaque ligne de la commande, creerBonLivraison lisait le stock du produit, et chaque
 * lecture faisait d'abord reverifier par Hibernate tout ce qui avait deja ete cree (lignes de BL, lignes de commande) :
 * un temps qui croit comme le carre du nombre de lignes.
 *
 * Parcours reel (admin) : GESTION DES COMMANDES > Commande en cours, icone « Créer le bon de livraisson » d'une
 * commande de N lignes, saisie au clavier, « Enregistrer ». Jeu varie : N produits differents avec du stock, quantites
 * de 1 a 7, un produit repete sur deux lignes, un produit sans stock dans l'emplacement (refuse et signale).
 * Attendu :
 *  - delai de creerbl sous le plafond ;
 *  - rapprochement ligne par ligne : une ligne de BL par ligne de commande avec stock, quantite commandee, stock
 *    initial = stock du produit en base, prix et PAF de la ligne de commande ;
 *  - la reponse (count, nb, codes refuses) = ce qui est en base ; le produit sans stock est le seul refuse ;
 *  - bilan : un BL, commande close, lignes avec stock en entree en stock, la ligne sans stock inchangee, stock des
 *    produits inchange ; jeu d'essai retire.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim(); /* SQL par l'entree : 300 lignes depassent la ligne de commande */
const N = Number(process.env.E2E_BL_LIGNES || 1000); /* ancien code : 2,9 s a 300 lignes, 15 s a 1 000 (poste local) */
const PLAFOND_MS = Number(process.env.E2E_BL_PLAFOND_MS || 5000);
const SUF = String(Date.now()).slice(-6);
const C = 'E2E-BLGRAND';
const REF = 'E2EBLG' + SUF;
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY lg_GROSSISTE_ID LIMIT 1");
const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + ` WHERE f.str_STATUT = 'enable' GROUP BY f.lg_FAMILLE_ID ORDER BY f.lg_FAMILLE_ID LIMIT ${N}`).split(/\r?\n/);
const SANS = q("SELECT f.lg_FAMILLE_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND NOT EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable') ORDER BY f.lg_FAMILLE_ID LIMIT 1");
/* lignes : N produits, puis le 1er produit une seconde fois, puis le produit sans stock */
const L = P.map((f, i) => ({ f, qte: 1 + (i % 7), paf: 500 + 37 * (i % 23) })).concat([{ f: P[0], qte: 4, paf: 900 }]).concat(SANS ? [{ f: SANS, qte: 2, paf: 700, sans: true }] : []);
const ids = "('" + P.concat(SANS ? [SANS] : []).join("','") + "')";
const stocks = () => q(`SELECT MD5(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', int_NUMBER_AVAILABLE, '/', int_NUMBER) ORDER BY lg_FAMILLE_STOCK_ID)) FROM t_famille_stock WHERE lg_FAMILLE_ID IN ${ids}`);

function nettoyer() {
  q(`DELETE d FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID = '${C}';`
    + ` DELETE FROM t_bon_livraison WHERE lg_ORDER_ID = '${C}'; DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${C}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${C}';`);
}

(async () => {
  nettoyer();
  const stock0 = stocks();
  const dispo = {};
  q(`SELECT lg_FAMILLE_ID, int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND str_STATUT = 'enable' AND lg_FAMILLE_ID IN ${ids}`)
    .split(/\r?\n/).filter(Boolean).forEach((l) => { const [f, n] = l.split('\t'); dispo[f] = n; });
  const total = L.reduce((t, l) => t + l.qte * l.paf, 0);
  q("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + ` VALUES ('${C}', '${C}${SUF}', ${L.length}, '${G}', (SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}' LIMIT 1), 'is_Process', NOW(), NOW(), ${total}, 0, 0)`);
  q("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, prixAchat, prixUnitaire, str_STATUT, dt_CREATED, dt_UPDATED) VALUES "
    + L.map((l, i) => `('${C}-${i}', '${C}', '${l.f}', '${G}', ${l.qte}, ${l.qte * l.paf}, ${l.paf}, ${2 * l.paf}, ${l.paf}, ${2 * l.paf}, 'is_Process', NOW(), NOW())`).join(','));
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [];
  let t0 = 0, duree = -1, reponse = null;
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  p.on('request', (r) => { if (r.url().includes('commande/creerbl')) { t0 = Date.now(); } });
  p.on('response', async (r) => { if (r.url().includes('commande/creerbl')) { duree = Date.now() - t0; try { reponse = await r.json(); } catch (e) { reponse = { illisible: true }; } } });
  try {
    ok(`Jeu d'essai : ${N} produits avec stock, un produit sans stock, ${L.length} lignes`, P.length === N && !!SANS && Object.keys(dispo).length === N, P.length + ' / ' + SANS);
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Commande en cours');
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').some((x) => x.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const champ = p.locator('#rechecher-inputEl');
    await champ.click(); await champ.fill(''); await p.keyboard.type(C + SUF, { delay: 15 }); await p.keyboard.press('Enter');
    const ligne = p.locator('.x-grid-row').filter({ visible: true, hasText: C + SUF }).first();
    await ligne.waitFor({ timeout: 30000 });
    await ligne.locator('img[data-qtip="Créer le bon de livraisson"]').click();
    await p.waitForFunction(() => Ext.getCmp('str_REF_LIVRAISON') && Ext.getCmp('str_REF_LIVRAISON').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const montant = await p.evaluate(() => String(window.montantachat));
    const saisir = async (id, v) => { const c = p.locator('#' + id + '-inputEl'); await c.click(); await c.fill(''); await p.keyboard.type(v, { delay: 15 }); };
    await saisir('str_REF_LIVRAISON', REF);
    await saisir('int_MHT', montant);
    await saisir('int_TVA', '0');
    await p.locator('.x-window').filter({ visible: true, hasText: 'Saisie du bon de livraison' }).getByText('Enregistrer', { exact: true }).click();
    const fin = Date.now() + 180000;
    while (reponse === null && Date.now() < fin) { await p.waitForTimeout(250); }
    ok(`Délai de creerbl (${L.length} lignes) sous ${PLAFOND_MS} ms`, duree >= 0 && duree < PLAFOND_MS, duree + ' ms');
    await p.waitForTimeout(2500);

    /* rapprochement ligne par ligne */
    const enBase = q(`SELECT d.lg_FAMILLE_ID, d.int_QTE_CMDE, d.int_INITSTOCK, d.int_PAF, d.int_PRIX_REFERENCE FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID = '${C}'`)
      .split(/\r?\n/).filter(Boolean).map((x) => x.split('\t').join(':')).sort();
    const attendu = L.filter((l) => !l.sans).map((l) => [l.f, l.qte, dispo[l.f], l.paf, 2 * l.paf].join(':')).sort();
    const ecarts = attendu.filter((x, i) => enBase[i] !== x).slice(0, 3);
    ok('Rapprochement : une ligne de BL par ligne de commande avec stock (produit répété compris), quantité, stock initial, PAF et prix',
      enBase.length === attendu.length && ecarts.length === 0, enBase.length + ' / ' + attendu.length + ' ' + ecarts.join(' | '));
    const cipSans = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${SANS}'`);
    ok('Réponse = base : count, nb, produit sans stock seul refusé', reponse && reponse.success === true && reponse.count === attendu.length && reponse.nb === 1
      && Array.isArray(reponse.data) && reponse.data.length === 1 && String(reponse.data[0]) === cipSans, JSON.stringify(reponse).slice(0, 200));
    ok('Bilan : un BL, avec la référence saisie', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${C}'`) === '1'
      && q(`SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_ORDER_ID = '${C}'`) === REF);
    ok('Bilan : commande close, lignes avec stock en entrée en stock, ligne sans stock inchangée', q(`SELECT str_STATUT FROM t_order WHERE lg_ORDER_ID = '${C}'`) === 'is_Closed'
      && q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID = '${C}' AND str_STATUT = 'ENTREE_STOCK'`) === String(attendu.length)
      && q(`SELECT str_STATUT FROM t_order_detail WHERE lg_ORDER_ID = '${C}' AND lg_FAMILLE_ID = '${SANS}'`) === 'is_Process',
      q(`SELECT GROUP_CONCAT(DISTINCT str_STATUT) FROM t_order_detail WHERE lg_ORDER_ID = '${C}'`));
    ok('Bilan : stock des produits inchangé', stocks() === stock0);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, stock inchangé', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${C}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${C}'`) === '0' && stocks() === stock0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
