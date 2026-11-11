/* GESTION DE CAISSE G6 : la recette porte la date de la vente, comme la balance vente caisse (decision du 03/11).
 * Constat (copie, 23/10) : recette 5 516 110, balance 5 510 045 ; l'ecart (6 065) est une vente VO cloturee le 23/10
 * dont la date a ete ramenee au 19/10 par « Modifier la date » : la vente et la balance passent au 19/10, la recette
 * restait au 23/10. 424 cas en 3 ans, tous sur la date, aucun sur le montant.
 * Parcours, compte e2e, par les vues :
 *  - « Vente terminées », recherche par reference, icone « Modifier la date » d'une vente VO, date d'hier,
 *    « Enregistrer » : la vente, la balance et la recette sont a la date d'hier ;
 *  - vente au comptant d'hier, icone « Modifier », quantite 1 -> 2, « Terminer la vente » : la nouvelle vente garde la
 *    date d'hier, sa balance aussi, sa recette aussi.
 *  - vente au comptant d'hier, quantite 3, icone « Annuler.Vente » : stock rendu, une vente d'annulation, un
 *    mouvement de caisse et une recette opposes, au meme jour.
 * Rapprochement (regle du 05/11) : pour hier et pour aujourd'hui, l'ecart de la balance vente caisse (API de l'ecran,
 * especes et net) entre le debut et la fin du test est egal a l'ecart de la somme des recettes du meme jour ; sur les
 * deux jours, il reste exactement les ventes non annulees (la vente VO et la vente modifiee).
 * Bilan : chaque operation laisse exactement ses traces (une recette, un mouvement de caisse, un reglement par vente ;
 * stock avant - quantite ; « Modifier la date » ne cree aucune trace et ne touche pas au stock).
 * Jeu d'essai : trois ventes au comptant cloturees par l'API de l'ecran de vente, quantites 1, 1 et 3 ; la premiere est
 * marquee VO, les autres ramenees a hier (vente, balance, recette, reglements). Tout ce que le test cree est retire,
 * stock remis.
 * Lancement seul : node src/test/e2e/audits/test-ecran-recette-date-vente.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const privilegeEssai = require('../support/privilege-essai');
const { connexion, ouvrirMenu, cliquer, texteMessage, repondre, confirmerAnnulation, choisirMotif } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

const CAISSE = 'e2e-g6-caisse';
const USER = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const HIER = q("SELECT CURDATE() - INTERVAL 1 DAY");
const HIER_ECRAN = q("SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%d/%m/%Y')");
const droitModif = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BT_MODIFICATION_DE_VENTE');
const droitDate = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BTN_UPDATE_VENTE_CLIENT_DATE');
const droitAnnuler = privilegeEssai(q, exec, ENV_E2E.LOGIN, 'P_BT_ANNULER_VENTE');
const AUJOURDHUI = q('SELECT CURDATE()');
const ventes = [];
let produit = null, stockOrigine = null, caisseCreee = false;

/* ventes du test, leurs copies et leurs annulations (elles portent la date de la vente d'origine) */
const ventesDuTest = () => {
  const ids = ventes.map((v) => `'${v}'`).join(',') || "'-'";
  return q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement`
    + ` WHERE lg_PREENREGISTREMENT_ID IN (${ids}) OR lg_PARENT_ID IN (${ids}) OR (dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${USER}')`);
};
function nettoyer() {
  const v = ventesDuTest();
  exec(`CREATE TEMPORARY TABLE e2e_g6_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `CREATE TEMPORARY TABLE e2e_g6_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v}) AND lg_REGLEMENT_ID IS NOT NULL;`
    + `DELETE FROM vente_modifiee_ligne WHERE modification_id IN (SELECT id FROM vente_modifiee WHERE vente_id IN (${v}) OR vente_origine_id IN (${v}));`
    + `DELETE FROM vente_modifiee WHERE vente_id IN (${v}) OR vente_origine_id IN (${v});`
    + `DELETE FROM vente_reglement WHERE vente_id IN (${v});`
    + `DELETE FROM annulation_recette WHERE preenregistrement_id IN (${v});`
    + `DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_g6_l);`
    + `DELETE FROM mvttransaction WHERE pkey IN (${v}) OR vente_id IN (${v});`
    + `DELETE FROM t_recettes WHERE str_REF_FACTURE IN (${v});`
    + `DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_g6_r);`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE user_id = '${USER}' AND created_at >= '${DEBUT}');`
    + `DELETE FROM notification WHERE user_id = '${USER}' AND created_at >= '${DEBUT}';`
    + `DELETE FROM t_event_log WHERE lg_USER_ID = '${USER}' AND dt_CREATED >= '${DEBUT}';`
    + `DROP TEMPORARY TABLE IF EXISTS e2e_g6_l; DROP TEMPORARY TABLE IF EXISTS e2e_g6_r;`);
  if (produit && stockOrigine !== null) {
    exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${stockOrigine[0]}, int_NUMBER = ${stockOrigine[1]} WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`);
  }
}
/* traces d'une vente : recettes, mouvements de caisse (nombre et somme), reglements */
const traces = (id) => q(`SELECT CONCAT_WS(' ', (SELECT COUNT(*) FROM t_recettes WHERE str_REF_FACTURE = '${id}'), (SELECT ROUND(IFNULL(SUM(int_AMOUNT), 0)) FROM t_recettes WHERE str_REF_FACTURE = '${id}'),`
  + ` (SELECT COUNT(*) FROM mvttransaction WHERE pkey = '${id}'), (SELECT IFNULL(SUM(montantNet), 0) FROM mvttransaction WHERE pkey = '${id}'),`
  + ` (SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '${id}'))`);
const stockProduit = () => Number(q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`));
const recettesDu = (jour) => Number(q(`SELECT IFNULL(SUM(int_AMOUNT), 0) FROM t_recettes WHERE dt_CREATED >= '${jour}' AND dt_CREATED < '${jour}' + INTERVAL 1 DAY`));
/* date de la vente, de sa balance et de sa recette */
const dates = (id) => q(`SELECT CONCAT_WS(' ', DATE(p.dt_UPDATED), (SELECT m.mvtdate FROM mvttransaction m WHERE m.pkey = p.lg_PREENREGISTREMENT_ID LIMIT 1),`
  + ` (SELECT DATE(r.dt_CREATED) FROM t_recettes r WHERE r.str_REF_FACTURE = p.lg_PREENREGISTREMENT_ID LIMIT 1)) FROM t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID = '${id}'`);

(async () => {
  const a = q("SELECT CONCAT(f.lg_FAMILLE_ID, ':', f.int_PRICE) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND f.int_PRICE BETWEEN 500 AND 20000 AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = ''"
    + " AND f.bool_ACCOUNT = 1 AND s.int_NUMBER_AVAILABLE >= 0 ORDER BY f.str_NAME LIMIT 1").split(':');
  produit = { id: a[0], pu: parseInt(a[1], 10) };
  stockOrigine = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
  exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 100, int_NUMBER = 100 WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`);
  if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${USER}' AND str_STATUT = 'is_Using'`) === '0') {
    exec("INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)"
      + ` VALUES ('${CAISSE}', '${USER}', 0, 0, CURDATE(), NOW() - INTERVAL 2 DAY, '${USER}', NOW(), '${USER}', 'is_Using')`);
    caisseCreee = true;
  }
  droitModif.accorder();
  droitDate.accorder();
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const api = (methode, url, corps) => p.evaluate(async ([m, u, c]) => {
    const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined });
    const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { success: false, brut: t.slice(0, 200) }; }
  }, [methode, url, corps]);
  /* jeu d'essai : vente au comptant d'un produit, comme l'ecran de vente */
  const venteComptant = async (qte = 1) => {
    const add = await api('POST', '../api/v1/vente/add/vno', { typeVenteId: '1', natureVenteId: '1', produitId: produit.id, itemPu: produit.pu, qte, qteServie: qte,
      devis: false, prevente: false, remiseId: '', userVendeurId: USER });
    const id = add.data && add.data.lgPREENREGISTREMENTID;
    if (!id) { throw new Error('vente non créée ' + JSON.stringify(add).slice(0, 200)); }
    ventes.push(id);
    const net = await api('POST', '../api/v1/vente/net/vno', { venteId: id, remiseId: '', checkUg: false });
    const data = net.data || {}, montant = data.montantNet || produit.pu * qte;
    const c = await api('POST', '../api/v1/vente/cloturer/vno', { venteId: id, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: USER,
      montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
      marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    if (!c.success) { throw new Error('vente non clôturée ' + JSON.stringify(c).slice(0, 200)); }
    return { id, ref: q(`SELECT str_REF FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${id}'`), net: montant };
  };
  /* balance vente caisse d'un jour, par l'API de l'ecran, et recettes du meme jour */
  const etatJour = async (jour) => {
    const r = await api('GET', `../api/v1/balance/balancesalecash?dtStart=${jour}&dtEnd=${jour}`);
    const m = r.metaData || {};
    return { esp: Number(m.montantEsp || 0), net: Number(m.montantNet || 0), recettes: recettesDu(jour) };
  };
  /* jeu d'essai : vente ramenee a hier (vente, lignes, balance, reglements, recette) */
  const versHier = (id) => exec(`UPDATE t_preenregistrement SET dt_CREATED = dt_CREATED - INTERVAL 1 DAY, dt_UPDATED = dt_UPDATED - INTERVAL 1 DAY, completion_date = completion_date - INTERVAL 1 DAY WHERE lg_PREENREGISTREMENT_ID = '${id}';`
    + `UPDATE t_preenregistrement_detail SET dt_CREATED = dt_CREATED - INTERVAL 1 DAY, dt_UPDATED = dt_UPDATED - INTERVAL 1 DAY WHERE lg_PREENREGISTREMENT_ID = '${id}';`
    + `UPDATE mvttransaction SET mvtdate = mvtdate - INTERVAL 1 DAY, createdAt = createdAt - INTERVAL 1 DAY WHERE pkey = '${id}';`
    + `UPDATE vente_reglement SET mvtDate = mvtDate - INTERVAL 1 DAY WHERE vente_id = '${id}';`
    + `UPDATE t_recettes SET dt_CREATED = dt_CREATED - INTERVAL 1 DAY, dt_UPDATED = dt_UPDATED - INTERVAL 1 DAY WHERE str_REF_FACTURE = '${id}';`);
  /* « Vente terminées » : periode et reference saisies au clavier, Entree ; la ligne de la vente affichee */
  const chercher = async (vente, du) => {
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Vente terminées');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    if (du) {
      await cliquer(p, 'ventemanager #dtStart');
      await p.keyboard.press('Control+A'); await p.keyboard.type(du, { delay: 20 }); await p.keyboard.press('Tab');
    }
    await cliquer(p, 'ventemanager #query');
    await p.keyboard.press('Control+A'); await p.keyboard.type(vente.ref, { delay: 20 }); await p.keyboard.press('Enter');
    await p.waitForFunction((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      return !s.isLoading() && s.findExact('lgPREENREGISTREMENTID', id) >= 0; }, vente.id, { timeout: 60000 });
    await p.waitForTimeout(800);
    return p.evaluate((id) => { const g = Ext.ComponentQuery.query('ventemanager gridpanel')[0], s = g.getStore();
      return g.getView().getNode(s.getAt(s.findExact('lgPREENREGISTREMENTID', id))).id; }, vente.id);
  };
  const icone = (ligne, infobulle) => p.locator(`#${ligne} img[data-qtip="${infobulle}"]`).filter({ visible: true }).first();
  const message = async (bouton) => {
    const fin = Date.now() + 20000; let t = '';
    while (Date.now() < fin) { t = await texteMessage(p); if (t && !/patienter|cours de traitement/i.test(t)) { break; } await p.waitForTimeout(250); }
    if (t && bouton) { await repondre(p, bouton).catch(() => {}); await p.waitForTimeout(400); }
    return t.replace(/\s+/g, ' ');
  };
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const avant = { hier: await etatJour(HIER), jour: await etatJour(AUJOURDHUI) };
    const stock0 = stockProduit();
    const vo = await venteComptant();
    const ancienne = await venteComptant();
    const triple = await venteComptant(3);
    ok('Bilan des ventes : une recette, un mouvement de caisse, un règlement chacune, au net ; stock - 5',
      [vo, ancienne, triple].every((v) => traces(v.id) === `1 ${v.net} 1 ${v.net} 1`) && stockProduit() === stock0 - 5,
      [vo, ancienne, triple].map((v) => traces(v.id) + ' / net ' + v.net).join(' ; ') + ` | stock ${stockProduit()} / ${stock0 - 5}`);
    /* jeu d'essai : la premiere devient une vente VO (seules les VO ont « Modifier la date ») ; la seconde est d'hier */
    exec(`UPDATE t_preenregistrement SET lg_TYPE_VENTE_ID = '2', str_TYPE_VENTE = 'VO' WHERE lg_PREENREGISTREMENT_ID = '${vo.id}';`
      + `UPDATE mvttransaction SET typeTransaction = 1, typeMvtCaisseId = '8' WHERE pkey = '${vo.id}';`); /* comme une vraie VO : vente, mouvement et balance */
    versHier(ancienne.id);
    versHier(triple.id);
    ok('Précondition : vente d\'hier, balance et recette d\'hier', dates(ancienne.id) === `${HIER} ${HIER} ${HIER}`, dates(ancienne.id));

    /* 1. « Modifier la date » d'une vente VO */
    const ligneVo = await chercher(vo);
    await icone(ligneVo, 'Modifier la date').click();
    await p.waitForFunction(() => Ext.ComponentQuery.query('ventedate').some((w) => w.isVisible(true)), null, { timeout: 20000 });
    await cliquer(p, 'ventedate datefield[name=date]');
    await p.keyboard.press('Control+A'); await p.keyboard.type(HIER_ECRAN, { delay: 20 }); await p.keyboard.press('Tab');
    await cliquer(p, 'ventedate timefield[name=heure]');
    await p.keyboard.press('Control+A'); await p.keyboard.type('10:00', { delay: 20 }); await p.keyboard.press('Tab');
    await cliquer(p, 'ventedate #btnUpdateDate');
    const m1 = await message('no'); /* « Voulez-vous imprimer le ticket ? » : non */
    const d1 = dates(vo.id);
    ok('« Modifier la date » : la vente et la balance passent à hier', d1.startsWith(`${HIER} ${HIER}`), m1 + ' | ' + d1);
    ok('« Modifier la date » : la recette passe aussi à hier', d1 === `${HIER} ${HIER} ${HIER}`, d1);
    ok('« Modifier la date » : aucune trace de plus (une recette, un mouvement, un règlement), stock inchangé',
      traces(vo.id) === `1 ${vo.net} 1 ${vo.net} 1` && stockProduit() === stock0 - 5, traces(vo.id) + ` | stock ${stockProduit()}`);

    /* 2. modification d'une vente d'hier : quantite 1 -> 2 */
    const ligne = await chercher(ancienne, HIER_ECRAN);
    await icone(ligne, 'Modifier').click();
    await choisirMotif(p);
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr'); return c.current && c.current.lgPREENREGISTREMENTID
      && Ext.ComponentQuery.query('doventemanager #btnCloture').some((x) => x.isVisible(true)); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const copie = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    const ligneCopie = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${copie}' LIMIT 1`);
    /* comme la grille de l'ecran (onGridEdit) */
    await api('POST', '../api/v1/vente/update/item/vno', { itemId: ligneCopie, qte: 2, qteServie: 2, itemPu: produit.pu, produitId: produit.id });
    await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'); c.toRecalculate = true; if (c.refresh) { c.refresh(); } });
    await p.waitForTimeout(1500);
    const terminer = async (encore) => {
      await p.evaluate(() => { const c = testextjs.app.getController('VenteCtr'), net = Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0];
        c.getMontantRecu().setValue((net ? Number(String(net.getValue()).replace(/\D/g, '')) : 0) || c.current.intPRICE); });
      await cliquer(p, 'doventemanager #btnCloture');
      await p.waitForTimeout(2500);
      const m = await texteMessage(p);
      if (encore !== false && /net à payer/i.test(m)) { await repondre(p, 'ok').catch(() => {}); await p.waitForTimeout(2500); await terminer(false); }
    };
    await terminer();
    await p.waitForTimeout(4000);
    await message('no').catch(() => '');
    const statut = q(`SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${copie}'`);
    const d2 = dates(copie);
    ok('Vente d\'hier modifiée : la nouvelle vente est clôturée à la date d\'hier, sa balance aussi', statut === 'is_Closed' && d2.startsWith(`${HIER} ${HIER}`), statut + ' | ' + d2);
    ok('Vente d\'hier modifiée : sa recette est aussi à la date d\'hier', d2 === `${HIER} ${HIER} ${HIER}`, d2);
    const netCopie = Number(q(`SELECT int_PRICE - IFNULL(int_PRICE_REMISE, 0) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${copie}'`));
    ok('Vente d\'hier modifiée : une recette, un mouvement, un règlement, au net de la nouvelle vente (2 boîtes)',
      traces(copie) === `1 ${netCopie} 1 ${netCopie} 1` && netCopie === 2 * produit.pu, traces(copie) + ' / net ' + netCopie);
    ok('Vente d\'hier modifiée : stock = avant - 1 (1 boîte rendue, 2 sorties)', stockProduit() === stock0 - 6, `${stockProduit()} / ${stock0 - 6}`);

    /* une question restee ouverte (impression du ticket) masquerait le menu : on y repond « Non » */
    for (let i = 0; i < 5 && await texteMessage(p); i++) { await repondre(p, 'no').catch(() => {}); await p.waitForTimeout(600); }
    /* 3. annulation d'une vente d'hier, quantite 3 */
    droitAnnuler.accorder();
    const ligneT = await chercher(triple, HIER_ECRAN);
    await icone(ligneT, 'Annuler.Vente').click();
    await confirmerAnnulation(p);
    for (let i = 0; i < 60 && !/impression/i.test(await texteMessage(p)); i++) { await p.waitForTimeout(1000); }
    await repondre(p, 'no').catch(() => {});
    await p.waitForTimeout(1000);
    const annulation = q(`SELECT IFNULL(MAX(lg_PREENREGISTREMENT_ID), '') FROM t_preenregistrement WHERE lg_PARENT_ID = '${triple.id}' AND int_PRICE < 0`);
    for (let i = 0; i < 20 && stockProduit() !== stock0 - 3; i++) { await p.waitForTimeout(500); }
    ok('Annulation d\'une vente d\'hier (3 boîtes) : vente d\'annulation créée, stock rendu (avant - 3)', !!annulation && stockProduit() === stock0 - 3,
      `${annulation} | stock ${stockProduit()} / ${stock0 - 3}`);
    ok('Annulation : un mouvement de caisse et une recette opposés au net ; la vente d\'origine garde les siens',
      !!annulation && traces(annulation).startsWith(`1 ${-triple.net} 1 ${-triple.net} `) && traces(triple.id) === `1 ${triple.net} 1 ${triple.net} 1`,
      (annulation ? traces(annulation) : '-') + ' | origine ' + traces(triple.id));
    const da = annulation ? dates(annulation).split(' ') : [];
    ok('Annulation : son mouvement de caisse et sa recette sont au même jour', da.length === 3 && da[1] === da[2], da.join(' '));

    /* rapprochement : balance vente caisse = recettes, jour par jour */
    const apres = { hier: await etatJour(HIER), jour: await etatJour(AUJOURDHUI) };
    for (const [nom, cle] of [['hier', 'hier'], ['aujourd\'hui', 'jour']]) {
      const dRec = apres[cle].recettes - avant[cle].recettes, dEsp = apres[cle].esp - avant[cle].esp, dNet = apres[cle].net - avant[cle].net;
      ok(`Rapprochement ${nom} : écart de la balance (espèces, net) = écart des recettes`, dEsp === dRec && dNet === dRec,
        `espèces ${dEsp} / net ${dNet} / recettes ${dRec}`);
    }
    const reste = apres.hier.recettes - avant.hier.recettes + apres.jour.recettes - avant.jour.recettes;
    ok('Rapprochement sur les deux jours : il reste la vente VO et la vente modifiée, rien d\'autre', reste === vo.net + netCopie,
      `${reste} / ${vo.net} + ${netCopie}`);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, String(e.stack).split('\n').filter((l) => /Error|test-ecran/.test(l)).join(' | '));
  } finally {
    await b.close();
    nettoyer();
    if (caisseCreee) { exec(`DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}'`); }
    droitModif.reprendre();
    droitDate.reprendre();
    droitAnnuler.reprendre();
    ok('Jeu d\'essai retiré, stock remis', q(ventesDuTest().replace(/^/, 'SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (') + ')') === '0'
      && q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${produit.id}' AND lg_EMPLACEMENT_ID = '1'`) === stockOrigine.join('|'));
  }
  const k = res.filter((x) => x.c).length;
  console.log('\n' + k + '/' + res.length + ' OK');
  process.exit(k === res.length ? 0 : 1);
})();
