/*
 * Tests UI navigateur (Playwright) de la caisse — deconditionnement des produits detail.
 *
 * Verifie dans un vrai Chromium, en pilotant l'ecran de vente comme une caissiere (formulaire de connexion,
 * menu SERVICE CLIENT > Ventes, bouton « Nouvelle vente », saisie au clavier, clics sur les boutons des messages) :
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
 * CIP est celui de l'article DETAIL (ex. 8423349D), pas celui de la boite.
 * Pour UI-3 : creer une vente en cours du produit puis mettre la boite a 0, et passer sa reference
 * (str_REF, colonne Reference de l'ecran Ventes) dans VENTE_UI3 (le test est saute si la variable est absente).
 * Les ventes creees par UI-1 et UI-2 sont retirees a la fin ; les stocks sont a remettre par l'appelant.
 *
 * Execution :
 *   npm install playwright-core
 *   BASE=http://localhost:8080/prestige LOGIN=... PASSWORD=... CIP=8835833D QTE_VENDABLE=100 \
 *   [VENTE_UI3=<reference de la vente>] node ui-caisse-deconditionnement.js
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('./outils/poste');
const { connexion, ouvrirMenu, cliquer, attendreMessage, repondre, texteMessage } = require('./outils/vues');

const LOGIN = process.env.LOGIN;
const PASSWORD = process.env.PASSWORD;
const CIP = process.env.CIP;
const QTE_VENDABLE = parseInt(process.env.QTE_VENDABLE || '100', 10);
const VENTE_UI3 = process.env.VENTE_UI3;
const CHROMIUM = ENV_E2E.CHROMIUM;
const results = [];
const ventesCreees = [];

function ok(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 140) + ']' : ''));
}

async function fermerMessagesResiduels(page) {
    for (let i = 0; i < 4 && await texteMessage(page); i++) {
        for (const b of ['ok', 'no', 'cancel']) {
            if (await page.evaluate((b) => Ext.ComponentQuery.query('messagebox{isVisible()} button[itemId=' + b + ']').some((x) => x.isVisible(true)), b)) {
                await repondre(page, b);
                break;
            }
        }
        await page.waitForTimeout(300);
    }
}

/* menu SERVICE CLIENT > Ventes, puis bouton « Nouvelle vente » */
async function nouvelleVente(page) {
    await ouvrirMenu(page, 'SERVICE CLIENT', 'Ventes');
    await page.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((b) => b.isVisible(true)), null, { timeout: 30000 });
    await cliquer(page, 'cloturerventemanager #addBtn');
    await page.waitForFunction(() => Ext.ComponentQuery.query('doventemanager #contenu [xtype=fieldcontainer] #produit').some((c) => c.isVisible(true)),
            null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await fermerMessagesResiduels(page);
}

/* frappe du CIP dans la recherche produit, choix dans la liste, frappe de la quantite puis Entree */
async function saisirProduitEtQuantite(page, cip, qte) {
    await cliquer(page, 'doventemanager #contenu [xtype=fieldcontainer] #produit', { force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(cip, { delay: 60 });
    const choix = page.locator('.x-boundlist-item').filter({ visible: true }).first();
    await choix.waitFor({ timeout: 15000 });
    await choix.click();
    await page.waitForTimeout(700);
    await cliquer(page, 'doventemanager #contenu [xtype=fieldcontainer] #qtyField');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(String(qte), { delay: 30 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
}

const venteCourante = (page) => page.evaluate(() => {
    const c = testextjs.app.getController('VenteCtr').current;
    return c ? { id: c.lgPREENREGISTREMENTID, prix: parseInt(c.intPRICE, 10) || 0 } : null;
});

(async () => {
    if (!LOGIN || !PASSWORD || !CIP) {
        console.error('Variables requises : LOGIN, PASSWORD, CIP (et BASE, QTE_VENDABLE, VENTE_UI3 optionnelles)');
        process.exit(2);
    }
    const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    try {
        await connexion(page, LOGIN, PASSWORD);
        ok('login formulaire -> application chargee', true);

        // UI-1 : vendable exact accepte via le message de deconditionnement
        await nouvelleVente(page);
        await saisirProduitEtQuantite(page, CIP, QTE_VENDABLE);
        let t = await attendreMessage(page, 'Voulez-vous faire un déconditionnement', 10000);
        ok('UI-1a message de deconditionnement propose', !!t, t || await texteMessage(page));
        if (t) {
            await repondre(page, 'yes');
            const ligne = page.locator('.x-grid-row').filter({ visible: true, hasText: CIP }).first();
            const affichee = await ligne.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
            const v = await venteCourante(page);
            if (v && v.id) { ventesCreees.push(v.id); }
            ok('UI-1b vente du vendable exact ACCEPTEE apres "Oui" (ligne affichee dans la vente)', affichee && v && v.prix > 0,
                    'ligne ' + affichee + ', montant ' + (v && v.prix));
        }

        // UI-2 : vendable + 1 refuse
        await nouvelleVente(page);
        await saisirProduitEtQuantite(page, CIP, QTE_VENDABLE + 1);
        t = await attendreMessage(page, 'Voulez-vous faire un déconditionnement', 10000);
        ok('UI-2a message de deconditionnement propose', !!t, t || await texteMessage(page));
        if (t) {
            await repondre(page, 'yes');
            const refus = await attendreMessage(page, 'Le stock est insuffisant', 10000);
            ok('UI-2b vente au-dela du vendable REFUSEE', !!refus, refus);
            if (refus) { await repondre(page, 'ok'); }
        }
        const v2 = await venteCourante(page);
        if (v2 && v2.id && ventesCreees.indexOf(v2.id) < 0) { ventesCreees.push(v2.id); }

        // UI-3 : avertissement a la reprise du panier (menu Ventes, recherche, bouton Modifier de la ligne)
        if (VENTE_UI3) {
            await ouvrirMenu(page, 'SERVICE CLIENT', 'Ventes');
            await page.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #query').some((c) => c.isVisible(true)), null, { timeout: 30000 });
            await cliquer(page, 'cloturerventemanager #query');
            await page.keyboard.type(VENTE_UI3, { delay: 30 });
            await cliquer(page, 'cloturerventemanager #rechercher');
            const ligne = page.locator('.x-grid-row').filter({ visible: true, hasText: VENTE_UI3 }).first();
            await ligne.waitFor({ timeout: 15000 });
            await ligne.locator('.act-modifier').click();
            t = await attendreMessage(page, 'Stock insuffisant pour', 15000);
            ok('UI-3 avertissement a la reprise du panier', !!t, t || 'aucun avertissement');
            if (t) { await repondre(page, 'ok'); }
        } else {
            console.log('SKIP  UI-3 (VENTE_UI3 non fournie)');
        }
    } catch (e) {
        ok('Parcours sans exception', false, e.stack);
    } finally {
        // retrait des ventes de l'essai (meme route que la suppression de l'ecran Ventes)
        for (const id of ventesCreees) {
            await page.evaluate((id) => fetch('../api/v1/ventestats/remove/' + id, { method: 'POST' }).then((r) => r.status), id).catch(() => 0);
        }
        await browser.close();
    }
    const failed = results.filter(r => !r.pass);
    console.log('\n== ' + (results.length - failed.length) + '/' + results.length + ' assertions OK');
    process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('ERREUR SCRIPT: ' + e); process.exit(2); });
