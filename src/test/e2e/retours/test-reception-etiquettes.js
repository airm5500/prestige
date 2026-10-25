/* RECEPTION D'UN GROSSISTE EQUIPE D'ETIQUETTAGE PRO (retours du 11/10) - commande en cours, chemin de l'ecran :
 *  1. ecran : « Commande en cours » (saisie des articles d'une commande) ;
 *  2. prix : celui de l'etiquette devient le prix de vente de la ligne (chemin habituel : mouvement de prix) ;
 *  3. CIP inconnu : creation proposee dans l'ecran, pre-remplie avec l'etiquette (aucune fenetre) ;
 *  4. quantite : 1 boite par scan, ou scan puis quantite globale.
 * Lot et peremption de l'etiquette ajoutes aux lots de la ligne (repris au bon de livraison comme un import).
 * Le scan est tape au clavier comme le fait une douchette (QR+ en clair ; DataMatrix+ avec GS transmis « <GS> »).
 * Commande, produit cree, mouvements de prix et notifications d'essai retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const GROSSISTE = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
const P = q("SELECT CONCAT_WS('|', lg_FAMILLE_ID, int_CIP, int_PRICE, IFNULL(int_EAN13, '')) FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP REGEXP '^[0-9]{7}$'"
  + " AND int_PRICE BETWEEN 500 AND 5000 AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = t_famille.int_CIP) = 1 ORDER BY str_NAME LIMIT 2").split('\n').map((l) => l.split('|'));
const EAN_P2 = '3400' + '9' + String(Date.now()).slice(-7) + '1';
const CIP_NEUF = '99' + String(Date.now()).slice(-5);
let eanOrigine = null;

function nettoyer() {
  const cdes = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_ORDER_ID, '''')), '''-''') FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`);
  q(`DELETE FROM t_order_detail WHERE lg_ORDER_ID IN (${cdes}); DELETE FROM t_order WHERE lg_ORDER_ID IN (${cdes});`
    + `DELETE FROM t_mouvementprice WHERE dt_UPDATED >= '${DEBUT}' AND lg_FAMILLE_ID IN ('${P[0][0]}', '${P[1][0]}');`
    + `DELETE FROM notification_client WHERE notification_id IN (SELECT id FROM notification WHERE created_at >= '${DEBUT}' AND entity_ref IN ('${P[0][0]}', '${P[1][0]}'));`
    + `DELETE FROM notification WHERE created_at >= '${DEBUT}' AND entity_ref IN ('${P[0][0]}', '${P[1][0]}');`
    + `DELETE FROM t_event_log WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}' AND (str_TYPE_LOG IN ('${P[0][1]}', '${P[1][1]}', '${CIP_NEUF}') OR str_DESCRIPTION LIKE '%E2E SCAN%');`);
  const ids = q(`SELECT IFNULL(GROUP_CONCAT(lg_FAMILLE_ID), '') FROM t_famille WHERE int_CIP = '${CIP_NEUF}'`).split(',').filter((x) => x);
  if (ids.length) {
    const liste = ids.map((x) => "'" + x + "'").join(',');
    q(`DELETE FROM t_mouvementprice WHERE lg_FAMILLE_ID IN (${liste}); DELETE FROM notification WHERE entity_ref IN (${liste});`);
    const tables = q("SELECT GROUP_CONCAT(TABLE_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + BASE + "' AND COLUMN_NAME = 'lg_FAMILLE_ID' AND TABLE_NAME <> 't_famille'"
      + " AND TABLE_NAME IN (SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_TYPE = 'BASE TABLE')").split(',');
    let sql = 'SET FOREIGN_KEY_CHECKS = 0;';
    tables.forEach((t) => { sql += ' DELETE FROM `' + t + '` WHERE lg_FAMILLE_ID IN (' + liste + ');'; });
    q(sql + ' DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (' + liste + '); SET FOREIGN_KEY_CHECKS = 1;');
  }
  if (eanOrigine !== null) {
    q(`UPDATE t_famille SET int_EAN13 = ${eanOrigine === '' ? 'NULL' : "'" + eanOrigine + "'"} WHERE lg_FAMILLE_ID = '${P[1][0]}'`);
  }
}

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  p.on('framenavigated', (f) => { if (f === p.mainFrame() && process.env.TRACE) { console.log('NAVIGATION ' + f.url()); } });
  const fenetres = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).map((w) => w.title || w.xtype));
  const etat = () => p.evaluate(() => Ext.getCmp('scanEtat').getEl().dom.textContent);
  const commande = () => p.evaluate(() => Ext.ComponentQuery.query('ordermanagerlist')[0].getNameintern());
  const ligne = (fid) => q(`SELECT CONCAT_WS('|', d.int_NUMBER, d.int_PRICE_DETAIL, IFNULL(d.lots, '[]')) FROM t_order_detail d WHERE d.lg_FAMILLE_ID = '${fid}' AND d.lg_ORDER_ID IN (SELECT lg_ORDER_ID FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}')`);
  /* une douchette tape le contenu puis Entree, dans le champ « Article » */
  const scanner = async (texte) => {
    const avant = await etat();
    await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(texte, { delay: 2 }); await p.keyboard.press('Enter');
    await p.waitForFunction((a) => { const t = Ext.getCmp('scanEtat').getEl().dom.textContent; return t && t !== a || Ext.getCmp('scanCreation').isVisible(); }, avant, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(400);
  };
  const qrPlus = (o) => 'EP1|' + Object.entries(o).map(([k, v]) => k + ':' + v).join('|');
  try {
    nettoyer();
    ok('Préconditions : grossiste, deux produits au CIP unique', GROSSISTE && P.length === 2, JSON.stringify(P));
    eanOrigine = q(`SELECT IFNULL(int_EAN13, '') FROM t_famille WHERE lg_FAMILLE_ID = '${P[1][0]}'`);
    q(`UPDATE t_famille SET int_EAN13 = '${EAN_P2}' WHERE lg_FAMILLE_ID = '${P[1][0]}'`);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    /* commandes en cours › NOUVELLE COMMANDE */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('ordermanagerlist', 'Ajouter les articles a une commande', '0', 'is_Process'));
    await p.waitForFunction(() => Ext.getCmp('str_NAME') && Ext.getCmp('str_NAME').rendered && Ext.getCmp('scanMode'), null, { timeout: 30000 });
    await p.waitForTimeout(1000);

    /* sans grossiste */
    await scanner(qrPlus({ CIP: P[0][1], NOM: 'E2E SCAN', PRIX: 1500, LOT: 'E2EA1', PER: '31/12/2027' }));
    ok('Sans grossiste choisi : scan refusé avec un message, rien de créé', /grossiste/.test(await etat()) && await commande() === '0', await etat());
    await p.evaluate((g) => { const c = Ext.getCmp('lgGROSSISTEID'); c.getStore().load({ callback: () => c.setValue(g) }); }, GROSSISTE);
    await p.waitForFunction((g) => Ext.getCmp('lgGROSSISTEID').getValue() === g, GROSSISTE, { timeout: 15000 });

    /* 1 boite par scan, QR+ */
    const prixP1 = Number(P[0][2]) + 100;
    await scanner(qrPlus({ CIP: P[0][1], NOM: 'E2E SCAN', PRIX: prixP1, LOT: 'E2EA1', PER: '31/12/2027' }));
    let l1 = ligne(P[0][0]).split('|');
    ok('QR+ (1 boîte par scan) : commande créée, ligne à 1, prix de vente = prix de l\'étiquette, lot et péremption sur la ligne',
      l1[0] === '1' && Number(l1[1]) === prixP1 && /"numeroLot":"E2EA1"/.test(l1[2]) && /"datePeremption":"31\/12\/2027"/.test(l1[2]) && /"quantity":1/.test(l1[2]) && await commande() !== '0', l1.join(' / ') + ' ' + await etat());
    ok('… message clair dans l\'écran, aucune fenêtre ouverte, champ « Article » vidé', /✓ 1 × .* ajouté.*lot E2EA1.*prix de vente/.test(await etat()) && (await fenetres()).length === 0
      && await p.evaluate(() => Ext.getCmp('str_NAME').getRawValue() === ''), await etat() + ' ' + JSON.stringify(await fenetres()));
    await p.waitForFunction(() => { const st = Ext.getCmp('gridpanelID').getStore(); return !st.isLoading() && st.getCount() > 0; }, null, { timeout: 15000 }).catch(() => {});
    const grille = await p.evaluate((fid) => Ext.getCmp('gridpanelID').getStore().getRange().filter((r) => r.get('lg_FAMILLE_ID') === fid).length, P[0][0]);
    ok('… la ligne apparaît dans la grille de la commande', grille === 1, grille);
    await scanner(qrPlus({ CIP: P[0][1], NOM: 'E2E SCAN', PRIX: prixP1, LOT: 'E2EA1', PER: '31/12/2027' }));
    l1 = ligne(P[0][0]).split('|');
    ok('2e scan de la même boîte : quantité 2, même lot à 2 (pas de doublon)', l1[0] === '2' && /"quantity":2/.test(l1[2]) && (l1[2].match(/numeroLot/g) || []).length === 1, l1.join(' / '));
    ok('Prix de l\'étiquette inchangé au 2e scan : un seul mouvement de prix', q(`SELECT COUNT(*) FROM t_mouvementprice WHERE dt_UPDATED >= '${DEBUT}' AND lg_FAMILLE_ID = '${P[0][0]}' AND str_ACTION = 'COMMANDE'`) === '1');

    /* DataMatrix+ (GS en « <GS> »), produit retrouve par son EAN (CIP absent du code) */
    const gtin = '0' + EAN_P2;
    await scanner(`01${gtin}17271130` + `10E2EB7<GS>91EPLUS1<GS>92E2E_SCAN_DM<GS>93${P[1][2]}`);
    const l2 = ligne(P[1][0]).split('|');
    ok('DataMatrix+ : produit retrouvé par l\'EAN, lot et péremption (30/11/2027) repris', l2[0] === '1' && /"numeroLot":"E2EB7"/.test(l2[2]) && /"datePeremption":"30\/11\/2027"/.test(l2[2]), l2.join(' / ') + ' ' + await etat());

    /* scan puis quantite */
    await p.evaluate(() => { Ext.getCmp('scanMode').setValue({ scanMode: 'QUANTITE' }); });
    await scanner(qrPlus({ CIP: P[0][1], NOM: 'E2E SCAN', PRIX: prixP1, LOT: 'E2EC3', PER: '30/06/2028' }));
    const attente = await p.evaluate(() => ({ e: Ext.getCmp('scanEtat').getEl().dom.textContent, focus: document.activeElement && document.activeElement.id, nom: Ext.getCmp('str_NAME').getRawValue() }));
    ok('Scan puis quantité : produit et lot annoncés, curseur sur la quantité, rien d\'ajouté encore', /saisissez la quantité/.test(attente.e) && /int_QUANTITE/.test(attente.focus) && ligne(P[0][0]).split('|')[0] === '2', JSON.stringify(attente));
    await p.keyboard.press('Control+A'); await p.keyboard.type('12'); await p.keyboard.press('Enter');
    await p.waitForFunction(() => /✓ 12 ×/.test(Ext.getCmp('scanEtat').getEl().dom.textContent), null, { timeout: 15000 }).catch(() => {});
    l1 = ligne(P[0][0]).split('|');
    const lotsP1 = JSON.parse(l1[2] || '[]'), lot = (n) => lotsP1.find((x) => x.numeroLot === n) || {};
    ok('… Entrée sur la quantité 12 : ligne à 14, lot E2EC3 (30/06/2028) à 12, lot E2EA1 toujours à 2', l1[0] === '14' && lot('E2EC3').quantity === 12 && lot('E2EC3').datePeremption === '30/06/2028'
      && lot('E2EA1').quantity === 2 && lotsP1.length === 2, l1.join(' / ') + ' ' + await etat());
    await p.evaluate(() => { Ext.getCmp('scanMode').setValue({ scanMode: 'UNITE' }); });

    /* recherche habituelle intacte */
    await p.click('#str_NAME-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type(P[0][1]);
    await p.waitForFunction(() => { const c = Ext.getCmp('str_NAME'); return c.isExpanded && c.getStore().getCount() > 0; }, null, { timeout: 15000 }).catch(() => {});
    const recherche = await p.evaluate(() => ({ ouverte: Ext.getCmp('str_NAME').isExpanded, n: Ext.getCmp('str_NAME').getStore().getCount() }));
    ok('Saisie d\'un CIP ordinaire : la recherche habituelle fonctionne toujours', recherche.ouverte && recherche.n >= 1, JSON.stringify(recherche));
    await p.keyboard.press('Escape');

    /* CIP inconnu : creation dans l'ecran */
    await scanner(qrPlus({ CIP: CIP_NEUF, NOM: 'E2E SCAN PRODUIT NOUVEAU', PRIX: 2500, LOT: 'E2EN1', PER: '31/01/2028', EAN: '3400999' + CIP_NEUF.slice(-5) + '8' }));
    const prop = await p.evaluate(() => ({ visible: Ext.getCmp('scanCreation').isVisible(), cip: Ext.getCmp('scanCip').getValue(), nom: Ext.getCmp('scanNom').getValue(), pv: Ext.getCmp('scanPv').getValue(),
      titre: Ext.getCmp('scanCreationTitre').getEl().dom.textContent }));
    ok('CIP inconnu : proposition de création dans l\'écran, pré-remplie (CIP, désignation, prix de vente, lot), aucune fenêtre', prop.visible && prop.cip === CIP_NEUF && prop.nom === 'E2E SCAN PRODUIT NOUVEAU'
      && prop.pv === 2500 && /lot E2EN1/.test(prop.titre) && (await fenetres()).length === 0 && q(`SELECT COUNT(*) FROM t_famille WHERE int_CIP = '${CIP_NEUF}'`) === '0', JSON.stringify(prop));
    await p.waitForFunction(() => Ext.getCmp('scanFamille').getValue() && Ext.getCmp('scanEmplacement').getValue() && Ext.getCmp('scanTva').getValue(), null, { timeout: 15000 });
    if (process.env.CAPTURE) { await p.screenshot({ path: process.env.CAPTURE }); }
    await p.click('#scanCreer'); await p.waitForTimeout(500);
    ok('… prix d\'achat obligatoire : message dans le cadre, rien de créé', /champs en rouge/.test(await p.evaluate(() => Ext.getCmp('scanCreationEtat').getEl().dom.textContent)) && q(`SELECT COUNT(*) FROM t_famille WHERE int_CIP = '${CIP_NEUF}'`) === '0');
    await p.click('#scanPaf-inputEl'); await p.keyboard.type('3000'); await p.click('#scanCreer'); await p.waitForTimeout(500);
    ok('… prix d\'achat supérieur au prix de vente refusé', /supérieur au prix de vente/.test(await p.evaluate(() => Ext.getCmp('scanCreationEtat').getEl().dom.textContent)));
    await p.click('#scanPaf-inputEl'); await p.keyboard.press('Control+A'); await p.keyboard.type('1800');
    await p.click('#scanCreer');
    await p.waitForFunction(() => /✓ 1 ×/.test(Ext.getCmp('scanEtat').getEl().dom.textContent), null, { timeout: 20000 }).catch(() => {});
    const neuf = q(`SELECT CONCAT_WS('|', lg_FAMILLE_ID, str_NAME, int_PRICE, int_PAF, IFNULL(int_EAN13, '')) FROM t_famille WHERE int_CIP = '${CIP_NEUF}'`).split('|');
    const l3 = neuf[0] ? ligne(neuf[0]).split('|') : [];
    ok('… fiche créée (désignation, prix de vente 2500, prix d\'achat 1800, EAN) puis ligne ajoutée avec le lot', neuf[1] === 'E2E SCAN PRODUIT NOUVEAU' && neuf[2] === '2500' && neuf[3] === '1800'
      && l3[0] === '1' && /"numeroLot":"E2EN1"/.test(l3[2] || ''), neuf.join(' / ') + ' :: ' + l3.join(' / ') + ' ' + await etat());
    ok('… cadre de création refermé, aucune fenêtre', !(await p.evaluate(() => Ext.getCmp('scanCreation').isVisible())) && (await fenetres()).length === 0);
    const montant = await p.evaluate(() => Ext.ComponentQuery.query('ordermanagerlist')[0].getNameintern());
    ok('Une seule commande pour tous les scans', q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '1' && montant !== '0');
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' / '));
  } catch (e) {
    ok('Exécution sans exception', false, e.stack);
  } finally {
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Nettoyage : commande, produit créé, mouvements de prix retirés ; EAN remis', q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}'`) === '0'
      && q(`SELECT COUNT(*) FROM t_famille WHERE int_CIP = '${CIP_NEUF}'`) === '0' && q(`SELECT IFNULL(int_EAN13, '') FROM t_famille WHERE lg_FAMILLE_ID = '${P[1][0]}'`) === eanOrigine);
    await b.close();
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
