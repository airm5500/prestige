/*
 * Test E2E AU CLAVIER : on pilote l'ecran comme une caissiere — vraies frappes et vrais clics sur
 * les boites de dialogue, sans appeler les fonctions internes avec un etat deja propre. Scenario du
 * produit detail (stock vendable = 5, boite = 0) :
 *   1. saisir le CIP au clavier, choisir dans la liste, taper la quantite 5, ENTREE (ajout au panier)
 *   2. cliquer la cellule quantite du panier, taper 6, ENTREE
 *   3. verifier le popup "Stock insuffisant", cliquer OK (vrai clic), grille revenue a 5, base = 5
 *   4. cas aux limites clavier : taper 0 dans la cellule -> le champ (minValue 1) ne laisse pas passer
 *
 * Prerequis : WAR deploye en local, base de TEST, caisse ouverte pour l'operateur, produit detail
 * 8835833D trouvable (ligne t_famille_grossiste), stock detail = 5 et boite parent = 0 avec
 * int_NUMBERDETAIL = 5. Login KGA3 / e2etest (a adapter).
 * Execution : npm install playwright-core && node ui-clavier-caisse-detail.js
 */
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const results = [];
function ok(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 150) + ']' : ''));
}
function baseQte(v) { return execSync("mariadb -N capitale -e \"SELECT int_QUANTITY FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID='" + v + "'\"").toString().trim(); }

async function cellSelector(page, dataIndex) {
    // id DOM de la cellule (1re ligne) pour la colonne dataIndex : vrai element cliquable
    return page.evaluate((di) => {
        let grid = null, rec = null;
        for (const g of Ext.ComponentQuery.query('doventemanager gridpanel')) {
            const s = g.getStore();
            if (s && s.getCount() > 0 && s.getAt(0).get('lgPREENREGISTREMENTDETAILID')) { grid = g; rec = s.getAt(0); break; }
        }
        if (!grid) { return null; }
        const col = grid.columns.find(c => c.dataIndex === di);
        const cell = grid.getView().getCell(rec, col);
        return cell && cell.dom ? '#' + cell.dom.id : (cell ? '#' + cell.id : null);
    }, dataIndex);
}
async function msgText(page) {
    return page.evaluate(() => { const b = Ext.ComponentQuery.query('messagebox{isVisible()}')[0]; return b ? b.el.dom.textContent : ''; });
}
async function okButtonSelector(page) {
    return page.evaluate(() => {
        const b = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
        if (!b) { return null; }
        const btn = b.down('button[itemId=ok]');
        return btn && btn.el ? '#' + btn.el.dom.id : null;
    });
}

(async () => {
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
    const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });

    // connexion au clavier
    await page.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await page.click('#str_login'); await page.keyboard.type('KGA3', { delay: 30 });
    await page.click('#str_password'); await page.keyboard.type('e2etest', { delay: 30 });
    await page.click('#login');
    await page.waitForURL('**/general/**', { timeout: 30000 });
    await page.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await page.waitForTimeout(3000);

    // ouvrir l'ecran de vente (navigation) puis fermer un eventuel popup caisse par un vrai clic
    await page.evaluate(() => testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} }));
    await page.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    let okSel = await okButtonSelector(page);
    if (okSel) { await page.click(okSel); await page.waitForTimeout(400); }

    // 1) saisir le CIP au clavier, choisir dans la liste (vrai clic), quantite 5, ENTREE
    const comboInput = await page.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0].inputEl.id);
    await page.click(comboInput);
    await page.keyboard.type('8835833D', { delay: 50 });
    await page.waitForSelector('.x-boundlist-item', { timeout: 15000 });
    await page.click('.x-boundlist-item');
    await page.waitForTimeout(600);
    const qtyInput = await page.evaluate(() => '#' + Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0].inputEl.id);
    await page.click(qtyInput);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('5', { delay: 60 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1800);
    const diag = await page.evaluate(() => {
        const c = testextjs.app.getController('VenteCtr');
        const box = Ext.ComponentQuery.query('messagebox{isVisible()}')[0];
        let grid = 0;
        for (const g of Ext.ComponentQuery.query('doventemanager gridpanel')) { const s = g.getStore(); if (s && s.getCount() > 0 && s.getAt(0).get('lgPREENREGISTREMENTDETAILID')) grid = s.getCount(); }
        return { current: c.current ? c.current.lgPREENREGISTREMENTID : null, popup: box ? box.el.dom.textContent.slice(0, 80) : '(aucun)', gridRows: grid };
    });
    console.log('   diag apres saisie 5 : ' + JSON.stringify(diag));
    const venteId = diag.current;
    ok('1) produit ajoute au panier (qte 5)', venteId && baseQte(venteId) === '5', 'base=' + (venteId ? baseQte(venteId) : '?'));
    require('fs').writeFileSync(__dirname + '/vente_clavier.txt', venteId || '');

    // 2) cliquer la cellule quantite du panier, taper 6, ENTREE
    const cellQD = await cellSelector(page, 'intQUANTITY');
    ok('2) cellule quantite du panier localisee', !!cellQD, cellQD || 'introuvable');
    await page.click(cellQD);
    await page.waitForTimeout(400);
    // l'editeur numberfield est ouvert et a le focus : selectionner tout et taper 6
    await page.keyboard.press('Control+A');
    await page.keyboard.type('6', { delay: 80 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);

    // 3) popup "Stock insuffisant" + vrai clic OK + grille revenue a 5
    const txt = await msgText(page);
    ok('3a) popup "Stock insuffisant" affiche', txt.indexOf('Stock insuffisant') !== -1, txt);
    okSel = await okButtonSelector(page);
    if (okSel) { await page.click(okSel); await page.waitForTimeout(600); }
    const grilleApres = await page.evaluate(() => {
        for (const g of Ext.ComponentQuery.query('doventemanager gridpanel')) { const s = g.getStore(); if (s && s.getCount() > 0 && s.getAt(0).get('lgPREENREGISTREMENTDETAILID')) return s.getAt(0).get('intQUANTITY'); }
    });
    ok('3b) grille revenue a 5 et base = 5', grilleApres === 5 && baseQte(venteId) === '5', 'grille=' + grilleApres + ' base=' + baseQte(venteId));

    // 4) cas aux limites clavier : taper 0 -> le champ minValue:1 ne valide pas 0
    const cellQD2 = await cellSelector(page, 'intQUANTITY');
    await page.click(cellQD2);
    await page.waitForTimeout(400);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('0', { delay: 80 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    const grille0 = await page.evaluate(() => {
        for (const g of Ext.ComponentQuery.query('doventemanager gridpanel')) { const s = g.getStore(); if (s && s.getCount() > 0 && s.getAt(0).get('lgPREENREGISTREMENTDETAILID')) return s.getAt(0).get('intQUANTITY'); }
    });
    // le popup residuel eventuel est ferme
    okSel = await okButtonSelector(page); if (okSel) { await page.click(okSel); }
    ok('4) saisie 0 refusee : la quantite reste >= 1', grille0 >= 1 && baseQte(venteId) === '5', 'grille=' + grille0 + ' base=' + baseQte(venteId));

    await page.screenshot({ path: __dirname + '/e2e-clavier.png' });
    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('\n== ' + (results.length - failed.length) + '/' + results.length + ' assertions OK');
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('ERREUR: ' + e); process.exit(2); });
