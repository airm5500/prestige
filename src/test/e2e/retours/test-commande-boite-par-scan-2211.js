/* COMMANDE EN COURS : 1 BOITE PAR SCAN DU DATAMATRIX DE LA BOITE (reponse du 22/11 sur le point 16.1 du plan du 21/11).
 *
 * Parametre KEY_SAISIE_PEREMPTION_COMMANDE mis a 1 le temps du test (remis ensuite). Le DataMatrix d'une boite (produit
 * 01, peremption 17, lot 10, parfois numero de serie 21) est scanne dans le champ « Article », comme le fait une
 * douchette (texte puis Entree) :
 *  - « 1 boîte par scan » : la ligne du produit (retrouve par l'EAN du code) prend 1 boite, avec son lot et sa
 *    peremption ; aucune fenetre, aucune quantite a taper, champ vide pour le scan suivant ; meme lot rescanne : +1 ;
 *    autre lot : un lot de plus sur la meme ligne ; code avec prefixe « ]d2 » et numero de serie : lu aussi ;
 *  - « Scan puis quantité » : produit et lot annonces, curseur sur la quantite ; Entree ajoute la quantite tapee ;
 *  - boite perimee, produit introuvable : rien d'ajoute, message ; aucune proposition de creation de fiche ;
 *  - code sans lot : rien d'ajoute (comme avant) ;
 *  - rapprochement : grille (LOTS) = vue des lots (double-clic) = base, lot par lot ;
 *  - bilan : une seule commande, une seule ligne pour le produit, quantite = somme des lots ;
 *  - parametre a 0 : le meme scan n'ajoute rien (comme avant).
 * Commande d'essai retiree, EAN du produit et parametre remis.
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
  + " AND int_PRICE BETWEEN 500 AND 5000 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 1 OFFSET 7").split('|');
const valeur0 = q(`SELECT IFNULL(MAX(str_VALUE), '~') FROM t_parameters WHERE str_KEY = '${CLE}'`);
/* EAN d'essai (13 chiffres, inconnu de la base) pose sur le produit le temps du test */
const EAN = '3400' + '8' + String(Date.now()).slice(-7) + '3';
const EAN_INCONNU = '3400' + '7' + String(Date.now()).slice(-7) + '9';
let ean0 = null;

const commandes = () => q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ORDER_ID, '''')), '''-''') FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
function nettoyer() {
  const c = commandes();
  q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${c}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${c});`);
}
const ligne = () => {
  const r = q(`SELECT CONCAT_WS('|', d.int_NUMBER, IFNULL(d.lots, '[]'), d.lg_ORDERDETAIL_ID) FROM t_order_detail d WHERE d.lg_FAMILLE_ID = '${P[0]}' AND d.lg_ORDER_ID IN (${commandes()})`);
  if (!r) { return { n: 0, lots: [], lignes: 0 }; }
  const l = r.split(/\r?\n/), x = l[0].split('|');
  return { n: Number(x[0]), lots: JSON.parse(x[1] || '[]') || [], id: x[2], lignes: l.length };
};
const lotsTexte = (lots) => lots.map((x) => x.numeroLot + ':' + x.datePeremption + ':' + x.quantity).sort().join(',');
/* DataMatrix d'une boite : 01 GTIN-14, 17 AAMMJJ, 10 lot (dernier, sans separateur) */
const boite = (ean, aammjj, lot) => '010' + ean + '17' + aammjj + '10' + lot;

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const dialogues = []; p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  const etat = () => p.evaluate(() => Ext.getCmp('scanEtat').getEl().dom.textContent);
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).map((w) => w.title || w.itemId || w.xtype));
  const scanner = async (texte) => {
    const avant = await etat();
    await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(texte, { delay: 2 }); await p.keyboard.press('Enter');
    await p.waitForFunction((a) => { const t = Ext.getCmp('scanEtat').getEl().dom.textContent; return t && t !== a; }, avant, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(700);
  };
  const ouvrirEcran = async () => {
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('ordermanagerlist', 'Ajouter les articles a une commande', '0', 'is_Process'));
    await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered && Ext.getCmp('scanMode'), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
    await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 15000 });
  };
  try {
    nettoyer();
    ok('Préconditions : grossiste, produit au CIP unique, paramètre présent, EAN d\'essai libres', GROSSISTE && P.length === 2 && valeur0 !== '~'
      && q(`SELECT COUNT(*) FROM t_famille WHERE int_EAN13 IN ('${EAN}', '${EAN_INCONNU}') OR code_ean_fabriquant IN ('${EAN}', '${EAN_INCONNU}')`) === '0', JSON.stringify({ P, valeur0 }));
    ean0 = q(`SELECT IFNULL(int_EAN13, '~') FROM t_famille WHERE lg_FAMILLE_ID = '${P[0]}'`);
    q(`UPDATE t_famille SET int_EAN13 = '${EAN}' WHERE lg_FAMILLE_ID = '${P[0]}'; UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '${CLE}'`);
    await p.goto(BASE_URL() + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await ouvrirEcran();
    ok('Mode « 1 boîte par scan » choisi par défaut', await p.evaluate(() => Ext.getCmp('scanMode').getValue().scanMode === 'UNITE'));

    /* a. 1 boite par scan */
    await scanner(boite(EAN, '290331', 'BX1'));
    let l = ligne();
    ok('Scan de la boîte : ligne à 1, lot BX1 au 31/03/2029 (1), sans fenêtre ni quantité à taper', l.n === 1 && lotsTexte(l.lots) === 'BX1:31/03/2029:1'
      && (await fenetres()).length === 0, JSON.stringify(l) + ' ' + await etat());
    ok('… message dans l\'écran, champ « Article » vidé, curseur dedans pour le scan suivant', /✓ 1 ×.*lot BX1/.test(await etat())
      && await p.evaluate(() => Ext.getCmp('str_NAME').getRawValue() === '' && /str_NAME/.test(document.activeElement && document.activeElement.id)), await etat());
    await scanner(boite(EAN, '290331', 'BX1'));
    l = ligne();
    ok('Même boîte rescannée : ligne à 2, lot BX1 à 2, une seule ligne', l.n === 2 && l.lignes === 1 && lotsTexte(l.lots) === 'BX1:31/03/2029:2', JSON.stringify(l));
    await scanner(boite(EAN, '280200', 'BX2'));
    l = ligne();
    ok('Autre lot (« 280200 », jour 00 = fin du mois) : ligne à 3, lots BX1 (2) et BX2 au 29/02/2028 (1)', l.n === 3 && lotsTexte(l.lots) === 'BX1:31/03/2029:2,BX2:29/02/2028:1', JSON.stringify(l) + ' ' + await etat());
    await scanner(']d2010' + EAN + '17280200' + '21SERIE77<GS>' + '10BX2');
    l = ligne();
    ok('Code avec préfixe « ]d2 » et numéro de série avant le lot : lu, ligne à 4, BX2 à 2', l.n === 4 && lotsTexte(l.lots) === 'BX1:31/03/2029:2,BX2:29/02/2028:2', JSON.stringify(l) + ' ' + await etat());

    /* b. refus */
    await scanner(boite(EAN, '240131', 'BXP'));
    l = ligne();
    ok('Boîte périmée (31/01/2024) : refusée avec un message, rien d\'ajouté', /périmée/i.test(await etat()) && l.n === 4 && lotsTexte(l.lots).indexOf('BXP') < 0, await etat());
    await scanner(boite(EAN_INCONNU, '290331', 'BXI'));
    ok('Produit introuvable : message (EAN lu), rien d\'ajouté, aucune proposition de création de fiche', /Aucun produit/.test(await etat()) && (await etat()).indexOf(EAN_INCONNU) >= 0
      && !(await p.evaluate(() => Ext.getCmp('scanCreation').isVisible())) && ligne().n === 4, await etat());
    await scanner('010' + EAN + '17290331');
    ok('Code sans lot : rien d\'ajouté, message « lot manquant »', /incomplet \(lot manquant\)/.test(await etat()) && ligne().n === 4, await etat());
    await scanner(boite(EAN, '280000', 'BXZ'));
    ok('Date impossible (mois 00) : rien d\'ajouté, message « date impossible »', /incomplet \(péremption manquante ou date impossible\)/.test(await etat()) && ligne().n === 4, await etat());

    /* c. scan puis quantite */
    await p.evaluate(() => { Ext.getCmp('scanMode').setValue({ scanMode: 'QUANTITE' }); });
    await scanner(boite(EAN, '300630', 'BX3'));
    const attente = await p.evaluate(() => ({ e: Ext.getCmp('scanEtat').getEl().dom.textContent, focus: document.activeElement && document.activeElement.id }));
    ok('Scan puis quantité : produit et lot annoncés, curseur sur la quantité, rien d\'ajouté encore', /saisissez la quantité/.test(attente.e) && /lot BX3/.test(attente.e)
      && /int_QUANTITE/.test(attente.focus) && ligne().n === 4, JSON.stringify(attente));
    await p.keyboard.press('Control+A'); await p.keyboard.type('6'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => /✓ 6 ×/.test(Ext.getCmp('scanEtat').getEl().dom.textContent), null, { timeout: 15000 }).catch(() => {});
    l = ligne();
    ok('… Entrée sur 6 : ligne à 10, lot BX3 au 30/06/2030 (6)', l.n === 10 && lotsTexte(l.lots) === 'BX1:31/03/2029:2,BX2:29/02/2028:2,BX3:30/06/2030:6', JSON.stringify(l) + ' ' + await etat());
    /* scan en attente puis recherche d'un autre produit : la recherche marche, le scan est abandonne */
    await scanner(boite(EAN, '300630', 'BX4'));
    await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(P[1], { delay: 25 });
    await p.waitForFunction(() => { const c = Ext.getCmp('str_NAME'); return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 }).catch(() => {});
    const autre = await p.evaluate(() => ({ liste: Ext.getCmp('str_NAME').isExpanded, n: Ext.getCmp('str_NAME').getStore().getCount(), attente: !!Ext.ComponentQuery.query('ordermanagerlist')[0].scanEnAttente }));
    ok('Scan en attente puis recherche d\'un autre produit (CIP tapé) : la liste s\'ouvre, le scan en attente est abandonné, rien d\'ajouté', autre.liste && autre.n >= 1 && !autre.attente
      && ligne().n === 10, JSON.stringify(autre));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => { Ext.getCmp('scanMode').setValue({ scanMode: 'UNITE' }); });

    /* d. rapprochement grille = vue des lots = base */
    await p.waitForFunction(() => !Ext.getCmp('gridpanelID').getStore().isLoading(), null, { timeout: 15000 }); await p.waitForTimeout(800);
    const grille = await p.evaluate((fid) => { const r = Ext.getCmp('gridpanelID').getStore().getRange().find((x) => x.get('lg_FAMILLE_ID') === fid); return r ? { n: r.get('int_NUMBER'), lots: r.get('lotNums'), dates: r.get('datePeremption') } : null; }, P[0]);
    const grilleLots = String(grille && grille.lots).split(/\s*,\s*/).filter((x) => x).sort().join(',');
    ok('Rapprochement : grille (quantité, LOTS, péremptions) = base', grille && Number(grille.n) === l.n && grilleLots === 'BX1,BX2,BX3'
      && l.lots.every((x) => String(grille.dates).includes(x.datePeremption)), JSON.stringify(grille));
    const cellule = await p.evaluate((fid) => { const g = Ext.getCmp('gridpanelID'), v = g.getView(), i = g.getStore().findBy((x) => x.get('lg_FAMILLE_ID') === fid);
      const col = g.columns.find((c) => c.dataIndex === 'lotNums'), td = v.getNode(i).querySelector('.x-grid-cell-' + col.id) || v.getCell(i, col).dom; const r = td.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, P[0]);
    await p.mouse.dblclick(cellule.x, cellule.y);
    await p.waitForFunction(() => Ext.ComponentQuery.query('#fenLotsLigne').some((w) => w.isVisible()), null, { timeout: 15000 }); await p.waitForTimeout(500);
    const vue = await p.evaluate(() => { const w = Ext.ComponentQuery.query('#fenLotsLigne')[0]; const x = []; w.down('#grilleLots').getStore().each((r) => x.push({ numeroLot: r.get('numeroLot'), datePeremption: r.get('datePeremption'), quantity: r.get('quantity') })); w.close(); return x; });
    ok('Rapprochement : vue des lots (double-clic) = base, lot par lot', lotsTexte(vue) === lotsTexte(l.lots), JSON.stringify(vue));

    /* e. bilan */
    ok('Bilan : une seule commande, une seule ligne, quantité = somme des lots', q(`SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID IN (${commandes()})`) === '1'
      && q(`SELECT COUNT(*) FROM t_order_detail WHERE lg_ORDER_ID IN (${commandes()})`) === '1' && l.lots.reduce((s, x) => s + x.quantity, 0) === l.n, JSON.stringify(l));

    /* f. parametre a 0 : comme avant */
    q(`UPDATE t_parameters SET str_VALUE = '0' WHERE str_KEY = '${CLE}'`);
    await scanner(boite(EAN, '290331', 'BX9'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok('Paramètre à 0 : le scan de la boîte n\'ajoute rien (comme avant)', ligne().n === 10 && lotsTexte(ligne().lots).indexOf('BX9') < 0, JSON.stringify(ligne()));
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try {
      nettoyer();
      if (ean0 !== null) { q(`UPDATE t_famille SET int_EAN13 = ${ean0 === '~' ? 'NULL' : "'" + ean0 + "'"} WHERE lg_FAMILLE_ID = '${P[0]}'`); }
      if (valeur0 !== '~') { q(`UPDATE t_parameters SET str_VALUE = '${valeur0}' WHERE str_KEY = '${CLE}'`); }
    } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : commande retirée, EAN du produit et paramètre remis', q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0'
      && q(`SELECT IFNULL(int_EAN13, '~') FROM t_famille WHERE lg_FAMILLE_ID = '${P[0]}'`) === (ean0 === null ? q(`SELECT IFNULL(int_EAN13, '~') FROM t_famille WHERE lg_FAMILLE_ID = '${P[0]}'`) : ean0)
      && q(`SELECT IFNULL(MAX(str_VALUE), '~') FROM t_parameters WHERE str_KEY = '${CLE}'`) === valeur0);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + (k === res.length ? ' OK' : ' ECHEC'));
    process.exit(k === res.length ? 0 : 1);
  }
})();

function BASE_URL() { return process.env.BASE || 'http://localhost:8080/prestige'; }
