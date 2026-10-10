/* LECTURE GS1 A LA VENTE : BASCULE DU PARAMETRE KEY_VENTE_LECTURE_GS1 (question de l'officine du 10/10).
 *  - 0 : une etiquette 2D (QR / DataMatrix) scannee n'est pas lue comme GS1 ; que se passe-t-il ? (rien d'ajoute a tort) ;
 *  - 1 : un ancien produit a l'etiquette code-barres classique (CIP, EAN-13) s'ajoute comme avant, sans controle de lot.
 * Meme jeu d'essai que le controle du lot (ci-dessous, repris tel quel). */
/* (Reprise) LECTURE GS1 A LA VENTE : CONTROLE DU LOT (retours du 10/10), parametre KEY_VENTE_CONTROLE_LOT_GS1.
 * Le lot de la boite scannee (etiquette QR / DataMatrix) est compare au lot que Prestige sort (le plus proche) :
 *  - A (defaut) : avertir seulement ; la vente continue et Prestige sort SON lot a la cloture ;
 *  - B : avertir et sortir le lot SCANNE a la cloture (un lot par boite) ; lot inconnu du stock : lot le plus proche ;
 *  - C : bloquer l'ajout tant que la bonne boite n'est pas scannee ;
 *  - valeur inconnue : comme A (aucun blocage) ; ajout au CIP sans scan : rien ne change (lot le plus proche) ;
 *  - le serveur n'accepte un lot scanne qu'en mode B (un appel direct en mode A ne note rien).
 * Chaque cas passe par l'ecran de vente (douchette simulee au clavier), puis la vente est cloturee et les lots sont
 * verifies en base. Tout est retire a la fin (ventes, mouvements, lots d'essai) ; stock et parametres remis.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined && d !== '' ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const LOT = 'E2E-GS1B-LOT', CAISSE = 'e2e-gs1b-caisse';
const cle = (d) => { let s = 0; for (let i = d.length - 1, w = 3; i >= 0; i--, w = 4 - w) { s += Number(d[i]) * w; } return (10 - s % 10) % 10; };
const F = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.int_EAN13) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_EAN13 REGEXP '^[0-9]{13}$' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.int_PRICE > 0 AND f.bool_ACCOUNT = 1 ORDER BY f.str_NAME LIMIT 200").split('\n').map((l) => l.split('|'))
  .filter((x) => cle(x[2].slice(0, 12)) === Number(x[2][12]))[0] || [];
const [FID, CIP, EAN] = F;
const P_LECTURE = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
const P_CONTROLE = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_CONTROLE_LOT_GS1'), '')");
let caisseCreee = false, stockOrigine = null;
const mode = (m) => q(`UPDATE t_parameters SET str_VALUE = '${m}' WHERE str_KEY = 'KEY_VENTE_CONTROLE_LOT_GS1'`);
const stockLot = (n) => q(`SELECT current_stock FROM t_lot WHERE lg_FAMILLE_ID = '${FID}' AND int_NUM_LOT = '${n}' AND lg_LOT_ID LIKE '${LOT}%'`);
const lotsReelsAvant = q(`SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_LOT_ID, ':', current_stock) ORDER BY lg_LOT_ID), '') FROM t_lot WHERE lg_FAMILLE_ID = '${FID}' AND lg_LOT_ID NOT LIKE '${LOT}%'`);

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q("CREATE TEMPORARY TABLE e2e_gb_l AS SELECT lg_PREENREGISTREMENT_DETAIL_ID id FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "CREATE TEMPORARY TABLE e2e_gb_r AS SELECT lg_REGLEMENT_ID id FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ") AND lg_REGLEMENT_ID IS NOT NULL;"
    + "DELETE FROM vente_reglement WHERE vente_id IN (" + v + ");"
    + "DELETE FROM hmvtproduit WHERE pkey IN (SELECT id FROM e2e_gb_l);"
    + "DELETE FROM mvttransaction WHERE pkey IN (" + v + ") OR vente_id IN (" + v + ");"
    + "DELETE FROM t_recettes WHERE str_REF_FACTURE IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "UPDATE t_preenregistrement SET lg_PREENGISTREMENT_ANNULE_ID = NULL, lg_PARENT_ID = NULL, lg_REGLEMENT_ID = NULL WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (" + v + ");"
    + "DELETE FROM t_reglement WHERE lg_REGLEMENT_ID IN (SELECT id FROM e2e_gb_r);"
    + "DROP TEMPORARY TABLE IF EXISTS e2e_gb_l; DROP TEMPORARY TABLE IF EXISTS e2e_gb_r;"
    + `DELETE FROM t_suggestion_order_details WHERE lg_FAMILLE_ID = '${FID}' AND dt_CREATED >= '${DEBUT}';`
    + `DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${LOT}%';`
    + `UPDATE t_parameters SET str_VALUE = '${P_LECTURE}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1';`
    + (P_CONTROLE ? `UPDATE t_parameters SET str_VALUE = '${P_CONTROLE}' WHERE str_KEY = 'KEY_VENTE_CONTROLE_LOT_GS1';` : '')
    + (stockOrigine ? `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${stockOrigine[0]}, int_NUMBER = ${stockOrigine[1]} WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1';` : '')
    + (caisseCreee ? `DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}';` : ''));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (m, u, c) => p.evaluate(([m, u, c]) => new Promise((ok2) => Ext.Ajax.request({ url: u, method: m, jsonData: c || undefined,
    success: (r) => { try { ok2(JSON.parse(r.responseText)); } catch (e) { ok2({ brut: r.responseText }); } }, failure: (r) => ok2({ success: false, status: r.status }) })), [m, u, c]);
  try {
    ok('Précondition : un produit avec CIP et EAN-13 valable (' + CIP + ')', FID && CIP && EAN);
    ok('Paramètre KEY_VENTE_CONTROLE_LOT_GS1 créé par la migration, « A » par défaut', P_CONTROLE === 'A', P_CONTROLE);
    nettoyer();
    stockOrigine = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
    const [aammjj8, jj8] = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 1 DAY, '%y%m%d|%d/%m/%Y')").split('|');
    q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 60, int_NUMBER = 60 WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1';`
      + `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock) VALUES`
      + ` ('${LOT}-7', '${ADMIN}', '${FID}', 'E2ELOT7', 5, NOW(), NOW(), '2027-03-31', 'enable', 5),`
      + ` ('${LOT}-8', '${ADMIN}', '${FID}', 'E2ELOT8', 20, NOW(), NOW(), CURDATE() + INTERVAL 1 DAY, 'enable', 20);`
      + "UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1';");
    if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
      q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)`
        + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
      caisseCreee = true;
    }
    const gtin = '0' + EAN;
    const etiquette = (lot, aammjj) => `01${gtin}17${aammjj}10${lot}|240${CIP}`;
    const B7 = etiquette('E2ELOT7', '270331'), B8 = etiquette('E2ELOT8', aammjj8), BX = etiquette('E2EINCONNU', '271231');

    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    const prevu = await p.evaluate(async (id) => (await fetch('../api/v1/vente/peremption-proche/' + id)).json(), FID);
    ok('Précondition : Prestige sort le lot le plus proche (E2ELOT8, demain)', prevu.lot === 'E2ELOT8' && prevu.date === jj8, JSON.stringify(prevu));

    /* une nouvelle vente a l'ecran (rechargement : etat de la vente remis a zero) */
    const nouvelleVente = async () => {
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; return c && c.isVisible(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
    };
    const scanner = async (texte) => {
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; c.clearValue(); c.inputEl.dom.setAttribute('data-e2e', 'produit'); c.focus(); });
      await p.click('[data-e2e=produit]');
      await p.keyboard.type(texte, { delay: 5 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(1500);
      await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(800);
      const etat = await p.evaluate(() => { const ctr = testextjs.app.getController('VenteCtr'), f = ctr.getPeremptionProcheField();
        return { message: f ? String(f.getValue()).replace(/<[^>]+>/g, '') : '', boite: Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : '', controle: ctr.dernierControleGs1 }; });
      await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
      return etat;
    };
    const venteCourante = () => p.evaluate(() => { const v = testextjs.app.getController('VenteCtr').getCurrent(); return v ? v.lgPREENREGISTREMENTID : null; });
    const ligne = (v) => q(`SELECT CONCAT(int_QUANTITY, '|', IFNULL(str_LOTS_SCANNES, '')) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v}' AND lg_FAMILLE_ID = '${FID}'`);
    const cloturer = async (venteId) => {
      const net = await api('POST', '../api/v1/vente/net/vno', { venteId, remiseId: '', checkUg: false });
      const data = net.data || {}, montant = data.montantNet;
      return api('POST', '../api/v1/vente/cloturer/vno', { venteId, typeVenteId: '1', natureVenteId: '1', devis: false, remiseId: '', userVendeurId: ADMIN,
        montantRecu: montant, montantRemis: 0, montantPaye: montant, totalRecap: montant, partTP: 0, typeRegleId: '1', clientId: '', nom: '', commentaire: '', banque: '', lieux: '',
        marge: data.marge || 0, data, reglements: [{ typeReglement: '1', montant, montantAttentu: montant }] });
    };
    const lots = () => stockLot('E2ELOT7') + '/' + stockLot('E2ELOT8');

    const lecture = (x) => q(`UPDATE t_parameters SET str_VALUE = '${x}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'`);
    const nbLignes = (v) => v ? q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${v}'`) : '0';
    mode('A');

    /* ------------------------------------------------ parametre 0 : etiquette 2D scannee */
    lecture('0');
    await nouvelleVente();
    let e = await scanner(CIP);
    let v = await venteCourante();
    ok('0 : CIP (vente neuve) → produit ajouté', v && ligne(v) === '1|', v && ligne(v));
    e = await scanner(EAN);
    ok('0 : puis EAN-13 → quantité 2', ligne(v) === '2|', ligne(v));

    await nouvelleVente();
    e = await scanner(B8);
    v = await venteCourante();
    ok('0 : étiquette 2D scannée → pas de lecture GS1 (aucun contrôle de lot, aucun message)', !e.controle && !e.message && !e.boite, JSON.stringify(e));
    ok('0 : étiquette 2D scannée → aucun produit ajouté à tort, aucune vente créée', !v, 'vente=' + v);
    const champ = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; return { brut: c.getRawValue(), liste: c.getStore().getCount() }; });
    ok('0 : le texte de l\'étiquette reste dans le champ produit, liste vide', champ.liste === 0 && champ.brut.indexOf('E2ELOT8') >= 0, JSON.stringify(champ));
    /* defaut corrige : la liste restee ouverte et vide avalait l'Entree du scan suivant */
    e = await scanner(CIP);
    v = await venteCourante();
    ok('0 : le scan suivant (CIP) s\'ajoute normalement (Entrée plus avalée par la liste vide)', v && ligne(v) === '1|', v && ligne(v));
    e = await scanner(EAN);
    ok('0 : puis EAN-13 → quantité 2', ligne(v) === '2|', ligne(v));
    await nouvelleVente();
    await scanner('ZZQQXX999');
    e = await scanner(CIP);
    v = await venteCourante();
    ok('0 : même chose après un texte inconnu quelconque (« ZZQQXX999 » puis CIP)', v && ligne(v) === '1|', v && ligne(v));

    /* ------------------------------------------------ parametre 1 : ancienne etiquette code-barres classique */
    lecture('1');
    await nouvelleVente();
    e = await scanner(CIP);
    v = await venteCourante();
    ok('1 : ancien code-barres (CIP) → produit ajouté comme avant', v && ligne(v) === '1|', v && ligne(v));
    ok('1 : CIP → aucun contrôle de lot (pas de « Lot conforme / différent »)', !e.controle && !/Lot (conforme|différent)/.test(e.message) && !e.boite, JSON.stringify(e));
    e = await scanner(EAN);
    ok('1 : ancien code-barres (EAN-13) → quantité 2', ligne(v) === '2|', ligne(v) + ' ' + JSON.stringify(e));
    ok('1 : EAN-13 → aucun contrôle de lot', !e.controle && !e.boite, JSON.stringify(e));
    e = await scanner(B8);
    ok('1 : puis l\'étiquette 2D du même produit → lue, « Lot conforme », quantité 3', e.controle === 'CONFORME' && ligne(v) === '3|', ligne(v) + ' ' + JSON.stringify(e));
    const c = await cloturer(v);
    ok('1 : vente mixte (CIP, EAN, 2D) clôturée, 3 boîtes du lot le plus proche (20→17)', c.success && stockLot('E2ELOT8') === '17', JSON.stringify(c).slice(0, 120) + ' lot8=' + stockLot('E2ELOT8'));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (ex) {
    ok('Déroulement du test', false, ex.stack || ex);
  } finally {
    await b.close();
    try { nettoyer(); } catch (ex) { console.log('nettoyage : ' + ex.message); }
    ok('Remise en état : ventes, lots d\'essai retirés ; stock et paramètres remis', q(`SELECT (SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}')`
      + ` + (SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE '${LOT}%')`) === '0'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === P_LECTURE
      && q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_CONTROLE_LOT_GS1'), '')") === P_CONTROLE);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
