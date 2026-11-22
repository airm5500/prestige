/* COMMANDE EN COURS : LOT ET DATE DE PEREMPTION SAISIS AU CLAVIER (plan du 21/11, point 16.1).
 *
 * Parametre KEY_SAISIE_PEREMPTION_COMMANDE mis a 1 le temps du test (remis ensuite). Par l'ecran, au clavier :
 *  - produit → quantité 20 → Entrée : la petite fenêtre s'ouvre, curseur sur le lot ; « A2341 » Entrée ; « 01/27 » :
 *    aperçu « → 31/01/2027 » ; Entrée : ligne validée, curseur revenu sur la recherche du produit ;
 *  - même produit, 5, même lot (« 310127 ») : les quantités s'additionnent, jamais deux lignes pour un lot ;
 *  - « 13/27 » : erreur sous le champ, rien d'écrit ; corrigé en « 012028 » (fin du mois) : enregistré ;
 *  - deux champs vides + Entrée : ligne sans lot ; Échap : rien d'ajouté ;
 *  - DataMatrix scanné dans le champ du lot (avec numéro de série 21 avant le lot) : lot et péremption repris ;
 *  - double-clic sur LOTS : les lots de la ligne, modifiables ; somme > quantité refusée, rien d'écrit ; correction
 *    et retrait enregistrés ;
 *  - rapprochement : colonnes LOTS / DATE DE PÉREMPTION de la grille = vue des lots = base, lot par lot ;
 *  - bilan : une ligne par produit, quantités et lots exacts, une seule commande ;
 *  - BL créé par « Commande en cours » : lots du BL et lots en base (t_lot) = lots saisis, stock inchangé ;
 *  - 1366×768, 1280×720, 1920×1080 : la petite fenêtre tient dans l'écran ;
 *  - paramètre à 0 : Entrée sur la quantité ajoute la ligne sans fenêtre (comme avant).
 * Commande d'essai retiree, parametre remis a sa valeur.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const CLE = 'KEY_SAISIE_PEREMPTION_COMMANDE';
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const P = q("SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_CIP) FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$'"
  + " AND int_PRICE BETWEEN 500 AND 5000 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 2 OFFSET 3").split(/\r?\n/).map((l) => l.split('|'));
const valeur0 = q(`SELECT IFNULL(MAX(str_VALUE), '~') FROM t_parameters WHERE str_KEY = '${CLE}'`);

const commandes = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ORDER_ID, '''')), '''-''') FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
const REF_BL = 'E2ELC' + Date.now().toString().slice(-8);
const PRODUITS = () => "'" + P.map((x) => x[0]).join("','") + "'";
function nettoyer() {
  const c = commandes();
  const bls = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_BON_LIVRAISON_ID, '''')), '''-''') FROM t_bon_livraison WHERE lg_ORDER_ID IN (${c})`);
  q(`DELETE FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}';`
    + ` DELETE FROM t_etiquette WHERE lg_FAMILLE_ID IN (${PRODUITS()}) AND dt_CREATED >= '${DEBUT}';`
    + ` DELETE FROM notification WHERE entity_ref IN (${bls});`
    + ` DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (${bls}); DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID IN (${bls});`
    + ` DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${c}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${c});`);
}
const ligne = (fid) => {
  const r = q(`SELECT CONCAT_WS('|', d.int_NUMBER, IFNULL(d.lots, '[]'), d.lg_ORDERDETAIL_ID) FROM t_order_detail d WHERE d.lg_FAMILLE_ID = '${fid}' AND d.lg_ORDER_ID IN (${commandes()})`);
  if (!r) { return { n: 0, lots: [], id: null, lignes: 0 }; }
  const l = r.split(/\r?\n/);
  const x = l[0].split('|');
  return { n: Number(x[0]), lots: JSON.parse(x[1] || '[]') || [], id: x[2], lignes: l.length };
};
const lotsTexte = (lots) => lots.map((x) => x.numeroLot + ':' + x.datePeremption + ':' + x.quantity).sort().join(',');

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const fenetre = () => p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenSaisieLot').filter((x) => x.isVisible())[0];
    if (!w) { return null; }
    const a = document.activeElement, r = w.getEl().dom.getBoundingClientRect();
    return { focus: a === w.down('#lot').inputEl.dom ? 'lot' : a === w.down('#peremption').inputEl.dom ? 'peremption' : (a && a.id),
      apercu: w.down('#apercu').getEl().dom.textContent, erreurLot: w.down('#lot').getActiveError() || '', erreurDate: w.down('#peremption').getActiveError() || '',
      lot: w.down('#lot').getValue(), date: w.down('#peremption').getValue(), dansEcran: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight };
  });
  const ouvrirEcran = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('ordermanagerlist', 'Ajouter les articles a une commande', '0', 'is_Process'));
    await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered && Ext.getCmp('int_QUANTITE'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
    await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 15000 });
  };
  /* produit par son CIP (liste, clic), quantite, Entree */
  const produit = async (cip, qte) => {
    await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(cip, { delay: 25 });
    await p.waitForFunction(() => { const c = Ext.getCmp('str_NAME'); return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 20000 });
    await p.waitForTimeout(300);
    await p.locator('.x-boundlist-item:visible').first().click();
    await p.waitForFunction(() => document.activeElement && /int_QUANTITE/.test(document.activeElement.id), null, { timeout: 10000 });
    await p.keyboard.press('Control+A'); await p.keyboard.type(String(qte));
    await p.keyboard.press('Enter');
    await p.waitForTimeout(700);
  };
  const taper = async (texte, touche) => { await p.keyboard.press('Control+A'); if (texte) { await p.keyboard.type(texte, { delay: 30 }); } await p.waitForTimeout(200); if (touche) { await p.keyboard.press(touche); } await p.waitForTimeout(900); };
  try {
    nettoyer();
    ok('Préconditions : grossiste, deux produits au CIP unique, paramètre présent (migration)', GROSSISTE && P.length === 2 && valeur0 !== '~', JSON.stringify({ P, valeur0 }));
    q(`UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '${CLE}'`);
    await p.goto(BASE_URL() + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await ouvrirEcran();

    /* a. lot + date « 01/27 » */
    await produit(P[0][1], 20);
    let f = await fenetre();
    ok('Quantité + Entrée : la petite fenêtre s\'ouvre, curseur sur le lot, rien d\'ajouté encore', f && f.focus === 'lot' && ligne(P[0][0]).n === 0, JSON.stringify(f));
    for (const [l, h] of [[1280, 720], [1920, 1080], [1366, 768]]) {
      await p.setViewportSize({ width: l, height: h }); await p.waitForTimeout(500);
      const g = await fenetre();
      ok(`${l}×${h} : la petite fenêtre tient dans l'écran`, g && g.dansEcran, JSON.stringify(g));
    }
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('#fenSaisieLot #lot')[0].inputEl.id));
    await taper('A2341', 'Enter');
    f = await fenetre();
    ok('Lot + Entrée : le curseur passe à la péremption', f && f.focus === 'peremption', JSON.stringify(f));
    await taper('01/27');
    f = await fenetre();
    ok('« 01/27 » : aperçu « → 31/01/2027 » (fin du mois)', f && /→ 31\/01\/2027/.test(f.apercu), f && f.apercu);
    await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    let l1 = ligne(P[0][0]);
    ok('Entrée sur la date : fenêtre fermée, ligne de 20 avec le lot A2341 au 31/01/2027 (20)', !(await fenetre()) && l1.n === 20 && lotsTexte(l1.lots) === 'A2341:31/01/2027:20', JSON.stringify(l1));
    ok('… curseur revenu sur la recherche du produit, vidée', await p.evaluate(() => /str_NAME/.test(document.activeElement && document.activeElement.id) && Ext.getCmp('str_NAME').getRawValue() === ''));

    /* b. meme lot : cumul */
    await produit(P[0][1], 5);
    await taper('A2341', 'Enter'); await taper('310127', 'Enter'); await p.waitForTimeout(800);
    l1 = ligne(P[0][0]);
    ok('Même lot saisi deux fois (« 310127 ») : ligne 25, un seul lot A2341 à 25', l1.n === 25 && l1.lignes === 1 && lotsTexte(l1.lots) === 'A2341:31/01/2027:25', JSON.stringify(l1));

    /* c. date impossible puis corrigee */
    await produit(P[0][1], 3);
    await taper('B77', 'Enter'); await taper('13/27', 'Enter');
    f = await fenetre();
    ok('« 13/27 » : erreur sous le champ, fenêtre ouverte, rien d\'écrit', f && /impossible/i.test(f.erreurDate) && ligne(P[0][0]).n === 25, JSON.stringify(f));
    await taper('012028', 'Enter'); await p.waitForTimeout(800);
    l1 = ligne(P[0][0]);
    ok('Corrigé en « 012028 » : ligne 28, lot B77 au 31/01/2028 (3), A2341 inchangé', l1.n === 28 && lotsTexte(l1.lots) === 'A2341:31/01/2027:25,B77:31/01/2028:3', JSON.stringify(l1));

    /* d. champs vides ; Echap */
    await produit(P[1][1], 2);
    await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
    let l2 = ligne(P[1][0]);
    ok('Entrée sur les deux champs vides : ligne de 2 sans lot', !(await fenetre()) && l2.n === 2 && l2.lots.length === 0, JSON.stringify(l2));
    await produit(P[1][1], 1);
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    l2 = ligne(P[1][0]);
    ok('Échap : fenêtre fermée, rien d\'ajouté (toujours 2)', !(await fenetre()) && l2.n === 2, JSON.stringify(l2));

    /* e. DataMatrix dans le champ du lot (numero de serie 21 avant le lot) */
    await produit(P[0][1], 1);
    await taper('0103400930000106' + '17290331' + '21SER9X' + '<GS>' + '10DM9', 'Enter'); await p.waitForTimeout(800);
    f = await fenetre();
    ok('Scan DataMatrix dans le lot : lot DM9 et péremption 31/03/2029 repris, curseur sur la date', f && f.lot === 'DM9' && f.date === '31/03/2029' && f.focus === 'peremption', JSON.stringify(f));
    await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    l1 = ligne(P[0][0]);
    ok('… Entrée : ligne 29, lot DM9 (1) ajouté', l1.n === 29 && lotsTexte(l1.lots) === 'A2341:31/01/2027:25,B77:31/01/2028:3,DM9:31/03/2029:1', JSON.stringify(l1));

    /* f. rapprochement grille = vue des lots = base */
    await p.waitForFunction(() => !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const grille = await p.evaluate((fid) => { const r = Ext.getCmp('gridpanelID').getStore().getRange().find((x) => x.get('lg_FAMILLE_ID') === fid); return r ? { lots: r.get('lotNums'), dates: r.get('datePeremption') } : null; }, P[0][0]);
    const base = l1.lots;
    const grilleOk = grille && base.every((x) => String(grille.lots).split(/\s*,\s*/).includes(x.numeroLot) && String(grille.dates).includes(x.datePeremption))
      && String(grille.lots).split(/\s*,\s*/).filter((x) => x).length === base.length;
    ok('Rapprochement : colonnes LOTS / DATE DE PÉREMPTION de la grille = base', grilleOk, JSON.stringify({ grille, base: lotsTexte(base) }));
    const cellule = await p.evaluate((fid) => { const g = Ext.getCmp('gridpanelID'), v = g.getView(), i = g.getStore().findBy((x) => x.get('lg_FAMILLE_ID') === fid);
      const col = g.columns.find((c) => c.dataIndex === 'lotNums'), td = v.getNode(i).querySelector('.x-grid-cell-' + col.id) || v.getCell(i, col).dom; const r = td.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, P[0][0]);
    await p.mouse.dblclick(cellule.x, cellule.y);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenLotsLigne').some((w) => w.isVisible()), null, { timeout: 15000 });
    await p.waitForTimeout(500);
    const vue = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenLotsLigne')[0]; const l = []; w.down('#grilleLots').getStore().each((r) => l.push({ numeroLot: r.get('numeroLot'), datePeremption: r.get('datePeremption'), quantity: r.get('quantity') })); return { l, titre: w.title }; });
    ok('Double-clic sur LOTS : vue des lots de la ligne = base (lot, date, quantité)', lotsTexte(vue.l) === lotsTexte(base) && /qté 29/.test(vue.titre), JSON.stringify(vue));

    /* g. modification : somme > quantite refusee, puis correction et retrait */
    const editer = async (ligneIdx, colIdx, texte) => {
      const pos = await p.evaluate(([i, c]) => { const g = Ext.ComponentQuery.query('#fenLotsLigne #grilleLots')[0]; const td = g.getView().getCell(i, g.columns[c]).dom.getBoundingClientRect(); return { x: td.x + td.width / 2, y: td.y + td.height / 2 }; }, [ligneIdx, colIdx]);
      await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(300);
      await p.keyboard.press('Control+A'); await p.keyboard.type(texte); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    };
    const iB77 = vue.l.findIndex((x) => x.numeroLot === 'B77');
    await editer(iB77, 2, '30');
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('#fenLotsLigne #enregistrerLots')[0].getId()));
    await p.waitForTimeout(1500);
    const etat = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenLotsLigne')[0]; return w && w.isVisible() ? w.down('#etatLots').getEl().dom.textContent : 'fermée'; });
    ok('Vue des lots : somme 52 > 29 refusée avec un message, fenêtre ouverte, rien d\'écrit', /dépasse la quantité de la ligne \(29\)/.test(etat) && lotsTexte(ligne(P[0][0]).lots) === lotsTexte(base), etat);
    await editer(iB77, 2, '2');
    const iDM = await p.evaluate(() => { const s = Ext.ComponentQuery.query('#fenLotsLigne #grilleLots')[0].getStore(); return s.findExact('numeroLot', 'DM9'); });
    const retirer = await p.evaluate((i) => { const g = Ext.ComponentQuery.query('#fenLotsLigne #grilleLots')[0]; const n = g.getView().getNode(i).querySelector('.x-action-col-icon'); const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, iDM);
    await p.mouse.click(retirer.x, retirer.y); await p.waitForTimeout(300);
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('#fenLotsLigne #enregistrerLots')[0].getId()));
    await p.waitForTimeout(1800);
    l1 = ligne(P[0][0]);
    ok('Correction (B77 à 2) et retrait (DM9) enregistrés, fenêtre fermée', !(await p.evaluate(() => Ext.ComponentQuery.query('#fenLotsLigne').some((w) => w.isVisible())))
      && lotsTexte(l1.lots) === 'A2341:31/01/2027:25,B77:31/01/2028:2' && l1.n === 29, JSON.stringify(l1));
    await p.waitForFunction(() => !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 15000 }); await p.waitForTimeout(600);
    const grille2 = await p.evaluate((fid) => { const r = Ext.getCmp('gridpanelID').getStore().getRange().find((x) => x.get('lg_FAMILLE_ID') === fid); return r ? r.get('lotNums') : null; }, P[0][0]);
    ok('Rapprochement après modification : grille = base', String(grille2).split(/\s*,\s*/).sort().join(',') === 'A2341,B77', grille2);

    /* h. bilan */
    ok('Bilan : une seule commande, une ligne par produit (29 et 2)', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (${commandes()})`) === '1'
      && q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID IN (${commandes()})`) === '2' && ligne(P[0][0]).n === 29 && ligne(P[1][0]).n === 2);

    /* h2. BL cree par « Commande en cours » : les lots saisis arrivent dans le BL et dans les lots, comme un import */
    const stock0 = q(`SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID IN (${PRODUITS()})`);
    const cmd = q(`SELECT CONCAT(lg_ORDER_ID, '|', str_REF_ORDER) FROM t_order WHERE lg_ORDER_ID IN (${commandes()})`).split('|');
    await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
    await p.evaluate((r) => { Ext.getCmp('rechecher').setValue(r); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); }, cmd[1]);
    await p.waitForFunction((c) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('lg_ORDER_ID', c) >= 0; }, cmd[0], { timeout: 30000 });
    await p.waitForTimeout(600);
    for (let essai = 0; essai < 6; essai++) {
      await p.evaluate((c) => { document.querySelectorAll('#e2e-creer-bl').forEach((x) => x.removeAttribute('id'));
        const g = Ext.ComponentQuery.query('i_order_manager')[0], r = g.getStore().getAt(g.getStore().findExact('lg_ORDER_ID', c));
        const img = g.getView().getNode(r).querySelector('img[data-qtip="Créer le bon de livraisson"]'); img.id = 'e2e-creer-bl'; img.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, cmd[0]);
      try { await p.click('#e2e-creer-bl', { timeout: 4000 }); break; } catch (e) { if (essai === 5) { throw e; } await p.waitForTimeout(800); }
    }
    await p.waitForFunction(() => { const c = Ext.getCmp('str_REF_LIVRAISON'); return c && c.isVisible(); }, null, { timeout: 20000 });
    await p.waitForTimeout(500);
    await p.fill('#' + await p.evaluate(() => Ext.getCmp('str_REF_LIVRAISON').inputEl.dom.id), REF_BL);
    await p.fill('#' + await p.evaluate(() => Ext.getCmp('int_MHT').inputEl.dom.id), '1000');
    await p.fill('#' + await p.evaluate(() => Ext.getCmp('int_TVA').inputEl.dom.id), '0');
    await p.evaluate(() => { Ext.getCmp('str_REF_LIVRAISON').up('window').down('button[text=Enregistrer]').getEl().dom.id = 'e2e-enregistrer-bl'; });
    await p.click('#e2e-enregistrer-bl');
    await p.waitForTimeout(800);
    /* montant different du montant machine : confirmation existante de la fenetre de creation (inchangee) */
    await p.evaluate(() => { const mb = Ext.MessageBox; if (mb.isVisible() && /different/.test(mb.msg.getEl().dom.textContent)) { mb.down('button[itemId=yes]').getEl().dom.id = 'e2e-oui'; } });
    if (await p.$('#e2e-oui')) { await p.click('#e2e-oui'); await p.evaluate(() => document.getElementById('e2e-oui').removeAttribute('id')); }
    for (let i = 0; i < 40 && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '${cmd[0]}'`) === '0'; i++) { await p.waitForTimeout(500); }
    await p.waitForTimeout(1500);
    const blLots = q(`SELECT IFNULL(d.lots, '[]') FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID WHERE b.lg_ORDER_ID = '${cmd[0]}' AND d.lg_FAMILLE_ID = '${P[0][0]}'`);
    const tlot = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT_WS(':', int_NUM_LOT, DATE_FORMAT(dt_PEREMPTION, '%d/%m/%Y'), int_NUMBER) ORDER BY int_NUM_LOT), '') FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}' AND lg_FAMILLE_ID = '${P[0][0]}'`);
    const autre = q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}' AND lg_FAMILLE_ID = '${P[1][0]}'`);
    let lotsBl = []; try { lotsBl = JSON.parse(blLots || '[]') || []; } catch (e) { lotsBl = []; }
    ok('BL créé par « Commande en cours » : lots de la ligne du BL = lots saisis en commande', lotsTexte(lotsBl) === 'A2341:31/01/2027:25,B77:31/01/2028:2', blLots);
    ok('… lots du BL (t_lot) = lots saisis : numéro, péremption, quantité ; aucun lot pour la ligne sans lot', tlot.split(',').sort().join(',') === 'A2341:31/01/2027:25,B77:31/01/2028:2' && autre === '0', tlot + ' / ' + autre);
    ok('… bilan : stock des produits inchangé tant que le BL n\'est pas entré en stock', q(`SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID IN (${PRODUITS()})`) === stock0, stock0);

    /* i. parametre a 0 : comme avant */
    q(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${CLE}'`);
    await ouvrirEcran();
    await produit(P[1][1], 4); await p.waitForTimeout(1500);
    const n0 = q(`SELECT COUNT(*) FROM t_order_detail d JOIN t_order o ON o.lg_ORDER_ID = d.lg_ORDER_ID WHERE o.dt_CREATED >= '${DEBUT}' AND o.lg_USER_ID = '${ADMIN}' AND d.lg_FAMILLE_ID = '${P[1][0]}' AND d.int_NUMBER = 4`);
    ok('Paramètre à 0 : Entrée sur la quantité ajoute la ligne, sans fenêtre (comme avant)', !(await fenetre()) && n0 === '1', n0);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try {
      nettoyer();
      if (valeur0 !== '~') { q(`UPDATE t_parameters SET str_VALUE = '${valeur0}' WHERE str_KEY = '${CLE}'`); }
    } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : commandes, BL et lots retirés, paramètre remis', q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = '${REF_BL}'`) === '0' && q(`SELECT COUNT(*) FROM t_bon_livraison WHERE str_REF_LIVRAISON = '${REF_BL}'`) === '0'
      && q(`SELECT IFNULL(MAX(str_VALUE), '~') FROM t_parameters WHERE str_KEY = '${CLE}'`) === valeur0);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();

function BASE_URL() { return process.env.BASE || 'http://localhost:8080/prestige'; }
