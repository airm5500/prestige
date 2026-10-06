/* FICHE ARTICLE : SORTIE DES JSP (plan d'octobre, lot L6c).
 *
 * Ce que le test etablit, sur les vrais ecrans (jeu d'essai retire et valeurs d'origine remises a la fin) :
 *  - memes reponses JSP et API : fabricants, codes de gestion, valeur maximale d'une vente, recherche d'articles de
 *    l'ecran de suggestion ;
 *  - « Valeur max » (fenetre de la fiche) : lecture et enregistrement par l'API, valeur en base ;
 *  - changement d'emplacement (fenetre « updatezonegeo ») par l'API : meme ecriture que la JSP ;
 *  - creation rapide d'un produit (fenetre « add2 », depuis la suggestion) par l'API : la ligne creee est identique,
 *    colonne par colonne, a celle que cree la JSP avec les memes valeurs ; memes lignes de stock, grossiste, emplacement ;
 *  - detail d'un article depuis la suggestion (« detailArticleOther ») : grille des entrees par l'API ;
 *  - aucune requete .jsp pendant ces parcours ; aucune erreur JavaScript nouvelle.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const suffixe = String(Date.now()).slice(-6);
const CIP_JSP = '91' + suffixe, CIP_API = '92' + suffixe;
const crees = [];
let maxOrigine = null, zoneOrigine = null, P = null;

function nettoyer() {
  const ids = crees.concat(q("SELECT GROUP_CONCAT(lg_FAMILLE_ID) FROM t_famille WHERE int_CIP IN ('" + CIP_JSP + "','" + CIP_API + "')").split(',')).filter((x) => x && x !== 'NULL');
  if (ids.length) {
    const liste = ids.map((x) => "'" + x + "'").join(',');
    const tables = q("SELECT GROUP_CONCAT(TABLE_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + BASE + "' AND COLUMN_NAME = 'lg_FAMILLE_ID' AND TABLE_NAME <> 't_famille'"
      + " AND TABLE_NAME IN (SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_TYPE = 'BASE TABLE')").split(',');
    let sql = 'SET FOREIGN_KEY_CHECKS = 0;';
    tables.forEach((t) => { sql += ' DELETE FROM `' + t + '` WHERE lg_FAMILLE_ID IN (' + liste + ');'; });
    sql += ' DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (' + liste + '); SET FOREIGN_KEY_CHECKS = 1;';
    exec(sql);
  }
  exec("DELETE FROM t_fabriquant WHERE lg_FABRIQUANT_ID LIKE 'E2E-L6C-%'");
  if (maxOrigine !== null) exec("UPDATE t_parameters SET str_VALUE = '" + maxOrigine + "' WHERE str_KEY = 'KEY_MAX_VALUE_VENTE'");
  if (zoneOrigine !== null) exec("UPDATE t_famille_zonegeo SET lg_ZONE_GEO_ID = '" + zoneOrigine + "' WHERE lg_FAMILLE_ID = '" + P + "' AND lg_EMPLACEMENT_ID = '1'");
}

(async () => {
  exec("INSERT INTO t_fabriquant (lg_FABRIQUANT_ID, str_CODE, str_NAME, str_DESCRIPTION, dt_CREATED, str_STATUT) VALUES"
    + " ('E2E-L6C-1', 'E2E1', 'E2E FABRICANT A', 'Fabricant de test', NOW(), 'enable'), ('E2E-L6C-2', 'E2E2', 'E2E FABRICANT B', 'Fabricant de test', NOW(), 'enable')");
  maxOrigine = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_MAX_VALUE_VENTE'");
  P = q("SELECT z.lg_FAMILLE_ID FROM t_famille_zonegeo z JOIN t_famille f ON f.lg_FAMILLE_ID = z.lg_FAMILLE_ID WHERE z.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' ORDER BY f.str_NAME LIMIT 1");
  zoneOrigine = q("SELECT lg_ZONE_GEO_ID FROM t_famille_zonegeo WHERE lg_FAMILLE_ID = '" + P + "' AND lg_EMPLACEMENT_ID = '1' LIMIT 1");
  const zones = q("SELECT GROUP_CONCAT(lg_ZONE_GEO_ID) FROM (SELECT lg_ZONE_GEO_ID FROM t_zone_geographique WHERE str_STATUT = 'enable' AND lg_ZONE_GEO_ID <> '" + zoneOrigine + "' ORDER BY str_LIBELLEE LIMIT 2) z").split(',');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  if (process.env.TRACE) { p.on('framenavigated', (f) => { console.log('NAV', f === p.mainFrame(), f.url()); }); p.on('request', (r) => { if (!/_dc=|\.(png|gif|css|js)/.test(r.url())) console.log('REQ', r.method(), r.url().slice(0, 140)); }); p.on('console', (m) => console.log('CONSOLE', m.text().slice(0, 200))); }
  let suivre = false; const jsp = [];
  p.on('request', (r) => { const u = r.url(); if (suivre && /\.jsp/.test(u) && !/index\.jsp|panelInfos|ws_tree_menu/.test(u)) jsp.push(u.replace(/^.*webservices/, '').replace(/\?.*$/, '')); });
  const lire = (t) => JSON.parse(t.slice(t.search(/[\[{]/), Math.max(t.lastIndexOf('}'), t.lastIndexOf(']')) + 1)); // la JSP enveloppe son JSON de commentaires et de parentheses
  const appel = (url, opts) => p.evaluate(async (a) => { const r = await fetch(a.url, a.opts || {}); return r.text(); }, { url, opts });
  const formulaire = (params) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  const fermerFenetres = () => p.evaluate(() => { const l = []; Ext.WindowManager.each((w) => { l.push(w); }); l.forEach((w) => { try { if (!w.isDestroyed && w.isVisible()) w.close(); } catch (e) { /* fenetre deja detruite */ } }); });
  const cliquer = async (win, texte) => {
    await p.evaluate((a) => { let w = Ext.getCmp(a.win) || Ext.ComponentQuery.query(a.win)[0]; if (!w.isXType('window')) w = w.up('window'); w.query('button').filter((x) => x.text === a.texte)[0].getEl().dom.setAttribute('data-e2e', 'btn'); }, { win, texte });
    await p.click('[data-e2e=btn]');
    await p.evaluate(() => { const e = document.querySelector('[data-e2e=btn]'); if (e) e.removeAttribute('data-e2e'); });
  };
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    // 1. Memes reponses JSP et API
    const cmp = async (nom, jspUrl, apiUrl, cle) => {
      const a = lire(await appel(jspUrl)), r = lire(await appel(apiUrl));
      const norm = (o) => JSON.stringify((o.results || []).map((x) => cle.map((k) => String(x[k] == null ? '' : x[k]))).sort());
      ok(nom + ' : même liste par l\'API que par la JSP (' + (r.results || []).length + ' lignes)', norm(a) === norm(r) && (r.results || []).length > 0, norm(a).slice(0, 120) + ' / ' + norm(r).slice(0, 120));
    };
    await cmp('Fabricants', '../webservices/configmanagement/fabriquant/ws_data.jsp?limit=1000', '../api/v1/referentiel-article/fabriquants?limit=1000', ['lg_FABRIQUANT_ID', 'str_NAME']);
    await cmp('Codes de gestion', '../webservices/configmanagement/codegestion/ws_data.jsp?limit=1000', '../api/v1/referentiel-article/codes-gestion?limit=1000', ['lg_CODE_GESTION_ID', 'str_CODE_BAREME']);
    for (const prm of ['query=a&start=0&limit=20', 'query=a&start=20&limit=20&exclude_detail=1', 'search_value=' + encodeURIComponent(q("SELECT LEFT(str_NAME, 4) FROM t_famille WHERE str_STATUT = 'enable' ORDER BY str_NAME LIMIT 1")) + '&start=0&limit=50']) {
      const sj = lire(await appel('../webservices/sm_user/famille/ws_search_data.jsp?' + prm)), sa = lire(await appel('../api/v1/referentiel-article/recherche-produits?' + prm));
      ok('Recherche d\'articles (' + prm + ') : même réponse par l\'API que par la JSP (' + sa.data.length + '/' + sa.total + ')', JSON.stringify(sj) === JSON.stringify(sa) && sa.data.length > 0, JSON.stringify(sj).slice(0, 150) + ' / ' + JSON.stringify(sa).slice(0, 150));
    }
    const mj = lire(await appel('../webservices/configmanagement/famillearticle/ws_data_maxVente.jsp')), ma = lire(await appel('../api/v1/referentiel-article/valeur-max-vente'));
    ok('Valeur max : même valeur par l\'API que par la JSP', String(mj.total) === String(ma.total), mj.total + ' / ' + ma.total);

    // 2. Fenetre « Valeur max »
    suivre = true;
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => { new testextjs.view.configmanagement.famille.action.maxVente({ odatasource: '', parentview: null, mode: 'update', titre: 'Valeur max' }); });
    await p.waitForFunction(() => Ext.getCmp('int_MaxVente') && Ext.getCmp('int_MaxVente').getValue() !== null, null, { timeout: 20000 });
    const lu = await p.evaluate(() => Ext.getCmp('int_MaxVente').getValue());
    ok('Valeur max : la fenêtre affiche la valeur du paramètre', String(lu) === String(maxOrigine), lu + ' / ' + maxOrigine);
    const nouvelle = Number(maxOrigine || 0) + 7;
    await p.evaluate((v) => { Ext.getCmp('int_MaxVente').setValue(v); }, nouvelle);
    await cliquer('int_MaxVente', 'Modifier');
    await p.waitForTimeout(2500);
    ok('Valeur max : enregistrée en base par l\'API', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_MAX_VALUE_VENTE'") === String(nouvelle));
    await fermerFenetres();

    // 3. Changement d'emplacement : JSP puis API, meme ecriture
    suivre = false;
    await appel('../webservices/sm_user/famille/ws_transaction.jsp?mode=updateonlyzonegeo', formulaire({ lg_FAMILLE_ID: P, lg_ZONE_GEO_ID: zones[0], lg_EMPLACEMENT_ID: '1' }));
    const parJsp = q("SELECT lg_ZONE_GEO_ID FROM t_famille_zonegeo WHERE lg_FAMILLE_ID = '" + P + "' AND lg_EMPLACEMENT_ID = '1'");
    suivre = true;
    await p.evaluate((a) => void new testextjs.view.configmanagement.famille.action.updatezonegeo({ odatasource: { lg_FAMILLE_ID: a.P, lg_EMPLACEMENT_ID: '1', str_DESCRIPTION: 'x', lg_ZONE_GEO_ID: '' }, parentview: { onRechClick: function () {} }, mode: 'update', titre: 'Emplacement' }), { P });
    await p.waitForFunction(() => window.winZoneGeoOuverte && winZoneGeoOuverte.isVisible() && Ext.getCmp('lg_ZONE_GEO_ID'), null, { timeout: 20000 });
    await p.evaluate((z) => { const c = winZoneGeoOuverte.down('#lg_ZONE_GEO_ID'); c.getStore().load({ callback: () => c.setValue(z) }); }, zones[1]);
    await p.waitForTimeout(2000);
    await p.evaluate(() => { window.Me_Workflow = { onRechClick: function () {} }; window.Oview = window.Me_Workflow; });
    await cliquer('lg_ZONE_GEO_ID', 'Enregistrer');
    await p.waitForTimeout(2500);
    const parApi = q("SELECT lg_ZONE_GEO_ID FROM t_famille_zonegeo WHERE lg_FAMILLE_ID = '" + P + "' AND lg_EMPLACEMENT_ID = '1'");
    ok('Emplacement : la JSP écrit la zone choisie', parJsp === zones[0], parJsp);
    ok('Emplacement : la fenêtre écrit la zone choisie par l\'API', parApi === zones[1], parApi + ' / ' + zones[1]);
    await fermerFenetres();

    // 4. Creation rapide (add2) : JSP puis fenetre par l'API, lignes comparees
    const grossiste = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
    const famArt = q("SELECT lg_FAMILLEARTICLE_ID FROM t_famillearticle WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE LIMIT 1");
    const tva = q("SELECT lg_CODE_TVA_ID FROM t_code_tva ORDER BY lg_CODE_TVA_ID LIMIT 1");
    const commun = { lg_GROSSISTE_ID: grossiste, int_PAF: '1000', int_PRICE: '1500', lg_FAMILLEARTICLE_ID: famArt, lg_ZONE_GEO_ID: zones[0], lg_CODE_TVA_ID: tva, int_T: '', int_EAN13: '', str_CODE_REMISE: '0' };
    suivre = false;
    const rj = (await appel('../webservices/sm_user/famille/ws_transaction.jsp?mode=create', formulaire(Object.assign({}, commun, { int_PAT: '1000', int_CIP: CIP_JSP, str_DESCRIPTION: 'E2E L6C JSP ' + suffixe }))));
    const idJsp = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE int_CIP = '" + CIP_JSP + "' LIMIT 1"); if (idJsp) crees.push(idJsp);
    ok('Création par la JSP (référence de comparaison)', !!idJsp, rj.replace(/\s+/g, ' '));

    suivre = true;
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('suggerercdemanager', 'Suggestion', '0', {}));
    await p.waitForFunction(() => window.Me_Window && Me_Window.onbtnaddArticle, null, { timeout: 30000 });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { Me_Window.onbtnaddArticle(); });
    await p.waitForFunction(() => window.winModifArticle2Ouverte && winModifArticle2Ouverte.isVisible() && Ext.getCmp('int_CIP'), null, { timeout: 20000 });
    await p.waitForTimeout(2500);
    await p.evaluate((a) => {
      const pose = (id, v) => { const c = Ext.getCmp(id); if (c.getStore && c.getStore()) { c.getStore().load({ callback: () => c.setValue(v) }); } else { c.setValue(v); } };
      Ext.getCmp('int_CIP').setValue(a.cip); Ext.getCmp('str_DESCRIPTION').setValue(a.nom);
      pose('lg_ZONE_GEO_ID', a.c.lg_ZONE_GEO_ID); pose('lg_FAMILLEARTICLE_ID', a.c.lg_FAMILLEARTICLE_ID); pose('lg_CODE_TVA_ID', a.c.lg_CODE_TVA_ID); pose('lg_GROSSISTE_QUICK_ID', a.c.lg_GROSSISTE_ID);
      Ext.getCmp('int_PAF').setValue(1000); Ext.getCmp('int_PRICE').setValue(1500);
    }, { cip: CIP_API, nom: 'E2E L6C JSP ' + suffixe, c: commun });
    await p.waitForTimeout(2500);
    const valeurs = await p.evaluate(() => ['lg_ZONE_GEO_ID', 'lg_FAMILLEARTICLE_ID', 'lg_CODE_TVA_ID', 'lg_GROSSISTE_QUICK_ID'].map((i) => Ext.getCmp(i).getValue()));
    ok('Fenêtre de création rapide : champs renseignés', valeurs.every((v) => v), JSON.stringify(valeurs));
    await cliquer('int_CIP', 'Enregistrer');
    await p.waitForFunction(() => winModifArticle2Ouverte.isDestroyed || !winModifArticle2Ouverte.isVisible(), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2000);
    const idApi = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE int_CIP = '" + CIP_API + "' LIMIT 1"); if (idApi) crees.push(idApi);
    ok('Création par la fenêtre (API) : produit créé', !!idApi);
    if (idJsp && idApi) {
      const ignorer = ['lg_FAMILLE_ID', 'int_CIP', 'dt_CREATED', 'dt_UPDATED', 'lg_FAMILLE_PARENT_ID', 'str_CODE_ARTICLE', 'dt_LAST_MOUVEMENT'];
      const cols = q("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '" + BASE + "' AND TABLE_NAME = 't_famille'").split(',').filter((c) => ignorer.indexOf(c) < 0);
      const ligne = (id) => q("SELECT CONCAT_WS('§', " + cols.map((c) => "IFNULL(CAST(`" + c + "` AS CHAR), 'NULL')").join(', ') + ") FROM t_famille WHERE lg_FAMILLE_ID = '" + id + "'").split('§');
      const lj = ligne(idJsp), la = ligne(idApi);
      const ecarts = cols.filter((c, i) => lj[i] !== la[i]).map((c) => c + '=' + lj[cols.indexOf(c)] + '/' + la[cols.indexOf(c)]);
      ok('Création : ligne t_famille identique à celle de la JSP (' + cols.length + ' colonnes)', ecarts.length === 0, ecarts.join(' ; '));
      const annexes = (id) => ['t_famille_stock', 't_famille_grossiste', 't_famille_zonegeo'].map((t) => t + ':' + q('SELECT COUNT(*) FROM ' + t + " WHERE lg_FAMILLE_ID = '" + id + "'")).join(' ');
      ok('Création : mêmes lignes de stock, grossiste et emplacement', annexes(idJsp) === annexes(idApi), annexes(idJsp) + ' / ' + annexes(idApi));
      ok('Création : grossiste et prix enregistrés', q("SELECT CONCAT(lg_GROSSISTE_ID, '|', int_PRICE, '|', int_PAF) FROM t_famille WHERE lg_FAMILLE_ID = '" + idApi + "'") === grossiste + '|1500|1000');
    }
    await fermerFenetres();

    // 5. Detail depuis la suggestion
    await p.evaluate((P) => { Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(P); Me_Window.onbtndetail(); }, P);
    await p.waitForFunction(() => Ext.getCmp('gridpanelOrderID') && !Ext.getCmp('gridpanelOrderID').getStore().isLoading(), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(3000);
    const grille = await p.evaluate(() => { const g = Ext.getCmp('gridpanelOrderID'); return g ? { url: g.getStore().getProxy().url, n: g.getStore().getCount() } : null; });
    ok('Détail depuis la suggestion : entrées chargées par l\'API', grille && /api\/v1\/commande\/produit\/commande\/famille/.test(grille.url), JSON.stringify(grille));
    await fermerFenetres();
    suivre = false;

    ok('Aucune requête .jsp pendant les parcours', jsp.length === 0, JSON.stringify(jsp));
    const nouvelles = err.filter((e) => e.trim() !== 'h');
    ok('Aucune erreur JavaScript', nouvelles.length === 0, JSON.stringify(nouvelles));
  } catch (e) {
    ok('Déroulé sans exception', false, (e.stack || '').split('\n').filter((l) => /test-fiche|Error/.test(l)).join(' | '));
  } finally {
    await b.close();
    nettoyer();
    ok('Nettoyage : jeu d\'essai retiré, paramètre et emplacement remis',
      q("SELECT COUNT(*) FROM t_famille WHERE int_CIP IN ('" + CIP_JSP + "','" + CIP_API + "')") === '0'
      && q("SELECT COUNT(*) FROM t_fabriquant WHERE lg_FABRIQUANT_ID LIKE 'E2E-L6C-%'") === '0'
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_MAX_VALUE_VENTE'") === maxOrigine
      && q("SELECT lg_ZONE_GEO_ID FROM t_famille_zonegeo WHERE lg_FAMILLE_ID = '" + P + "' AND lg_EMPLACEMENT_ID = '1'") === zoneOrigine);
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' PASS');
    process.exit(f ? 1 : 0);
  }
})();
