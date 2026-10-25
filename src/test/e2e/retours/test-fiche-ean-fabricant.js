/* FICHE ARTICLE : CODE EAN FABRICANT ET OUVERTURE DE LA MODIFICATION (retour du 15/10).
 *
 * Ce que le test etablit, sur les vrais ecrans (valeur d'origine du produit remise a la fin) :
 *  - fermer la fenetre « Modifier » avant l'arrivee de la liste des types d'etiquette ne leve plus
 *    « Cannot read properties of null (reading 'findRecord') » (choisirType) ;
 *  - un clic sur « Modifier » masque la liste pendant le chargement, un second clic n'ouvre pas une seconde fenetre ;
 *  - modification : champ « Code EAN fabricant » ; ajouter, reafficher a la reouverture, modifier, effacer (NULL) ;
 *    le reste de la fiche est inchange ; plus de 40 caracteres est refuse par le serveur ;
 *  - detail de l'article : le code est affiche en lecture seule, sans champ de saisie ni bouton (retour du 15/10 :
 *    il se saisit a la creation ou en modification seulement) ;
 *  - sans le droit « Modifier » (P_BT_UPDATE) : la route d'ecriture du code refuse (403) ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const CAPT = process.env.CAPTURES || ENV_E2E.TMP;
const EAN = "IFNULL(code_ean_fabriquant, 'NULL')";
const RESTE = "CONCAT_WS('|', str_NAME, int_CIP, int_PRICE, int_PAF, IFNULL(int_EAN13, ''), IFNULL(str_CODE_GEO_ARTICLE, ''), lg_ZONE_GEO_ID, str_STATUT)";
const droitModifier = require('../support/privilege-essai')(q, exec, 'admin', 'P_BT_UPDATE');
let P, cip, origine, resteAvant;

(async () => {
  droitModifier.remettre();
  [P, cip] = q("SELECT CONCAT(f.lg_FAMILLE_ID, '|', f.int_CIP) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.int_CIP REGEXP '^[0-9]{7}$' AND s.int_NUMBER_AVAILABLE > 0 ORDER BY f.str_NAME LIMIT 1 OFFSET 3").split('|');
  origine = q("SELECT " + EAN + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  resteAvant = q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const ean = () => q("SELECT " + EAN + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  let p, err = [];
  const connecter = async () => {
    const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
    p = await ctx.newPage();
    err = []; p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2500);
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, cip);
    await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });
  };
  const ouvrirModif = async () => {
    const t0 = Date.now();
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.isVisible() && w.down('#int_CIP') && w.down('#int_CIP').getValue(); }, null, { timeout: 30000 });
    const duree = Date.now() - t0;
    await p.waitForTimeout(1200);
    return duree;
  };
  const enregistrer = async () => {
    await p.evaluate(() => { const w = window.winModifArticleOuverte; w.query('button').filter((x) => x.text === 'Enregistrer')[0].getEl().dom.setAttribute('data-e2e', 'enr'); });
    await p.click('[data-e2e=enr]');
    await p.waitForFunction(() => !window.winModifArticleOuverte || window.winModifArticleOuverte.isDestroyed, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
  };
  const ouvrirDetail = async () => {
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onDetailClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => { const f = Ext.getCmp('eanFabricantDetail'); return f && f.isVisible() && !!f.getValue(); }, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  };
  const fermerDetail = async () => {
    await p.evaluate(() => { const w = Ext.getCmp('eanFabricantDetail').up('window'); if (w) { w.close(); } });
    await p.waitForTimeout(500);
  };
  try {
    await connecter();

    /* 1. fenetre fermee avant l'arrivee des types d'etiquette */
    await p.route('**/api/v1/referentiel-article/typeetiquettes**', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.onEditClick(g, g.getStore().findExact('lg_FAMILLE_ID', P)); }, P);
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.isVisible(); }, null, { timeout: 30000 });
    await p.evaluate(() => window.winModifArticleOuverte.close());
    await p.waitForTimeout(4000);
    await p.unroute('**/api/v1/referentiel-article/typeetiquettes**');
    ok('Fermer « Modifier » avant les types d\'étiquette : aucune erreur findRecord', !err.some((e) => /findRecord|getStore|null/.test(e)), JSON.stringify(err));

    /* 2. masque pendant le chargement, double clic sans seconde fenetre */
    await p.route('**/api/v1/produit-search/produits/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
    const pendant = await p.evaluate((P) => {
      const g = Ext.ComponentQuery.query('famillemanager')[0], i = g.getStore().findExact('lg_FAMILLE_ID', P);
      let n = 0; const orig = testextjs.view.configmanagement.famille.action.add.prototype.initComponent;
      window.__nbFenetres = 0;
      testextjs.view.configmanagement.famille.action.add.prototype.initComponent = function () { window.__nbFenetres++; return orig.apply(this, arguments); };
      window.__origInit = orig;
      g.onEditClick(g, i); g.onEditClick(g, i);
      return !!(g.el && g.el.isMasked && g.el.isMasked()) || !!g.loadMask;
    }, P);
    await p.waitForFunction(() => { const w = window.winModifArticleOuverte; return w && !w.isDestroyed && w.isVisible() && w.down('#int_CIP').getValue(); }, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    const apres = await p.evaluate(() => {
      testextjs.view.configmanagement.famille.action.add.prototype.initComponent = window.__origInit;
      const g = Ext.ComponentQuery.query('famillemanager')[0];
      return { n: window.__nbFenetres, masque: !!(g.el && g.el.isMasked && g.el.isMasked()) };
    });
    await p.unroute('**/api/v1/produit-search/produits/**');
    ok('« Modifier » : la liste est masquée pendant le chargement', pendant);
    ok('Deux clics rapides : une seule fenêtre, masque retiré ensuite', apres.n === 1 && !apres.masque, JSON.stringify(apres));

    /* les etapes 1 et 2 interceptent des requetes et remplacent un prototype : la suite repart d'une session neuve */
    await p.evaluate(() => window.winModifArticleOuverte && window.winModifArticleOuverte.close());
    await p.context().close();
    await connecter();
    await ouvrirModif();

    /* 3. champ dans la modification : ajouter */
    const champ = await p.evaluate(() => { const f = window.winModifArticleOuverte.down('#code_EAN_FABRIQUANT'); return f ? { v: f.getValue(), l: f.fieldLabel, vis: f.isVisible() } : null; });
    ok('Modification : champ « Code EAN fabricant » présent et visible', champ && champ.vis && /EAN fabricant/.test(champ.l), JSON.stringify(champ));
    ok('Il affiche la valeur actuelle', champ && (champ.v || 'NULL') === (origine === 'NULL' ? 'NULL' : origine), JSON.stringify(champ) + ' / ' + origine);
    await p.evaluate(() => { window.winModifArticleOuverte.down('#code_EAN_FABRIQUANT').setValue('  3400930000017 '); });
    await p.screenshot({ path: CAPT + '/fiche-ean-fabricant-modif.png' });
    await enregistrer();
    ok('Ajouter : code enregistré, espaces retirés', ean() === '3400930000017', ean());
    ok('Le reste de la fiche est inchangé', q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant);

    const duree = await ouvrirModif();
    const relu = await p.evaluate(() => window.winModifArticleOuverte.down('#code_EAN_FABRIQUANT').getValue());
    ok('Réouverture : code réaffiché', relu === '3400930000017', relu);
    ok('Ouverture de « Modifier » en moins de 3 s', duree < 3000, duree + ' ms');
    await p.evaluate(() => { window.winModifArticleOuverte.down('#code_EAN_FABRIQUANT').setValue('E2E-FAB-0002'); });
    await enregistrer();
    ok('Modifier : nouveau code enregistré', ean() === 'E2E-FAB-0002', ean());

    /* trop long : refus serveur, rien d'ecrit */
    const long = await p.evaluate(async (P) => {
      const r = await fetch('../api/v1/fichearticle/enregistrer?mode=update&lg_FAMILLE_ID=' + P, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'code_EAN_FABRIQUANT=' + 'X'.repeat(41) });
      return r.json();
    }, P);
    ok('Plus de 40 caractères : refusé, rien n\'est écrit', /40 au plus/.test(long.errors) && ean() === 'E2E-FAB-0002', JSON.stringify(long));

    await ouvrirModif();
    await p.evaluate(() => { window.winModifArticleOuverte.down('#code_EAN_FABRIQUANT').setValue(''); });
    await enregistrer();
    ok('Effacer depuis la modification : NULL en base', ean() === 'NULL', ean());
    ok('Le reste de la fiche est toujours inchangé', q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant);

    /* 4. detail de l'article */
    exec("UPDATE t_famille SET code_ean_fabriquant = 'E2E-FAB-DET' WHERE lg_FAMILLE_ID = '" + P + "'");
    await ouvrirDetail();
    const det = await p.evaluate(() => { const f = Ext.getCmp('eanFabricantDetail'); return { v: f.getValue(), type: f.xtype, saisie: !!(f.el && f.el.down('input')), bouton: !!Ext.getCmp('btnEanFabricantDetail') }; });
    ok('Détail : code affiché en lecture seule, ni champ de saisie ni bouton', det.v === 'E2E-FAB-DET' && det.type === 'displayfield' && !det.saisie && !det.bouton, JSON.stringify(det));
    await p.screenshot({ path: CAPT + '/fiche-ean-fabricant-detail.png' });
    ok('Le détail n\'écrit rien', ean() === 'E2E-FAB-DET', ean());
    await fermerDetail();
    ok('Le reste de la fiche est inchangé après le détail', q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant);
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));

    /* 5. sans le droit « Modifier » */
    droitModifier.retirer();
    await p.context().close();
    await connecter();
    exec("UPDATE t_famille SET code_ean_fabriquant = 'E2E-FAB-RO' WHERE lg_FAMILLE_ID = '" + P + "'");
    await ouvrirDetail();
    const ro = await p.evaluate(() => Ext.getCmp('eanFabricantDetail').getValue());
    ok('Sans le droit : code affiché', ro === 'E2E-FAB-RO', ro);
    const refus = await p.evaluate(async (P) => { const r = await fetch('../api/v1/fichearticle/' + P + '/code-ean-fabricant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'PIRATE' }) }); return r.status + ' ' + (await r.text()); }, P);
    ok('Sans le droit : la route refuse (403), rien n\'est écrit', /^403/.test(refus) && ean() === 'E2E-FAB-RO', refus);
    await fermerDetail();
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    droitModifier.remettre();
    await b.close();
    exec("UPDATE t_famille SET code_ean_fabriquant = " + (origine === 'NULL' ? 'NULL' : "'" + origine.replace(/'/g, "''") + "'") + " WHERE lg_FAMILLE_ID = '" + P + "'");
    ok('Produit remis à l\'identique', ean() === origine && q("SELECT " + RESTE + " FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'") === resteAvant);
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
