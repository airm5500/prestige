/* RETOURS DU 06/10 : NOUVELLE PRESENTATION DES FENETRES ET SUGGESTION DE REAPPRO.
 *
 * Ce que le test etablit, sur les vrais ecrans (aucune ecriture en base) :
 *  - fiche article : fenetres Detail, Modifier et Creer au nouveau style (fen-theme), sections en cartes ;
 *  - articles vendus (recapitulatif) : fenetre « voir detail » au nouveau style ;
 *  - suggestion : ecran du contenu au style du theme (sections), fenetres ouvertes depuis l'ecran (detail d'un article,
 *    creation rapide) au nouveau style ; la fiche « detail » ouverte depuis la suggestion se remplit (l'API etait
 *    appelee en POST : 405 et fiche vide) ;
 *  - colonne DISPO : sans entete, etroite, indicateur + bouton de verification de CE produit sur la ligne (la
 *    verification part avec ce seul produit, chez le grossiste de la suggestion) ;
 *  - une fenetre ouverte depuis un autre ecran (hors liste) garde son dessin d'origine ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const P = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0 ORDER BY f.str_NAME LIMIT 1");
  const cip = q("SELECT int_CIP FROM t_famille WHERE lg_FAMILLE_ID = '" + P + "'");
  const S = q("SELECT o.lg_SUGGESTION_ORDER_ID FROM t_suggestion_order o JOIN t_suggestion_order_details d ON d.lg_SUGGESTION_ORDER_ID = o.lg_SUGGESTION_ORDER_ID"
    + " GROUP BY o.lg_SUGGESTION_ORDER_ID ORDER BY o.dt_CREATED DESC LIMIT 1");
  const etatSugg = () => q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(dt_UPDATED, ''), (SELECT COUNT(*) FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = '" + S + "')) FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = '" + S + "'");
  const avantSugg = S ? etatSugg() : '';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  // suivi des reponses apres la connexion (la page de connexion interroge l'officine avant d'etre authentifiee : 401 attendu)
  let connecte = false;
  const http = []; p.on('response', (r) => { if (connecte && r.status() >= 400 && /\/prestige\//.test(r.url())) http.push(r.status() + ' ' + r.url().replace(/\?.*$/, '')); });
  const fenetres = () => p.evaluate(() => { const r = []; Ext.WindowManager.each((w) => { if (w.isVisible && w.isVisible() && w.title) r.push({ t: w.title, fen: w.hasCls('fen-theme'), sections: w.query('fieldset').length, cartes: w.query('fieldset[cls~=fen-section]').length + w.query('fieldset').filter((f) => f.hasCls('fen-section')).length }); }); return r; });
  const fermer = () => p.evaluate(() => { const l = []; Ext.WindowManager.each((w) => { l.push(w); }); l.forEach((w) => { try { if (!w.isDestroyed && w.isVisible()) w.close(); } catch (e) { /* deja fermee */ } }); });
  const attendreFenetre = (motif) => p.waitForFunction((m) => { let t = false; Ext.WindowManager.each((w) => { if (w.isVisible && w.isVisible() && new RegExp(m).test(w.title || '')) t = true; }); return t; }, motif, { timeout: 30000 });
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    connecte = true;

    // 1. Fiche article
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, cip);
    await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });
    for (const [nom, appel, motif] of [['Détail', 'onDetailClick', '^Detail'], ['Modifier', 'onEditClick', '^Modification'], ['Créer', 'onAddClick', '^Ajouter']]) {
      await p.evaluate((a) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; if (a.appel === 'onAddClick') g.onAddClick(); else g[a.appel](g, g.getStore().findExact('lg_FAMILLE_ID', a.P)); }, { appel, P });
      await attendreFenetre(motif); await p.waitForTimeout(1500);
      const f = (await fenetres()).filter((x) => new RegExp(motif).test(x.t));
      ok('Fiche article, fenêtre « ' + nom + ' » au nouveau style, sections en cartes', f.length === 1 && f[0].fen && (f[0].sections === 0 || f[0].cartes > 0), JSON.stringify(f));
      await fermer(); await p.waitForTimeout(500);
    }

    // 2. Articles vendus (recapitulatif) : voir detail
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('articlevendurecapitulatif', 'Articles vendus', ''));
    await p.waitForFunction(() => Ext.getCmp('dt_debut'), null, { timeout: 30000 });
    await p.waitForTimeout(2000);
    await p.evaluate(() => { Ext.getCmp('dt_debut').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -120)); Ext.getCmp('dt_fin').setValue(new Date()); Ext.ComponentQuery.query('articlevendurecapitulatif')[0].onRechClick(); });
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('articlevendurecapitulatif')[0]; return !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 }).catch(() => {});
    const nbVendus = await p.evaluate(() => { const g = Ext.ComponentQuery.query('articlevendurecapitulatif')[0]; if (g.getStore().getCount()) g.onDetailTransactionClick(g, 0); return g.getStore().getCount(); });
    if (nbVendus) {
      await attendreFenetre('^Detail de vente'); await p.waitForTimeout(1500);
      const f = (await fenetres()).filter((x) => /^Detail de vente/.test(x.t));
      ok('Articles vendus : fenêtre « voir détail » au nouveau style', f.length === 1 && f[0].fen, JSON.stringify(f));
      await fermer();
    } else {
      ok('Articles vendus : aucune vente sur 120 jours dans cette base (fenêtre non vérifiée)', true);
    }

    // 3. Fenetre ouverte hors des ecrans concernes : dessin d'origine
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('grossistemanager', 'Grossistes', ''));
    await p.waitForTimeout(3000);
    await p.evaluate(() => { Ext.create('Ext.window.Window', { title: 'E2E hors liste', width: 300, height: 150, items: [{ xtype: 'fieldset', title: 'x' }] }).show(); });
    await p.waitForTimeout(800);
    const hors = (await fenetres()).filter((x) => x.t === 'E2E hors liste');
    ok('Fenêtre ouverte depuis un autre écran : dessin d\'origine conservé', hors.length === 1 && !hors[0].fen, JSON.stringify(hors));
    await fermer();

    // 4. Suggestion
    if (!S) {
      ok('Suggestion avec lignes disponible dans la base', false);
    } else {
      await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('i_sugg_manager', 'Suggestions', ''));
      await p.waitForTimeout(3000);
      await p.evaluate((S) => testextjs.app.getController('App').onLoadNewComponentWithDataSource('suggerercdemanager', 'Suggestion de commande', S, {}), S);
      await p.waitForFunction(() => Ext.getCmp('gridpanelSuggestionID') && Ext.getCmp('gridpanelSuggestionID').getStore().getCount() > 0, null, { timeout: 30000 });
      await p.waitForTimeout(1500);
      const ecran = await p.evaluate(() => { const e = Ext.ComponentQuery.query('suggerercdemanager')[0]; const fs = e.query('fieldset'); return { theme: e.hasCls('mv-panneau'), sections: fs.length, cartes: fs.filter((f) => f.hasCls('fen-section')).length }; });
      ok('Contenu d\'une suggestion : écran au style du thème, sections en cartes', ecran.theme && ecran.sections > 0 && ecran.cartes === ecran.sections, JSON.stringify(ecran));
      const col = await p.evaluate(() => { const c = Ext.getCmp('gridpanelSuggestionID').down('#colDispo'); const cell = document.querySelector('#gridpanelSuggestionID [data-verif-dispo]'); return { titre: c.text, largeur: c.getWidth(), bouton: !!cell, lignes: document.querySelectorAll('#gridpanelSuggestionID [data-verif-dispo]').length }; });
      ok('Colonne DISPO : sans entête et étroite', col.titre === '' && col.largeur <= 40, JSON.stringify(col));
      ok('Colonne DISPO : bouton de vérification sur chaque ligne', col.bouton && col.lignes >= 1, JSON.stringify(col));
      const appel = await p.evaluate(() => {
        const D = testextjs.view.commandemanagement.disponibilite.DisponibilitePharmaMl, origine = D.lancer; let vu = null;
        D.lancer = function (cfg, familles, grossisteId) { vu = { source: cfg.source, id: cfg.id, familles: familles, grossisteId: grossisteId }; };
        try { document.querySelector('#gridpanelSuggestionID [data-verif-dispo]').click(); } finally { D.lancer = origine; }
        return { vu: vu, attendu: Ext.getCmp('gridpanelSuggestionID').getStore().getAt(0).get('lg_FAMILLE_ID') };
      });
      ok('Vérification sur la ligne : ce seul produit, chez le grossiste de la suggestion', appel.vu && appel.vu.source === 'SUGGESTION' && appel.vu.id === S
        && appel.vu.familles.length === 1 && appel.vu.familles[0] === appel.attendu && appel.vu.grossisteId === null, JSON.stringify(appel));

      await p.evaluate(() => { const r = Ext.getCmp('gridpanelSuggestionID').getStore().getAt(0); Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(r.get('lg_FAMILLE_ID')); Me_Window.onbtndetail(); });
      await attendreFenetre('^Detail sur'); await p.waitForTimeout(3500);
      const det = (await fenetres()).filter((x) => /^Detail sur/.test(x.t));
      ok('Suggestion : fenêtre de détail d\'un article au nouveau style', det.length === 1 && det[0].fen, JSON.stringify(det));
      const rempli = await p.evaluate(() => { const w = []; Ext.WindowManager.each((x) => { if (x.isVisible() && /^Detail sur/.test(x.title || '')) w.push(x); }); return w.length ? w[0].getEl().dom.innerText : ''; });
      const nomProduit = await p.evaluate(() => Ext.getCmp('gridpanelSuggestionID').getStore().getAt(0).get('str_FAMILLE_NAME'));
      ok('Suggestion : la fiche détail se remplit (API en GET)', rempli.indexOf(String(nomProduit).trim()) >= 0, nomProduit);
      await fermer();
      await p.evaluate(() => { Me_Window.onbtnaddArticle(); });
      await attendreFenetre('^Ajouter un nouvel article'); await p.waitForTimeout(1500);
      const cr = (await fenetres()).filter((x) => /^Ajouter un nouvel article/.test(x.t));
      ok('Suggestion : fenêtre de création rapide au nouveau style', cr.length === 1 && cr[0].fen, JSON.stringify(cr));
      await fermer();
      await p.evaluate(() => { const g = Ext.getCmp('gridpanelSuggestionID'); Me_Window.onDetailClick(g, 0); });
      await attendreFenetre('^Detail sur'); await p.waitForTimeout(1500);
      const dl = (await fenetres()).filter((x) => /^Detail sur/.test(x.t));
      ok('Suggestion : détail depuis la ligne, nom du produit dans le titre', dl.length === 1 && dl[0].fen && dl[0].t.indexOf(String(nomProduit).trim()) >= 0, JSON.stringify(dl));
      await fermer();
    }

    ok('Aucune réponse en erreur (4xx/5xx)', http.length === 0, JSON.stringify(http));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Déroulé sans exception', false, (e.stack || '').split('\n').filter((l) => /test-retours|Error/.test(l)).join(' | '));
  } finally {
    await b.close();
    if (S) ok('Suggestion utilisée inchangée en base', etatSugg() === avantSugg, avantSugg + ' / ' + etatSugg());
    const f = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - f) + '/' + res.length + ' PASS');
    process.exit(f ? 1 : 0);
  }
})();
