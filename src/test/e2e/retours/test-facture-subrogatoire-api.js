/* FACTURES SUBROGATOIRES PASSEES EN API (demande de l'officine du 05/10).
 *
 * Les pages JSP sont conservees : le test les interroge avec les memes parametres que l'API et compare les reponses
 * valeur par valeur (memes ventes, meme ordre, memes champs, memes formats, meme detail depliable, meme total), sur
 * plusieurs cas : periode longue page 1, page 2 et derniere page, recherche, tiers payant, plage horaire, periode vide.
 *
 * Puis, a l'ecran : la liste se charge par l'API, la pagination et les totaux marchent, et « Imprimer » ouvre le releve
 * en PDF dans un onglet (inline), avec les memes ventes que la liste.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

/* periodes calculees depuis aujourd'hui (et non figees) : P = les deux mois precedents, M = le mois precedent */
const [P_DEB, P_FIN, M_DEB, M_FIN, M_FIN_EXCL, J10] = q("SELECT CONCAT_WS('|',"
  + " DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01'), LAST_DAY(CURDATE() - INTERVAL 1 MONTH),"
  + " DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01'), LAST_DAY(CURDATE() - INTERVAL 1 MONTH),"
  + " DATE_FORMAT(CURDATE(), '%Y-%m-01'), DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-10'))").split('|');
const date = (iso) => { const [a, m, j] = iso.split('-').map(Number); return [a, m - 1, j]; };

(async () => {
  const tp = q("SELECT lg_TIERS_PAYANT_ID FROM v_facture_subrogatoire WHERE dt_UPDATED>='" + M_DEB + "' AND dt_UPDATED<'" + M_FIN_EXCL + "'"
    + " GROUP BY lg_TIERS_PAYANT_ID ORDER BY COUNT(*) DESC LIMIT 1");
  const ref = q("SELECT str_REF FROM v_facture_subrogatoire WHERE dt_UPDATED>='" + J10 + "' AND dt_UPDATED<'" + J10 + "' + INTERVAL 1 DAY AND int_PRICE>0 LIMIT 1");
  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1600, height: 950 } });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    const lire = (url) => p.evaluate(async (url) => { const t = (await (await fetch(url)).text()).replace(/<!--[\s\S]*?-->/g, '').trim();
      return JSON.parse(t.replace(/^\(/, '').replace(/\)$/, '')); }, url);
    /* Taille de page de la JSP (jdom.int_size_pagination) : l'API recoit la meme. */
    const base = 'dt_Date_Debut=' + P_DEB + '&dt_Date_Fin=' + P_FIN + '&search_value=&lg_TIERS_PAYANT_ID=&h_debut=&h_fin=';
    const mois = 'dt_Date_Debut=' + M_DEB + '&dt_Date_Fin=' + M_FIN;
    const jsp0 = await lire('../webservices/sm_user/journalvente/ws_facture_subrogatoire.jsp?' + base + '&start=0&limit=20');
    const taille = jsp0.results.length;
    const total = parseInt(jsp0.total, 10);
    ok('Référence JSP : une période longue avec des ventes', total > 100 && taille > 0, 'total ' + total + ', page ' + taille);
    const cas = [
      ['Période longue, page 1', base + '&start=0'],
      ['Période longue, page 2', base + '&start=' + taille],
      ['Période longue, dernière page', base + '&start=' + (Math.floor((total - 1) / taille) * taille)],
      ['Recherche par référence', mois + '&search_value=' + encodeURIComponent(ref) + '&lg_TIERS_PAYANT_ID=&h_debut=&h_fin=&start=0'],
      ['Recherche par début de nom', mois + '&search_value=K&lg_TIERS_PAYANT_ID=&h_debut=&h_fin=&start=0'],
      ['Tiers payant', mois + '&search_value=&lg_TIERS_PAYANT_ID=' + tp + '&h_debut=&h_fin=&start=0'],
      ['Plage horaire 08:00-12:30', mois + '&search_value=&lg_TIERS_PAYANT_ID=&h_debut=08:00&h_fin=12:30&start=0'],
      ['Période sans vente', 'dt_Date_Debut=2020-01-01&dt_Date_Fin=2020-01-02&search_value=&lg_TIERS_PAYANT_ID=&h_debut=&h_fin=&start=0']
    ];
    for (const [nom, params] of cas) {
      const jsp = await lire('../webservices/sm_user/journalvente/ws_facture_subrogatoire.jsp?' + params + '&limit=' + taille);
      const api = await lire('../api/v1/facture-subrogatoire/liste?' + params + '&limit=' + taille);
      const egal = JSON.stringify(jsp.results) === JSON.stringify(api.results) && parseInt(jsp.total, 10) === api.total;
      let ecart = '';
      if (!egal) {
        const i = jsp.results.findIndex((r, k) => JSON.stringify(r) !== JSON.stringify(api.results[k]));
        ecart = 'total ' + jsp.total + '/' + api.total + ' ; 1er écart #' + i + ' JSP ' + JSON.stringify(jsp.results[i]) + ' API ' + JSON.stringify(api.results[i]);
      }
      ok('JSP = API : ' + nom + ' (' + api.results.length + ' lignes / ' + api.total + ')', egal, ecart);
    }

    /* A l'ecran */
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const urls = [];
    p.on('request', (r) => { if (/facture-subrogatoire|ws_facture_subrogatoire/.test(r.url())) { urls.push(r.url()); } });
    await p.evaluate(() => { testextjs.app.getController('App').onLoadNewComponent('facturesubrogatoire', 'Factures subrogatoires', ''); });
    /* le chargement initial de l'ecran (journee en cours) doit etre termine avant de changer les dates, sinon il
       arrive apres la recherche et l'ecrase */
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('facturesubrogatoire')[0]; return g && g.getStore() && g.getStore().lastOptions && !g.getStore().isLoading() && Ext.getCmp('dt_debut_journal'); }, null, { timeout: 60000 });
    await p.evaluate(([d, f]) => { Ext.getCmp('dt_debut_journal').setValue(new Date(d[0], d[1], d[2])); Ext.getCmp('dt_fin_journal').setValue(new Date(f[0], f[1], f[2]));
      Ext.ComponentQuery.query('facturesubrogatoire')[0].onRechClick(); }, [date(P_DEB), date(P_FIN)]);
    await p.waitForTimeout(600);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('facturesubrogatoire')[0]; return !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    const e1 = await p.evaluate(() => { const g = Ext.ComponentQuery.query('facturesubrogatoire')[0], st = g.getStore();
      let net = 0; st.each((r) => { net += r.get('VENTE_NET'); });
      return { n: st.getCount(), total: st.getTotalCount(), net, affiche: Ext.getCmp('VENTE_NET').getValue(), ref: st.getAt(0).get('str_REF') }; });
    ok('Écran : la liste se charge par l\'API (aucun appel à la JSP)', urls.length > 0 && urls.every((u) => /api\/v1\/facture-subrogatoire\/liste/.test(u)), urls.slice(-2).join(' | '));
    /* La JSP rendait toujours sa propre taille de page (jdom.int_size_pagination = 50) quelle que soit la demande de
       l'ecran (20) : la « page 2 » de l'ecran (start=20) retombait sur la page 1 de la JSP. L'API respecte les 20. */
    ok('Écran : 20 lignes par page, même total et même ordre que la JSP', e1.total === total && e1.n === 20 && e1.ref === jsp0.results[0].str_REF, JSON.stringify(e1));
    ok('Écran : total net de la page recalculé', Number(e1.affiche) === e1.net && e1.net > 0, JSON.stringify(e1));
    await p.evaluate(() => { Ext.ComponentQuery.query('facturesubrogatoire')[0].down('pagingtoolbar').moveNext(); });
    await p.waitForTimeout(600);
    await p.waitForFunction(() => !Ext.ComponentQuery.query('facturesubrogatoire')[0].getStore().isLoading(), null, { timeout: 60000 });
    const e2 = await p.evaluate(() => { const st = Ext.ComponentQuery.query('facturesubrogatoire')[0].getStore(); return { page: st.currentPage, ref: st.getAt(0).get('str_REF') }; });
    /* 21e vente de la JSP : lue a start=20 (la taille de page de la JSP depend de la configuration du site) */
    const vingtEtUnieme = (await lire('../webservices/sm_user/journalvente/ws_facture_subrogatoire.jsp?' + base + '&start=20&limit=20')).results[0].str_REF;
    ok('Écran : la page 2 commence à la 21e vente de la JSP (avant : retour sur la page 1)', e2.page === 2 && e2.ref === vingtEtUnieme, JSON.stringify(e2) + ' attendu ' + vingtEtUnieme);
    /* Le detail depliable (tiers payants) est rendu comme avant. */
    const det = await p.evaluate(() => { const st = Ext.ComponentQuery.query('facturesubrogatoire')[0].getStore(); return st.getAt(0).get('str_FAMILLE_ITEM'); });
    ok('Écran : détail des tiers payants présent', /Tiers payant/.test(det), det.slice(0, 120));

    /* Impression : PDF dans un onglet */
    const urlPdf = await p.evaluate(() => { let u = null; const o = window.open; window.open = (x) => { u = x; return null; };
      try { Ext.ComponentQuery.query('facturesubrogatoire')[0].onPdfListVenteClick(); } finally { window.open = o; } return u; });
    ok('Imprimer ouvre un onglet sur l\'API', urlPdf.indexOf('api/v1/facture-subrogatoire/pdf?dt_Date_Debut=' + P_DEB + '&dt_Date_Fin=' + P_FIN) >= 0, urlPdf);
    const pdf = await p.evaluate(async (u) => { const x = await fetch(u); const t = new Uint8Array(await x.arrayBuffer());
      return { type: x.headers.get('content-type'), dispo: x.headers.get('content-disposition'), debut: String.fromCharCode.apply(null, t.slice(0, 5)), taille: t.length }; },
      '../api/v1/facture-subrogatoire/pdf?' + base);
    ok('PDF inline généré (relevé des ventes à crédit)', /pdf/.test(pdf.type) && /^inline/.test(pdf.dispo || '') && pdf.debut === '%PDF-' && pdf.taille > 5000, JSON.stringify(pdf));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.message);
  } finally {
    await b.close();
    const ko = res.filter((r) => !r.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
