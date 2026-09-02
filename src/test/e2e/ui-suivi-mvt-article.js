/*
 * Test UI navigateur de l'ecran SUIVI MOUVEMENT ARTICLE : sur l'historique corrompu du client
 * (ligne decon qteFinale=204 en base au 20/08/2026), la grille "Detail de l'article" doit
 * afficher Stock=99 le 20/08 et une chaine 18 -> 11 -> 99 -> 92 coherente.
 *
 * Prerequis : WAR corrige deploye en local, base de TEST, produit detail 8835833D trouvable
 * dans la recherche, et le scenario du 204 injecte au prealable
 * (voir reproduction_204_suivi_mvt.sql). Login KGA3 / e2etest utilise ici — a adapter.
 * Execution : npm install playwright-core && node ui-suivi-mvt-article.js
 */
const { chromium } = require('playwright-core');
const results = [];
function ok(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 160) + ']' : ''));
}

(async () => {
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
    const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });

    await page.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await page.fill('#str_login', 'KGA3');
    await page.fill('#str_password', 'e2etest');
    await page.click('#login');
    await page.waitForURL('**/general/**', { timeout: 30000 });
    await page.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await page.waitForTimeout(3000);

    // ouvrir l'ecran suivi mouvement article
    await page.evaluate(() => {
        testextjs.app.getController('App').onRedirectTo('monitoringproduct', {});
    });
    await page.waitForFunction(() => Ext.ComponentQuery.query('monitoringproduct').length > 0, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    ok('ecran suivi mouvement article ouvert', true);

    // periode + produit, puis recherche (comme l'utilisateur)
    await page.evaluate(() => {
        Ext.ComponentQuery.query('monitoringproduct #dtStart')[0].setValue(new Date(2026, 7, 19));
        Ext.ComponentQuery.query('monitoringproduct #dtEnd')[0].setValue(new Date(2026, 7, 21));
        Ext.ComponentQuery.query('monitoringproduct #query')[0].setValue('8835833D');
        testextjs.app.getController('MvtArticleCtr').doSearch();
    });
    const rowOk = await page.waitForFunction(() => {
        const g = Ext.ComponentQuery.query('monitoringproduct gridpanel')[0];
        return g && g.getStore().getCount() > 0;
    }, null, { timeout: 15000 }).then(() => true).catch(() => false);
    ok('produit trouve dans la grille principale', rowOk);

    // ouvrir la fiche detail de l'article (fenetre "Detail de l'article")
    const cible = await page.evaluate(() => {
        const ctr = testextjs.app.getController('MvtArticleCtr');
        const st = Ext.ComponentQuery.query('monitoringproduct gridpanel')[0].getStore();
        let rec = null;
        st.each(r => { if (r.get('produitId') === '050404522400544') { rec = r; return false; } });
        if (!rec) { rec = st.getAt(0); }
        ctr.produitId = rec.get('produitId');
        ctr.buildDetail(rec);
        return rec.get('produitName');
    });
    console.log('   fiche ouverte sur : ' + cible);
    const jours = await page.waitForFunction(() => {
        // la fiche est un Ext.window.Window (titre "Détail de l'article ...") ; lire le store de sa grille
        const wins = Ext.ComponentQuery.query('window{isVisible()}');
        for (const w of wins) {
            if (!/Détail de l'article/.test(w.title || '')) { continue; }
            for (const g of w.query('gridpanel')) {
                const st = g.getStore();
                if (st && st.getCount() >= 3 && st.getAt(0) && ('dateOp' in st.getAt(0).data)) {
                    return st.getRange().map(r => ({
                        date: r.get('dateOp'), init: r.get('stockInit'), vente: r.get('qtyVente'),
                        decon: r.get('qtyDeconEntrant'), stock: r.get('stockFinal')
                    }));
                }
            }
        }
        return false;
    }, null, { timeout: 20000, polling: 500 }).then(h => h.jsonValue()).catch(() => null);

    ok('fiche detail chargee (3 journees)', !!jours, jours ? JSON.stringify(jours) : 'store vide');
    if (jours) {
        const j20 = jours.find(j => j.date === '20/08/2026');
        ok('20/08 affiche Stock=99 (204 en base neutralise)', j20 && j20.stock === 99 && j20.init === 11
                && j20.vente === 12 && j20.decon === 100, JSON.stringify(j20));
        const j21 = jours.find(j => j.date === '21/08/2026');
        ok('21/08 chaine coherente (init=99, stock=92)', j21 && j21.init === 99 && j21.stock === 92, JSON.stringify(j21));
    }

    await page.screenshot({ path: __dirname + '/ui-suivi-mvt.png' });
    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('\n== ' + (results.length - failed.length) + '/' + results.length + ' assertions OK');
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('ERREUR SCRIPT: ' + e); process.exit(2); });
