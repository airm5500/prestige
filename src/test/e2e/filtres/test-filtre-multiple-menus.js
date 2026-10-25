/* FILTRE MULTIPLE dans les 14 autres menus (demande du 13/10). Par ecran, en ouvrant le menu comme l'utilisateur :
 *  - le filtre multiple remplace les listes a choix unique (masquees), avec les axes de l'ecran ;
 *  - 2 rayons coches + « Rechercher » : la requete de l'ecran porte les 2 rayons ensemble et le serveur repond ;
 *  - quand la reponse a un total : total(2 rayons) = total(rayon 1) + total(rayon 2) (un produit n'a qu'un rayon) ;
 *  - aucune erreur JavaScript. Lecture seule (la preference de presentation n'est pas touchee).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const RAYONS = q("SELECT f.lg_ZONE_GEO_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID IS NOT NULL AND f.lg_ZONE_GEO_ID <> '' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 2 OFFSET 1").split('\n');
/* [menu xtype, titre, classe de l'ecran, morceau d'URL de la recherche, axes attendus, onglet a ouvrir (titre) ] */
const ECRANS = [
  ['stockmort', 'Articles invendus', 'testextjs.view.produits.ArticlesInvendus', 'articleInvendus', 3],
  ['stockmort', 'Articles invendus', 'testextjs.view.produits.ArticlesDormants', 'articles-dormants', 3, /dormant|mort/i],
  ['gestionsurstock', 'Gestion des surstocks', 'testextjs.view.produits.GestionSurstock', 'surstock', 3],
  ['margeproducts', 'Marge sur produits vendus', 'testextjs.view.Dashboard.MargeManager', 'margeproduitsvendus', 3],
  ['etatstock', 'Etat de stock', 'testextjs.view.stockmanagement.etatstock.EtatStockManager', 'etat-stock', 3],
  ['articlevendurecapitulatif', 'Articles vendus récap', 'testextjs.view.configmanagement.famille.ArticleVenduBis', 'article-vendus-recap', 2],
  ['articlevendumanager', 'Articles vendus', 'testextjs.view.configmanagement.famille.ArticleVendu', 'article-vendus', 1],
  ['famillestockcomparaisonmanager', 'Comparaison stock', 'testextjs.view.produits.ComparaisonStock', 'fichearticle/comparaison', 3],
  ['evaluationventemoyenne', 'Evaluation des ventes', 'testextjs.view.stockmanagement.suivistockvente.EvaluationVenteMoyenneManager', 'evaluation-vente/data', 2],
  ['saisieperimeonglets', 'Saisie produits périmés', 'testextjs.view.Report.saisieperimes.SaisiePerimeManager', 'saisieperimes', 3],
  ['famillemanager', 'Fiche article', 'testextjs.view.configmanagement.famille.FamilleManager', 'produit-search/fiche', 1],
  ['abcmanager', 'Classification ABC', 'testextjs.view.Report.abc.AbcManager', 'articles/abc', 3],
  ['feuilledematch', 'Feuille de match', 'testextjs.view.Report.abc.FeuilleDeMatchManager', 'feuille-match', 3],
  ['analysearticle', 'Analyse article', 'testextjs.view.analyseArticle.AnalyseArticleManager', 'analyse-article/matrice', 3],
  ['articlemvtgrid', 'Articles mouvementés', 'testextjs.view.stat.ArticleMvtGrid', 'articlemvt/list', 2]
];

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const requetes = []; p.on('request', (r) => requetes.push({ url: r.url(), post: r.postData() || '' }));
  try {
    ok('Précondition : 2 rayons avec des produits', RAYONS.length === 2 && RAYONS[0] && RAYONS[1], RAYONS.join(','));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    for (const [xtype, titre, classe, morceau, nbAxes, onglet] of ECRANS) {
      const nom = classe.split('.').pop();
      try {
        await p.evaluate((a) => { Ext.each(Ext.ComponentQuery.query('[closable=true]'), (c) => { if (c.up && c.up('tabpanel') && c.close) { try { c.close(); } catch (e) {} } });
          testextjs.app.getController('App').onLoadNewComponent(a.x, a.t, ''); }, { x: xtype, t: titre });
        if (onglet) {
          await p.waitForTimeout(2500);
          await p.evaluate((re) => { const r = new RegExp(re, 'i'); Ext.each(Ext.ComponentQuery.query('tab'), (t) => { if (t.isVisible() && r.test(t.text || '')) { t.el.dom.click(); } }); }, onglet.source);
        }
        await p.waitForFunction((c) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === c && x.rendered && x.isVisible())[0];
          return e && e.down('filtresmulti') && e.down('filtresmulti').rendered; }, classe, { timeout: 40000 });
        await p.waitForTimeout(1500);
        const etat = await p.evaluate((c) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === c && x.isVisible())[0], f = e.down('filtresmulti');
          const listes = Ext.Object.getValues(window.PrestigeAffichage.FILTRES_MULTIPLES[c]).map((s) => e.down(s));
          return { axes: f.axes.length, masquees: listes.every((l) => l && l.isHidden()) }; }, classe);
        ok(nom + ' : filtre multiple à la place des listes (' + nbAxes + ' axe(s))', etat.axes === nbAxes && etat.masquees, JSON.stringify(etat));
        const avant = requetes.length;
        await p.evaluate((a) => { const e = Ext.ComponentQuery.query('*').filter((x) => Ext.getClassName(x) === a.c && x.isVisible())[0], f = e.down('filtresmulti');
          f.setValeurs({ rayon: a.r });
          const vis = e.query('button').filter((x) => x.isVisible());
          const btn = vis.filter((x) => /^\s*rechercher\s*$/i.test(x.text || ''))[0]
            || vis.filter((x) => /recherch|actualis|lancer|filtrer|afficher/i.test(x.text || ''))[0];
          if (btn) { btn.el.dom.click(); } }, { c: classe, r: RAYONS });
        await p.waitForTimeout(4000);
        const liste = RAYONS.join(',');
        const vue = requetes.slice(avant).filter((r) => r.url.indexOf(morceau) >= 0 && (decodeURIComponent(r.url).indexOf(liste) >= 0 || decodeURIComponent(r.post).indexOf(liste) >= 0));
        ok(nom + ' : la recherche porte les 2 rayons ensemble', vue.length > 0, vue.length ? '' : requetes.slice(avant).map((r) => r.url.split('/api/')[1] || '').filter((u) => u).slice(0, 4).join(' ; '));
        if (vue.length && !vue[0].post) {
          const u = vue[0].url;
          const totaux = await p.evaluate(async (a0) => {
            /* periode ramenee sur des mois qui ont des ventes au banc (aout - debut octobre) */
            const url = new URL(a0.u, location.href);
            url.searchParams.forEach((v, k) => { if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
              url.searchParams.set(k, /end|fin|au$|to/i.test(k) ? '2026-10-06' : '2026-08-01'); } });
            const a = Object.assign({}, a0, { u: url.toString() });
            const t = async (url) => { const r = await fetch(url); const x = await r.text(); let j = null; try { j = JSON.parse(x); } catch (e) {}
              return { s: r.status, total: j && typeof j.total === 'number' ? j.total : null, ko: !j || j.success === false }; };
            const deux = await t(a.u), un = await t(a.u.split(encodeURIComponent(a.l)).join(a.r[0]).split(a.l).join(a.r[0])),
              autre = await t(a.u.split(encodeURIComponent(a.l)).join(a.r[1]).split(a.l).join(a.r[1]));
            return { deux, un, autre };
          }, { u, l: liste, r: RAYONS });
          ok(nom + ' : le serveur répond sans erreur', totaux.deux.s === 200 && !totaux.deux.ko, JSON.stringify(totaux.deux));
          if (totaux.deux.total !== null && totaux.un.total !== null) {
            ok(nom + ' : total(2 rayons) = total(rayon 1) + total(rayon 2)', totaux.deux.total === totaux.un.total + totaux.autre.total,
              totaux.deux.total + ' = ' + totaux.un.total + ' + ' + totaux.autre.total);
          }
        }
      } catch (e) {
        ok(nom + ' : parcours', false, e.message);
      }
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.slice(0, 3).join(' | '));
  } catch (e) {
    ok('Exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
