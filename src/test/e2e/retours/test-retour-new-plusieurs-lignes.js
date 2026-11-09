/* RETOUR FOURNISSEUR CREE AVEC PLUSIEURS LIGNES (defaut suspecte de la demande 59, confirme le 09/11).
 * POST v1/retourfournisseur/new recoit une liste « items ». L'ecran web n'en envoie qu'une (les suivantes passent par
 * add-item) ; un client mobile peut en envoyer plusieurs. Avant : seule la premiere etait enregistree, sans message.
 * Regle : chaque ligne suit les memes controles que add-item (BL, quantite recue, stock, motif, lot) ; une seule ligne
 * refusee et rien n'est cree (tout ou rien).
 *  A. trois produits, quantites et motifs differents : trois lignes, base = reponse de l'ecran (retours-items),
 *     ligne par ligne ; rien ne sort du stock avant la validation ;
 *  B. meme produit deux fois, meme motif : une ligne, quantites ajoutees ; autre motif : une seconde ligne ;
 *  C. une ligne au-dela de la quantite recue : refus lisible, aucun retour cree ;
 *  D. une ligne d'un produit absent du BL : refus lisible, aucun retour cree ;
 *  E. une seule ligne : comme avant ; liste vide : refus lisible (avant : erreur 500) ;
 *  F. avec la cle client mobile (X-Client-Ref) envoyee deux fois : un seul retour, ses trois lignes une seule fois ;
 *  G. validation du retour A : chaque produit perd sa quantite, un mouvement par ligne (bilan avant / apres).
 * Jeu d'essai retire ; stocks remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-PLUSIEURS';
const STOCK_ESSAI = 20;
const debut = q('SELECT NOW()');
/* un BL de numero unique, au moins trois produits distincts, une seule ligne par produit, 4 recus au moins */
const BL = q("SELECT b.str_REF_LIVRAISON FROM t_bon_livraison b JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE b.str_STATUT <> 'delete' AND d.int_QTE_RECUE >= 4"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison_detail y WHERE y.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID AND y.lg_FAMILLE_ID = d.lg_FAMILLE_ID) = 1"
  /* aucun retour existant sur la ligne : le plafond du BL compte les autres retours */
  + " AND NOT EXISTS (SELECT 1 FROM t_retour_fournisseur_detail rd WHERE rd.bonLivraisonDetail_id = d.lg_BON_LIVRAISON_DETAIL)"
  + " GROUP BY b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON HAVING COUNT(DISTINCT d.lg_FAMILLE_ID) >= 3 ORDER BY MAX(b.dt_CREATED) DESC LIMIT 1");
const LIGNES = q(`SELECT CONCAT(d.lg_FAMILLE_ID, ':', d.int_QTE_RECUE) FROM t_bon_livraison b JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID
  JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE b.str_REF_LIVRAISON = '${BL}' AND d.int_QTE_RECUE >= 4
  AND NOT EXISTS (SELECT 1 FROM t_retour_fournisseur_detail rd WHERE rd.bonLivraisonDetail_id = d.lg_BON_LIVRAISON_DETAIL) ORDER BY d.lg_FAMILLE_ID LIMIT 3`).split('\n').filter(Boolean).map((l) => l.trim().split(':'));
const [P1, P2, P3] = LIGNES.map((l) => l[0]);
const RECUE2 = LIGNES[1] ? Number(LIGNES[1][1]) : 0;
const ABSENT = q(`SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'
  WHERE NOT EXISTS (SELECT 1 FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.str_REF_LIVRAISON = '${BL}' AND d.lg_FAMILLE_ID = f.lg_FAMILLE_ID) LIMIT 1`);
const [M1, M2] = q('SELECT lg_MOTIF_RETOUR FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 2').split('\n').map((x) => x.trim());
const PRODUITS = [P1, P2, P3].filter(Boolean);
const STOCK0 = {};
PRODUITS.forEach((pr) => { STOCK0[pr] = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`).split('|'); });
const stock = (pr) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`));
const retoursNote = () => Number(q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`));
/* lignes en base d'un retour, triees : produit:motif:quantite */
const lignesBase = (id) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':', lg_FAMILLE_ID, lg_MOTIF_RETOUR, int_NUMBER_RETURN) ORDER BY lg_FAMILLE_ID, lg_MOTIF_RETOUR SEPARATOR '|'), '')
  FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${id}'`);
const attendu = (l) => l.slice().sort().join('|');

function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`);
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'`).split('|').filter(Boolean);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE entity_ref IN (${ids}));`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM mobile_client_ref WHERE ref LIKE 'E2E-PLUSIEURS-%';`
    + (refs.length ? `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + refs.map((r) => `str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join(' OR ') + ');' : '')
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`);
}

(async () => {
  retirer();
  PRODUITS.forEach((pr) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK_ESSAI}, int_NUMBER = ${STOCK_ESSAI} WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`));
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext()).newPage();
  const api = (m, u, c, cle) => p.evaluate(async ([m, u, c, cle]) => {
    const h = { 'Content-Type': 'application/json' }; if (cle) { h['X-Client-Ref'] = cle; }
    const r = await fetch(u, { method: m, headers: h, body: c === undefined ? undefined : JSON.stringify(c) });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c, cle]);
  const nouveau = (items, cle) => api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items }, cle);
  const L = (produitId, lgMOTIFRETOUR, intNUMBERRETURN) => ({ produitId, lgMOTIFRETOUR, intNUMBERRETURN });
  const idDe = (r) => r && r.data && (r.data.lgRETOURFRSID || (r.data[0] || {}).lgRETOURFRSID);
  try {
    ok('Précondition : BL à trois produits, un produit absent, deux motifs', PRODUITS.length === 3 && !!ABSENT && !!M1 && !!M2 && M1 !== M2, BL + ' ' + PRODUITS.join(',') + ' ' + M1 + '/' + M2);
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });

    // A. trois produits
    const a = await nouveau([L(P1, M1, 2), L(P2, M1, 3), L(P3, M2, 1)]);
    const A = idDe(a);
    const attA = attendu([`${P1}:${M1}:2`, `${P2}:${M1}:3`, `${P3}:${M2}:1`]);
    ok('A. Trois lignes envoyées : retour créé avec ses trois lignes (produit, motif, quantité)', a.success === true && !!A && lignesBase(A) === attA, lignesBase(A) + ' ≠ ' + attA);
    const items = await api('GET', '../api/v1/retourfournisseur/retours-items?retourId=' + A);
    const ecran = attendu((items.data || []).map((d) => [d.produitId, d.motif, d.intNUMBERRETURN].join(':')));
    const baseLib = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':', d.lg_FAMILLE_ID, m.str_LIBELLE, d.int_NUMBER_RETURN) SEPARATOR '|'), '') FROM t_retour_fournisseur_detail d
      JOIN t_motif_retour m ON m.lg_MOTIF_RETOUR = d.lg_MOTIF_RETOUR WHERE d.lg_RETOUR_FRS_ID = '${A}'`).split('|');
    ok('A. Détail lu par l\'écran (retours-items) = base, ligne par ligne (produit, motif, quantité)', (items.data || []).length === 3 && ecran === attendu(baseLib), ecran + ' ≠ ' + attendu(baseLib));
    ok('A. Rien ne sort du stock avant la validation', PRODUITS.every((pr) => stock(pr) === STOCK_ESSAI), PRODUITS.map(stock).join(','));

    // G. validation du retour A : bilan avant / apres
    const ref = q(`SELECT str_REF_RETOUR_FRS FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${A}'`);
    const v = await api('POST', '../api/v1/produit/validerretourfour', { ref: A, refTwo: '', description: NOTE });
    ok('G. Validation : chaque produit perd sa quantité (20 → 18, 17, 19)', v.success === true && stock(P1) === 18 && stock(P2) === 17 && stock(P3) === 19, JSON.stringify(v).slice(0, 120) + ' ' + PRODUITS.map(stock).join(','));
    const mvts = q(`SELECT COUNT(*) FROM HMvtProduit WHERE pkey IN (SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${A}')`);
    const parLigne = q(`SELECT COUNT(DISTINCT pkey) FROM HMvtProduit WHERE pkey IN (SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${A}')`);
    ok('G. Un mouvement par ligne, ni plus ni moins (3)', mvts === '3' && parLigne === '3', mvts + ' / ' + parLigne + ' ' + ref);
    /* chaque cas part d'un BL sans retour (plafond) et d'un stock de 20 */
    const neuf = () => { retirer(); PRODUITS.forEach((pr) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK_ESSAI}, int_NUMBER = ${STOCK_ESSAI} WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`)); };
    neuf();

    // B. meme produit, meme motif puis autre motif
    const bb = await nouveau([L(P1, M1, 1), L(P1, M1, 2), L(P1, M2, 1)]);
    const B = idDe(bb);
    ok('B. Même produit et même motif : une ligne (1 + 2 = 3) ; autre motif : seconde ligne', bb.success === true && lignesBase(B) === attendu([`${P1}:${M1}:3`, `${P1}:${M2}:1`]), lignesBase(B));

    neuf();
    // C. quantite au-dela du recu
    const avantC = retoursNote();
    const c = await nouveau([L(P1, M1, 2), L(P2, M1, RECUE2 + 1)]);
    ok('C. Une ligne au-delà de la quantité reçue : refus lisible, aucun retour créé', c.success === false && /quantit/i.test(c.msg || '') && retoursNote() === avantC, JSON.stringify(c).slice(0, 200) + ' retours ' + avantC + '→' + retoursNote());

    // D. produit absent du BL en seconde ligne
    const d = await nouveau([L(P1, M1, 1), L(ABSENT, M1, 1)]);
    ok('D. Une ligne d\'un produit absent du BL : refus « pas sur le BL », aucun retour créé', d.success === false && /pas sur le BL/i.test(d.msg || '') && retoursNote() === avantC, JSON.stringify(d).slice(0, 200));

    // E. une seule ligne, liste vide
    const e = await nouveau([L(P3, M1, 1)]);
    ok('E. Une seule ligne : comme avant', e.success === true && lignesBase(idDe(e)) === `${P3}:${M1}:1`, lignesBase(idDe(e)));
    const vide = await nouveau([]);
    ok('E. Liste vide : refus lisible (HTTP 200), aucun retour créé', vide.http === 200 && vide.success === false && retoursNote() === avantC + 1, JSON.stringify(vide).slice(0, 160));

    neuf();
    // F. cle client mobile envoyee deux fois
    const f1 = await nouveau([L(P1, M2, 1), L(P2, M2, 2), L(P3, M1, 1)], 'E2E-PLUSIEURS-F');
    const f2 = await nouveau([L(P1, M2, 1), L(P2, M2, 2), L(P3, M1, 1)], 'E2E-PLUSIEURS-F');
    ok('F. Clé mobile envoyée deux fois : un seul retour, ses trois lignes une seule fois', idDe(f1) && idDe(f1) === idDe(f2) && retoursNote() === 1
      && lignesBase(idDe(f1)) === attendu([`${P1}:${M2}:1`, `${P2}:${M2}:2`, `${P3}:${M1}:1`]), idDe(f1) + ' / ' + idDe(f2) + ' ' + lignesBase(idDe(f1)));

  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    retirer();
    PRODUITS.forEach((pr) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${STOCK0[pr][0]}, int_NUMBER = ${STOCK0[pr][1]} WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`));
    ok('Jeu d\'essai retiré, stocks remis', retoursNote() === 0 && PRODUITS.every((pr) => String(stock(pr)) === STOCK0[pr][0])
      && q("SELECT COUNT(*) FROM mobile_client_ref WHERE ref LIKE 'E2E-PLUSIEURS-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
