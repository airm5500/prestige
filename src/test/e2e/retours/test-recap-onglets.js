/* Rapport activite, proposition A retenue : cartes fixes en haut, onglets Achats / Credits accordes /
 * Reglements TP en bas, chaque onglet avec son total dans le titre et son bouton d'impression (PDF servi en
 * flux dans l'onglet ouvert par le clic). Le parcours est joue a l'ecran : recherche, clic sur les onglets,
 * clic sur les boutons imprimer. Rien n'est ecrit en base. */
const { chromium } = require('playwright-core');
const fs = require('fs');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 320) + ']' : '')); }
const TMP = '/tmp/recap-a'; fs.mkdirSync(TMP, { recursive: true });

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'KGA3'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 30000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('recap', {}));
    await p.waitForFunction(() => Ext.ComponentQuery.query('recap #ongletsRecap').length > 0, null, { timeout: 20000 });
    await p.waitForTimeout(4000);

    /* structure : cartes fixes + onglets qui remplissent le reste, sans defilement global */
    const s = await p.evaluate(() => {
      const recap = Ext.ComponentQuery.query('recap')[0], t = Ext.ComponentQuery.query('recap #ongletsRecap')[0];
      const cartes = Ext.getCmp('panelCa').up('fieldset');
      return { onglets: t.items.getCount(), titres: t.items.getRange().map(x => x.title), cartes: cartes.getHeight(),
        basOnglets: t.getEl().getBottom(), basEcran: recap.getEl().getBottom(), hauteurOnglets: t.getHeight(),
        defile: recap.body.dom.scrollHeight - recap.body.dom.clientHeight, actif: t.getActiveTab().itemId };
    });
    ok('Trois onglets Achats / Credits accordes / Reglements TP', s.onglets === 3 && /ACHATS/.test(s.titres[0]) && /CREDITS/.test(s.titres[1]) && /REGLEMENTS/.test(s.titres[2]), JSON.stringify(s.titres));
    ok('Les cartes gardent leur hauteur fixe (280)', s.cartes === 280, s.cartes);
    ok('Les onglets remplissent le bas de l ecran sans defilement global', s.hauteurOnglets >= 250 && s.basOnglets <= s.basEcran && s.defile <= 2, JSON.stringify(s));
    ok('L onglet Achats est ouvert par defaut', s.actif === 'ongletAchats', s.actif);

    /* recherche sur une periode : les titres annoncent leurs totaux */
    await p.evaluate(() => { Ext.ComponentQuery.query('recap #dtStart')[0].setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -30)); });
    await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('recap #rechercher')[0].id));
    await p.waitForTimeout(5000);
    const titres = await p.evaluate(() => Ext.ComponentQuery.query('recap #ongletsRecap')[0].items.getRange().map(x => x.title.replace(/<[^>]+>/g, '')));
    ok('Titre Achats : groupes et total TTC', /ACHATS \d+ groupe\(s\) · [\d ,]+ TTC/.test(titres[0]), titres[0]);
    ok('Titre Credits : bons et montant', /CREDITS ACCORDES [\d ,]+ bon\(s\) · [\d ,]+/.test(titres[1]), titres[1]);
    ok('Titre Reglements TP : nombre de factures', /REGLEMENTS TP \d+ facture\(s\)/.test(titres[2]), titres[2]);
    await p.screenshot({ path: TMP + '/e2e-achats.png' });

    /* clic reel sur les onglets : la grille de l onglet prend toute la hauteur */
    const cliquerOnglet = async (i) => { await p.click('#' + await p.evaluate((k) => Ext.ComponentQuery.query('recap #ongletsRecap')[0].getTabBar().items.getAt(k).id, i)); await p.waitForTimeout(800); };
    await cliquerOnglet(1);
    const cred = await p.evaluate(() => { const g = Ext.ComponentQuery.query('recap #creditaccorde')[0]; const t = g.up('tabpanel'); return { actif: t.getActiveTab().itemId, visible: g.isVisible(true), haut: g.getHeight(), conteneur: t.getActiveTab().getHeight(), champ: !!Ext.ComponentQuery.query('recap #query')[0].isVisible(true), bouton: !!Ext.ComponentQuery.query('recap #imprimerCredits')[0].isVisible(true), totaux: !!Ext.ComponentQuery.query('recap #totalnb')[0].isVisible(true) }; });
    ok('Onglet Credits : grille pleine hauteur, recherche, totaux et bouton imprimer', cred.actif === 'ongletCredits' && cred.visible && cred.haut >= cred.conteneur - 4 && cred.champ && cred.bouton && cred.totaux, JSON.stringify(cred));
    await cliquerOnglet(2);
    const regl = await p.evaluate(() => { const g = Ext.ComponentQuery.query('recap #reglementGrid')[0]; return { visible: g.isVisible(true), champ: Ext.ComponentQuery.query('recap #queryRgl')[0].isVisible(true), bouton: Ext.ComponentQuery.query('recap #imprimerReglements')[0].isVisible(true) }; });
    ok('Onglet Reglements TP : grille, recherche et bouton imprimer', regl.visible && regl.champ && regl.bouton, JSON.stringify(regl));
    await p.screenshot({ path: TMP + '/e2e-reglements.png' });

    /* impression par onglet : un clic ouvre le PDF en flux, sans fenetre intermediaire */
    const imprimer = async (bouton, motif) => {
      const [page] = await Promise.all([
        ctx.waitForEvent('page', { timeout: 20000 }),
        p.click('#' + await p.evaluate((s) => Ext.ComponentQuery.query(s)[0].id, bouton))
      ]);
      await page.waitForLoadState('load').catch(() => null);
      // la reponse est souvent deja recue quand l onglet est visible : on la relit dans la meme session
      const rep = await p.evaluate(async (u) => { const x = await fetch(u); return { statut: x.status, type: x.headers.get('content-type') || '', octets: (await x.arrayBuffer()).byteLength }; }, page.url());
      const info = { url: page.url(), statut: rep.statut, type: rep.type, octets: rep.octets, fenetres: ctx.pages().length };
      await page.close();
      return info;
    };
    await cliquerOnglet(0);
    const a = await imprimer('recap #imprimerAchats', 'achats');
    ok('Imprimer Achats : PDF en flux dans le nouvel onglet', /\/api\/v1\/recap\/achats\/pdf\?dtStart=\d{4}-\d{2}-\d{2}&dtEnd=/.test(a.url) && a.statut === 200 && /application\/pdf/.test(a.type) && a.fenetres === 2, JSON.stringify(a));
    await cliquerOnglet(1);
    const c = await imprimer('recap #imprimerCredits', 'credits');
    ok('Imprimer Credits accordes : PDF en flux avec la recherche', /\/api\/v1\/recap\/credits\/pdf\?dtStart=.*&query=/.test(c.url) && c.statut === 200 && /application\/pdf/.test(c.type), JSON.stringify(c));
    await cliquerOnglet(2);
    const r = await imprimer('recap #imprimerReglements', 'reglements');
    ok('Imprimer Reglements TP : PDF en flux', /\/api\/v1\/recap\/reglements\/pdf\?dtStart=/.test(r.url) && r.statut === 200 && /application\/pdf/.test(r.type), JSON.stringify(r));

    /* l impression globale existante est conservee */
    const g = await p.evaluate(() => { const b = Ext.ComponentQuery.query('recap #imprimer')[0]; return b && b.isVisible(true); });
    ok('Le bouton imprimer global du rapport est conserve', g === true);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) { ok('Deroulement sans exception', false, e.stack || e.message); }
  await b.close();
  const ko = res.filter(r => !r.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' PASS');
  process.exit(ko ? 1 : 0);
})();
