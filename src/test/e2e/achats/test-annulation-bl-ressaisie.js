/* RETOUR COMPLET D'UN BL ET RESSAISIE (analyse du 30/10, docs/notices/ANALYSE_ANNULATION_BL.md) : bilan avant / apres
 * et rapprochement ecran / base, par les vues.
 *
 * Deux produits, deux quantites differentes par ligne, deux ordres d'operations :
 *  A. comme a l'officine : BL A1 (numero R) entre en stock, ressaisie A2 (numero « R- ») entree en stock, PUIS retour
 *     complet de A1 depuis « Etat de contrôle Achats » ;
 *  B. retour complet de B1 (numero S) d'abord, PUIS ressaisie B2 sous le MEME numero S (permis depuis 4bbea8c4), avec
 *     des quantites differentes (une en hausse, une en baisse).
 * Entrees en stock par « Gestion des entrées » (detail du bon, ENTREE EN STOCK), retours par l'icone « RETOUR COMPLET
 * DU BL » de la ligne, motif choisi dans la liste, « Enregistrer ».
 *
 * Bilan, apres chaque operation : stock = avant ± quantite, sur l'emplacement 1 ; un mouvement par ligne (entree ou
 * retour fournisseur) avec la bonne quantite et une chaine sans rupture (debut = fin du precedent). A la fin : un retour
 * fournisseur par BL annule (lignes = quantites recues), le BL annule au statut delete avec UNE contre-passation
 * negative, la ligne de caisse (mvttransaction) du BL annule retiree et celle de la ressaisie presente, les lots du BL
 * annule hors service (statut delete), ceux de la ressaisie actifs avec leurs quantites.
 * Rapprochement : l'ecran « Suivi mouvement article » (ligne du produit, puis detail du jour) affiche les memes entrees,
 * retours et stocks que la base.
 *
 * Donnees : commandes et bons d'essai poses en base (statut « a receptionner »), comme les autres tests d'entree en
 * stock ; tout est retire a la fin (bons, contre-passations, lots, mouvements, retours, caisse, journal, suggestions) et
 * les produits sont remis tels quels. Domaine : BASE (adresse de Prestige) et DB_TEST (base) du poste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir, texteMessage, repondre } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-e', s], { encoding: 'utf8' });
const liste = (a) => a.map((x) => "'" + x + "'").join(',');

const PFX = 'E2E-ABL-';
const STAMP = String(Date.now()).slice(-6);
const R = 'E2EABL' + STAMP, S = 'E2EABS' + STAMP;
/* bons : id -> numero, commande, quantites [P1, P2] */
const BONS = {
  A1: { ref: R, qte: [2, 3] },
  A2: { ref: R + '-', qte: [2, 3] },
  B1: { ref: S, qte: [2, 3] },
  B2: { ref: S, qte: [3, 1] },
};
Object.keys(BONS).forEach((k) => { BONS[k].id = PFX + k; BONS[k].ord = PFX + 'O' + k; });
const debut = q('SELECT NOW()');

/* produits : stock rayon modeste, une seule ligne de stock (emplacement 1), ni reserve ni date de peremption exigee */
const PRODUITS = q("SELECT GROUP_CONCAT(x.id ORDER BY x.id SEPARATOR ',') FROM (SELECT f.lg_FAMILLE_ID id FROM t_famille f"
  + " JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable'"
  + " WHERE f.str_STATUT = 'enable' AND IFNULL(f.bool_RESERVE, 0) = 0 AND IFNULL(f.bool_CHECKEXPIRATIONDATE, 0) = 0"
  + " AND IFNULL(f.bool_DECONDITIONNE, 0) = 0 AND f.int_PRICE > 0 AND f.int_PAF > 0 AND f.int_CIP <> ''"
  + " AND s.int_NUMBER_AVAILABLE BETWEEN 1 AND 40 AND f.lg_GROSSISTE_ID IS NOT NULL"
  + " AND (SELECT COUNT(*) FROM t_famille_stock x WHERE x.lg_FAMILLE_ID = f.lg_FAMILLE_ID) = 1"
  + " AND (SELECT COUNT(*) FROM t_famille g WHERE g.int_CIP = f.int_CIP) = 1"
  + " AND NOT EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND h.mvtdate >= CURDATE() - INTERVAL 2 DAY)"
  + " ORDER BY f.lg_FAMILLE_ID LIMIT 2 OFFSET 7) x").split(',');
const [P1, P2] = PRODUITS;
const G = P1 ? q(`SELECT lg_GROSSISTE_ID FROM t_famille WHERE lg_FAMILLE_ID = '${P1}'`) : '';
const SAUVE = ['t_famille', 't_famille_stock', 't_famille_grossiste', 't_suggestion_order_details'];
const stock = (p) => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${p}' AND lg_EMPLACEMENT_ID = '1'`));
const details = (k) => [BONS[k].id + '-1', BONS[k].id + '-2'];
const tousDetails = () => [].concat(...Object.keys(BONS).map(details));
const tousBons = () => Object.keys(BONS).map((k) => BONS[k].id);
const contrePassations = (k) => q(`SELECT IFNULL(GROUP_CONCAT(lg_BON_LIVRAISON_ID), '') FROM t_bon_livraison WHERE lg_ORDER_ID = '${BONS[k].ord}'`
  + ` AND lg_BON_LIVRAISON_ID <> '${BONS[k].id}'`).split(',').filter(Boolean);
const retours = () => q(`SELECT IFNULL(GROUP_CONCAT(lg_RETOUR_FRS_ID), '') FROM t_retour_fournisseur WHERE lg_BON_LIVRAISON_ID IN (${liste(tousBons())})`).split(',').filter(Boolean);

function sauver() {
  SAUVE.forEach((t) => exec(`DROP TABLE IF EXISTS e2e_abl_${t}; CREATE TABLE e2e_abl_${t} AS SELECT * FROM ${t} WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)});`));
}
function remettre() {
  if (!P1) { return; }
  const ret = retours();
  const cp = [].concat(...Object.keys(BONS).map(contrePassations));
  const cpDet = cp.length ? q(`SELECT IFNULL(GROUP_CONCAT(lg_BON_LIVRAISON_DETAIL), '') FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${liste(cp)})`).split(',').filter(Boolean) : [];
  const retDet = ret.length ? q(`SELECT IFNULL(GROUP_CONCAT(lg_RETOUR_FRS_DETAIL), '') FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${liste(ret)})`).split(',').filter(Boolean) : [];
  const cles = tousDetails().concat(retDet, ['-']);
  const entites = tousBons().concat(ret, cp, ['-']);
  const refs = liste([R, R + '-', S]);
  exec(`DELETE FROM hmvtproduit WHERE pkey IN (${liste(cles)});`
    + `DELETE FROM mvttransaction WHERE pkey IN (${liste(entites)});`
    + `DELETE FROM notification WHERE entity_ref IN (${liste(entites)});`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${debut}' AND (str_DESCRIPTION LIKE '%${R}%' OR str_DESCRIPTION LIKE '%${S}%' OR str_TABLE_CONCERN IN (${liste(entites)}));`
    + (retDet.length ? `DELETE FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_DETAIL IN (${liste(retDet)});` : '')
    + (ret.length ? `DELETE FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID IN (${liste(ret)});` : '')
    + `DELETE FROM t_etiquette WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)}) AND dt_CREATED >= '${debut}';`
    + `DELETE FROM t_warehouse WHERE str_REF_LIVRAISON IN (${refs});`
    + `DELETE FROM t_lot WHERE str_REF_LIVRAISON IN (${refs});`
    + (cpDet.length ? `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL IN (${liste(cpDet)});` : '')
    + `DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${liste(tousBons())});`
    + (cp.length ? `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${liste(cp)});` : '')
    + `DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${liste(tousBons())});`
    + `DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${liste(Object.keys(BONS).map((k) => BONS[k].ord))});`
    + `DELETE FROM t_order WHERE lg_ORDER_ID IN (${liste(Object.keys(BONS).map((k) => BONS[k].ord))});`);
  if (q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'e2e_abl_t_famille'") === '1') {
    /* suggestions : lignes creees pendant le test retirees, lignes d'avant remises */
    exec(`DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID IN (${liste(PRODUITS)}) AND lg_SUGGESTION_ORDER_DETAILS_ID NOT IN (SELECT lg_SUGGESTION_ORDER_DETAILS_ID FROM e2e_abl_t_suggestion_order_details);`
      + `DELETE s FROM t_suggestion_order s WHERE s.dt_CREATED >= '${debut}' AND NOT EXISTS (SELECT 1 FROM t_suggestion_order_details d WHERE d.lg_SUGGESTION_ORDER_ID = s.lg_SUGGESTION_ORDER_ID);`);
    SAUVE.forEach((t) => {
      const cols = q(`SELECT GROUP_CONCAT(CONCAT('\`', COLUMN_NAME, '\` = VALUES(\`', COLUMN_NAME, '\`)')) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t}'`);
      exec(`INSERT INTO ${t} SELECT * FROM e2e_abl_${t} ON DUPLICATE KEY UPDATE ${cols}; DROP TABLE e2e_abl_${t};`);
    });
  }
}

/* commande et bon « a receptionner », comme apres « Passer la commande » puis la creation du BL */
function poserBon(k) {
  const b = BONS[k];
  exec(`INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)`
    + ` SELECT '${b.ord}', '${b.ref}', 2, '${G}', u.lg_USER_ID, 'is_Process', NOW(), NOW(), 0, 0, 0 FROM t_user u WHERE u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + `INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)`
    + ` SELECT '${b.id}', '${b.ref}', CURDATE(), SUM(f.int_PAF * CASE f.lg_FAMILLE_ID WHEN '${P1}' THEN ${b.qte[0]} ELSE ${b.qte[1]} END), 0,`
    + ` SUM(f.int_PAF * CASE f.lg_FAMILLE_ID WHEN '${P1}' THEN ${b.qte[0]} ELSE ${b.qte[1]} END), '${b.ord}', 'enable', NOW(), NOW(), MAX(u.lg_USER_ID)`
    + ` FROM t_famille f, t_user u WHERE f.lg_FAMILLE_ID IN ('${P1}', '${P2}') AND u.str_LOGIN = '${ENV_E2E.LOGIN}';`
    + [P1, P2].map((p, i) => `INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_UG, int_QTE_RECUE, int_PRIX_REFERENCE, int_PRIX_VENTE, int_PAF, int_PA_REEL, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_QTE_MANQUANT, int_QTE_RETURN, int_INITSTOCK)`
      + ` SELECT '${details(k)[i]}', '${G}', f.lg_FAMILLE_ID, '${b.id}', ${b.qte[i]}, 0, 0, f.int_PRICE, f.int_PRICE, f.int_PAF, f.int_PAF, f.lg_ZONE_GEO_ID, 'enable', NOW(), NOW(), 0, 0, s.int_NUMBER_AVAILABLE`
      + ` FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' WHERE f.lg_FAMILLE_ID = '${p}';`).join(''));
}

/* mouvements du produit poses par ce test (lignes des bons et des retours), dans l'ordre */
function mouvements(p) {
  const ret = retours();
  const retDet = ret.length ? q(`SELECT IFNULL(GROUP_CONCAT(lg_RETOUR_FRS_DETAIL), '') FROM t_retour_fournisseur_detail WHERE lg_RETOUR_FRS_ID IN (${liste(ret)})`).split(',').filter(Boolean) : [];
  const l = q(`SELECT CONCAT_WS('|', typeMvt, qteMvt, qteDebut, qteFinale, pkey, lg_EMPLACEMENT_ID) FROM hmvtproduit WHERE lg_FAMILLE_ID = '${p}'`
    + ` AND pkey IN (${liste(tousDetails().concat(retDet, ['-']))}) ORDER BY createdAt, qteDebut`);
  return l ? l.split('\n').map((x) => { const [type, qte, deb, fin, pkey, empl] = x.split('|'); return { type, qte: +qte, deb: +deb, fin: +fin, pkey, empl }; }) : [];
}

(async () => {
  remettre();
  ok('Précondition : deux produits sans mouvement récent, avec grossiste', !!P1 && !!P2 && !!G, PRODUITS.join(', '));
  if (!P1 || !P2) { process.exit(1); }
  sauver();
  const S0 = [stock(P1), stock(P2)];
  const attendu = S0.slice();
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  const attendreListe = (xtype) => p.waitForFunction((x) => { const g = Ext.ComponentQuery.query(x).filter((c) => c.isVisible(true))[0];
    return g && !g.getStore().isLoading(); }, xtype, { timeout: 120000 });
  /* icone d'action de la ligne du bon, cliquee a la souris */
  const cliquerIcone = async (xtype, champId, id, infobulle) => {
    const rang = await p.evaluate(([x, c, i]) => { const g = Ext.ComponentQuery.query(x).filter((v) => v.isVisible(true))[0];
      return g.getStore().findExact(c, i); }, [xtype, champId, id]);
    if (rang < 0) { throw new Error('Bon ' + id + ' absent de la liste ' + xtype); }
    const vue = await p.evaluate((x) => Ext.ComponentQuery.query(x).filter((v) => v.isVisible(true))[0].getView().getId(), xtype);
    await p.locator('#' + vue + ' .x-grid-row').nth(rang).locator(`img[data-qtip="${infobulle}"]`).click();
  };
  /* reponses successives aux boites de message ; rend le texte de la boite d'erreur s'il y en a une */
  const repondreJusqua = async (attendus) => {
    for (const [motif, bouton] of attendus) {
      const fin = Date.now() + 120000;
      let t = '';
      while (Date.now() < fin) {
        t = await texteMessage(p);
        if (new RegExp(motif).test(t)) { break; }
        if (/erreur|Produits non saisis|n'a pas ete faite|Echec|Impossible/i.test(t)) { return t; }
        t = ''; await p.waitForTimeout(250);
      }
      if (!t) { return 'boîte « ' + motif + ' » non affichée'; }
      await repondre(p, bouton);
      await p.waitForTimeout(400);
    }
    return null;
  };

  /* ENTREE EN STOCK par « Gestion des entrées » */
  const entrer = async (k) => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Gestion des entrées');
    await attendreListe('bonlivraisonmanager');
    await saisir(p, 'bonlivraisonmanager #rechecher', BONS[k].ref);
    await cliquer(p, 'bonlivraisonmanager button[text=rechercher]');
    await p.waitForTimeout(800);
    await attendreListe('bonlivraisonmanager');
    await cliquerIcone('bonlivraisonmanager', 'lg_BON_LIVRAISON_ID', BONS[k].id, 'Detail livraison');
    await p.waitForFunction(() => Ext.getCmp('btn_enterstock') && Ext.getCmp('btn_enterstock').isVisible() && !Ext.getCmp('btn_enterstock').isDisabled(), null, { timeout: 60000 });
    await p.waitForTimeout(1000);
    await cliquer(p, '#btn_enterstock');
    const erreur = await repondreJusqua([['UNITÉS GRATUITES', 'yes'], ["Confirmer l'entrée en stock", 'yes'], ['impression des entrées', 'no'], ['imprimer les étiquettes', 'no']]);
    /* fenetres de fin eventuelles (avoirs, reserve) : fermees comme l'utilisateur */
    await p.waitForTimeout(1500);
    for (let i = 0; i < 3; i++) {
      const fen = await p.evaluate(() => Ext.ComponentQuery.query('window{isVisible()}').filter((w) => w.xtype !== 'messagebox').map((w) => w.getId()));
      if (!fen.length) { break; }
      await p.click('#' + fen[0] + ' .x-tool-close').catch(() => {});
      await p.waitForTimeout(500);
    }
    if (erreur) { await repondre(p, 'ok').catch(() => {}); }
    return erreur;
  };

  /* RETOUR COMPLET par « Etat de contrôle Achats » */
  const annuler = async (k) => {
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await attendreListe('etatscontrolemanager');
    await saisir(p, 'etatscontrolemanager #rechecher', BONS[k].ref);
    await cliquer(p, 'etatscontrolemanager button[text=Rechercher]');
    await p.waitForTimeout(800);
    await attendreListe('etatscontrolemanager');
    await cliquerIcone('etatscontrolemanager', 'lgBONLIVRAISONID', BONS[k].id, 'RETOUR COMPLET DU BL');
    const fen = 'window[title=RETOUR COMPLET DE BON DE LIVRAISON]';
    await p.waitForFunction((f) => Ext.ComponentQuery.query(f).some((w) => w.isVisible()), fen, { timeout: 20000 });
    await choisir(p, fen + ' combobox', 0);
    await cliquer(p, fen + ' button[text=Enregistrer]');
    await p.waitForFunction((f) => !Ext.ComponentQuery.query(f).some((w) => w.isVisible()), fen, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(800);
    const t = await texteMessage(p);
    if (t) { await repondre(p, 'ok').catch(() => {}); }
    return t;
  };

  /* bilan d'une operation : stock = avant ± quantites, mouvements du produit en chaine */
  const bilan = (etape, k, signe) => {
    BONS[k].qte.forEach((n, i) => { attendu[i] += signe * n; });
    const st = [stock(P1), stock(P2)];
    ok(`${etape} : stock = avant ${signe > 0 ? '+' : '−'} quantités du bon (${BONS[k].qte.join(' et ')})`, st[0] === attendu[0] && st[1] === attendu[1],
      'attendu ' + attendu.join('/') + ', base ' + st.join('/'));
  };

  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');

    /* A : ressaisie AVANT le retour complet (cas de l'officine) */
    poserBon('A1'); poserBon('A2');
    let e = await entrer('A1');
    ok('A1 : entrée en stock acceptée', !e, e || 'ok');
    bilan('A1 entré', 'A1', +1);
    e = await entrer('A2');
    ok('A2 (numéro « R- ») : entrée en stock acceptée', !e, e || 'ok');
    bilan('A2 entré', 'A2', +1);
    e = await annuler('A1');
    ok('A1 : retour complet enregistré, sans message d\'erreur', !e && q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BONS.A1.id}'`) === 'delete', e || 'ok');
    bilan('A1 retourné', 'A1', -1);

    /* B : retour complet PUIS ressaisie sous le meme numero */
    poserBon('B1');
    e = await entrer('B1');
    ok('B1 : entrée en stock acceptée', !e, e || 'ok');
    bilan('B1 entré', 'B1', +1);
    e = await annuler('B1');
    ok('B1 : retour complet enregistré, sans message d\'erreur', !e && q(`SELECT str_STATUT FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BONS.B1.id}'`) === 'delete', e || 'ok');
    bilan('B1 retourné', 'B1', -1);
    poserBon('B2');
    e = await entrer('B2');
    ok('B2 (même numéro que B1 annulé, quantités 3 et 1) : entrée en stock acceptée', !e, e || 'ok');
    bilan('B2 entré', 'B2', +1);

    /* traces de fin */
    const qteBon = (k, i) => BONS[k].qte[i];
    [P1, P2].forEach((prod, i) => {
      const m = mouvements(prod);
      const entrees = m.filter((x) => x.type === '01'), sorties = m.filter((x) => x.type === '09');
      ok(`Produit ${i + 1} : une entrée par bon entré (A1, A2, B1, B2) avec sa quantité`, entrees.length === 4
        && ['A1', 'A2', 'B1', 'B2'].every((k) => entrees.some((x) => x.pkey === details(k)[i] && x.qte === qteBon(k, i))), JSON.stringify(entrees));
      ok(`Produit ${i + 1} : un retour fournisseur par bon annulé (A1, B1) avec la quantité reçue`, sorties.length === 2
        && sorties.map((x) => x.qte).sort().join() === [qteBon('A1', i), qteBon('B1', i)].sort().join(), JSON.stringify(sorties));
      ok(`Produit ${i + 1} : chaîne des mouvements sans rupture, sur l'emplacement 1`, m.every((x, j) => x.empl === '1'
        && x.fin === x.deb + (x.type === '01' ? x.qte : -x.qte) && (j === 0 || x.deb === m[j - 1].fin)) && m.length && m[0].deb === S0[i]
        && m[m.length - 1].fin === stock(prod), JSON.stringify(m.map((x) => x.deb + '>' + x.fin)));
    });
    ok('Stock final = départ + A2 + B2 (le BL annulé et sa ressaisie ne comptent qu\'une fois)',
      stock(P1) === S0[0] + qteBon('A2', 0) + qteBon('B2', 0) && stock(P2) === S0[1] + qteBon('A2', 1) + qteBon('B2', 1),
      [stock(P1), stock(P2)].join('/') + ' pour ' + S0.join('/'));
    ['A1', 'B1'].forEach((k) => {
      const r = q(`SELECT CONCAT_WS('|', COUNT(DISTINCT r.lg_RETOUR_FRS_ID), MIN(r.str_STATUT), GROUP_CONCAT(d.int_NUMBER_RETURN ORDER BY d.lg_FAMILLE_ID = '${P1}' DESC))`
        + ` FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE r.lg_BON_LIVRAISON_ID = '${BONS[k].id}'`);
      ok(`${k} : un seul retour fournisseur, actif, lignes = quantités reçues`, r === `1|enable|${BONS[k].qte.join(',')}`, r);
      const cp = contrePassations(k);
      const m = cp.length === 1 ? q(`SELECT CONCAT_WS('|', str_REF_LIVRAISON, str_STATUT, int_HTTC) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${cp[0]}'`) : '';
      const httc = q(`SELECT int_HTTC FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '${BONS[k].id}'`);
      ok(`${k} : une seule contre-passation, même numéro, montant opposé`, m === `${BONS[k].ref}|delete|${-Number(httc)}`, cp.length + ' ' + m);
      ok(`${k} : quantités retournées notées sur les lignes du bon`, q(`SELECT GROUP_CONCAT(CONCAT(int_QTE_RECUE, '=', int_QTE_RETURN) ORDER BY lg_BON_LIVRAISON_DETAIL) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '${BONS[k].id}'`)
        === BONS[k].qte.map((n) => n + '=' + n).join(','));
    });
    const caisse = q(`SELECT GROUP_CONCAT(CONCAT(b.k, '=', (SELECT COUNT(*) FROM mvttransaction m WHERE m.pkey = b.id)) ORDER BY b.k) FROM (SELECT 'A1' k, '${BONS.A1.id}' id UNION SELECT 'A2', '${BONS.A2.id}' UNION SELECT 'B1', '${BONS.B1.id}' UNION SELECT 'B2', '${BONS.B2.id}') b`);
    ok('Caisse : la ligne des bons annulés est retirée, celle des ressaisies est présente (une chacune)', caisse === 'A1=0,A2=1,B1=0,B2=1', caisse);
    /* lots : ceux d'un bon annule sont hors service ; ceux de la ressaisie, actifs, portent ses quantites */
    const lots = (ref, actifs) => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(IF(lg_FAMILLE_ID = '${P1}', 'P1', 'P2'), '=', int_NUMBER) ORDER BY lg_FAMILLE_ID = '${P1}' DESC, dt_CREATED), '')`
      + ` FROM t_lot WHERE str_REF_LIVRAISON = '${ref}' AND ${actifs ? "IFNULL(str_STATUT, '') <> 'delete'" : "str_STATUT = 'delete'"}`);
    ok('Lots de A1 (annulé) hors service', lots(R, true) === '' && lots(R, false) === 'P1=2,P2=3', 'actifs ' + lots(R, true) + ' / hors service ' + lots(R, false));
    ok('Lots de A2 (ressaisie « R- ») actifs, quantités du bon', lots(R + '-', true) === 'P1=2,P2=3', lots(R + '-', true));
    ok('Numéro S : lots de B1 (annulé) hors service, lots de B2 actifs avec ses quantités (3 et 1)', lots(S, true) === 'P1=3,P2=1' && lots(S, false) === 'P1=2,P2=3',
      'actifs ' + lots(S, true) + ' / hors service ' + lots(S, false));

    /* RAPPROCHEMENT : ecran « Suivi mouvement article » = base, pour chaque produit, sur la journee */
    for (const [i, prod] of [P1, P2].entries()) {
      const cip = q(`SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '${prod}'`);
      const base = q(`SELECT CONCAT_WS('|', SUM(IF(typeMvt = '01', qteMvt, 0)), SUM(IF(typeMvt = '09', qteMvt, 0)),`
        + ` (SELECT qteDebut FROM hmvtproduit WHERE lg_FAMILLE_ID = '${prod}' AND mvtdate = CURDATE() ORDER BY createdAt LIMIT 1),`
        + ` (SELECT qteFinale FROM hmvtproduit WHERE lg_FAMILLE_ID = '${prod}' AND mvtdate = CURDATE() ORDER BY createdAt DESC LIMIT 1))`
        + ` FROM hmvtproduit WHERE lg_FAMILLE_ID = '${prod}' AND mvtdate = CURDATE()`).split('|').map(Number);
      await ouvrirMenu(p, 'GESTION DU STOCK', await p.evaluate(() => { /* libelle affiche de l'entree du menu */
        const n = Ext.ComponentQuery.query('navigation')[0]; let t = null;
        /* l'entree de l'ecran monitoringproduct : deux menus ont presque le meme nom (« Suivi mouvement article » ouvre
           suivientreevente) et le meme rang, leur ordre varie d'une ouverture a l'autre */
        const e = n.getStore().getRootNode().findChild('id', 'monitoringproduct', true);
        if (e) { t = e.get('text'); }
        n.getStore().getRootNode().cascadeBy((x) => { if (!t && /Suivi mouvement article/.test(x.get('text') || '')) { t = x.get('text'); } });
        return t || 'Suivi mouvement article';
      }).catch(() => 'Suivi mouvement article'));
      await attendreListe('monitoringproduct gridpanel');
      await saisir(p, 'monitoringproduct #query', cip);
      await cliquer(p, 'monitoringproduct #rechercher');
      await p.waitForTimeout(800);
      await attendreListe('monitoringproduct gridpanel');
      const ligne = await p.evaluate((pid) => { const st = Ext.ComponentQuery.query('monitoringproduct gridpanel')[0].getStore();
        const r = st.findRecord('produitId', pid, 0, false, true, true); return r ? { rang: st.indexOf(r), entree: r.get('qtyEntree'), retour: r.get('qtyRetour') } : null; }, prod);
      ok(`Suivi (produit ${i + 1}) : la ligne du produit affiche les entrées et retours de la base`, ligne && ligne.entree === base[0] && ligne.retour === base[1],
        JSON.stringify(ligne) + ' base ' + base.slice(0, 2).join('/'));
      if (ligne) {
        const vue = await p.evaluate(() => Ext.ComponentQuery.query('monitoringproduct gridpanel')[0].getView().getId());
        await p.locator('#' + vue + ' .x-grid-row').nth(ligne.rang).locator('img[data-qtip="Voir détail"]').click();
        const jour = await p.waitForFunction(() => {
          for (const w of Ext.ComponentQuery.query('window{isVisible()}')) {
            for (const g of w.query('gridpanel')) {
              const st = g.getStore();
              if (st && !st.isLoading() && st.getCount() && ('dateOp' in st.getAt(0).data)) {
                const d = new Date(), z = (n) => String(n).padStart(2, '0'), auj = z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear();
                const r = st.findRecord('dateOp', auj, 0, false, true, true);
                return r ? { entree: r.get('qtyEntree'), retour: r.get('qtyRetour'), init: r.get('stockInit'), fin: r.get('stockFinal'), fenetre: w.getId() } : { absent: auj };
              }
            }
          }
          return false;
        }, null, { timeout: 30000, polling: 500 }).then((h) => h.jsonValue()).catch(() => null);
        ok(`Suivi (produit ${i + 1}) : détail du jour = base (entrées, retours, stock de début et de fin)`, jour && jour.entree === base[0]
          && jour.retour === base[1] && jour.init === base[2] && jour.fin === base[3] && jour.fin === stock(prod), JSON.stringify(jour) + ' base ' + base.join('/'));
        if (jour && jour.fenetre) { await p.click('#' + jour.fenetre + ' .x-tool-close').catch(() => {}); }
      }
    }
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack);
  } finally {
    await b.close();
    remettre();
    ok('Données d\'essai retirées, produits remis', q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID LIKE '${PFX}%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON IN (${liste([R, R + '-', S])})`) === '0'
      && stock(P1) === S0[0] && stock(P2) === S0[1]
      && q("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'e2e\\_abl\\_%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
