/* ENTREE EN STOCK D'UN BL : BILAN AVANT / APRES, LIGNE PAR LIGNE (chantier de performance de validerbl, 13/11).
 *
 * Filet du chantier : l'entree doit laisser exactement les memes traces avant et apres l'optimisation, avec une seule
 * difference voulue : UNE notification « Entrée quantité UG » par bon (avant : une par ligne a partir de la premiere
 * ligne avec UG, chacune avec la liste cumulee).
 * Vrai chemin : menu > Bon de livraison, icone « Detail livraison », « ENTREE EN STOCK », « Oui » aux UG, « Oui » a la
 * confirmation, « Non » a l'impression, « Non » aux etiquettes.
 *
 * Bon d'essai de 6 lignes, 5 produits (hors reserve, sans controle de peremption, hors prix tableau) :
 *   D1 A : commande 4, UG 1, deux lots (3 et 2 dont 1 gratuite)    -> entree 5, UG 1
 *   D2 B : commande 2, sans lot                                      -> lot cree de 2, entree 2
 *   D3 C : commande 3, UG 2, un lot de 5 dont 2 gratuites            -> entree 5, UG 2
 *   D4 B : commande 1, sans lot, MEME produit que D2                 -> trouve le lot cree en D2 : entree 1
 *   D5 D : commande 6, un lot de 6                                   -> entree 6
 *   D6 E : commande 1, un lot de 1, prix d'achat +10, prix de vente +55 -> prix de la fiche mis a jour
 * Regles verifiees : stock = avant + entrees (et int_UG + UG) ; un mouvement par ligne (qteMvt, ug, qteDebut,
 * qteFinale = qteDebut + qteMvt) ; lots (quantite, gratuites, reste = quantite) ; lignes closes (recue, UG, manquant) ;
 * fiche : PAF = PAF de la ligne, prix, PMP = (stock x ancien PMP + payes x PA) / (stock + entree), taux de marque ;
 * prix grossiste ; une transaction BL ; journal (2 UG + 1 entree) ; notifications : 1 entree en stock, 1 UG a 2
 * produits. Tout est retire a la fin, produits et stocks remis a l'identique.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, cliquer, attendreMessage, repondre } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const DB = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', DB, '-e', s], { encoding: 'utf8' });

const SUF = String(Date.now()).slice(-6);
const BL = 'E2E-BIL-BL-' + SUF, ORD = 'E2E-BIL-ORD-' + SUF, REF = 'E2EBIL' + SUF;
const debut = q('SELECT NOW()');
const CANDIDATS = " FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND f.bool_RESERVE = 0 AND f.int_PRICE > 100 AND f.int_PAF > 0 AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 500"
  + " AND COALESCE(f.bool_CHECKEXPIRATIONDATE, 0) = 0 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND (f.int_T IS NULL OR f.int_T = '')"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND x.lg_EMPLACEMENT_ID = '1') = 1";
const G = q('SELECT f.lg_GROSSISTE_ID' + CANDIDATS + ' AND f.lg_GROSSISTE_ID IS NOT NULL GROUP BY f.lg_GROSSISTE_ID ORDER BY COUNT(*) DESC LIMIT 1');
const P = q(`SELECT f.lg_FAMILLE_ID${CANDIDATS} AND f.lg_GROSSISTE_ID = '${G}' ORDER BY f.lg_FAMILLE_ID LIMIT 5 OFFSET 7`).split('\n').filter(Boolean);
const [A, B, C, D, E] = P;
const LISTE = P.map((x) => `'${x}'`).join(',');
/* id, produit, commande, UG, ecart de PAF, ecart de prix de vente, lots [quantite, gratuites] */
const LIGNES = [['D1', A, 4, 1, 0, 0, [[3, 0], [2, 1]]], ['D2', B, 2, 0, 0, 0, []], ['D3', C, 3, 2, 0, 0, [[5, 2]]],
  ['D4', B, 1, 0, 0, 0, []], ['D5', D, 6, 0, 0, 0, [[6, 0]]], ['D6', E, 1, 0, 10, 55, [[1, 0]]]]
  /* BILAN_SANS_REPETE=1 : sans la ligne D4 (produit repete), pour comparer avec l'ancien code, qui echoue sur D4 */
  .filter((l) => !(process.env.BILAN_SANS_REPETE === '1' && l[0] === 'D4'));
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste'];

function retirer() {
  exec(`DELETE FROM HMvtProduit WHERE pkey LIKE '${BL}-D%'; DELETE FROM MvtTransaction WHERE pkey = '${BL}';`
    + `DELETE e FROM t_etiquette e JOIN t_warehouse w ON w.str_CODE_ETIQUETTE = e.str_CODE AND w.lg_FAMILLE_ID = e.lg_FAMILLE_ID`
    + ` AND ABS(TIMESTAMPDIFF(SECOND, w.dt_CREATED, e.dt_CREATED)) <= 2 WHERE w.str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = '${REF}';`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'; DELETE FROM notification WHERE entity_ref = '${BL}';`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%';`
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BL}'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}';`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${ORD}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${ORD}';`);
}
function remettre() {
  retirer();
  if (P.length !== 5) { return; }
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_bil_t_famille'") === '1') {
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_bil_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_bil_${t};`);
    });
  }
  exec(`DELETE FROM t_famille_history WHERE lg_FAMILLE_ID IN (${LISTE}) AND dt_CREATED >= '${debut}';`);
}
function creer() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_bil_${t}; CREATE TABLE e2e_bil_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${LISTE});`));
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${ORD}', '${REF}', ${LIGNES.length}, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${BL}', '${REF}', NOW(), 1000, 0, 1000, '${ORD}', 'enable', NOW(), NOW(), u.lg_USER_ID FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + LIGNES.map(([d, f, cmde, ug, dPaf, dPrix], i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE,`
      + ` int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
      + ` SELECT '${BL}-${d}', '${G}', f.lg_FAMILLE_ID, '${BL}', ${cmde}, ${ug}, 0, f.int_PRICE, f.int_PRICE + ${dPrix}, f.int_PAF + ${dPaf}, f.int_PAF + ${dPaf}, f.lg_ZONE_GEO_ID, 'enable',`
      + ` NOW() + INTERVAL ${i} SECOND, NOW(), 0, 0, s.int_NUMBER_AVAILABLE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${f}';`
      /* le declencheur t_bon_livraison_detail_before_insert remet int_QTE_UG a 0 ; a l'ecran, la saisie d'un lot avec des
         gratuites ecrit les UG de la ligne (OrderServiceImpl) : meme ecriture ici */
      + `UPDATE t_bon_livraison_detail SET int_QTE_UG = ${ug} WHERE lg_BON_LIVRAISON_DETAIL = '${BL}-${d}';`).join('')
    + LIGNES.flatMap(([d, f, , , , , lots]) => lots.map(([n, gr], j) => `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_GRATUIT,`
      + ` str_REF_LIVRAISON, str_STATUT, dt_CREATED, dt_UPDATED, dt_PEREMPTION, int_QTY_VENDUE, current_stock) SELECT 'E2E-BIL-${SUF}-${d}-${j}', u.lg_USER_ID, '${f}', '${G}', 'L${d}${j}', ${n}, ${gr},`
      + ` '${REF}', 'enable', NOW(), NOW(), CURDATE() + INTERVAL 2 YEAR, 0, NULL FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`)).join(''));
}
const fiche = (f) => q(`SELECT CONCAT_WS('|', s.int_NUMBER_AVAILABLE, s.int_NUMBER, IFNULL(s.int_UG, 0), f.int_PAF, f.int_PRICE, IFNULL(f.dbl_PRIX_MOYEN_PONDERE, 0), IFNULL(f.int_TAUX_MARQUE, ''),`
  + ` IFNULL((SELECT g.int_PAF FROM t_famille_grossiste g WHERE g.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND g.lg_GROSSISTE_ID = '${G}' AND g.str_STATUT = 'enable' LIMIT 1), ''))`
  + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${f}'`).split('|');

(async () => {
  ok('Précondition : 5 produits candidats d\'un même grossiste', P.length === 5, P.length + ' ' + G);
  if (P.length !== 5) { process.exit(1); }
  creer();
  const avant = {};
  P.forEach((f) => { avant[f] = fiche(f).map((x, i) => (i === 6 || i === 7) ? x : Number(x)); });
  const ligneAvant = {};
  LIGNES.forEach(([d]) => { ligneAvant[d] = q(`SELECT CONCAT_WS('|', int_PAF, int_PRIX_VENTE) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${BL}-${d}'`).split('|').map(Number); });
  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    const erreurs = []; p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'bonlivraisonmanager', true); return [n.parentNode.get('text'), n.get('text')]; });
    await require('../outils/vues').ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && g.getStore().findExact('lg_BON_LIVRAISON_ID', bl) >= 0; }, BL, { timeout: 120000 });
    const icone = await p.evaluate((bl) => { const g = Ext.ComponentQuery.query('bonlivraisonmanager')[0], v = g.getView();
      const n = v.getNode(g.getStore().findExact('lg_BON_LIVRAISON_ID', bl)); n.scrollIntoView();
      const img = n.querySelector('img.x-action-col-0'); img.id = img.id || 'e2e-detail-bl'; return img.id; }, BL);
    await p.click('#' + icone);
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible(true), null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await cliquer(p, '#btn_enterstock');
    if (!await attendreMessage(p, 'UNITÉS GRATUITES', 20000)) { throw new Error('question des unités gratuites absente'); }
    await repondre(p, 'yes');
    if (!await attendreMessage(p, "Confirmer l'entrée en stock", 20000)) { throw new Error('confirmation absente'); }
    await repondre(p, 'yes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('avoirsbonfenetre').length > 0
      || Ext.ComponentQuery.query('messagebox{isVisible()}').some((m) => /impression des entrées/.test(m.el.dom.textContent)), null, { timeout: 120000 }).catch(() => {});
    if (await p.evaluate(() => Ext.ComponentQuery.query('avoirsbonfenetre').length > 0)) {
      await p.waitForFunction(() => /vc-tableau|vc-vide/.test(Ext.ComponentQuery.query('avoirsbonfenetre')[0].getEl().dom.innerHTML), null, { timeout: 60000 });
      await p.click('.vc-pied [data-action=fermer]');
    }
    if (!await attendreMessage(p, 'impression des entrées', 60000)) { throw new Error('pas de question d\'impression après l\'entrée : '
      + await p.evaluate(() => Ext.ComponentQuery.query('messagebox{isVisible()}').map((m) => m.el.dom.textContent).join(' | '))); }
    await repondre(p, 'no');
    if (await attendreMessage(p, 'imprimer les étiquettes', 20000)) { await repondre(p, 'no'); }
    await p.waitForTimeout(1500);

    /* ---- bilan ---- */
    ok('Bon clôturé', q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === 'is_Closed');
    /* quantites attendues par les regles de l'entree */
    const attendu = {}; // produit -> {entree, ug, payes, lignes}
    const lotsCrees = {};
    const parLigne = {};
    LIGNES.forEach(([d, f, cmde, ug, , , lots]) => {
      let L = lots.slice();
      if (!L.length && lotsCrees[f]) { L = lotsCrees[f]; }
      let entree, gratuites;
      if (!L.length) { entree = cmde; gratuites = 0; lotsCrees[f] = [[cmde, 0]]; } else {
        const total = L.reduce((s, x) => s + x[0], 0); entree = Math.min(total, cmde + ug); gratuites = L.reduce((s, x) => s + x[1], 0);
      }
      parLigne[d] = { f, entree, gratuites, cmde };
      const a = attendu[f] || (attendu[f] = { entree: 0, ug: 0, lignes: [] });
      a.entree += entree; a.ug += gratuites; a.lignes.push(d);
    });
    /* stock */
    for (const f of P) {
      const ap = fiche(f), av = avant[f], a = attendu[f];
      ok(`Stock ${f} : disponible et total = avant + ${a.entree}, UG + ${a.ug}`, Number(ap[0]) === av[0] + a.entree && Number(ap[1]) === av[0] + a.entree && Number(ap[2]) === av[2] + a.ug, av.slice(0, 3).join('/') + ' -> ' + ap.slice(0, 3).join('/'));
    }
    /* mouvements : un par ligne */
    let stockCourant = {};
    P.forEach((f) => { stockCourant[f] = avant[f][0]; });
    for (const [d] of LIGNES) {
      const l = parLigne[d];
      const m = q(`SELECT CONCAT_WS('|', COUNT(*), MAX(qteMvt), MAX(qteDebut), MAX(qteFinale), MAX(typeMvt)) FROM HMvtProduit WHERE pkey = '${BL}-${d}'`).split('|');
      ok(`Mouvement ${d} : un seul, qteMvt ${l.entree}, qteDebut = stock courant, qteFinale = qteDebut + qteMvt`,
        m[0] === '1' && Number(m[1]) === l.entree && Number(m[2]) === stockCourant[l.f] && Number(m[3]) === stockCourant[l.f] + l.entree, m.join('|'));
      stockCourant[l.f] += l.entree;
    }
    /* lignes du bon */
    for (const [d, , cmde, ug, , , lots] of LIGNES) {
      const l = q(`SELECT CONCAT_WS('|', str_STATUT, int_QTE_RECUE, int_QTE_UG, int_QTE_MANQUANT) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '${BL}-${d}'`);
      const sansLot = !lots.length && !(d === 'D4');
      const attenduL = sansLot ? `is_Closed|${cmde}|0|0` : `is_Closed|0|${ug}|0`;
      ok(`Ligne ${d} close (reçue, UG, manquant)`, l === attenduL, l + ' attendu ' + attenduL);
    }
    /* lots */
    const lots = (f) => q(`SELECT GROUP_CONCAT(CONCAT_WS(':', int_NUMBER, int_NUMBER_GRATUIT, current_stock, str_STATUT) ORDER BY int_NUMBER DESC, int_NUMBER_GRATUIT) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}' AND lg_FAMILLE_ID = '${f}'`);
    ok('Lots de A : 3:0:3 et 2:1:2', lots(A) === '3:0:3:enable,2:1:2:enable', lots(A));
    ok('Lots de B : un seul lot créé (2), repris par la ligne répétée', lots(B) === '2:0:2:enable', lots(B));
    ok('Lots de C, D, E', lots(C) === '5:2:5:enable' && lots(D) === '6:0:6:enable' && lots(E) === '1:0:1:enable', [lots(C), lots(D), lots(E)].join(' / '));
    /* fiche : PAF, prix, PMP, taux de marque, prix grossiste */
    for (const f of P) {
      const ap = fiche(f), av = avant[f], a = attendu[f];
      const derniere = a.lignes[a.lignes.length - 1], [paf, prixV] = ligneAvant[derniere];
      let pmp = av[5] > 0 ? av[5] : av[3], st = av[0];
      for (const d of a.lignes) {
        const l = parLigne[d], pa = ligneAvant[d][0], payes = Math.max(0, l.entree - l.gratuites);
        pmp = st <= 0 ? Math.round(payes * pa / l.entree) : Math.round((st * pmp + payes * pa) / (st + l.entree));
        st += l.entree;
      }
      const prix = prixV > av[4] ? prixV : av[4];
      const taux = Math.round((prix - paf) * 100 / prix);
      const okFiche = Number(ap[3]) === paf && Number(ap[4]) === prix && Number(ap[5]) === pmp && Number(ap[6]) === taux && (ap[7] === '' || Number(ap[7]) === paf);
      ok(`Fiche ${f} : PAF ${paf}, prix ${prix}, PMP ${pmp}, taux ${taux}, prix grossiste`, okFiche, ap.slice(3).join('/'));
    }
    /* transaction, journal, notifications */
    ok('Une transaction BL', q(`SELECT COUNT(*) FROM MvtTransaction WHERE pkey = '${BL}'`) === '1');
    ok('Journal : 2 entrées UG et 1 entrée en stock', q(`SELECT COUNT(*) FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%'`) === '3',
      q(`SELECT GROUP_CONCAT(LEFT(str_DESCRIPTION, 40) SEPARATOR ' / ') FROM t_event_log WHERE dt_CREATED >= '${debut}' AND str_DESCRIPTION LIKE '%${REF}%'`));
    const notifs = q(`SELECT GROUP_CONCAT(CONCAT(type_notification, ':', ROUND((LENGTH(donnees) - LENGTH(REPLACE(donnees, '"quantite"', ''))) / 10)) ORDER BY created_at SEPARATOR ',') FROM notification WHERE entity_ref = '${BL}'`);
    const ug = notifs.split(',').filter((x) => x.startsWith('15:'));
    ok('Notifications : une seule « Entrée quantité UG » pour le bon', ug.length === 1, notifs);
    ok('Notification UG : les 2 produits avec UG (A et C)', ug.length >= 1 && /^15:2$/.test(ug[ug.length - 1]), notifs);
    ok('Notifications : une entrée en stock', notifs.split(',').filter((x) => !x.startsWith('15:')).length === 1, notifs);
    ok('Aucune erreur JavaScript', erreurs.length === 0, JSON.stringify(erreurs.slice(0, 3)));
  } catch (e) {
    ok('Le test va jusqu\'au bout', false, String(e && e.stack).slice(0, 600));
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produits remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BL}'`) === '0'
      && q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey LIKE '${BL}%'`) === '0' && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
