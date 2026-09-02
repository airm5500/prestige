/*
 * Tests UI navigateur (Playwright) de la caisse — deconditionnement des produits detail.
 *
 * Verifie dans un vrai Chromium, en pilotant l'ecran de vente comme une caissiere :
 *  UI-1  vendre EXACTEMENT le stock vendable (rayon 0 + 1 boite de N details -> N) passe par le
 *        popup "Voulez-vous faire un deconditionnement ?" et est ACCEPTE apres "Oui"
 *        (non-regression du "<" strict qui refusait de vendre le dernier detail disponible) ;
 *  UI-2  N+1 est refuse par le popup "Le stock est insuffisant" ;
 *  UI-3  (optionnel) reprise d'un panier dont la boite a disparu entre-temps -> avertissement
 *        immediat "Stock insuffisant pour ..." a l'ouverture (controle-detail).
 *
 * Prerequis : WAR deploye sur un Payara local, base de TEST (jamais la production), un produit
 * detail trouvable par la recherche caisse (ligne t_famille_grossiste), stocks poses AVANT :
 *   detail : int_NUMBER_AVAILABLE = 0 ; boite parent : 1 (int_NUMBERDETAIL = QTE_VENDABLE).
 * Pour UI-3 : creer une vente en cours du produit puis mettre la boite a 0, et passer son id
 * dans VENTE_UI3 (le test est saute si la variable est absente).
 *
 * Execution :
 *   npm install playwright-core
 *   BASE=http://localhost:8080/prestige LOGIN=... PASSWORD=... CIP=8835833D QTE_VENDABLE=100 \
 *   [VENTE_UI3=<lgPREENREGISTREMENTID>] node ui-caisse-deconditionnement.js
 */
const { chromium } = require('playwright-core');

const BASE = process.env.BASE || 'http://localhost:8080/prestige';
const LOGIN = process.env.LOGIN;
const PASSWORD = process.env.PASSWORD;
const CIP = process.env.CIP;
const QTE_VENDABLE = parseInt(process.env.QTE_VENDABLE || '100', 10);
const VENTE_UI3 = process.env.VENTE_UI3;
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const results = [];

function ok(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 140) + ']' : ''));
}

async function visibleMsgBoxText(page) {
    return page.evaluate(() => {
        const boxes = Ext.ComponentQuery.query('messagebox{isVisible()}');
        return boxes.length ? boxes.map(b => (b.el && b.el.dom ? b.el.dom.textContent : '')).join(' | ') : '';
    });
}

async function clickMsgBoxButton(page, itemId) {
    return page.evaluate((itemId) => {
        const boxes = Ext.ComponentQuery.query('messagebox{isVisible()}');
        for (const b of boxes) {
            const btn = b.down('button[itemId=' + itemId + ']');
            if (btn && btn.isVisible()) { btn.el.dom.click(); return true; }
        }
        return false;
    }, itemId);
}

async function waitForMsgBoxContaining(page, text, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 10000);
    while (Date.now() < deadline) {
        const t = await visibleMsgBoxText(page);
        if (t && t.indexOf(text) !== -1) { return t; }
        await page.waitForTimeout(200);
    }
    return null;
}

async function fermerPopupsResiduels(page) {
    for (let i = 0; i < 4; i++) {
        const closed = await page.evaluate(() => {
            const boxes = Ext.ComponentQuery.query('messagebox{isVisible()}');
            for (const b of boxes) {
                for (const id of ['ok', 'no', 'cancel', 'yes']) {
                    const btn = b.down('button[itemId=' + id + ']');
                    if (btn && btn.isVisible()) { btn.el.dom.click(); return true; }
                }
                b.hide();
                return true;
            }
            return false;
        });
        if (!closed) { break; }
        await page.waitForTimeout(300);
    }
}

async function openCaisseVno(page) {
    await page.evaluate(() => {
        testextjs.app.getController('App').onRedirectTo('doventemanager', { isEdit: false, record: {} });
    });
    await page.waitForFunction(() =>
        Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').length > 0,
            null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    await fermerPopupsResiduels(page);
}

async function selectProduitEtQuantite(page, cip, qte) {
    // saisie reelle dans le combo produit, choix dans la liste, valeur posee par l'API Ext
    // (page.fill ne declenche pas checkChange), puis ENTREE reelle sur le champ quantite
    const comboInputId = await page.evaluate(() => {
        const c = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit')[0];
        c.setValue('');
        return c.inputEl.id;
    });
    await page.click('#' + comboInputId, { force: true });
    await page.type('#' + comboInputId, cip, { delay: 60 });
    await page.waitForSelector('.x-boundlist-item', { timeout: 15000 });
    await page.click('.x-boundlist-item', { force: true });
    await page.waitForTimeout(700);
    const qtyInputId = await page.evaluate((q) => {
        const f = Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #qtyField')[0];
        f.setValue(q);
        return f.inputEl.id;
    }, qte);
    await page.press('#' + qtyInputId, 'Enter');
    await page.waitForTimeout(500);
}

(async () => {
    if (!LOGIN || !PASSWORD || !CIP) {
        console.error('Variables requises : LOGIN, PASSWORD, CIP (et BASE, QTE_VENDABLE, VENTE_UI3 optionnelles)');
        process.exit(2);
    }
    const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

    await page.goto(BASE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await page.fill('#str_login', LOGIN);
    await page.fill('#str_password', PASSWORD);
    await page.click('#login');
    await page.waitForURL('**/general/**', { timeout: 30000 });
    await page.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    ok('login formulaire -> application chargee', true);

    // UI-1 : vendable exact accepte via le popup decon
    await openCaisseVno(page);
    await selectProduitEtQuantite(page, CIP, QTE_VENDABLE);
    let t = await waitForMsgBoxContaining(page, 'Voulez-vous faire un déconditionnement', 10000);
    ok('UI-1a popup deconditionnement propose', !!t);
    if (t) {
        await clickMsgBoxButton(page, 'yes');
        const added = await page.waitForFunction((attendu) => {
            const ctr = testextjs.app.getController('VenteCtr');
            return ctr.current && parseInt(ctr.current.intPRICE, 10) > 0;
        }, QTE_VENDABLE, { timeout: 15000 }).then(() => true).catch(() => false);
        ok('UI-1b vente du vendable exact ACCEPTEE apres "Oui"', added);
    }

    // UI-2 : vendable + 1 refuse
    await openCaisseVno(page);
    await selectProduitEtQuantite(page, CIP, QTE_VENDABLE + 1);
    t = await waitForMsgBoxContaining(page, 'Voulez-vous faire un déconditionnement', 10000);
    ok('UI-2a popup deconditionnement propose', !!t);
    if (t) {
        await clickMsgBoxButton(page, 'yes');
        const refus = await waitForMsgBoxContaining(page, 'Le stock est insuffisant', 10000);
        ok('UI-2b vente au-dela du vendable REFUSEE', !!refus, refus);
        if (refus) { await clickMsgBoxButton(page, 'ok'); }
    }

    // UI-3 : avertissement a la reprise du panier (si une vente de test est fournie)
    if (VENTE_UI3) {
        await page.evaluate((venteId) => {
            testextjs.app.getController('App').onRedirectTo('doventemanager',
                    { isEdit: true, categorie: 'VENTE', record: { lgPREENREGISTREMENTID: venteId } });
        }, VENTE_UI3);
        t = await waitForMsgBoxContaining(page, 'Stock insuffisant pour', 15000);
        ok('UI-3 avertissement a la reprise du panier', !!t, t || 'aucun avertissement');
        if (t) { await clickMsgBoxButton(page, 'ok'); }
    } else {
        console.log('SKIP  UI-3 (VENTE_UI3 non fournie)');
    }

    await browser.close();
    const failed = results.filter(r => !r.pass);
    console.log('\n== ' + (results.length - failed.length) + '/' + results.length + ' assertions OK');
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('ERREUR SCRIPT: ' + e); process.exit(2); });
