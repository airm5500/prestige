/*
 * Test UI navigateur de la refonte de l'ecran GESTION DES ARTICLES (famillemanager)
 * et de la fiche detail (detailArticle).
 *
 * Verifie que la refonte est en place ET que rien n'a ete perdu :
 *  - grille : colonne Etat abregee, colonne Stock unifiee (RAY + RES), emplacement
 *    sur une ligne, 4 icones d'action + menu "..." donnant acces aux autres actions ;
 *  - filtres : operateur/quantite de stock et "Effacer tous les filtres" dans la
 *    barre des filtres, filtre TVA toujours present ;
 *  - fiche : courbe des sorties sur 12 mois, boutons de courbe par annee et
 *    comparaison, sans perte des sections existantes.
 *
 * Prerequis : WAR deploye en local, base de TEST. Login KGA3 / e2etest.
 * Execution : node ui-fiche-article-refonte.js
 */
const { chromium } = require('playwright-core');
const results = [];
function ok(name, cond, detail) {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 200) + ']' : ''));
}

(async () => {
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
    const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
    const erreursJs = [];
    page.on('pageerror', e => erreursJs.push(String(e.message)));

    await page.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await page.fill('#str_login', 'KGA3');
    await page.fill('#str_password', 'e2etest');
    await page.click('#login');
    await page.waitForURL('**/general/**', { timeout: 30000 });
    await page.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await page.waitForTimeout(3000);

    // ---------- ouverture de l'ecran ----------
    await page.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Gestion des Articles', ''));
    const ecranOk = await page.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 20000 })
        .then(() => true).catch(() => false);
    ok('ecran Gestion des Articles ouvert', ecranOk);
    await page.waitForTimeout(1500);

    // ---------- colonnes ----------
    const cols = await page.evaluate(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        return g.columns.map(c => ({ txt: (c.text || '').replace(/<[^>]*>/g, ''), hidden: !!c.hidden, xtype: c.xtype, di: c.dataIndex }));
    });
    const entetes = cols.map(c => c.txt);
    ok('colonne "Etat" presente (Etat.cmde renomme)', entetes.some(t => t === 'État'), entetes.join(' | '));
    ok('colonne "Stock (RAY + RES)" presente', entetes.some(t => t.indexOf('Stock (RAY + RES)') >= 0));
    ok('anciennes colonnes RES / Stock total supprimees',
        !entetes.some(t => t === 'RES') && !entetes.some(t => t === 'Stock total'), entetes.join(' | '));
    ok('colonnes conservees : CIP, Designation, P.Vente, P.Achat, Seuil, Qte.Reap, Emplacement',
        ['CIP', 'Designation', 'P.Vente', 'P.Achat', 'Seuil', 'Qte.Reap', 'Emplacement'].every(h => entetes.indexOf(h) >= 0),
        entetes.join(' | '));
    const nbActions = cols.filter(c => c.xtype === 'actioncolumn').length;
    ok('4 icones d action + 1 menu = 5 colonnes d action (au lieu de 11)', nbActions === 5, 'trouve ' + nbActions);

    // ---------- filtres ----------
    const filtres = await page.evaluate(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        const barres = g.getDockedItems('toolbar[dock="top"]');
        return barres.map(b => b.items.items.map(i => (i.text || '') + '#' + (i.id || i.xtype)));
    });
    const barreFiltres = (filtres[1] || []).join(',');
    ok('filtre stock (operateur + quantite) dans la barre des filtres',
        barreFiltres.indexOf('#stock_operator') >= 0 && barreFiltres.indexOf('#stock_value') >= 0, barreFiltres);
    ok('filtre TVA toujours present', barreFiltres.indexOf('#lg_CODE_TVA_ID_FILTRE') >= 0);
    ok('"Effacer tous les filtres" dans la barre des filtres', barreFiltres.indexOf('Effacer tous les filtres') >= 0);
    ok('barre 1 ne contient plus les filtres (actions seules)',
        (filtres[0] || []).join(',').indexOf('#stock_operator') < 0);

    // ---------- recherche d un article ----------
    await page.evaluate(() => {
        Ext.getCmp('rechecher').setValue('OZEMPIC');
        Ext.ComponentQuery.query('famillemanager')[0].onRechClick();
    });
    const lignes = await page.waitForFunction(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        return g && g.getStore().getCount() > 0;
    }, null, { timeout: 40000 }).then(() => true).catch(() => false);
    ok('recherche : la grille se remplit', lignes);
    if (!lignes) { console.log('ARRET : aucune ligne, la suite depend de la grille'); await browser.close(); process.exit(1); }
    await page.waitForTimeout(1200);

    // ---------- apercu de l'article selectionne ----------
    await page.evaluate(() => Ext.ComponentQuery.query('famillemanager')[0].getSelectionModel().select(0));
    await page.waitForTimeout(3500);
    const ap = await page.evaluate(() => {
        const a = Ext.getCmp('apercu_fiche_article');
        if (!a) { return { present: false }; }
        const h = a.el ? a.el.dom.innerHTML : '';
        return {
            present: true, visible: a.isVisible(),
            points: (h.match(/<circle/g) || []).length,
            lots: (h.match(/vp-ap-lots li/g) || []).length || (h.indexOf('PÉREMPTIONS PROCHES') >= 0 ? 1 : 0),
            aLots: h.indexOf('remptions proches') >= 0 || h.indexOf('REMPTIONS PROCHES') >= 0,
            aVente: h.indexOf('re vente') >= 0,
            aEntree: h.indexOf('re entr') >= 0,
            puces: (h.match(/vp-ap-puce/g) || []).length
        };
    });
    ok('apercu affiche au clic sur une ligne', ap.present && ap.visible, JSON.stringify(ap));
    ok('courbe de consommation sur 13 mois (12 derniers + mois en cours)', ap.points === 13, 'points=' + ap.points);
    ok('reperes : derniere vente et derniere entree', ap.aVente && ap.aEntree, JSON.stringify(ap));
    ok('puces classe / TVA / contenance', ap.puces >= 1, 'puces=' + ap.puces);
    ok('section peremptions proches', ap.aLots, JSON.stringify(ap));

    // ---------- rendu de la cellule stock ----------
    const rendu = await page.evaluate(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        const rec = g.getStore().getAt(0);
        const col = g.columns.filter(c => c.itemId === 'stockUnifie')[0];
        const meta = {};
        const html = col.renderer(rec.get('int_NUMBER_AVAILABLE'), meta, rec);
        const rayon = parseInt(rec.get('int_NUMBER_AVAILABLE'), 10) || 0;
        const res = rec.get('bool_RESERVE') ? (parseInt(rec.get('int_STOCK_RESERVE'), 10) || 0) : 0;
        return { html: html, attendu: rayon + res, qtip: meta.tdAttr || '' };
    });
    ok('cellule stock : total affiche', rendu.html.indexOf('>' + rendu.attendu + '<') >= 0, rendu.html.replace(/<[^>]*>/g, ' '));
    ok('cellule stock : pastille RAY presente', rendu.html.indexOf('RAY ') >= 0);
    ok('cellule stock : info-bulle rayon + reserve', rendu.qtip.indexOf('Rayon') >= 0 && rendu.qtip.indexOf('serve') >= 0);

    // ---------- menu "..." ----------
    const menu = await page.evaluate(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        const view = g.getView();
        const faux = { getXY: function () { return [400, 300]; } };
        g.onAutresActions(view, 0, 0, null, faux);
        const m = Ext.ComponentQuery.query('menu').filter(x => x.isVisible());
        const textes = m.length ? m[m.length - 1].items.items.map(i => (i.text || '-')) : [];
        m.forEach(x => x.hide());
        return textes;
    });
    ok('menu "..." s ouvre', menu.length > 0, menu.join(' | '));
    ok('menu contient "Detail sur l article"', menu.some(t => t.indexOf('tail sur l') >= 0), menu.join(' | '));
    ok('menu contient "Voir les lots / peremptions"', menu.some(t => t.indexOf('lots') >= 0));
    ok('menu contient "Modifier la date de peremption"', menu.some(t => t.indexOf('date de p') >= 0));

    // ---------- fiche detail ----------
    const cip = await page.evaluate(() => {
        const g = Ext.ComponentQuery.query('famillemanager')[0];
        g.onDetailClick(g.getView(), 0);
        return g.getStore().getAt(0).get('int_CIP');
    });
    const ficheOk = await page.waitForFunction(() => Ext.getCmp('courbe_conso_detail') != null, null, { timeout: 25000 })
        .then(() => true).catch(() => false);
    ok('fiche detail ouverte (article ' + cip + ')', ficheOk);
    await page.waitForTimeout(4000);

    // sections existantes toujours la
    const sections = await page.evaluate(() => ({
        conso: !!Ext.getCmp('fieldset_conso_detail'),
        cmde: !!Ext.getCmp('infoconsorecu'),
        ventes: !!Ext.getCmp('infoventerealise'),
        gridConso: !!Ext.getCmp('gridpanelDetailID'),
        gridStat: !!Ext.getCmp('gridpanelStatVenteID'),
        peremption: !!Ext.getCmp('peremption_proche_detail'),
        qtedetail: !!Ext.getCmp('int_QTEDETAIL'),
        ean13: !!Ext.getCmp('int_EAN13'),
        remise: !!Ext.getCmp('str_CODE_REMISE'),
        q1: !!Ext.getCmp('int_Q1_SEUIL_REAPPRO')
    }));
    ok('sections existantes conservees (conso, commandes recues, ventes, grilles)',
        sections.conso && sections.cmde && sections.ventes && sections.gridConso && sections.gridStat, JSON.stringify(sections));
    ok('champs existants conserves (peremption proche, contenance, EAN13, code remise, Q1)',
        sections.peremption && sections.qtedetail && sections.ean13 && sections.remise && sections.q1, JSON.stringify(sections));

    // courbe des sorties
    const conso = await page.evaluate(() => {
        const c = Ext.getCmp('courbe_conso_detail');
        const h = c && c.el ? c.el.dom.innerHTML : '';
        return { svg: h.indexOf('<svg') >= 0, pts: (h.match(/<circle/g) || []).length, titre: h.indexOf('sorties') >= 0 };
    });
    ok('courbe des sorties tracee (SVG)', conso.svg, 'points=' + conso.pts);
    ok('courbe des sorties : 12 mois', conso.pts === 12, 'points=' + conso.pts);

    // boutons de courbe des ventes
    const btns = await page.evaluate(() => {
        const c = Ext.getCmp('ventes_boutons_detail');
        return c ? c.items.items.map(b => b.text) : [];
    });
    ok('boutons de courbe par annee presents', btns.length >= 2, btns.join(' | '));
    ok('bouton de comparaison present', btns.some(t => /Comparer/.test(t)), btns.join(' | '));
    ok('bouton Masquer present', btns.some(t => /Masquer/.test(t)));

    // affichage d une annee puis comparaison
    const uneAnnee = await page.evaluate(() => {
        const c = Ext.getCmp('ventes_boutons_detail');
        c.items.items[0].handler();
        const v = Ext.getCmp('courbe_ventes_detail');
        const h = v.el ? v.el.dom.innerHTML : '';
        return { visible: v.isVisible(), paths: (h.match(/<path/g) || []).length, labels: (h.match(/<text/g) || []).length };
    });
    ok('clic sur une annee : la courbe s affiche', uneAnnee.visible && uneAnnee.paths >= 1, JSON.stringify(uneAnnee));

    const compare = await page.evaluate(() => {
        const c = Ext.getCmp('ventes_boutons_detail');
        c.items.items.filter(b => /Comparer/.test(b.text))[0].handler();
        const v = Ext.getCmp('courbe_ventes_detail');
        const h = v.el ? v.el.dom.innerHTML : '';
        return { visible: v.isVisible(), courbes: (h.match(/stroke-width="2\.4"/g) || []).length };
    });
    ok('comparaison : plusieurs courbes tracees', compare.visible && compare.courbes >= 2, JSON.stringify(compare));

    const masque = await page.evaluate(() => {
        const c = Ext.getCmp('ventes_boutons_detail');
        c.items.items.filter(b => /Masquer/.test(b.text))[0].handler();
        return !Ext.getCmp('courbe_ventes_detail').isVisible();
    });
    ok('bouton Masquer : retour au tableau seul', masque);

    const deborde = await page.evaluate(() => {
        const res = [];
        document.querySelectorAll('.x-window *').forEach(el => {
            if (el.scrollWidth > el.clientWidth + 2) {
                res.push((el.className || '').toString().slice(0, 50));
            }
        });
        return res;
    });
    ok('fiche detail : aucun defilement horizontal', deborde.length === 0, deborde.join(' | '));

    ok('aucune erreur JavaScript pendant le parcours', erreursJs.length === 0, erreursJs.join(' || '));

    await browser.close();
    const echecs = results.filter(r => !r.pass);
    console.log('\n===== ' + (results.length - echecs.length) + '/' + results.length + ' PASS =====');
    if (echecs.length) { console.log('ECHECS : ' + echecs.map(r => r.name).join(' ; ')); }
    process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error('ERREUR FATALE', e); process.exit(2); });
