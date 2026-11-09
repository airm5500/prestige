/* RETOURS FOURNISSEURS : CORRECTION APRES REFUS, PLUSIEURS LOTS ET MOTIFS, VALIDATION (transmission du 07/11, point 2
 * et tests attendus « plusieurs lignes, quantites superieures a 1, plusieurs lots et motifs », « web et mobile »).
 *
 * 1. Web, par les clics : un retour refuse (2 lignes, 3 et 2 boites, deux motifs) est rouvert depuis la liste ; le motif
 *    du refus reste affiche ; la quantite d'une ligne est corrigee dans la grille (3 -> 2), une ligne est supprimee
 *    (confirmation sur l'icone), une ligne est ajoutee avec un autre motif ; « Remettre en attente », puis « Valider le
 *    retour » (confirmation dans le bouton). Bilan : une sortie de stock par ligne, de la bonne quantite, un mouvement
 *    par ligne, historique refus / remise en attente / validation.
 * 2. Mobile (routes de l'application mobile) : un retour sur deux lots recus du BL ; refuse ; corrige (ligne d'un lot
 *    retiree puis reprise avec un autre motif, quantite corrigee) ; remis en attente ; valide. Chaque lot perd ses
 *    boites, le stock du produit perd le total, un mouvement par ligne ; une seconde validation ne change rien.
 * 3. Un retour valide ou abandonne ne se modifie plus : ajout, correction et suppression de ligne refuses (409 ETAT),
 *    lignes, stock, lots et mouvements inchanges. Ce point echoue sur l'ancien code (lignes modifiables).
 * Tout est retire a la fin : retours, historique, mouvements, lots d'essai ; stock remis.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir } = require('../outils/vues');
const privilegeEssai = require('../support/privilege-essai');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const NOTE = 'E2E-RETOUR-CORR';
const MOTIF_REFUS = 'Quantités et lots à revoir (essai)';
const LOT_A = 'E2ERCL-A', LOT_B = 'E2ERCL-B';
const debut = q('SELECT NOW()');
const droit = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_VALIDER_RETOUR_FRS');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
/* un BL clos dont deux produits ont au moins 4 boites recues et du stock */
const lignesBl = q("SELECT CONCAT_WS('|', b.str_REF_LIVRAISON, d.lg_FAMILLE_ID, f.int_CIP) FROM t_bon_livraison b"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.int_NUMBER_AVAILABLE > 8"
  + " WHERE d.int_QTE_RECUE >= 4 AND b.str_STATUT <> 'delete'"
  + " AND (SELECT COUNT(*) FROM t_bon_livraison x WHERE x.str_REF_LIVRAISON = b.str_REF_LIVRAISON) = 1"
  + " AND b.lg_BON_LIVRAISON_ID = (SELECT y.lg_BON_LIVRAISON_ID FROM t_bon_livraison_detail y JOIN t_bon_livraison z ON z.lg_BON_LIVRAISON_ID = y.lg_BON_LIVRAISON_ID"
  + "   JOIN t_famille_stock t ON t.lg_FAMILLE_ID = y.lg_FAMILLE_ID AND t.lg_EMPLACEMENT_ID = '1' AND t.int_NUMBER_AVAILABLE > 8"
  + "   WHERE y.int_QTE_RECUE >= 4 AND z.str_STATUT <> 'delete' AND (SELECT COUNT(*) FROM t_bon_livraison w WHERE w.str_REF_LIVRAISON = z.str_REF_LIVRAISON) = 1"
  + "   GROUP BY y.lg_BON_LIVRAISON_ID HAVING COUNT(DISTINCT y.lg_FAMILLE_ID) >= 2 ORDER BY MAX(z.dt_CREATED) DESC LIMIT 1 OFFSET 1)"
  + " ORDER BY d.lg_FAMILLE_ID LIMIT 2").split(/\r?\n/).filter(Boolean).map((l) => l.split('|'));
const BL = lignesBl[0] && lignesBl[0][0], P1 = lignesBl[0] && lignesBl[0][1], P2 = lignesBl[1] && lignesBl[1][1], CIP2 = lignesBl[1] && lignesBl[1][2];
const motifs = q("SELECT CONCAT_WS('|', lg_MOTIF_RETOUR, str_LIBELLE) FROM t_motif_retour ORDER BY lg_MOTIF_RETOUR LIMIT 2").split(/\r?\n/).map((l) => l.split('|'));
const [M1, LIB1] = motifs[0] || [], [M2] = motifs[1] || [];
const stockDe = (pr) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`));
const mvtsDe = (pr) => Number(q(`SELECT COUNT(*) FROM HMvtProduit WHERE lg_FAMILLE_ID = '${pr}'`));
const etat = (id) => q(`SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${id}'`);
const historique = (id) => q(`SELECT IFNULL(GROUP_CONCAT(action ORDER BY dt_ACTION, ordre SEPARATOR '|'), '') FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID = '${id}'`);
/* lignes du retour : produit:motif:lot:quantite, triees */
const lignes = (id) => q(`SELECT IFNULL(GROUP_CONCAT(x ORDER BY x SEPARATOR ','), '') FROM (SELECT CONCAT_WS(':', IF(d.lg_FAMILLE_ID = '${P1}', 'P1', 'P2'),`
  + ` IF(d.lg_MOTIF_RETOUR = '${M1}', 'M1', 'M2'), IFNULL(d.num_lot, '-'), d.int_NUMBER_RETURN) x FROM t_retour_fournisseur_detail d WHERE d.lg_RETOUR_FRS_ID = '${id}') t`);
const lotStock = (num) => Number(q(`SELECT IFNULL(current_stock, int_NUMBER) FROM t_lot WHERE int_NUM_LOT = '${num}' AND str_REF_LIVRAISON = '${BL}' AND lg_FAMILLE_ID = '${P1}'`));
const STOCK1 = stockDe(P1), STOCK2 = stockDe(P2), MVT1 = mvtsDe(P1), MVT2 = mvtsDe(P2);

/* retours du test : par leur commentaire, et par leur identifiant (un commentaire efface ne laisse rien) */
const idsCrees = [];
const parId = () => (idsCrees.length ? ` OR lg_RETOUR_FRS_ID IN (${idsCrees.map((x) => `'${x}'`).join(',')})` : '');
function retirer() {
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_ID, "'")), "''") FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`);
  const refs = q(`SELECT IFNULL(GROUP_CONCAT(str_REF_RETOUR_FRS SEPARATOR '|'), '') FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`).split('|').filter(Boolean);
  const det = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT("'", lg_RETOUR_FRS_DETAIL, "'")), "''") FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids})`);
  exec(`DELETE FROM HMvtProduit WHERE pkey IN (${det});`
    + `DELETE FROM notification WHERE entity_ref IN (${ids});`
    + `DELETE FROM t_retour_fournisseur_historique WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + (refs.length ? `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (` + refs.map((r) => `str_DESCRIPTION LIKE '%${r}%' OR str_TYPE_LOG = '${r}'`).join(' OR ') + ');' : '')
    + `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${ids});`
    + `DELETE FROM t_lot WHERE int_NUM_LOT IN ('${LOT_A}', '${LOT_B}');`);
}
function remettreStock() {
  for (const [pr, s0] of [[P1, STOCK1], [P2, STOCK2]]) {
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${s0}, int_NUMBER = ${s0} WHERE lg_FAMILLE_ID = '${pr}' AND lg_EMPLACEMENT_ID = '1'`);
  }
}

(async () => {
  droit.remettre();
  retirer();
  const b = await ENV_E2E.lancer(chromium);
  const err = [], dialogues = [];
  let p;
  const ids = {};
  try {
    ok('Précondition : un BL avec deux produits en stock, deux motifs', !!BL && !!P1 && !!P2 && !!CIP2 && !!M1 && !!M2 && !!LIB1, [BL, P1, P2, M1, M2].join(' '));
    /* deux lots recus du BL pour le premier produit, 5 boites chacun (lots d'essai, retires a la fin) */
    for (const n of [LOT_A, LOT_B]) {
      exec("INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock, str_REF_LIVRAISON)"
        + ` VALUES ('${n}', '${ADMIN}', '${P1}', '${n}', 5, NOW(), NOW(), DATE_ADD(CURDATE(), INTERVAL 2 YEAR), 'enable', 5, '${BL}')`);
    }
    p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForTimeout(3000);
    const api = (m, u, c) => p.evaluate(async ([m, u, c]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c === undefined ? undefined : JSON.stringify(c) });
      let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { status: r.status, j }; }, [m, u, c]);
    /* creation comme l'ecran : premiere ligne par « new », les suivantes par « add-item » */
    const creer = async (items) => { const r = await api('POST', '../api/v1/retourfournisseur/new', { lgBONLIVRAISONID: BL, strCOMMENTAIRE: NOTE, items: items.slice(0, 1) });
      const id = r.j && r.j.data && r.j.data.lgRETOURFRSID;
      for (const it of items.slice(1)) { if (id) { await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: id, ...it }); } }
      if (id) { idsCrees.push(id); }
      return id; };
    const attendreEtat = async (id, s) => { for (let i = 0; i < 40 && etat(id) !== s; i++) { await p.waitForTimeout(500); } return etat(id); };
    const boite = () => p.evaluate(() => Ext.ComponentQuery.query('messagebox').some((m) => m.isVisible()));
    const deuxClics = async (sel) => {
      await cliquer(p, sel);
      await p.waitForTimeout(300);
      const arme = await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].getText(), sel);
      const b1 = await boite();
      await cliquer(p, sel);
      return { arme, boite: b1 };
    };
    /* liste des retours (tous les etats), puis ouverture du retour par l'icone de sa ligne */
    const ouvrirRetour = async (id) => {
      await p.waitForFunction(() => { const s = Ext.getCmp('btn_save'); return !s || s.isDestroyed || !s.isVisible(true); }, null, { timeout: 8000 }).catch(() => {});
      if (!(await p.evaluate(() => Ext.ComponentQuery.query('retourfrsmanager').some((g) => g.isVisible(true))))) {
        await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Retour fournisseur');
      }
      await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0]; return g && g.isVisible(true) && !g.getStore().isLoading() && Ext.getCmp('retourFrsEtat'); }, null, { timeout: 60000 });
      await choisir(p, '#retourFrsEtat', 'Tous les états');
      await p.waitForTimeout(400);
      await p.waitForFunction(() => !Ext.ComponentQuery.query('retourfrsmanager')[0].getStore().isLoading(), null, { timeout: 60000 });
      await p.waitForTimeout(500);
      const icone = await p.evaluate((id) => { const g = Ext.ComponentQuery.query('retourfrsmanager')[0], st = g.getStore(), i = st.findExact('lg_RETOUR_FRS_ID', id);
        if (i < 0) { return false; }
        const n = g.getView().getNode(st.getAt(i)), img = [...n.querySelectorAll('img.act-modifier, img[src*="page_white_edit"]')].find((x) => !x.classList.contains('x-hide-display'));
        if (img) { img.id = 'e2e-ouvrir-retour'; } return !!img; }, id);
      if (!icone) { return false; }
      await p.click('#e2e-ouvrir-retour');
      await p.waitForFunction(() => { const s = Ext.getCmp('btn_save'); return s && !s.isDestroyed && Ext.getCmp('btn_attente'); }, null, { timeout: 30000 });
      await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      return true;
    };
    const grille = () => p.evaluate(() => Ext.getCmp('gridpanelID').getStore().getRange().map((r) => r.get('intCIP') + ':' + r.get('intNUMBERRETURN')).sort().join(','));
    const attendreGrille = async (n) => { for (let i = 0; i < 30; i++) { const g = await grille(); if (g.split(',').filter(Boolean).length === n) { return g; } await p.waitForTimeout(500); } return grille(); };

    /* ===== 1. web : correction par les clics ===== */
    ids.RW = await creer([{ produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 3 }, { produitId: P2, lgMOTIFRETOUR: M2, intNUMBERRETURN: 2 }]);
    await api('POST', '../api/v1/retourfournisseur/mettre-en-attente', { description: NOTE, ref: ids.RW });
    const rf = await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RW, { motif: MOTIF_REFUS });
    ok('Web : retour refusé (2 lignes : 3 et 2 boîtes)', rf.j && rf.j.success && etat(ids.RW) === 'is_Refused' && lignes(ids.RW) === 'P1:M2:-:3,P2:M2:-:2', lignes(ids.RW));
    const ouvert = await ouvrirRetour(ids.RW);
    const info = await p.evaluate(() => { const c = Ext.getCmp('retourRefusInfo'); return c && c.isVisible() ? c.getEl().dom.textContent : ''; });
    ok('Web : retour refusé rouvert depuis la liste, motif du refus affiché pendant la correction', ouvert && info.includes(MOTIF_REFUS), info);
    /* quantite corrigee dans la grille : 3 -> 2 sur la ligne du premier produit */
    const cellule = await p.evaluate((p1) => { const g = Ext.getCmp('gridpanelID'), st = g.getStore(), r = st.getAt(st.findBy((x) => x.get('intNUMBERRETURN') === 3 || x.get('intNUMBERRETURN') === '3'));
      const col = g.columns.find((c) => c.dataIndex === 'intNUMBERRETURN'); const td = g.getView().getCell(r, col); td.dom.id = 'e2e-cellule-qte'; return !!td; }, P1);
    await p.click('#e2e-cellule-qte');
    await p.waitForTimeout(400);
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2', { delay: 30 });
    await p.keyboard.press('Enter');
    for (let i = 0; i < 20 && lignes(ids.RW) !== 'P1:M2:-:2,P2:M2:-:2'; i++) { await p.waitForTimeout(500); }
    ok('Web : quantité corrigée dans la grille (3 → 2), toujours refusé', cellule && lignes(ids.RW) === 'P1:M2:-:2,P2:M2:-:2' && etat(ids.RW) === 'is_Refused', lignes(ids.RW));
    await attendreGrille(2);
    /* ligne du second produit supprimee : icone, puis confirmation sur l'icone */
    await p.evaluate((cip) => { const g = Ext.getCmp('gridpanelID'), st = g.getStore(), r = st.getAt(st.findExact('intCIP', cip));
      const n = g.getView().getNode(r); n.querySelector('img[src*="delete.png"], .x-action-col-icon').id = 'e2e-supprimer-ligne'; }, CIP2);
    await p.click('#e2e-supprimer-ligne');
    await p.waitForTimeout(600);
    const conf = await p.evaluate(() => { const c = document.querySelector('.prestige-confirmer-icone'); return c ? c.textContent : ''; });
    await p.click('.prestige-confirmer-icone');
    for (let i = 0; i < 20 && lignes(ids.RW) !== 'P1:M2:-:2'; i++) { await p.waitForTimeout(500); }
    ok('Web : ligne supprimée (confirmation sur l\'icône, aucune fenêtre)', /Confirmer/.test(conf) && !(await boite()) && lignes(ids.RW) === 'P1:M2:-:2', conf + ' ' + lignes(ids.RW));
    await attendreGrille(1);
    /* ligne reprise avec un autre motif : article, motif, quantite, Entree */
    await cliquer(p, '#str_NAME');
    await p.keyboard.type(CIP2, { delay: 40 });
    const article = p.locator('.x-boundlist-item:visible').filter({ hasText: CIP2 }).first();
    await article.waitFor({ timeout: 20000 });
    await article.click();
    await p.waitForTimeout(500);
    await choisir(p, '#lg_MOTIF_RETOUR', LIB1);
    await cliquer(p, '#int_QUANTITE');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('1', { delay: 30 });
    await p.keyboard.press('Enter');
    for (let i = 0; i < 20 && lignes(ids.RW) !== 'P1:M2:-:2,P2:M1:-:1'; i++) { await p.waitForTimeout(500); }
    ok('Web : ligne ajoutée avec un autre motif (motif 1, 1 boîte)', lignes(ids.RW) === 'P1:M2:-:2,P2:M1:-:1' && etat(ids.RW) === 'is_Refused', lignes(ids.RW));
    await attendreGrille(2);
    const s1 = stockDe(P1), s2 = stockDe(P2), m1 = mvtsDe(P1), m2 = mvtsDe(P2);
    ok('Web : correction sans sortie de stock ni mouvement', s1 === STOCK1 && s2 === STOCK2 && m1 === MVT1 && m2 === MVT2, [s1, s2, m1, m2].join(' '));
    const am = await deuxClics('#btn_attente');
    ok('Web : « Remettre en attente » (confirmation dans le bouton), motif effacé', am.arme === 'Confirmer la remise en attente' && !am.boite && (await attendreEtat(ids.RW, 'is_Waiting')) === 'is_Waiting'
      && q(`SELECT IFNULL(str_MOTIF_REFUS, '-') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ids.RW}'`) === '-', JSON.stringify(am));
    await p.waitForTimeout(1500);
    const rouvert = await ouvrirRetour(ids.RW);
    const v = await deuxClics('#btn_save');
    const ev = await attendreEtat(ids.RW, 'enable');
    ok('Web : « Valider le retour » (confirmation dans le bouton) : validé', rouvert && /sortent du stock/.test(v.arme) && !v.boite && ev === 'enable', JSON.stringify(v) + ' ' + ev);
    ok('Web : bilan, une sortie par ligne (2 et 1 boîtes), un mouvement par ligne', stockDe(P1) === STOCK1 - 2 && stockDe(P2) === STOCK2 - 1 && mvtsDe(P1) === MVT1 + 1 && mvtsDe(P2) === MVT2 + 1
      && Number(q(`SELECT COUNT(*) FROM HMvtProduit m JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_DETAIL = m.pkey WHERE d.lg_RETOUR_FRS_ID = '${ids.RW}'`)) === 2,
    [stockDe(P1), STOCK1, stockDe(P2), STOCK2, mvtsDe(P1), MVT1, mvtsDe(P2), MVT2].join(' '));
    /* mise en attente et refus sont poses dans la meme seconde (date de l'action a la seconde) : leur ordre n'est pas
       garanti ; les quatre actions y sont, une fois chacune, et la validation vient en dernier */
    const h = historique(ids.RW).split('|');
    ok('Web : historique mise en attente, refus, remise en attente, validation (une fois chacune, validation en dernier)',
      h.slice().sort().join('|') === 'MISE_EN_ATTENTE|REFUS|REMISE_EN_ATTENTE|VALIDATION' && h[3] === 'VALIDATION', h.join('|'));
    await p.waitForTimeout(1500);

    /* ===== 2. mobile : deux lots, refus, correction, remise en attente, validation ===== */
    const sP1 = stockDe(P1), mP1 = mvtsDe(P1);
    const lotA = q(`SELECT lg_LOT_ID FROM t_lot WHERE int_NUM_LOT = '${LOT_A}'`), lotB = q(`SELECT lg_LOT_ID FROM t_lot WHERE int_NUM_LOT = '${LOT_B}'`);
    ids.RM = await creer([{ produitId: P1, lgMOTIFRETOUR: M1, intNUMBERRETURN: 2, lotId: lotA }, { produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 1, numLot: LOT_B }]);
    ok('Mobile : retour sur deux lots (lot A par identifiant : 2, lot B par numéro : 1)', !!ids.RM && lignes(ids.RM) === `P1:M1:${LOT_A}:2,P1:M2:${LOT_B}:1`, lignes(ids.RM));
    /* mise en attente comme le mobile, avec la seule reference : le commentaire du retour est garde */
    const att = await api('POST', '../api/v1/retourfournisseur/mettre-en-attente', { ref: ids.RM });
    ok('Mobile : mise en attente par la seule référence, commentaire du retour gardé', att.j && att.j.success && etat(ids.RM) === 'is_Waiting'
      && q(`SELECT IFNULL(str_COMMENTAIRE, '(vide)') FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = '${ids.RM}'`) === NOTE, JSON.stringify(att.j));
    await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RM, { motif: MOTIF_REFUS });
    /* correction : la ligne du lot B est retiree puis reprise avec l'autre motif et 2 boites ; le lot A passe a 1 */
    const ligneB = q(`SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ids.RM}' AND num_lot = '${LOT_B}'`);
    const ligneA = q(`SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ids.RM}' AND num_lot = '${LOT_A}'`);
    const sup = await api('DELETE', '../api/v1/retourfournisseur/remove-item/' + ligneB);
    const aj = await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: ids.RM, produitId: P1, lgMOTIFRETOUR: M1, intNUMBERRETURN: 2, numLot: LOT_B });
    const maj = await api('POST', '../api/v1/retourfournisseur/update-item', { lgRETOURFRSDETAIL: ligneA, intNUMBERRETURN: 1 });
    ok('Mobile : retour refusé corrigé (lot B : motif 2 → motif 1, 1 → 2 ; lot A : 2 → 1), toujours refusé', sup.j && sup.j.success && aj.j && aj.j.success && maj.j && maj.j.success
      && lignes(ids.RM) === `P1:M1:${LOT_A}:1,P1:M1:${LOT_B}:2` && etat(ids.RM) === 'is_Refused', lignes(ids.RM) + ' ' + JSON.stringify([sup.j, aj.j, maj.j]));
    const lotInconnu = await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: ids.RM, produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 1, numLot: 'PAS-RECU-E2E' });
    ok('Mobile : un lot non reçu sur ce BL est refusé, rien n\'est ajouté', lotInconnu.j && lotInconnu.j.success === false && lignes(ids.RM) === `P1:M1:${LOT_A}:1,P1:M1:${LOT_B}:2`, JSON.stringify(lotInconnu.j));
    const re = await api('POST', '../api/v1/retourfournisseur/remettre-en-attente/' + ids.RM);
    const val = await api('POST', '../api/v1/produit/validerretourfour', { ref: ids.RM, refTwo: '', description: NOTE });
    ok('Mobile : remis en attente puis validé', re.j && re.j.success && val.j && val.j.success === true && etat(ids.RM) === 'enable', JSON.stringify([re.j, val.j]));
    ok('Mobile : chaque lot perd ses boîtes (A : 5 → 4, B : 5 → 3)', lotStock(LOT_A) === 4 && lotStock(LOT_B) === 3, lotStock(LOT_A) + ' ' + lotStock(LOT_B));
    ok('Mobile : le produit perd le total (3), un mouvement par ligne (2)', stockDe(P1) === sP1 - 3 && mvtsDe(P1) === mP1 + 2, sP1 + '->' + stockDe(P1) + ' mvt ' + mP1 + '->' + mvtsDe(P1));
    const sV = stockDe(P1), mV = mvtsDe(P1);
    const deux = await api('POST', '../api/v1/produit/validerretourfour', { ref: ids.RM, refTwo: '', description: NOTE });
    ok('Mobile : seconde validation refusée, rien ne change (stock, lots, mouvements)', deux.j && deux.j.success === false && stockDe(P1) === sV && mvtsDe(P1) === mV
      && lotStock(LOT_A) === 4 && lotStock(LOT_B) === 3, JSON.stringify(deux.j));

    /* ===== 3. un retour valide ou abandonne ne se modifie plus ===== */
    const avant = lignes(ids.RM), sA = stockDe(P1), mA = mvtsDe(P1);
    const ligneV = q(`SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ids.RM}' AND num_lot = '${LOT_A}'`);
    const vAj = await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: ids.RM, produitId: P1, lgMOTIFRETOUR: M2, intNUMBERRETURN: 1, numLot: LOT_A });
    const vMaj = await api('POST', '../api/v1/retourfournisseur/update-item', { lgRETOURFRSDETAIL: ligneV, intNUMBERRETURN: 3 });
    const vSup = await api('DELETE', '../api/v1/retourfournisseur/remove-item/' + ligneV);
    ok('Retour validé : ajout, correction et suppression de ligne refusés (409 ETAT)', [vAj, vMaj, vSup].every((r) => r.status === 409 && r.j && r.j.code === 'ETAT'),
      JSON.stringify([vAj, vMaj, vSup].map((r) => [r.status, r.j && (r.j.code || r.j.success)])));
    ok('Retour validé : lignes, stock, lots et mouvements inchangés', lignes(ids.RM) === avant && stockDe(P1) === sA && mvtsDe(P1) === mA && lotStock(LOT_A) === 4 && lotStock(LOT_B) === 3, lignes(ids.RM));
    ids.RB = await creer([{ produitId: P2, lgMOTIFRETOUR: M1, intNUMBERRETURN: 2 }]);
    await api('POST', '../api/v1/retourfournisseur/mettre-en-attente', { description: NOTE, ref: ids.RB });
    await api('POST', '../api/v1/retourfournisseur/refuser/' + ids.RB, { motif: MOTIF_REFUS });
    await api('POST', '../api/v1/retourfournisseur/abandonner/' + ids.RB);
    const ligneAb = q(`SELECT lg_RETOUR_FRS_DETAIL FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID = '${ids.RB}'`);
    const avantB = lignes(ids.RB);
    const bAj = await api('POST', '../api/v1/retourfournisseur/add-item', { lgRETOURFRSID: ids.RB, produitId: P2, lgMOTIFRETOUR: M2, intNUMBERRETURN: 1 });
    const bMaj = await api('POST', '../api/v1/retourfournisseur/update-item', { lgRETOURFRSDETAIL: ligneAb, intNUMBERRETURN: 1 });
    const bSup = await api('DELETE', '../api/v1/retourfournisseur/remove-item/' + ligneAb);
    ok('Retour abandonné : ajout, correction et suppression refusés (409 ETAT), lignes inchangées', etat(ids.RB) === 'is_Abandoned'
      && [bAj, bMaj, bSup].every((r) => r.status === 409 && r.j && r.j.code === 'ETAT') && lignes(ids.RB) === avantB,
    JSON.stringify([bAj, bMaj, bSup].map((r) => [r.status, r.j && (r.j.code || r.j.success)])) + ' ' + lignes(ids.RB));
    ok('Aucune fenêtre surgissante, aucune erreur JavaScript', dialogues.length === 0 && err.length === 0, dialogues.concat(err).join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack);
  } finally {
    await b.close();
    droit.remettre();
    retirer();
    remettreStock();
    ok('Données d\'essai retirées (retours, historique, mouvements, lots), stock remis', q(`SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_COMMENTAIRE = '${NOTE}'${parId()}`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE int_NUM_LOT IN ('${LOT_A}', '${LOT_B}')`) === '0' && stockDe(P1) === STOCK1 && stockDe(P2) === STOCK2
      && mvtsDe(P1) === MVT1 && mvtsDe(P2) === MVT2, [stockDe(P1), STOCK1, stockDe(P2), STOCK2, mvtsDe(P1), MVT1].join(' '));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
