/* FICHE ARTICLE : CODE GEO RESERVE, COLISAGE ET ECRAN « PRODUITS PAR CODE GEO » (plan d'octobre, lot L6a).
 *
 * Ce que le test etablit, sur les vrais ecrans (valeurs d'origine du produit remises a la fin) :
 *  - modification de la fiche : champs « Code Geo réserve » et « Colisage » ; enregistrement par le bouton -> valeurs
 *    en base ; la fiche les reaffiche a la reouverture ; le detail de l'article les affiche ;
 *  - effacer : un colisage vide et un code vide remettent NULL ;
 *  - le reste de la fiche est inchange par l'enregistrement (prix, CIP, nom, code geo rayon, emplacement) ;
 *  - ecran « Produits par code géo » (menu GESTION DU STOCK) : filtre code geo reserve, « sans code géo », Excel et PDF
 *    (dans l'onglet), habillage au theme ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CAPT = process.env.CAPTURES || '/tmp';
const COLS = "CONCAT_WS('|', IFNULL(str_CODE_GEO_ARTICLE_RESERVE, 'NULL'), IFNULL(int_COLISAGE, 'NULL'))";
const RESTE = "CONCAT_WS('|', str_NAME, int_CIP, int_PRICE, int_PAF, IFNULL(str_CODE_GEO_ARTICLE, ''), lg_ZONE_GEO_ID, IFNULL(int_SEUIL_MIN, ''), str_STATUT)";
let P, cip, avant, resteAvant, origine;

(async () => {
  [P, cip] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' AND s.int_NUMBER_AVAILABLE > 0 ORDER BY f.str_NAME LIMIT 1").split('|');
  origine = q("SELECT " + COLS + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  resteAvant = q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const ouvrirModif = async () => {
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, cip);
    await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.isVisible() && w.down('#int_COLISAGE'); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  const enregistrer = async () => {
    await p.evaluate(() => { const w = window.winModifArticleOuverte; w.query('button').filter((x) => x.text === 'Enregistrer')[0].getEl().dom.setAttribute('data-e2e', 'enr'); });
    await p.click('[data-e2e=enr]');
    await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);

    await ouvrirModif();
    const champs = await p.evaluate(() => { const w = window.winModifArticleOuverte; return { r: !!w.down('#str_CODE_GEO_ARTICLE_RESERVE'), c: !!w.down('#int_COLISAGE') }; });
    ok('Modification : champs « Code Geo réserve » et « Colisage » présents', champs.r && champs.c);
    await p.evaluate(() => { const w = window.winModifArticleOuverte; w.down('#str_CODE_GEO_ARTICLE_RESERVE').setValue('E2E-R07'); w.down('#int_COLISAGE').setValue(12); });
    await p.screenshot({ path: CAPT + '/fiche-code-geo-reserve.png' });
    await enregistrer();
    ok('Enregistré : code géo réserve E2E-R07, colisage 12', q("SELECT " + COLS + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === 'E2E-R07|12');
    ok('Le reste de la fiche est inchangé', q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant, q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") + ' / ' + resteAvant);

    await ouvrirModif();
    const relu = await p.evaluate(() => { const w = window.winModifArticleOuverte; return w.down('#str_CODE_GEO_ARTICLE_RESERVE').getValue() + '|' + w.down('#int_COLISAGE').getValue(); });
    ok('Réouverture : valeurs réaffichées', relu === 'E2E-R07|12', relu);
    await p.evaluate(() => window.winModifArticleOuverte.close());
    await p.waitForTimeout(500);

    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => Ext.getCmp('str_CODE_GEO_ARTICLE_RESERVE') && Ext.getCmp('str_CODE_GEO_ARTICLE_RESERVE').getValue(), null, { timeout: 30000 });
    const det = await p.evaluate(() => Ext.getCmp('str_CODE_GEO_ARTICLE_RESERVE').getValue() + '|' + Ext.getCmp('int_COLISAGE_DETAIL').getValue());
    ok('Détail de l\'article : code géo réserve et colisage affichés', det === 'E2E-R07|12', det);
    await p.evaluate(() => { const w = Ext.getCmp('str_CODE_GEO_ARTICLE_RESERVE').up('window'); if (w) { w.close(); } });
    await p.waitForTimeout(500);

    /* Ecran Produits par code geo */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('produitscodegeo', 'Produits par code géo', ''));
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('produitscodegeo')[0]; return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 30000 });
    const menu = q("SELECT HEX(str_VALUE) = HEX(CONVERT('Produits par code géo' USING utf8)) FROM t_sous_menu WHERE str_COMPOSANT = 'produitscodegeo'");
    ok('Menu « Produits par code géo » en base (libellé exact)', menu === '1', menu);
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('produitscodegeo')[0]; g.down('#codeGeoReserve').setValue('E2E-R'); g.rechercher(); });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('produitscodegeo')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const ligne = await p.evaluate(() => { const st = Ext.ComponentQuery.query('produitscodegeo')[0].getStore(); return { n: st.getTotalCount(), r: st.getCount() ? st.getAt(0).data : null }; });
    ok('Filtre code géo réserve « E2E-R » : le produit, avec son colisage', ligne.n === 1 && ligne.r.id === P && ligne.r.codeGeoReserve === 'E2E-R07' && ligne.r.colisage === 12, JSON.stringify(ligne));
    const habille = await p.evaluate(() => Ext.ComponentQuery.query('produitscodegeo')[0].hasCls('theme-liste'));
    ok('Écran au thème (habillage style Vente)', habille);
    await p.screenshot({ path: CAPT + '/produits-code-geo.png' });
    const sans = await p.evaluate(async () => (await (await fetch('../api/v1/produits-code-geo?sansCode=RESERVE&limit=500')).json()));
    ok('« Sans code géo réserve » : le produit n\'y est plus', sans.success && !sans.data.some((x) => x.id === undefined || x.codeGeoReserve === 'E2E-R07'), sans.total);
    const xl = await p.evaluate(async () => { const r = await fetch('../api/v1/produits-code-geo/excel?codeGeoReserve=E2E-R'); return r.headers.get('content-type') + ' ' + (await r.arrayBuffer()).byteLength; });
    ok('Export Excel du filtre', /spreadsheetml/.test(xl) && Number(xl.split(' ')[1]) > 2000, xl);
    const pdf = await p.evaluate(async () => { const r = await fetch('../api/v1/produits-code-geo/pdf?codeGeoReserve=E2E-R'); return r.headers.get('content-type') + ' ' + r.headers.get('content-disposition'); });
    ok('Impression PDF dans l\'onglet', /application\/pdf/.test(pdf) && /inline/.test(pdf), pdf);

    /* Effacer */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    await ouvrirModif();
    await p.evaluate(() => { const w = window.winModifArticleOuverte; w.down('#str_CODE_GEO_ARTICLE_RESERVE').setValue(''); w.down('#int_COLISAGE').setValue(null); });
    await enregistrer();
    ok('Effacer : NULL en base', q("SELECT " + COLS + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === 'NULL|NULL');
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const o = origine.split('|');
    exec("UPDATE t_famille SET str_CODE_GEO_ARTICLE_RESERVE = " + (o[0] === 'NULL' ? 'NULL' : "'" + o[0] + "'") + ", int_COLISAGE = " + (o[1] === 'NULL' ? 'NULL' : o[1]) + " WHERE lg_FAMILLE_ID = '" + P + "'");
    ok('Produit remis à l\'identique', q("SELECT " + COLS + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === origine && q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
