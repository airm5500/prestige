/* ETIQUETTES GS1 ET LECTURE A LA VENTE (retours du 10/10, point 5 ; Q5 GS1, Q6 lecture derriere un parametre 0/1).
 *  - Gestion des etiquettes › imprimer une ligne : choix du code. DataMatrix et QR : le PDF porte un code 2D que
 *    zxing-cpp decode en (01) GTIN, (17) peremption, (10) lot, (240) CIP (DataMatrix : symbole GS1, FNC1, « ]d2 ») ;
 *    defaut (KEY_ETIQUETTE_CODE = CODE128) : le code-barres du CIP, comme avant ;
 *  - vente, KEY_VENTE_LECTURE_GS1 = 0 : le scan d'une etiquette GS1 ne passe pas par la lecture GS1, rien n'est ajoute
 *    (comportement d'avant) ; = 1 : le produit est ajoute (qte 1) ; lot perime refuse ; le lot de la boite est compare
 *    au lot que Prestige sort (le plus proche) : « Lot conforme » en vert, « Lot différent » en rouge (retours du 10/10).
 * Jeu d'essai (etiquette, lot, vente en cours, caisse si besoin) retire a la fin ; parametre remis a sa valeur.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN'], { input: s, encoding: 'utf8' }).trim();
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');
const ET = 'E2E-GS1-ET', LOT = 'E2E-GS1-LOT', NUMLOT = 'E2ELOT7', CAISSE = 'e2e-gs1-caisse';
const cle = (d) => { let s = 0; for (let i = d.length - 1, w = 3; i >= 0; i--, w = 4 - w) { s += Number(d[i]) * w; } return (10 - s % 10) % 10; };
const F = q("SELECT CONCAT_WS('|', f.lg_FAMILLE_ID, f.int_CIP, f.int_EAN13) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.int_EAN13 REGEXP '^[0-9]{13}$' AND f.int_CIP REGEXP '^[0-9]{6,8}$' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"
  + " AND COALESCE(f.lg_FAMILLE_PARENT_ID, '') = '' AND f.int_PRICE > 0 AND f.bool_ACCOUNT = 1 ORDER BY f.str_NAME LIMIT 200").split('\n').map((l) => l.split('|'))
  .filter((x) => cle(x[2].slice(0, 12)) === Number(x[2][12]))[0] || [];
const [FID, CIP, EAN] = F;
const PARAM = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
let caisseCreee = false, stockOrigine = null;

const ventes = () => q("SELECT IFNULL(GROUP_CONCAT(CONCAT('''', lg_PREENREGISTREMENT_ID, '''')), '''-''') FROM t_preenregistrement WHERE dt_CREATED >= '" + DEBUT + "' AND lg_USER_ID = '" + ADMIN + "'");
function nettoyer() {
  const v = ventes();
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${v}); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${v});`
    + `DELETE FROM t_etiquette WHERE lg_ETIQUETTE_ID = '${ET}'; DELETE FROM t_lot WHERE lg_LOT_ID LIKE '${LOT}%';`
    + `UPDATE t_parameters SET str_VALUE = '${PARAM}' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1';`
    + (caisseCreee ? `DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID = '${CAISSE}';` : '')
    + (stockOrigine ? `UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${stockOrigine[0]}, int_NUMBER = ${stockOrigine[1]} WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1';` : ''));
}
const decoder = (pdf) => {
  fs.writeFileSync('/tmp/e2e-gs1.pdf', Buffer.from(pdf));
  execFileSync('pdftoppm', ['-r', '600', '-png', '-f', '1', '-l', '1', '/tmp/e2e-gs1.pdf', '/tmp/e2e-gs1']);
  const png = fs.readdirSync('/tmp').filter((f) => /^e2e-gs1-\d+\.png$/.test(f)).map((f) => '/tmp/' + f)[0];
  const sortie = execFileSync('python3', ['-I', '-c', 'import sys, json, zxingcpp\nfrom PIL import Image\nr = zxingcpp.read_barcodes(Image.open(sys.argv[1]))\n'
    + 'print(json.dumps([{"format": str(x.format), "type": str(x.content_type), "texte": x.text, "id": x.symbology_identifier,'
    + ' "xMin": min(x.position.top_left.x, x.position.bottom_left.x) * 72 / 600, "xMax": max(x.position.top_right.x, x.position.bottom_right.x) * 72 / 600} for x in r]))', png], { encoding: 'utf8' });
  fs.readdirSync('/tmp').filter((f) => /^e2e-gs1-\d+\.png$/.test(f)).forEach((f) => fs.unlinkSync('/tmp/' + f));
  const codes = JSON.parse(sortie);
  if (process.env.E2E_APERCU) {
    /* apercu de la premiere etiquette (dossier donne par E2E_APERCU), pour validation visuelle */
    execFileSync('pdftoppm', ['-r', '400', '-png', '-f', '1', '-l', '1', '-x', '0', '-y', '0', '-W', '1100', '-H', '650', '/tmp/e2e-gs1.pdf', process.env.E2E_APERCU + '/etiquette-' + (decoder.n = (decoder.n || 0) + 1)]);
  }
  /* mots de la page avec leur position (points), pour verifier la disposition */
  const bbox = execFileSync('pdftotext', ['-bbox', '-f', '1', '-l', '1', '/tmp/e2e-gs1.pdf', '-'], { encoding: 'utf8' });
  codes.mots = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
    .map((m) => ({ xMin: +m[1], yMin: +m[2], xMax: +m[3], yMax: +m[4], t: m[5].replace(/&amp;/g, '&') }));
  return codes;
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  let p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un produit avec CIP et EAN-13 valable (' + CIP + ' / ' + EAN + ')', FID && CIP && EAN);
    nettoyer();
    stockOrigine = q(`SELECT CONCAT(int_NUMBER_AVAILABLE, '|', int_NUMBER) FROM t_famille_stock WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1'`).split('|');
    q(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID = '${FID}' AND lg_EMPLACEMENT_ID = '1';`
      + `INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock)`
      + ` VALUES ('${LOT}', '${ADMIN}', '${FID}', '${NUMLOT}', 5, NOW(), NOW(), '2027-03-31', 'enable', 5);`
      + `INSERT INTO t_etiquette (lg_ETIQUETTE_ID, str_CODE, str_NAME, str_STATUT, int_NUMBER, dt_CREATED, dt_UPDATED, lg_TYPEETIQUETTE_ID, lg_FAMILLE_ID, lg_EMPLACEMENT_ID)`
      + ` VALUES ('${ET}', 'E2E-GS1', 'CIP_PRIX', 'enable', '1', NOW(), NOW(), '2', '${FID}', '1');`);
    if (q(`SELECT COUNT(*) FROM t_resume_caisse WHERE lg_USER_ID = '${ADMIN}' AND str_STATUT = 'is_Using'`) === '0') {
      q(`INSERT INTO t_resume_caisse (ld_CAISSE_ID, lg_USER_ID, int_SOLDE_MATIN, int_SOLDE_SOIR, dt_DAY, dt_CREATED, lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)`
        + ` VALUES ('${CAISSE}', '${ADMIN}', 0, 0, CURDATE(), NOW(), '${ADMIN}', NOW(), '${ADMIN}', 'is_Using')`);
      caisseCreee = true;
    }
    const connexion = async () => {
      if (/\/general\//.test(p.url())) {
        /* deja connecte : on recharge l'application (l'ecran de vente relit ses parametres) */
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
        await p.evaluate(() => { window.__ouverts = []; window.open = function (u) { window.__ouverts.push(u); return null; }; });
        return;
      }
      await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
      await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
      await p.waitForURL('**/general/**', { timeout: 60000 });
      await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
      await p.evaluate(() => { window.__ouverts = []; window.open = function (u) { window.__ouverts.push(u); return null; }; });
    };
    await connexion();

    /* ------------------------------------------------ etiquettes */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etiquette', 'Gestion des étiquettes', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('etiquette')[0] && Ext.getCmp('rechecher') && Ext.getCmp('rechecher').rendered, null, { timeout: 30000 });
    await p.click('#rechecher-inputEl'); await p.keyboard.type('E2E-GS1'); await p.keyboard.press('Enter');
    await p.waitForFunction((et) => Ext.ComponentQuery.query('etiquette')[0].getStore().findExact('lg_ETIQUETTE_ID', et) >= 0, ET, { timeout: 30000 });
    const imprimer = async (code) => {
      /* la liste se recharge apres une impression : attendre la fin avant de viser la ligne */
      await p.waitForTimeout(1200);
      await p.waitForFunction((et) => { const g = Ext.ComponentQuery.query('etiquette')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_ETIQUETTE_ID', et) >= 0; }, ET, { timeout: 20000 });
      await p.evaluate((et) => { const g = Ext.ComponentQuery.query('etiquette')[0]; g.getView().getNode(g.getStore().findExact('lg_ETIQUETTE_ID', et)).setAttribute('data-e2e', 'et'); }, ET);
      const icone = p.locator('[data-e2e=et] img[data-qtip="Editer une etiquette"]'); await icone.scrollIntoViewIfNeeded().catch(() => {}); await icone.click({ force: true });
      await p.waitForFunction(() => !!Ext.getCmp('code_ETIQUETTE_LIGNE'), null, { timeout: 15000 });
      await p.evaluate((c) => { Ext.getCmp('code_ETIQUETTE_LIGNE').setValue(c); }, code);
      await p.evaluate(() => { const w = Ext.getCmp('code_ETIQUETTE_LIGNE').up('window'); w.down('button[text=Enregistrer]').getEl().dom.setAttribute('data-e2e', 'imp'); });
      const avant = await p.evaluate(() => window.__ouverts.length);
      await p.click('[data-e2e=imp]');
      await p.waitForFunction((n) => window.__ouverts.length > n, avant, { timeout: 15000 });
      const url = await p.evaluate(() => window.__ouverts[window.__ouverts.length - 1]);
      await p.evaluate(() => { Ext.ComponentQuery.query('window').forEach((w) => { if (w.isVisible() && w.down('#code_ETIQUETTE_LIGNE')) { w.close(); } }); });
      const pdf = await p.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), url);
      const codes = decoder(pdf);
      return { url, codes, mots: codes.mots };
    };
    const gtin = '0' + EAN, attendu = `(01)${gtin}(17)270331(10)${NUMLOT}(240)${CIP}`;
    const dm = await imprimer('DATAMATRIX');
    ok('DataMatrix : symbole GS1 (« ]d2 ») avec EAN, péremption et lot du lot en stock, CIP', dm.codes.some((c) => /DataMatrix|Data Matrix/.test(c.format) && /GS1/.test(c.type) && c.id === ']d2' && c.texte === attendu)
      && /code=DATAMATRIX/.test(dm.url), JSON.stringify(dm));
    const qr = await imprimer('QR');
    ok('QR code : contenu GS1 (EAN, péremption, lot, CIP)', qr.codes.some((c) => /QR/.test(c.format) && c.texte.replace('\u001d', '|').replace('<GS>', '|') === `01${gtin}17270331` + `10${NUMLOT}|240${CIP}`), JSON.stringify(qr.codes));
    /* disposition (precision du 10/10) : CIP, prix, grossiste en colonne a gauche ; le code carre a droite, lisible */
    const PRIX = q(`SELECT int_PRICE FROM t_famille WHERE lg_FAMILLE_ID = '${FID}'`), GROS = q(`SELECT IFNULL(g.str_LIBELLE, '') FROM t_famille f LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID WHERE f.lg_FAMILLE_ID = '${FID}'`);
    const disposition = (r, format) => {
      const code = r.codes.find((c) => format.test(c.format));
      const gauche = r.mots.filter((m) => code && m.xMax <= code.xMin + 0.5);
      const texte = gauche.map((m) => m.t).join(' ');
      const prixLu = texte.replace(/\s/g, '').indexOf(Number(PRIX).toLocaleString('fr-FR').replace(/\s/g, '').replace(/\u202f/g, '')) >= 0 || texte.replace(/\s/g, '').indexOf(PRIX) >= 0;
      const lignes = [...new Set(gauche.map((m) => Math.round(m.yMin)))];
      return { ok: !!code && texte.indexOf('CIP ' + CIP) >= 0 && prixLu && (GROS === '' || texte.indexOf(GROS.split(' ')[0]) >= 0)
        && r.mots.every((m) => m.xMax <= code.xMin + 0.5) && lignes.length === (GROS === '' ? 2 : 3) && code.xMax - code.xMin >= 40,
        texte, lignes: lignes.length, code: code && [Math.round(code.xMin), Math.round(code.xMax)], grossiste: GROS };
    };
    const dispoDm = disposition(dm, /Data ?Matrix/), dispoQr = disposition(qr, /QR/);
    ok('DataMatrix : CIP, prix, grossiste en colonne à gauche ; le code à droite, assez grand (≥ 14 mm), lu par le lecteur', dispoDm.ok, JSON.stringify(dispoDm));
    ok('QR code : même disposition, code lu par le lecteur', dispoQr.ok, JSON.stringify(dispoQr));
    const defaut = await imprimer('');
    ok('Défaut (KEY_ETIQUETTE_CODE = CODE128) : code-barres du CIP, aucun code 2D, comme avant', defaut.codes.length >= 1 && defaut.codes.every((c) => /Code ?128/.test(c.format) && c.texte === CIP),
      JSON.stringify(defaut.codes));

    /* ------------------------------------------------ vente */
    const scan = `01${gtin}17270331` + `10${NUMLOT}|240${CIP}`;
    const lignes = () => Number(q(`SELECT COUNT(*) FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID`
      + ` WHERE p.dt_CREATED >= '${DEBUT}' AND p.lg_USER_ID = '${ADMIN}' AND d.lg_FAMILLE_ID = '${FID}'`));
    const appelsGs1 = [];
    p.on('request', (r) => { if (/\/vente\/gs1/.test(r.url())) { appelsGs1.push(r.url()); } });
    const ouvrirVente = async () => {
      await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', {}));
      await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; return c && c.isVisible(); }, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
    };
    const scanner = async (texte) => {
      await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager #produit')[0]; c.clearValue(); c.inputEl.dom.setAttribute('data-e2e', 'produit'); c.focus(); });
      await p.click('[data-e2e=produit]');
      await p.keyboard.type(texte, { delay: 5 });
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
    };
    await ouvrirVente();
    await scanner(scan);
    const msg0 = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    ok('Paramètre à 0 : pas de lecture GS1, rien n\'est ajouté (comportement d\'avant)', appelsGs1.length === 0 && lignes() === 0, appelsGs1.length + ' / ' + msg0);

    q("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'");
    /* retours du 10/10 : un lot plus proche (demain) est celui que Prestige sort ; la boite E2ELOT7 n'est donc pas la bonne */
    const [aammjjProche, jjProche] = q("SELECT DATE_FORMAT(CURDATE() + INTERVAL 1 DAY, '%y%m%d|%d/%m/%Y')").split('|');
    q(`INSERT INTO t_lot (lg_LOT_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, current_stock)`
      + ` VALUES ('${LOT}-PROCHE', '${ADMIN}', '${FID}', 'E2ELOT8', 3, NOW(), NOW(), CURDATE() + INTERVAL 1 DAY, 'enable', 3);`);
    await connexion();
    await ouvrirVente();
    await scanner(scan);
    await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const per = await p.evaluate(() => { const c = Ext.ComponentQuery.query('doventemanager')[0]; const ctr = testextjs.app.getController('VenteCtr'); const f = ctr.getPeremptionProcheField();
      return f ? String(f.getValue()).replace(/<[^>]+>/g, '') : ''; });
    ok('Paramètre à 1 : le scan GS1 ajoute le produit (quantité 1)', appelsGs1.length === 1 && lignes() === 1
      && q(`SELECT d.int_QUANTITY FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID WHERE p.dt_CREATED >= '${DEBUT}' AND p.lg_USER_ID = '${ADMIN}' AND d.lg_FAMILLE_ID = '${FID}'`) === '1',
      appelsGs1.length + ' appel(s), ' + lignes() + ' ligne(s)');
    const prevu = await p.evaluate(async (id) => (await fetch('../api/v1/vente/peremption-proche/' + id)).json(), FID);
    ok('Précondition : Prestige sort le lot le plus proche (E2ELOT8, demain)', prevu.lot === 'E2ELOT8' && prevu.date === jjProche, JSON.stringify(prevu));
    const couleur = () => p.evaluate(() => { const f = testextjs.app.getController('VenteCtr').getPeremptionProcheField(); const e = f && f.getEl().dom.querySelector('.gs1-controle');
      return e ? getComputedStyle(e).color : ''; });
    ok('Boîte d\'un autre lot : « Lot différent », lot scanné et lot que Prestige sort, en rouge (la vente continue)',
      per === '⚠ Lot différent : boîte scannée lot ' + NUMLOT + ' - pér. 31/03/2027 ; Prestige sort lot E2ELOT8 - pér. ' + jjProche
      && await couleur() === 'rgb(198, 40, 40)' && await p.evaluate(() => testextjs.app.getController('VenteCtr').dernierControleGs1) === 'DIFFERENT', per);
    await scanner(`01${gtin}17230101` + `10PERIME|240${CIP}`);
    const msgPerime = await p.evaluate(() => (Ext.Msg.isVisible() ? Ext.Msg.msg.getEl().dom.textContent : ''));
    await p.evaluate(() => { if (Ext.Msg.isVisible()) { Ext.Msg.hide(); } });
    ok('Lot périmé (01/01/2023) : refusé, non ajouté', /périmé/.test(msgPerime) && lignes() === 1, msgPerime);
    /* la bonne boite (lot que Prestige sort) : conforme, en vert */
    await scanner(`01${gtin}17${aammjjProche}` + `10E2ELOT8|240${CIP}`);
    await p.waitForFunction(() => !Ext.Ajax.isLoading(), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1000);
    const perOk = await p.evaluate(() => String(testextjs.app.getController('VenteCtr').getPeremptionProcheField().getValue()).replace(/<[^>]+>/g, ''));
    ok('Bonne boîte : « Lot conforme » en vert', perOk === '✔ Lot conforme : lot E2ELOT8 - pér. ' + jjProche && await couleur() === 'rgb(27, 127, 59)', perOk);
    /* un CIP saisi a la main garde le chemin habituel */
    ok('Saisie ordinaire non prise pour du GS1', await p.evaluate((c) => !testextjs.app.getController('VenteCtr').ressembleGs1(c), CIP));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    try { nettoyer(); } catch (e) { console.log('nettoyage : ' + e.message); }
    ok('Remise en état : étiquette, lot, vente en cours retirés ; paramètre remis à ' + PARAM, q(`SELECT (SELECT COUNT(*) FROM t_etiquette WHERE lg_ETIQUETTE_ID = '${ET}') + (SELECT COUNT(*) FROM t_lot WHERE lg_LOT_ID LIKE '${LOT}%')`
      + ` + (SELECT COUNT(*) FROM t_preenregistrement WHERE dt_CREATED >= '${DEBUT}' AND lg_USER_ID = '${ADMIN}')`) === '0'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_VENTE_LECTURE_GS1'") === PARAM);
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
